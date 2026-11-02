import { randomUUID } from "node:crypto"
import { NextRequest, NextResponse } from "next/server"
import type { Prisma } from "@prisma/client"
import { prisma } from "@/lib/db"
import { requireAuth, requirePermission } from "@/lib/auth-utils"
import { logAudit } from "@/lib/audit-log"
import { writeAuditLog } from "@/lib/audit-log-writer"
import { errorResponse } from "@/lib/api-response"
import { FieldRefusalError } from "@/lib/field-errors"
import { syncInstalledComponentsWithParent } from "@/lib/asset-component-sync"
import { getAssetLifecycleTransitionError, getAssetStateSelectionError } from "@/lib/asset-lifecycle-policy"
import { getRegisterCustodyChangeError, type AssetCustodyChangeError } from "@/lib/asset-custody-policy"
import { departmentFollowsHolder, getRegisterDepartment } from "@/lib/asset-department-rule"
import { normalizeAssetOwnershipType, type AssetOwnershipType } from "@/lib/asset-ownership"
import { AssetOperationConflictError } from "@/lib/asset-operation-claim"
import { planRegisterEditMovements, registerEditNeedsReason } from "@/lib/asset-register-edit"
import { isPrismaUniqueConstraintError } from "@/lib/prisma-unique-retry"
import { withDeadlockRetry } from "@/lib/transaction-retry"
import { assetUpdateSchema, type AssetUpdateInput } from "@/lib/validations/asset"

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

// The asset edit is a data correction (group 4 spec §7.2-§7.4; plan 2, P2-R1, P2-R3, P2-R4, P2-R5, P2-R7, P2-R10). บุคคล and
// Stock take the holder's department whatever the client sends; the custody lock compares that computed department and
// runs before the reason check; the row is claimed on the values read here, and every history row of the save shares one
// reference.
const registerEditTransactionOptions = { maxWait: 10_000, timeout: 60_000 } as const

export async function PUT(request: NextRequest, context: AssetRouteContext) {
  try {
    const user = await requireAuth()
    requirePermission(user, "asset", "edit")

    const { id } = await context.params
    const input = assetUpdateSchema.parse(await request.json())
    const existing = await prisma.asset.findFirst({
      where: { id, isActive: true },
      include: {
        status: { select: { name: true, nameTh: true } },
        condition: { select: { name: true, nameTh: true } },
      },
    })

    if (!existing) {
      return NextResponse.json({ error: "Asset not found" }, { status: 404 })
    }

    const [nextStatus, nextCondition] = await Promise.all([
      prisma.assetStatus.findFirst({
        where: { id: input.statusId, isActive: true },
        select: { id: true, name: true, isActive: true },
      }),
      prisma.assetCondition.findFirst({
        where: { id: input.conditionId, isActive: true },
        select: { id: true, name: true, isActive: true },
      }),
    ])
    const stateError = getAssetStateSelectionError({
      operation: "register_edit",
      currentStatusName: existing.status.name,
      currentConditionName: existing.condition.name,
      status: nextStatus,
      condition: nextCondition,
    })
    if (stateError) {
      return NextResponse.json({ code: stateError, error: stateError }, { status: 400 })
    }

    // An omitted holder or department keeps the stored one; an explicit null clears it.
    const ownership = normalizeAssetOwnershipType(input.ownershipType)
    const nextCustodianId = input.custodianId === undefined ? existing.custodianId : input.custodianId
    const chosenDepartmentId = input.departmentId === undefined ? existing.departmentId : input.departmentId
    const correctionReason = input.correctionReason ? input.correctionReason : null
    // A written-off asset cannot move custody (move_scope refused), so the automatic fix is skipped, as under an open
    // handover: an unrelated edit is never refused because of it (spec §7.3, final review).
    const custodyFrozen = getAssetLifecycleTransitionError("move_scope", existing.status.name) !== null
    const facts = { ownership, currentCustodianId: existing.custodianId, currentDepartmentId: existing.departmentId, nextCustodianId, chosenDepartmentId, custodyFrozen }

    const openHandover = await hasOpenHandover(prisma, id)
    const department = await planRegisterDepartment(prisma, { ...facts, openHandover })
    const custodyError = registerCustodyError(existing, { openHandover, nextCustodianId, currentLocationId: input.currentLocationId, nextDepartmentId: department.departmentId })
    if (custodyError) {
      return NextResponse.json({ code: custodyError, error: custodyError }, { status: 409 })
    }

    const locationChanged = input.currentLocationId !== existing.currentLocationId
    const custodianChanged = nextCustodianId !== existing.custodianId
    const departmentChanged = department.departmentId !== existing.departmentId
    if (registerEditNeedsReason({ locationChanged, custodianChanged, departmentChanged, departmentAutomatic: department.automatic }) && !correctionReason) {
      throw new FieldRefusalError("Correction reason is required", { correctionReason: "required" })
    }

    await assertUniqueSerial(input.serialNumber, id)
    await assertUniqueAssetTag(input.assetTag, id)

    const columns = registerColumns(input)
    const nextDepartmentId = department.departmentId
    const updateData = {
      ...columns,
      assetTag: input.assetTag ?? existing.assetTag,
      custodianId: nextCustodianId,
      departmentId: nextDepartmentId,
      updatedBy: user.id,
    }
    // One reference for the movements and the component sync of this save (P2-R5).
    const referenceId = randomUUID()

    // A deadlock victim was rolled back whole, so it runs again (as the bulk update). A typed tag that lost the race on
    // the unique index is the tag's field error (as POST, P2-R8).
    const tagChanged = updateData.assetTag !== existing.assetTag
    const asset = await withDeadlockRetry(() => prisma.$transaction(async (tx) => {
      // The holder and the open handover read again: a holder who left, or a handover opened meanwhile, changes the plan.
      const openNow = await hasOpenHandover(tx, id)
      const departmentNow = await planRegisterDepartment(tx, { ...facts, openHandover: openNow })
      const custodyErrorNow = registerCustodyError(existing, { openHandover: openNow, nextCustodianId, currentLocationId: input.currentLocationId, nextDepartmentId: departmentNow.departmentId })
      if (custodyErrorNow) throw new RegisterCustodyRefusal(custodyErrorNow)
      if (departmentNow.departmentId !== nextDepartmentId || departmentNow.automatic !== department.automatic) throw assetChangedError()

      // The claim on the values read (P2-R10): another save of the room, holder, department or status in between fails it.
      const claim = await tx.asset.updateMany({
        where: {
          id,
          isActive: true,
          statusId: existing.statusId,
          currentLocationId: existing.currentLocationId,
          custodianId: existing.custodianId,
          departmentId: existing.departmentId,
        },
        data: updateData,
      })
      if (claim.count !== 1) throw assetChangedError()
      const asset = await tx.asset.findUniqueOrThrow({ where: { id }, include: assetInclude })

      const movements = planRegisterEditMovements({
        existing,
        next: { ...existing, ...definedValues(columns), assetTag: updateData.assetTag, custodianId: nextCustodianId },
        nextDepartmentId,
        departmentAutomatic: department.automatic,
        correctionReason,
        referenceId,
        performedBy: user.id,
      })
      if (movements.length > 0) await tx.assetMovement.createMany({ data: movements })

      const componentSync = await syncInstalledComponentsWithParent(tx, {
        parentAssetId: id,
        changes: {
          branchId: input.branchId,
          currentLocationId: input.currentLocationId,
          custodianId: nextCustodianId,
          departmentId: nextDepartmentId,
        },
        movementType: "parent_register_update_sync",
        referenceType: "register_edit",
        referenceId,
        performedBy: user.id,
        reason: correctionReason ?? "Parent asset register update",
      })

      await writeAuditLog(tx, {
        userId: user.id,
        action: "update",
        module: "asset",
        recordId: id,
        oldValue: existing,
        newValue: { ...updateData, correctionReason, componentSync },
      })

      return asset
    }, registerEditTransactionOptions)).catch((error: unknown) => {
      if (tagChanged && isPrismaUniqueConstraintError(error)) {
        throw new FieldRefusalError("Asset tag already exists", { assetTag: "duplicate" })
      }
      throw error
    })

    return NextResponse.json(asset)
  } catch (error) {
    if (error instanceof RegisterCustodyRefusal) {
      return NextResponse.json({ code: error.code, error: error.code }, { status: 409 })
    }
    if (error instanceof RegisterHolderInactiveError) {
      return NextResponse.json({
        code: "ASSET_TRANSFER_DESTINATION_INACTIVE",
        error: "ASSET_TRANSFER_DESTINATION_INACTIVE",
        fieldErrors: { custodianId: "checkoutReceiverInactive" },
      }, { status: 409 })
    }
    if (error instanceof AssetOperationConflictError) {
      return NextResponse.json({ code: error.code, error: error.message }, { status: 409 })
    }
    return errorResponse(error, 400)
  }
}

type RegisterDb = Pick<Prisma.TransactionClient, "assetCheckout" | "employee">

async function hasOpenHandover(db: RegisterDb, assetId: string): Promise<boolean> {
  const checkout = await db.assetCheckout.findFirst({
    where: { assetId, isReturned: false, transactionStatus: "active" },
    select: { id: true },
  })
  return checkout !== null
}

// A new holder is read active (one who left or is unknown is refused under custodianId); the current holder decides a
// department even after leaving, so that read has no active filter (as transfer).
async function planRegisterDepartment(
  db: RegisterDb,
  input: {
    ownership: AssetOwnershipType
    currentCustodianId: string | null
    nextCustodianId: string | null
    currentDepartmentId: string | null
    chosenDepartmentId: string | null
    openHandover: boolean
    custodyFrozen: boolean
  },
) {
  let nextHolderDepartmentId: string | null = null
  if (input.nextCustodianId && input.nextCustodianId !== input.currentCustodianId) {
    const holder = await db.employee.findFirst({ where: { id: input.nextCustodianId, isActive: true }, select: { id: true, departmentId: true } })
    if (!holder) throw new RegisterHolderInactiveError()
    nextHolderDepartmentId = holder.departmentId ?? null
  } else if (input.nextCustodianId && departmentFollowsHolder(input.ownership)) {
    const holder = await db.employee.findUnique({ where: { id: input.nextCustodianId }, select: { departmentId: true } })
    nextHolderDepartmentId = holder?.departmentId ?? null
  }
  return getRegisterDepartment({ ...input, nextHolderDepartmentId })
}

// The lock compares the department the server computed, never the one the client sent (P2-R3).
function registerCustodyError(
  existing: { status: { name: string }; custodianId: string | null; currentLocationId: string; departmentId: string | null },
  next: { openHandover: boolean; nextCustodianId: string | null; currentLocationId: string; nextDepartmentId: string | null },
): AssetCustodyChangeError | null {
  return getRegisterCustodyChangeError({
    statusName: existing.status.name,
    hasActiveCheckout: next.openHandover,
    before: existing,
    after: { custodianId: next.nextCustodianId, currentLocationId: next.currentLocationId, departmentId: next.nextDepartmentId },
  })
}

// The asset columns of the body: correctionReason is no column.
function registerColumns(input: AssetUpdateInput): Omit<AssetUpdateInput, "correctionReason"> {
  const columns: Partial<AssetUpdateInput> = { ...input }
  delete columns.correctionReason
  return columns as Omit<AssetUpdateInput, "correctionReason">
}

// The parsed keys the body sent; an omitted one keeps the stored value.
function definedValues(columns: Omit<AssetUpdateInput, "correctionReason">): Partial<Omit<AssetUpdateInput, "correctionReason">> {
  return Object.fromEntries(Object.entries(columns).filter(([, value]) => value !== undefined))
}

function assetChangedError(): AssetOperationConflictError {
  return new AssetOperationConflictError(
    "ASSET_CHANGED_DURING_OPERATION",
    "Asset status changed while this request was being saved. Reload the asset and try again.",
  )
}

class RegisterCustodyRefusal extends Error {
  readonly code: AssetCustodyChangeError

  constructor(code: AssetCustodyChangeError) {
    super(code)
    this.name = "RegisterCustodyRefusal"
    this.code = code
  }
}

class RegisterHolderInactiveError extends Error {
  constructor() {
    super("ASSET_TRANSFER_DESTINATION_INACTIVE")
    this.name = "RegisterHolderInactiveError"
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
    throw new FieldRefusalError("Serial Number already exists", { serialNumber: "duplicate" })
  }
}

// A typed asset tag that another asset holds is the tag's field error, not the database's refusal (a 500; the E2E
// suite's M3). The tag is unique over every row, active or not, as the unique index is.
async function assertUniqueAssetTag(assetTag?: string | null, excludeId?: string) {
  if (!assetTag) return

  const existing = await prisma.asset.findFirst({
    where: {
      assetTag,
      ...(excludeId ? { id: { not: excludeId } } : {}),
    },
    select: { id: true },
  })

  if (existing) {
    throw new FieldRefusalError("Asset tag already exists", { assetTag: "duplicate" })
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
