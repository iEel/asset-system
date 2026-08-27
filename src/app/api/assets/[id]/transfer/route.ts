import { NextRequest, NextResponse } from "next/server"
import { randomUUID } from "node:crypto"
import { prisma } from "@/lib/db"
import { requireAuth, requirePermission } from "@/lib/auth-utils"
import { logAudit } from "@/lib/audit-log"
import { errorResponse } from "@/lib/api-response"
import { getAssetLifecycleTransitionError, getTransferTargetStatusName } from "@/lib/asset-lifecycle-policy"
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
      include: { status: { select: { name: true, nameTh: true } } },
    })
    if (!asset) return NextResponse.json({ error: "Asset not found" }, { status: 404 })
    const operation = input.toCustodianId ? "assign_custodian" : "move_scope"
    const statusError = getAssetLifecycleTransitionError(operation, asset.status.name)
    if (statusError) return NextResponse.json({ code: statusError, error: statusError }, { status: 409 })

    const activeCheckout = await prisma.assetCheckout.findFirst({
      where: { assetId: id, isReturned: false, transactionStatus: "active" },
      select: { id: true },
    })
    if (activeCheckout) {
      return NextResponse.json({ error: "Asset already has an active checkout" }, { status: 400 })
    }

    const targetStatusName = getTransferTargetStatusName(input.toCustodianId)
    const targetStatusId = targetStatusName
      ? await getRequiredAssetStatusId(targetStatusName)
      : asset.statusId

    const { transfer, componentSync, fromSnapshot, toSnapshot } = await prisma.$transaction(async (tx) => {
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
        },
      })
      if (!beforeAsset) throw new Error("Asset not found")

      const fromSnapshot: TransferSnapshot = {
        locationId: beforeAsset.currentLocationId,
        custodianId: beforeAsset.custodianId,
        departmentId: beforeAsset.departmentId,
        statusId: beforeAsset.statusId,
      }
      const toSnapshot: TransferSnapshot = {
        locationId: input.toLocationId ?? beforeAsset.currentLocationId,
        custodianId: input.toCustodianId ?? beforeAsset.custodianId,
        departmentId: input.toDepartmentId ?? beforeAsset.departmentId,
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
      newValue: { ...toSnapshot, reason: input.reason, remark: input.remark, componentSync },
    })

    return NextResponse.json(transfer, { status: 201 })
  } catch (error) {
    return errorResponse(error, 400)
  }
}
