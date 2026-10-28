import { NextRequest, NextResponse } from "next/server"
import { getTranslations } from "next-intl/server"
import { prisma } from "@/lib/db"
import { requireAuth, requirePermission } from "@/lib/auth-utils"
import { errorResponse } from "@/lib/api-response"
import { createAuditWorkbook, finalizeAuditWorksheet, toExcelDate, workbookResponse } from "@/lib/audit-excel"
import { styleWorksheetHeader } from "@/lib/asset-excel"
import { buildFindingValueLabels, formatFindingValue } from "@/lib/audit-finding-labels"
import { isOpenAuditFindingActionStatus } from "@/lib/audit-finding-filters"
import { resolveAuditRoundExportFilters } from "@/lib/audit-round-list-lookups"
import { auditExportActionStatusKey, auditExportFindingTypeKey, auditExportReconcileStatusKey, auditExportReviewStatusKey, auditExportWord, resolveAuditExportLocale } from "@/lib/audit-export-labels"
import { buildAuditExportFilename, buildAuditRoundVarianceWhere, foldAuditRoundResultCounts } from "@/lib/audit-round-result-filters"

type AuditVarianceExportContext = {
  params: Promise<{ id: string }>
}

const varianceColumns = [
  { header: "Reported At", key: "reportedAt", width: 20 },
  { header: "Audit No.", key: "auditNo", width: 18 },
  { header: "Audit Name", key: "auditName", width: 32 },
  { header: "Asset Tag", key: "assetTag", width: 22 },
  { header: "Asset Name", key: "assetName", width: 32 },
  { header: "Finding Type", key: "findingType", width: 24 },
  { header: "Expected Value", key: "expectedValue", width: 40 },
  { header: "Actual Value", key: "actualValue", width: 40 },
  { header: "Review Status", key: "reviewStatus", width: 18 },
  { header: "Reconcile Status", key: "reconcileStatus", width: 20 },
  { header: "Action Status", key: "actionStatus", width: 18 },
  { header: "Action Owner", key: "actionOwner", width: 28 },
  { header: "Action Due Date", key: "actionDueDate", width: 18 },
  { header: "Action Plan", key: "actionPlan", width: 44 },
  { header: "Remark", key: "remark", width: 40 },
]

export async function GET(request: NextRequest, context: AuditVarianceExportContext) {
  try {
    const user = await requireAuth()
    requirePermission(user, "audit", "export")

    const { id } = await context.params
    const locale = resolveAuditExportLocale(request.nextUrl.searchParams.get("locale"))
    const [round, exportFilters, t] = await Promise.all([
      prisma.auditRound.findFirst({
        where: { id, isActive: true },
        select: { id: true, auditNo: true, name: true, status: true },
      }),
      resolveAuditRoundExportFilters(id, request.nextUrl.searchParams),
      getTranslations({ locale }),
    ])
    if (!round) return NextResponse.json({ error: "Audit round not found" }, { status: 404 })
    if (round.status === "cancelled") {
      return NextResponse.json({ error: "Audit round is cancelled" }, { status: 400 })
    }
    // The variance report follows the page's filters (spec §8, P2-R6): its totals are the round's own items, the
    // out-of-scope finds are counted apart from the items (not the scan history), and an action plan is open until it is
    // verified, as the close checklist counts it (planned, in_progress, done).
    const { filters, whereInput, company, branch, category } = exportFilters
    const scopeWhere = buildAuditRoundVarianceWhere(whereInput)
    const [itemGroups, findings] = await Promise.all([
      prisma.auditItem.groupBy({
        by: ["auditStatus", "auditResult"],
        where: scopeWhere,
        _count: { _all: true },
      }),
      prisma.auditFinding.findMany({
        where: { auditRoundId: id, auditItem: scopeWhere },
        include: {
          auditItem: { select: { auditStatus: true, reconcileStatus: true } },
          asset: { select: { assetTag: true, name: true } },
          actionOwner: { select: { code: true, fullNameTh: true } },
        },
        orderBy: [{ reviewStatus: "asc" }, { findingType: "asc" }, { reportedAt: "asc" }, { id: "asc" }],
      }),
    ])
    const counts = foldAuditRoundResultCounts(itemGroups.map((group) => ({ auditStatus: group.auditStatus, auditResult: group.auditResult, count: group._count._all })))

    const workbook = createAuditWorkbook()
    const summarySheet = workbook.addWorksheet("Variance Summary")
    summarySheet.columns = [
      { header: "Metric", key: "metric", width: 34 },
      { header: "Count", key: "count", width: 14 },
    ]
    const pendingReview = findings.filter((finding) => finding.reviewStatus === "pending").length
    summarySheet.addRows([
      { metric: t("auditRound.varianceMetric_totalExpected"), count: counts.all },
      { metric: t("auditRound.varianceMetric_matched"), count: counts.found },
      { metric: t("auditRound.varianceMetric_mismatched"), count: counts.mismatch },
      { metric: t("auditRound.varianceMetric_pending"), count: counts.pending },
      { metric: t("auditRound.varianceMetric_notFound"), count: counts.notFound },
      { metric: t("auditRound.varianceMetric_wrongLocation"), count: countFinding(findings, "wrong_location") },
      { metric: t("auditRound.varianceMetric_wrongCustodian"), count: countFinding(findings, "wrong_custodian") },
      { metric: t("auditRound.varianceMetric_wrongDepartment"), count: countFinding(findings, "wrong_department") },
      { metric: t("auditRound.varianceMetric_wrongCondition"), count: countFinding(findings, "wrong_condition") },
      { metric: t("auditRound.varianceMetric_outOfScopeFindings"), count: countFinding(findings, "out_of_scope") },
      { metric: t("auditRound.varianceMetric_outOfScopeAssets"), count: counts.outOfScope },
      { metric: t("auditRound.varianceMetric_pendingReview"), count: pendingReview },
      { metric: t("auditRound.varianceMetric_openActions"), count: findings.filter((finding) => isOpenAuditFindingActionStatus(finding.actionStatus)).length },
    ])
    styleWorksheetHeader(summarySheet)

    const valueLabels = await buildFindingValueLabels(findings)
    const varianceSheet = workbook.addWorksheet("Variance Details")
    varianceSheet.columns = varianceColumns
    varianceSheet.addRows(
      findings.map((finding) => ({
        reportedAt: toExcelDate(finding.reportedAt),
        auditNo: round.auditNo,
        auditName: round.name,
        assetTag: finding.asset?.assetTag ?? "",
        assetName: finding.asset?.name ?? "",
        findingType: auditExportWord(t, auditExportFindingTypeKey(finding.findingType), finding.findingType),
        expectedValue: formatFindingValue(finding.findingType, finding.expectedValue, valueLabels),
        actualValue: formatFindingValue(finding.findingType, finding.actualValue, valueLabels),
        reviewStatus: auditExportWord(t, auditExportReviewStatusKey(finding.reviewStatus), finding.reviewStatus),
        reconcileStatus: auditExportWord(t, auditExportReconcileStatusKey(finding.auditItem.reconcileStatus), finding.auditItem.reconcileStatus),
        actionStatus: auditExportWord(t, auditExportActionStatusKey(finding.actionStatus), finding.actionStatus),
        actionOwner: finding.actionOwner ? `${finding.actionOwner.code} - ${finding.actionOwner.fullNameTh}` : "",
        actionDueDate: toExcelDate(finding.actionDueDate),
        actionPlan: finding.actionPlan ?? "",
        remark: finding.remark ?? "",
      }))
    )
    finalizeAuditWorksheet(varianceSheet)

    const buffer = await workbook.xlsx.writeBuffer()
    return workbookResponse(
      buffer,
      buildAuditExportFilename({ prefix: "audit-variance", auditNo: round.auditNo, result: filters.result, search: filters.search, company, branch, category, field: filters.field, components: filters.components, extension: "xlsx" }),
    )
  } catch (error) {
    return errorResponse(error)
  }
}

function countFinding(findings: Array<{ findingType: string }>, type: string) {
  return findings.filter((finding) => finding.findingType === type).length
}
