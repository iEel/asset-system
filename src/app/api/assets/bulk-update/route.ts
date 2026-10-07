import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { requireAuth, requirePermission } from "@/lib/auth-utils"
import { errorResponse } from "@/lib/api-response"
import { assetBulkUpdateSchema } from "@/lib/validations/asset-operations"
import { syncInstalledComponentsWithParent } from "@/lib/asset-component-sync"
import { getBulkCustodyChangeError } from "@/lib/asset-custody-policy"
import { getTransferTargetStatusName } from "@/lib/asset-lifecycle-policy"
import { getRequiredAssetStatusId } from "@/lib/asset-status-flow"
import { AssetOperationConflictError } from "@/lib/asset-operation-claim"

export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth()
    requirePermission(user, "asset", "edit")

    const input = assetBulkUpdateSchema.parse(await request.json())
    const uniqueAssetIds = Array.from(new Set(input.assetIds))
    const assets = await prisma.asset.findMany({
      where: { id: { in: uniqueAssetIds }, isActive: true },
      select: {
        id: true,
        assetTag: true,
        statusId: true,
        currentLocationId: true,
        custodianId: true,
        status: { select: { name: true } },
      },
    })

    if (assets.length !== uniqueAssetIds.length) {
      return NextResponse.json({ error: "Some assets were not found" }, { status: 404 })
    }

    const activeCheckoutAssetIds = new Set(
      (await prisma.assetCheckout.findMany({
        where: { assetId: { in: uniqueAssetIds }, isReturned: false, transactionStatus: "active" },
        select: { assetId: true },
      })).map((checkout) => checkout.assetId),
    )
    const blocked = assets.flatMap((asset) => {
      const code = getBulkCustodyChangeError({
        statusName: asset.status.name,
        hasActiveCheckout: activeCheckoutAssetIds.has(asset.id),
        changesCustodian: Boolean(input.toCustodianId),
      })
      return code ? [{ assetId: asset.id, assetTag: asset.assetTag, code }] : []
    })
    if (blocked.length > 0) {
      return NextResponse.json({
        code: blocked[0].code,
        error: "Some assets cannot be updated in bulk. Use the transfer, return, or disposal workflow for them.",
        blocked,
      }, { status: 409 })
    }

    const targetStatusName = getTransferTargetStatusName(input.toCustodianId)
    const targetStatusId = targetStatusName ? await getRequiredAssetStatusId(targetStatusName) : null

    if (input.toLocationId) {
      const location = await prisma.location.findFirst({
        where: { id: input.toLocationId, isActive: true },
        select: { id: true },
      })
      if (!location) return NextResponse.json({ error: "Location not found" }, { status: 404 })
    }

    if (input.toCustodianId) {
      const custodian = await prisma.employee.findFirst({
        where: { id: input.toCustodianId, isActive: true },
        select: { id: true },
      })
      if (!custodian) return NextResponse.json({ error: "Custodian not found" }, { status: 404 })
    }

    const result = await prisma.$transaction(async (tx) => {
      const updateData = {
        ...(input.toLocationId ? { currentLocationId: input.toLocationId } : {}),
        ...(input.toCustodianId ? { custodianId: input.toCustodianId } : {}),
        updatedBy: user.id,
      }
      const componentSyncChanges = {
        ...(input.toLocationId ? { currentLocationId: input.toLocationId } : {}),
        ...(input.toCustodianId ? { custodianId: input.toCustodianId } : {}),
      }

      for (const asset of assets) {
        const claim = await tx.asset.updateMany({
          where: { id: asset.id, isActive: true, statusId: asset.statusId },
          data: { ...updateData, ...(targetStatusId ? { statusId: targetStatusId } : {}) },
        })
        if (claim.count !== 1) {
          throw new AssetOperationConflictError(
            "ASSET_CHANGED_DURING_OPERATION",
            "Asset status changed while this request was being saved. Reload the asset and try again.",
          )
        }
      }

      const movementRows = assets.flatMap((asset) => {
        const rows = []
        if (input.toLocationId && asset.currentLocationId !== input.toLocationId) {
          rows.push({
            assetId: asset.id,
            movementType: "bulk_location_update",
            fromValue: asset.currentLocationId,
            toValue: input.toLocationId,
            reason: input.reason,
            referenceType: "bulk_update",
            referenceId: "bulk_update",
            performedBy: user.id,
            remark: input.remark,
          })
        }
        if (input.toCustodianId && asset.custodianId !== input.toCustodianId) {
          rows.push({
            assetId: asset.id,
            movementType: "bulk_custodian_update",
            fromValue: asset.custodianId,
            toValue: input.toCustodianId,
            reason: input.reason,
            referenceType: "bulk_update",
            referenceId: "bulk_update",
            performedBy: user.id,
            remark: input.remark,
          })
        }
        return rows
      })

      if (movementRows.length > 0) {
        await tx.assetMovement.createMany({ data: movementRows })
      }

      const componentSync = { updated: 0, skipped: 0, movements: 0 }
      for (const asset of assets) {
        const result = await syncInstalledComponentsWithParent(tx, {
          parentAssetId: asset.id,
          changes: componentSyncChanges,
          movementType: "parent_bulk_update_sync",
          referenceType: "bulk_update",
          referenceId: "bulk_update",
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
          action: "bulk_update",
          module: "asset",
          recordId: asset.id,
          oldValue: JSON.stringify({
            currentLocationId: asset.currentLocationId,
            custodianId: asset.custodianId,
          }),
          newValue: JSON.stringify({
            currentLocationId: input.toLocationId ?? asset.currentLocationId,
            custodianId: input.toCustodianId ?? asset.custodianId,
            reason: input.reason,
            remark: input.remark,
          }),
          remark: input.reason,
        })),
      })

      return { updated: assets.length, movements: movementRows.length, componentSync }
    })

    return NextResponse.json(result)
  } catch (error) {
    if (error instanceof AssetOperationConflictError) {
      return NextResponse.json({ code: error.code, error: error.message }, { status: 409 })
    }
    return errorResponse(error, 400)
  }
}
