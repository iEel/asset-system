import { NextRequest } from "next/server"
import { prisma } from "@/lib/db"
import { requireAuth, requirePermission } from "@/lib/auth-utils"
import { errorResponse } from "@/lib/api-response"
import { buildFindingValueLabels, formatFindingValue } from "@/lib/audit-finding-labels"
import { pdfResponse, renderAuditFindingPdf } from "@/lib/audit-pdf"
import { formatDateTime } from "@/lib/utils"

export const runtime = "nodejs"

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

    const buffer = await renderAuditFindingPdf({
      title: `Audit Findings - ${status}`,
      subtitle: search ? `Filtered by "${search}"` : "All matching findings",
      summary: [
        { label: "Total Findings", value: findings.length },
        { label: "Pending", value: findings.filter((finding) => finding.reviewStatus === "pending").length },
        { label: "Approved", value: findings.filter((finding) => finding.reviewStatus === "approved").length },
        { label: "Rejected/Exception", value: findings.filter((finding) => finding.reviewStatus === "rejected" || finding.reviewStatus === "exception").length },
      ],
      rows: findings.map((finding) => ({
        reportedAt: formatDateTime(finding.reportedAt),
        auditNo: finding.auditRound.auditNo,
        assetTag: finding.asset?.assetTag ?? "",
        findingType: finding.findingType,
        expectedValue: formatFindingValue(finding.findingType, finding.expectedValue, valueLabels),
        actualValue: formatFindingValue(finding.findingType, finding.actualValue, valueLabels),
        reviewStatus: finding.reviewStatus,
        actionTaken: finding.actionTaken ?? "",
      })),
    })

    return pdfResponse(buffer, `audit-findings-${status}-${new Date().toISOString().slice(0, 10)}.pdf`)
  } catch (error) {
    return errorResponse(error)
  }
}
