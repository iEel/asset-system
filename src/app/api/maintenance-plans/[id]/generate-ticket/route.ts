import { NextResponse } from "next/server"
import type { Prisma } from "@prisma/client"
import { prisma } from "@/lib/db"
import { requireAuth, requirePermission } from "@/lib/auth-utils"
import { logAudit } from "@/lib/audit-log"
import { errorResponse } from "@/lib/api-response"
import { buildPreventiveMaintenanceTicketDraft } from "@/lib/preventive-maintenance"

type MaintenancePlanGenerateTicketContext = {
  params: Promise<{ id: string }>
}

export async function POST(_request: Request, context: MaintenancePlanGenerateTicketContext) {
  try {
    const user = await requireAuth()
    requirePermission(user, "maintenance", "create")

    const { id } = await context.params
    const plan = await prisma.maintenancePlan.findFirst({
      where: { id, isActive: true },
      include: {
        asset: { select: { id: true, assetTag: true, name: true } },
      },
    })
    if (!plan) return NextResponse.json({ error: "Maintenance plan not found" }, { status: 404 })

    const draft = buildPreventiveMaintenanceTicketDraft(plan, user.employeeId)
    const reportedById = draft.reportedById
    if (!reportedById) {
      return NextResponse.json(
        { error: "Select an internal responsible person before generating a PM ticket" },
        { status: 400 },
      )
    }

    const generatedAt = new Date()
    const result = await prisma.$transaction(async (tx) => {
      const repairNo = await generateRepairNo(tx)
      const ticket = await tx.maintenanceTicket.create({
        data: {
          repairNo,
          assetId: plan.assetId,
          problem: draft.problem,
          reportedById,
          reportedDate: generatedAt,
          assignedToId: draft.assignedToId,
          dueDate: draft.dueDate,
          repairType: draft.repairType,
          vendorId: draft.vendorId,
          repairStatus: "reported",
          createdBy: user.id,
          updatedBy: user.id,
        },
      })

      const updatedPlan = await tx.maintenancePlan.update({
        where: { id: plan.id },
        data: {
          lastGeneratedAt: generatedAt,
          nextDueDate: draft.nextDueDate,
          updatedBy: user.id,
        },
      })

      await tx.assetMovement.create({
        data: {
          assetId: plan.assetId,
          movementType: "maintenance_pm_create",
          reason: draft.problem,
          referenceType: "maintenance",
          referenceId: ticket.id,
          performedBy: user.id,
          remark: `${plan.planNo} - ${plan.title}`,
        },
      })

      return { ticket, plan: updatedPlan }
    })

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

async function generateRepairNo(tx: Prisma.TransactionClient) {
  const now = new Date()
  const datePart = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, "0")}${String(now.getDate()).padStart(2, "0")}`
  const start = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const end = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1)
  const count = await tx.maintenanceTicket.count({
    where: {
      createdAt: {
        gte: start,
        lt: end,
      },
    },
  })

  return `MT-${datePart}-${String(count + 1).padStart(4, "0")}`
}
