import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { requireAuth, requirePermission } from "@/lib/auth-utils"
import { errorResponse } from "@/lib/api-response"
import { assetBulkUpdateSchema } from "@/lib/validations/asset-operations"
import { syncInstalledComponentsWithParent } from "@/lib/asset-component-sync"

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
        currentLocationId: true,
        custodianId: true,
      },
    })

    if (assets.length !== uniqueAssetIds.length) {
      return NextResponse.json({ error: "Some assets were not found" }, { status: 404 })
    }

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
        await tx.asset.update({
          where: { id: asset.id },
          data: updateData,
        })
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
    return errorResponse(error, 400)
  }
}
