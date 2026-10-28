import { NextRequest } from "next/server"
import { getTranslations } from "next-intl/server"
import { prisma } from "@/lib/db"
import { requireAuth, requirePermission } from "@/lib/auth-utils"
import { errorResponse } from "@/lib/api-response"
import { auditFindingColumns, createAuditWorkbook, finalizeAuditWorksheet, workbookResponse } from "@/lib/audit-excel"
import { buildFindingValueLabels, formatFindingValue } from "@/lib/audit-finding-labels"
import { auditExportActionStatusKey, auditExportActionTaken, auditExportFindingTypeKey, auditExportReviewStatusKey, auditExportWord, resolveAuditExportLocale } from "@/lib/audit-export-labels"
import { buildAuditFindingWhere, isAuditFindingWaitingStatus, resolveAuditFindingStatus } from "@/lib/audit-finding-filters"
import { getAuditFindingTypeSearchLabels } from "@/lib/audit-finding-search-labels"
import { getWaitingWorkRules } from "@/lib/waiting-work"
import { DEFAULT_WAITING_WORK_RULES } from "@/lib/waiting-work-rules"

export async function GET(request: NextRequest) {
  try {
    const user = await requireAuth()
    requirePermission(user, "audit", "export")
    const locale = resolveAuditExportLocale(request.nextUrl.searchParams.get("locale"))
    const t = await getTranslations({ locale })

    const search = request.nextUrl.searchParams.get("search")?.trim()
    const roundId = request.nextUrl.searchParams.get("roundId")?.trim()
    const findingType = request.nextUrl.searchParams.get("findingType")?.trim()
    const status = resolveAuditFindingStatus(request.nextUrl.searchParams.get("status")?.trim())
    const rules = isAuditFindingWaitingStatus(status) ? await getWaitingWorkRules() : DEFAULT_WAITING_WORK_RULES
    // The search reads the type words as the page does (bug 19), so the file holds the rows the page shows.
    const typeSearchLabels = await getAuditFindingTypeSearchLabels()
    const findings = await prisma.auditFinding.findMany({
      where: buildAuditFindingWhere({ status, search, roundId, findingType, rules, typeSearchLabels }),
      include: {
        auditRound: { select: { auditNo: true, name: true } },
        asset: { select: { assetTag: true, name: true } },
      },
      orderBy: { reportedAt: "desc" },
      take: 5000,
    })
    const valueLabels = await buildFindingValueLabels(findings)
    const ownerIds = Array.from(new Set(findings.map((finding) => finding.actionOwnerId).filter(Boolean)))
    const owners = ownerIds.length
      ? await prisma.employee.findMany({
          where: { id: { in: ownerIds as string[] } },
          select: { id: true, code: true, fullNameTh: true },
        })
      : []
    const ownerLabelById = new Map(owners.map((owner) => [owner.id, `${owner.code} - ${owner.fullNameTh}`]))

    const workbook = createAuditWorkbook()
    const worksheet = workbook.addWorksheet("Audit Findings")
    worksheet.columns = auditFindingColumns
    worksheet.addRows(
      findings.map((finding) => ({
        reportedAt: finding.reportedAt,
        auditNo: finding.auditRound.auditNo,
        auditName: finding.auditRound.name,
        assetTag: finding.asset?.assetTag ?? "",
        assetName: finding.asset?.name ?? "",
        findingType: auditExportWord(t, auditExportFindingTypeKey(finding.findingType), finding.findingType),
        expectedValue: formatFindingValue(finding.findingType, finding.expectedValue, valueLabels),
        actualValue: formatFindingValue(finding.findingType, finding.actualValue, valueLabels),
        reviewStatus: auditExportWord(t, auditExportReviewStatusKey(finding.reviewStatus), finding.reviewStatus),
        actionStatus: auditExportWord(t, auditExportActionStatusKey(finding.actionStatus), finding.actionStatus),
        actionOwner: finding.actionOwnerId ? (ownerLabelById.get(finding.actionOwnerId) ?? "") : "",
        actionDueDate: finding.actionDueDate ?? "",
        actionPlan: finding.actionPlan ?? "",
        closedAt: finding.closedAt ?? "",
        reviewedAt: finding.reviewedAt ?? "",
        actionTaken: auditExportActionTaken(t, finding.actionTaken),
        remark: finding.remark ?? "",
        reviewRemark: finding.reviewRemark ?? "",
      }))
    )
    finalizeAuditWorksheet(worksheet)

    const buffer = await workbook.xlsx.writeBuffer()
    return workbookResponse(buffer, `audit-findings-${status}-${new Date().toISOString().slice(0, 10)}.xlsx`)
  } catch (error) {
    return errorResponse(error)
  }
}
