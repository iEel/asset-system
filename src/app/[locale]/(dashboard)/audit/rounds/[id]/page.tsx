import Link from "next/link"
import { notFound, redirect } from "next/navigation"
import { getTranslations } from "next-intl/server"
import { ArrowLeft, Check, ChevronRight, FileText, ListChecks, Pencil, ScanLine } from "lucide-react"
import { requirePagePermission } from "@/lib/page-auth"
import { MasterDataSearch } from "@/components/master-data/master-data-layout"
import { cn, formatDate, formatDateTime } from "@/lib/utils"
import { ClickableTableRow } from "@/components/ui/clickable-table-row"
import { AuditRoundCloseButton } from "@/components/audit/audit-round-close-button"
import { AuditRoundHeaderMenus } from "@/components/audit/audit-round-header-menus"
import { hasPermission } from "@/lib/auth-utils"
import { ActionBar, actionBarPagePadding, type ActionBarLink } from "@/components/ui/action-bar"
import { ActionEmptyState } from "@/components/ui/action-empty-state"
import { buttonVariants, linkVariants } from "@/components/ui/button-variants"
import { Chip } from "@/components/ui/chip"
import { ContentPanel } from "@/components/ui/content-panel"
import { FilterChipList, type FilterChipItem } from "@/components/ui/filter-chips"
import { DistributionBar } from "@/components/ui/distribution-bar"
import { DataTable, DataTableBody, DataTableCell, DataTableFoot, DataTableHead, DataTableHeader, TableEmptyRow } from "@/components/ui/data-table"
import { KeyValueList } from "@/components/ui/key-value-list"
import { Nil } from "@/components/ui/nil"
import { Notice } from "@/components/ui/notice"
import { PageHeader } from "@/components/ui/page-header"
import { PaceBar } from "@/components/ui/pace-bar"
import { Pagination } from "@/components/ui/pagination"
import { RowActions } from "@/components/ui/row-actions"
import { StatStrip } from "@/components/ui/stat-strip"
import { StatusBadge } from "@/components/ui/status-badge"
import { Steps } from "@/components/ui/steps"
import { toneIcons } from "@/components/ui/tone-icons"
import { getDesktopTableOnlyClasses, getMobileCardListClasses, getPanelClasses } from "@/lib/design-system"
import { formatCount, formatPercent } from "@/lib/display-format"
import { lastListPage } from "@/lib/list-pagination"
import { appendOperationalReturnTo, normalizeOperationalReturnTo } from "@/lib/operational-return-navigation"
import { auditRoundStatusLabelKey, effectiveAuditRoundStatus, isAuditRoundReadOnlyStatus } from "@/lib/audit-round-status"
import type { AuditCorrectionHistoryItem } from "@/lib/audit-correction-history"
import { getAuditRoundPageData } from "@/lib/audit-round-page-data"
import { auditRoundPageStepKeys, buildAuditRoundPageMainAction, buildAuditRoundPageSteps, type AuditRoundPageStepKey } from "@/lib/audit-round-page-rules"
import { buildAuditRoundDueLine } from "@/lib/audit-rounds-list-rules"
import { startOfBangkokDay } from "@/lib/waiting-work-rules"
import { withPerformanceTiming } from "@/lib/performance-timing"
import { paginationRange } from "@/lib/master-data-query"
import {
  auditFindingFields,
  auditFindingTypeByField,
  auditRoundBranchFilterName,
  auditRoundResultPageSizeOptions,
  buildAuditRoundExportHref,
  buildAuditRoundPageHref,
  buildAuditRoundResultListHref,
  getAuditRoundItemResultLabelKey,
  getAuditRoundItemStatusLabelKey,
  parseAuditRoundListFilters,
  parseAuditRoundResultListParams,
  type AuditRoundListFilters,
  type AuditRoundPageHrefOverrides,
  type AuditRoundResultFilter,
} from "@/lib/audit-round-result-filters"
import { getAuditItemStatusLabelKey } from "@/lib/audit-item-status-labels"

const WarningIcon = toneIcons.warning

type AuditRoundDetailPageProps = {
  params: Promise<{ locale: string; id: string }>
  searchParams: Promise<{ returnTo?: string | string[]; result?: string | string[]; search?: string | string[]; page?: string | string[]; pageSize?: string | string[]; companyId?: string | string[]; branchId?: string | string[]; categoryId?: string | string[]; field?: string | string[]; components?: string | string[] }>
}

export default async function AuditRoundDetailPage({ params, searchParams }: AuditRoundDetailPageProps) {
  const { locale, id } = await params
  const rawSearchParams = await searchParams
  const user = await requirePagePermission(locale, "audit", "view")
  const canApprove = hasPermission(user, "audit", "approve")
  const t = await getTranslations("auditRound")
  const tFinding = await getTranslations("auditFinding")
  const tCommon = await getTranslations("common")

  const resultListState = parseAuditRoundResultListParams(rawSearchParams)
  const itemFilters = { companyId: resultListState.companyId, branchId: resultListState.branchId, categoryId: resultListState.categoryId, field: resultListState.field, components: resultListState.components }
  // The page's names from here on (Tasks 4-5 read filters, page and pageSize; Task 5 folds this into the parse).
  const { page, pageSize, ...filters } = resultListState
  const data = await withPerformanceTiming(
    "audit-round.page-data",
    () => getAuditRoundPageData({ roundId: id, filters, page, pageSize, user }),
    { route: "/audit/rounds/[id]", locale, result: filters.result, hasSearch: Boolean(filters.search) }
  )
  if (!data) notFound()
  const { round } = data
  const resultItems = data.rows
  const resultItemTotal = data.total
  const filterCompany = data.filterNames.company
  const filterBranch = data.filterNames.branch
  const filterCategory = data.filterNames.category
  const isRoundReadOnly = isAuditRoundReadOnlyStatus(round.status)
  // The round's exports need audit:export (their routes check it; the E2E suite's AU1, M1).
  const canExportRound = round.status !== "cancelled" && hasPermission(user, "audit", "export")
  const cancelledByDisplayName = data.round.cancelledByLabel

  const returnToHref = normalizeOperationalReturnTo(locale, "audit-rounds", rawSearchParams.returnTo)
  // Who may do what here (group 2 spec §5, P2-R7): audit:edit scans and corrects, audit:approve cancels and closes,
  // audit:export exports. Nobody is offered a control the API would refuse.
  const canScan = hasPermission(user, "audit", "edit")
  // Every link of the page's list (cards, chips, bars, paging, exports): one builder, the list's way back and page size
  // kept (group 2 plan 2). The cards are round-wide, so their links start from roundWideFilters (spec §5).
  const roundWideFilters = parseAuditRoundListFilters({})
  const pageHref = (target: AuditRoundListFilters, overrides: AuditRoundPageHrefOverrides = {}) =>
    buildAuditRoundPageHref(locale, round.id, target, { pageSize, returnTo: returnToHref, ...overrides })
  // The exports follow the list's filters (spec §8 "ตามตัวกรองที่เลือก"): Task 1's builder, Task 2's three lines, now
  // over the page's filters.
  const auditRoundExportHref = buildAuditRoundExportHref(round.id, "export", filters)
  const auditRoundExportPdfHref = buildAuditRoundExportHref(round.id, "export-pdf", filters)
  const auditRoundVarianceHref = buildAuditRoundExportHref(round.id, "variance-export", filters)
  const allResultHref = pageHref(roundWideFilters)
  // "เหลือ / เลยกำหนด N วัน" on an open round only, display only (spec §8, §15; plan 1 R26).
  const due = buildAuditRoundDueLine(round.status, round.endDate, startOfBangkokDay(new Date()))
  // An unknown or stale company, branch or category drops only its own filter, so the list never sits under a chip it cannot name.
  const staleCategory = Boolean(filters.categoryId && filters.categoryId !== "other" && !filterCategory)
  if ((filters.companyId && !filterCompany) || (filters.branchId && !filterBranch) || staleCategory) {
    redirect(buildAuditRoundPageHref(locale, round.id, filters, { companyId: filterCompany ? filters.companyId : null, branchId: filterBranch ? filters.branchId : null, categoryId: staleCategory ? null : filters.categoryId, pageSize, returnTo: returnToHref }))
  }
  const roundDetailReturnHref = appendOperationalReturnTo(`/${locale}/audit/rounds/${round.id}`, returnToHref)
  const pendingHref = appendOperationalReturnTo(`/${locale}/audit/rounds/${round.id}/pending`, roundDetailReturnHref)
  const scanHref = appendOperationalReturnTo(`/${locale}/audit/rounds/${round.id}/scan`, roundDetailReturnHref)
  const resultListReturnHref = buildAuditRoundResultListHref({
    locale,
    roundId: round.id,
    result: resultListState.result,
    returnTo: returnToHref,
    search: resultListState.search,
    ...itemFilters,
    page: resultListState.page,
    pageSize: resultListState.pageSize,
  })
  const resultFilterLabels: Record<AuditRoundResultFilter, string> = {
    all: t("viewAll"),
    pending: t("pending"),
    found: t("found"),
    mismatch: t("mismatch"),
    not_found: t("notFound"),
    out_of_scope: t("outOfScope"),
    pending_review: t("pendingReview"),
  }
  const resultListTotal = resultItemTotal
  // A result page past the last one (an old link, or results that moved to another bucket) shows the last page
  // (spec 2B I21). The result list keeps its own page and pageSize params (spec 2B §5.4 row rounds/[id]).
  const resultLastPage = lastListPage(resultListTotal, resultListState.pageSize)
  const resultPageRowCount = resultItems.length
  if (resultPageRowCount === 0 && resultListTotal > 0 && resultListState.page > resultLastPage) {
    redirect(buildAuditRoundResultListHref({ locale, roundId: round.id, result: resultListState.result, returnTo: returnToHref, search: resultListState.search, ...itemFilters, page: resultLastPage, pageSize: resultListState.pageSize }))
  }
  const { start: resultStart, end: resultEnd, totalPages: resultTotalPages } = paginationRange(resultListState.page, resultListState.pageSize, resultListTotal)
  const resultRows = resultItems.map((item) => {
    const statusLabelKey = getAuditRoundItemStatusLabelKey(item.auditStatus)
    const itemStatusLabelKey = statusLabelKey ? null : getAuditItemStatusLabelKey(item.auditStatus)
    const resultLabelKey = getAuditRoundItemResultLabelKey(item.auditResult)
    const auditResult = item.auditResult ?? "pending"
    const correctionHistory = item.correctionHistory
    return {
      id: item.id,
      asset: item.asset,
      auditStatus: item.auditStatus,
      auditStatusLabel: statusLabelKey ? t(statusLabelKey) : itemStatusLabelKey ? tFinding(itemStatusLabelKey) : item.auditStatus,
      auditResult,
      auditResultLabel: item.auditResult ? (resultLabelKey ? t(resultLabelKey) : item.auditResult) : null,
      auditResultTone: item.auditResult === "found" || item.auditResult === "confirmed_with_parent" ? ("success" as const) : item.auditResult === "not_found" ? ("danger" as const) : item.auditResult === "out_of_scope" ? ("info" as const) : ("muted" as const),
      componentRelationshipLines: buildAuditRoundComponentRelationshipLines(item.asset, t),
      latestCorrection: correctionHistory[0] ?? null,
      // A re-scan from here would turn an out-of-scope find into an own item through the in-round scan path; plan 3
      // fixes the walk's lookup (P2-R4), so its row offers no แก้ไขผลตรวจ until then.
      editHref: item.auditResult === "out_of_scope" ? null : buildAuditRoundScanEditHref({ locale, roundId: round.id, assetId: item.asset.id, returnTo: resultListReturnHref }),
    }
  })
  // The company and branch narrow every list, the out-of-scope one included (P2-R4).
  const resultFilterChips: FilterChipItem[] = []
  if (filterCompany) {
    resultFilterChips.push({
      key: "companyId",
      label: t("companyFilterChip", { company: `${filterCompany.code} - ${filterCompany.nameTh}` }),
      href: buildAuditRoundResultListHref({ locale, roundId: round.id, result: resultListState.result, returnTo: returnToHref, search: resultListState.search, ...itemFilters, companyId: null, pageSize: resultListState.pageSize }),
    })
  }
  if (filterBranch) {
    resultFilterChips.push({
      key: "branchId",
      label: t("branchFilterChip", { branch: auditRoundBranchFilterName({ name: filterBranch.name, companyCode: filterBranch.company.code }, Boolean(filterCompany)) }),
      href: buildAuditRoundResultListHref({ locale, roundId: round.id, result: resultListState.result, returnTo: returnToHref, search: resultListState.search, ...itemFilters, branchId: null, pageSize: resultListState.pageSize }),
    })
  }
  const pendingReviewFindingsHref = `/${locale}/audit/findings?status=pending&roundId=${round.id}`
  const openActionFindingsHref = `/${locale}/audit/findings?status=action_open&roundId=${round.id}`
  const stepsState = buildAuditRoundPageSteps({ status: round.status, pendingItems: data.steps.close.checklist.pendingItems, pendingFindings: data.steps.close.checklist.pendingFindings })
  const mainAction = buildAuditRoundPageMainAction({ steps: stepsState, pendingItems: data.steps.close.checklist.pendingItems, pendingFindings: data.steps.close.checklist.pendingFindings, canClose: data.steps.close.canClose, openedByViewer: data.steps.close.openedByViewer, canScan, canApprove })
  const stepLabels: Record<AuditRoundPageStepKey, string> = { walk: t("stepWalk"), review: t("stepReview"), close: t("stepClose") }
  const stepItems = stepsState ? auditRoundPageStepKeys.map((key, index) => ({ id: key, label: stepLabels[key], state: stepsState.states[index] })) : []
  // The main step as a link (the close is a button, in the card only): the card's head and the phone bar's primary.
  const mainLink =
    mainAction?.kind === "walk"
      ? { href: mainAction.target === "scan" ? scanHref : pendingHref, label: t("nextStepContinueScan", { count: formatCount(mainAction.count) }), icon: mainAction.target === "scan" ? <ScanLine className="h-4 w-4" /> : <ListChecks className="h-4 w-4" /> }
      : mainAction?.kind === "review"
        ? { href: pendingReviewFindingsHref, label: t("nextStepReviewItems", { count: formatCount(mainAction.count) }), icon: <FileText className="h-4 w-4" /> }
        : null
  // The four conditions the close API checks (audit-round-close.ts getAuditRoundCloseChecklist, and the route's
  // closeOwnRound), each linked to its rows while it blocks; the counts are the API's (findings, P2-R3). The opener is
  // told they cannot close (spec §8).
  const checklist = data.steps.close.checklist
  const closeConditions = [
    { key: "pendingItems", ok: checklist.pendingItems === 0, label: checklist.pendingItems === 0 ? t("closeNoPendingItems") : t("closePendingItemsCount", { count: formatCount(checklist.pendingItems) }), href: pendingHref },
    { key: "pendingFindings", ok: checklist.pendingFindings === 0, label: checklist.pendingFindings === 0 ? t("closeNoPendingFindings") : t("closePendingFindingsCount", { count: formatCount(checklist.pendingFindings) }), href: pendingReviewFindingsHref },
    { key: "openActions", ok: checklist.openActions === 0, label: checklist.openActions === 0 ? t("closeNoOpenActions") : t("openActionsCount", { count: formatCount(checklist.openActions) }), href: openActionFindingsHref },
    { key: "opener", ok: !data.steps.close.openedByViewer, label: data.steps.close.openedByViewer ? t("closeOwnRoundNotice") : t("closeSeparateApprover") },
  ]
  const barActions: ActionBarLink[] = [
    ...(mainLink ? [{ ...mainLink, primary: true }] : []),
    ...(mainLink?.href === pendingHref ? [] : [{ href: pendingHref, label: t("pendingAssets"), icon: <ListChecks className="h-4 w-4" /> }]),
    ...(mainAction?.kind === "review" ? [] : [{ href: pendingReviewFindingsHref, label: t("openFindingReview"), icon: <FileText className="h-4 w-4" /> }]),
    { href: returnToHref, label: tCommon("back"), icon: <ArrowLeft className="h-4 w-4" /> },
  ]
  // The result card is round-wide (spec §5, §8): each cell opens its result with every other filter cleared, so its
  // count is the rows it opens; พบตรง + ไม่ตรง + ไม่พบ + รอตรวจ = ทั้งหมด (P2-R2). Out-of-scope finds sit apart.
  const resultCells = ([
    ["found", t("found"), data.resultCard.found, "success"],
    ["mismatch", t("mismatchShort"), data.resultCard.mismatch, "warning"],
    ["not_found", t("notFound"), data.resultCard.notFound, "danger"],
    ["pending", t("pending"), data.resultCard.pending, "muted"],
  ] as const).map(([result, label, count, tone]) => ({ result, label, count, tone, href: pageHref(roundWideFilters, { result }) }))
  // ไม่ตรงเรื่องอะไร (spec §8, P2-R16): round-wide, so each bar opens its field with the other filters cleared.
  const fieldBarRows = auditFindingFields.map((field) => ({
    field,
    label: tFinding(`type_${auditFindingTypeByField[field]}`),
    count: data.fieldBars.counts[field],
    href: pageHref(roundWideFilters, { field }),
  }))
  const cancelImpact = data.cancelImpact
  const hasResultBucketFilter = resultListState.result !== "all"
  const hasResultListSearch = Boolean(resultListState.search)
  const selectedResultLabel = resultFilterLabels[resultListState.result]
  const resultListTitle = hasResultBucketFilter ? t("resultListFilteredTitle", { result: selectedResultLabel }) : t("expectedAssets")
  const resultListDescription = hasResultBucketFilter ? t("resultListFilteredHelp", { result: selectedResultLabel }) : t("resultListHelp")
  const emptyResultTitle = hasResultBucketFilter
    ? t("emptyResultFilterTitle", { result: selectedResultLabel })
    : hasResultListSearch
      ? t("emptyResultSearchTitle")
      : t("emptyAssetsTitle")
  const emptyResultDescription = hasResultBucketFilter
    ? t("emptyResultFilterHelp")
    : hasResultListSearch
      ? t("emptyResultSearchHelp")
      : t("emptyAssetsHelp")
  const resultFindingReviewHref =
    resultListState.result === "pending_review"
      ? pendingReviewFindingsHref
      : resultListState.field
        ? `/${locale}/audit/findings?status=pending&roundId=${round.id}&findingType=${auditFindingTypeByField[resultListState.field]}`
        : null

  return (
    <div className={actionBarPagePadding.single}>
      <PageHeader
        className="mb-6"
        breadcrumbs={[
          { label: t("title"), href: returnToHref },
          { label: round.auditNo, code: true },
        ]}
        title={round.name}
        meta={
          <>
            <span className="tag">{round.auditNo}</span>
            <StatusBadge label={getAuditRoundStatusLabel(round.status, t)} status={effectiveAuditRoundStatus(round.status)} />
            <span>
              {formatDate(round.startDate)} – {formatDate(round.endDate)}
            </span>
            {due ? <span className={due.kind === "overdue" ? "text-danger" : "text-warning"}>{due.kind === "overdue" ? t("daysOverdue", { days: formatCount(due.days) }) : t("daysLeft", { days: formatCount(due.days) })}</span> : null}
            {data.round.createdByLabel ? <span>{t("openedBy", { name: data.round.createdByLabel })}</span> : null}
          </>
        }
        actions={
          canExportRound || (canApprove && !isRoundReadOnly) ? (
            <AuditRoundHeaderMenus
              exports={canExportRound ? { excel: auditRoundExportHref, pdf: auditRoundExportPdfHref, variance: auditRoundVarianceHref } : null}
              cancel={canApprove && !isRoundReadOnly ? { roundId: round.id, impact: cancelImpact } : null}
            />
          ) : undefined
        }
      />
      {!isRoundReadOnly ? <ActionBar label={tCommon("actions")} actions={barActions} /> : null}

      {round.status === "cancelled" ? (
        <ContentPanel title={t("statusCancelled")} className="mb-6">
          <Notice tone="info">{t("cancelledReadOnlyNotice")}</Notice>
          <KeyValueList
            className="mt-4"
            items={[
              { key: "cancelledAt", label: t("cancelledAt"), value: round.cancelledAt ? formatDateTime(round.cancelledAt) : null },
              { key: "cancelledBy", label: t("cancelledBy"), value: cancelledByDisplayName },
              { key: "cancelReason", label: t("cancelReason"), value: round.cancelReason },
            ]}
          />
        </ContentPanel>
      ) : null}

      {stepsState ? (
        <ContentPanel
          divided
          title={stepsState.current ? t("nextStepTitle", { step: stepLabels[stepsState.current] }) : t("stepsClosedTitle")}
          className="mb-6"
          actions={
            mainAction?.kind === "close" ? (
              <AuditRoundCloseButton roundId={round.id} disabled={mainAction.disabled} />
            ) : mainLink ? (
              <Link href={mainLink.href} className={buttonVariants({ size: "md" })}>
                {mainLink.icon}
                {mainLink.label}
              </Link>
            ) : undefined
          }
        >
          <Steps label={t("stepsLabel")} steps={stepItems} />
          {/* Steps holds one short label per step (P2-R8): each step's line sits under the rail, its heading for the
              phone, where the rail's labels are screen-reader only. */}
          <div className="mt-4 grid gap-4 text-sm md:grid-cols-3">
            <div className="min-w-0 space-y-1">
              <h3 className="text-meta font-medium text-muted-foreground md:sr-only">{stepLabels.walk}</h3>
              <p className="text-foreground">
                <span className="num">{t("stepWalkChecked", { checked: formatCount(data.steps.walk.checked), total: formatCount(data.steps.walk.total) })}</span>
                {" · "}
                {data.steps.walk.left > 0 ? (
                  <Link href={pendingHref} className={cn(linkVariants({ size: "inherit" }), "inline-flex min-h-11 items-center md:min-h-0")}>{t("stepWalkLeft", { count: formatCount(data.steps.walk.left) })}</Link>
                ) : (
                  <span className="text-muted-foreground">{t("stepWalkLeft", { count: formatCount(0) })}</span>
                )}
              </p>
            </div>
            <div className="min-w-0 space-y-1">
              <h3 className="text-meta font-medium text-muted-foreground md:sr-only">{stepLabels.review}</h3>
              <p className="text-foreground">
                {/* Findings, so "รอ n" is the rows of the findings page it opens, as "พิจารณา n รายการ" is (P2-R26). */}
                {data.steps.review.pendingFindings > 0 ? (
                  <Link href={pendingReviewFindingsHref} className={cn(linkVariants({ size: "inherit" }), "inline-flex min-h-11 items-center md:min-h-0")}>{t("stepReviewWaiting", { count: formatCount(data.steps.review.pendingFindings) })}</Link>
                ) : (
                  <span className="text-muted-foreground">{t("stepReviewWaiting", { count: formatCount(0) })}</span>
                )}
                {" · "}
                <span className="num">{t("stepReviewDecided", { count: formatCount(data.steps.review.decidedFindings) })}</span>
              </p>
            </div>
            <div className="min-w-0 space-y-1">
              <h3 className="text-meta font-medium text-muted-foreground md:sr-only">{stepLabels.close}</h3>
              <ul className="space-y-1">
                {closeConditions.map((condition) => (
                  <li key={condition.key} className="flex items-start gap-2">
                    {condition.ok ? (
                      <Check aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
                    ) : (
                      <WarningIcon aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-warning" />
                    )}
                    {!condition.ok && condition.href ? (
                      <Link href={condition.href} className={cn(linkVariants({ size: "inherit" }), "inline-flex min-h-11 items-center md:min-h-0")}>{condition.label}</Link>
                    ) : (
                      <span className={condition.ok ? "text-muted-foreground" : "text-foreground"}>{condition.label}</span>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </ContentPanel>
      ) : null}

      <div className="mb-6 grid gap-6 xl:grid-cols-2">
        <ContentPanel divided title={t("resultDashboard")} description={t("resultDashboardHelp")}>
          <DistributionBar segments={resultCells.map((cell) => ({ key: cell.result, count: cell.count, tone: cell.tone, href: cell.href, title: t("resultSegmentTitle", { result: cell.label, count: formatCount(cell.count) }) }))} />
          {/* The cells are the bar's words (The Data Bars Rule): every count and the same links. */}
          <StatStrip
            className="mt-4"
            items={[
              { key: "all", label: t("viewAll"), value: formatCount(data.resultCard.all), href: data.resultCard.all > 0 ? pageHref(roundWideFilters) : undefined },
              ...resultCells.map((cell) => ({ key: cell.result, label: cell.label, value: formatCount(cell.count), href: cell.count > 0 ? cell.href : undefined, foot: data.resultCard.all > 0 ? formatPercent(cell.count / data.resultCard.all) : undefined })),
            ]}
          />
          <p className="mt-3 text-sm text-muted-foreground">
            {data.resultCard.outOfScope > 0 ? (
              <Link href={pageHref(roundWideFilters, { result: "out_of_scope" })} className={cn(linkVariants({ size: "inherit" }), "inline-flex min-h-11 items-center md:min-h-0")}>{t("outOfScopeExtra", { count: formatCount(data.resultCard.outOfScope) })}</Link>
            ) : (
              t("outOfScopeExtra", { count: formatCount(0) })
            )}
          </p>
        </ContentPanel>

        <ContentPanel divided title={t("mismatchFieldsTitle")}>
          <ul aria-label={t("mismatchFieldsTitle")} className="space-y-3">
            {fieldBarRows.map((bar) => (
              <li key={bar.field} className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-3 gap-y-1 text-sm">
                {bar.count > 0 ? (
                  <Link href={bar.href} className={cn(linkVariants({ size: "inherit" }), "inline-flex min-h-11 items-center md:min-h-0")}>{bar.label}</Link>
                ) : (
                  <span className="text-muted-foreground">{bar.label}</span>
                )}
                <span className="num font-semibold text-foreground">{formatCount(bar.count)}</span>
                <span className="col-span-2 block">
                  <PaceBar value={data.fieldBars.distinctItems > 0 ? bar.count / data.fieldBars.distinctItems : 0} pace={null} label={t("fieldBarLabel", { field: bar.label, count: formatCount(bar.count), total: formatCount(data.fieldBars.distinctItems) })} behind={false} />
                </span>
              </li>
            ))}
          </ul>
          {data.fieldBars.multipleFields ? <p className="mt-3 text-sm text-muted-foreground">{t("multipleFieldsNote")}</p> : null}
          <div className="mt-4 space-y-1 border-t border-border-soft pt-4 text-sm text-muted-foreground">
            <p>{t("evidenceLine", { withPhoto: formatCount(data.evidence.withPhoto), checked: formatCount(data.evidence.checked) })}</p>
            {data.evidence.checklistComplete + data.evidence.checklistIncomplete > 0 ? (
              <p>{t("evidenceChecklistLine", { complete: formatCount(data.evidence.checklistComplete), incomplete: formatCount(data.evidence.checklistIncomplete) })}</p>
            ) : null}
            {data.componentsMissing > 0 ? (
              <p>
                <Link href={pageHref(roundWideFilters, { components: "missing" })} className={cn(linkVariants({ size: "inherit" }), "inline-flex min-h-11 items-center gap-1 md:min-h-0")}>
                  {t("componentsMissingLine", { count: formatCount(data.componentsMissing) })}
                  <ChevronRight aria-hidden="true" className="size-4" />
                </Link>
              </p>
            ) : null}
          </div>
        </ContentPanel>
      </div>

      <section id="audit-result-list" className="scroll-mt-24">
        <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <h2 className="text-base font-semibold text-foreground">{resultListTitle}</h2>
            <p className="mt-1 text-sm text-muted-foreground">{resultListDescription}</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <StatusBadge label={resultFilterLabels[resultListState.result]} status={resultListState.result} />
            <span className="text-sm text-muted-foreground">
              <span className="num font-medium text-foreground">{formatCount(resultListTotal)}</span> {t("items")}
            </span>
            {resultFindingReviewHref && !isRoundReadOnly ? (
              <Link href={resultFindingReviewHref} className={buttonVariants({ variant: "outline", size: "md" })}>
                <FileText aria-hidden="true" />
                {t("openFindingReview")}
              </Link>
            ) : null}
            {resultListState.result !== "all" || resultListState.search || resultListState.categoryId || resultListState.field || resultListState.components ? (
              <Link href={allResultHref} className={buttonVariants({ variant: "outline", size: "md" })}>
                {t("viewAll")}
              </Link>
            ) : null}
          </div>
        </div>

        <FilterChipList className="mb-3" chips={resultFilterChips} label={t("activeFilters")} removeLabel={t("clearFilter")} />
        <MasterDataSearch
          action={`/${locale}/audit/rounds/${round.id}`}
          defaultValue={resultListState.search}
          placeholder={tCommon("search")}
          submitLabel={tCommon("search")}
          hiddenInputs={{
            result: resultListState.result,
            ...(resultListState.companyId ? { companyId: resultListState.companyId } : {}),
            ...(resultListState.branchId ? { branchId: resultListState.branchId } : {}),
            ...(resultListState.categoryId ? { categoryId: resultListState.categoryId } : {}),
            ...(resultListState.field ? { field: resultListState.field } : {}),
            ...(resultListState.components ? { components: resultListState.components } : {}),
            page: 1,
            pageSize: resultListState.pageSize,
            returnTo: returnToHref,
          }}
        />
        <div className={cn(getPanelClasses(), "overflow-hidden")}>
          <div className={`${getMobileCardListClasses()} p-3`}>
            {resultRows.length === 0 ? (
              <ActionEmptyState
                icon={<ScanLine className="h-6 w-6" />}
                title={emptyResultTitle}
                description={emptyResultDescription}
                actionHref={allResultHref}
                actionLabel={t("viewAll")}
                actionVariant="secondary"
              />
            ) : (
              resultRows.map((item) => (
                <article key={item.id} className="min-w-0 rounded-md border border-border bg-background p-3">
                  <Link href={`/${locale}/assets/${item.asset.id}`} className={cn(linkVariants({ size: "inherit" }), "inline-flex min-h-11 items-center md:min-h-0")}>
                    <span className="tag font-medium">{item.asset.assetTag}</span>
                  </Link>
                  <p className="mt-1 line-clamp-2 text-sm text-foreground">{item.asset.name}</p>
                  {item.componentRelationshipLines.length > 0 ? (
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {item.componentRelationshipLines.map((line) => (
                        <Chip key={line} title={line}>{line}</Chip>
                      ))}
                    </div>
                  ) : null}
                  {item.latestCorrection ? (
                    <Notice tone="info" className="mt-2">
                      <div>{t("correctionHistoryLatest", { date: formatDateTime(item.latestCorrection.createdAt), user: item.latestCorrection.userLabel })}</div>
                      {item.latestCorrection.changedFields.length > 0 ? (
                        <div>{t("correctionHistoryFields", { fields: formatAuditCorrectionFields(item.latestCorrection, t) })}</div>
                      ) : null}
                    </Notice>
                  ) : null}
                  <KeyValueList
                    className="mt-3"
                    items={[
                      {
                        key: "location",
                        label: t("expectedLocation"),
                        value: (
                          <>
                            <span className="tag">{item.asset.currentLocation.code}</span> - {item.asset.currentLocation.name}
                          </>
                        ),
                      },
                      {
                        key: "custodian",
                        label: t("expectedCustodian"),
                        value: item.asset.custodian ? (
                          <>
                            <span className="tag">{item.asset.custodian.code}</span> - {item.asset.custodian.fullNameTh}
                          </>
                        ) : null,
                      },
                    ]}
                  />
                  <div className="mt-3 flex flex-wrap gap-2">
                    <StatusBadge label={item.auditStatusLabel} status={item.auditStatus} />
                    {item.auditResultLabel ? <StatusBadge label={item.auditResultLabel} status={item.auditResult} tone={item.auditResultTone} /> : null}
                  </div>
                  {!isRoundReadOnly && item.editHref ? (
                    <div className="mt-3 flex justify-end">
                      <Link href={item.editHref} className={buttonVariants({ variant: "outline", size: "md" })}>
                        {t("editScanResult")}
                      </Link>
                    </div>
                  ) : null}
                </article>
              ))
            )}
          </div>
          <DataTable framed={false} className={getDesktopTableOnlyClasses()} caption={resultListTitle} scrollHint={tCommon("tableScrollHint")}>
            <DataTableHeader>
              <tr>
                <DataTableHead>{t("assetTag")}</DataTableHead>
                <DataTableHead>{t("assetName")}</DataTableHead>
                <DataTableHead>{t("expectedLocation")}</DataTableHead>
                <DataTableHead>{t("expectedCustodian")}</DataTableHead>
                <DataTableHead>{t("status")}</DataTableHead>
                <DataTableHead>{t("result")}</DataTableHead>
                <DataTableHead align="right" sticky="right" hideLabel>{tCommon("actions")}</DataTableHead>
              </tr>
            </DataTableHeader>
            <DataTableBody>
              {resultRows.length === 0 ? (
                <TableEmptyRow
                  colSpan={7}
                  emptyState={{
                    icon: <ScanLine className="h-6 w-6" />,
                    title: emptyResultTitle,
                    description: emptyResultDescription,
                    actionHref: allResultHref,
                    actionLabel: t("viewAll"),
                    actionVariant: "secondary",
                  }}
                />
              ) : (
                resultRows.map((item) => (
                  <ClickableTableRow
                    key={item.id}
                    href={`/${locale}/assets/${item.asset.id}`}
                    label={`${tCommon("view")}: ${item.asset.assetTag}`}
                  >
                    <DataTableCell className="whitespace-nowrap">
                      <span className="tag font-medium text-foreground">{item.asset.assetTag}</span>
                    </DataTableCell>
                    <DataTableCell className="min-w-56 text-foreground">
                      <div>{item.asset.name}</div>
                      {item.componentRelationshipLines.length > 0 ? (
                        <div className="mt-1 flex flex-wrap gap-1.5">
                          {item.componentRelationshipLines.map((line) => (
                            <Chip key={line} title={line}>{line}</Chip>
                          ))}
                        </div>
                      ) : null}
                      {item.latestCorrection ? (
                        <Notice tone="info" className="mt-2">
                          <div>{t("correctionHistoryLatest", { date: formatDateTime(item.latestCorrection.createdAt), user: item.latestCorrection.userLabel })}</div>
                          {item.latestCorrection.changedFields.length > 0 ? (
                            <div>{t("correctionHistoryFields", { fields: formatAuditCorrectionFields(item.latestCorrection, t) })}</div>
                          ) : null}
                        </Notice>
                      ) : null}
                    </DataTableCell>
                    <DataTableCell className="min-w-56 text-muted-foreground">
                      <span className="tag">{item.asset.currentLocation.code}</span> - {item.asset.currentLocation.name}
                    </DataTableCell>
                    <DataTableCell className="min-w-56 text-muted-foreground">
                      {item.asset.custodian ? (
                        <>
                          <span className="tag">{item.asset.custodian.code}</span> - {item.asset.custodian.fullNameTh}
                        </>
                      ) : (
                        <Nil />
                      )}
                    </DataTableCell>
                    <DataTableCell className="whitespace-nowrap text-muted-foreground">
                      <StatusBadge label={item.auditStatusLabel} status={item.auditStatus} />
                    </DataTableCell>
                    <DataTableCell className="whitespace-nowrap text-muted-foreground">
                      {item.auditResultLabel ? <StatusBadge label={item.auditResultLabel} status={item.auditResult} tone={item.auditResultTone} /> : <Nil />}
                    </DataTableCell>
                    <DataTableCell align="right" sticky="right">
                      {!isRoundReadOnly && item.editHref ? (
                        <RowActions
                          code={item.asset.assetTag}
                          name={item.asset.name}
                          menuLabel={tCommon("moreActionsFor", { code: item.asset.assetTag })}
                          next={{ label: t("editScanResult"), href: item.editHref, icon: <Pencil aria-hidden="true" /> }}
                          groups={[]}
                        />
                      ) : (
                        <Nil />
                      )}
                    </DataTableCell>
                  </ClickableTableRow>
                ))
              )}
            </DataTableBody>
          </DataTable>
          {resultListTotal > 0 ? (
            <DataTableFoot>
              <Pagination
                page={resultListState.page}
                totalPages={resultTotalPages}
                previousHref={buildAuditRoundResultListHref({ locale, roundId: round.id, result: resultListState.result, returnTo: returnToHref, search: resultListState.search, ...itemFilters, page: resultListState.page - 1, pageSize: resultListState.pageSize })}
                nextHref={buildAuditRoundResultListHref({ locale, roundId: round.id, result: resultListState.result, returnTo: returnToHref, search: resultListState.search, ...itemFilters, page: resultListState.page + 1, pageSize: resultListState.pageSize })}
                pageSize={resultListState.pageSize}
                pageSizes={auditRoundResultPageSizeOptions.map((value) => ({ value, href: buildAuditRoundResultListHref({ locale, roundId: round.id, result: resultListState.result, returnTo: returnToHref, search: resultListState.search, ...itemFilters, page: 1, pageSize: value }) }))}
                labels={{
                  navigation: tCommon("pagination"),
                  previous: tCommon("previous"),
                  next: tCommon("next"),
                  pageOf: tCommon("pageOf", { page: resultListState.page, total: resultTotalPages }),
                  range: tCommon("showingRange", { from: formatCount(resultStart), to: formatCount(resultEnd), total: formatCount(resultListTotal) }),
                  pageSizeGroup: tCommon("pageSizeLabel"),
                  rowsPerPage: tCommon("rowsPerPage"),
                }}
              />
            </DataTableFoot>
          ) : null}
        </div>
      </section>
    </div>
  )
}

type AuditRoundTranslator = Awaited<ReturnType<typeof getTranslations>>

type AuditRoundComponentRelationshipAsset = {
  parentComponents?: Array<{ componentRole: string; slotNo: string | null; componentAsset: { assetTag: string; name: string } }>
  installedInLinks?: Array<{ componentRole: string; slotNo: string | null; parentAsset: { assetTag: string; name: string } }>
}

function buildAuditRoundComponentRelationshipLines(asset: AuditRoundComponentRelationshipAsset, t: AuditRoundTranslator) {
  const lines: string[] = []
  const componentCount = asset.parentComponents?.length ?? 0
  if (componentCount > 0) lines.push(t("componentHasChildren", { count: componentCount }))
  const installedInParent = asset.installedInLinks?.[0]
  if (installedInParent) {
    lines.push(t("componentInstalledInParent", { assetTag: installedInParent.parentAsset.assetTag, role: installedInParent.componentRole }))
  }
  return lines
}

function formatAuditCorrectionFields(correction: AuditCorrectionHistoryItem, t: AuditRoundTranslator) {
  return correction.changedFields.map((field) => t(`correctionField_${field}`)).join(", ")
}

function getAuditRoundStatusLabel(status: string, t: AuditRoundTranslator) {
  return t(auditRoundStatusLabelKey(status) ?? "statusOpen")
}

function buildAuditRoundScanEditHref({
  locale,
  roundId,
  assetId,
  returnTo,
}: {
  locale: string
  roundId: string
  assetId: string
  returnTo: string
}) {
  const params = new URLSearchParams()
  params.set("assetId", assetId)
  params.set("mode", "edit")
  params.set("returnTo", returnTo)
  return `/${locale}/audit/rounds/${roundId}/scan?${params.toString()}`
}
