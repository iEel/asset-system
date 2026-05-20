import type { Prisma } from "@prisma/client"
import { prisma } from "@/lib/db"
import {
  buildPreventiveMaintenanceDuplicateTicketWhere,
  buildPreventiveMaintenanceTicketDraft,
  isPreventiveMaintenancePlanDue,
} from "@/lib/preventive-maintenance"

export const preventiveMaintenanceGenerationPlanInclude = {
  asset: { select: { id: true, assetTag: true, name: true } },
} as const

export type PreventiveMaintenanceGenerationPlan = Prisma.MaintenancePlanGetPayload<{
  include: typeof preventiveMaintenanceGenerationPlanInclude
}>

export type PreventiveMaintenanceTicketGenerationResult =
  | {
      status: "created"
      ticket: { id: string; repairNo: string }
      plan: { id: string; nextDueDate: Date; lastGeneratedAt: Date | null }
    }
  | {
      status: "duplicate"
      ticket: { id: string; repairNo: string }
      plan: { id: string; planNo: string }
    }
  | {
      status: "missing_reporter"
      plan: { id: string; planNo: string }
    }

export type PreventiveMaintenanceBatchGenerationResult = {
  scanned: number
  generated: number
  skippedDuplicate: number
  skippedMissingReporter: number
  dryRun: boolean
  items: Array<{
    planId: string
    planNo: string
    assetTag: string
    status: PreventiveMaintenanceTicketGenerationResult["status"] | "dry_run"
    repairNo?: string
    nextDueDate?: Date
  }>
}

type GenerateTicketOptions = {
  plan: PreventiveMaintenanceGenerationPlan
  generatedByUserId: string
  fallbackReportedById?: string | null
  generatedAt?: Date
  prismaClient?: typeof prisma
}

type GenerateDueTicketsOptions = {
  generatedByUserId: string
  fallbackReportedById?: string | null
  now?: Date
  limit?: number
  dryRun?: boolean
  prismaClient?: typeof prisma
}

export async function generatePreventiveMaintenanceTicketForPlan({
  plan,
  generatedByUserId,
  fallbackReportedById,
  generatedAt = new Date(),
  prismaClient = prisma,
}: GenerateTicketOptions): Promise<PreventiveMaintenanceTicketGenerationResult> {
  const draft = buildPreventiveMaintenanceTicketDraft(plan, fallbackReportedById)
  const reportedById = draft.reportedById
  if (!reportedById) {
    return { status: "missing_reporter", plan: { id: plan.id, planNo: plan.planNo } }
  }

  return prismaClient.$transaction(async (tx) => {
    const duplicate = await tx.maintenanceTicket.findFirst({
      where: buildPreventiveMaintenanceDuplicateTicketWhere(plan),
      select: { id: true, repairNo: true },
    })
    if (duplicate) {
      return { status: "duplicate", ticket: duplicate, plan: { id: plan.id, planNo: plan.planNo } }
    }

    const repairNo = await generateRepairNo(tx, generatedAt)
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
        createdBy: generatedByUserId,
        updatedBy: generatedByUserId,
      },
      select: { id: true, repairNo: true },
    })

    const updatedPlan = await tx.maintenancePlan.update({
      where: { id: plan.id },
      data: {
        lastGeneratedAt: generatedAt,
        nextDueDate: draft.nextDueDate,
        updatedBy: generatedByUserId,
      },
      select: { id: true, nextDueDate: true, lastGeneratedAt: true },
    })

    await tx.assetMovement.create({
      data: {
        assetId: plan.assetId,
        movementType: "maintenance_pm_create",
        reason: draft.problem,
        referenceType: "maintenance",
        referenceId: ticket.id,
        performedBy: generatedByUserId,
        remark: `${plan.planNo} - ${plan.title}`,
      },
    })

    return { status: "created", ticket, plan: updatedPlan }
  })
}

export async function generateDuePreventiveMaintenanceTickets({
  generatedByUserId,
  fallbackReportedById,
  now = new Date(),
  limit = 50,
  dryRun = false,
  prismaClient = prisma,
}: GenerateDueTicketsOptions): Promise<PreventiveMaintenanceBatchGenerationResult> {
  const dueCutoff = new Date(now)
  dueCutoff.setHours(23, 59, 59, 999)
  const plans = await prismaClient.maintenancePlan.findMany({
    where: {
      isActive: true,
      nextDueDate: { lte: dueCutoff },
    },
    include: preventiveMaintenanceGenerationPlanInclude,
    orderBy: { nextDueDate: "asc" },
    take: Math.max(1, Math.min(limit, 200)),
  })

  const result: PreventiveMaintenanceBatchGenerationResult = {
    scanned: 0,
    generated: 0,
    skippedDuplicate: 0,
    skippedMissingReporter: 0,
    dryRun,
    items: [],
  }

  for (const plan of plans) {
    if (!isPreventiveMaintenancePlanDue(plan, now)) continue

    result.scanned += 1
    const draft = buildPreventiveMaintenanceTicketDraft(plan, fallbackReportedById)
    if (!draft.reportedById) {
      result.skippedMissingReporter += 1
      result.items.push({
        planId: plan.id,
        planNo: plan.planNo,
        assetTag: plan.asset.assetTag,
        status: "missing_reporter",
      })
      continue
    }

    const duplicate = await prismaClient.maintenanceTicket.findFirst({
      where: buildPreventiveMaintenanceDuplicateTicketWhere(plan),
      select: { id: true, repairNo: true },
    })
    if (duplicate) {
      result.skippedDuplicate += 1
      result.items.push({
        planId: plan.id,
        planNo: plan.planNo,
        assetTag: plan.asset.assetTag,
        status: "duplicate",
        repairNo: duplicate.repairNo,
      })
      continue
    }

    if (dryRun) {
      result.items.push({
        planId: plan.id,
        planNo: plan.planNo,
        assetTag: plan.asset.assetTag,
        status: "dry_run",
        nextDueDate: draft.nextDueDate,
      })
      continue
    }

    const generated = await generatePreventiveMaintenanceTicketForPlan({
      plan,
      generatedByUserId,
      fallbackReportedById,
      generatedAt: now,
      prismaClient,
    })

    if (generated.status === "created") {
      result.generated += 1
      result.items.push({
        planId: plan.id,
        planNo: plan.planNo,
        assetTag: plan.asset.assetTag,
        status: "created",
        repairNo: generated.ticket.repairNo,
        nextDueDate: generated.plan.nextDueDate,
      })
    } else if (generated.status === "duplicate") {
      result.skippedDuplicate += 1
      result.items.push({
        planId: plan.id,
        planNo: plan.planNo,
        assetTag: plan.asset.assetTag,
        status: "duplicate",
        repairNo: generated.ticket.repairNo,
      })
    } else {
      result.skippedMissingReporter += 1
      result.items.push({
        planId: plan.id,
        planNo: plan.planNo,
        assetTag: plan.asset.assetTag,
        status: "missing_reporter",
      })
    }
  }

  return result
}

async function generateRepairNo(tx: Prisma.TransactionClient, now = new Date()) {
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
