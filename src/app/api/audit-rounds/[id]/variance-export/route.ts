import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { requireAuth, requirePermission } from "@/lib/auth-utils"
import { errorResponse } from "@/lib/api-response"
import { createAuditWorkbook, finalizeAuditWorksheet, toExcelDate, workbookResponse } from "@/lib/audit-excel"
import { styleWorksheetHeader } from "@/lib/asset-excel"
import { buildFindingValueLabels, formatFindingValue } from "@/lib/audit-finding-labels"
import { isSuccessfulAuditResult } from "@/lib/audit-result-summary"

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

export async function GET(_request: NextRequest, context: AuditVarianceExportContext) {
  try {
    const user = await requireAuth()
    requirePermission(user, "audit", "export")

    const { id } = await context.params
    const round = await prisma.auditRound.findFirst({
      where: { id, isActive: true },
      select: { id: true, auditNo: true, name: true, status: true },
    })
    if (!round) return NextResponse.json({ error: "Audit round not found" }, { status: 404 })
    if (round.status === "cancelled") {
      return NextResponse.json({ error: "Audit round is cancelled" }, { status: 400 })
    }
    const [items, findings, outOfScopeCount] = await Promise.all([
      prisma.auditItem.findMany({
        where: { auditRoundId: id },
        select: { auditStatus: true, auditResult: true, reconcileStatus: true },
      }),
      prisma.auditFinding.findMany({
        where: { auditRoundId: id },
        include: {
          auditItem: { select: { auditStatus: true, reconcileStatus: true } },
          asset: { select: { assetTag: true, name: true } },
          actionOwner: { select: { code: true, fullNameTh: true } },
        },
        orderBy: [{ reviewStatus: "asc" }, { findingType: "asc" }, { reportedAt: "asc" }],
      }),
      prisma.auditScanHistory.count({ where: { auditRoundId: id, auditItemId: null } }),
    ])

    const workbook = createAuditWorkbook()
    const summarySheet = workbook.addWorksheet("Variance Summary")
    summarySheet.columns = [
      { header: "Metric", key: "metric", width: 34 },
      { header: "Count", key: "count", width: 14 },
    ]
    const pendingItems = items.filter((item) => item.auditStatus === "pending").length
    const matchedItems = items.filter((item) => isSuccessfulAuditResult(item.auditResult)).length
    const notFoundItems = items.filter((item) => item.auditResult === "not_found").length
    const pendingReview = findings.filter((finding) => finding.reviewStatus === "pending").length
    const openActions = findings.filter((finding) => ["planned", "in_progress"].includes(finding.actionStatus)).length
    summarySheet.addRows([
      { metric: "Total Expected Assets", count: items.length },
      { metric: "Matched Assets", count: matchedItems },
      { metric: "Pending Assets", count: pendingItems },
      { metric: "Not Found Assets", count: notFoundItems },
      { metric: "Wrong Location Findings", count: countFinding(findings, "wrong_location") },
      { metric: "Wrong Custodian Findings", count: countFinding(findings, "wrong_custodian") },
      { metric: "Wrong Department Findings", count: countFinding(findings, "wrong_department") },
      { metric: "Wrong Condition Findings", count: countFinding(findings, "wrong_condition") },
      { metric: "Out-of-scope Findings", count: countFinding(findings, "out_of_scope") },
      { metric: "Out-of-scope Scan Events", count: outOfScopeCount },
      { metric: "Pending Review Findings", count: pendingReview },
      { metric: "Open Action Plans", count: openActions },
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
        findingType: finding.findingType,
        expectedValue: formatFindingValue(finding.findingType, finding.expectedValue, valueLabels),
        actualValue: formatFindingValue(finding.findingType, finding.actualValue, valueLabels),
        reviewStatus: finding.reviewStatus,
        reconcileStatus: finding.auditItem.reconcileStatus ?? "",
        actionStatus: finding.actionStatus,
        actionOwner: finding.actionOwner ? `${finding.actionOwner.code} - ${finding.actionOwner.fullNameTh}` : "",
        actionDueDate: toExcelDate(finding.actionDueDate),
        actionPlan: finding.actionPlan ?? "",
        remark: finding.remark ?? "",
      }))
    )
    finalizeAuditWorksheet(varianceSheet)

    const buffer = await workbook.xlsx.writeBuffer()
    return workbookResponse(buffer, `audit-variance-${round.auditNo}-${new Date().toISOString().slice(0, 10)}.xlsx`)
  } catch (error) {
    return errorResponse(error)
  }
}

function countFinding(findings: Array<{ findingType: string }>, type: string) {
  return findings.filter((finding) => finding.findingType === type).length
}
