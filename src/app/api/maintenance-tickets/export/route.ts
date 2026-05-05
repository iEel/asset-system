import { NextRequest } from "next/server"
import { prisma } from "@/lib/db"
import { requireAuth, requirePermission } from "@/lib/auth-utils"
import { errorResponse } from "@/lib/api-response"
import { createWorkbook, styleWorksheetHeader, toExcelDate, workbookResponse } from "@/lib/asset-excel"
import { buildMaintenanceWhere, parseMaintenanceListParams } from "@/lib/maintenance-query"

const maintenanceExportColumns = [
  { header: "Repair No.", key: "repairNo", width: 20 },
  { header: "Asset Tag", key: "assetTag", width: 22 },
  { header: "Asset Name", key: "assetName", width: 32 },
  { header: "Problem", key: "problem", width: 40 },
  { header: "Reported By", key: "reportedBy", width: 28 },
  { header: "Assigned To", key: "assignedTo", width: 28 },
  { header: "Repair Type", key: "repairType", width: 18 },
  { header: "Vendor", key: "vendor", width: 28 },
  { header: "Status", key: "status", width: 16 },
  { header: "Reported Date", key: "reportedDate", width: 18 },
  { header: "Return Date", key: "returnDate", width: 18 },
  { header: "Repair Cost", key: "repairCost", width: 16 },
  { header: "Warranty Claim", key: "warrantyClaim", width: 16 },
  { header: "Attachment Count", key: "attachmentCount", width: 18 },
  { header: "Root Cause", key: "rootCause", width: 36 },
  { header: "Resolution", key: "resolution", width: 36 },
]

export async function GET(request: NextRequest) {
  try {
    const user = await requireAuth()
    requirePermission(user, "maintenance", "export")

    const filters = parseMaintenanceListParams(request.nextUrl.searchParams)
    const evidenceTicketIds = await getMaintenanceAttachmentTicketIds()
    const tickets = await prisma.maintenanceTicket.findMany({
      where: buildMaintenanceWhere(filters, evidenceTicketIds),
      include: {
        asset: { select: { assetTag: true, name: true } },
        reportedBy: { select: { code: true, fullNameTh: true } },
        assignedTo: { select: { code: true, fullNameTh: true } },
        vendor: { select: { code: true, name: true } },
      },
      orderBy: { createdAt: "desc" },
      take: 5000,
    })
    const attachmentCounts = await getMaintenanceAttachmentCounts(tickets.map((ticket) => ticket.id))

    const workbook = createWorkbook()
    const worksheet = workbook.addWorksheet("Maintenance Tickets")
    worksheet.columns = maintenanceExportColumns
    worksheet.addRows(
      tickets.map((ticket) => ({
        repairNo: ticket.repairNo,
        assetTag: ticket.asset.assetTag,
        assetName: ticket.asset.name,
        problem: ticket.problem,
        reportedBy: `${ticket.reportedBy.code} - ${ticket.reportedBy.fullNameTh}`,
        assignedTo: ticket.assignedTo ? `${ticket.assignedTo.code} - ${ticket.assignedTo.fullNameTh}` : "",
        repairType: ticket.repairType,
        vendor: ticket.vendor ? `${ticket.vendor.code} - ${ticket.vendor.name}` : "",
        status: ticket.repairStatus,
        reportedDate: toExcelDate(ticket.reportedDate),
        returnDate: toExcelDate(ticket.returnDate),
        repairCost: ticket.repairCost == null ? "" : Number(ticket.repairCost),
        warrantyClaim: ticket.warrantyClaim ? "Yes" : "No",
        attachmentCount: attachmentCounts.get(ticket.id) ?? 0,
        rootCause: ticket.rootCause ?? "",
        resolution: ticket.resolution ?? "",
      }))
    )
    styleWorksheetHeader(worksheet)
    worksheet.getColumn("repairCost").numFmt = "#,##0.00"

    const buffer = await workbook.xlsx.writeBuffer()
    return workbookResponse(buffer, `maintenance-tickets-${new Date().toISOString().slice(0, 10)}.xlsx`)
  } catch (error) {
    return errorResponse(error)
  }
}

async function getMaintenanceAttachmentTicketIds() {
  const rows = await prisma.attachment.findMany({
    where: { module: "maintenance", isActive: true },
    select: { referenceId: true },
    distinct: ["referenceId"],
  })
  return rows.map((row) => row.referenceId)
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
