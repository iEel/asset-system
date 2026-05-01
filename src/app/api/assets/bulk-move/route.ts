import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { requireAuth, requirePermission } from "@/lib/auth-utils"
import { errorResponse } from "@/lib/api-response"
import { assetBulkMoveSchema } from "@/lib/validations/asset-operations"

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
        currentLocationId: true,
        assetTag: true,
        name: true,
      },
    })

    if (assets.length !== uniqueAssetIds.length) {
      return NextResponse.json({ error: "Some assets were not found" }, { status: 404 })
    }

    const activeCheckouts = await prisma.assetCheckout.findMany({
      where: { assetId: { in: uniqueAssetIds }, isReturned: false },
      select: { assetId: true },
    })
    if (activeCheckouts.length > 0) {
      return NextResponse.json({ error: "Some assets already have active checkouts" }, { status: 400 })
    }

    const result = await prisma.$transaction(async (tx) => {
      for (const asset of assets) {
        await tx.asset.update({
          where: { id: asset.id },
          data: {
            currentLocationId: input.toLocationId,
            updatedBy: user.id,
          },
        })
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

      return { updated: assets.length }
    })

    return NextResponse.json(result)
  } catch (error) {
    return errorResponse(error, 400)
  }
}
