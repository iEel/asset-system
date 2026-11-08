import type { ReactNode } from "react"
import Link from "next/link"
import { headers } from "next/headers"
import { redirect } from "next/navigation"
import { getTranslations } from "next-intl/server"
import { ChevronRight, FileCheck2, History } from "lucide-react"
import { getSessionUser, hasPermission } from "@/lib/auth-utils"
import { prisma } from "@/lib/db"
import { APPROVAL_PERMISSION, buildAccessDeniedHref } from "@/lib/access-denied"
import { redirectToLogin } from "@/lib/page-auth"
import {
  approvalInboxNeighbours,
  approvalInboxNextPage,
  approvalInboxPageSizes,
  buildApprovalInboxHref,
  formatApprovalInboxDay,
  parseApprovalInboxItemParam,
  parseApprovalInboxQuery,
  type ApprovalInboxItemKey,
  type ApprovalInboxRef,
  type ApprovalInboxRow,
  type ApprovalInboxTab,
} from "@/lib/approval-inbox"
import { loadAuditRoundClosePanel, loadDisposalInboxPanel } from "@/lib/approval-inbox-panels"
import { getApprovalInboxAccess, getApprovalInboxPage } from "@/lib/approval-inbox-query"
import { requestPathHeader } from "@/lib/login-redirect"
import { approvalInboxSelectionScope } from "@/lib/approval-inbox-selection"
import { buildApprovalPermissionMatrix } from "@/lib/approval-permission-matrix"
import { getApprovalPermissionMatrixUsers } from "@/lib/approval-permission-matrix-query"
import { auditFindingTypeShortLabelKeys, resolveAuditFindingType } from "@/lib/audit-finding-filters"
import { loadAuditFindingPanel } from "@/lib/audit-findings-page-data"
import { disposalBulkApprovalCodes } from "@/lib/disposal-bulk-approval"
import type { DisposalSodReason } from "@/lib/disposal-policy"
import { getPanelClasses } from "@/lib/design-system"
import { formatCount } from "@/lib/display-format"
import { paginationRange } from "@/lib/master-data-query"
import { appendOperationalReturnTo } from "@/lib/operational-return-navigation"
import { cn } from "@/lib/utils"
import { ApprovalDisposalPanel } from "@/components/approvals/approval-disposal-panel"
import { ApprovalFindingPanel } from "@/components/approvals/approval-finding-panel"
import { ApprovalInboxPolicy, ApprovalInboxPolicyLine } from "@/components/approvals/approval-inbox-policy"
import { ApprovalRoundClosePanel } from "@/components/approvals/approval-round-close-panel"
import { AuditFindingPaneTop } from "@/components/audit/audit-finding-pane-top"
import {
  ApprovalInboxSelectAll,
  ApprovalInboxSelectionBar,
  ApprovalInboxSelectionProvider,
  ApprovalInboxTick,
  type ApprovalInboxSelectionCopy,
} from "@/components/approvals/approval-inbox-selection"
import { ActionEmptyState } from "@/components/ui/action-empty-state"
import { buttonVariants, linkVariants } from "@/components/ui/button-variants"
import { Chip } from "@/components/ui/chip"
import { ClickableTableRow } from "@/components/ui/clickable-table-row"
import { DataTable, DataTableBody, DataTableCell, DataTableFoot, DataTableHead, DataTableHeader, TableEmptyRow } from "@/components/ui/data-table"
import { EmptyNote } from "@/components/ui/empty-note"
import { Notice } from "@/components/ui/notice"
import { PageBackLink, PageHeader } from "@/components/ui/page-header"
import { Pagination } from "@/components/ui/pagination"
import { SearchField } from "@/components/ui/search-field"
import { StatStrip, type StatStripItem } from "@/components/ui/stat-strip"
import { StatusBadge } from "@/components/ui/status-badge"
import { TabNav } from "@/components/ui/tab-nav"

type ApprovalInboxPageProps = {
  params: Promise<{ locale: string }>
  searchParams: Promise<Record<string, string | string[] | undefined>>
}

// A blocked disposal row's reason (group 6 spec §7.3): a separation-of-duties reason has its own line; any other block
// code reads its disposalPage.errors text.
const sodReasonKeys: Record<DisposalSodReason, string> = {
  requester: "blockRequester",
  creator: "blockCreator",
  no_employee: "blockNoEmployee",
}

// The next step a phone card names (spec §7.7), in the work center's words.
const nextStepKeys: Record<ApprovalInboxItemKey, string> = {
  disposal: "actionDisposal",
  finding: "actionFinding",
  round: "actionRound",
}

// งานรออนุมัติ as board AP (group 6 plan 2 Task 2, spec §7.1–7.3, §7.7): the policy line and its fold, the overdue /
// oldest / total strip, the tabs, the search and the overdue toggle, the paged queue and the phone cards. The right
// pane is the slot Task 4 fills. Task 3: the ticks, the selection kept across pages and the bulk approve (spec §7.4).
// Task 4: the right panel of the chosen item (spec §7.5–7.7), each decision going to the next item in this order.
export default async function ApprovalInboxPage({ params, searchParams }: ApprovalInboxPageProps) {
  const { locale } = await params
  const rawQuery = await searchParams
  const user = await getSessionUser()
  if (!user) return redirectToLogin(locale)
  // Page group 12 §9: a viewer with no approval right lands on the denied page (it was a 404).
  if (!getApprovalInboxAccess(user).canAnyApproval) {
    redirect(buildAccessDeniedHref({ locale, module: APPROVAL_PERMISSION, action: "approve", from: (await headers()).get(requestPathHeader) }))
  }

  const query = parseApprovalInboxQuery(rawQuery)
  const item = parseApprovalInboxItemParam(rawQuery.item)
  const now = new Date()
  const [data, approverUsers, t, tCommon, tDisposal, tRound, tFinding] = await Promise.all([
    getApprovalInboxPage(user, locale, query, now),
    getApprovalPermissionMatrixUsers(),
    getTranslations({ locale, namespace: "approvalInboxPage" }),
    getTranslations({ locale, namespace: "common" }),
    getTranslations({ locale, namespace: "disposalPage" }),
    getTranslations({ locale, namespace: "auditRound" }),
    getTranslations({ locale, namespace: "auditFinding" }),
  ])
  const { access, policy, strip, tabs, rows, filteredTotal, pageSize } = data
  const matrix = buildApprovalPermissionMatrix(approverUsers, policy.minApprovers)

  // The page shown (the read model clamps a page past the last), kept on every row and pager link.
  const shown = { ...query, page: data.page }
  const href = (patch: Parameters<typeof buildApprovalInboxHref>[2]) => buildApprovalInboxHref(locale, shown, patch)
  const itemHref = (key: ApprovalInboxItemKey, id: string) => href({ item: `${key}:${id}` })
  const closeHref = href({})
  const hasFilters = Boolean(query.search) || query.overdue
  const clearHref = href({ search: "", overdue: false, page: 1 })
  const { start, end, totalPages } = paginationRange(data.page, pageSize, filteredTotal)

  const day = (date: Date, withYear = false) => formatApprovalInboxDay(date, locale, withYear)
  const methodWord = (type: string) => (tDisposal.has(`types.${type}`) ? tDisposal(`types.${type}`) : type)
  const findingWord = (type: string) => {
    const known = resolveAuditFindingType(type)
    return known ? tRound(auditFindingTypeShortLabelKeys[known]) : type
  }
  const kindLabel = (row: ApprovalInboxRow) => (row.key === "disposal" ? t("kindDisposal") : t("kindAudit"))
  const subtypeLine = (row: ApprovalInboxRow) =>
    row.subtype.kind === "method"
      ? t("subtypeMethod", { method: methodWord(row.subtype.disposalType) })
      : row.subtype.kind === "finding"
        ? t("subtypeFinding", { type: findingWord(row.subtype.findingType) })
        : t("subtypeClose")
  const subtypeShort = (row: ApprovalInboxRow) =>
    row.subtype.kind === "method"
      ? methodWord(row.subtype.disposalType)
      : row.subtype.kind === "finding"
        ? findingWord(row.subtype.findingType)
        : t("subtypeClose")
  const blockLine = (row: ApprovalInboxRow) =>
    row.block ? (row.block.sodReason ? t(sodReasonKeys[row.block.sodReason]) : tDisposal(`errors.${row.block.code}`)) : null
  const isLost = (row: ApprovalInboxRow) => row.subtype.kind === "method" && row.subtype.disposalType === "lost"
  const slaBadge = (row: ApprovalInboxRow) => (
    <StatusBadge
      label={row.age.isOverdue ? t("overdueDays", { days: formatCount(row.age.daysOverdue) }) : t("waitingDays", { days: formatCount(row.age.ageDays) })}
      tone={row.age.isOverdue ? "danger" : "muted"}
      wrap
    />
  )
  // A disposal request with no photo (spec §7.3): a warning, except a lost machine, which cannot be photographed (§5).
  const photoNote = (row: ApprovalInboxRow) =>
    row.key === "disposal" && row.photoCount === 0 ? (
      isLost(row) ? (
        <span className="text-meta text-muted-foreground">{t("noPhotoLost")}</span>
      ) : (
        <StatusBadge label={t("noPhoto")} tone="warning" />
      )
    ) : null

  // The strip counts every pending item the viewer may see (spec §7.2); it does not follow the tab or the filters.
  const stripItems: StatStripItem[] = [
    {
      key: "overdue",
      label: t("stripOverdue"),
      value: formatCount(strip.overdue.total),
      unit: t("unitItems"),
      foot: t("stripOverdueFoot", { disposal: formatCount(strip.overdue.disposal), audit: formatCount(strip.overdue.audit) }),
      href: href({ overdue: true, page: 1 }),
      current: query.overdue,
      attention: strip.overdue.total > 0,
      filterNote: t("stripOverdueNote"),
      scroll: false,
      data: { "data-approval-strip-cell": "overdue" },
    },
    {
      key: "oldest",
      label: t("stripOldest"),
      value: formatCount(strip.oldest?.ageDays ?? 0),
      unit: t("unitDays"),
      foot: strip.oldest ? t("stripOldestFoot", { title: strip.oldest.title, date: day(strip.oldest.requestedAt, true) }) : undefined,
      footTitle: strip.oldest?.title,
      // The oldest item is the first row of the unfiltered list, so it opens on page 1 of ทั้งหมด.
      href: strip.oldest ? buildApprovalInboxHref(locale, parseApprovalInboxQuery({}), { item: `${strip.oldest.key}:${strip.oldest.id}` }) : undefined,
      scroll: false,
      data: { "data-approval-strip-cell": "oldest" },
    },
    {
      key: "total",
      label: t("stripTotal"),
      value: formatCount(strip.total.total),
      unit: t("unitItems"),
      foot: t("stripTotalFoot", { overdue: formatCount(strip.total.overdue), within: formatCount(strip.total.within), total: formatCount(strip.total.total) }),
      data: { "data-approval-strip-cell": "total" },
    },
  ]

  const tabItems = (["all", "disposal", "audit"] as const satisfies readonly ApprovalInboxTab[]).map((tab) => ({
    key: tab,
    label: t(`filter_${tab}`),
    count: formatCount(tabs[tab]),
    href: href({ tab, page: 1 }),
  }))

  // The selection (spec §7.4): one kind, kept across pages for this tab, search and overdue filter.
  const selectionCopy: ApprovalInboxSelectionCopy = {
    barLabel: t("selectionBarLabel"),
    count: t.raw("selectionCount"),
    kind: { disposal: t("selectionKindDisposal"), finding: t("selectionKindFinding") },
    clear: t("clearSelection"),
    note: t("selectionNote"),
    selectAll: t.raw("selectAllApprovable"),
    review: t.raw("reviewAndApprove"),
    restarted: t.raw("selectionRestarted"),
    limit: t("selectionLimit"),
    capped: t.raw("selectionCapped"),
    confirmTitle: t.raw("bulkTitle"),
    previewLoading: t("bulkPreviewLoading"),
    previewCounts: t.raw("bulkPreviewCounts"),
    notOpened: t.raw("bulkNotOpened"),
    notOpenedMore: t.raw("bulkNotOpenedMore"),
    remark: t("bulkRemark"),
    remarkHint: t("bulkRemarkHint"),
    zeroEligible: t("bulkZeroEligible"),
    confirm: t.raw("bulkConfirm"),
    committing: t.raw("bulkCommitting"),
    running: t.raw("bulkRunning"),
    requestFailed: t("bulkRequestFailed"),
    approvalFailed: t("bulkApprovalFailed"),
    done: t.raw("bulkDone"),
    skipped: t.raw("bulkSkipped"),
    toPanel: t.raw("bulkToPanel"),
    sodReasons: { requester: t(sodReasonKeys.requester), creator: t(sodReasonKeys.creator), no_employee: t(sodReasonKeys.no_employee) },
    errors: Object.fromEntries(disposalBulkApprovalCodes.map((code) => [code, tDisposal(`bulkErrors.${code}`)])) as ApprovalInboxSelectionCopy["errors"],
  }
  const tickable = { disposal: data.tickable.disposal.map((entry) => entry.id), finding: data.tickable.finding.map((entry) => entry.id) }

  // The right panel (spec §7.5): the chosen item, the next one in this order (on the page it will stand on once the
  // decided items leave), and its place. A kind the viewer may not decide, or an item gone or already decided, reads
  // the one stale notice with the link to next; nothing of another user's data loads for it.
  const hrefTo = (ref: ApprovalInboxRef | null, removed: ReadonlySet<string>) =>
    ref ? href({ item: `${ref.key}:${ref.id}`, page: approvalInboxNextPage(data.order, ref, removed, pageSize) }) : null
  const neighbours = item ? approvalInboxNeighbours(data.order, item) : null
  const nextHref = item && neighbours ? hrefTo(neighbours.next, new Set([`${item.key}:${item.id}`])) : null
  const framed = (content: ReactNode) => <div className={cn(getPanelClasses(), "p-4 md:p-5")}>{content}</div>
  const stalePanel = framed(
    <Notice
      tone="warning"
      role="status"
      data-approval-stale
      action={
        <Link href={nextHref ?? closeHref} scroll={false} className={linkVariants({ size: "inherit" })}>
          {nextHref ? t("goNext") : t("backToInbox")}
        </Link>
      }
    >
      {t("staleNotice")}
    </Notice>,
  )

  let panel: ReactNode = framed(<EmptyNote>{t("panelEmpty")}</EmptyNote>)
  if (item?.key === "disposal") {
    const disposal = access.canApproveDisposal
      ? await loadDisposalInboxPanel(prisma, {
          requestId: item.id,
          locale,
          viewer: { userId: user.id, employeeId: user.employeeId },
          segregationRequired: policy.segregationRequired,
          slaDays: policy.slaDays,
          now,
        })
      : null
    panel = disposal?.isPending
      ? framed(
          <ApprovalDisposalPanel
            locale={locale}
            panel={disposal}
            segregationRequired={policy.segregationRequired}
            nextHref={nextHref}
            closeHref={closeHref}
            position={neighbours?.position ?? null}
            total={neighbours?.total ?? 0}
          />,
        )
      : stalePanel
  } else if (item?.key === "finding") {
    const finding = access.canApproveAudit ? await loadAuditFindingPanel({ locale, findingId: item.id, user, canApprove: true, now }) : null
    if (finding && finding.panel.finding.reviewStatus === "pending") {
      // "อนุมัติทุกช่องของทรัพย์สินนี้" decides the asset's other pending findings the viewer may approve: next skips them.
      const siblingSkip = new Set([
        `finding:${item.id}`,
        ...finding.panel.siblings.filter((sibling) => !sibling.reportedByViewer).map((sibling) => `finding:${sibling.id}`),
      ])
      const afterSiblings = approvalInboxNeighbours(data.order, item, siblingSkip)
      const chosen = finding.panel.finding
      // The disposal request from a finding, as the findings page builds it, back to this item.
      const disposalHref =
        hasPermission(user, "disposal", "create") && chosen.asset
          ? appendOperationalReturnTo(
              `/${locale}/disposal/new?assetId=${chosen.asset.id}&reason=${encodeURIComponent(`${tFinding("disposalFromFindingReason")} ${chosen.auditRound.auditNo}: ${tFinding(`type_${chosen.findingType}`)}`)}&sourceType=audit_finding&sourceId=${chosen.id}`,
              itemHref("finding", chosen.id),
            )
          : null
      panel = (
        <ApprovalFindingPanel
          locale={locale}
          load={finding}
          queue={{
            position: neighbours?.position ?? null,
            total: neighbours?.total ?? 0,
            nextHref,
            nextHrefAfterSiblings: hrefTo(afterSiblings.next, siblingSkip),
          }}
          closeHref={closeHref}
          disposalHref={disposalHref}
          loadedAt={now}
        />
      )
    } else {
      panel = stalePanel
    }
  } else if (item?.key === "round") {
    const round = access.canApproveAudit ? await loadAuditRoundClosePanel(prisma, item.id) : null
    // A closed or cancelled round has left the queue even with a clear checklist: the stale notice.
    panel = round?.ready && round.operational ? framed(<ApprovalRoundClosePanel locale={locale} panel={round} />) : stalePanel
  }

  // A tab with nothing while the others hold items says so, with a way to ทั้งหมด (the empty inbox keeps its own words).
  const empty = hasFilters
    ? { title: t("emptyFilterTitle"), description: t("emptyFilterDescription"), actionHref: clearHref, actionLabel: t("clearFilters"), actionVariant: "secondary" as const }
    : query.tab !== "all" && data.tabs.all > 0
      ? { title: t("emptyTabTitle"), description: t("emptyTabDescription"), actionHref: href({ tab: "all", page: 1 }), actionLabel: t("emptyTabAction"), actionVariant: "secondary" as const }
      : { title: t("emptyTitle"), description: t("emptyDescription") }

  return (
    <div className="space-y-6">
      <PageHeader
        title={t("title")}
        meta={<ApprovalInboxPolicyLine policy={policy} matrix={matrix} />}
        actions={
          <Link href={`/${locale}/admin/approvals/history`} className={buttonVariants({ variant: "outline", size: "md" })}>
            <History aria-hidden="true" />
            {t("openDecisionHistory")}
          </Link>
        }
      />

      {/* Below xl an open item takes the page (spec §7.7): the strip, the fold and the list wait behind its back link. */}
      <div className={cn("space-y-4", item && "hidden xl:block")}>
        <section aria-label={t("stripLabel")}>
          {/* Three cells from sm; on the phone they stack, so each foot reads in full (the counts run to hundreds). */}
          <StatStrip items={stripItems} className="max-sm:grid-cols-1 sm:max-lg:grid-cols-3 max-lg:[&>:last-child:nth-child(odd)]:col-span-1" />
        </section>
        <ApprovalInboxPolicy locale={locale} policy={policy} access={access} matrix={matrix} />
      </div>

      <div data-approval-panes className="grid xl:grid-cols-[minmax(0,1fr)_420px] min-w-0 gap-6 xl:items-start xl:gap-4">
        <div data-approval-list className={cn("min-w-0 space-y-4", item && "hidden xl:block")}>
          <ApprovalInboxSelectionProvider scope={approvalInboxSelectionScope(query)} tickable={tickable} titles={data.titles} copy={selectionCopy}>
            <div className="flex flex-wrap items-end gap-x-4 gap-y-1">
              <TabNav data-approval-tabs aria-label={t("queueTitle")} items={tabItems} current={query.tab} scroll={false} className="min-w-0" />
              <p data-approval-audit-note className="pb-2.5 text-meta text-muted-foreground">
                {t("auditTabNote", { findings: formatCount(tabs.findings), rounds: formatCount(tabs.rounds) })}
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <form role="search" action={`/${locale}/admin/approvals`} className="w-full md:w-96">
                <input type="hidden" name="tab" value={query.tab} />
                {query.overdue ? <input type="hidden" name="overdue" value="1" /> : null}
                {pageSize !== 25 ? <input type="hidden" name="pageSize" value={pageSize} /> : null}
                <SearchField name="search" defaultValue={query.search} aria-label={tCommon("search")} placeholder={t("searchPlaceholder")} className="w-full" />
              </form>
              <Link
                href={href({ overdue: !query.overdue, page: 1 })}
                scroll={false}
                aria-current={query.overdue ? "true" : undefined}
                data-approval-overdue-toggle
                className={cn(buttonVariants({ variant: "outline", size: "md" }), query.overdue && "border-primary bg-primary-soft text-primary-hover hover:border-primary hover:bg-primary-soft")}
              >
                {t("overdueToggle")}
              </Link>
            </div>

            {/* Select all approvable before any tick (spec §7.4): from md, while the tab has tickable rows. */}
            <ApprovalInboxSelectAll tab={query.tab} />

            <div className={cn(getPanelClasses(), "overflow-hidden")}>
              {/* Phone cards (spec §7.7): each card is one link to its item, the whole card a 44px+ target. No ticks. */}
              <div className="md:hidden">
                {rows.length === 0 ? (
                  <div className="p-3">
                    <ActionEmptyState icon={<FileCheck2 />} {...empty} />
                  </div>
                ) : (
                  <>
                    <p className="px-3 pt-3 text-meta text-muted-foreground">{t("phoneSummary", { count: formatCount(rows.length), total: formatCount(filteredTotal) })}</p>
                    <div className="grid gap-3 p-3">
                      {rows.map((row) => (
                        <Link
                          key={`${row.key}:${row.id}`}
                          href={itemHref(row.key, row.id)}
                          data-approval-card={`${row.key}:${row.id}`}
                          className="block min-h-11 min-w-0 rounded-md border border-border bg-background p-3 transition-colors hover:bg-row-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                        >
                          <div className="flex flex-wrap items-center gap-2">
                            <Chip>{`${kindLabel(row)} · ${subtypeShort(row)}`}</Chip>
                            {row.age.isOverdue ? slaBadge(row) : null}
                            <span className="ms-auto text-meta text-muted-foreground">{t("waitingDays", { days: formatCount(row.age.ageDays) })}</span>
                          </div>
                          <div className="mt-2 break-words font-semibold text-foreground">{row.title}</div>
                          <div className="mt-0.5 text-meta text-muted-foreground"><span className="tag break-all">{row.codes}</span></div>
                          {photoNote(row) || blockLine(row) ? (
                            <div className="mt-1 flex flex-wrap items-center gap-2 text-meta text-muted-foreground">
                              {photoNote(row)}
                              {blockLine(row) ? <span>{blockLine(row)}</span> : null}
                            </div>
                          ) : null}
                          <div className="mt-2 flex flex-wrap items-center justify-between gap-2 text-meta">
                            <span className="text-muted-foreground">{`${row.isOwn ? t("you") : row.requesterName} · ${day(row.requestedAt)}`}</span>
                            <span className="inline-flex items-center gap-0.5 font-medium text-primary">
                              {t(nextStepKeys[row.key])}
                              <ChevronRight aria-hidden="true" className="size-4" />
                            </span>
                          </div>
                        </Link>
                      ))}
                    </div>
                  </>
                )}
              </div>

              <DataTable framed={false} layout="fixed" minWidth={560} className="hidden md:block" caption={t("title")} scrollHint={tCommon("tableScrollHint")}>
                <colgroup>
                  <col className="w-11" />
                  <col className="w-32" />
                  <col />
                  <col className="w-40" />
                  <col className="w-32" />
                </colgroup>
                <DataTableHeader>
                  <tr>
                    {/* The tick column (spec §7.4): disposal and finding rows; a round's close is decided one at a time. */}
                    <DataTableHead hideLabel className="p-0 first:pl-0 md:first:pl-0">{t("colSelect")}</DataTableHead>
                    <DataTableHead>{t("colKind")}</DataTableHead>
                    <DataTableHead>{t("colItem")}</DataTableHead>
                    <DataTableHead>{t("requestedBy")}</DataTableHead>
                    <DataTableHead>{`${t("colWaiting")} ↓`}</DataTableHead>
                  </tr>
                </DataTableHeader>
                <DataTableBody>
                  {rows.length === 0 ? (
                    <TableEmptyRow colSpan={5} emptyState={{ icon: <FileCheck2 />, ...empty }} />
                  ) : (
                    rows.map((row) => {
                      const block = blockLine(row)
                      const photo = photoNote(row)
                      return (
                        <ClickableTableRow
                          key={`${row.key}:${row.id}`}
                          href={itemHref(row.key, row.id)}
                          scroll={false}
                          current={item?.key === row.key && item.id === row.id}
                          rowData={{ "data-approval-row": `${row.key}:${row.id}` }}
                          label={`${tCommon("view")}: ${row.title} · ${row.codes}`}
                        >
                          <DataTableCell className="p-0 first:pl-0 md:first:pl-0">
                            {row.key === "round" ? null : (
                              <ApprovalInboxTick
                                kind={row.key}
                                id={row.id}
                                label={t("selectItem", { name: `${row.title} · ${row.codes}` })}
                                disabled={!row.tickable}
                                reason={block ?? undefined}
                              />
                            )}
                          </DataTableCell>
                          <DataTableCell>
                            <Chip>{kindLabel(row)}</Chip>
                            <div className="mt-1 break-words text-meta text-muted-foreground">{subtypeLine(row)}</div>
                          </DataTableCell>
                          <DataTableCell>
                            <div className="break-words font-semibold text-foreground">{row.title}</div>
                            <div className="mt-0.5 text-meta text-muted-foreground"><span className="tag whitespace-normal [overflow-wrap:anywhere]">{row.codes}</span></div>
                            {photo ? <div className="mt-1">{photo}</div> : null}
                            {block ? <div data-approval-block className="mt-1 break-words text-meta text-muted-foreground">{block}</div> : null}
                          </DataTableCell>
                          <DataTableCell>
                            {/* "อนุมัติเองไม่ได้" only when separation of duties blocks it; with the rule off the viewer may decide. */}
                            {row.isOwn && row.block?.sodReason ? (
                              <div className="flex flex-wrap items-center gap-1.5">
                                <span className="font-medium text-foreground">{t("you")}</span>
                                <StatusBadge label={t("selfApprovalBadge")} tone="muted" />
                              </div>
                            ) : (
                              <div className="break-words text-foreground">{row.requesterName}</div>
                            )}
                            <div className="mt-0.5 text-meta text-muted-foreground">{t("sentOn", { date: day(row.requestedAt) })}</div>
                          </DataTableCell>
                          <DataTableCell>
                            {slaBadge(row)}
                            {row.age.isOverdue ? (
                              <div className="mt-1 text-meta text-muted-foreground">{t("waitingDays", { days: formatCount(row.age.ageDays) })}</div>
                            ) : row.age.isDueToday ? (
                              <div className="mt-1 text-meta font-medium text-warning">{t("dueToday")}</div>
                            ) : null}
                          </DataTableCell>
                        </ClickableTableRow>
                      )
                    })
                  )}
                </DataTableBody>
              </DataTable>

              {filteredTotal > 0 ? (
                <DataTableFoot>
                  <Pagination
                    page={data.page}
                    totalPages={totalPages}
                    previousHref={href({ page: data.page - 1 })}
                    nextHref={href({ page: data.page + 1 })}
                    pageSize={pageSize}
                    pageSizes={approvalInboxPageSizes.map((value) => ({ value, href: href({ pageSize: value, page: 1 }) }))}
                    labels={{
                      navigation: tCommon("pagination"),
                      previous: tCommon("previous"),
                      next: tCommon("next"),
                      pageOf: tCommon("pageOf", { page: data.page, total: totalPages }),
                      range: t("listRange", { from: formatCount(start), to: formatCount(end), total: formatCount(filteredTotal) }),
                      pageSizeGroup: tCommon("pageSizeLabel"),
                      rowsPerPage: tCommon("rowsPerPage"),
                    }}
                  />
                </DataTableFoot>
              ) : null}
            </div>
            {/* The last child of the list's column: it sticks to the bottom while something is ticked (from md). */}
            <ApprovalInboxSelectionBar />
          </ApprovalInboxSelectionProvider>
        </div>

        {/* The right pane (spec §7.5): the chosen item's panel. Sticky from xl; below xl it shows only with ?item=, full
            width, under its back link to the list (spec §7.7). */}
        <section
          data-approval-panel={item ? item.key : "empty"}
          aria-label={t("title")}
          className={cn("min-w-0 xl:sticky xl:top-4 xl:max-h-[calc(100dvh_-_var(--shell-top)_-_3rem)] xl:overflow-y-auto", !item && "max-xl:hidden")}
        >
          {/* Below xl the panel takes the page: each item (and the next one after a decision, sent with scroll: false)
              opens at the top of #main. From xl nothing moves (pane={null}). */}
          {item ? <AuditFindingPaneTop key={`${item.key}:${item.id}`} pane="[data-approval-panel]" /> : null}
          {item ? <PageBackLink href={closeHref} label={t("backToInbox")} className="mb-3 xl:hidden" /> : null}
          {panel}
        </section>
      </div>
    </div>
  )
}
