import { NextRequest, NextResponse } from "next/server"
import type { Prisma } from "@prisma/client"
import { prisma } from "@/lib/db"
import { requireAuth, requirePermission } from "@/lib/auth-utils"
import { errorResponse } from "@/lib/api-response"
import { assetBulkMoveSchema } from "@/lib/validations/asset-operations"
import { syncInstalledComponentsWithParent } from "@/lib/asset-component-sync"
import { getBulkCustodyChangeError } from "@/lib/asset-custody-policy"
import {
  AssetComponentOutstandingError,
  AssetOperationConflictError,
  assertNoOutstandingComponentLinks,
  readOutstandingComponentLinks,
} from "@/lib/asset-operation-claim"
import { getAssetOperationOwnershipRefusal } from "@/lib/asset-operation-eligibility"
import { bulkMoveBlockedOrder, type BulkMoveBlockedCode } from "@/lib/bulk-move-blocked"
import { withDeadlockRetry } from "@/lib/transaction-retry"

// Up to 100 claims and syncs over the VPN can pass Prisma's 5 s default; unmeasured (plan 4 P4-R16).
const bulkMoveTransactionOptions = { maxWait: 10_000, timeout: 60_000 } as const

export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth()
    requirePermission(user, "asset", "edit")

    const input = assetBulkMoveSchema.parse(await request.json())
    const uniqueAssetIds = Array.from(new Set(input.assetIds))
    const assets = await prisma.asset.findMany({
      where: { id: { in: uniqueAssetIds }, isActive: true },
      select: {
        id: true,
        statusId: true,
        currentLocationId: true,
        assetTag: true,
        name: true,
        ownershipType: true,
        status: { select: { name: true } },
      },
    })

    const assetsById = new Map(assets.map((asset) => [asset.id, asset]))
    // An id ticked while active and deactivated or deleted since is named, not an unnamed 404: no list page shows it
    // again, so only its name lets นำรายการที่ย้ายไม่ได้ออก untick it. Its tag is read without the active filter; an id
    // with no row reads as its own tag (plan 4 final review server-3, journeys-1).
    const missingIds = uniqueAssetIds.filter((id) => !assetsById.has(id))
    const missingTags = missingIds.length > 0
      ? new Map((await prisma.asset.findMany({ where: { id: { in: missingIds } }, select: { id: true, assetTag: true } })).map((row) => [row.id, row.assetTag]))
      : new Map<string, string>()
    const notActive = missingIds.map((assetId) => ({ assetId, assetTag: missingTags.get(assetId) ?? assetId, code: "ASSET_NOT_ACTIVE" as const }))

    // The checks run in this order (group 3 plan 4 Task 3): auth and asset:edit, the schema (at most 100), dedupe, the
    // active-asset read, the outstanding and open-handover reads, one 409 naming every refused asset (an id no longer
    // active first), the room, the split of the assets already in the room, then the transaction. An asset refusal comes
    // before the room, as in transfer. Every id is looked at, one already in the room included, so a refused asset there
    // is still named.
    const ordered = uniqueAssetIds.flatMap((id) => {
      const asset = assetsById.get(id)
      return asset ? [asset] : []
    })
    // Every reason is read before any refusal, so one answer names every refused asset (group 3 spec §10.2; plan 4 P4-R4, P4-R5).
    const [outstanding, activeCheckouts] = await Promise.all([
      readOutstandingComponentLinks(prisma, uniqueAssetIds),
      prisma.assetCheckout.findMany({
        where: { assetId: { in: uniqueAssetIds }, isReturned: false, transactionStatus: "active" },
        select: { assetId: true },
      }),
    ])
    const outstandingIds = new Set(outstanding.map((row) => row.assetId))
    const openIds = new Set(activeCheckouts.map((row) => row.assetId))
    // Sorted by the code's place in bulkMoveBlockedOrder; Array.prototype.sort is stable, so request order holds within a code.
    const blocked = [
      ...notActive,
      ...ordered.flatMap((asset) => {
        const code = bulkMoveRefusal(asset, { outstanding: outstandingIds.has(asset.id), openCheckout: openIds.has(asset.id) })
        return code ? [{ assetId: asset.id, assetTag: asset.assetTag, code }] : []
      }),
    ]
      .sort((left, right) => bulkMoveBlockedOrder.indexOf(left.code) - bulkMoveBlockedOrder.indexOf(right.code))
    if (blocked.length > 0) {
      return NextResponse.json({ code: blocked[0].code, error: blocked[0].code, blocked }, { status: 409 })
    }

    await assertActiveDestination(prisma, input.toLocationId)

    // An asset already in the room is unchanged: no claim, movement, log or sync (group 3 spec §10.2; plan 4 P4-R15).
    const moving = ordered.filter((asset) => asset.currentLocationId !== input.toLocationId)
    const unchangedIds = ordered.filter((asset) => asset.currentLocationId === input.toLocationId).map((asset) => asset.id)
    const unchanged = unchangedIds.length
    if (moving.length === 0) {
      return NextResponse.json({ updated: 0, unchanged, componentSync: { updated: 0, skipped: 0, movements: 0 } })
    }
    const movingIds = moving.map((asset) => asset.id)
    // The claims lock rows in id order, whatever the tick order, so two bulk moves over the same assets wait for each
    // other instead of deadlocking (plan 4 final review server-4). The answer, the movements and the logs keep `moving`.
    const claimOrder = [...moving].sort((left, right) => (left.id < right.id ? -1 : left.id > right.id ? 1 : 0))

    // A deadlock victim was rolled back whole, so it runs again (plan 4 final review server-4).
    const result = await withDeadlockRetry(() => prisma.$transaction(async (tx) => {
      await assertActiveDestination(tx, input.toLocationId)
      // An asset counted unchanged must still be in the room: another request that moved it out meanwhile makes the
      // answer wrong, so the save is refused as changed (plan 4 final review server-1).
      if (unchangedIds.length > 0) {
        const stillThere = await tx.asset.findMany({
          where: { id: { in: unchangedIds }, isActive: true, currentLocationId: input.toLocationId },
          select: { id: true },
        })
        if (stillThere.length !== unchangedIds.length) throw assetChangedError()
      }
      // Every claim runs before the first component sync, so a ticked component moves by its own claim and its parent's
      // sync finds it already in the room (plan 4 P4-R3). A claim writes only the room and who moved it (Z22). It
      // matches the room read before the transaction too, so an asset another request moved meanwhile is refused as
      // changed, not logged from a room it had left (plan 4 final review server-1). No claim in this transaction changes
      // another asset's room before the syncs, so the room each claim matches is the one read.
      for (const asset of claimOrder) {
        const claim = await tx.asset.updateMany({
          where: { id: asset.id, isActive: true, statusId: asset.statusId, currentLocationId: asset.currentLocationId },
          data: {
            currentLocationId: input.toLocationId,
            updatedBy: user.id,
          },
        })
        if (claim.count !== 1) throw assetChangedError()
      }
      await assertNoOutstandingComponentLinks(tx, movingIds)
      // A handover opened meanwhile (a legacy backfill keeps the status In Use, so the claim still matches) is named
      // like the read before the transaction names one (plan 4 final review server-2).
      const openedMeanwhile = await tx.assetCheckout.findMany({
        where: { assetId: { in: movingIds }, isReturned: false, transactionStatus: "active" },
        select: { assetId: true },
      })
      if (openedMeanwhile.length > 0) {
        const openIds = new Set(openedMeanwhile.map((row) => row.assetId))
        throw new BulkMoveOpenCheckoutError(moving.filter((asset) => openIds.has(asset.id)).map((asset) => ({ assetId: asset.id, assetTag: asset.assetTag })))
      }

      await tx.assetMovement.createMany({
        data: moving.map((asset) => ({
          assetId: asset.id,
          movementType: "bulk_location_move",
          fromValue: asset.currentLocationId,
          toValue: input.toLocationId,
          reason: input.reason,
          referenceType: "bulk_move",
          referenceId: "bulk_move",
          performedBy: user.id,
          remark: input.remark,
        })),
      })

      const componentSync = { updated: 0, skipped: 0, movements: 0 }
      for (const asset of moving) {
        const result = await syncInstalledComponentsWithParent(tx, {
          parentAssetId: asset.id,
          changes: { currentLocationId: input.toLocationId },
          movementType: "parent_bulk_move_sync",
          referenceType: "bulk_move",
          referenceId: "bulk_move",
          performedBy: user.id,
          reason: input.reason,
          remark: input.remark,
        })
        componentSync.updated += result.updated
        componentSync.skipped += result.skipped
        componentSync.movements += result.movements
      }

      await tx.systemLog.createMany({
        data: moving.map((asset) => ({
          userId: user.id,
          action: "bulk_move",
          module: "asset",
          recordId: asset.id,
          oldValue: JSON.stringify({ currentLocationId: asset.currentLocationId }),
          newValue: JSON.stringify({
            currentLocationId: input.toLocationId,
            reason: input.reason,
            remark: input.remark,
          }),
          remark: input.reason,
        })),
      })

      return { updated: moving.length, unchanged, componentSync }
    }, bulkMoveTransactionOptions))

    return NextResponse.json(result)
  } catch (error) {
    if (error instanceof AssetComponentOutstandingError || error instanceof BulkMoveOpenCheckoutError) {
      return NextResponse.json({
        code: error.code,
        error: error.code,
        blocked: error.blocked.map((row) => ({ ...row, code: error.code })),
      }, { status: 409 })
    }
    if (error instanceof BulkMoveDestinationInactiveError) {
      return NextResponse.json({
        code: "ASSET_TRANSFER_DESTINATION_INACTIVE",
        error: "ASSET_TRANSFER_DESTINATION_INACTIVE",
        fieldErrors: { toLocationId: "checkoutLocationInactive" },
      }, { status: 409 })
    }
    if (error instanceof AssetOperationConflictError) {
      return NextResponse.json({ code: error.code, error: error.message }, { status: 409 })
    }
    return errorResponse(error, 400)
  }
}

// One code per asset, its first reason in getBulkMoveVerdict's order (plan 4 P4-R4): outstanding, License, open
// handover, written off.
function bulkMoveRefusal(
  asset: { ownershipType: string; status: { name: string } },
  facts: { outstanding: boolean; openCheckout: boolean },
): BulkMoveBlockedCode | null {
  if (facts.outstanding) return "ASSET_COMPONENT_OUTSTANDING"
  if (getAssetOperationOwnershipRefusal("move", asset.ownershipType) === "ASSET_LICENSE_MOVE_NOT_ALLOWED") {
    return "ASSET_LICENSE_MOVE_NOT_ALLOWED"
  }
  const code = getBulkCustodyChangeError({ statusName: asset.status.name, hasActiveCheckout: facts.openCheckout, changesCustodian: false })
  return code === "ASSET_ACTIVE_CHECKOUT_EXISTS" || code === "ASSET_STATUS_TRANSFER_NOT_ALLOWED" ? code : null
}

// The room read of transfer's checkTransferDestinations; before the transaction and inside it (plan 4 P4-R14). An
// unknown room is refused as an inactive one.
async function assertActiveDestination(db: Pick<Prisma.TransactionClient, "location">, toLocationId: string): Promise<void> {
  const location = await db.location.findFirst({ where: { id: toLocationId, isActive: true }, select: { id: true } })
  if (!location) throw new BulkMoveDestinationInactiveError()
}

function assetChangedError(): AssetOperationConflictError {
  return new AssetOperationConflictError(
    "ASSET_CHANGED_DURING_OPERATION",
    "Asset status changed while this request was being saved. Reload the asset and try again.",
  )
}

// Shaped like AssetComponentOutstandingError: the catch names each asset with the code (plan 4 final review server-2).
class BulkMoveOpenCheckoutError extends Error {
  readonly code = "ASSET_ACTIVE_CHECKOUT_EXISTS"
  readonly blocked: Array<{ assetId: string; assetTag: string }>

  constructor(blocked: Array<{ assetId: string; assetTag: string }>) {
    super("ASSET_ACTIVE_CHECKOUT_EXISTS")
    this.name = "BulkMoveOpenCheckoutError"
    this.blocked = blocked
  }
}

class BulkMoveDestinationInactiveError extends Error {
  readonly code = "ASSET_TRANSFER_DESTINATION_INACTIVE"

  constructor() {
    super("ASSET_TRANSFER_DESTINATION_INACTIVE")
    this.name = "BulkMoveDestinationInactiveError"
  }
}
