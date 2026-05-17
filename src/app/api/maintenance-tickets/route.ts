import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { requireAuth, requirePermission } from "@/lib/auth-utils"
import { logAudit } from "@/lib/audit-log"
import { errorResponse } from "@/lib/api-response"
import { maintenanceTicketSchema } from "@/lib/validations/maintenance"

const ticketInclude = {
  asset: { select: { assetTag: true, name: true } },
  reportedBy: { select: { code: true, fullNameTh: true } },
  assignedTo: { select: { code: true, fullNameTh: true } },
  inspectedBy: { select: { code: true, fullNameTh: true } },
  vendor: { select: { code: true, name: true } },
} as const

export async function GET() {
  try {
    const user = await requireAuth()
    requirePermission(user, "maintenance", "view")

    const tickets = await prisma.maintenanceTicket.findMany({
      where: { isActive: true },
      include: ticketInclude,
      orderBy: { createdAt: "desc" },
      take: 100,
    })

    return NextResponse.json({ data: tickets })
  } catch (error) {
    return errorResponse(error)
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth()
    requirePermission(user, "maintenance", "create")

    const input = maintenanceTicketSchema.parse(await request.json())
    const asset = await prisma.asset.findFirst({
      where: { id: input.assetId, isActive: true },
      select: { id: true, statusId: true },
    })
    if (!asset) return NextResponse.json({ error: "Asset not found" }, { status: 404 })

    const pendingRepairStatus = await prisma.assetStatus.findFirst({
      where: { OR: [{ name: "Pending Repair" }, { nameTh: "รอซ่อม" }] },
      select: { id: true },
    })
    const repairNo = await generateRepairNo()

    const ticket = await prisma.$transaction(async (tx) => {
      const record = await tx.maintenanceTicket.create({
        data: {
          repairNo,
          assetId: input.assetId,
          problem: input.problem,
          reportedById: input.reportedById,
          reportedDate: input.reportedDate,
          assignedToId: input.assignedToId,
          dueDate: input.dueDate,
          repairType: input.repairType,
          vendorId: input.vendorId,
          repairStatus: "reported",
          laborCost: input.laborCost,
          partsCost: input.partsCost,
          repairCost: input.repairCost,
          quotationNo: input.quotationNo,
          invoiceNo: input.invoiceNo,
          warrantyClaim: input.warrantyClaim,
          rootCause: input.rootCause,
          resolution: input.resolution,
          returnDate: input.returnDate,
          createdBy: user.id,
          updatedBy: user.id,
        },
        include: ticketInclude,
      })

      if (pendingRepairStatus && pendingRepairStatus.id !== asset.statusId) {
        await tx.asset.update({
          where: { id: asset.id },
          data: { statusId: pendingRepairStatus.id, updatedBy: user.id },
        })
      }

      await tx.assetMovement.create({
        data: {
          assetId: asset.id,
          movementType: "maintenance_create",
          fromValue: asset.statusId,
          toValue: pendingRepairStatus?.id ?? asset.statusId,
          reason: input.problem,
          referenceType: "maintenance",
          referenceId: record.id,
          performedBy: user.id,
          remark: input.repairType,
        },
      })

      return record
    })

    await logAudit({
      userId: user.id,
      action: "create",
      module: "maintenance",
      recordId: ticket.id,
      newValue: { ...input, repairNo },
    })

    return NextResponse.json(ticket, { status: 201 })
  } catch (error) {
    return errorResponse(error, 400)
  }
}

async function generateRepairNo() {
  const now = new Date()
  const datePart = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, "0")}${String(now.getDate()).padStart(2, "0")}`
  const start = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const end = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1)
  const count = await prisma.maintenanceTicket.count({
    where: {
      createdAt: {
        gte: start,
        lt: end,
      },
    },
  })

  return `MT-${datePart}-${String(count + 1).padStart(4, "0")}`
}
