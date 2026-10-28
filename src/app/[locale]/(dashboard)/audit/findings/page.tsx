import Link from "next/link"
import { redirect } from "next/navigation"
import { getTranslations } from "next-intl/server"
import { ArrowRight, FileText } from "lucide-react"
import { hasPermission } from "@/lib/auth-utils"
import { requirePagePermission } from "@/lib/page-auth"
import { MasterDataSearch } from "@/components/master-data/master-data-layout"
import {
  AuditFindingSelectAllTick,
  AuditFindingSelectTick,
  AuditFindingsSelectionBar,
  AuditFindingsSelectionProvider,
  type AuditFindingSelectable,
} from "@/components/audit/audit-findings-batch-actions"
import { AuditFindingsExportMenu } from "@/components/audit/audit-findings-export-menu"
import { AuditFindingPaneTop } from "@/components/audit/audit-finding-pane-top"
import { AuditFindingReviewPanel, AuditFindingReviewPanelEmpty } from "@/components/audit/audit-finding-review-panel"
import { cn, formatDateTime } from "@/lib/utils"
import { formatFileSize } from "@/lib/uploads"
import { ClickableTableRow } from "@/components/ui/clickable-table-row"
import { ActionEmptyState } from "@/components/ui/action-empty-state"
import { linkVariants } from "@/components/ui/button-variants"
import { Chip } from "@/components/ui/chip"
import { DataTable, DataTableBody, DataTableCell, DataTableFoot, DataTableHead, DataTableHeader, TableEmptyRow } from "@/components/ui/data-table"
import { FilterChipList, type FilterChipItem } from "@/components/ui/filter-chips"
import { FilterSelect, type FilterSelectOption } from "@/components/ui/filter-select"
import { orNil } from "@/components/ui/nil"
import { PageBackLink, PageHeader } from "@/components/ui/page-header"
import { Pagination } from "@/components/ui/pagination"
import { StatusBadge, type StatusTone } from "@/components/ui/status-badge"
import { TabNav } from "@/components/ui/tab-nav"
import {
  auditFindingFollowUpChips,
  auditFindingStatusView,
  auditFindingTabStatus,
  auditFindingTabs,
  auditFindingTypeShortLabelKeys,
  auditFindingTypes,
  auditFindingsHrefQuery,
  buildAuditFindingsHref,
  getAuditFindingToday,
  isAuditFindingWaitingStatus,
  isOpenAuditFindingActionStatus,
  parseAuditFindingsListFilters,
  resolveAuditFindingType,
  type AuditFindingFollowUpChip,
  type AuditFindingTab,
  type AuditFindingsHrefOverrides,
} from "@/lib/audit-finding-filters"
import { getAuditFindingTypeSearchLabels } from "@/lib/audit-finding-search-labels"
import { getAuditFindingsPageData, type AuditFindingEvidenceAttachment, type AuditFindingsPageRow } from "@/lib/audit-findings-page-data"
import { getWaitingWorkRules } from "@/lib/waiting-work"
import { DEFAULT_WAITING_WORK_RULES } from "@/lib/waiting-work-rules"
import { getPanelClasses } from "@/lib/design-system"
import { formatCount } from "@/lib/display-format"
import { LIST_PAGE_SIZES, lastListPage } from "@/lib/list-pagination"
import { paginationRange } from "@/lib/master-data-query"
import { appendOperationalReturnTo } from "@/lib/operational-return-navigation"
import { withPerformanceTiming } from "@/lib/performance-timing"
import { getAuditItemReconcileStatusLabelKey, getAuditItemStatusLabelKey } from "@/lib/audit-item-status-labels"

type AuditFindingsPageProps = {
  params: Promise<{ locale: string }>
  searchParams: Promise<{ search?: string; status?: string; roundId?: string; findingType?: string; finding?: string; returnTo?: string; page?: string | string[]; pageSize?: string | string[] }>
}

export default async function AuditFindingsPage({ params, searchParams }: AuditFindingsPageProps) {
  const { locale } = await params
  const filters = parseAuditFindingsListFilters(locale, await searchParams)
  const { status, search: searchText, roundId, findingType, findingId } = filters
  const user = await requirePagePermission(locale, "audit", "view")
  const canApprove = hasPermission(user, "audit", "approve")
  // The exports' routes need audit:export (spec §6.5: a role without it does not see them; the E2E suite's AU1, M1).
  const canExport = hasPermission(user, "audit", "export")
  const canCreateDisposal = hasPermission(user, "disposal", "create")

  const t = await getTranslations("auditFinding")
  const tRound = await getTranslations("auditRound")
  const tCommon = await getTranslations("common")
  const tAsset = await getTranslations("asset")
  const tNotifications = await getTranslations("notifications")
  const formatAuditItemStatus = (status: string) => {
    const key = getAuditItemStatusLabelKey(status)
    return key ? t(key) : status
  }
  const formatReconcileStatus = (status: string) => {
    const key = getAuditItemReconcileStatusLabelKey(status)
    return key ? t(key) : status
  }

  // Task 2's one load, as Task 2 wired it: every count, the rows and the open finding come from one builder.
  const pageLoadedAt = new Date()
  // The bell's two action kinds read its own day count; other statuses read no setting.
  const waitingRules = isAuditFindingWaitingStatus(status) ? await getWaitingWorkRules() : DEFAULT_WAITING_WORK_RULES
  const typeSearchLabels = await getAuditFindingTypeSearchLabels()
  const data = await withPerformanceTiming(
    "audit-findings.page-data",
    () => getAuditFindingsPageData({ locale, filters, user, canApprove, typeSearchLabels, rules: waitingRules, now: pageLoadedAt }),
    { route: "/audit/findings", locale, status, hasSearch: Boolean(searchText), hasFinding: Boolean(findingId) }
  )
  const { rows, total, listPage, counts, back } = data
  // The finding open in the panel (?finding=), wherever it is in the list (Task 2).
  const chosen = data.panel?.finding ?? null
  const today = getAuditFindingToday(pageLoadedAt)
  // ต้องติดตาม and its sub-chips (P4-R3): an old value opens its tab and sub-chip; a bell value opens ต้องติดตาม with its chip.
  const view = auditFindingStatusView(status)
  // The way back (P4-R12): Task 2's returnTo, else the round of roundId, else the rounds list.
  const backLabel = back.target === "round" ? t("backToRound") : t("backToRounds")

  // Every link is Task 2's one writer, so returnTo rides on each (spec 2B §5.9.2 row 3; spec §10).
  const auditFindingsReturnHref = buildAuditFindingsHref(locale, filters, { page: listPage.page, pageSize: listPage.pageSize, finding: filters.findingId })
  // This list at another page or page size, with the same filters and no finding open, as a filter does (P4-R30). A link
  // with a finding and no page opens the page that holds it (P4-R18), so a pager link to page 1 that kept the finding
  // would land back on the finding's page.
  const pageHref = (next: { page?: number; pageSize?: number }) => buildAuditFindingsHref(locale, filters, next)
  // Another tab, sub-chip or filter: page 1 with the page size kept (spec 2B §5.9.1), and no finding open.
  const filterHref = (next: Pick<AuditFindingsHrefOverrides, "status" | "search" | "roundId" | "findingType">) => buildAuditFindingsHref(locale, filters, { ...next, pageSize: listPage.pageSize })
  // A row or a card: this list with that finding open in the panel (?finding=, spec §10).
  const findingHref = (id: string) => buildAuditFindingsHref(locale, filters, { page: listPage.page, pageSize: listPage.pageSize, finding: id })
  const closeHref = buildAuditFindingsHref(locale, filters, { page: listPage.page, pageSize: listPage.pageSize })
  const clearSearchHref = filterHref({ search: "" })
  // The disposal request from a finding, back to this list and its finding (Appendix A §10 bullet 4). Task 4's panel
  // takes it too.
  const disposalHrefFor = (finding: { id: string; findingType: string; asset: { id: string } | null; auditRound: { auditNo: string } }) =>
    canCreateDisposal && finding.asset
      ? appendOperationalReturnTo(`/${locale}/disposal/new?assetId=${finding.asset.id}&reason=${encodeURIComponent(`${t("disposalFromFindingReason")} ${finding.auditRound.auditNo}: ${t(`type_${finding.findingType}`)}`)}&sourceType=audit_finding&sourceId=${finding.id}`, auditFindingsReturnHref)
      : null

  // A page past the last one (an old link, or the last finding of the last page decided) shows the last page (spec 2B I21).
  // It keeps the open finding, unlike the pager (P4-R30): the panel stays on the finding it showed.
  const lastPage = lastListPage(total, listPage.pageSize)
  if (rows.length === 0 && total > 0 && listPage.page > lastPage) {
    redirect(buildAuditFindingsHref(locale, filters, { page: lastPage, pageSize: listPage.pageSize, finding: filters.findingId }))
  }
  const { start, end, totalPages } = paginationRange(listPage.page, listPage.pageSize, total)

  // The whole filtered list, in the reader's language (P4-R7); never the open finding or the page.
  const exportParams = new URLSearchParams()
  if (searchText) exportParams.set("search", searchText)
  if (roundId) exportParams.set("roundId", roundId)
  if (findingType) exportParams.set("findingType", findingType)
  exportParams.set("status", status)
  exportParams.set("locale", locale)

  const tabLabels: Record<AuditFindingTab, string> = {
    pending: t("status_pending"),
    approved: t("status_approved"),
    rejected: t("status_rejected"),
    followUp: t("tabFollowUp"),
    closed: t("filterClosed"),
    all: t("status_all"),
  }
  const chipLabels: Record<AuditFindingFollowUpChip, string> = {
    action_open: t("filterActionOpen"),
    overdue: t("filterOverdue"),
    exception: t("status_exception"),
  }
  const waitingLabels = {
    action_not_due: tNotifications("openAuditActions"),
    action_due_soon: tNotifications("auditActionsDueSoon"),
  }
  // The tab and sub-chip counts replace the strip (P4-R1); each is built from the where of the rows it opens (spec §5).
  const resolutionFilters = auditFindingTabs.map((tab) => ({ key: tab, label: tabLabels[tab], count: formatCount(counts[auditFindingTabStatus[tab]]), href: filterHref({ status: auditFindingTabStatus[tab] }) }))
  const followUpChips = auditFindingFollowUpChips.map((chip) => ({ key: chip, label: chipLabels[chip], count: formatCount(counts[chip]), href: filterHref({ status: chip }) }))
  // A bell link's filter is narrower than ต้องติดตาม and has no sub-chip, so it shows as a chip; removing it opens the tab.
  const filterChips: FilterChipItem[] = [
    ...(isAuditFindingWaitingStatus(status) ? [{ key: "status", label: waitingLabels[status], href: filterHref({ status: "follow_up" }) }] : []),
  ]
  // "รอบ:" and "เรื่อง:" (spec §10, bug 19, P4-R28): a round the options do not hold still shows, by its number or as
  // ไม่อยู่ในรายการ; an unknown type is null already (Task 2), so it never reaches the select.
  const roundOptions: FilterSelectOption[] = data.roundOptions.map((round) => ({ value: round.id, label: `${round.auditNo} · ${round.name}` }))
  if (roundId && !roundOptions.some((option) => option.value === roundId)) {
    roundOptions.push({ value: roundId, label: data.filterRound ? `${data.filterRound.auditNo} · ${data.filterRound.name}` : t("filterNotListed") })
  }
  // เรื่อง names the field in the round page's one short word (P4-R2): a Chip, since it names something and is not a
  // state. A stored type the app does not know reads ไม่อยู่ในรายการ, never its code.
  const topicLabel = (type: string) => {
    const known = resolveAuditFindingType(type)
    return known ? tRound(auditFindingTypeShortLabelKeys[known]) : t("filterNotListed")
  }
  const topicOptions: FilterSelectOption[] = auditFindingTypes.map((type) => ({ value: type, label: topicLabel(type) }))

  const resolutionStateLabels: Record<ResolutionState, string> = {
    pending_review: t("resolutionStatePendingReview"),
    open_action: t("resolutionStateOpenAction"),
    overdue: t("resolutionStateOverdue"),
    closed: t("resolutionStateClosed"),
    resolved: t("resolutionStateResolved"),
  }
  // The plan of a finding that has one, under its values (Appendix A §10 keeps owner and due date on the list): its
  // state, the owner's name (never an id, P4-R11) and the due date.
  const followUpLine = (row: AuditFindingsPageRow) =>
    row.actionStatus === "not_required"
      ? null
      : [t(`actionStatus_${row.actionStatus}`), row.ownerLabel ?? t("noActionOwner"), ...(row.actionDueDate ? [t("dueOn", { date: formatDateTime(row.actionDueDate) })] : [])].join(" · ")
  // A search with no rows offers "ล้างคำค้น" (spec §5); otherwise the way back.
  const empty = searchText
    ? { title: t("emptySearchTitle"), description: t("emptySearchHelp"), actionHref: clearSearchHref, actionLabel: t("clearSearch") }
    : { title: t("emptyTitle"), description: t("emptyHelp"), actionHref: back.href, actionLabel: backLabel }
  // The rows the viewer may tick (spec §10): Task 2's reviewable, the review route's own rule (P4-R20). A finding they
  // reported has none; the panel says why.
  const selectableFindings: AuditFindingSelectable[] = canApprove
    ? rows
        .filter((row) => row.reviewable)
        .map((row) => ({ id: row.id, code: row.asset?.assetTag ?? row.auditRound.auditNo, topic: topicLabel(row.findingType), panelHref: findingHref(row.id) }))
    : []
  // The batch selection belongs to one page of one filter: another page or filter starts with nothing selected. The open
  // finding is not part of it, so opening a row keeps the selection.
  const selectionKey = `${listPage.page}:${listPage.pageSize}:${status}:${searchText}:${roundId ?? ""}:${findingType ?? ""}`
  // The same key without the page and its size: whose result the selection bar shows (P4-R34).
  const filterKey = `${status}:${searchText}:${roundId ?? ""}:${findingType ?? ""}`
  // The five statuses of a finding (audit mobile fix D8): the resolution state always, the others only when they add
  // something to it. Each keeps the tone it had in its own column. Shown in the panel since group 2 plan 4.
  const findingStatusBadges = (finding: AuditFindingsPageRow, resolutionState: ResolutionState): FindingStatusBadgeItem[] => [
    { key: "resolutionState", title: t("resolutionState"), label: resolutionStateLabels[resolutionState], tone: RESOLUTION_STATE_TONES[resolutionState] },
    // "รอพิจารณา" already says the review is pending.
    ...(resolutionState === "pending_review" ? [] : [{ key: "reviewStatus", title: t("reviewStatus"), label: t(`status_${finding.reviewStatus}`), status: finding.reviewStatus }]),
    // No plan is needed, or the finding is closed and the state says so.
    ...(finding.actionStatus === "not_required" || resolutionState === "closed" ? [] : [{ key: "actionStatus", title: t("actionStatus"), label: t(`actionStatus_${finding.actionStatus}`), status: finding.actionStatus }]),
    // Every finding comes from a checked item: "ตรวจแล้ว" (scanned or reviewed) tells nothing new.
    ...(finding.auditItem.auditStatus === "scanned" || finding.auditItem.auditStatus === "reviewed" ? [] : [{ key: "itemStatus", title: t("itemStatus"), label: formatAuditItemStatus(finding.auditItem.auditStatus), status: finding.auditItem.auditStatus }]),
    // Nothing reconciled yet: no badge.
    ...(!finding.auditItem.reconcileStatus || finding.auditItem.reconcileStatus === "pending" ? [] : [{ key: "reconcileStatus", title: t("reconcileStatus"), label: formatReconcileStatus(finding.auditItem.reconcileStatus), status: finding.auditItem.reconcileStatus }]),
  ]
  // The review panel (group 2 spec §10): the open finding, or the empty panel, in Task 3's slot. It renders once; the pane
  // places it beside the table from xl and full screen below. After the last decision on รอพิจารณา or ทั้งหมด, the tabs
  // whose work is deciding, the empty panel says the tab is done (P4-R18). The other four keep
  // "เลือกรายการทางซ้ายเพื่อพิจารณา" (P4-R32): อนุมัติแล้ว and ปฏิเสธแล้ว hold no pending finding; ต้องติดตาม and ปิดแล้ว
  // filter on the plan (actionStatus), not the review, so a finding whose plan was saved before its review can sit
  // there still pending, but their work is the plan and the close. view is Task 3's auditFindingStatusView(status).
  const panel = data.panel ? (
    <AuditFindingReviewPanel
      locale={locale}
      data={data.panel}
      canApprove={canApprove}
      employees={data.employees}
      statusBadges={findingStatusBadges(data.panel.finding, resolveFindingState(data.panel.finding, today))}
      evidence={
        <AuditFindingEvidenceList
          attachments={data.panel.finding.evidence}
          labels={{
            title: t("evidenceAttachments"),
            count: t("evidenceAttachmentCount", { count: data.panel.finding.evidence.length }),
            open: t("openEvidenceAttachment"),
          }}
        />
      }
      disposalHref={disposalHrefFor(data.panel.finding)}
      loadedAtIso={data.loadedAt.toISOString()}
      loadedAtLabel={formatDateTime(data.loadedAt)}
      closeHref={closeHref}
    />
  ) : (
    <AuditFindingReviewPanelEmpty state={findingId ? "notFound" : data.reviewableTotal === 0 && (view.tab === "pending" || view.tab === "all") ? "done" : "choose"} />
  )

  return (
    <div className="space-y-6">
      <PageHeader
        title={t("title")}
        meta={t("subtitle")}
        // Below xl an open finding takes the page and has its own "กลับไปรายการไม่ตรง": one way back, never two arrows.
        back={<PageBackLink href={back.href} label={backLabel} className={chosen ? "max-xl:hidden" : undefined} />}
        actions={canExport ? <AuditFindingsExportMenu excelHref={`/api/audit-findings/export?${exportParams.toString()}`} pdfHref={`/api/audit-findings/export-pdf?${exportParams.toString()}`} /> : null}
      />

      {/* Two panes from xl (spec §10): the list, then the review pane (420px, sticky from xl and scrolling on its own,
          P4-R31). Below xl an open finding takes the page and the list waits behind "กลับไปรายการไม่ตรง" (P4-R13); with
          none open the pane is not shown there. AuditFindingPaneTop opens each finding at its top. */}
      <div data-audit-findings-panes className="grid min-w-0 gap-6 xl:grid-cols-[minmax(0,1fr)_420px] xl:items-start xl:gap-4">
        <div data-audit-findings-list className={cn("min-w-0 space-y-4", chosen && "max-xl:hidden")}>
          <div>
            <TabNav aria-label={t("quickFilters")} items={resolutionFilters} current={view.tab} scroll={false} />
            {view.tab === "followUp" ? <TabNav aria-label={t("followUpChipsLabel")} items={followUpChips} current={view.chip ?? ""} scroll={false} /> : null}
          </div>

          <MasterDataSearch
            action={`/${locale}/audit/findings`}
            defaultValue={searchText}
            placeholder={tCommon("search")}
            submitLabel={tCommon("search")}
            hiddenInputs={Object.fromEntries(auditFindingsHrefQuery(buildAuditFindingsHref(locale, filters, { search: "", roundId: null, findingType: null, pageSize: listPage.pageSize })))}
            leading={
              <>
                <FilterSelect label={t("roundShort")} name="roundId" defaultValue={roundId ?? ""} allLabel={t("roundFilterAll")} options={roundOptions} hideLabel fieldSize="md" className="sm:w-56" />
                <FilterSelect label={t("findingTopic")} name="findingType" defaultValue={findingType ?? ""} allLabel={t("topicFilterAll")} options={topicOptions} hideLabel fieldSize="md" className="sm:w-40" />
              </>
            }
          />
          <FilterChipList chips={filterChips} label={t("activeFilters")} removeLabel={tAsset("clearDrilldownFilter")} />

          {/* The ticks of one page of one filter (DESIGN.md Data Tables); the bar is the list pane's last child, outside
              the panel's overflow, so it sticks to main (P4-R15). */}
          <AuditFindingsSelectionProvider key={selectionKey} filterKey={filterKey} findings={selectableFindings}>
            <div className={cn(getPanelClasses(), "overflow-hidden")}>
              <div className="grid gap-3 p-3 md:hidden">
                {rows.length === 0 ? (
                  <ActionEmptyState icon={<FileText />} {...empty} actionVariant="secondary" />
                ) : (
                  rows.map((row) => {
                    const resolutionState = resolveFindingState(row, today)
                    const code = row.asset?.assetTag ?? row.auditRound.auditNo
                    const line = followUpLine(row)

                    return (
                      <article
                        key={row.id}
                        data-audit-finding-card={row.id}
                        data-finding-type={row.findingType}
                        className="relative min-w-0 rounded-md border border-border bg-background p-4 transition-colors hover:bg-row-hover"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            {/* The whole card is this link (the register's stretched-link row): a tap opens the panel full
                                screen at the top of the page, so the default scroll stays (P4-R13). */}
                            <Link
                              href={findingHref(row.id)}
                              data-audit-finding-open
                              className="block break-words font-semibold text-foreground before:absolute before:inset-0 before:rounded-md before:content-[''] focus-visible:outline-none focus-visible:before:ring-2 focus-visible:before:ring-ring"
                            >
                              <span className="tag font-medium">{code}</span>
                              {row.asset ? <> - {row.asset.name}</> : null}
                            </Link>
                            {row.parent ? <p className="mt-1 break-words text-meta text-muted-foreground">{t("componentOfParent", { assetTag: row.parent.assetTag, name: row.parent.name })}</p> : null}
                          </div>
                          <StatusBadge className="shrink-0" label={resolutionStateLabels[resolutionState]} tone={RESOLUTION_STATE_TONES[resolutionState]} />
                        </div>
                        <div className="mt-3 flex flex-wrap items-center gap-2 text-meta text-muted-foreground">
                          <Chip data-audit-finding-subject>{topicLabel(row.findingType)}</Chip>
                          <span className="tag">{row.auditRound.auditNo}</span>
                        </div>
                        <FindingValueChange className="mt-2" expectedLabel={t("systemValue")} actualLabel={t("foundValue")} expectedValue={row.expectedLabel} actualValue={row.actualLabel} />
                        {line ? <p className="mt-1 text-meta text-muted-foreground">{line}</p> : null}
                      </article>
                    )
                  })
                )}
              </div>
              <DataTable framed={false} layout="fixed" minWidth={520} className="hidden md:block" caption={t("title")} scrollHint={tCommon("tableScrollHint")}>
                {/* Four columns (spec §10): เรื่อง, ทรัพย์สิน, ตามระบบ → ที่พบ, รอบ; the asset takes what is left. 520px fits
                    the list pane beside the 420px panel at 1280 (527px) and 1440 (685px). For audit:approve the tick column
                    comes first, out of the auto asset column (P4-R36). */}
                <colgroup>
                  {canApprove ? <col className="w-11" /> : null}
                  <col className="w-28" />
                  <col />
                  <col className="w-40" />
                  <col className="w-32" />
                </colgroup>
                <DataTableHeader>
                  <tr>
                    {canApprove ? (
                      <DataTableHead className="p-0 first:pl-0 md:first:pl-0">
                        <AuditFindingSelectAllTick />
                      </DataTableHead>
                    ) : null}
                    <DataTableHead>{t("findingTopic")}</DataTableHead>
                    <DataTableHead>{t("asset")}</DataTableHead>
                    <DataTableHead className="whitespace-normal">{t("comparisonColumn")}</DataTableHead>
                    <DataTableHead>{t("roundShort")}</DataTableHead>
                  </tr>
                </DataTableHeader>
                <DataTableBody>
                  {rows.length === 0 ? (
                    <TableEmptyRow colSpan={canApprove ? 5 : 4} emptyState={{ icon: <FileText />, ...empty, actionVariant: "secondary" }} />
                  ) : (
                    rows.map((row) => {
                      const code = row.asset?.assetTag ?? row.auditRound.auditNo
                      const topic = topicLabel(row.findingType)
                      const line = followUpLine(row)

                      return (
                        <ClickableTableRow
                          key={row.id}
                          href={findingHref(row.id)}
                          scroll={false}
                          current={row.id === chosen?.id}
                          rowData={{ "data-audit-finding-row": row.id, "data-finding-type": row.findingType }}
                          label={`${tCommon("view")}: ${code} · ${topic}`}
                        >
                          {canApprove ? (
                            <DataTableCell className="p-0 first:pl-0 md:first:pl-0">
                              <AuditFindingSelectTick findingId={row.id} />
                            </DataTableCell>
                          ) : null}
                          <DataTableCell><Chip data-audit-finding-subject>{topic}</Chip></DataTableCell>
                          <DataTableCell>
                            <Link href={findingHref(row.id)} scroll={false} data-audit-finding-open className={cn(linkVariants({ size: "inherit" }), "[overflow-wrap:anywhere]")}>
                              {/* A long code wraps inside its column beside the panel (1280), at a hyphen where it can, never over
                                  the next one. */}
                              <span className="tag whitespace-normal">{code}</span>
                            </Link>
                            {row.asset ? <div className="break-words text-meta text-muted-foreground">{row.asset.name}</div> : null}
                            {row.parent ? <div className="break-words text-meta text-muted-foreground">{t("componentOfParent", { assetTag: row.parent.assetTag, name: row.parent.name })}</div> : null}
                          </DataTableCell>
                          <DataTableCell>
                            <FindingValueChange expectedLabel={t("systemValue")} actualLabel={t("foundValue")} expectedValue={row.expectedLabel} actualValue={row.actualLabel} />
                            {line ? <div className="mt-1 text-meta text-muted-foreground">{line}</div> : null}
                          </DataTableCell>
                          <DataTableCell className="text-muted-foreground">
                            <span className="tag whitespace-normal [overflow-wrap:anywhere]">{row.auditRound.auditNo}</span>
                            <div className="break-words text-meta">{row.auditRound.name}</div>
                          </DataTableCell>
                        </ClickableTableRow>
                      )
                    })
                  )}
                </DataTableBody>
              </DataTable>
              {total > 0 ? (
                <DataTableFoot>
                  <Pagination
                    page={listPage.page}
                    totalPages={totalPages}
                    previousHref={pageHref({ page: listPage.page - 1, pageSize: listPage.pageSize })}
                    nextHref={pageHref({ page: listPage.page + 1, pageSize: listPage.pageSize })}
                    pageSize={listPage.pageSize}
                    pageSizes={LIST_PAGE_SIZES.map((value) => ({ value, href: pageHref({ pageSize: value }) }))}
                    labels={{
                      navigation: tCommon("pagination"),
                      previous: tCommon("previous"),
                      next: tCommon("next"),
                      pageOf: tCommon("pageOf", { page: listPage.page, total: totalPages }),
                      range: tCommon("showingRange", { from: formatCount(start), to: formatCount(end), total: formatCount(total) }),
                      pageSizeGroup: tCommon("pageSizeLabel"),
                      rowsPerPage: tCommon("rowsPerPage"),
                    }}
                  />
                </DataTableFoot>
              ) : null}
            </div>
            {canApprove ? <AuditFindingsSelectionBar /> : null}
          </AuditFindingsSelectionProvider>
        </div>

        <div data-audit-finding-pane className={cn("min-w-0 xl:sticky xl:top-4 xl:max-h-[calc(100dvh_-_var(--shell-top)_-_3rem)] xl:overflow-y-auto", !chosen && "max-xl:hidden")}>
          {chosen ? <AuditFindingPaneTop key={chosen.id} /> : null}
          {chosen ? <PageBackLink href={closeHref} label={t("backToList")} className="mb-3 xl:hidden" /> : null}
          {panel}
        </div>
      </div>
    </div>
  )
}

type ResolutionState = "pending_review" | "open_action" | "overdue" | "closed" | "resolved"

type FindingResolutionSnapshot = {
  reviewStatus: string
  actionStatus: string
  actionDueDate: Date | string | null
}

// System value → found value as text that wraps, no box of its own (audit mobile fix D8). The labels are for screen
// readers; the column header says it to everyone else.
function FindingValueChange({
  expectedLabel,
  actualLabel,
  expectedValue,
  actualValue,
  className,
}: {
  expectedLabel: string
  actualLabel: string
  expectedValue?: string | null
  actualValue?: string | null
  className?: string
}) {
  return (
    <div className={cn("break-words text-sm text-muted-foreground", className)}>
      <span className="sr-only">{expectedLabel}: </span>
      <span>{orNil(expectedValue)}</span>
      <ArrowRight aria-hidden="true" className="mx-1 inline size-3.5 align-middle text-faint-foreground" />
      <span className="sr-only">{actualLabel}: </span>
      <span className="font-medium text-foreground">{orNil(actualValue)}</span>
    </div>
  )
}

function AuditFindingEvidenceList({ attachments, labels }: { attachments: AuditFindingEvidenceAttachment[]; labels: { title: string; count: string; open: string } }) {
  if (attachments.length === 0) return null

  return (
    <div className="mt-3 min-w-0">
      <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
        <div className="text-meta font-medium text-foreground">{labels.title}</div>
        <div className="text-meta text-muted-foreground">{labels.count}</div>
      </div>
      <ul className="mt-1 grid">
        {attachments.map((attachment) => (
          <li key={attachment.id} className="min-w-0">
            <a
              href={`/api/attachments/${attachment.id}?inline=1`}
              target="_blank"
              rel="noreferrer"
              aria-label={`${labels.open}: ${attachment.originalName}`}
              className={cn(linkVariants({ size: "inherit" }), "flex min-h-11 min-w-0 items-center gap-2")}
            >
              <FileText aria-hidden="true" className="size-4 shrink-0" />
              <span className="min-w-0 flex-1">
                <span className="block truncate">{attachment.originalName}</span>
                <span className="mt-0.5 block truncate text-meta font-normal text-muted-foreground">
                  {formatFileSize(attachment.fileSize)} · {formatDateTime(attachment.uploadedAt)}
                </span>
              </span>
            </a>
          </li>
        ))}
      </ul>
    </div>
  )
}

function resolveFindingState(finding: FindingResolutionSnapshot, today: Date): ResolutionState {
  if (finding.actionStatus === "closed") return "closed"
  if (finding.reviewStatus === "pending") return "pending_review"

  if (isOpenAuditFindingActionStatus(finding.actionStatus)) {
    if (finding.actionDueDate) {
      const dueDate = new Date(finding.actionDueDate)
      dueDate.setHours(0, 0, 0, 0)
      if (dueDate < today) return "overdue"
    }

    return "open_action"
  }

  return "resolved"
}

const RESOLUTION_STATE_TONES: Record<ResolutionState, StatusTone> = {
  pending_review: "warning",
  open_action: "info",
  overdue: "danger",
  closed: "success",
  resolved: "primary",
}

type FindingStatusBadgeItem = {
  key: string
  /** The status's own name (its old column header): a tooltip, and read out before the badge. */
  title: string
  label: string
  status?: string
  tone?: StatusTone
}
