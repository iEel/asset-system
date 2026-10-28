import { NextRequest } from "next/server"
import { getTranslations } from "next-intl/server"
import { prisma } from "@/lib/db"
import { requireAuth, requirePermission } from "@/lib/auth-utils"
import { errorResponse } from "@/lib/api-response"
import { buildFindingValueLabels, formatFindingValue } from "@/lib/audit-finding-labels"
import { auditExportActionStatusKey, auditExportActionTaken, auditExportFindingTypeKey, auditExportReviewStatusKey, auditExportWord, buildAuditFindingExportFilterWords, resolveAuditExportLocale } from "@/lib/audit-export-labels"
import { auditFindingFilterLabelKeys, auditFindingsListOrderBy, buildAuditFindingWhere, isAuditFindingWaitingStatus, resolveAuditFindingStatus } from "@/lib/audit-finding-filters"
import { getAuditFindingTypeSearchLabels } from "@/lib/audit-finding-search-labels"
import { getWaitingWorkRules } from "@/lib/waiting-work"
import { DEFAULT_WAITING_WORK_RULES } from "@/lib/waiting-work-rules"
import { pdfResponse, renderAuditFindingPdf } from "@/lib/audit-pdf"
import { formatDateTime } from "@/lib/utils"

export const runtime = "nodejs"

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
      orderBy: auditFindingsListOrderBy,
      take: 5000,
    })
    const valueLabels = await buildFindingValueLabels(findings)
    const ownerIds = Array.from(new Set(findings.map((finding) => finding.actionOwnerId).filter(Boolean)))
    const owners = ownerIds.length
      ? await prisma.employee.findMany({
          where: { id: { in: ownerIds as string[] } },
          select: { id: true, code: true },
        })
      : []
    const ownerCodeById = new Map(owners.map((owner) => [owner.id, owner.code]))
    // The round's number for the filter line, as the page's round chip reads it.
    const filterRound = roundId ? await prisma.auditRound.findUnique({ where: { id: roundId }, select: { auditNo: true } }) : null

    const buffer = await renderAuditFindingPdf({
      // The tab in use and its chip in the page's words (Task 2, P4-R3), never the URL value.
      title: t("auditFinding.exportPdfTitle", { filter: auditFindingFilterLabelKeys(status).map((key) => t(key)).join(" · ") }),
      subtitle: t("auditRound.exportPdfFilter", { filter: buildAuditFindingExportFilterWords({ roundNo: filterRound?.auditNo ?? null, findingType: findingType ?? null, search: search ?? null }, t) }),
      summary: [
        { label: t("auditFinding.exportSummary_total"), value: findings.length },
        { label: t("auditFinding.exportSummary_pending"), value: findings.filter((finding) => finding.reviewStatus === "pending").length },
        { label: t("auditFinding.exportSummary_approved"), value: findings.filter((finding) => finding.reviewStatus === "approved").length },
        { label: t("auditFinding.exportSummary_rejectedOrException"), value: findings.filter((finding) => finding.reviewStatus === "rejected" || finding.reviewStatus === "exception").length },
      ],
      rows: findings.map((finding) => ({
        reportedAt: formatDateTime(finding.reportedAt),
        auditNo: finding.auditRound.auditNo,
        assetTag: finding.asset?.assetTag ?? "",
        findingType: auditExportWord(t, auditExportFindingTypeKey(finding.findingType), finding.findingType),
        expectedValue: formatFindingValue(finding.findingType, finding.expectedValue, valueLabels),
        actualValue: formatFindingValue(finding.findingType, finding.actualValue, valueLabels),
        reviewStatus: auditExportWord(t, auditExportReviewStatusKey(finding.reviewStatus), finding.reviewStatus),
        actionStatus: auditExportWord(t, auditExportActionStatusKey(finding.actionStatus), finding.actionStatus),
        actionOwner: finding.actionOwnerId ? (ownerCodeById.get(finding.actionOwnerId) ?? "") : "",
        actionTaken: auditExportActionTaken(t, finding.actionTaken),
      })),
    })

    return pdfResponse(buffer, `audit-findings-${status}-${new Date().toISOString().slice(0, 10)}.pdf`)
  } catch (error) {
    return errorResponse(error)
  }
}
