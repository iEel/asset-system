import { NextRequest } from "next/server"
import { prisma } from "@/lib/db"
import { requireAuth, requirePermission } from "@/lib/auth-utils"
import { errorResponse } from "@/lib/api-response"
import { createWorkbook, styleWorksheetHeader, toExcelDate, workbookResponse } from "@/lib/asset-excel"
import { buildMaintenanceWhere, parseMaintenanceListParams } from "@/lib/maintenance-query"
import { toRepairRecordStatus } from "@/lib/repair-record-policy"

const statusText: Record<string, string> = { in_progress: "ยังซ่อมไม่เสร็จ", closed: "ซ่อมเสร็จแล้ว", cancelled: "ยกเลิก" }
const outcomeText: Record<string, string> = { usable: "ใช้งานได้", beyond_repair: "ซ่อมไม่ได้ เสนอจำหน่าย" }

const maintenanceExportColumns = [
  { header: "Record No.", key: "repairNo", width: 20 },
  { header: "Date", key: "reportedDate", width: 14 },
  { header: "Asset Tag", key: "assetTag", width: 22 },
  { header: "Asset Name", key: "assetName", width: 32 },
  { header: "Problem / Work Done", key: "problem", width: 48 },
  { header: "Status", key: "status", width: 18 },
  { header: "Result", key: "outcome", width: 22 },
  { header: "Vendor", key: "vendor", width: 28 },
  { header: "Cost", key: "repairCost", width: 14 },
  { header: "Invoice No.", key: "invoiceNo", width: 20 },
  { header: "Finished On", key: "returnDate", width: 14 },
  { header: "Recorded By", key: "reportedBy", width: 28 },
  { header: "PM Plan", key: "plan", width: 24 },
  { header: "Remark", key: "remark", width: 36 },
  { header: "Attachment Count", key: "attachmentCount", width: 18 },
]

export async function GET(request: NextRequest) {
  try {
    const user = await requireAuth()
    requirePermission(user, "maintenance", "export")

    const filters = parseMaintenanceListParams(request.nextUrl.searchParams)
    const tickets = await prisma.maintenanceTicket.findMany({
      where: buildMaintenanceWhere(filters),
      include: {
        asset: { select: { assetTag: true, name: true } },
        reportedBy: { select: { code: true, fullNameTh: true } },
        vendor: { select: { code: true, name: true } },
        maintenancePlan: { select: { planNo: true } },
      },
      orderBy: [{ reportedDate: "desc" }, { createdAt: "desc" }],
      take: 5000,
    })
    const attachmentCounts = await getMaintenanceAttachmentCounts(tickets.map((ticket) => ticket.id))

    const workbook = createWorkbook()
    const worksheet = workbook.addWorksheet("Repair Records")
    worksheet.columns = maintenanceExportColumns
    worksheet.addRows(
      tickets.map((ticket) => ({
        repairNo: ticket.repairNo,
        reportedDate: toExcelDate(ticket.reportedDate),
        assetTag: ticket.asset.assetTag,
        assetName: ticket.asset.name,
        problem: ticket.problem,
        status: statusText[toRepairRecordStatus(ticket.repairStatus)],
        outcome: ticket.outcome ? outcomeText[ticket.outcome] ?? ticket.outcome : "",
        vendor: ticket.vendor ? `${ticket.vendor.code} - ${ticket.vendor.name}` : "ช่างภายใน",
        repairCost: ticket.repairCost == null ? "" : Number(ticket.repairCost),
        invoiceNo: ticket.invoiceNo ?? "",
        returnDate: toExcelDate(ticket.returnDate),
        reportedBy: `${ticket.reportedBy.code} - ${ticket.reportedBy.fullNameTh}`,
        plan: ticket.maintenancePlan?.planNo ?? "",
        remark: ticket.resolution ?? "",
        attachmentCount: attachmentCounts.get(ticket.id) ?? 0,
      }))
    )
    styleWorksheetHeader(worksheet)
    worksheet.getColumn("repairCost").numFmt = "#,##0.00"

    const buffer = await workbook.xlsx.writeBuffer()
    return workbookResponse(buffer, `repair-records-${new Date().toISOString().slice(0, 10)}.xlsx`)
  } catch (error) {
    return errorResponse(error)
  }
}

async function getMaintenanceAttachmentCounts(ticketIds: string[]) {
  if (ticketIds.length === 0) return new Map<string, number>()
  const rows = await prisma.attachment.groupBy({
    by: ["referenceId"],
    where: { module: "maintenance", referenceId: { in: ticketIds }, isActive: true },
    _count: { _all: true },
  })
  return new Map(rows.map((row) => [row.referenceId, row._count._all]))
}
