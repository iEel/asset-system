import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { requireAuth, requirePermission } from "@/lib/auth-utils"
import { errorResponse } from "@/lib/api-response"
import { fieldErrorResponse } from "@/lib/field-error-response"
import { logAudit } from "@/lib/audit-log"
import { getMaintenancePlanIntervalDays } from "@/lib/preventive-maintenance"
import { assertMaintenancePlanAssetNotWrittenOff, createMaintenancePlanRecord } from "@/lib/maintenance-plan-service"
import { getMaintenanceErrorPayload } from "@/lib/maintenance-api-errors"
import { maintenancePlanSchema } from "@/lib/validations/maintenance"
import { parseMaintenanceListParams } from "@/lib/maintenance-query"

const planInclude = {
  asset: { select: { assetTag: true, name: true } },
  vendor: { select: { code: true, name: true } },
} as const

export async function GET(request: NextRequest) {
  try {
    const user = await requireAuth()
    requirePermission(user, "maintenance", "view")

    const filters = parseMaintenanceListParams(request.nextUrl.searchParams)
    const [plans, total] = await Promise.all([
      prisma.maintenancePlan.findMany({
        where: {},
        include: planInclude,
        orderBy: { nextDueDate: "asc" },
        skip: (filters.page - 1) * filters.pageSize,
        take: filters.pageSize,
      }),
      prisma.maintenancePlan.count(),
    ])

    return NextResponse.json({ data: plans, total, page: filters.page, pageSize: filters.pageSize })
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
      select: { id: true, status: { select: { name: true } } },
    })
    if (!asset) return NextResponse.json({ error: "Asset not found" }, { status: 404 })
    // MAINTENANCE_PLAN_ASSET_WRITTEN_OFF for a Disposed or Retired asset (G5P1-R11).
    assertMaintenancePlanAssetNotWrittenOff(asset.status.name)
    if (input.vendorId) {
      const vendor = await prisma.supplier.findFirst({
        where: { id: input.vendorId, isActive: true },
        select: { id: true },
      })
      if (!vendor) return fieldErrorResponse({ status: 400, error: "PM vendor not found or inactive", fieldErrors: { vendorId: "pmVendorNotFound" } })
    }

    const intervalDays = getMaintenancePlanIntervalDays(input.frequency, input.intervalDays)
    // The number counts the Bangkok day and is read again when a plan saved at the same moment took it (G5P1-R11).
    const plan = await createMaintenancePlanRecord(
      prisma,
      {
        assetId: input.assetId,
        title: input.title,
        frequency: input.frequency,
        intervalDays,
        nextDueDate: input.nextDueDate,
        vendorId: input.vendorId,
        notes: input.notes,
        createdBy: user.id,
        updatedBy: user.id,
      },
      new Date(),
      planInclude,
    )

    await logAudit({
      userId: user.id,
      action: "create_plan",
      module: "maintenance",
      recordId: plan.id,
      newValue: { ...input, planNo: plan.planNo, intervalDays },
    })

    return NextResponse.json(plan, { status: 201 })
  } catch (error) {
    const payload = getMaintenanceErrorPayload(error)
    if (payload) return NextResponse.json(payload.body, { status: payload.status })
    return errorResponse(error, 400)
  }
}
