import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { requireAuth, requirePermission } from "@/lib/auth-utils"
import { logAudit } from "@/lib/audit-log"
import { errorResponse } from "@/lib/api-response"
import { assetSchema } from "@/lib/validations/asset"

type AssetRouteContext = {
  params: Promise<{ id: string }>
}

const assetInclude = {
  category: { select: { code: true, name: true } },
  brand: { select: { name: true } },
  model: { select: { name: true } },
  company: { select: { code: true, nameTh: true } },
  branch: { select: { code: true, name: true } },
  department: { select: { code: true, name: true } },
  custodian: { select: { code: true, fullNameTh: true } },
  homeLocation: { select: { code: true, name: true } },
  currentLocation: { select: { code: true, name: true } },
  status: { select: { name: true, nameTh: true, colorCode: true } },
  condition: { select: { name: true, nameTh: true, colorCode: true } },
  supplier: { select: { code: true, name: true } },
} as const

export async function GET(_request: NextRequest, context: AssetRouteContext) {
  try {
    const user = await requireAuth()
    requirePermission(user, "asset", "view")

    const { id } = await context.params
    const asset = await prisma.asset.findFirst({
      where: { id, isActive: true },
      include: assetInclude,
    })

    if (!asset) {
      return NextResponse.json({ error: "Asset not found" }, { status: 404 })
    }

    return NextResponse.json(asset)
  } catch (error) {
    return errorResponse(error)
  }
}

export async function PUT(request: NextRequest, context: AssetRouteContext) {
  try {
    const user = await requireAuth()
    requirePermission(user, "asset", "edit")

    const { id } = await context.params
    const input = assetSchema.parse(await request.json())
    const existing = await prisma.asset.findFirst({
      where: { id, isActive: true },
    })

    if (!existing) {
      return NextResponse.json({ error: "Asset not found" }, { status: 404 })
    }

    await assertUniqueSerial(input.serialNumber, id)

    const asset = await prisma.asset.update({
      where: { id },
      data: {
        ...input,
        assetTag: input.assetTag ?? existing.assetTag,
        updatedBy: user.id,
      },
      include: assetInclude,
    })

    await logAssetMovements({
      userId: user.id,
      assetId: asset.id,
      existing,
      input,
    })

    await logAudit({
      userId: user.id,
      action: "update",
      module: "asset",
      recordId: asset.id,
      oldValue: existing,
      newValue: input,
    })

    return NextResponse.json(asset)
  } catch (error) {
    return errorResponse(error, 400)
  }
}

async function assertUniqueSerial(serialNumber?: string | null, excludeId?: string) {
  if (!serialNumber) return

  const existing = await prisma.asset.findFirst({
    where: {
      isActive: true,
      serialNumber,
      ...(excludeId ? { id: { not: excludeId } } : {}),
    },
    select: { id: true },
  })

  if (existing) {
    throw new Error("Serial Number already exists")
  }
}

export async function DELETE(_request: NextRequest, context: AssetRouteContext) {
  try {
    const user = await requireAuth()
    requirePermission(user, "asset", "delete")

    const { id } = await context.params
    const existing = await prisma.asset.findFirst({
      where: { id, isActive: true },
    })

    if (!existing) {
      return NextResponse.json({ error: "Asset not found" }, { status: 404 })
    }

    const asset = await prisma.asset.update({
      where: { id },
      data: {
        isActive: false,
        updatedBy: user.id,
      },
    })

    await logAudit({
      userId: user.id,
      action: "delete",
      module: "asset",
      recordId: id,
      oldValue: existing,
      newValue: asset,
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    return errorResponse(error)
  }
}

async function logAssetMovements({
  userId,
  assetId,
  existing,
  input,
}: {
  userId: string
  assetId: string
  existing: {
    currentLocationId: string
    custodianId: string | null
    departmentId: string | null
    statusId: string
    conditionId: string
  }
  input: {
    currentLocationId: string
    custodianId?: string | null
    departmentId?: string | null
    statusId: string
    conditionId: string
  }
}) {
  const candidates = [
    ["location_change", existing.currentLocationId, input.currentLocationId],
    ["custodian_change", existing.custodianId, input.custodianId ?? null],
    ["department_change", existing.departmentId, input.departmentId ?? null],
    ["status_change", existing.statusId, input.statusId],
    ["condition_change", existing.conditionId, input.conditionId],
  ] as const

  const data = candidates
    .filter(([, fromValue, toValue]) => fromValue !== toValue)
    .map(([movementType, fromValue, toValue]) => ({
      assetId,
      movementType,
      fromValue,
      toValue,
      reason: "Asset register update",
      referenceType: "asset",
      referenceId: assetId,
      performedBy: userId,
    }))

  if (data.length > 0) {
    await prisma.assetMovement.createMany({ data })
  }
}
