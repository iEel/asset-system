import { NextRequest } from "next/server"
import { prisma } from "@/lib/db"
import { requireAuth, requirePermission } from "@/lib/auth-utils"
import { errorResponse } from "@/lib/api-response"
import { createWorkbook, styleWorksheetHeader, toExcelDate, workbookResponse } from "@/lib/asset-excel"
import { buildDisposalWhere, parseDisposalListParams } from "@/lib/disposal-query"

const disposalExportColumns = [
  { header: "Request No.", key: "disposalNo", width: 20 },
  { header: "Asset Tag", key: "assetTag", width: 22 },
  { header: "Asset Name", key: "assetName", width: 32 },
  { header: "Disposal Type", key: "disposalType", width: 18 },
  { header: "Reason", key: "reason", width: 40 },
  { header: "Requested By", key: "requestedBy", width: 28 },
  { header: "Approver", key: "approver", width: 28 },
  { header: "Status", key: "status", width: 18 },
  { header: "Request Date", key: "requestDate", width: 18 },
  { header: "Reviewed At", key: "approvedAt", width: 18 },
  { header: "Sale Value", key: "saleValue", width: 16 },
  { header: "Salvage Value", key: "salvageValue", width: 16 },
  { header: "Review Remark", key: "approvalRemark", width: 40 },
]

export async function GET(request: NextRequest) {
  try {
    const user = await requireAuth()
    requirePermission(user, "disposal", "export")

    const filters = parseDisposalListParams(request.nextUrl.searchParams)
    const requests = await prisma.disposalRequest.findMany({
      where: buildDisposalWhere(filters),
      include: {
        asset: { select: { assetTag: true, name: true } },
        requestedBy: { select: { code: true, fullNameTh: true } },
        approver: { select: { code: true, fullNameTh: true } },
      },
      orderBy: { createdAt: "desc" },
      take: 5000,
    })

    const workbook = createWorkbook()
    const worksheet = workbook.addWorksheet("Disposal Requests")
    worksheet.columns = disposalExportColumns
    worksheet.addRows(
      requests.map((item) => ({
        disposalNo: item.disposalNo,
        assetTag: item.asset.assetTag,
        assetName: item.asset.name,
        disposalType: item.disposalType,
        reason: item.reason,
        requestedBy: `${item.requestedBy.code} - ${item.requestedBy.fullNameTh}`,
        approver: item.approver ? `${item.approver.code} - ${item.approver.fullNameTh}` : "",
        status: item.requestStatus,
        requestDate: toExcelDate(item.requestDate),
        approvedAt: toExcelDate(item.approvedAt),
        saleValue: item.saleValue == null ? "" : Number(item.saleValue),
        salvageValue: item.salvageValue == null ? "" : Number(item.salvageValue),
        approvalRemark: item.approvalRemark ?? "",
      }))
    )
    styleWorksheetHeader(worksheet)
    worksheet.getColumn("saleValue").numFmt = "#,##0.00"
    worksheet.getColumn("salvageValue").numFmt = "#,##0.00"

    const buffer = await workbook.xlsx.writeBuffer()
    return workbookResponse(buffer, `disposal-requests-${new Date().toISOString().slice(0, 10)}.xlsx`)
  } catch (error) {
    return errorResponse(error)
  }
}
