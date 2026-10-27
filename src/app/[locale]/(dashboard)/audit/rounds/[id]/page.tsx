import Link from "next/link"
import { notFound, redirect } from "next/navigation"
import { getTranslations } from "next-intl/server"
import { AlertTriangle, ArrowLeft, Download, FileText, Pencil, ScanLine } from "lucide-react"
import { requirePagePermission } from "@/lib/page-auth"
import { MasterDataSearch } from "@/components/master-data/master-data-layout"
import { cn, formatDate, formatDateTime } from "@/lib/utils"
import { ClickableTableRow } from "@/components/ui/clickable-table-row"
import { AuditProgressBar } from "@/components/audit/audit-progress-bar"
import { AuditRoundCancelButton } from "@/components/audit/audit-round-cancel-button"
import { AuditRoundCloseButton } from "@/components/audit/audit-round-close-button"
import { hasPermission } from "@/lib/auth-utils"
import { ActionBar, actionBarPagePadding } from "@/components/ui/action-bar"
import { ActionEmptyState } from "@/components/ui/action-empty-state"
import { buttonVariants, linkVariants } from "@/components/ui/button-variants"
import { Chip } from "@/components/ui/chip"
import { ContentPanel } from "@/components/ui/content-panel"
import { FilterChipList, type FilterChipItem } from "@/components/ui/filter-chips"
import { DataTable, DataTableBody, DataTableCell, DataTableFoot, DataTableHead, DataTableHeader, TableEmptyRow } from "@/components/ui/data-table"
import { KeyValueList } from "@/components/ui/key-value-list"
import { Nil } from "@/components/ui/nil"
import { Notice } from "@/components/ui/notice"
import { PageHeader } from "@/components/ui/page-header"
import { Pagination } from "@/components/ui/pagination"
import { RowActions } from "@/components/ui/row-actions"
import { StatStrip, type StatStripItem } from "@/components/ui/stat-strip"
import { StatusBadge } from "@/components/ui/status-badge"
import { getDesktopTableOnlyClasses, getMobileCardListClasses, getPanelClasses } from "@/lib/design-system"
import { formatCount } from "@/lib/display-format"
import { lastListPage } from "@/lib/list-pagination"
import { appendOperationalReturnTo, normalizeOperationalReturnTo } from "@/lib/operational-return-navigation"
import { auditRoundStatusLabelKey, effectiveAuditRoundStatus, isAuditRoundReadOnlyStatus } from "@/lib/audit-round-status"
import type { AuditCorrectionHistoryItem } from "@/lib/audit-correction-history"
import { getAuditRoundPageData } from "@/lib/audit-round-page-data"
import { withPerformanceTiming } from "@/lib/performance-timing"
import { paginationRange } from "@/lib/master-data-query"
import {
  auditFindingTypeByField,
  auditRoundBranchFilterName,
  auditRoundResultPageSizeOptions,
  buildAuditRoundResultSummaryGroups,
  buildAuditRoundExportHref,
  buildAuditRoundPageHref,
  buildAuditRoundResultListHref,
  getAuditRoundItemResultLabelKey,
  getAuditRoundItemStatusLabelKey,
  parseAuditRoundResultListParams,
  type AuditRoundResultFilter,
} from "@/lib/audit-round-result-filters"
import { getAuditItemStatusLabelKey } from "@/lib/audit-item-status-labels"

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
  const isRoundCreator = data.steps.close.openedByViewer
  const isRoundReadOnly = isAuditRoundReadOnlyStatus(round.status)
  // The round's exports need audit:export (their routes check it; the E2E suite's AU1, M1).
  const canExportRound = round.status !== "cancelled" && hasPermission(user, "audit", "export")
  const cancelledByDisplayName = data.round.cancelledByLabel
  const pendingCount = data.steps.walk.left
  const processedCount = data.steps.walk.checked
  const foundCount = data.resultCard.found
  const notFoundCount = data.resultCard.notFound
  const mismatchCount = data.resultCard.mismatch
  const progress = data.steps.walk.total > 0 ? Math.round((data.steps.walk.checked / data.steps.walk.total) * 100) : 0

  const returnToHref = normalizeOperationalReturnTo(locale, "audit-rounds", rawSearchParams.returnTo)
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
  const allResultHref = buildAuditRoundResultListHref({ locale, roundId: round.id, result: "all", returnTo: returnToHref, pageSize: resultListState.pageSize })
  const foundResultHref = buildAuditRoundResultListHref({ locale, roundId: round.id, result: "found", returnTo: returnToHref, pageSize: resultListState.pageSize })
  const wrongLocationResultHref = buildAuditRoundResultListHref({ locale, roundId: round.id, result: "all", field: "location", returnTo: returnToHref, pageSize: resultListState.pageSize })
  const wrongCustodianResultHref = buildAuditRoundResultListHref({ locale, roundId: round.id, result: "all", field: "custodian", returnTo: returnToHref, pageSize: resultListState.pageSize })
  const wrongConditionResultHref = buildAuditRoundResultListHref({ locale, roundId: round.id, result: "all", field: "condition", returnTo: returnToHref, pageSize: resultListState.pageSize })
  const notFoundResultHref = buildAuditRoundResultListHref({ locale, roundId: round.id, result: "not_found", returnTo: returnToHref, pageSize: resultListState.pageSize })
  const outOfScopeResultHref = buildAuditRoundResultListHref({ locale, roundId: round.id, result: "out_of_scope", returnTo: returnToHref, pageSize: resultListState.pageSize })
  const pendingReviewResultHref = buildAuditRoundResultListHref({ locale, roundId: round.id, result: "pending_review", returnTo: returnToHref, pageSize: resultListState.pageSize })
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
  const closeChecklist = [
    { label: t("closePendingItems"), value: data.steps.close.checklist.pendingItems, ok: data.steps.close.checklist.pendingItems === 0, href: pendingHref, actionLabel: t("checklistDrilldown") },
    { label: t("closePendingFindings"), value: data.steps.close.checklist.pendingFindings, ok: data.steps.close.checklist.pendingFindings === 0, href: pendingReviewFindingsHref, actionLabel: t("checklistDrilldown") },
    { label: t("closeOpenActions"), value: data.steps.close.checklist.openActions, ok: data.steps.close.checklist.openActions === 0, href: openActionFindingsHref, actionLabel: t("checklistDrilldown") },
    { label: t("closeSeparateApprover"), value: isRoundCreator ? 1 : 0, ok: !isRoundCreator },
  ]
  const canCloseRound = data.steps.close.canClose
  const cancelImpact = data.cancelImpact
  const auditRoundExportHref = buildAuditRoundExportHref(round.id, "export", resultListState)
  const auditRoundExportPdfHref = buildAuditRoundExportHref(round.id, "export-pdf", resultListState)
  const auditRoundVarianceHref = buildAuditRoundExportHref(round.id, "variance-export", resultListState)
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
  const resultSummaryGroups = buildAuditRoundResultSummaryGroups([
    { result: "found", count: foundCount },
    { result: "wrong_location", count: data.fieldBars.counts.location },
    { result: "wrong_custodian", count: data.fieldBars.counts.custodian },
    { result: "wrong_condition", count: data.fieldBars.counts.condition },
    { result: "not_found", count: notFoundCount },
    { result: "out_of_scope", count: data.resultCard.outOfScope },
    { result: "pending_review", count: data.steps.review.pendingFindings },
  ])
  const resultSummaryItemConfig = {
    found: { label: t("found"), tone: "success" as const, href: foundResultHref, actionLabel: t("viewResultItems") },
    wrong_location: { label: t("wrongLocation"), tone: "warning" as const, href: wrongLocationResultHref, actionLabel: t("viewResultItems") },
    wrong_custodian: { label: t("wrongCustodian"), tone: "warning" as const, href: wrongCustodianResultHref, actionLabel: t("viewResultItems") },
    wrong_condition: { label: t("wrongCondition"), tone: "warning" as const, href: wrongConditionResultHref, actionLabel: t("viewResultItems") },
    not_found: { label: t("notFound"), tone: "danger" as const, href: notFoundResultHref, actionLabel: t("viewResultItems") },
    out_of_scope: { label: t("outOfScope"), tone: "info" as const, href: outOfScopeResultHref, actionLabel: t("viewResultItems") },
    pending_review: { label: t("pendingReview"), tone: "muted" as const, href: pendingReviewResultHref, actionLabel: t("viewPendingReviewAssets") },
  }
  const resultNormalGroup = resultSummaryGroups.normal.map((item) => ({ ...item, ...resultSummaryItemConfig[item.result] }))
  const resultNeedsReviewGroup = resultSummaryGroups.needsReview.map((item) => ({ ...item, ...resultSummaryItemConfig[item.result] }))
  // The result buckets as StatStrip cells: a bucket with items is a link to its list, the bucket in view is current
  // (aria-current and the primary line), and an empty bucket is plain text.
  const resultStatItems = (group: typeof resultNormalGroup): StatStripItem[] =>
    group.map((item) => ({
      key: item.result,
      label: item.label,
      value: formatCount(item.count),
      href: item.count > 0 ? item.href : undefined,
      current: resultListState.result === item.result,
      foot: item.count > 0 ? item.actionLabel : undefined,
      footTitle: item.count > 0 ? item.actionLabel : undefined,
    }))

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
          </>
        }
        actions={
          canExportRound || !isRoundReadOnly ? (
            <>
              {canExportRound ? (
                <>
                  <a href={auditRoundExportHref} download className={buttonVariants({ variant: "outline", size: "md" })}>
                    <Download aria-hidden="true" />
                    {t("exportResult")}
                  </a>
                  <a href={auditRoundExportPdfHref} download className={buttonVariants({ variant: "outline", size: "md" })}>
                    <FileText aria-hidden="true" />
                    {t("exportResultPdf")}
                  </a>
                  <a href={auditRoundVarianceHref} download className={buttonVariants({ variant: "outline", size: "md" })}>
                    <Download aria-hidden="true" />
                    {t("exportVariance")}
                  </a>
                </>
              ) : null}
              {!isRoundReadOnly ? (
                <>
                  <Link href={pendingHref} className={buttonVariants({ variant: "outline", size: "md" })}>
                    <AlertTriangle aria-hidden="true" />
                    {t("pendingAssets")}
                  </Link>
                  <Link href={scanHref} className={buttonVariants({ size: "md" })}>
                    <ScanLine aria-hidden="true" />
                    {t("scan")}
                  </Link>
                </>
              ) : null}
            </>
          ) : undefined
        }
      />
      {!isRoundReadOnly ? (
        <ActionBar
          label={tCommon("actions")}
          actions={[
            { href: scanHref, label: t("scan"), icon: <ScanLine className="h-4 w-4" />, primary: true },
            { href: pendingHref, label: t("pendingAssets"), icon: <AlertTriangle className="h-4 w-4" /> },
            { href: pendingReviewFindingsHref, label: t("openFindingReview"), icon: <FileText className="h-4 w-4" /> },
            { href: returnToHref, label: tCommon("back"), icon: <ArrowLeft className="h-4 w-4" /> },
          ]}
        />
      ) : null}

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

      <StatStrip
        className="mb-6"
        items={[
          { key: "totalExpected", label: t("totalExpected"), value: formatCount(data.steps.walk.total) },
          { key: "pending", label: t("pending"), value: formatCount(pendingCount) },
          { key: "scanned", label: t("scanned"), value: formatCount(processedCount) },
          { key: "progress", label: t("progress"), value: `${formatCount(progress)}%` },
        ]}
      />

      <ContentPanel className="mb-6">
        <AuditProgressBar
          total={data.steps.walk.total}
          processed={processedCount}
          pending={pendingCount}
          label={t("progress")}
          processedLabel={t("scanned")}
          pendingLabel={t("pending")}
          breakdown={[
            { label: t("found"), value: foundCount, tone: "success" },
            { label: t("mismatch"), value: mismatchCount, tone: "warning" },
            { label: t("notFound"), value: notFoundCount, tone: "danger" },
            { label: t("pending"), value: pendingCount, tone: "muted" },
          ]}
        />
      </ContentPanel>

      <ContentPanel title={t("resultDashboard")} description={t("resultDashboardHelp")} className="mb-6">
        <div className="grid gap-4 lg:grid-cols-[minmax(220px,0.65fr)_1fr]">
          <div>
            <h3 className="text-sm font-semibold text-foreground">{t("resultNormalGroup")}</h3>
            <StatStrip className="mt-2" items={resultStatItems(resultNormalGroup)} />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-foreground">{t("resultNeedsReviewGroup")}</h3>
            <StatStrip className="mt-2" items={resultStatItems(resultNeedsReviewGroup)} />
          </div>
        </div>
      </ContentPanel>

      <ContentPanel title={t("evidenceSummary")} description={t("evidenceSummaryHelp")} className="mb-6">
        <StatStrip
          items={[
            { key: "evidenceAttached", label: t("evidenceAttached"), value: formatCount(data.evidence.withPhoto) },
            { key: "evidenceMissing", label: t("evidenceMissing"), value: formatCount(data.evidence.withoutPhoto) },
            { key: "checklistComplete", label: t("checklistComplete"), value: formatCount(data.evidence.checklistComplete) },
            { key: "checklistIncomplete", label: t("checklistIncomplete"), value: formatCount(data.evidence.checklistIncomplete) },
          ]}
        />
      </ContentPanel>

      {canApprove && !isRoundReadOnly ? (
        <div className="mb-6 grid gap-3 lg:grid-cols-[minmax(0,1fr)_auto]">
          <AuditRoundCloseButton
            roundId={round.id}
            disabled={!canCloseRound}
            checklist={closeChecklist}
          />
          <ContentPanel title={t("cancelRound")} description={t("cancelDialogHelp")} className="lg:min-w-72 lg:self-start">
            <AuditRoundCancelButton roundId={round.id} impact={cancelImpact} />
          </ContentPanel>
        </div>
      ) : null}

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
