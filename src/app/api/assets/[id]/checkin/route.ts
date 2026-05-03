import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { requireAuth, requirePermission } from "@/lib/auth-utils"
import { logAudit } from "@/lib/audit-log"
import { errorResponse } from "@/lib/api-response"
import { assetCheckinSchema } from "@/lib/validations/asset-operations"
import { isValidCheckinReturnStatus } from "@/lib/asset-status-flow"
import { optionalFormFile, optionalFormText, requiredFormText, saveOperationEvidenceFile } from "@/lib/asset-operation-evidence"

type CheckinContext = {
  params: Promise<{ id: string }>
}

export async function POST(request: NextRequest, context: CheckinContext) {
  try {
    const user = await requireAuth()
    requirePermission(user, "asset", "edit")

    const { id } = await context.params
    const { input, photoAfter } = await parseCheckinRequest(request)
    const asset = await prisma.asset.findFirst({ where: { id, isActive: true } })
    if (!asset) return NextResponse.json({ error: "Asset not found" }, { status: 404 })

    const checkout = await prisma.assetCheckout.findFirst({
      where: { id: input.checkoutId, assetId: id, isReturned: false },
    })
    if (!checkout) {
      return NextResponse.json({ error: "Active checkout not found" }, { status: 404 })
    }
    if (!(await isValidCheckinReturnStatus(input.nextStatusId))) {
      return NextResponse.json({ error: "Invalid return status for check-in" }, { status: 400 })
    }

    const checkin = await prisma.$transaction(async (tx) => {
      const record = await tx.assetCheckin.create({
        data: {
          assetId: id,
          checkoutId: checkout.id,
          returnDate: input.returnDate,
          returnBy: input.returnBy,
          receiveBy: input.receiveBy,
          conditionAfter: input.conditionAfter,
          missingAccessories: input.missingAccessories,
          damageNote: input.damageNote,
          photoAfter: photoAfter?.filePath,
          nextStatus: input.nextStatusId,
          nextLocationId: input.nextLocationId,
          remark: input.remark,
        },
      })

      if (photoAfter) {
        await tx.attachment.create({
          data: {
            assetId: asset.id,
            module: "checkin_photo_after",
            referenceId: record.id,
            fileName: photoAfter.fileName,
            originalName: photoAfter.originalName,
            fileType: photoAfter.fileType,
            fileSize: photoAfter.fileSize,
            filePath: photoAfter.filePath,
            uploadedBy: user.id,
          },
        })
      }

      await tx.assetCheckout.update({
        where: { id: checkout.id },
        data: { isReturned: true },
      })

      await tx.asset.update({
        where: { id },
        data: {
          statusId: input.nextStatusId,
          conditionId: input.conditionAfter,
          currentLocationId: input.nextLocationId,
          custodianId: null,
          updatedBy: user.id,
        },
      })

      await tx.assetMovement.create({
        data: {
          assetId: id,
          movementType: "checkin",
          fromValue: asset.currentLocationId,
          toValue: input.nextLocationId,
          reason: "Asset checkin",
          referenceType: "checkin",
          referenceId: record.id,
          performedBy: user.id,
          remark: input.remark,
        },
      })

      return record
    })

    await logAudit({
      userId: user.id,
      action: "checkin",
      module: "asset",
      recordId: id,
      oldValue: asset,
      newValue: { ...input, checkinId: checkin.id },
    })

    return NextResponse.json(checkin, { status: 201 })
  } catch (error) {
    return errorResponse(error, 400)
  }
}

async function parseCheckinRequest(request: NextRequest) {
  const contentType = request.headers.get("content-type") ?? ""
  if (!contentType.includes("multipart/form-data")) {
    return {
      input: assetCheckinSchema.parse(await request.json()),
      photoAfter: null,
    }
  }

  const formData = await request.formData()
  const photoAfterFile = optionalFormFile(formData, "photoAfter")
  const photoAfter = photoAfterFile ? await saveOperationEvidenceFile(photoAfterFile, "checkin") : null

  return {
    input: assetCheckinSchema.parse({
      checkoutId: requiredFormText(formData, "checkoutId"),
      returnDate: requiredFormText(formData, "returnDate"),
      returnBy: requiredFormText(formData, "returnBy"),
      receiveBy: requiredFormText(formData, "receiveBy"),
      conditionAfter: requiredFormText(formData, "conditionAfter"),
      missingAccessories: optionalFormText(formData, "missingAccessories"),
      damageNote: optionalFormText(formData, "damageNote"),
      nextStatusId: requiredFormText(formData, "nextStatusId"),
      nextLocationId: requiredFormText(formData, "nextLocationId"),
      remark: optionalFormText(formData, "remark"),
    }),
    photoAfter,
  }
}
