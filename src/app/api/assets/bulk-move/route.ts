import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { requireAuth, requirePermission } from "@/lib/auth-utils"
import { errorResponse } from "@/lib/api-response"
import { assetBulkMoveSchema } from "@/lib/validations/asset-operations"
import { syncInstalledComponentsWithParent } from "@/lib/asset-component-sync"
import { getBulkCustodyChangeError } from "@/lib/asset-custody-policy"
import { AssetOperationConflictError } from "@/lib/asset-operation-claim"

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
        status: { select: { name: true } },
      },
    })

    if (assets.length !== uniqueAssetIds.length) {
      return NextResponse.json({ error: "Some assets were not found" }, { status: 404 })
    }

    const activeCheckouts = await prisma.assetCheckout.findMany({
      where: { assetId: { in: uniqueAssetIds }, isReturned: false, transactionStatus: "active" },
      select: { assetId: true },
    })
    if (activeCheckouts.length > 0) {
      return NextResponse.json({ error: "Some assets already have active checkouts" }, { status: 400 })
    }

    const blocked = assets.flatMap((asset) => {
      const code = getBulkCustodyChangeError({ statusName: asset.status.name, hasActiveCheckout: false, changesCustodian: false })
      return code ? [{ assetId: asset.id, assetTag: asset.assetTag, code }] : []
    })
    if (blocked.length > 0) {
      return NextResponse.json({
        code: blocked[0].code,
        error: "Disposed or retired assets cannot be moved.",
        blocked,
      }, { status: 409 })
    }

    const result = await prisma.$transaction(async (tx) => {
      for (const asset of assets) {
        const claim = await tx.asset.updateMany({
          where: { id: asset.id, isActive: true, statusId: asset.statusId },
          data: {
            currentLocationId: input.toLocationId,
            updatedBy: user.id,
          },
        })
        if (claim.count !== 1) {
          throw new AssetOperationConflictError(
            "ASSET_CHANGED_DURING_OPERATION",
            "Asset status changed while this request was being saved. Reload the asset and try again.",
          )
        }
      }

      await tx.assetMovement.createMany({
        data: assets.map((asset) => ({
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
      for (const asset of assets) {
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
        data: assets.map((asset) => ({
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

      return { updated: assets.length, componentSync }
    })

    return NextResponse.json(result)
  } catch (error) {
    if (error instanceof AssetOperationConflictError) {
      return NextResponse.json({ code: error.code, error: error.message }, { status: 409 })
    }
    return errorResponse(error, 400)
  }
}
