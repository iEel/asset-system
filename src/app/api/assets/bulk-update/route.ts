import { randomUUID } from "node:crypto"
import { NextRequest, NextResponse } from "next/server"
import type { Prisma } from "@prisma/client"
import { prisma } from "@/lib/db"
import { requireAuth, requirePermission } from "@/lib/auth-utils"
import { errorResponse } from "@/lib/api-response"
import { assetBulkUpdateSchema } from "@/lib/validations/asset-operations"
import { syncInstalledComponentsWithParent } from "@/lib/asset-component-sync"
import { getBulkCustodyChangeError } from "@/lib/asset-custody-policy"
import { getTransferNextDepartmentId } from "@/lib/asset-department-rule"
import { getTransferTargetStatusName } from "@/lib/asset-lifecycle-policy"
import { getRequiredAssetStatusId } from "@/lib/asset-status-flow"
import { normalizeAssetOwnershipType, type AssetOwnershipType } from "@/lib/asset-ownership"
import {
  AssetComponentOutstandingError,
  AssetOperationConflictError,
  assertNoOutstandingComponentLinks,
  readOutstandingComponentLinks,
} from "@/lib/asset-operation-claim"
import { getAssetOperationOwnershipRefusal } from "@/lib/asset-operation-eligibility"
import { bulkUpdateBlockedOrder, type BulkUpdateBlockedCode } from "@/lib/bulk-update-blocked"
import { withDeadlockRetry } from "@/lib/transaction-retry"

// A register bulk update is a data correction (group 4 decisions 3 and 11, spec §6.6; plan 1 P1-R1, P1-R5, P1-R6). It
// has bulk-move's shape: one 409 naming every refused asset, the destinations checked before and inside the transaction,
// claims in id order on the values read, re-reads after the claims, and a deadlock victim run again.

// Up to 100 claims and syncs over the VPN can pass Prisma's 5 s default, as bulk-move (group 3 plan 4 P4-R16).
const bulkUpdateTransactionOptions = { maxWait: 10_000, timeout: 60_000 } as const

type ReadAsset = {
  id: string
  assetTag: string
  statusId: string
  currentLocationId: string
  custodianId: string | null
  departmentId: string | null
  ownershipType: string
  status: { name: string }
}

type AssetPlan = {
  asset: ReadAsset
  ownership: AssetOwnershipType
  nextLocationId: string
  nextCustodianId: string | null
  nextDepartmentId: string | null
  nextStatusId: string
}

export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth()
    requirePermission(user, "asset", "edit")

    const input = assetBulkUpdateSchema.parse(await request.json())
    const toLocationId = input.toLocationId ?? null
    const toCustodianId = input.toCustodianId ?? null
    const changesCustodian = Boolean(toCustodianId)
    const uniqueAssetIds = Array.from(new Set(input.assetIds))
    const assets: ReadAsset[] = await prisma.asset.findMany({
      where: { id: { in: uniqueAssetIds }, isActive: true },
      select: {
        id: true,
        assetTag: true,
        statusId: true,
        currentLocationId: true,
        custodianId: true,
        departmentId: true,
        ownershipType: true,
        status: { select: { name: true } },
      },
    })

    const assetsById = new Map(assets.map((asset) => [asset.id, asset]))
    // An id no longer active is named with its tag, read without the active filter; an id with no row reads as its own
    // tag (as bulk-move, plan 4 final review server-3).
    const missingIds = uniqueAssetIds.filter((id) => !assetsById.has(id))
    const missingTags = missingIds.length > 0
      ? new Map((await prisma.asset.findMany({ where: { id: { in: missingIds } }, select: { id: true, assetTag: true } })).map((row) => [row.id, row.assetTag]))
      : new Map<string, string>()
    const notActive = missingIds.map((assetId) => ({ assetId, assetTag: missingTags.get(assetId) ?? assetId, code: "ASSET_NOT_ACTIVE" as const }))

    const ordered = uniqueAssetIds.flatMap((id) => {
      const asset = assetsById.get(id)
      return asset ? [asset] : []
    })
    // Every reason is read before any refusal, so one answer names every refused asset (P1-R1).
    const [outstanding, activeCheckouts] = await Promise.all([
      readOutstandingComponentLinks(prisma, uniqueAssetIds),
      prisma.assetCheckout.findMany({
        where: { assetId: { in: uniqueAssetIds }, isReturned: false, transactionStatus: "active" },
        select: { assetId: true },
      }),
    ])
    const outstandingIds = new Set(outstanding.map((row) => row.assetId))
    const openIds = new Set(activeCheckouts.map((row) => row.assetId))
    // Sorted by the code's place in bulkUpdateBlockedOrder; the sort is stable, so request order holds within a code.
    const blocked = [
      ...notActive,
      ...ordered.flatMap((asset) => {
        const code = bulkUpdateRefusal(asset, { outstanding: outstandingIds.has(asset.id), openCheckout: openIds.has(asset.id), changesCustodian })
        return code ? [{ assetId: asset.id, assetTag: asset.assetTag, code }] : []
      }),
    ]
      .sort((left, right) => bulkUpdateBlockedOrder.indexOf(left.code) - bulkUpdateBlockedOrder.indexOf(right.code))
    if (blocked.length > 0) {
      return NextResponse.json({ code: blocked[0].code, error: blocked[0].code, blocked }, { status: 409 })
    }

    await readDestinations(prisma, { toLocationId, toCustodianId })

    // A new holder sets In Use only on บุคคล and Stock (spec §6.6); the other types keep their status.
    const targetStatusName = getTransferTargetStatusName(toCustodianId)
    const targetStatusId = targetStatusName ? await getRequiredAssetStatusId(targetStatusName) : null
    // One batch reference for the movements and the component syncs of this save (P1-R5).
    const referenceId = randomUUID()

    // A deadlock victim was rolled back whole, so it runs again (as bulk-move, plan 4 final review server-4).
    const result = await withDeadlockRetry(() => prisma.$transaction(async (tx) => {
      // The employee is read here, active, with the department the rule needs (spec §6.6).
      const { newHolderDepartmentId } = await readDestinations(tx, { toLocationId, toCustodianId })
      // The current holder decides the department of a room-only save; one who has left still does, so the read has no
      // active filter (as transfer's checkTransferDestinations).
      const currentHolderIds = toCustodianId
        ? []
        : Array.from(new Set(ordered.flatMap((asset) => (asset.custodianId ? [asset.custodianId] : []))))
      const currentHolderDepartments = currentHolderIds.length > 0
        ? new Map((await tx.employee.findMany({ where: { id: { in: currentHolderIds } }, select: { id: true, departmentId: true } })).map((row) => [row.id, row.departmentId]))
        : new Map<string, string | null>()

      const plans: AssetPlan[] = ordered.map((asset) => {
        const ownership = normalizeAssetOwnershipType(asset.ownershipType)
        const nextDepartmentId = getTransferNextDepartmentId({
          ownership,
          currentCustodianId: asset.custodianId,
          newCustodianId: toCustodianId,
          currentDepartmentId: asset.departmentId,
          currentHolderDepartmentId: asset.custodianId ? currentHolderDepartments.get(asset.custodianId) ?? null : null,
          newHolderDepartmentId,
          chosenDepartmentId: null,
        })
        const followsHolder = ownership === "personal" || ownership === "stock"
        return {
          asset,
          ownership,
          nextLocationId: toLocationId ?? asset.currentLocationId,
          nextCustodianId: toCustodianId ?? asset.custodianId,
          nextDepartmentId,
          nextStatusId: targetStatusId && followsHolder ? targetStatusId : asset.statusId,
        }
      })
      const changing = plans.filter(planChanges)
      const unchangedIds = plans.filter((plan) => !planChanges(plan)).map((plan) => plan.asset.id)
      const unchanged = unchangedIds.length

      // An asset counted unchanged must still hold the values read; another request that changed it meanwhile makes the
      // answer wrong, so the save is refused as changed (as bulk-move, plan 4 final review server-1).
      if (unchangedIds.length > 0) {
        const stillRows = await tx.asset.findMany({
          where: { id: { in: unchangedIds }, isActive: true },
          select: { id: true, statusId: true, currentLocationId: true, custodianId: true, departmentId: true },
        })
        const still = new Map(stillRows.map((row) => [row.id, row]))
        for (const id of unchangedIds) {
          const read = assetsById.get(id)
          const now = still.get(id)
          if (!read || !now || !sameCustody(read, now)) throw assetChangedError()
        }
      }
      if (changing.length === 0) {
        return { updated: 0, unchanged, movements: 0, componentSync: { updated: 0, skipped: 0, movements: 0 } }
      }

      // The claims lock rows in id order, whatever the tick order, so two saves over the same assets wait for each other
      // instead of deadlocking. Each matches the values read, so an asset another request changed meanwhile is refused
      // as changed, not recorded from values it no longer had.
      const claimOrder = [...changing].sort((left, right) => (left.asset.id < right.asset.id ? -1 : left.asset.id > right.asset.id ? 1 : 0))
      for (const plan of claimOrder) {
        const { asset } = plan
        const claim = await tx.asset.updateMany({
          where: {
            id: asset.id,
            isActive: true,
            statusId: asset.statusId,
            currentLocationId: asset.currentLocationId,
            custodianId: asset.custodianId,
            departmentId: asset.departmentId,
          },
          data: {
            ...(plan.nextLocationId !== asset.currentLocationId ? { currentLocationId: plan.nextLocationId } : {}),
            ...(plan.nextCustodianId !== asset.custodianId ? { custodianId: plan.nextCustodianId } : {}),
            ...(plan.nextDepartmentId !== asset.departmentId ? { departmentId: plan.nextDepartmentId } : {}),
            ...(plan.nextStatusId !== asset.statusId ? { statusId: plan.nextStatusId } : {}),
            updatedBy: user.id,
          },
        })
        if (claim.count !== 1) throw assetChangedError()
      }
      const changingIds = changing.map((plan) => plan.asset.id)
      await assertNoOutstandingComponentLinks(tx, changingIds)
      // A handover opened meanwhile is named like the read before the transaction names one (as bulk-move, server-2).
      const openedMeanwhile = await tx.assetCheckout.findMany({
        where: { assetId: { in: changingIds }, isReturned: false, transactionStatus: "active" },
        select: { assetId: true },
      })
      if (openedMeanwhile.length > 0) {
        const opened = new Set(openedMeanwhile.map((row) => row.assetId))
        throw new BulkUpdateOpenCheckoutError(changing.filter((plan) => opened.has(plan.asset.id)).map((plan) => ({ assetId: plan.asset.id, assetTag: plan.asset.assetTag })))
      }

      // The correction types of the edit page (spec §7.3, P1-R6), each with the typed reason; never department_change.
      const moved = { reason: input.reason, referenceType: "bulk_update", referenceId, performedBy: user.id, remark: input.remark }
      const movementRows: Prisma.AssetMovementCreateManyInput[] = changing.flatMap((plan) => {
        const { asset } = plan
        const rows: Prisma.AssetMovementCreateManyInput[] = []
        if (plan.nextLocationId !== asset.currentLocationId) {
          rows.push({ assetId: asset.id, movementType: "register_location_correction", fromValue: asset.currentLocationId, toValue: plan.nextLocationId, ...moved })
        }
        if (plan.nextCustodianId !== asset.custodianId) {
          rows.push({ assetId: asset.id, movementType: "register_custodian_correction", fromValue: asset.custodianId, toValue: plan.nextCustodianId, ...moved })
        }
        if (plan.nextDepartmentId !== asset.departmentId) {
          rows.push({ assetId: asset.id, movementType: "register_department_correction", fromValue: asset.departmentId, toValue: plan.nextDepartmentId, ...moved })
        }
        return rows
      })
      if (movementRows.length > 0) {
        await tx.assetMovement.createMany({ data: movementRows })
      }

      const componentSync = { updated: 0, skipped: 0, movements: 0 }
      for (const plan of changing) {
        const departmentChanged = plan.nextDepartmentId !== plan.asset.departmentId
        const componentSyncChanges = {
          ...(input.toLocationId ? { currentLocationId: input.toLocationId } : {}),
          ...(input.toCustodianId ? { custodianId: input.toCustodianId } : {}),
          ...(departmentChanged ? { departmentId: plan.nextDepartmentId } : {}),
        }
        const result = await syncInstalledComponentsWithParent(tx, {
          parentAssetId: plan.asset.id,
          changes: componentSyncChanges,
          movementType: "parent_bulk_update_sync",
          referenceType: "bulk_update",
          referenceId,
          performedBy: user.id,
          reason: input.reason,
          remark: input.remark,
        })
        componentSync.updated += result.updated
        componentSync.skipped += result.skipped
        componentSync.movements += result.movements
      }

      await tx.systemLog.createMany({
        data: changing.map((plan) => ({
          userId: user.id,
          action: "bulk_update",
          module: "asset",
          recordId: plan.asset.id,
          oldValue: JSON.stringify({
            currentLocationId: plan.asset.currentLocationId,
            custodianId: plan.asset.custodianId,
            departmentId: plan.asset.departmentId,
            statusId: plan.asset.statusId,
          }),
          newValue: JSON.stringify({
            currentLocationId: plan.nextLocationId,
            custodianId: plan.nextCustodianId,
            departmentId: plan.nextDepartmentId,
            statusId: plan.nextStatusId,
            referenceId,
            reason: input.reason,
            remark: input.remark,
          }),
          remark: input.reason,
        })),
      })

      return { updated: changing.length, unchanged, movements: movementRows.length, componentSync }
    }, bulkUpdateTransactionOptions))

    return NextResponse.json(result)
  } catch (error) {
    if (error instanceof AssetComponentOutstandingError || error instanceof BulkUpdateOpenCheckoutError) {
      return NextResponse.json({
        code: error.code,
        error: error.code,
        blocked: error.blocked.map((row) => ({ ...row, code: error.code })),
      }, { status: 409 })
    }
    if (error instanceof BulkUpdateDestinationInactiveError) {
      return NextResponse.json({
        code: "ASSET_TRANSFER_DESTINATION_INACTIVE",
        error: "ASSET_TRANSFER_DESTINATION_INACTIVE",
        fieldErrors: Object.fromEntries(error.fields.map((field) => [field, DESTINATION_INACTIVE_KEYS[field]])),
      }, { status: 409 })
    }
    if (error instanceof AssetOperationConflictError) {
      return NextResponse.json({ code: error.code, error: error.message }, { status: 409 })
    }
    return errorResponse(error, 400)
  }
}

// One code per asset, its first reason in bulk-move's order (P1-R1): outstanding, License, open handover, a status that
// cannot take the change. No condition block: correcting who holds a broken asset stays possible.
function bulkUpdateRefusal(
  asset: { ownershipType: string; status: { name: string } },
  facts: { outstanding: boolean; openCheckout: boolean; changesCustodian: boolean },
): BulkUpdateBlockedCode | null {
  if (facts.outstanding) return "ASSET_COMPONENT_OUTSTANDING"
  if (getAssetOperationOwnershipRefusal("move", asset.ownershipType) === "ASSET_LICENSE_MOVE_NOT_ALLOWED") {
    return "ASSET_LICENSE_MOVE_NOT_ALLOWED"
  }
  if (facts.openCheckout) return "ASSET_ACTIVE_CHECKOUT_EXISTS"
  const code = getBulkCustodyChangeError({ statusName: asset.status.name, hasActiveCheckout: false, changesCustodian: facts.changesCustodian })
  return code === "ASSET_STATUS_TRANSFER_NOT_ALLOWED" ? code : null
}

function planChanges(plan: AssetPlan): boolean {
  const { asset } = plan
  return plan.nextLocationId !== asset.currentLocationId
    || plan.nextCustodianId !== asset.custodianId
    || plan.nextDepartmentId !== asset.departmentId
    || plan.nextStatusId !== asset.statusId
}

function sameCustody(
  read: { statusId: string; currentLocationId: string; custodianId: string | null; departmentId: string | null },
  now: { statusId: string; currentLocationId: string; custodianId: string | null; departmentId: string | null },
): boolean {
  return read.statusId === now.statusId
    && read.currentLocationId === now.currentLocationId
    && read.custodianId === now.custodianId
    && read.departmentId === now.departmentId
}

type DestinationField = "toLocationId" | "toCustodianId"

// The checkout field words, as transfer's DESTINATION_INACTIVE_KEYS.
const DESTINATION_INACTIVE_KEYS: Record<DestinationField, string> = {
  toLocationId: "checkoutLocationInactive",
  toCustodianId: "checkoutReceiverInactive",
}

// The room and the employee, active; before the transaction and inside it. An unknown one is refused as an inactive one.
async function readDestinations(
  db: Pick<Prisma.TransactionClient, "location" | "employee">,
  input: { toLocationId: string | null; toCustodianId: string | null },
): Promise<{ newHolderDepartmentId: string | null }> {
  const room = input.toLocationId
    ? await db.location.findFirst({ where: { id: input.toLocationId, isActive: true }, select: { id: true } })
    : null
  const newHolder = input.toCustodianId
    ? await db.employee.findFirst({ where: { id: input.toCustodianId, isActive: true }, select: { id: true, departmentId: true } })
    : null
  const fields: DestinationField[] = []
  if (input.toLocationId && !room) fields.push("toLocationId")
  if (input.toCustodianId && !newHolder) fields.push("toCustodianId")
  if (fields.length > 0) throw new BulkUpdateDestinationInactiveError(fields)
  return { newHolderDepartmentId: newHolder?.departmentId ?? null }
}

function assetChangedError(): AssetOperationConflictError {
  return new AssetOperationConflictError(
    "ASSET_CHANGED_DURING_OPERATION",
    "Asset status changed while this request was being saved. Reload the asset and try again.",
  )
}

// Shaped like AssetComponentOutstandingError: the catch names each asset with the code.
class BulkUpdateOpenCheckoutError extends Error {
  readonly code = "ASSET_ACTIVE_CHECKOUT_EXISTS"
  readonly blocked: Array<{ assetId: string; assetTag: string }>

  constructor(blocked: Array<{ assetId: string; assetTag: string }>) {
    super("ASSET_ACTIVE_CHECKOUT_EXISTS")
    this.name = "BulkUpdateOpenCheckoutError"
    this.blocked = blocked
  }
}

class BulkUpdateDestinationInactiveError extends Error {
  readonly fields: DestinationField[]

  constructor(fields: DestinationField[]) {
    super("ASSET_TRANSFER_DESTINATION_INACTIVE")
    this.name = "BulkUpdateDestinationInactiveError"
    this.fields = fields
  }
}
