import { NextRequest, NextResponse } from "next/server"
import { ZodError } from "zod"
import { prisma } from "@/lib/db"
import { requireAuth, requirePermission } from "@/lib/auth-utils"
import { logAudit } from "@/lib/audit-log"
import { errorResponse } from "@/lib/api-response"
import { getAssetLifecycleTransitionError, getAssetOperationConditionError } from "@/lib/asset-lifecycle-policy"
import { getHandoverTargetStatusName } from "@/lib/asset-handover-mode"
import { syncInstalledComponentsWithParent } from "@/lib/asset-component-sync"
import { assetCheckoutSchema } from "@/lib/validations/asset-operations"
import { getRequiredAssetStatusId } from "@/lib/asset-status-flow"
import { generateCheckoutDocumentNo } from "@/lib/operation-document-number"
import {
  createAssetTransactionSnapshot,
  serializeAssetComponentTransactionSnapshots,
  serializeAssetTransactionSnapshot,
} from "@/lib/asset-transaction-snapshot"
import {
  optionalFormFile,
  optionalFormText,
  requiredFormText,
  saveOperationEvidenceFile,
  type SavedOperationEvidence,
} from "@/lib/asset-operation-evidence"

type CheckoutContext = {
  params: Promise<{ id: string }>
}

export async function POST(request: NextRequest, context: CheckoutContext) {
  try {
    const user = await requireAuth()
    requirePermission(user, "asset", "edit")

    const { id } = await context.params
    const { input, photoBefore, receiverSignature } = await parseCheckoutRequest(request)
    const asset = await prisma.asset.findFirst({
      where: { id, isActive: true },
      include: { status: { select: { name: true, nameTh: true } } },
    })
    if (!asset) return NextResponse.json({ error: "Asset not found" }, { status: 404 })
    const statusError = getAssetLifecycleTransitionError("checkout", asset.status.name)
    if (statusError) return NextResponse.json({ code: statusError, error: statusError }, { status: 409 })

    const activeCheckout = await prisma.assetCheckout.findFirst({
      where: { assetId: id, isReturned: false, transactionStatus: "active" },
      select: { id: true },
    })
    if (activeCheckout) {
      return NextResponse.json({ error: "Asset already has an active checkout" }, { status: 400 })
    }

    const checkoutCondition = await prisma.assetCondition.findUnique({
      where: { id: input.conditionBefore },
      select: { name: true, isActive: true },
    })
    const conditionError = getAssetOperationConditionError(checkoutCondition)
    if (conditionError) {
      return NextResponse.json({ code: conditionError, error: "Invalid asset condition for checkout" }, { status: 400 })
    }

    const targetStatusName = getHandoverTargetStatusName(input.handoverMode)
    const targetStatusId = await getRequiredAssetStatusId(targetStatusName)

    const nextLocationId = input.locationId ?? asset.currentLocationId
    const nextCustodianId = input.checkoutType === "user" ? input.custodianId : asset.custodianId
    const nextDepartmentId = input.checkoutType === "department" ? input.departmentId : asset.departmentId

    const { record: checkout, componentSync } = await prisma.$transaction(async (tx) => {
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

      const documentNo = await generateCheckoutDocumentNo(tx, input.checkoutDate)
      const record = await tx.assetCheckout.create({
        data: {
          documentNo,
          assetId: id,
          checkoutType: input.checkoutType,
          handoverMode: input.handoverMode,
          custodianId: input.checkoutType === "user" ? input.custodianId : null,
          departmentId: input.checkoutType === "department" ? input.departmentId : null,
          locationId: input.checkoutType === "location" ? input.locationId : null,
          parentAssetId: input.checkoutType === "asset" ? input.parentAssetId : null,
          checkoutDate: input.checkoutDate,
          expectedReturnDate: input.expectedReturnDate,
          conditionBefore: input.conditionBefore,
          photoBefore: photoBefore?.filePath,
          remark: input.remark,
          checkedOutBy: user.id,
          receiverSignature: receiverSignature?.filePath ?? input.receiverSignature,
          beforeSnapshotJson: serializeAssetTransactionSnapshot(createAssetTransactionSnapshot({
            asset: beforeAsset,
            checkout: null,
            components: [],
          })),
        },
      })

      for (const evidence of [
        { module: "checkout_photo_before", file: photoBefore },
        { module: "checkout_receiver_signature", file: receiverSignature },
      ]) {
        if (!evidence.file) continue
        await tx.attachment.create({
          data: {
            assetId: asset.id,
            module: evidence.module,
            referenceId: record.id,
            fileName: evidence.file.fileName,
            originalName: evidence.file.originalName,
            fileType: evidence.file.fileType,
            fileSize: evidence.file.fileSize,
            filePath: evidence.file.filePath,
            uploadedBy: user.id,
          },
        })
      }

      const afterAsset = await tx.asset.update({
        where: { id },
        data: {
          statusId: targetStatusId,
          currentLocationId: nextLocationId,
          custodianId: nextCustodianId,
          departmentId: nextDepartmentId,
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
          movementType: "checkout",
          fromValue: asset.currentLocationId,
          toValue: nextLocationId,
          reason: "Asset checkout",
          referenceType: "checkout",
          referenceId: record.id,
          performedBy: user.id,
          remark: input.remark,
        },
      })

      const componentSync = await syncInstalledComponentsWithParent(tx, {
        parentAssetId: id,
        changes: {
          currentLocationId: nextLocationId,
          custodianId: nextCustodianId,
          departmentId: nextDepartmentId,
        },
        movementType: "parent_checkout_sync",
        referenceType: "checkout",
        referenceId: record.id,
        performedBy: user.id,
        reason: "Parent asset checkout",
        remark: input.remark,
        captureSnapshots: true,
      })

      const beforeSnapshot = createAssetTransactionSnapshot({
        asset: beforeAsset,
        checkout: null,
        components: componentSync.componentSnapshots.map((change) => change.before),
      })
      const afterSnapshot = createAssetTransactionSnapshot({
        asset: afterAsset,
        checkout: { id: record.id, isReturned: false },
        components: componentSync.componentSnapshots.map((change) => change.after),
      })
      const finalizedRecord = await tx.assetCheckout.update({
        where: { id: record.id },
        data: {
          beforeSnapshotJson: serializeAssetTransactionSnapshot(beforeSnapshot),
          afterSnapshotJson: serializeAssetTransactionSnapshot(afterSnapshot),
          componentSnapshotJson: serializeAssetComponentTransactionSnapshots(componentSync.componentSnapshots),
        },
      })
      const componentSyncSummary = {
        updated: componentSync.updated,
        skipped: componentSync.skipped,
        movements: componentSync.movements,
      }

      return { record: finalizedRecord, componentSync: componentSyncSummary }
    })

    await logAudit({
      userId: user.id,
      action: "checkout",
      module: "asset",
      recordId: id,
      oldValue: asset,
      newValue: { ...input, targetStatusName, checkoutId: checkout.id, componentSync },
    })

    return NextResponse.json(checkout, { status: 201 })
  } catch (error) {
    if (error instanceof ZodError) {
      const issue = error.issues.find(({ message }) => message.startsWith("HANDOVER_"))
      if (issue) return NextResponse.json({ code: issue.message, error: issue.message }, { status: 400 })
    }
    return errorResponse(error, 400)
  }
}

async function parseCheckoutRequest(request: NextRequest) {
  const contentType = request.headers.get("content-type") ?? ""
  if (!contentType.includes("multipart/form-data")) {
    return {
      input: assetCheckoutSchema.parse(await request.json()),
      photoBefore: null,
      receiverSignature: null,
    }
  }

  const formData = await request.formData()
  const photoBeforeFile = optionalFormFile(formData, "photoBefore")
  const receiverSignatureFile = optionalFormFile(formData, "receiverSignatureFile")
  const [photoBefore, receiverSignature] = await Promise.all([
    photoBeforeFile ? saveOperationEvidenceFile(photoBeforeFile, "checkout") : Promise.resolve(null),
    receiverSignatureFile ? saveOperationEvidenceFile(receiverSignatureFile, "checkout") : Promise.resolve(null),
  ])

  return {
    input: assetCheckoutSchema.parse({
      handoverMode: requiredFormText(formData, "handoverMode"),
      checkoutType: requiredFormText(formData, "checkoutType"),
      custodianId: optionalFormText(formData, "custodianId"),
      departmentId: optionalFormText(formData, "departmentId"),
      locationId: optionalFormText(formData, "locationId"),
      parentAssetId: optionalFormText(formData, "parentAssetId"),
      checkoutDate: requiredFormText(formData, "checkoutDate"),
      expectedReturnDate: optionalFormText(formData, "expectedReturnDate"),
      conditionBefore: requiredFormText(formData, "conditionBefore"),
      remark: optionalFormText(formData, "remark"),
      receiverSignature: optionalFormText(formData, "receiverSignature"),
    }),
    photoBefore: photoBefore as SavedOperationEvidence | null,
    receiverSignature: receiverSignature as SavedOperationEvidence | null,
  }
}
