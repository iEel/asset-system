import { NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { requireAuth, requirePermission } from "@/lib/auth-utils"
import { logAudit } from "@/lib/audit-log"
import { errorResponse } from "@/lib/api-response"
import {
  generatePreventiveMaintenanceTicketForPlan,
  preventiveMaintenanceGenerationPlanInclude,
} from "@/lib/preventive-maintenance-ticket-generator"

type MaintenancePlanGenerateTicketContext = {
  params: Promise<{ id: string }>
}

export async function POST(_request: Request, context: MaintenancePlanGenerateTicketContext) {
  try {
    const user = await requireAuth()
    requirePermission(user, "maintenance", "create")

    const { id } = await context.params
    const plan = await prisma.maintenancePlan.findFirst({
      where: { id, isActive: true, planState: "active" },
      include: preventiveMaintenanceGenerationPlanInclude,
    })
    if (!plan) return NextResponse.json({ error: "Maintenance plan not found" }, { status: 404 })

    const result = await generatePreventiveMaintenanceTicketForPlan({
      plan,
      generatedByUserId: user.id,
      fallbackReportedById: user.employeeId,
      prismaClient: prisma,
    })
    if (result.status === "missing_reporter") {
      return NextResponse.json(
        { error: "Select an internal responsible person before generating a PM ticket" },
        { status: 400 },
      )
    }
    if (result.status === "duplicate") {
      return NextResponse.json(
        { error: "A PM ticket for this plan is already open", ticket: result.ticket },
        { status: 409 },
      )
    }

    await logAudit({
      userId: user.id,
      action: "generate_pm_ticket",
      module: "maintenance",
      recordId: result.ticket.id,
      newValue: {
        planId: plan.id,
        planNo: plan.planNo,
        repairNo: result.ticket.repairNo,
        assetId: plan.assetId,
        assetTag: plan.asset.assetTag,
        nextDueDate: result.plan.nextDueDate,
      },
    })

    return NextResponse.json(result, { status: 201 })
  } catch (error) {
    return errorResponse(error, 400)
  }
}
