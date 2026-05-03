import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { requireAuth, requirePermission } from "@/lib/auth-utils"
import { logAudit } from "@/lib/audit-log"
import { errorResponse } from "@/lib/api-response"
import { assetCheckoutSchema } from "@/lib/validations/asset-operations"
import { getRequiredAssetStatusId } from "@/lib/asset-status-flow"
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
    const asset = await prisma.asset.findFirst({ where: { id, isActive: true } })
    if (!asset) return NextResponse.json({ error: "Asset not found" }, { status: 404 })

    const activeCheckout = await prisma.assetCheckout.findFirst({
      where: { assetId: id, isReturned: false },
      select: { id: true },
    })
    if (activeCheckout) {
      return NextResponse.json({ error: "Asset already has an active checkout" }, { status: 400 })
    }

    const checkedOutStatusId = await getRequiredAssetStatusId("Checked Out")

    const nextLocationId = input.locationId ?? asset.currentLocationId
    const nextCustodianId = input.checkoutType === "user" ? input.custodianId : asset.custodianId
    const nextDepartmentId = input.checkoutType === "department" ? input.departmentId : asset.departmentId

    const checkout = await prisma.$transaction(async (tx) => {
      const record = await tx.assetCheckout.create({
        data: {
          assetId: id,
          checkoutType: input.checkoutType,
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

      await tx.asset.update({
        where: { id },
        data: {
          statusId: checkedOutStatusId,
          currentLocationId: nextLocationId,
          custodianId: nextCustodianId,
          departmentId: nextDepartmentId,
          updatedBy: user.id,
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

      return record
    })

    await logAudit({
      userId: user.id,
      action: "checkout",
      module: "asset",
      recordId: id,
      oldValue: asset,
      newValue: { ...input, checkoutId: checkout.id },
    })

    return NextResponse.json(checkout, { status: 201 })
  } catch (error) {
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
