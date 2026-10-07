import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { requireAuth, requirePermission } from "@/lib/auth-utils"
import { logAudit } from "@/lib/audit-log"
import { errorResponse } from "@/lib/api-response"
import { getMaintenanceErrorPayload } from "@/lib/maintenance-api-errors"
import {
  cancelRepairRecord,
  completeRepairRecord,
  updateRepairRecordDetails,
} from "@/lib/repair-record-service"
import { repairRecordActionSchema } from "@/lib/validations/maintenance"

type RepairRecordContext = {
  params: Promise<{ id: string }>
}

export async function PATCH(request: NextRequest, context: RepairRecordContext) {
  try {
    const user = await requireAuth()
    requirePermission(user, "maintenance", "edit")

    const { id } = await context.params
    const input = repairRecordActionSchema.parse(await request.json())
    const serviceUser = { id: user.id, employeeId: user.employeeId }

    if (input.action === "complete") {
      const result = await completeRepairRecord(prisma, id, input, serviceUser)
      await logAudit({
        userId: user.id,
        action: "complete",
        module: "maintenance",
        recordId: id,
        oldValue: { repairStatus: result.previous.repairStatus, assetStatusId: result.previous.asset.statusId },
        newValue: {
          repairStatus: "closed",
          outcome: input.outcome,
          returnDate: input.returnDate,
          vendorId: input.vendorId,
          repairCost: input.repairCost,
          invoiceNo: input.invoiceNo,
          remark: input.remark,
        },
      })
      return NextResponse.json(result.ticket)
    }

    if (input.action === "cancel") {
      const result = await cancelRepairRecord(prisma, id, input, serviceUser)
      await logAudit({
        userId: user.id,
        action: "cancel",
        module: "maintenance",
        recordId: id,
        oldValue: { repairStatus: result.previous.repairStatus, assetStatusId: result.previous.asset.statusId },
        newValue: { repairStatus: "cancelled", reason: input.reason },
        remark: input.reason ?? undefined,
      })
      return NextResponse.json(result.ticket)
    }

    const result = await updateRepairRecordDetails(prisma, id, input, serviceUser)
    await logAudit({
      userId: user.id,
      action: "update",
      module: "maintenance",
      recordId: id,
      oldValue: {
        reportedDate: result.previous.reportedDate,
        problem: result.previous.problem,
        vendorId: result.previous.vendorId,
        repairCost: result.previous.repairCost,
        invoiceNo: result.previous.invoiceNo,
        remark: result.previous.resolution,
      },
      newValue: {
        reportedDate: input.reportedDate,
        problem: input.problem,
        vendorId: input.vendorId,
        repairCost: input.repairCost,
        invoiceNo: input.invoiceNo,
        remark: input.remark,
      },
    })
    return NextResponse.json(result.ticket)
  } catch (error) {
    const payload = getMaintenanceErrorPayload(error)
    if (payload) return NextResponse.json(payload.body, { status: payload.status })
    return errorResponse(error, 400)
  }
}
