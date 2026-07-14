import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { requireAuth, requirePermission } from "@/lib/auth-utils"
import { logAudit } from "@/lib/audit-log"
import { errorResponse } from "@/lib/api-response"
import { getMaintenanceErrorPayload } from "@/lib/maintenance-api-errors"
import {
  closeMaintenanceTicket,
  transitionMaintenanceTicket,
  updateMaintenanceTicketPlanning,
} from "@/lib/maintenance-ticket-service"
import {
  maintenanceTicketCloseSchema,
  maintenanceTicketPlanningSchema,
  maintenanceTicketStatusSchema,
} from "@/lib/validations/maintenance"

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

    if (action === "status") {
      const input = maintenanceTicketStatusSchema.parse(body)
      const result = await transitionMaintenanceTicket(prisma, id, input, user)

      await logAudit({
        userId: user.id,
        action: "update_status",
        module: "maintenance",
        recordId: id,
        oldValue: {
          repairStatus: result.previous.repairStatus,
        },
        newValue: input,
      })

      return NextResponse.json(result.ticket)
    }

    if (action === "planning") {
      const input = maintenanceTicketPlanningSchema.parse(body)
      const result = await updateMaintenanceTicketPlanning(prisma, id, input, user)

      await logAudit({
        userId: user.id,
        action: "update_planning",
        module: "maintenance",
        recordId: id,
        oldValue: {
          assignedToId: result.previous.assignedToId,
          dueDate: result.previous.dueDate,
        },
        newValue: {
          assignedToId: input.assignedToId ?? null,
          dueDate: input.dueDate ?? null,
        },
      })

      return NextResponse.json(result.ticket)
    }

    const input = maintenanceTicketCloseSchema.parse(body)
    const result = await closeMaintenanceTicket(prisma, id, input, user)

    await logAudit({
      userId: user.id,
      action: "close",
      module: "maintenance",
      recordId: id,
      oldValue: {
        repairStatus: result.previous.repairStatus,
        assetStatusId: result.previous.asset.statusId,
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

    return NextResponse.json(result.ticket)
  } catch (error) {
    const payload = getMaintenanceErrorPayload(error)
    if (payload) return NextResponse.json(payload.body, { status: payload.status })
    return errorResponse(error, 400)
  }
}
