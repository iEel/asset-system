import { NextRequest, NextResponse } from "next/server"
import type { Prisma } from "@prisma/client"
import { prisma } from "@/lib/db"
import { requireAuth, requirePermission } from "@/lib/auth-utils"
import { logAudit } from "@/lib/audit-log"
import { errorResponse } from "@/lib/api-response"
import { syncInstalledComponentsWithParent, type ComponentSyncChanges } from "@/lib/asset-component-sync"
import { getAssetRegisterStatusChangeError } from "@/lib/asset-lifecycle-exception-policy"
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
      include: { status: { select: { name: true, nameTh: true } } },
    })

    if (!existing) {
      return NextResponse.json({ error: "Asset not found" }, { status: 404 })
    }

    const nextStatus = input.statusId !== existing.statusId
      ? await prisma.assetStatus.findFirst({
          where: { id: input.statusId, isActive: true },
          select: { id: true, name: true, nameTh: true },
        })
      : null
    if (input.statusId !== existing.statusId && !nextStatus) {
      return NextResponse.json({ error: "Asset status not found" }, { status: 404 })
    }
    const statusChangeError = getAssetRegisterStatusChangeError(existing.status, nextStatus)
    if (statusChangeError) return NextResponse.json({ error: statusChangeError }, { status: 400 })

    await assertUniqueSerial(input.serialNumber, id)

    const { asset, componentSync } = await prisma.$transaction(async (tx) => {
      const asset = await tx.asset.update({
        where: { id },
        data: {
          ...input,
          assetTag: input.assetTag ?? existing.assetTag,
          updatedBy: user.id,
        },
        include: assetInclude,
      })

      await createAssetMovementRows(tx, {
        userId: user.id,
        assetId: asset.id,
        existing,
        input,
      })

      const componentSync = await syncInstalledComponentsWithParent(tx, {
        parentAssetId: asset.id,
        changes: buildRegisterComponentSyncChanges(input),
        movementType: "parent_register_update_sync",
        referenceType: "asset",
        referenceId: asset.id,
        performedBy: user.id,
        reason: "Parent asset register update",
      })

      return { asset, componentSync }
    })

    await logAudit({
      userId: user.id,
      action: "update",
      module: "asset",
      recordId: asset.id,
      oldValue: existing,
      newValue: { ...input, componentSync },
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

type NullableRegisterField = "departmentId" | "custodianId"

type RegisterComponentSyncInput = {
  branchId: string
  currentLocationId: string
  departmentId?: string | null
  custodianId?: string | null
}

type RegisterMovementInput = {
  departmentId?: string | null
  custodianId?: string | null
}

type MovementCandidate = readonly [movementType: string, fromValue: string | null, toValue: string | null]

function hasOwnNullableField(input: RegisterMovementInput, field: NullableRegisterField) {
  return Object.prototype.hasOwnProperty.call(input, field)
}

function buildRegisterComponentSyncChanges(input: RegisterComponentSyncInput): ComponentSyncChanges {
  const changes: ComponentSyncChanges = {
    branchId: input.branchId,
    currentLocationId: input.currentLocationId,
  }

  if (hasOwnNullableField(input, "departmentId")) changes.departmentId = input.departmentId ?? null
  if (hasOwnNullableField(input, "custodianId")) changes.custodianId = input.custodianId ?? null

  return changes
}

function buildNullableMovementCandidate(
  movementType: string,
  existingValue: string | null,
  input: RegisterMovementInput,
  field: NullableRegisterField
): MovementCandidate | null {
  return hasOwnNullableField(input, field) ? [movementType, existingValue, input[field] ?? null] : null
}

async function createAssetMovementRows(
  tx: Pick<Prisma.TransactionClient, "assetMovement">,
  {
    userId,
    assetId,
    existing,
    input,
  }: {
    userId: string
    assetId: string
    existing: {
      ownershipType: string
      licenseTotalSeats: number | null
      licenseUsedSeats: number | null
      licenseAssignedAssetId: string | null
      currentLocationId: string
      custodianId: string | null
      departmentId: string | null
      statusId: string
      conditionId: string
    }
    input: {
      ownershipType: string
      licenseTotalSeats?: number | null
      licenseUsedSeats?: number | null
      licenseAssignedAssetId?: string | null
      currentLocationId: string
      custodianId?: string | null
      departmentId?: string | null
      statusId: string
      conditionId: string
    }
  }
) {
  const candidates: Array<MovementCandidate | null> = [
    ["ownership_type_change", existing.ownershipType, input.ownershipType],
    ["license_total_seats_change", existing.licenseTotalSeats == null ? null : String(existing.licenseTotalSeats), input.licenseTotalSeats == null ? null : String(input.licenseTotalSeats)],
    ["license_used_seats_change", existing.licenseUsedSeats == null ? null : String(existing.licenseUsedSeats), input.licenseUsedSeats == null ? null : String(input.licenseUsedSeats)],
    ["license_assigned_asset_change", existing.licenseAssignedAssetId, input.licenseAssignedAssetId ?? null],
    ["location_change", existing.currentLocationId, input.currentLocationId],
    buildNullableMovementCandidate("custodian_change", existing.custodianId, input, "custodianId"),
    buildNullableMovementCandidate("department_change", existing.departmentId, input, "departmentId"),
    ["status_change", existing.statusId, input.statusId],
    ["condition_change", existing.conditionId, input.conditionId],
  ]

  const data = candidates
    .filter((candidate): candidate is MovementCandidate => candidate !== null)
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
    await tx.assetMovement.createMany({ data })
  }
}
