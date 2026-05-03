import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { requireAuth, requirePermission } from "@/lib/auth-utils"
import { logAudit } from "@/lib/audit-log"
import { errorResponse } from "@/lib/api-response"
import { maintenanceTicketCloseSchema } from "@/lib/validations/maintenance"

type MaintenanceTicketContext = {
  params: Promise<{ id: string }>
}

export async function PATCH(request: NextRequest, context: MaintenanceTicketContext) {
  try {
    const user = await requireAuth()
    requirePermission(user, "maintenance", "edit")

    const { id } = await context.params
    const input = maintenanceTicketCloseSchema.parse(await request.json())
    const ticket = await prisma.maintenanceTicket.findFirst({
      where: { id, isActive: true },
      include: { asset: { select: { id: true, statusId: true } } },
    })
    if (!ticket) return NextResponse.json({ error: "Maintenance ticket not found" }, { status: 404 })
    if (ticket.repairStatus === "closed") {
      return NextResponse.json({ error: "Maintenance ticket is already closed" }, { status: 400 })
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
          repairCost: input.repairCost,
          warrantyClaim: input.warrantyClaim,
          rootCause: input.rootCause,
          resolution: input.resolution,
          returnDate: input.returnDate,
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
        warrantyClaim: input.warrantyClaim,
        rootCause: input.rootCause,
        resolution: input.resolution,
        returnDate: input.returnDate,
      },
    })

    return NextResponse.json(updatedTicket)
  } catch (error) {
    return errorResponse(error, 400)
  }
}
