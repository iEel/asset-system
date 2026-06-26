import Link from "next/link"
import { notFound } from "next/navigation"
import { getTranslations } from "next-intl/server"
import { AlertTriangle, Download, FileText, ScanLine } from "lucide-react"
import { prisma } from "@/lib/db"
import { requirePagePermission } from "@/lib/page-auth"
import { ColumnHeader, MasterDataSearch } from "@/components/master-data/master-data-layout"
import { formatDate, formatDateTime } from "@/lib/utils"
import { ClickableTableRow } from "@/components/ui/clickable-table-row"
import { AuditProgressBar } from "@/components/audit/audit-progress-bar"
import { AuditRoundCancelButton } from "@/components/audit/audit-round-cancel-button"
import { AuditRoundCloseButton } from "@/components/audit/audit-round-close-button"
import { hasPermission } from "@/lib/auth-utils"
import { categoryPhotoChecklistKey, parsePhotoChecklist } from "@/lib/category-photo-checklist"
import { Breadcrumbs } from "@/components/ui/breadcrumbs"
import { MobileActionBar } from "@/components/ui/mobile-action-bar"
import { ActionEmptyState } from "@/components/ui/action-empty-state"
import { StatusBadge } from "@/components/ui/status-badge"
import { isSameAuditActor } from "@/lib/audit-segregation"
import { getDesktopTableOnlyClasses, getMobileCardListClasses } from "@/lib/design-system"
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
  const canExportRound = round.status !== "cancelled"
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
        const resultLabelKey = getAuditRoundItemResultLabelKey(item.auditResult)
        const auditResult = item.auditResult ?? "pending"
        const correctionHistory = correctionHistoryByItemId.get(item.id) ?? []
        return {
          id: item.id,
          asset: item.asset,
          auditStatus: item.auditStatus,
          auditStatusLabel: statusLabelKey ? t(statusLabelKey) : item.auditStatus,
          auditResult,
          auditResultLabel: item.auditResult ? (resultLabelKey ? t(resultLabelKey) : item.auditResult) : "-",
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

  return (
    <div className="pb-24 md:pb-0">
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="mb-2">
            <Breadcrumbs
              items={[
                { label: t("title"), href: returnToHref },
                { label: round.auditNo },
              ]}
            />
          </div>
          <h1 className="text-2xl font-bold text-foreground">{round.name}</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {round.auditNo} • {formatDate(round.startDate)} - {formatDate(round.endDate)}
          </p>
        </div>
        <div className="flex flex-col gap-2 sm:items-end">
          <StatusBadge label={getAuditRoundStatusLabel(round.status, t)} status={round.status} />
          <div className="flex min-w-0 flex-col gap-2 sm:flex-row sm:flex-wrap sm:justify-end">
            {canExportRound ? (
              <>
                <a
                  href={auditRoundExportHref}
                  className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-md border border-border bg-surface px-4 text-sm font-medium transition-colors hover:bg-accent sm:h-10 sm:min-h-0 sm:w-auto"
                >
                  <Download className="h-4 w-4" />
                  {t("exportResult")}
                </a>
                <a
                  href={auditRoundExportPdfHref}
                  className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-md border border-border bg-surface px-4 text-sm font-medium transition-colors hover:bg-accent sm:h-10 sm:min-h-0 sm:w-auto"
                >
                  <FileText className="h-4 w-4" />
                  {t("exportResultPdf")}
                </a>
                <a
                  href={`/api/audit-rounds/${round.id}/variance-export`}
                  className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-md border border-border bg-surface px-4 text-sm font-medium transition-colors hover:bg-accent sm:h-10 sm:min-h-0 sm:w-auto"
                >
                  <Download className="h-4 w-4" />
                  {t("exportVariance")}
                </a>
              </>
            ) : null}
            {!isRoundReadOnly ? (
              <>
                <Link
                  href={pendingHref}
                  className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-md border border-border bg-surface px-4 text-sm font-medium transition-colors hover:bg-accent sm:h-10 sm:min-h-0 sm:w-auto"
                >
                  <AlertTriangle className="h-4 w-4" />
                  {t("pendingAssets")}
                </Link>
                <Link
                  href={scanHref}
                  className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-md bg-primary px-4 text-sm font-medium text-white transition-colors hover:bg-primary/90 sm:h-10 sm:min-h-0 sm:w-auto"
                >
                  <ScanLine className="h-4 w-4" />
                  {t("scan")}
                </Link>
              </>
            ) : null}
          </div>
        </div>
      </div>
      {!isRoundReadOnly ? (
        <MobileActionBar
          actions={[
            { href: scanHref, label: t("scan"), icon: <ScanLine className="h-4 w-4" />, primary: true },
            { href: pendingHref, label: t("pendingAssets"), icon: <AlertTriangle className="h-4 w-4" /> },
            { href: pendingReviewFindingsHref, label: t("openFindingReview"), icon: <FileText className="h-4 w-4" /> },
            { href: returnToHref, label: tCommon("back"), icon: <Download className="h-4 w-4" /> },
          ]}
        />
      ) : null}

      {round.status === "cancelled" ? (
        <section className="mb-6 rounded-lg border border-danger/30 bg-danger/10 p-4 text-sm text-danger shadow-sm">
          <div className="flex items-start gap-3">
            <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0" />
            <div className="min-w-0">
              <h2 className="font-semibold text-foreground">{t("statusCancelled")}</h2>
              <p className="mt-1 text-danger">{t("cancelledReadOnlyNotice")}</p>
              <dl className="mt-3 grid gap-2 text-sm sm:grid-cols-2">
                <div>
                  <dt className="font-medium text-foreground">{t("cancelledAt")}</dt>
                  <dd className="mt-1 break-words text-danger">{formatDateTime(round.cancelledAt)}</dd>
                </div>
                <div>
                  <dt className="font-medium text-foreground">{t("cancelReason")}</dt>
                  <dd className="mt-1 break-words text-danger">{round.cancelReason || "-"}</dd>
                </div>
              </dl>
            </div>
          </div>
        </section>
      ) : null}

      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-4">
        <Metric label={t("totalExpected")} value={round._count.items} />
        <Metric label={t("pending")} value={pendingCount} />
        <Metric label={t("scanned")} value={scannedCount} />
        <Metric label={t("progress")} value={`${progress}%`} />
      </div>

      <div className="mb-6">
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
      </div>

      <section className="mb-6 rounded-lg border border-border bg-surface p-4 shadow-sm">
        <div className="mb-4">
          <h2 className="text-base font-semibold text-foreground">{t("resultDashboard")}</h2>
          <p className="mt-1 text-sm text-muted-foreground">{t("resultDashboardHelp")}</p>
        </div>
        <div className="grid gap-4 lg:grid-cols-[minmax(220px,0.65fr)_1fr]">
          <div>
            <h3 className="text-sm font-semibold text-foreground">{t("resultNormalGroup")}</h3>
            <div className="mt-2 grid gap-3 sm:grid-cols-2 lg:grid-cols-1">
              {resultNormalGroup.map((item) => (
                <DashboardCard
                  key={item.result}
                  label={item.label}
                  value={item.count}
                  tone={item.tone}
                  href={item.count > 0 ? item.href : undefined}
                  active={resultListState.result === item.result}
                  actionLabel={item.count > 0 ? item.actionLabel : undefined}
                  disabled={!item.actionable}
                />
              ))}
            </div>
          </div>
          <div>
            <h3 className="text-sm font-semibold text-foreground">{t("resultNeedsReviewGroup")}</h3>
            <div className="mt-2 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {resultNeedsReviewGroup.map((item) => (
                <DashboardCard
                  key={item.result}
                  label={item.label}
                  value={item.count}
                  tone={item.tone}
                  href={item.count > 0 ? item.href : undefined}
                  active={resultListState.result === item.result}
                  actionLabel={item.count > 0 ? item.actionLabel : undefined}
                  disabled={!item.actionable}
                />
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="mb-6 rounded-lg border border-border bg-surface p-4 shadow-sm">
        <div className="mb-4">
          <h2 className="text-base font-semibold text-foreground">{t("evidenceSummary")}</h2>
          <p className="mt-1 text-sm text-muted-foreground">{t("evidenceSummaryHelp")}</p>
        </div>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <DashboardCard label={t("evidenceAttached")} value={evidenceSummary.withEvidence} tone="success" />
          <DashboardCard label={t("evidenceMissing")} value={evidenceSummary.missingEvidence} tone="warning" />
          <DashboardCard label={t("checklistComplete")} value={evidenceSummary.checklistComplete} tone="info" />
          <DashboardCard label={t("checklistIncomplete")} value={evidenceSummary.checklistIncomplete} tone="danger" />
        </div>
      </section>

      {canApprove && !isRoundReadOnly ? (
        <div className="mb-6 grid gap-3 lg:grid-cols-[minmax(0,1fr)_auto]">
          <AuditRoundCloseButton
            roundId={round.id}
            disabled={!canCloseRound}
            checklist={closeChecklist}
          />
          <section className="rounded-lg border border-border bg-surface p-4 shadow-sm lg:min-w-72 lg:self-start">
            <h2 className="text-base font-semibold text-foreground">{t("cancelRound")}</h2>
            <p className="mt-1 text-sm text-muted-foreground">{t("cancelDialogHelp")}</p>
            <div className="mt-4">
              <AuditRoundCancelButton roundId={round.id} impact={cancelImpact} />
            </div>
          </section>
        </div>
      ) : null}

      <section id="audit-result-list" className="scroll-mt-24">
        <div className="mb-4 flex flex-col gap-3 rounded-lg border border-border bg-surface p-4 shadow-sm lg:flex-row lg:items-start lg:justify-between">
          <div>
            <h2 className="text-base font-semibold text-foreground">{resultListTitle}</h2>
            <p className="mt-1 text-sm text-muted-foreground">{resultListDescription}</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <StatusBadge label={resultFilterLabels[resultListState.result]} status={resultListState.result} size="sm" />
            <span className="rounded-md border border-border bg-background px-3 py-1 text-sm text-muted-foreground">
              {resultListTotal} {t("items")}
            </span>
            {resultFindingReviewHref && !isRoundReadOnly ? (
              <Link href={resultFindingReviewHref} className="inline-flex h-9 items-center justify-center gap-2 rounded-md border border-border bg-surface px-3 text-sm font-medium transition-colors hover:bg-accent">
                <FileText className="h-4 w-4" />
                {t("openFindingReview")}
              </Link>
            ) : null}
            {resultListState.result !== "all" || resultListState.search ? (
              <Link href={allResultHref} className="inline-flex h-9 items-center justify-center rounded-md border border-border bg-surface px-3 text-sm font-medium transition-colors hover:bg-accent">
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
        <div className="min-w-0 overflow-hidden rounded-lg border border-border bg-surface shadow-sm">
          <div className={`${getMobileCardListClasses()} p-3`}>
            {resultRows.length === 0 ? (
              <ActionEmptyState
                icon={<ScanLine className="h-6 w-6" />}
                title={emptyResultTitle}
                description={emptyResultDescription}
                actionHref={allResultHref}
                actionLabel={t("viewAll")}
              />
            ) : (
              resultRows.map((item) => (
                <article key={item.id} className="min-w-0 rounded-md border border-border bg-background p-3">
                  <Link href={`/${locale}/assets/${item.asset.id}`} className="break-words text-sm font-semibold text-foreground hover:text-primary">
                    {item.asset.assetTag}
                  </Link>
                  <p className="mt-1 line-clamp-2 text-sm text-foreground">{item.asset.name}</p>
                  {item.componentRelationshipLines.length > 0 ? (
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {item.componentRelationshipLines.map((line) => (
                        <span key={line} className="rounded-full bg-info/10 px-2 py-0.5 text-xs font-medium text-info">
                          {line}
                        </span>
                      ))}
                    </div>
                  ) : null}
                  {item.latestCorrection ? (
                    <div className="mt-2 rounded-md border border-info/30 bg-info/10 px-2 py-1 text-xs text-info">
                      <div>{t("correctionHistoryLatest", { date: formatDateTime(item.latestCorrection.createdAt), user: item.latestCorrection.userLabel })}</div>
                      {item.latestCorrection.changedFields.length > 0 ? (
                        <div>{t("correctionHistoryFields", { fields: formatAuditCorrectionFields(item.latestCorrection, t) })}</div>
                      ) : null}
                    </div>
                  ) : null}
                  <div className="mt-3 grid gap-2 text-sm">
                    <MobileAuditDetailField label={t("expectedLocation")} value={`${item.asset.currentLocation.code} - ${item.asset.currentLocation.name}`} />
                    <MobileAuditDetailField
                      label={t("expectedCustodian")}
                      value={item.asset.custodian ? `${item.asset.custodian.code} - ${item.asset.custodian.fullNameTh}` : "-"}
                    />
                  </div>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <StatusBadge label={item.auditStatusLabel} status={item.auditStatus} size="xs" />
                    <StatusBadge label={item.auditResultLabel} status={item.auditResult} tone={item.auditResultTone} size="xs" />
                  </div>
                  {!isRoundReadOnly ? (
                    <div className="mt-3 flex justify-end">
                      <Link href={item.editHref} className="inline-flex h-9 items-center rounded-md border border-border px-3 text-sm font-medium text-foreground transition-colors hover:bg-accent">
                        {t("editScanResult")}
                      </Link>
                    </div>
                  ) : null}
                </article>
              ))
            )}
          </div>
          <div className={`${getDesktopTableOnlyClasses()} overflow-x-auto`}>
            <table className="min-w-full divide-y divide-border text-sm">
              <thead className="bg-muted/40">
                <tr>
                  <ColumnHeader>{t("assetTag")}</ColumnHeader>
                  <ColumnHeader>{t("assetName")}</ColumnHeader>
                  <ColumnHeader>{t("expectedLocation")}</ColumnHeader>
                  <ColumnHeader>{t("expectedCustodian")}</ColumnHeader>
                  <ColumnHeader>{t("status")}</ColumnHeader>
                  <ColumnHeader>{t("result")}</ColumnHeader>
                  <ColumnHeader>{tCommon("actions")}</ColumnHeader>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {resultRows.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-6">
                      <ActionEmptyState
                        icon={<ScanLine className="h-6 w-6" />}
                        title={emptyResultTitle}
                        description={emptyResultDescription}
                        actionHref={allResultHref}
                        actionLabel={t("viewAll")}
                      />
                    </td>
                  </tr>
                ) : (
                  resultRows.map((item) => (
                    <ClickableTableRow
                      key={item.id}
                      href={`/${locale}/assets/${item.asset.id}`}
                      label={`${tCommon("view")}: ${item.asset.assetTag}`}
                    >
                      <td className="whitespace-nowrap px-4 py-3 font-medium text-foreground">{item.asset.assetTag}</td>
                      <td className="min-w-56 px-4 py-3 text-foreground">
                        <div>{item.asset.name}</div>
                        {item.componentRelationshipLines.length > 0 ? (
                          <div className="mt-1 flex flex-wrap gap-1.5">
                            {item.componentRelationshipLines.map((line) => (
                              <span key={line} className="rounded-full bg-info/10 px-2 py-0.5 text-xs font-medium text-info">
                                {line}
                              </span>
                            ))}
                          </div>
                        ) : null}
                        {item.latestCorrection ? (
                          <div className="mt-2 rounded-md border border-info/30 bg-info/10 px-2 py-1 text-xs text-info">
                            <div>{t("correctionHistoryLatest", { date: formatDateTime(item.latestCorrection.createdAt), user: item.latestCorrection.userLabel })}</div>
                            {item.latestCorrection.changedFields.length > 0 ? (
                              <div>{t("correctionHistoryFields", { fields: formatAuditCorrectionFields(item.latestCorrection, t) })}</div>
                            ) : null}
                          </div>
                        ) : null}
                      </td>
                      <td className="min-w-56 px-4 py-3 text-muted-foreground">
                        {item.asset.currentLocation.code} - {item.asset.currentLocation.name}
                      </td>
                      <td className="min-w-56 px-4 py-3 text-muted-foreground">
                        {item.asset.custodian ? `${item.asset.custodian.code} - ${item.asset.custodian.fullNameTh}` : "-"}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-muted-foreground">
                        <StatusBadge label={item.auditStatusLabel} status={item.auditStatus} size="xs" />
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-muted-foreground">
                        <StatusBadge label={item.auditResultLabel} status={item.auditResult} tone={item.auditResultTone} size="xs" />
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-right">
                        {!isRoundReadOnly ? (
                          <Link
                            href={item.editHref}
                            data-no-row-click
                            className="inline-flex h-9 items-center rounded-md border border-border px-3 text-sm font-medium text-foreground transition-colors hover:bg-accent"
                          >
                            {t("editScanResult")}
                          </Link>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </td>
                    </ClickableTableRow>
                  ))
                )}
              </tbody>
            </table>
          </div>
          <AuditRoundResultPagination
            locale={locale}
            roundId={round.id}
            state={resultListState}
            total={resultListTotal}
            returnTo={returnToHref}
            labels={{ rowsPerPage: tCommon("rowsPerPage"), page: tCommon("page"), of: tCommon("of"), previous: tCommon("previous"), next: tCommon("next") }}
          />
        </div>
      </section>
    </div>
  )
}

function Metric({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="rounded-lg border border-border bg-surface p-4 shadow-sm">
      <div className="text-sm text-muted-foreground">{label}</div>
      <div className="mt-2 text-2xl font-semibold text-foreground">{value}</div>
    </div>
  )
}

function MobileAuditDetailField({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0 rounded-md bg-muted/30 px-3 py-2">
      <div className="text-xs font-medium text-muted-foreground">{label}</div>
      <div className="mt-1 break-words text-sm text-foreground">{value}</div>
    </div>
  )
}

function DashboardCard({
  label,
  value,
  tone,
  href,
  active = false,
  actionLabel,
  disabled = false,
}: {
  label: string
  value: number
  tone: "success" | "warning" | "danger" | "info" | "muted"
  href?: string
  active?: boolean
  actionLabel?: string
  disabled?: boolean
}) {
  const toneClass =
    disabled
      ? "border-border bg-muted/40 text-muted-foreground"
      : tone === "success"
      ? "border-success/30 bg-success/10 text-success"
      : tone === "warning"
        ? "border-warning/30 bg-warning/10 text-warning"
        : tone === "danger"
          ? "border-danger/30 bg-danger/10 text-danger"
          : tone === "info"
            ? "border-info/30 bg-info/10 text-info"
            : "border-border bg-background text-muted-foreground"
  const activeClassName = active ? "ring-2 ring-primary ring-offset-2 ring-offset-background" : ""
  const content = (
    <>
      <div className="text-xs font-medium">{label}</div>
      <div className="mt-2 text-2xl font-bold">{value}</div>
      {actionLabel ? <div className="mt-2 text-xs font-semibold underline-offset-2">{actionLabel}</div> : null}
    </>
  )

  if (href) {
    return (
      <Link href={href} className={`block rounded-md border px-3 py-3 transition-colors hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 ${toneClass} ${activeClassName}`}>
        {content}
      </Link>
    )
  }

  return <div className={`rounded-md border px-3 py-3 ${toneClass}`}>{content}</div>
}

function AuditRoundResultPagination({
  locale,
  roundId,
  state,
  total,
  returnTo,
  labels,
}: {
  locale: string
  roundId: string
  state: AuditRoundResultListState
  total: number
  returnTo: string
  labels: { rowsPerPage: string; page: string; of: string; previous: string; next: string }
}) {
  const { start, end, totalPages } = paginationRange(state.page, state.pageSize, total)
  const previousPage = Math.max(1, state.page - 1)
  const nextPage = Math.min(totalPages, state.page + 1)

  return (
    <div className="flex flex-col gap-3 border-t border-border px-4 py-3 text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
      <div>
        {start}-{end} {labels.of} {total}
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <span>{labels.rowsPerPage}</span>
        {auditRoundResultPageSizeOptions.map((pageSize) => (
          <Link
            key={pageSize}
            href={buildAuditRoundResultListHref({ locale, roundId, result: state.result, returnTo, search: state.search, page: 1, pageSize })}
            className={`inline-flex h-8 min-w-8 items-center justify-center rounded-md border px-2 transition-colors ${
              state.pageSize === pageSize ? "border-primary bg-primary/10 text-primary" : "border-border bg-surface hover:bg-accent"
            }`}
          >
            {pageSize}
          </Link>
        ))}
        <span className="px-2">
          {labels.page} {Math.min(state.page, totalPages)} {labels.of} {totalPages}
        </span>
        <Link
          href={buildAuditRoundResultListHref({ locale, roundId, result: state.result, returnTo, search: state.search, page: previousPage, pageSize: state.pageSize })}
          aria-disabled={state.page <= 1}
          className={`inline-flex h-8 items-center rounded-md border border-border px-3 transition-colors ${state.page <= 1 ? "pointer-events-none opacity-50" : "hover:bg-accent"}`}
        >
          {labels.previous}
        </Link>
        <Link
          href={buildAuditRoundResultListHref({ locale, roundId, result: state.result, returnTo, search: state.search, page: nextPage, pageSize: state.pageSize })}
          aria-disabled={state.page >= totalPages}
          className={`inline-flex h-8 items-center rounded-md border border-border px-3 transition-colors ${state.page >= totalPages ? "pointer-events-none opacity-50" : "hover:bg-accent"}`}
        >
          {labels.next}
        </Link>
      </div>
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
