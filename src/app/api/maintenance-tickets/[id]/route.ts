import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { requireAuth, requirePermission } from "@/lib/auth-utils"
import { logAudit } from "@/lib/audit-log"
import { errorResponse } from "@/lib/api-response"
import { maintenanceTicketCloseSchema, maintenanceTicketStatusSchema } from "@/lib/validations/maintenance"
import { closeableMaintenanceStatuses } from "@/lib/maintenance-status"

type MaintenanceTicketContext = {
  params: Promise<{ id: string }>
}

export async function PATCH(request: NextRequest, context: MaintenanceTicketContext) {
  try {
    const user = await requireAuth()
    requirePermission(user, "maintenance", "edit")

    const { id } = await context.params
    const body = await request.json()
    const action = typeof body?.action === "string" ? body.action : "close"
    const ticket = await prisma.maintenanceTicket.findFirst({
      where: { id, isActive: true },
      include: { asset: { select: { id: true, statusId: true } } },
    })
    if (!ticket) return NextResponse.json({ error: "Maintenance ticket not found" }, { status: 404 })
    if (ticket.repairStatus === "closed") {
      return NextResponse.json({ error: "Maintenance ticket is already closed" }, { status: 400 })
    }

    if (action === "status") {
      const input = maintenanceTicketStatusSchema.parse(body)
      const updatedTicket = await prisma.maintenanceTicket.update({
        where: { id },
        data: {
          repairStatus: input.repairStatus,
          assignedToId: input.assignedToId,
          dueDate: input.dueDate,
          updatedBy: user.id,
        },
      })

      await prisma.assetMovement.create({
        data: {
          assetId: ticket.assetId,
          movementType: "maintenance_status_update",
          fromValue: ticket.repairStatus,
          toValue: input.repairStatus,
          reason: input.remark,
          referenceType: "maintenance",
          referenceId: ticket.id,
          performedBy: user.id,
        },
      })

      await logAudit({
        userId: user.id,
        action: "update_status",
        module: "maintenance",
        recordId: id,
        oldValue: { repairStatus: ticket.repairStatus, assignedToId: ticket.assignedToId, dueDate: ticket.dueDate },
        newValue: input,
      })

      return NextResponse.json(updatedTicket)
    }

    const input = maintenanceTicketCloseSchema.parse(body)
    if (!closeableMaintenanceStatuses.has(ticket.repairStatus)) {
      return NextResponse.json({ error: "Move this ticket to completed before closing" }, { status: 400 })
    }

    const attachmentCount = await prisma.attachment.count({
      where: { module: "maintenance", referenceId: ticket.id, isActive: true },
    })
    if (attachmentCount === 0) {
      return NextResponse.json({ error: "Please attach repair evidence before closing" }, { status: 400 })
    }

    const nextStatus = await prisma.assetStatus.findFirst({
      where: { id: input.nextStatusId, isActive: true },
      select: { id: true },
    })
    if (!nextStatus) return NextResponse.json({ error: "Next asset status not found" }, { status: 404 })

    const updatedTicket = await prisma.$transaction(async (tx) => {
      const record = await tx.maintenanceTicket.update({
        where: { id },
        data: {
          repairStatus: "closed",
          laborCost: input.laborCost,
          partsCost: input.partsCost,
          repairCost: input.repairCost,
          quotationNo: input.quotationNo,
          invoiceNo: input.invoiceNo,
          warrantyClaim: input.warrantyClaim,
          rootCause: input.rootCause,
          resolution: input.resolution,
          returnDate: input.returnDate,
          inspectedById: input.inspectedById,
          updatedBy: user.id,
        },
      })

      await tx.asset.update({
        where: { id: ticket.assetId },
        data: { statusId: input.nextStatusId, updatedBy: user.id },
      })

      await tx.assetMovement.create({
        data: {
          assetId: ticket.assetId,
          movementType: "maintenance_close",
          fromValue: ticket.asset.statusId,
          toValue: input.nextStatusId,
          reason: input.resolution,
          referenceType: "maintenance",
          referenceId: ticket.id,
          performedBy: user.id,
          remark: input.rootCause,
        },
      })

      return record
    })

    await logAudit({
      userId: user.id,
      action: "close",
      module: "maintenance",
      recordId: id,
      oldValue: {
        repairStatus: ticket.repairStatus,
        assetStatusId: ticket.asset.statusId,
      },
      newValue: {
        repairStatus: "closed",
        assetStatusId: input.nextStatusId,
        repairCost: input.repairCost,
        laborCost: input.laborCost,
        partsCost: input.partsCost,
        quotationNo: input.quotationNo,
        invoiceNo: input.invoiceNo,
        warrantyClaim: input.warrantyClaim,
        rootCause: input.rootCause,
        resolution: input.resolution,
        returnDate: input.returnDate,
        inspectedById: input.inspectedById,
      },
    })

    return NextResponse.json(updatedTicket)
  } catch (error) {
    return errorResponse(error, 400)
  }
}
