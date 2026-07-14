import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { requireAuth, requirePermission } from "@/lib/auth-utils"
import { errorResponse } from "@/lib/api-response"
import { logAudit } from "@/lib/audit-log"
import { getMaintenancePlanIntervalDays } from "@/lib/preventive-maintenance"
import { maintenancePlanSchema } from "@/lib/validations/maintenance"

const planInclude = {
  asset: { select: { assetTag: true, name: true } },
  assignedTo: { select: { code: true, fullNameTh: true } },
  vendor: { select: { code: true, name: true } },
} as const

export async function GET() {
  try {
    const user = await requireAuth()
    requirePermission(user, "maintenance", "view")

    const plans = await prisma.maintenancePlan.findMany({
      where: { isActive: true },
      include: planInclude,
      orderBy: { nextDueDate: "asc" },
      take: 100,
    })

    return NextResponse.json({ data: plans })
  } catch (error) {
    return errorResponse(error)
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth()
    requirePermission(user, "maintenance", "create")

    const input = maintenancePlanSchema.parse(await request.json())
    const asset = await prisma.asset.findFirst({
      where: { id: input.assetId, isActive: true },
      select: { id: true },
    })
    if (!asset) return NextResponse.json({ error: "Asset not found" }, { status: 404 })
    if (input.assignedToId) {
      const assignee = await prisma.employee.findFirst({
        where: { id: input.assignedToId, isActive: true },
        select: { id: true },
      })
      if (!assignee) return NextResponse.json({ error: "PM assignee not found or inactive" }, { status: 400 })
    }
    if (input.vendorId) {
      const vendor = await prisma.supplier.findFirst({
        where: { id: input.vendorId, isActive: true },
        select: { id: true },
      })
      if (!vendor) return NextResponse.json({ error: "PM vendor not found or inactive" }, { status: 400 })
    }

    const planNo = await generateMaintenancePlanNo()
    const intervalDays = getMaintenancePlanIntervalDays(input.frequency, input.intervalDays)
    const plan = await prisma.maintenancePlan.create({
      data: {
        planNo,
        assetId: input.assetId,
        title: input.title,
        frequency: input.frequency,
        intervalDays,
        nextDueDate: input.nextDueDate,
        assignedToId: input.assignedToId,
        vendorId: input.vendorId,
        notes: input.notes,
        createdBy: user.id,
        updatedBy: user.id,
      },
      include: planInclude,
    })

    await logAudit({
      userId: user.id,
      action: "create_plan",
      module: "maintenance",
      recordId: plan.id,
      newValue: { ...input, planNo, intervalDays },
    })

    return NextResponse.json(plan, { status: 201 })
  } catch (error) {
    return errorResponse(error, 400)
  }
}

async function generateMaintenancePlanNo() {
  const now = new Date()
  const datePart = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, "0")}${String(now.getDate()).padStart(2, "0")}`
  const start = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const end = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1)
  const count = await prisma.maintenancePlan.count({
    where: {
      createdAt: {
        gte: start,
        lt: end,
      },
    },
  })

  return `PM-${datePart}-${String(count + 1).padStart(4, "0")}`
}
