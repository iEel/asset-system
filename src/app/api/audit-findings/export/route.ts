import { NextRequest } from "next/server"
import { prisma } from "@/lib/db"
import { requireAuth, requirePermission } from "@/lib/auth-utils"
import { errorResponse } from "@/lib/api-response"
import { auditFindingColumns, createAuditWorkbook, finalizeAuditWorksheet, workbookResponse } from "@/lib/audit-excel"
import { buildFindingValueLabels, formatFindingValue } from "@/lib/audit-finding-labels"

export async function GET(request: NextRequest) {
  try {
    const user = await requireAuth()
    requirePermission(user, "audit", "export")

    const search = request.nextUrl.searchParams.get("search")?.trim()
    const status = request.nextUrl.searchParams.get("status")?.trim() || "pending"
    const findings = await prisma.auditFinding.findMany({
      where: {
        ...(status === "all" ? {} : { reviewStatus: status }),
        ...(search
          ? {
              OR: [
                { findingType: { contains: search } },
                { auditRound: { auditNo: { contains: search } } },
                { auditRound: { name: { contains: search } } },
                { asset: { assetTag: { contains: search } } },
                { asset: { name: { contains: search } } },
              ],
            }
          : {}),
      },
      include: {
        auditRound: { select: { auditNo: true, name: true } },
        asset: { select: { assetTag: true, name: true } },
      },
      orderBy: { reportedAt: "desc" },
      take: 5000,
    })
    const valueLabels = await buildFindingValueLabels(findings)

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
        findingType: finding.findingType,
        expectedValue: formatFindingValue(finding.findingType, finding.expectedValue, valueLabels),
        actualValue: formatFindingValue(finding.findingType, finding.actualValue, valueLabels),
        reviewStatus: finding.reviewStatus,
        reviewedAt: finding.reviewedAt ?? "",
        actionTaken: finding.actionTaken ?? "",
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
