import Link from "next/link"
import { redirect } from "next/navigation"
import { getTranslations } from "next-intl/server"
import { Archive, ArrowRight, Download, FileText } from "lucide-react"
import { prisma } from "@/lib/db"
import { hasPermission } from "@/lib/auth-utils"
import { requirePagePermission } from "@/lib/page-auth"
import { MasterDataSearch } from "@/components/master-data/master-data-layout"
import { AuditFindingReviewActions } from "@/components/audit/audit-finding-review-actions"
import { AuditFindingsBatchActions } from "@/components/audit/audit-findings-batch-actions"
import { buildFindingValueLabels, formatFindingValue } from "@/lib/audit-finding-labels"
import { cn, formatDateTime } from "@/lib/utils"
import { formatFileSize } from "@/lib/uploads"
import { ClickableTableRow } from "@/components/ui/clickable-table-row"
import { ActionEmptyState } from "@/components/ui/action-empty-state"
import { buttonVariants, linkVariants } from "@/components/ui/button-variants"
import { DataFreshnessBanner } from "@/components/ui/data-freshness-banner"
import { DataTable, DataTableBody, DataTableCell, DataTableFoot, DataTableHead, DataTableHeader, TableEmptyRow } from "@/components/ui/data-table"
import { FilterChipList, type FilterChipItem } from "@/components/ui/filter-chips"
import { KeyValueList } from "@/components/ui/key-value-list"
import { Nil, orNil } from "@/components/ui/nil"
import { PageBackLink, PageHeader } from "@/components/ui/page-header"
import { Pagination } from "@/components/ui/pagination"
import { RowActions, type RowActionItem } from "@/components/ui/row-actions"
import { StatStrip } from "@/components/ui/stat-strip"
import { StatusBadge, type StatusTone } from "@/components/ui/status-badge"
import { TabNav } from "@/components/ui/tab-nav"
import { isSameAuditActor } from "@/lib/audit-segregation"
import {
  auditFindingResolutionStatuses,
  buildAuditFindingWhere,
  getAuditFindingToday,
  isAuditFindingWaitingStatus,
  isOpenAuditFindingActionStatus,
  resolveAuditFindingStatus,
  type AuditFindingResolutionStatus,
} from "@/lib/audit-finding-filters"
import { getWaitingWorkRules } from "@/lib/waiting-work"
import { DEFAULT_WAITING_WORK_RULES } from "@/lib/waiting-work-rules"
import { getPanelClasses } from "@/lib/design-system"
import { formatCount } from "@/lib/display-format"
import { LIST_PAGE_SIZES, appendListPage, lastListPage, listPageWindow, parseListPage } from "@/lib/list-pagination"
import { paginationRange } from "@/lib/master-data-query"
import { appendOperationalReturnTo } from "@/lib/operational-return-navigation"
import { getAuditItemReconcileStatusLabelKey, getAuditItemStatusLabelKey } from "@/lib/audit-item-status-labels"

type AuditFindingsPageProps = {
  params: Promise<{ locale: string }>
  searchParams: Promise<{ search?: string; status?: string; roundId?: string; findingType?: string; page?: string | string[]; pageSize?: string | string[] }>
}

type AuditFindingEvidenceAttachment = {
  id: string
  originalName: string
  fileType: string
  fileSize: number
  uploadedAt: Date
}

export default async function AuditFindingsPage({ params, searchParams }: AuditFindingsPageProps) {
  const { locale } = await params
  const { search = "", status: statusParam = "pending", roundId: roundIdParam = "", findingType: findingTypeParam = "", page, pageSize } = await searchParams
  const user = await requirePagePermission(locale, "audit", "view")
  const canEdit = hasPermission(user, "audit", "edit")
  const canApprove = hasPermission(user, "audit", "approve")
  // The exports' routes need audit:export (spec §6.5: a role without it does not see them; the E2E suite's AU1, M1).
  const canExport = hasPermission(user, "audit", "export")
  const canCreateDisposal = hasPermission(user, "disposal", "create")

  const t = await getTranslations("auditFinding")
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
  const pageLoadedAt = new Date()
  const searchText = search.trim()
  const roundId = roundIdParam.trim()
  const findingType = findingTypeParam.trim()
  const status = resolveAuditFindingStatus(statusParam)
  // The bell's two action kinds read its own day count; other statuses read no setting.
  const waitingRules = isAuditFindingWaitingStatus(status) ? await getWaitingWorkRules() : DEFAULT_WAITING_WORK_RULES
  const today = getAuditFindingToday()
  const listPage = parseListPage({ page, pageSize })
  const auditFindingsReturnHref = buildAuditFindingsHref(locale, status, searchText, { roundId, findingType }, listPage)
  // This list at another page or page size, with the same filters.
  const pageHref = (next: { page?: number; pageSize?: number }) => buildAuditFindingsHref(locale, status, searchText, { roundId, findingType }, next)
  // A filter link goes back to page 1 and keeps the page size (spec 2B §5.9.1).
  const filterHref = (nextStatus: AuditFindingResolutionStatus, filters: { roundId?: string; findingType?: string } = { roundId, findingType }) =>
    buildAuditFindingsHref(locale, nextStatus, searchText, filters, { pageSize: listPage.pageSize })
  const exportParams = new URLSearchParams()
  if (searchText) exportParams.set("search", searchText)
  if (roundId) exportParams.set("roundId", roundId)
  if (findingType) exportParams.set("findingType", findingType)
  exportParams.set("status", status)
  const where = buildAuditFindingWhere({ status, search: searchText, roundId, findingType, now: pageLoadedAt, rules: waitingRules })
  const { skip, take } = listPageWindow(listPage)
  const [findings, employees, pendingReviewCount, openActionCount, overdueCount, closedCount, otherStatusTotal, filterRound] = await Promise.all([
    prisma.auditFinding.findMany({
      where,
      include: {
        auditRound: { select: { id: true, auditNo: true, name: true } },
        auditItem: { select: { auditStatus: true, reconcileStatus: true } },
        asset: { select: { id: true, assetTag: true, name: true } },
      },
      orderBy: [{ reportedAt: "desc" }, { id: "asc" }],
      skip,
      take,
    }),
    canEdit
      ? prisma.employee.findMany({
          where: { isActive: true },
          select: { id: true, code: true, fullNameTh: true },
          orderBy: { code: "asc" },
        })
      : Promise.resolve([]),
    prisma.auditFinding.count({ where: buildAuditFindingWhere({ status: "pending", search: searchText, roundId, findingType, now: pageLoadedAt }) }),
    prisma.auditFinding.count({ where: buildAuditFindingWhere({ status: "action_open", search: searchText, roundId, findingType, now: pageLoadedAt }) }),
    prisma.auditFinding.count({ where: buildAuditFindingWhere({ status: "overdue", search: searchText, roundId, findingType, now: pageLoadedAt }) }),
    prisma.auditFinding.count({ where: buildAuditFindingWhere({ status: "closed", search: searchText, roundId, findingType, now: pageLoadedAt }) }),
    // The four counts above already cover the whole list of their status; any other status needs one count of its own.
    SUMMARY_STATUSES.has(status) ? Promise.resolve(null) : prisma.auditFinding.count({ where }),
    // The round chip names the round (spec 2B I24). Read-only, one row.
    roundId ? prisma.auditRound.findUnique({ where: { id: roundId }, select: { auditNo: true } }) : Promise.resolve(null),
  ])
  const summaryCounts: Partial<Record<AuditFindingResolutionStatus, number>> = {
    pending: pendingReviewCount,
    action_open: openActionCount,
    overdue: overdueCount,
    closed: closedCount,
  }
  const total = summaryCounts[status] ?? otherStatusTotal ?? 0
  // A page past the last one (an old link, or the last finding of the last page decided) shows the last page (spec 2B I21).
  const lastPage = lastListPage(total, listPage.pageSize)
  if (findings.length === 0 && total > 0 && listPage.page > lastPage) {
    redirect(pageHref({ page: lastPage, pageSize: listPage.pageSize }))
  }
  const { start, end, totalPages } = paginationRange(listPage.page, listPage.pageSize, total)
  const findingIds = findings.map((finding) => finding.id)
  const evidenceAttachments = findingIds.length
    ? await prisma.attachment.findMany({
        where: { module: "audit_finding", referenceId: { in: findingIds }, isActive: true },
        select: {
          id: true,
          referenceId: true,
          originalName: true,
          fileType: true,
          fileSize: true,
          uploadedAt: true,
        },
        orderBy: { uploadedAt: "desc" },
      })
    : []
  const attachmentsByFindingId = new Map<string, AuditFindingEvidenceAttachment[]>()
  for (const attachment of evidenceAttachments) {
    const current = attachmentsByFindingId.get(attachment.referenceId) ?? []
    current.push({
      id: attachment.id,
      originalName: attachment.originalName,
      fileType: attachment.fileType,
      fileSize: attachment.fileSize,
      uploadedAt: attachment.uploadedAt,
    })
    attachmentsByFindingId.set(attachment.referenceId, current)
  }
  const attachmentCountByFindingId = new Map(
    Array.from(attachmentsByFindingId, ([findingId, attachments]) => [findingId, attachments.length])
  )
  const employeeOptions = employees.map((employee) => ({ id: employee.id, label: `${employee.code} - ${employee.fullNameTh}` }))
  const employeeLabelById = new Map(employeeOptions.map((employee) => [employee.id, employee.label]))
  const valueLabels = await buildFindingValueLabels(findings)
  const batchReviewFindings = findings
    .filter((finding) => finding.reviewStatus === "pending" && !isSameAuditActor(user.id, finding.reportedBy))
    .map((finding) => ({
      id: finding.id,
      label: finding.asset ? `${finding.asset.assetTag} - ${finding.asset.name}` : finding.auditRound.auditNo,
      detail: `${finding.auditRound.auditNo} · ${t(`type_${finding.findingType}`)}`,
    }))
  const resolutionFilterLabels: Record<AuditFindingResolutionStatus, string> = {
    pending: t("status_pending"),
    action_open: t("filterActionOpen"),
    overdue: t("filterOverdue"),
    closed: t("filterClosed"),
    approved: t("status_approved"),
    rejected: t("status_rejected"),
    exception: t("status_exception"),
    all: t("status_all"),
    action_not_due: tNotifications("openAuditActions"),
    action_due_soon: tNotifications("auditActionsDueSoon"),
  }
  const resolutionStateLabels: Record<ResolutionState, string> = {
    pending_review: t("resolutionStatePendingReview"),
    open_action: t("resolutionStateOpenAction"),
    overdue: t("resolutionStateOverdue"),
    closed: t("resolutionStateClosed"),
    resolved: t("resolutionStateResolved"),
  }
  const resolutionSummaryItems: ResolutionMetric[] = [
    {
      status: "pending",
      label: t("summaryPendingReview"),
      help: t("summaryPendingReviewHelp"),
      count: pendingReviewCount,
      attention: pendingReviewCount > 0,
    },
    {
      status: "action_open",
      label: t("summaryOpenActions"),
      help: t("summaryOpenActionsHelp"),
      count: openActionCount,
      attention: false,
    },
    {
      status: "overdue",
      label: t("summaryOverdue"),
      help: t("summaryOverdueHelp"),
      count: overdueCount,
      attention: overdueCount > 0,
    },
    {
      status: "closed",
      label: t("summaryClosed"),
      help: t("summaryClosedHelp"),
      count: closedCount,
      attention: false,
    },
  ]
  const resolutionFilters = auditFindingResolutionStatuses.map((item) => ({
    key: item,
    label: resolutionFilterLabels[item],
    href: filterHref(item),
  }))
  // roundId and findingType come from a drill-down link and have no field on this page, so each shows as a chip that
  // removes only itself (spec 2B I24, DESIGN.md "chips for every active filter that is not visible on screen").
  const findingTypeKey = `type_${findingType}`
  const filterChips: FilterChipItem[] = [
    // A bell link's action filter has no tab, so it shows as a chip; removing it keeps the round and type.
    ...(isAuditFindingWaitingStatus(status) ? [{ key: "status", label: resolutionFilterLabels[status], href: filterHref("all") }] : []),
    ...(roundId ? [{ key: "roundId", label: `${t("auditRound")}: ${filterRound?.auditNo ?? roundId}`, href: filterHref(status, { findingType }) }] : []),
    ...(findingType ? [{ key: "findingType", label: `${t("findingType")}: ${t.has(findingTypeKey) ? t(findingTypeKey) : findingType}`, href: filterHref(status, { roundId }) }] : []),
  ]
  // The batch selection belongs to one page of one filter: another page or filter starts with nothing selected.
  const selectionKey = `${listPage.page}:${listPage.pageSize}:${status}:${searchText}:${roundId}:${findingType}`
  // The five statuses of a finding in one table cell (audit mobile fix D8): the resolution state always, the others
  // only when they add something to it. Each keeps the tone it had in its own column.
  const findingStatusBadges = (finding: (typeof findings)[number], resolutionState: ResolutionState): FindingStatusBadgeItem[] => [
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

  return (
    <div className="space-y-6">
      <PageHeader
        title={t("title")}
        meta={t("subtitle")}
        back={<PageBackLink href={`/${locale}/audit/rounds`} label={t("backToRounds")} />}
      />

      <DataFreshnessBanner
        loadedAtIso={pageLoadedAt.toISOString()}
        loadedAtLabel={formatDateTime(pageLoadedAt)}
        labels={{
          freshTitle: t("freshnessFreshTitle"),
          freshHelp: t("freshnessFreshHelp"),
          staleTitle: t("freshnessStaleTitle"),
          staleHelp: t("freshnessStaleHelp"),
          refresh: t("freshnessRefresh"),
        }}
      />

      <section aria-labelledby="audit-finding-resolution-title" className="space-y-3">
        <div>
          <h2 id="audit-finding-resolution-title" className="text-base font-semibold text-foreground">{t("resolutionTitle")}</h2>
          <p className="mt-1 text-sm text-muted-foreground">{t("resolutionHelp")}</p>
        </div>
        <StatStrip
          items={resolutionSummaryItems.map((item) => ({
            key: item.status,
            label: item.label,
            value: formatCount(item.count),
            foot: item.help,
            footTitle: item.help,
            href: filterHref(item.status),
            current: status === item.status,
            scroll: false,
            attention: item.attention,
          }))}
        />
      </section>

      <MasterDataSearch
        action={`/${locale}/audit/findings`}
        defaultValue={searchText}
        placeholder={tCommon("search")}
        submitLabel={tCommon("search")}
        hiddenInputs={{ status, ...(roundId ? { roundId } : {}), ...(findingType ? { findingType } : {}), ...Object.fromEntries(appendListPage(new URLSearchParams(), { pageSize: listPage.pageSize })) }}
      />

      <section aria-labelledby="audit-finding-queue-title" className="space-y-3">
        <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
          <div>
            <h2 id="audit-finding-queue-title" className="text-base font-semibold text-foreground">{t("quickFilters")}</h2>
            <p className="mt-1 text-sm text-muted-foreground">{t("quickFiltersHelp")}</p>
          </div>
          {canExport ? (
            <div className="flex min-w-0 flex-col gap-2 md:flex-row md:flex-wrap">
              <a href={`/api/audit-findings/export?${exportParams.toString()}`} download className={buttonVariants({ variant: "outline", size: "md" })}>
                <Download aria-hidden="true" />
                {t("exportFindings")}
              </a>
              <a href={`/api/audit-findings/export-pdf?${exportParams.toString()}`} download className={buttonVariants({ variant: "outline", size: "md" })}>
                <FileText aria-hidden="true" />
                {t("exportFindingsPdf")}
              </a>
            </div>
          ) : null}
        </div>
        <TabNav aria-label={t("quickFilters")} items={resolutionFilters} current={status} scroll={false} />
        <FilterChipList chips={filterChips} label={t("activeFilters")} removeLabel={tAsset("clearDrilldownFilter")} />
      </section>

      {canApprove ? <AuditFindingsBatchActions key={selectionKey} findings={batchReviewFindings} /> : null}

      <div className={cn(getPanelClasses(), "overflow-hidden")}>
        <div className="grid gap-3 p-3 md:hidden">
          {findings.length === 0 ? (
            <ActionEmptyState
              icon={<FileText />}
              title={t("emptyTitle")}
              description={t("emptyHelp")}
              actionHref={`/${locale}/audit/rounds`}
              actionLabel={t("backToRounds")}
              actionVariant="secondary"
            />
          ) : (
            findings.map((finding) => {
              const resolutionState = resolveFindingState(finding, today)
              const assetLabel = finding.asset ? `${finding.asset.assetTag} - ${finding.asset.name}` : finding.auditRound.auditNo
              const findingTypeLabel = t(`type_${finding.findingType}`)
              const expectedValue = formatFindingValue(finding.findingType, finding.expectedValue, valueLabels)
              const actualValue = formatFindingValue(finding.findingType, finding.actualValue, valueLabels)

              return (
                <div key={finding.id} className="rounded-md border border-border bg-background p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="font-semibold text-foreground">
                        {finding.asset ? <><span className="tag font-medium">{finding.asset.assetTag}</span> - {finding.asset.name}</> : <span className="tag font-medium">{finding.auditRound.auditNo}</span>}
                      </div>
                      <div className="mt-1 text-meta text-muted-foreground">{formatDateTime(finding.reportedAt)}</div>
                    </div>
                    <StatusBadge label={resolutionStateLabels[resolutionState]} tone={RESOLUTION_STATE_TONES[resolutionState]} />
                  </div>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <StatusBadge label={t(`status_${finding.reviewStatus}`)} status={finding.reviewStatus} />
                    <StatusBadge label={t(`actionStatus_${finding.actionStatus}`)} status={finding.actionStatus} />
                  </div>
                  <KeyValueList
                    className="mt-3"
                    items={[
                      { key: "auditRound", label: t("auditRound"), value: <><span className="tag">{finding.auditRound.auditNo}</span> · {finding.auditRound.name}</> },
                      { key: "findingType", label: t("findingType"), value: findingTypeLabel },
                      { key: "systemValue", label: t("systemValue"), value: expectedValue },
                      { key: "foundValue", label: t("foundValue"), value: actualValue ? <span className="font-medium">{actualValue}</span> : null },
                      {
                        key: "actionOwner",
                        label: t("actionOwner"),
                        value: finding.actionOwnerId ? (employeeLabelById.get(finding.actionOwnerId) ?? finding.actionOwnerId) : null,
                        nilLabel: t("noActionOwner"),
                      },
                      { key: "actionDueDate", label: t("actionDueDate"), value: finding.actionDueDate ? formatDateTime(finding.actionDueDate) : null },
                    ]}
                  />
                  <AuditFindingEvidenceList
                    attachments={attachmentsByFindingId.get(finding.id) ?? []}
                    labels={{
                      title: t("evidenceAttachments"),
                      count: t("evidenceAttachmentCount", { count: attachmentCountByFindingId.get(finding.id) ?? 0 }),
                      open: t("openEvidenceAttachment"),
                    }}
                  />
                  <div className="mt-3 flex flex-col gap-2">
                    <Link
                      href={finding.asset ? `/${locale}/assets/${finding.asset.id}` : `/${locale}/audit/rounds/${finding.auditRound.id}`}
                      className={buttonVariants({ variant: "outline" })}
                    >
                      {tCommon("view")}
                    </Link>
                    {canApprove ? (
                      <AuditFindingReviewActions
                        findingId={finding.id}
                        assetLabel={assetLabel}
                        findingTypeLabel={findingTypeLabel}
                        expectedValue={expectedValue}
                        actualValue={actualValue}
                        reviewStatus={finding.reviewStatus}
                        actionStatus={finding.actionStatus}
                        actionPlan={finding.actionPlan}
                        actionOwnerId={finding.actionOwnerId}
                        actionDueDate={finding.actionDueDate}
                        evidenceCount={attachmentCountByFindingId.get(finding.id) ?? 0}
                        employees={employeeOptions}
                        reviewBlocked={isSameAuditActor(user.id, finding.reportedBy)}
                        reviewBlockedReason={t("segregationReviewBlocked")}
                      />
                    ) : null}
                    {canCreateDisposal && finding.asset ? (
                      <Link
                        href={appendOperationalReturnTo(`/${locale}/disposal/new?assetId=${finding.asset.id}&reason=${encodeURIComponent(`${t("disposalFromFindingReason")} ${finding.auditRound.auditNo}: ${t(`type_${finding.findingType}`)}`)}&sourceType=audit_finding&sourceId=${finding.id}`, auditFindingsReturnHref)}
                        className={buttonVariants({ variant: "outline" })}
                      >
                        {t("openDisposalRequest")}
                      </Link>
                    ) : null}
                  </div>
                </div>
              )
            })
          )}
        </div>
        <DataTable framed={false} layout="fixed" minWidth={960} className="hidden md:block" caption={t("title")} scrollHint={tCommon("tableScrollHint")}>
          {/* 8 fixed columns, 960px in all, inside the 963px of the 1280×800 box (audit mobile fix D8). The auto layout
              squeezed a column whose cells were all "—", so every width is set here. The comparison gets 152px, since
              a found value can be an asset name; the action column holds approve and reject stacked plus ⋯ (118px).
              Below 1280 the table scrolls and the action column stays pinned. */}
          <colgroup>
            <col className="w-26" />
            <col className="w-29" />
            <col className="w-34" />
            <col className="w-19" />
            <col className="w-38" />
            <col className="w-31" />
            <col className="w-22" />
            <col className="w-41" />
          </colgroup>
          <DataTableHeader>
            <tr>
              <DataTableHead>{t("reportedAt")}</DataTableHead>
              <DataTableHead>{t("auditRound")}</DataTableHead>
              <DataTableHead>{t("asset")}</DataTableHead>
              <DataTableHead>{t("findingType")}</DataTableHead>
              <DataTableHead className="whitespace-normal">{t("comparisonColumn")}</DataTableHead>
              <DataTableHead>{tCommon("status")}</DataTableHead>
              <DataTableHead>{t("actionOwner")}</DataTableHead>
              <DataTableHead align="right" sticky="right">{tCommon("actions")}</DataTableHead>
            </tr>
          </DataTableHeader>
          <DataTableBody>
            {findings.length === 0 ? (
              <TableEmptyRow
                colSpan={8}
                emptyState={{
                  icon: <FileText />,
                  title: t("emptyTitle"),
                  description: t("emptyHelp"),
                  actionHref: `/${locale}/audit/rounds`,
                  actionLabel: t("backToRounds"),
                  actionVariant: "secondary",
                }}
              />
            ) : (
              findings.map((finding) => {
                const resolutionState = resolveFindingState(finding, today)
                const assetLabel = finding.asset ? `${finding.asset.assetTag} - ${finding.asset.name}` : finding.auditRound.auditNo
                const findingTypeLabel = t(`type_${finding.findingType}`)
                const expectedValue = formatFindingValue(finding.findingType, finding.expectedValue, valueLabels)
                const actualValue = formatFindingValue(finding.findingType, finding.actualValue, valueLabels)
                const rowCode = finding.asset?.assetTag ?? finding.auditRound.auditNo
                const disposalMenuLinks: RowActionItem[] = canCreateDisposal && finding.asset
                  ? [{ kind: "link", key: "disposal", label: t("openDisposalRequest"), href: appendOperationalReturnTo(`/${locale}/disposal/new?assetId=${finding.asset.id}&reason=${encodeURIComponent(`${t("disposalFromFindingReason")} ${finding.auditRound.auditNo}: ${t(`type_${finding.findingType}`)}`)}&sourceType=audit_finding&sourceId=${finding.id}`, auditFindingsReturnHref), icon: <Archive aria-hidden="true" /> }]
                  : []

                return (
                  <ClickableTableRow
                    key={finding.id}
                    href={finding.asset ? `/${locale}/assets/${finding.asset.id}` : `/${locale}/audit/rounds/${finding.auditRound.id}`}
                    label={`${tCommon("view")}: ${finding.asset?.assetTag ?? finding.auditRound.auditNo}`}
                  >
                    <DataTableCell className="text-meta text-muted-foreground">{formatDateTime(finding.reportedAt)}</DataTableCell>
                    <DataTableCell className="text-muted-foreground">
                      <Link href={`/${locale}/audit/rounds/${finding.auditRound.id}`} className={linkVariants({ size: "inherit" })}>
                        <span className="tag">{finding.auditRound.auditNo}</span>
                      </Link>
                      <div className="text-meta text-muted-foreground">{finding.auditRound.name}</div>
                    </DataTableCell>
                    <DataTableCell>
                      {finding.asset ? (
                        <>
                          <div className="font-medium text-foreground"><span className="tag">{finding.asset.assetTag}</span></div>
                          <div className="text-meta text-muted-foreground">{finding.asset.name}</div>
                        </>
                      ) : <Nil />}
                    </DataTableCell>
                    <DataTableCell className="text-muted-foreground">{findingTypeLabel}</DataTableCell>
                    <DataTableCell>
                      <FindingValueChange
                        expectedLabel={t("systemValue")}
                        actualLabel={t("foundValue")}
                        expectedValue={expectedValue}
                        actualValue={actualValue}
                      />
                      <AuditFindingEvidenceList
                        compact
                        attachments={attachmentsByFindingId.get(finding.id) ?? []}
                        labels={{
                          title: t("evidenceAttachments"),
                          count: t("evidenceAttachmentCount", { count: attachmentCountByFindingId.get(finding.id) ?? 0 }),
                          open: t("openEvidenceAttachment"),
                        }}
                      />
                    </DataTableCell>
                    <DataTableCell>
                      <FindingStatusBadges items={findingStatusBadges(finding, resolutionState)} />
                    </DataTableCell>
                    <DataTableCell className="text-muted-foreground">
                      <div>{finding.actionOwnerId ? (employeeLabelById.get(finding.actionOwnerId) ?? finding.actionOwnerId) : <Nil label={t("noActionOwner")} />}</div>
                      <div className="mt-0.5 text-meta">{finding.actionDueDate ? t("dueOn", { date: formatDateTime(finding.actionDueDate) }) : <Nil />}</div>
                    </DataTableCell>
                    <DataTableCell align="right" sticky="right">
                      {/* Pattern ช1 (2B, fix round 3): the review decision stays visible; plan, close and the disposal request
                          are in one ⋯, whose items mount the dialogs (AuditFindingReviewActions compact). */}
                      {canApprove ? (
                        <AuditFindingReviewActions
                          compact
                          menuCode={rowCode}
                          menuLinks={disposalMenuLinks}
                          findingId={finding.id}
                          assetLabel={assetLabel}
                          findingTypeLabel={findingTypeLabel}
                          expectedValue={expectedValue}
                          actualValue={actualValue}
                          reviewStatus={finding.reviewStatus}
                          actionStatus={finding.actionStatus}
                          actionPlan={finding.actionPlan}
                          actionOwnerId={finding.actionOwnerId}
                          actionDueDate={finding.actionDueDate}
                          evidenceCount={attachmentCountByFindingId.get(finding.id) ?? 0}
                          employees={employeeOptions}
                          reviewBlocked={isSameAuditActor(user.id, finding.reportedBy)}
                          reviewBlockedReason={t("segregationReviewBlocked")}
                        />
                      ) : disposalMenuLinks.length > 0 ? (
                        <RowActions code={rowCode} name={assetLabel} menuLabel={tCommon("moreActionsFor", { code: rowCode })} groups={[{ key: "finding", items: disposalMenuLinks }]} />
                      ) : (
                        <Nil />
                      )}
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
    </div>
  )
}

type ResolutionState = "pending_review" | "open_action" | "overdue" | "closed" | "resolved"

type FindingResolutionSnapshot = {
  reviewStatus: string
  actionStatus: string
  actionDueDate: Date | string | null
}

// One cell of the resolution number strip (StatStrip). Its count covers the whole filtered list, never one page.
type ResolutionMetric = {
  status: "pending" | "action_open" | "overdue" | "closed"
  label: string
  help: string
  count: number
  // Work waits on it: the cell's foot line turns warning with its icon. No tone fill (spec 2B R-d).
  attention: boolean
}

// The statuses the strip counts. A list filtered by one of them takes its total from the strip (spec 2B §5.9.2 row 3).
const SUMMARY_STATUSES: ReadonlySet<AuditFindingResolutionStatus> = new Set(["pending", "action_open", "overdue", "closed"])

// The desktop table's comparison (audit mobile fix D8): system value → found value as text that wraps, no box of its
// own. The labels are for screen readers; the column header says it to everyone else.
function FindingValueChange({
  expectedLabel,
  actualLabel,
  expectedValue,
  actualValue,
}: {
  expectedLabel: string
  actualLabel: string
  expectedValue?: string | null
  actualValue?: string | null
}) {
  return (
    <div className="break-words text-sm text-muted-foreground">
      <span className="sr-only">{expectedLabel}: </span>
      <span>{orNil(expectedValue)}</span>
      <ArrowRight aria-hidden="true" className="mx-1 inline size-3.5 align-middle text-faint-foreground" />
      <span className="sr-only">{actualLabel}: </span>
      <span className="font-medium text-foreground">{orNil(actualValue)}</span>
    </div>
  )
}

function AuditFindingEvidenceList({
  attachments,
  labels,
  compact = false,
}: {
  attachments: AuditFindingEvidenceAttachment[]
  labels: { title: string; count: string; open: string }
  /** The desktop table: the count and the file links on one line, truncated, no box. */
  compact?: boolean
}) {
  if (attachments.length === 0) return null

  if (compact) {
    return (
      <div className="mt-1 flex min-w-0 items-center gap-1 text-meta text-muted-foreground">
        <span className="shrink-0">{labels.count}</span>
        {attachments.map((attachment) => (
          <a
            key={attachment.id}
            href={`/api/attachments/${attachment.id}?inline=1`}
            target="_blank"
            rel="noreferrer"
            aria-label={`${labels.open}: ${attachment.originalName}`}
            title={attachment.originalName}
            className={cn(linkVariants(), "flex min-w-0 items-center gap-1")}
          >
            <span aria-hidden="true" className="shrink-0 text-faint-foreground">·</span>
            <FileText aria-hidden="true" className="size-3.5 shrink-0" />
            <span className="truncate">{attachment.originalName}</span>
          </a>
        ))}
      </div>
    )
  }

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

// The status badges of one finding, stacked (audit mobile fix D8). The list is as wide as its 124px column's content
// (100px): a longer label truncates and its tooltip has the whole text.
function FindingStatusBadges({ items }: { items: FindingStatusBadgeItem[] }) {
  return (
    <ul className="flex w-25 flex-col items-start gap-1">
      {items.map((item) => (
        <li key={item.key} title={`${item.title}: ${item.label}`} className="max-w-full">
          <span className="sr-only">{item.title}: </span>
          <StatusBadge label={item.label} status={item.status} tone={item.tone} />
        </li>
      ))}
    </ul>
  )
}

function buildAuditFindingsHref(
  locale: string,
  status: AuditFindingResolutionStatus,
  searchText: string,
  filters: { roundId?: string; findingType?: string } = {},
  listPage: { page?: number; pageSize?: number } = {}
) {
  const params = new URLSearchParams()
  params.set("status", status)
  if (searchText) params.set("search", searchText)
  if (filters.roundId) params.set("roundId", filters.roundId)
  if (filters.findingType) params.set("findingType", filters.findingType)
  // page only above 1 and pageSize only when it is not 25, so every default link stays as it was (spec 2B B4).
  appendListPage(params, listPage)
  return `/${locale}/audit/findings?${params.toString()}`
}
