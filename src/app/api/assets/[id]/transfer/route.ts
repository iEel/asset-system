import type { Prisma } from "@prisma/client"
import { NextRequest, NextResponse } from "next/server"
import { randomUUID } from "node:crypto"
import { prisma } from "@/lib/db"
import { requireAuth, requirePermission } from "@/lib/auth-utils"
import { logAudit } from "@/lib/audit-log"
import { errorResponse } from "@/lib/api-response"
import {
  AssetComponentOutstandingError,
  AssetOperationConflictError,
  assertNoOutstandingComponentLinks,
  claimAssetForCustodyChange,
} from "@/lib/asset-operation-claim"
import { getAssetLifecycleTransitionError, getCheckoutConditionBlock, getTransferTargetStatusName, type CheckoutConditionBlock } from "@/lib/asset-lifecycle-policy"
import { getTransferDepartmentSource, getTransferNextDepartmentId } from "@/lib/asset-department-rule"
import { normalizeAssetOwnershipType, type AssetOwnershipType } from "@/lib/asset-ownership"
import { hasTransferChange, normalizeTransferDestinations, sameTransferDestinations, type TransferDestinations } from "@/lib/transfer-rules"
import { getAssetOperationOwnershipRefusal } from "@/lib/asset-operation-eligibility"
import { syncInstalledComponentsWithParent } from "@/lib/asset-component-sync"
import { assetTransferSchema } from "@/lib/validations/asset-operations"
import { getRequiredAssetStatusId } from "@/lib/asset-status-flow"
import { generateTransferDocumentNo } from "@/lib/operation-document-number"
import {
  createAssetTransactionSnapshot,
  serializeAssetComponentTransactionSnapshots,
  serializeAssetTransactionSnapshot,
} from "@/lib/asset-transaction-snapshot"

type TransferContext = {
  params: Promise<{ id: string }>
}

type TransferSnapshot = {
  locationId: string
  custodianId: string | null
  departmentId: string | null
  statusId: string
}

export async function POST(request: NextRequest, context: TransferContext) {
  try {
    const user = await requireAuth()
    requirePermission(user, "asset", "edit")

    const { id } = await context.params
    const input = assetTransferSchema.parse(await request.json())
    const asset = await prisma.asset.findFirst({
      where: { id, isActive: true },
      include: { status: { select: { name: true, nameTh: true } }, condition: { select: { name: true } } },
    })
    if (!asset) return NextResponse.json({ error: "Asset not found" }, { status: 404 })
    // A destination equal to the current value is no change (group 3 spec §9.2, call 17; P3-R4), and nothing left reads
    // as the schema's own "at least one destination".
    const sent: TransferDestinations = { toLocationId: input.toLocationId ?? null, toCustodianId: input.toCustodianId ?? null, toDepartmentId: input.toDepartmentId ?? null }
    const destinations = normalizeTransferDestinations(sent, asset)
    if (!hasTransferChange(destinations)) return noTransferChangeResponse()
    // An outstanding component is returned first (group 3 spec §8.5), before the ownership rule, as the verdict.
    await assertNoOutstandingComponentLinks(prisma, [id])
    const ownershipRefusal = getAssetOperationOwnershipRefusal("move", asset.ownershipType)
    if (ownershipRefusal) return NextResponse.json({ code: ownershipRefusal, error: ownershipRefusal }, { status: 409 })
    const operation = destinations.toCustodianId ? "assign_custodian" : "move_scope"
    const statusError = getAssetLifecycleTransitionError(operation, asset.status.name)
    if (statusError) return NextResponse.json({ code: statusError, error: statusError }, { status: 409 })

    const activeCheckout = await prisma.assetCheckout.findFirst({
      where: { assetId: id, isReturned: false, transactionStatus: "active" },
      select: { id: true },
    })
    if (activeCheckout) {
      return NextResponse.json({ error: "Asset already has an active checkout" }, { status: 400 })
    }
    // A broken asset does not go to a new holder (group 3 spec §19, P3-R1); a room or a department alone still moves. It
    // is the last pre-check, as checkout's (A1-R2).
    if (destinations.toCustodianId) {
      const block = getCheckoutConditionBlock(asset.condition?.name)
      if (block) return conditionBlockedResponse(block)
    }
    await checkTransferDestinations(prisma, { ownership: normalizeAssetOwnershipType(asset.ownershipType), current: asset, destinations })

    const targetStatusName = getTransferTargetStatusName(destinations.toCustodianId)
    const targetStatusId = targetStatusName
      ? await getRequiredAssetStatusId(targetStatusName)
      : asset.statusId

    const { transfer, componentSync, fromSnapshot, toSnapshot } = await prisma.$transaction(async (tx) => {
      await claimAssetForCustodyChange(tx, { assetId: id, expectedStatusId: asset.statusId, updatedBy: user.id })
      await assertNoOutstandingComponentLinks(tx, [id])
      const beforeAsset = await tx.asset.findUnique({
        where: { id },
        select: {
          id: true,
          updatedAt: true,
          statusId: true,
          conditionId: true,
          branchId: true,
          currentLocationId: true,
          custodianId: true,
          departmentId: true,
          ownershipType: true,
          condition: { select: { name: true } },
        },
      })
      if (!beforeAsset) throw new Error("Asset not found")
      // The operation and the target status were computed from the pre-check set (P3-R4).
      if (!sameTransferDestinations(normalizeTransferDestinations(sent, beforeAsset), destinations)) {
        throw new AssetOperationConflictError("ASSET_CHANGED_DURING_OPERATION", "Asset status changed while this request was being saved. Reload the asset and try again.")
      }
      if (destinations.toCustodianId) {
        const block = getCheckoutConditionBlock(beforeAsset.condition?.name)
        if (block) throw new TransferConditionBlockedError(block)
      }
      const { nextDepartmentId } = await checkTransferDestinations(tx, { ownership: normalizeAssetOwnershipType(beforeAsset.ownershipType), current: beforeAsset, destinations })

      const fromSnapshot: TransferSnapshot = {
        locationId: beforeAsset.currentLocationId,
        custodianId: beforeAsset.custodianId,
        departmentId: beforeAsset.departmentId,
        statusId: beforeAsset.statusId,
      }
      const toSnapshot: TransferSnapshot = {
        locationId: destinations.toLocationId ?? beforeAsset.currentLocationId,
        custodianId: destinations.toCustodianId ?? beforeAsset.custodianId,
        departmentId: nextDepartmentId,
        statusId: targetStatusId,
      }
      const transferId = randomUUID()
      const documentNo = await generateTransferDocumentNo(tx, new Date())

      const afterAsset = await tx.asset.update({
        where: { id },
        data: {
          currentLocationId: toSnapshot.locationId,
          custodianId: toSnapshot.custodianId,
          departmentId: toSnapshot.departmentId,
          statusId: toSnapshot.statusId,
          updatedBy: user.id,
        },
        select: {
          id: true,
          updatedAt: true,
          statusId: true,
          conditionId: true,
          branchId: true,
          currentLocationId: true,
          custodianId: true,
          departmentId: true,
        },
      })

      await tx.assetMovement.create({
        data: {
          assetId: id,
          movementType: "transfer",
          fromValue: JSON.stringify(fromSnapshot),
          toValue: JSON.stringify(toSnapshot),
          reason: input.reason,
          referenceType: "transfer",
          referenceId: transferId,
          performedBy: user.id,
          remark: input.remark,
        },
      })
      // Spec §6 call 6. The line carries the TR-'s reference, so cancelling the TR- does not count it as later work.
      // Nothing writes the asset after afterAsset, or every TR- would read asset_changed (P3-R7).
      if (nextDepartmentId !== beforeAsset.departmentId) await tx.assetMovement.create({ data: { assetId: id, movementType: "department_change", fromValue: beforeAsset.departmentId, toValue: nextDepartmentId, reason: "Asset transfer", referenceType: "transfer", referenceId: transferId, performedBy: user.id } })

      const componentSync = await syncInstalledComponentsWithParent(tx, {
        parentAssetId: id,
        changes: {
          currentLocationId: toSnapshot.locationId,
          custodianId: toSnapshot.custodianId,
          departmentId: toSnapshot.departmentId,
        },
        movementType: "parent_transfer_sync",
        referenceType: "transfer",
        referenceId: transferId,
        performedBy: user.id,
        reason: input.reason,
        remark: input.remark,
        captureSnapshots: true,
      })

      const beforeTransactionSnapshot = createAssetTransactionSnapshot({
        asset: beforeAsset,
        checkout: null,
        components: componentSync.componentSnapshots.map((change) => change.before),
      })
      const afterTransactionSnapshot = createAssetTransactionSnapshot({
        asset: afterAsset,
        checkout: null,
        components: componentSync.componentSnapshots.map((change) => change.after),
      })
      const transfer = await tx.assetTransfer.create({
        data: {
          id: transferId,
          documentNo,
          assetId: id,
          reason: input.reason,
          remark: input.remark,
          beforeSnapshotJson: serializeAssetTransactionSnapshot(beforeTransactionSnapshot),
          afterSnapshotJson: serializeAssetTransactionSnapshot(afterTransactionSnapshot),
          componentSnapshotJson: serializeAssetComponentTransactionSnapshots(componentSync.componentSnapshots),
          createdBy: user.id,
        },
      })
      const componentSyncSummary = {
        updated: componentSync.updated,
        skipped: componentSync.skipped,
        movements: componentSync.movements,
      }

      return { transfer, componentSync: componentSyncSummary, fromSnapshot, toSnapshot }
    })

    await logAudit({
      userId: user.id,
      action: "transfer",
      module: "asset",
      recordId: id,
      oldValue: fromSnapshot,
      newValue: { ...toSnapshot, reason: input.reason, remark: input.remark, componentSync, previousDepartmentId: fromSnapshot.departmentId },
    })

    return NextResponse.json(transfer, { status: 201 })
  } catch (error) {
    if (error instanceof AssetComponentOutstandingError) {
      return NextResponse.json({ code: error.code, error: error.code, fieldErrors: { assetId: "componentOutstanding" } }, { status: 409 })
    }
    if (error instanceof TransferConditionBlockedError) return conditionBlockedResponse(error.block)
    if (error instanceof TransferDepartmentLockedError) return departmentLockedResponse()
    if (error instanceof TransferDestinationInactiveError) return destinationInactiveResponse(error.fields)
    if (error instanceof AssetOperationConflictError) {
      return NextResponse.json({ code: error.code, error: error.message }, { status: 409 })
    }
    return errorResponse(error, 400)
  }
}

type TransferDestinationField = "toLocationId" | "toCustodianId" | "toDepartmentId"

// The checkout field words fit the transfer word for word; the code is the transfer's own (P3-R6).
const DESTINATION_INACTIVE_KEYS: Record<TransferDestinationField, string> = {
  toLocationId: "checkoutLocationInactive",
  toCustodianId: "checkoutReceiverInactive",
  toDepartmentId: "checkoutDepartmentInactive",
}

const CONDITION_BLOCKED_KEYS: Record<CheckoutConditionBlock, string> = {
  damaged: "transferConditionDamaged",
  nonFunctional: "transferConditionNonFunctional",
  salvage: "transferConditionSalvage",
}

// The rows the department rule (spec §6, P3-R3) and the active check (P3-R6) need. The current holder is read without
// isActive, because one who has left still decides the department. The lock is refused before the inactive fields
// (P3-R5). A locked department is never read for isActive, because an inactive department on an active employee is
// written as it is (call 5). It is called before the transaction and again inside it.
async function checkTransferDestinations(
  db: Pick<Prisma.TransactionClient, "employee" | "department" | "location">,
  input: { ownership: AssetOwnershipType; current: { custodianId: string | null; departmentId: string | null }; destinations: TransferDestinations },
): Promise<{ nextDepartmentId: string | null }> {
  const { ownership, current, destinations } = input
  const source = getTransferDepartmentSource({ ownership, currentCustodianId: current.custodianId, newCustodianId: destinations.toCustodianId })
  const holder = source === "currentHolder" && current.custodianId
    ? await db.employee.findUnique({ where: { id: current.custodianId }, select: { departmentId: true } })
    : null
  const newHolder = destinations.toCustodianId
    ? await db.employee.findFirst({ where: { id: destinations.toCustodianId, isActive: true }, select: { departmentId: true } })
    : null
  const room = destinations.toLocationId
    ? await db.location.findFirst({ where: { id: destinations.toLocationId, isActive: true }, select: { id: true } })
    : null
  const department = source === "free" && destinations.toDepartmentId
    ? await db.department.findFirst({ where: { id: destinations.toDepartmentId, isActive: true }, select: { id: true } })
    : null

  const nextDepartmentId = getTransferNextDepartmentId({
    ownership,
    currentCustodianId: current.custodianId,
    newCustodianId: destinations.toCustodianId,
    currentDepartmentId: current.departmentId,
    currentHolderDepartmentId: holder?.departmentId ?? null,
    newHolderDepartmentId: newHolder?.departmentId ?? null,
    chosenDepartmentId: destinations.toDepartmentId,
  })
  if (source !== "free" && destinations.toDepartmentId !== null && destinations.toDepartmentId !== nextDepartmentId) {
    throw new TransferDepartmentLockedError()
  }

  const fields: TransferDestinationField[] = []
  if (destinations.toLocationId && !room) fields.push("toLocationId")
  if (destinations.toCustodianId && !newHolder) fields.push("toCustodianId")
  if (source === "free" && destinations.toDepartmentId && !department) fields.push("toDepartmentId")
  if (fields.length > 0) throw new TransferDestinationInactiveError(fields)
  return { nextDepartmentId }
}

class TransferConditionBlockedError extends Error {
  readonly block: CheckoutConditionBlock

  constructor(block: CheckoutConditionBlock) {
    super("ASSET_TRANSFER_CONDITION_BLOCKED")
    this.name = "TransferConditionBlockedError"
    this.block = block
  }
}

class TransferDepartmentLockedError extends Error {
  constructor() {
    super("ASSET_TRANSFER_DEPARTMENT_LOCKED")
    this.name = "TransferDepartmentLockedError"
  }
}

class TransferDestinationInactiveError extends Error {
  readonly fields: TransferDestinationField[]

  constructor(fields: TransferDestinationField[]) {
    super("ASSET_TRANSFER_DESTINATION_INACTIVE")
    this.name = "TransferDestinationInactiveError"
    this.fields = fields
  }
}

function noTransferChangeResponse() {
  return NextResponse.json({ error: "Invalid request data", code: "VALIDATION_FAILED", fieldErrors: { toLocationId: "transferDestinationRequired" } }, { status: 400 })
}

function conditionBlockedResponse(block: CheckoutConditionBlock) {
  return NextResponse.json({ code: "ASSET_TRANSFER_CONDITION_BLOCKED", error: "ASSET_TRANSFER_CONDITION_BLOCKED", fieldErrors: { assetId: CONDITION_BLOCKED_KEYS[block] } }, { status: 409 })
}

// No field, because the department row is disabled on the form and cannot take focus; the form toasts and reads the
// asset again (P3-R5, P3-R15).
function departmentLockedResponse() {
  return NextResponse.json({ code: "ASSET_TRANSFER_DEPARTMENT_LOCKED", error: "ASSET_TRANSFER_DEPARTMENT_LOCKED" }, { status: 409 })
}

function destinationInactiveResponse(fields: TransferDestinationField[]) {
  return NextResponse.json({
    code: "ASSET_TRANSFER_DESTINATION_INACTIVE",
    error: "ASSET_TRANSFER_DESTINATION_INACTIVE",
    fieldErrors: Object.fromEntries(fields.map((field) => [field, DESTINATION_INACTIVE_KEYS[field]])),
  }, { status: 409 })
}
