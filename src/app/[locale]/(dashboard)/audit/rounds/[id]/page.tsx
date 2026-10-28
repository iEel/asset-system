import Link from "next/link"
import { notFound, redirect } from "next/navigation"
import { getTranslations } from "next-intl/server"
import { ArrowLeft, Check, ChevronRight, Eye, FileText, ListChecks, Pencil, ScanLine } from "lucide-react"
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
import { RowActions, type RowActionGroup } from "@/components/ui/row-actions"
import { StatStrip } from "@/components/ui/stat-strip"
import { StatusBadge } from "@/components/ui/status-badge"
import { Steps } from "@/components/ui/steps"
import { TabNav } from "@/components/ui/tab-nav"
import { toneIcons } from "@/components/ui/tone-icons"
import { getDesktopTableOnlyClasses, getMobileCardListClasses, getPanelClasses } from "@/lib/design-system"
import { formatCount, formatPercent } from "@/lib/display-format"
import { lastListPage } from "@/lib/list-pagination"
import { appendOperationalReturnTo, normalizeOperationalReturnTo } from "@/lib/operational-return-navigation"
import { auditRoundStatusLabelKey, effectiveAuditRoundStatus, isAuditRoundReadOnlyStatus } from "@/lib/audit-round-status"
import type { AuditCorrectionHistoryItem } from "@/lib/audit-correction-history"
import { getAuditRoundPageData } from "@/lib/audit-round-page-data"
import { formatFindingValue } from "@/lib/audit-finding-labels"
import {
  auditRoundDifferences,
  auditRoundItemReviewState,
  auditRoundPageStepKeys,
  auditRoundResultBadge,
  auditRoundReviewStateTone,
  buildAuditRoundPageMainAction,
  buildAuditRoundPageSteps,
  type AuditRoundPageStepKey,
} from "@/lib/audit-round-page-rules"
import { buildAuditRoundDueLine } from "@/lib/audit-rounds-list-rules"
import { startOfBangkokDay } from "@/lib/waiting-work-rules"
import { withPerformanceTiming } from "@/lib/performance-timing"
import { paginationRange } from "@/lib/master-data-query"
import {
  auditFindingFields,
  auditFindingTypeByField,
  auditRoundBranchFilterName,
  auditRoundHrefQuery,
  auditRoundResultPageSizeOptions,
  buildAuditRoundExportHref,
  buildAuditRoundPageHref,
  parseAuditRoundListFilters,
  parseAuditRoundResultListParams,
  type AuditRoundListFilters,
  type AuditRoundPageHrefOverrides,
  type AuditRoundResultFilter,
} from "@/lib/audit-round-result-filters"

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

  const { page, pageSize, ...filters } = parseAuditRoundResultListParams(rawSearchParams)
  const data = await withPerformanceTiming(
    "audit-round.page-data",
    () => getAuditRoundPageData({ roundId: id, filters, page, pageSize, user }),
    { route: "/audit/rounds/[id]", locale, result: filters.result, hasSearch: Boolean(filters.search) }
  )
  if (!data) notFound()
  const { round } = data
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
  const auditRoundExportHref = buildAuditRoundExportHref(locale, round.id, "export", filters)
  const auditRoundExportPdfHref = buildAuditRoundExportHref(locale, round.id, "export-pdf", filters)
  const auditRoundVarianceHref = buildAuditRoundExportHref(locale, round.id, "variance-export", filters)
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
  const pendingReviewFindingsHref = `/${locale}/audit/findings?status=pending&roundId=${round.id}`
  const openActionFindingsHref = `/${locale}/audit/findings?status=action_open&roundId=${round.id}`
  const stepsState = buildAuditRoundPageSteps({ status: round.status, pendingItems: data.steps.close.checklist.pendingItems, pendingFindings: data.steps.close.checklist.pendingFindings })
  const mainAction = buildAuditRoundPageMainAction({ steps: stepsState, pendingItems: data.steps.close.checklist.pendingItems, pendingFindings: data.steps.close.checklist.pendingFindings, canClose: data.steps.close.canClose, openedByViewer: data.steps.close.openedByViewer, canScan, canApprove })
  const stepLabels: Record<AuditRoundPageStepKey, string> = { walk: t("stepWalk"), review: t("stepReview"), close: t("stepClose") }
  const stepItems = stepsState ? auditRoundPageStepKeys.map((key, index) => ({ id: key, label: stepLabels[key], state: stepsState.states[index] })) : []
  // The main step as a link (the close is a button, in the card only): the card's head and the phone bar's primary.
  // Without audit:approve, step 2 is a neutral link to the same findings, never a call to review (final review M2).
  const mainLink =
    mainAction?.kind === "walk"
      ? { href: mainAction.target === "scan" ? scanHref : pendingHref, label: t("nextStepContinueScan", { count: formatCount(mainAction.count) }), icon: mainAction.target === "scan" ? <ScanLine className="h-4 w-4" /> : <ListChecks className="h-4 w-4" />, primary: true }
      : mainAction?.kind === "review"
        ? { href: pendingReviewFindingsHref, label: mainAction.decide ? t("nextStepReviewItems", { count: formatCount(mainAction.count) }) : t("nextStepViewPendingFindings", { count: formatCount(mainAction.count) }), icon: <FileText className="h-4 w-4" />, primary: mainAction.decide }
        : null
  // The four conditions the close API checks (audit-round-close.ts getAuditRoundCloseChecklist, and the route's
  // closeOwnRound), each linked to its rows while it blocks; the counts are the API's (findings, P2-R3). The opener is
  // told they cannot close (spec §8). A closed round reads one met line, "รอบนี้ปิดแล้ว", and no opener's sentence
  // (P2-R8, final review M1).
  const checklist = data.steps.close.checklist
  const closeConditions: Array<{ key: string; ok: boolean; label: string; href?: string }> = round.status === "closed" ? [{ key: "closed", ok: true, label: t("stepsClosedTitle") }] : [
    { key: "pendingItems", ok: checklist.pendingItems === 0, label: checklist.pendingItems === 0 ? t("closeNoPendingItems") : t("closePendingItemsCount", { count: formatCount(checklist.pendingItems) }), href: pendingHref },
    { key: "pendingFindings", ok: checklist.pendingFindings === 0, label: checklist.pendingFindings === 0 ? t("closeNoPendingFindings") : t("closePendingFindingsCount", { count: formatCount(checklist.pendingFindings) }), href: pendingReviewFindingsHref },
    { key: "openActions", ok: checklist.openActions === 0, label: checklist.openActions === 0 ? t("closeNoOpenActions") : t("openActionsCount", { count: formatCount(checklist.openActions) }), href: openActionFindingsHref },
    { key: "opener", ok: !data.steps.close.openedByViewer, label: data.steps.close.openedByViewer ? t("closeOwnRoundNotice") : t("closeSeparateApprover") },
  ]
  const barActions: ActionBarLink[] = [
    ...(mainLink ? [mainLink] : []),
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
  // Each row's "แก้ไขผลตรวจ" comes back to the list as it stands, page included.
  const listHref = pageHref(filters, { page })
  const resultFilterLabels: Record<AuditRoundResultFilter, string> = {
    all: t("viewAll"),
    pending: t("pending"),
    found: t("found"),
    mismatch: t("mismatchShort"),
    not_found: t("notFound"),
    out_of_scope: t("outOfScope"),
    pending_review: t("pendingReview"),
  }
  const resultListTotal = data.total
  // A page past the last one (an old link, or rows that moved to another result) shows the last page (spec 2B I21).
  const resultLastPage = lastListPage(resultListTotal, pageSize)
  if (data.rows.length === 0 && resultListTotal > 0 && page > resultLastPage) {
    redirect(pageHref(filters, { page: resultLastPage }))
  }
  const { start: resultStart, end: resultEnd, totalPages: resultTotalPages } = paginationRange(page, pageSize, resultListTotal)
  // The result chips count within every other filter (spec §5); choosing one keeps them and goes back to page 1.
  const resultTabs = ([
    ["all", t("viewAll"), data.resultChips.all],
    ["pending", t("pending"), data.resultChips.pending],
    ["found", t("found"), data.resultChips.found],
    ["mismatch", t("mismatchShort"), data.resultChips.mismatch],
    ["not_found", t("notFound"), data.resultChips.notFound],
    ["out_of_scope", t("outOfScope"), data.resultChips.outOfScope],
    ["pending_review", t("pendingReview"), data.resultChips.pendingReview],
  ] as const).map(([result, label, count]) => ({ key: result, label, count: formatCount(count), href: pageHref(filters, { result, page: 1 }) }))
  // The category chips (spec decision 2): within the result in use and the other filters, the six largest then อื่น ๆ
  // (a real filter value, P2-R11), then a chosen category outside the six as its own chip; hidden at one category or
  // none in the round within the other filters, whatever the result tab (P2-R24, final review M4). Task 3's
  // data.categoryChips holds each part.
  const categoryChipItems = [
    ...data.categoryChips.top,
    ...(data.categoryChips.other.categories > 0 || filters.categoryId === "other" ? [{ id: "other", name: t("categoryOther"), count: data.categoryChips.other.count }] : []),
    ...(data.categoryChips.selected ? [data.categoryChips.selected] : []),
  ]
  const categoryTabs = data.categoryChips.visible
    ? [
        { key: "all", label: t("categoryAll"), count: formatCount(data.categoryChips.all), href: pageHref(filters, { categoryId: null, page: 1 }) },
        ...categoryChipItems.map((chip) => ({ key: chip.id, label: chip.name, count: formatCount(chip.count), href: pageHref(filters, { categoryId: chip.id, page: 1 }) })),
      ]
    : []
  // The filter row (spec §8): each chip removes only itself; the dashboard's company and branch sit beside the category.
  // The company and branch narrow every list, the out-of-scope one included (P2-R4).
  const resultFilterChips: FilterChipItem[] = []
  if (filterCompany) {
    resultFilterChips.push({
      key: "companyId",
      label: t("companyFilterChip", { company: `${filterCompany.code} - ${filterCompany.nameTh}` }),
      href: pageHref(filters, { companyId: null, page: 1 }),
    })
  }
  if (filterBranch) {
    resultFilterChips.push({
      key: "branchId",
      label: t("branchFilterChip", { branch: auditRoundBranchFilterName({ name: filterBranch.name, companyCode: filterBranch.company.code }, Boolean(filterCompany)) }),
      href: pageHref(filters, { branchId: null, page: 1 }),
    })
  }
  if (filters.categoryId) {
    resultFilterChips.push({
      key: "categoryId",
      label: t("categoryFilterChip", { category: filters.categoryId === "other" ? t("categoryOther") : (filterCategory?.name ?? t("categoryOther")) }),
      href: pageHref(filters, { categoryId: null, page: 1 }),
    })
  }
  if (filters.field) {
    resultFilterChips.push({
      key: "field",
      label: tFinding(`type_${auditFindingTypeByField[filters.field]}`),
      href: pageHref(filters, { field: null, page: 1 }),
    })
  }
  if (filters.components) {
    resultFilterChips.push({
      key: "components",
      label: t("componentsMissingChip", { count: formatCount(data.componentsMissingInFilters) }),
      href: pageHref(filters, { components: null, page: 1 }),
    })
  }
  // "ไปพิจารณารายการไม่ตรง" follows the field in use (wrong_department included) or the review and mismatch results.
  const resultFindingReviewHref = filters.field
    ? `/${locale}/audit/findings?status=pending&roundId=${round.id}&findingType=${auditFindingTypeByField[filters.field]}`
    : filters.result === "pending_review" || filters.result === "mismatch"
      ? pendingReviewFindingsHref
      : null
  const hasResultBucketFilter = filters.result !== "all"
  const hasResultListSearch = Boolean(filters.search)
  const selectedResultLabel = resultFilterLabels[filters.result]
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
  const resultRows = data.rows.map((item) => {
    const badge = auditRoundResultBadge(item.auditStatus, item.auditResult)
    const review = auditRoundItemReviewState(item.findings.map((finding) => finding.reviewStatus))
    const assetHref = `/${locale}/assets/${item.asset.id}`
    const editHref = canScan && !isRoundReadOnly && item.auditStatus !== "pending" ? buildAuditRoundScanEditHref({ locale, roundId: round.id, assetId: item.asset.id, returnTo: listHref }) : null
    return {
      id: item.id,
      asset: item.asset,
      assetHref,
      resultLabel: t(badge.labelKey),
      resultTone: badge.tone,
      // A value as the findings page shows it (Task 3's labels); an empty one stays null, so the cell shows Nil, never "-".
      // Each line names its field, "แผนก: ฝ่ายบัญชี → ฝ่ายขาย" (board AU-Round), not the finding's type.
      differences: auditRoundDifferences(item.findings).map((difference) => ({
        key: difference.id,
        label: t(`differenceField_${difference.field}`),
        expected: difference.expectedValue ? formatFindingValue(difference.findingType, difference.expectedValue, data.findingValueLabels) : null,
        actual: difference.actualValue ? formatFindingValue(difference.findingType, difference.actualValue, data.findingValueLabels) : null,
        component: difference.component,
      })),
      checkedBy: item.checkedBy?.label ?? null,
      checkedAt: item.checkedBy?.at ?? null,
      photo: item.hasPhoto === null ? null : item.hasPhoto ? t("photoAttached") : t("photoMissing"),
      review: review ? { label: tFinding(`status_${review}`), tone: auditRoundReviewStateTone[review] } : null,
      componentRelationshipLines: buildAuditRoundComponentRelationshipLines(item.asset, t),
      missingComponents: item.missingComponents.map((component) => ({ ...component, href: pageHref(roundWideFilters, { search: component.assetTag }) })),
      latestCorrection: item.correctionHistory[0] ?? null,
      editHref,
      // ⋯: "แก้ไขผลตรวจ" for audit:edit on an open round, on a checked item only (a pending one has no result to edit).
      // On an out-of-scope find, it opens that record's out-of-scope form through the walk's lookup (P3-R4). Then "ดู".
      groups: [{ key: "row", items: [
        ...(editHref ? [{ kind: "link" as const, key: "edit", label: t("editScanResult"), href: editHref, icon: <Pencil aria-hidden="true" /> }] : []),
        { kind: "link" as const, key: "view", label: tCommon("view"), href: assetHref, icon: <Eye aria-hidden="true" /> },
      ] }] satisfies RowActionGroup[],
    }
  })

  return (
    <div className={!isRoundReadOnly ? actionBarPagePadding.single : undefined}>
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
              <Link href={mainLink.href} className={buttonVariants({ variant: mainLink.primary ? "default" : "outline", size: "md" })}>
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
            <span className="text-sm text-muted-foreground">
              <span className="num font-medium text-foreground">{formatCount(resultListTotal)}</span> {t("items")}
            </span>
            {resultFindingReviewHref && !isRoundReadOnly ? (
              <Link href={resultFindingReviewHref} className={buttonVariants({ variant: "outline", size: "md" })}>
                <FileText aria-hidden="true" />
                {t("openFindingReview")}
              </Link>
            ) : null}
          </div>
        </div>

        <div className="mb-4 space-y-3">
          <TabNav aria-label={t("result")} items={resultTabs} current={filters.result} />
          {categoryTabs.length > 0 ? <TabNav aria-label={t("categoryChipsLabel")} items={categoryTabs} current={filters.categoryId ?? "all"} /> : null}
          <FilterChipList chips={resultFilterChips} label={t("activeFilters")} removeLabel={t("clearFilter")} clearAll={{ href: allResultHref, label: t("clearAllFilters") }} />
        </div>

        <div className={cn(getPanelClasses(), "overflow-hidden")}>
          {/* The table's top bar (spec §8): the search, which finds code, name and the expected location (P2-R5) and keeps
              every filter. MasterDataSearch's mb-4 is the bar's bottom space. */}
          <div className="border-b border-border-soft px-4 pt-4">
            <MasterDataSearch
              action={`/${locale}/audit/rounds/${round.id}`}
              defaultValue={filters.search}
              placeholder={t("searchItems")}
              submitLabel={tCommon("search")}
              hiddenInputs={Object.fromEntries(auditRoundHrefQuery(pageHref(filters, { search: "", page: 1 })))}
            />
          </div>
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
                  <div className="flex min-w-0 items-start justify-between gap-2">
                    <Link href={item.assetHref} className={cn(linkVariants({ size: "inherit" }), "inline-flex min-h-11 min-w-0 items-center md:min-h-0")}>
                      <span className="tag min-w-0 whitespace-normal break-all font-medium">{item.asset.assetTag}</span>
                    </Link>
                    <StatusBadge className="shrink-0" label={item.resultLabel} tone={item.resultTone} />
                  </div>
                  <p className="mt-1 line-clamp-2 text-sm text-foreground">{item.asset.name}</p>
                  {item.componentRelationshipLines.length > 0 ? (
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {item.componentRelationshipLines.map((line) => (
                        <Chip key={line} title={line}>{line}</Chip>
                      ))}
                    </div>
                  ) : null}
                  <RoundItemMissingComponents components={item.missingComponents} prefix={t("missingComponentPrefix")} />
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
                      { key: "difference", label: t("differenceColumn"), value: item.differences.length > 0 ? <RoundItemDifferences lines={item.differences} componentLabel={t("componentMark")} /> : null },
                      { key: "checkedBy", label: t("checkedByColumn"), value: item.checkedBy || item.checkedAt ? <RoundItemChecker name={item.checkedBy} at={item.checkedAt} /> : null },
                      { key: "photo", label: t("photoColumn"), value: item.photo },
                      { key: "review", label: t("reviewColumn"), value: item.review ? <StatusBadge label={item.review.label} tone={item.review.tone} /> : null },
                    ]}
                  />
                  {item.editHref ? (
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
                <DataTableHead>{t("result")}</DataTableHead>
                <DataTableHead>{t("assetColumn")}</DataTableHead>
                <DataTableHead>{t("differenceColumn")}</DataTableHead>
                <DataTableHead>{t("checkedByColumn")}</DataTableHead>
                <DataTableHead>{t("photoColumn")}</DataTableHead>
                <DataTableHead>{t("reviewColumn")}</DataTableHead>
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
                  <ClickableTableRow key={item.id} href={item.assetHref} label={`${tCommon("view")}: ${item.asset.assetTag}`}>
                    <DataTableCell className="whitespace-nowrap">
                      <StatusBadge label={item.resultLabel} tone={item.resultTone} />
                    </DataTableCell>
                    <DataTableCell className="min-w-56 text-foreground">
                      <div className="font-medium">{item.asset.name}</div>
                      <div className="mt-0.5 text-meta text-muted-foreground"><span className="tag">{item.asset.assetTag}</span></div>
                      {item.componentRelationshipLines.length > 0 ? (
                        <div className="mt-1 flex flex-wrap gap-1.5">
                          {item.componentRelationshipLines.map((line) => (
                            <Chip key={line} title={line}>{line}</Chip>
                          ))}
                        </div>
                      ) : null}
                      <RoundItemMissingComponents components={item.missingComponents} prefix={t("missingComponentPrefix")} />
                      {item.latestCorrection ? (
                        <Notice tone="info" className="mt-2">
                          <div>{t("correctionHistoryLatest", { date: formatDateTime(item.latestCorrection.createdAt), user: item.latestCorrection.userLabel })}</div>
                          {item.latestCorrection.changedFields.length > 0 ? (
                            <div>{t("correctionHistoryFields", { fields: formatAuditCorrectionFields(item.latestCorrection, t) })}</div>
                          ) : null}
                        </Notice>
                      ) : null}
                    </DataTableCell>
                    <DataTableCell className="min-w-56 text-foreground">
                      <RoundItemDifferences lines={item.differences} componentLabel={t("componentMark")} />
                    </DataTableCell>
                    <DataTableCell className="min-w-40 text-foreground">
                      <RoundItemChecker name={item.checkedBy} at={item.checkedAt} />
                    </DataTableCell>
                    <DataTableCell className="whitespace-nowrap text-muted-foreground">{item.photo ?? <Nil />}</DataTableCell>
                    <DataTableCell className="whitespace-nowrap">
                      {item.review ? <StatusBadge label={item.review.label} tone={item.review.tone} /> : <Nil />}
                    </DataTableCell>
                    <DataTableCell align="right" sticky="right">
                      <RowActions
                        code={item.asset.assetTag}
                        name={item.asset.name}
                        menuLabel={tCommon("moreActionsFor", { code: item.asset.assetTag })}
                        next={undefined}
                        groups={item.groups}
                      />
                    </DataTableCell>
                  </ClickableTableRow>
                ))
              )}
            </DataTableBody>
          </DataTable>
          {resultListTotal > 0 ? (
            <DataTableFoot>
              <Pagination
                page={page}
                totalPages={resultTotalPages}
                previousHref={pageHref(filters, { page: page - 1 })}
                nextHref={pageHref(filters, { page: page + 1 })}
                pageSize={pageSize}
                pageSizes={auditRoundResultPageSizeOptions.map((value) => ({ value, href: pageHref(filters, { page: 1, pageSize: value }) }))}
                labels={{
                  navigation: tCommon("pagination"),
                  previous: tCommon("previous"),
                  next: tCommon("next"),
                  pageOf: tCommon("pageOf", { page, total: resultTotalPages }),
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
  if (componentCount > 0) lines.push(t("componentHasChildren", { count: formatCount(componentCount) }))
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

type RoundItemDifference = { key: string; label: string; expected: string | null; actual: string | null; component: boolean }

// สิ่งที่ต่าง (spec §8): "ตามระบบ → ที่พบ" per field finding that still stands; a component's carries ส่วนควบ.
function RoundItemDifferences({ lines, componentLabel }: { lines: RoundItemDifference[]; componentLabel: string }) {
  if (lines.length === 0) return <Nil />
  return (
    <ul className="space-y-1">
      {lines.map((line) => (
        <li key={line.key} className="min-w-0 break-words">
          <span className="text-muted-foreground">{line.label}: </span>
          {line.expected ?? <Nil />} → {line.actual ?? <Nil />}
          {line.component ? <Chip className="ms-1.5">{componentLabel}</Chip> : null}
        </li>
      ))}
    </ul>
  )
}

// "ไม่พบ: <name> (<tag>)" for each installed component found missing in this round (spec §8, decision 6); the tag opens
// this round page searched by it, where the component's own row is (P2-R17).
function RoundItemMissingComponents({ components, prefix }: { components: Array<{ id: string; assetTag: string; name: string; href: string }>; prefix: string }) {
  if (components.length === 0) return null
  return (
    <ul className="mt-1 space-y-0.5 text-meta text-muted-foreground">
      {components.map((component) => (
        <li key={component.id}>
          {prefix} {component.name} (<Link href={component.href} className={cn(linkVariants({ size: "inherit" }), "tag inline-flex min-h-11 items-center md:min-h-0")}>{component.assetTag}</Link>)
        </li>
      ))}
    </ul>
  )
}

// ตรวจโดย + เวลา (spec §8): the scanner, or for a not-found the one who recorded it (Task 3's data).
function RoundItemChecker({ name, at }: { name: string | null; at: Date | null }) {
  if (!name && !at) return <Nil />
  return (
    <>
      <span className="block">{name ?? <Nil />}</span>
      {at ? <span className="block text-meta text-muted-foreground">{formatDateTime(at)}</span> : null}
    </>
  )
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
