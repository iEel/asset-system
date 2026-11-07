import { NextRequest } from "next/server"
import { prisma } from "@/lib/db"
import { requireAuth, requirePermission } from "@/lib/auth-utils"
import { errorResponse } from "@/lib/api-response"
import { logReportExport, reportExportKeyFor } from "@/lib/report-export-log"
import { getTranslations } from "next-intl/server"
import { createWorkbook, styleWorksheetHeader, toExcelDate, workbookResponse } from "@/lib/asset-excel"
import { buildDisposalExportColumns } from "@/lib/disposal-export"
import { buildDisposalWhere, parseDisposalListParams } from "@/lib/disposal-query"
import { readDisposalSourceLinks, type DisposalSourceLink } from "@/lib/disposal-source"

// Thai words for the type and status (group 6 spec §12); an unknown key keeps its code.
function word(t: (key: string) => string, key: string, fallback: string) {
  const value = t(key)
  return value === key || value.endsWith(`.${key}`) ? fallback : value
}

export async function GET(request: NextRequest) {
  try {
    const user = await requireAuth()
    requirePermission(user, "disposal", "export")
    const locale = request.nextUrl.searchParams.get("locale") === "en" ? "en" : "th"
    const t = await getTranslations({ locale, namespace: "disposalPage" })
    const tWord = (key: string) => t(key as never) as string

    const filters = parseDisposalListParams(request.nextUrl.searchParams)
    const requests = await prisma.disposalRequest.findMany({
      where: buildDisposalWhere(filters),
      omit: { batchId: true },
      include: {
        asset: { select: { assetTag: true, name: true } },
        requestedBy: { select: { code: true, fullNameTh: true } },
        approver: { select: { code: true, fullNameTh: true } },
        executedBy: { select: { code: true, fullNameTh: true } },
        round: { select: { roundNo: true } },
      },
      orderBy: { createdAt: "desc" },
      take: 5000,
    })

    const sources = await readDisposalSourceLinks(prisma, locale, requests)
    const sourceText = (link: DisposalSourceLink | null | undefined) => {
      if (!link) return ""
      if (link.kind === "other") return link.text
      return t(link.kind === "maintenance" ? "sourceMaintenance" : "sourceAuditFinding", { number: link.number })
    }

    const workbook = createWorkbook()
    const worksheet = workbook.addWorksheet(t("export.sheetName"))
    worksheet.columns = buildDisposalExportColumns((key) => tWord(`export.${key}`))
    worksheet.addRows(
      requests.map((item) => ({
        disposalNo: item.disposalNo,
        roundNo: item.round?.roundNo ?? "",
        assetTag: item.asset.assetTag,
        assetName: item.asset.name,
        disposalType: word(tWord, `types.${item.disposalType}`, item.disposalType),
        reason: item.reason,
        source: sourceText(sources.get(item.id)),
        requestedBy: `${item.requestedBy.code} - ${item.requestedBy.fullNameTh}`,
        approver: item.approver ? `${item.approver.code} - ${item.approver.fullNameTh}` : "",
        status: word(tWord, `statuses.${item.requestStatus}`, item.requestStatus),
        requestDate: toExcelDate(item.requestDate),
        approvedAt: toExcelDate(item.approvedAt),
        executionDate: toExcelDate(item.executionDate),
        executedBy: item.executedBy ? `${item.executedBy.code} - ${item.executedBy.fullNameTh}` : "",
        recipientName: item.recipientName ?? "",
        documentNo: item.documentNo ?? "",
        saleValue: item.saleValue == null ? "" : Number(item.saleValue),
        salvageValue: item.salvageValue == null ? "" : Number(item.salvageValue),
        actualSaleValue: item.actualSaleValue == null ? "" : Number(item.actualSaleValue),
        actualSalvageValue: item.actualSalvageValue == null ? "" : Number(item.actualSalvageValue),
        completedAt: toExcelDate(item.completedAt),
        approvalRemark: item.approvalRemark ?? "",
        executionRemark: item.executionRemark ?? "",
      }))
    )
    styleWorksheetHeader(worksheet)
    worksheet.getColumn("saleValue").numFmt = "#,##0.00"
    worksheet.getColumn("salvageValue").numFmt = "#,##0.00"
    worksheet.getColumn("actualSaleValue").numFmt = "#,##0.00"
    worksheet.getColumn("actualSalvageValue").numFmt = "#,##0.00"

    const buffer = await workbook.xlsx.writeBuffer()
    await logReportExport(user.id, reportExportKeyFor("disposal", request.nextUrl.searchParams))
    return workbookResponse(buffer, `disposal-requests-${new Date().toISOString().slice(0, 10)}.xlsx`)
  } catch (error) {
    return errorResponse(error)
  }
}
