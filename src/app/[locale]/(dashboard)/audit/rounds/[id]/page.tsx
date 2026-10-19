import Link from "next/link"
import { notFound, redirect } from "next/navigation"
import { getTranslations } from "next-intl/server"
import { AlertTriangle, ArrowLeft, Download, FileText, Pencil, ScanLine } from "lucide-react"
import { prisma } from "@/lib/db"
import { requirePagePermission } from "@/lib/page-auth"
import { MasterDataSearch } from "@/components/master-data/master-data-layout"
import { cn, formatDate, formatDateTime } from "@/lib/utils"
import { ClickableTableRow } from "@/components/ui/clickable-table-row"
import { AuditProgressBar } from "@/components/audit/audit-progress-bar"
import { AuditRoundCancelButton } from "@/components/audit/audit-round-cancel-button"
import { AuditRoundCloseButton } from "@/components/audit/audit-round-close-button"
import { hasPermission } from "@/lib/auth-utils"
import { categoryPhotoChecklistKey, parsePhotoChecklist } from "@/lib/category-photo-checklist"
import { ActionBar, actionBarPagePadding } from "@/components/ui/action-bar"
import { ActionEmptyState } from "@/components/ui/action-empty-state"
import { buttonVariants, linkVariants } from "@/components/ui/button-variants"
import { Chip } from "@/components/ui/chip"
import { ContentPanel } from "@/components/ui/content-panel"
import { DataTable, DataTableBody, DataTableCell, DataTableFoot, DataTableHead, DataTableHeader, TableEmptyRow } from "@/components/ui/data-table"
import { KeyValueList } from "@/components/ui/key-value-list"
import { Nil } from "@/components/ui/nil"
import { Notice } from "@/components/ui/notice"
import { PageHeader } from "@/components/ui/page-header"
import { Pagination } from "@/components/ui/pagination"
import { RowActions } from "@/components/ui/row-actions"
import { StatStrip, type StatStripItem } from "@/components/ui/stat-strip"
import { StatusBadge } from "@/components/ui/status-badge"
import { isSameAuditActor } from "@/lib/audit-segregation"
import { getDesktopTableOnlyClasses, getMobileCardListClasses, getPanelClasses } from "@/lib/design-system"
import { formatCount } from "@/lib/display-format"
import { lastListPage } from "@/lib/list-pagination"
import { appendOperationalReturnTo, normalizeOperationalReturnTo } from "@/lib/operational-return-navigation"
import { countSuccessfulAuditResultRows, isVarianceAuditResult } from "@/lib/audit-result-summary"
import { isAuditRoundReadOnlyStatus } from "@/lib/audit-round-status"
import { buildAuditCorrectionHistoryByItemId, type AuditCorrectionHistoryItem } from "@/lib/audit-correction-history"
import { paginationRange } from "@/lib/master-data-query"
import {
  auditRoundResultPageSizeOptions,
  buildAuditRoundResultSummaryGroups,
  buildAuditRoundItemWhere,
  buildAuditRoundResultListHref,
  buildAuditRoundScanHistoryWhere,
  getAuditRoundItemResultLabelKey,
  getAuditRoundItemStatusLabelKey,
  isAuditRoundScanHistoryResultFilter,
  parseAuditRoundResultListParams,
  type AuditRoundResultFilter,
  type AuditRoundResultListState,
} from "@/lib/audit-round-result-filters"
import { getAuditItemStatusLabelKey } from "@/lib/audit-item-status-labels"

type AuditRoundDetailPageProps = {
  params: Promise<{ locale: string; id: string }>
  searchParams: Promise<{ returnTo?: string | string[]; result?: string | string[]; search?: string | string[]; page?: string | string[]; pageSize?: string | string[] }>
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
  const resultListOffset = (resultListState.page - 1) * resultListState.pageSize
  const isOutOfScopeResultList = isAuditRoundScanHistoryResultFilter(resultListState.result)
  const resultItemWhere = buildAuditRoundItemWhere({ roundId: id, result: resultListState.result, search: resultListState.search })
  const resultScanHistoryWhere = buildAuditRoundScanHistoryWhere({ roundId: id, search: resultListState.search })

  const [
    round,
    statusCounts,
    resultCounts,
    findingTypeCounts,
    pendingReviewCount,
    outOfScopeCount,
    openActionCount,
    approvedFindingCount,
    scanHistoryCount,
    evidenceItems,
    resultItems,
    resultItemTotal,
    outOfScopeScanRows,
    outOfScopeScanTotal,
  ] = await Promise.all([
    prisma.auditRound.findFirst({
      where: { id, isActive: true },
      include: {
        scopeCompany: { select: { code: true, nameTh: true } },
        scopeBranch: { select: { code: true, name: true } },
        scopeDepartment: { select: { code: true, name: true } },
        scopeLocation: { select: { code: true, name: true } },
        scopeCategory: { select: { code: true, name: true } },
        items: {
          take: 100,
          orderBy: [{ auditStatus: "asc" }, { createdAt: "desc" }],
          include: {
            asset: {
              select: {
                id: true,
                assetTag: true,
                name: true,
                currentLocation: { select: { code: true, name: true } },
                custodian: { select: { code: true, fullNameTh: true } },
                condition: { select: { nameTh: true } },
                parentComponents: {
                  where: { status: "installed", removedAt: null },
                  select: {
                    componentRole: true,
                    slotNo: true,
                    componentAsset: { select: { id: true, assetTag: true, name: true } },
                  },
                },
                installedInLinks: {
                  where: { status: "installed", removedAt: null },
                  select: {
                    componentRole: true,
                    slotNo: true,
                    parentAsset: { select: { id: true, assetTag: true, name: true } },
                  },
                },
              },
            },
          },
        },
        _count: { select: { items: true, findings: true } },
      },
    }),
    prisma.auditItem.groupBy({
      by: ["auditStatus"],
      where: { auditRoundId: id },
      _count: { _all: true },
    }),
    prisma.auditItem.groupBy({
      by: ["auditResult"],
      where: { auditRoundId: id },
      _count: { _all: true },
    }),
    prisma.auditFinding.groupBy({
      by: ["findingType"],
      where: { auditRoundId: id },
      _count: { _all: true },
    }),
    prisma.auditFinding.count({ where: { auditRoundId: id, reviewStatus: "pending" } }),
    prisma.auditScanHistory.count({ where: { auditRoundId: id, auditItemId: null } }),
    prisma.auditFinding.count({ where: { auditRoundId: id, actionStatus: { in: ["planned", "in_progress", "done"] } } }),
    prisma.auditFinding.count({ where: { auditRoundId: id, reviewStatus: "approved" } }),
    prisma.auditScanHistory.count({ where: { auditRoundId: id } }),
    prisma.auditItem.findMany({
      where: { auditRoundId: id },
      select: {
        assetId: true,
        asset: {
          select: {
            categoryId: true,
          },
        },
      },
    }),
    isOutOfScopeResultList
      ? Promise.resolve([])
      : prisma.auditItem.findMany({
          where: resultItemWhere,
          skip: resultListOffset,
          take: resultListState.pageSize,
          orderBy: [{ auditStatus: "asc" }, { createdAt: "desc" }],
          include: {
            asset: {
              select: {
                id: true,
                assetTag: true,
                name: true,
                currentLocation: { select: { code: true, name: true } },
                custodian: { select: { code: true, fullNameTh: true } },
                condition: { select: { nameTh: true } },
                parentComponents: {
                  where: { status: "installed", removedAt: null },
                  select: {
                    componentRole: true,
                    slotNo: true,
                    componentAsset: { select: { id: true, assetTag: true, name: true } },
                  },
                },
                installedInLinks: {
                  where: { status: "installed", removedAt: null },
                  select: {
                    componentRole: true,
                    slotNo: true,
                    parentAsset: { select: { id: true, assetTag: true, name: true } },
                  },
                },
              },
            },
          },
        }),
    isOutOfScopeResultList ? Promise.resolve(0) : prisma.auditItem.count({ where: resultItemWhere }),
    isOutOfScopeResultList
      ? prisma.auditScanHistory.findMany({
          where: resultScanHistoryWhere,
          skip: resultListOffset,
          take: resultListState.pageSize,
          orderBy: { scannedAt: "desc" },
          include: {
            asset: {
              select: {
                id: true,
                assetTag: true,
                name: true,
                currentLocation: { select: { code: true, name: true } },
                custodian: { select: { code: true, fullNameTh: true } },
                parentComponents: {
                  where: { status: "installed", removedAt: null },
                  select: {
                    componentRole: true,
                    slotNo: true,
                    componentAsset: { select: { id: true, assetTag: true, name: true } },
                  },
                },
                installedInLinks: {
                  where: { status: "installed", removedAt: null },
                  select: {
                    componentRole: true,
                    slotNo: true,
                    parentAsset: { select: { id: true, assetTag: true, name: true } },
                  },
                },
              },
            },
          },
        })
      : Promise.resolve([]),
    isOutOfScopeResultList ? prisma.auditScanHistory.count({ where: resultScanHistoryWhere }) : Promise.resolve(0),
  ])
  if (!round) notFound()

  const cancelledByUser = round.cancelledBy
    ? await prisma.user.findUnique({
        where: { id: round.cancelledBy },
        select: { username: true, displayName: true },
      })
    : null

  const correctionHistoryByItemId = buildAuditCorrectionHistoryByItemId(
    resultItems.length > 0
      ? await prisma.systemLog.findMany({
          where: {
            module: "audit",
            action: "scan_result_corrected",
            recordId: { in: resultItems.map((item) => item.id) },
          },
          orderBy: { createdAt: "desc" },
          take: 100,
          include: { user: { select: { username: true, displayName: true } } },
        })
      : []
  )

  const isRoundCreator = isSameAuditActor(user.id, round.createdBy)
  const isRoundReadOnly = isAuditRoundReadOnlyStatus(round.status)
  // The round's exports need audit:export (their routes check it; the E2E suite's AU1, M1).
  const canExportRound = round.status !== "cancelled" && hasPermission(user, "audit", "export")
  const cancelledByDisplayName = cancelledByUser
    ? cancelledByUser.displayName === cancelledByUser.username
      ? cancelledByUser.username
      : `${cancelledByUser.displayName} (${cancelledByUser.username})`
    : round.cancelledBy
  const pendingCount = statusCounts.find((row) => row.auditStatus === "pending")?._count._all ?? 0
  const processedCount = Math.max(round._count.items - pendingCount, 0)
  const scannedCount = statusCounts
    .filter((row) => row.auditStatus !== "pending")
    .reduce((sum, row) => sum + row._count._all, 0)
  const foundCount = countSuccessfulAuditResultRows(resultCounts)
  const notFoundCount = resultCounts.find((row) => row.auditResult === "not_found")?._count._all ?? 0
  const wrongLocationCount = findingTypeCounts.find((row) => row.findingType === "wrong_location")?._count._all ?? 0
  const wrongCustodianCount = findingTypeCounts.find((row) => row.findingType === "wrong_custodian")?._count._all ?? 0
  const wrongConditionCount = findingTypeCounts.find((row) => row.findingType === "wrong_condition")?._count._all ?? 0
  const mismatchCount = resultCounts
    .filter((row) => isVarianceAuditResult(row.auditResult))
    .reduce((sum, row) => sum + row._count._all, 0)
  const progress = round._count.items > 0 ? Math.round(((round._count.items - pendingCount) / round._count.items) * 100) : 0

  const evidenceSummary = await getEvidenceSummary({
    auditStartDate: round.startDate,
    items: evidenceItems,
  })
  const returnToHref = normalizeOperationalReturnTo(locale, "audit-rounds", rawSearchParams.returnTo)
  const roundDetailReturnHref = appendOperationalReturnTo(`/${locale}/audit/rounds/${round.id}`, returnToHref)
  const pendingHref = appendOperationalReturnTo(`/${locale}/audit/rounds/${round.id}/pending`, roundDetailReturnHref)
  const scanHref = appendOperationalReturnTo(`/${locale}/audit/rounds/${round.id}/scan`, roundDetailReturnHref)
  const resultListReturnHref = buildAuditRoundResultListHref({
    locale,
    roundId: round.id,
    result: resultListState.result,
    returnTo: returnToHref,
    search: resultListState.search,
    page: resultListState.page,
    pageSize: resultListState.pageSize,
  })
  const resultFilterLabels: Record<AuditRoundResultFilter, string> = {
    all: t("viewAll"),
    found: t("found"),
    wrong_location: t("wrongLocation"),
    wrong_custodian: t("wrongCustodian"),
    wrong_condition: t("wrongCondition"),
    not_found: t("notFound"),
    out_of_scope: t("outOfScope"),
    pending_review: t("pendingReview"),
  }
  const resultListTotal = isOutOfScopeResultList ? outOfScopeScanTotal : resultItemTotal
  // A result page past the last one (an old link, or results that moved to another bucket) shows the last page
  // (spec 2B I21). The result list keeps its own page and pageSize params (spec 2B §5.4 row rounds/[id]).
  const resultLastPage = lastListPage(resultListTotal, resultListState.pageSize)
  const resultPageRowCount = isOutOfScopeResultList ? outOfScopeScanRows.length : resultItems.length
  if (resultPageRowCount === 0 && resultListTotal > 0 && resultListState.page > resultLastPage) {
    redirect(buildAuditRoundResultListHref({ locale, roundId: round.id, result: resultListState.result, returnTo: returnToHref, search: resultListState.search, page: resultLastPage, pageSize: resultListState.pageSize }))
  }
  const { start: resultStart, end: resultEnd, totalPages: resultTotalPages } = paginationRange(resultListState.page, resultListState.pageSize, resultListTotal)
  const resultRows = isOutOfScopeResultList
    ? outOfScopeScanRows.map((history) => ({
        id: history.id,
        asset: history.asset,
        auditStatus: "out_of_scope",
        auditStatusLabel: t("outOfScope"),
        auditResult: "out_of_scope",
        auditResultLabel: formatDateTime(history.scannedAt),
        auditResultTone: "info" as const,
        componentRelationshipLines: buildAuditRoundComponentRelationshipLines(history.asset, t),
        latestCorrection: null,
        editHref: buildAuditRoundScanEditHref({ locale, roundId: round.id, assetId: history.asset.id, returnTo: resultListReturnHref }),
      }))
    : resultItems.map((item) => {
        const statusLabelKey = getAuditRoundItemStatusLabelKey(item.auditStatus)
        const itemStatusLabelKey = statusLabelKey ? null : getAuditItemStatusLabelKey(item.auditStatus)
        const resultLabelKey = getAuditRoundItemResultLabelKey(item.auditResult)
        const auditResult = item.auditResult ?? "pending"
        const correctionHistory = correctionHistoryByItemId.get(item.id) ?? []
        return {
          id: item.id,
          asset: item.asset,
          auditStatus: item.auditStatus,
          auditStatusLabel: statusLabelKey ? t(statusLabelKey) : itemStatusLabelKey ? tFinding(itemStatusLabelKey) : item.auditStatus,
          auditResult,
          auditResultLabel: item.auditResult ? (resultLabelKey ? t(resultLabelKey) : item.auditResult) : null,
          auditResultTone: item.auditResult === "found" || item.auditResult === "confirmed_with_parent" ? ("success" as const) : item.auditResult === "not_found" ? ("danger" as const) : ("muted" as const),
          componentRelationshipLines: buildAuditRoundComponentRelationshipLines(item.asset, t),
          latestCorrection: correctionHistory[0] ?? null,
          editHref: buildAuditRoundScanEditHref({ locale, roundId: round.id, assetId: item.asset.id, returnTo: resultListReturnHref }),
        }
      })
  const allResultHref = buildAuditRoundResultListHref({ locale, roundId: round.id, result: "all", returnTo: returnToHref, pageSize: resultListState.pageSize })
  const foundResultHref = buildAuditRoundResultListHref({ locale, roundId: round.id, result: "found", returnTo: returnToHref, pageSize: resultListState.pageSize })
  const wrongLocationResultHref = buildAuditRoundResultListHref({ locale, roundId: round.id, result: "wrong_location", returnTo: returnToHref, pageSize: resultListState.pageSize })
  const wrongCustodianResultHref = buildAuditRoundResultListHref({ locale, roundId: round.id, result: "wrong_custodian", returnTo: returnToHref, pageSize: resultListState.pageSize })
  const wrongConditionResultHref = buildAuditRoundResultListHref({ locale, roundId: round.id, result: "wrong_condition", returnTo: returnToHref, pageSize: resultListState.pageSize })
  const notFoundResultHref = buildAuditRoundResultListHref({ locale, roundId: round.id, result: "not_found", returnTo: returnToHref, pageSize: resultListState.pageSize })
  const outOfScopeResultHref = buildAuditRoundResultListHref({ locale, roundId: round.id, result: "out_of_scope", returnTo: returnToHref, pageSize: resultListState.pageSize })
  const pendingReviewResultHref = buildAuditRoundResultListHref({ locale, roundId: round.id, result: "pending_review", returnTo: returnToHref, pageSize: resultListState.pageSize })
  const pendingReviewFindingsHref = `/${locale}/audit/findings?status=pending&roundId=${round.id}`
  const openActionFindingsHref = `/${locale}/audit/findings?status=action_open&roundId=${round.id}`
  const closeChecklist = [
    { label: t("closePendingItems"), value: pendingCount, ok: pendingCount === 0, href: pendingHref, actionLabel: t("checklistDrilldown") },
    { label: t("closePendingFindings"), value: pendingReviewCount, ok: pendingReviewCount === 0, href: pendingReviewFindingsHref, actionLabel: t("checklistDrilldown") },
    { label: t("closeOpenActions"), value: openActionCount, ok: openActionCount === 0, href: openActionFindingsHref, actionLabel: t("checklistDrilldown") },
    { label: t("closeSeparateApprover"), value: isRoundCreator ? 1 : 0, ok: !isRoundCreator },
  ]
  const canCloseRound = !isRoundReadOnly && closeChecklist.every((item) => item.ok)
  const cancelImpact = {
    pendingItems: pendingCount,
    processedItems: processedCount,
    pendingFindings: pendingReviewCount,
    approvedFindings: approvedFindingCount,
    openActions: openActionCount,
    scanHistoryRows: scanHistoryCount,
  }
  const auditRoundExportHref = buildAuditRoundExportHref({ roundId: round.id, endpoint: "export", state: resultListState })
  const auditRoundExportPdfHref = buildAuditRoundExportHref({ roundId: round.id, endpoint: "export-pdf", state: resultListState })
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
  const findingReviewTypeByResult: Partial<Record<AuditRoundResultFilter, string>> = {
    wrong_location: "wrong_location",
    wrong_custodian: "wrong_custodian",
    wrong_condition: "wrong_condition",
  }
  const resultFindingReviewType = findingReviewTypeByResult[resultListState.result]
  const resultFindingReviewHref =
    resultListState.result === "pending_review"
      ? pendingReviewFindingsHref
      : resultFindingReviewType
        ? `/${locale}/audit/findings?status=pending&roundId=${round.id}&findingType=${resultFindingReviewType}`
        : null
  const resultSummaryGroups = buildAuditRoundResultSummaryGroups([
    { result: "found", count: foundCount },
    { result: "wrong_location", count: wrongLocationCount },
    { result: "wrong_custodian", count: wrongCustodianCount },
    { result: "wrong_condition", count: wrongConditionCount },
    { result: "not_found", count: notFoundCount },
    { result: "out_of_scope", count: outOfScopeCount },
    { result: "pending_review", count: pendingReviewCount },
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
            <StatusBadge label={getAuditRoundStatusLabel(round.status, t)} status={round.status} />
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
                  <a href={`/api/audit-rounds/${round.id}/variance-export`} download className={buttonVariants({ variant: "outline", size: "md" })}>
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
          { key: "totalExpected", label: t("totalExpected"), value: formatCount(round._count.items) },
          { key: "pending", label: t("pending"), value: formatCount(pendingCount) },
          { key: "scanned", label: t("scanned"), value: formatCount(scannedCount) },
          { key: "progress", label: t("progress"), value: `${formatCount(progress)}%` },
        ]}
      />

      <ContentPanel className="mb-6">
        <AuditProgressBar
          total={round._count.items}
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
            { key: "evidenceAttached", label: t("evidenceAttached"), value: formatCount(evidenceSummary.withEvidence) },
            { key: "evidenceMissing", label: t("evidenceMissing"), value: formatCount(evidenceSummary.missingEvidence) },
            { key: "checklistComplete", label: t("checklistComplete"), value: formatCount(evidenceSummary.checklistComplete) },
            { key: "checklistIncomplete", label: t("checklistIncomplete"), value: formatCount(evidenceSummary.checklistIncomplete) },
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
            {resultListState.result !== "all" || resultListState.search ? (
              <Link href={allResultHref} className={buttonVariants({ variant: "outline", size: "md" })}>
                {t("viewAll")}
              </Link>
            ) : null}
          </div>
        </div>

        <MasterDataSearch
          action={`/${locale}/audit/rounds/${round.id}`}
          defaultValue={resultListState.search}
          placeholder={tCommon("search")}
          submitLabel={tCommon("search")}
          hiddenInputs={{ result: resultListState.result, page: 1, pageSize: resultListState.pageSize, returnTo: returnToHref }}
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
                  {!isRoundReadOnly ? (
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
                      {!isRoundReadOnly ? (
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
                previousHref={buildAuditRoundResultListHref({ locale, roundId: round.id, result: resultListState.result, returnTo: returnToHref, search: resultListState.search, page: resultListState.page - 1, pageSize: resultListState.pageSize })}
                nextHref={buildAuditRoundResultListHref({ locale, roundId: round.id, result: resultListState.result, returnTo: returnToHref, search: resultListState.search, page: resultListState.page + 1, pageSize: resultListState.pageSize })}
                pageSize={resultListState.pageSize}
                pageSizes={auditRoundResultPageSizeOptions.map((value) => ({ value, href: buildAuditRoundResultListHref({ locale, roundId: round.id, result: resultListState.result, returnTo: returnToHref, search: resultListState.search, page: 1, pageSize: value }) }))}
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
  if (status === "draft") return t("statusDraft")
  if (status === "open") return t("statusOpen")
  if (status === "closed") return t("statusClosed")
  if (status === "cancelled") return t("statusCancelled")
  return status
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

function buildAuditRoundExportHref({
  roundId,
  endpoint,
  state,
}: {
  roundId: string
  endpoint: "export" | "export-pdf"
  state: Pick<AuditRoundResultListState, "result" | "search">
}) {
  const params = new URLSearchParams()
  if (state.result !== "all") params.set("result", state.result)
  if (state.search.trim()) params.set("search", state.search.trim())
  const query = params.toString()
  return `/api/audit-rounds/${roundId}/${endpoint}${query ? `?${query}` : ""}`
}

async function getEvidenceSummary({
  auditStartDate,
  items,
}: {
  auditStartDate: Date
  items: Array<{ assetId: string; asset: { categoryId: string } }>
}) {
  const assetIds = Array.from(new Set(items.map((item) => item.assetId)))
  const categoryIds = Array.from(new Set(items.map((item) => item.asset.categoryId).filter(Boolean)))
  const [attachments, checklistSettings] = await Promise.all([
    assetIds.length
      ? prisma.attachment.findMany({
          where: {
            assetId: { in: assetIds },
            module: "asset",
            isActive: true,
            uploadedAt: { gte: auditStartDate },
          },
          select: { assetId: true, originalName: true },
        })
      : Promise.resolve([]),
    categoryIds.length
      ? prisma.systemSetting.findMany({
          where: { key: { in: categoryIds.map(categoryPhotoChecklistKey) } },
          select: { key: true, value: true },
        })
      : Promise.resolve([]),
  ])

  const attachmentsByAssetId = new Map<string, string[]>()
  for (const attachment of attachments) {
    if (!attachment.assetId) continue
    const current = attachmentsByAssetId.get(attachment.assetId) ?? []
    current.push(attachment.originalName)
    attachmentsByAssetId.set(attachment.assetId, current)
  }

  const checklistByCategoryId = new Map(
    checklistSettings.map((setting) => [setting.key.replace("asset_category_photo_checklist:", ""), parsePhotoChecklist(setting.value)])
  )

  let withEvidence = 0
  let checklistComplete = 0
  let checklistIncomplete = 0
  for (const item of items) {
    const attachmentNames = attachmentsByAssetId.get(item.assetId) ?? []
    if (attachmentNames.length > 0) withEvidence += 1

    const checklist = checklistByCategoryId.get(item.asset.categoryId) ?? []
    if (checklist.length === 0) continue

    const complete = checklist.every((label) => attachmentNames.some((name) => name.startsWith(`${label} - `)))
    if (complete) {
      checklistComplete += 1
    } else {
      checklistIncomplete += 1
    }
  }

  return {
    withEvidence,
    missingEvidence: Math.max(items.length - withEvidence, 0),
    checklistComplete,
    checklistIncomplete,
  }
}
