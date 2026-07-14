import { NextRequest, NextResponse } from "next/server"
import { logAudit } from "@/lib/audit-log"
import { errorResponse } from "@/lib/api-response"
import { requireAuth, requirePermission } from "@/lib/auth-utils"
import { prisma } from "@/lib/db"
import { mutateMaintenancePlan } from "@/lib/maintenance-plan-service"
import { maintenancePlanActionSchema } from "@/lib/validations/maintenance"

type MaintenancePlanContext = { params: Promise<{ id: string }> }
const maintenancePlanAuditActions = {
  update: "update_plan",
  pause: "pause_plan",
  resume: "resume_plan",
  end: "end_plan",
} as const

export async function PATCH(request: NextRequest, context: MaintenancePlanContext) {
  try {
    const user = await requireAuth()
    requirePermission(user, "maintenance", "edit")
    const { id } = await context.params
    const input = maintenancePlanActionSchema.parse(await request.json())
    const result = await mutateMaintenancePlan(prisma, id, input, user.id)

    await logAudit({
      userId: user.id,
      action: maintenancePlanAuditActions[input.action],
      module: "maintenance",
      recordId: id,
      oldValue: result.previous,
      newValue: input,
    })
    return NextResponse.json(result.plan)
  } catch (error) {
    return errorResponse(error, 400)
  }
}
