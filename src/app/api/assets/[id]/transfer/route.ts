import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { requireAuth, requirePermission } from "@/lib/auth-utils"
import { logAudit } from "@/lib/audit-log"
import { errorResponse } from "@/lib/api-response"
import { getAssetOperationStatusError } from "@/lib/asset-operation-policy"
import { syncInstalledComponentsWithParent } from "@/lib/asset-component-sync"
import { assetTransferSchema } from "@/lib/validations/asset-operations"

type TransferContext = {
  params: Promise<{ id: string }>
}

type TransferSnapshot = {
  locationId: string
  custodianId: string | null
  departmentId: string | null
}

export async function POST(request: NextRequest, context: TransferContext) {
  try {
    const user = await requireAuth()
    requirePermission(user, "asset", "edit")

    const { id } = await context.params
    const input = assetTransferSchema.parse(await request.json())
    const asset = await prisma.asset.findFirst({
      where: { id, isActive: true },
      include: { status: { select: { name: true, nameTh: true } } },
    })
    if (!asset) return NextResponse.json({ error: "Asset not found" }, { status: 404 })
    const statusError = getAssetOperationStatusError("transfer", asset.status)
    if (statusError) return NextResponse.json({ error: statusError }, { status: 400 })

    const activeCheckout = await prisma.assetCheckout.findFirst({
      where: { assetId: id, isReturned: false },
      select: { id: true },
    })
    if (activeCheckout) {
      return NextResponse.json({ error: "Asset already has an active checkout" }, { status: 400 })
    }

    const fromSnapshot: TransferSnapshot = {
      locationId: asset.currentLocationId,
      custodianId: asset.custodianId,
      departmentId: asset.departmentId,
    }
    const toSnapshot: TransferSnapshot = {
      locationId: input.toLocationId ?? asset.currentLocationId,
      custodianId: input.toCustodianId ?? asset.custodianId,
      departmentId: input.toDepartmentId ?? asset.departmentId,
    }

    const { record: updatedAsset, componentSync } = await prisma.$transaction(async (tx) => {
      const record = await tx.asset.update({
        where: { id },
        data: {
          currentLocationId: toSnapshot.locationId,
          custodianId: toSnapshot.custodianId,
          departmentId: toSnapshot.departmentId,
          updatedBy: user.id,
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
          referenceId: id,
          performedBy: user.id,
          remark: input.remark,
        },
      })

      const componentSync = await syncInstalledComponentsWithParent(tx, {
        parentAssetId: id,
        changes: {
          currentLocationId: toSnapshot.locationId,
          custodianId: toSnapshot.custodianId,
          departmentId: toSnapshot.departmentId,
        },
        movementType: "parent_transfer_sync",
        referenceType: "transfer",
        referenceId: id,
        performedBy: user.id,
        reason: input.reason,
        remark: input.remark,
      })

      return { record, componentSync }
    })

    await logAudit({
      userId: user.id,
      action: "transfer",
      module: "asset",
      recordId: id,
      oldValue: fromSnapshot,
      newValue: { ...toSnapshot, reason: input.reason, remark: input.remark, componentSync },
    })

    return NextResponse.json(updatedAsset)
  } catch (error) {
    return errorResponse(error, 400)
  }
}
