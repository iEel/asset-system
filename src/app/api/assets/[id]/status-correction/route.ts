import { NextRequest, NextResponse } from "next/server"
import { errorResponse } from "@/lib/api-response"
import { getApiErrorKey } from "@/lib/api-error-catalog"
import { fieldErrorResponse } from "@/lib/field-error-response"
import { getAssetStatusCorrectionError } from "@/lib/asset-lifecycle-exception-policy"
import { logAudit } from "@/lib/audit-log"
import { requireAuth, requirePermission } from "@/lib/auth-utils"
import { prisma } from "@/lib/db"
import { inspectionCorrectionEscapeAllowed } from "@/lib/inspection-confirm-data"
import { INSPECTION_STATUS_NAME } from "@/lib/inspection-confirm-rules"
import { assetStatusCorrectionSchema } from "@/lib/validations/asset-status-correction"

type AssetStatusCorrectionContext = {
  params: Promise<{ id: string }>
}

export async function POST(request: NextRequest, context: AssetStatusCorrectionContext) {
  try {
    const user = await requireAuth()
    requirePermission(user, "asset", "edit")

    const { id } = await context.params
    const input = assetStatusCorrectionSchema.parse(await request.json())
    const asset = await prisma.asset.findFirst({
      where: { id, isActive: true },
      include: { status: { select: { id: true, name: true, nameTh: true } } },
    })
    if (!asset) return NextResponse.json({ error: "Asset not found" }, { status: 404 })

    const nextStatus = await prisma.assetStatus.findFirst({
      where: { id: input.nextStatusId, isActive: true },
      select: { id: true, name: true, nameTh: true },
    })
    if (!nextStatus) return NextResponse.json({ error: "Asset status not found" }, { status: 404 })

    const statusError = getAssetStatusCorrectionError(asset.status, nextStatus)
    if (statusError) {
      return fieldErrorResponse({ status: 400, error: statusError, fieldErrors: { nextStatusId: getApiErrorKey(statusError) ?? "invalid" } })
    }

    // ยืนยันผลตรวจ plan 5 final review (decision A): an Under Inspection asset is released through ยืนยันผลตรวจ (its round's
    // confirm page, or the asset page's one-step dialog). This correction stays only as the escape hatch for the cases
    // those flows refuse because of a handover (inspectionCorrectionEscapeAllowed).
    if (asset.status.name === INSPECTION_STATUS_NAME && !(await inspectionCorrectionEscapeAllowed(prisma, asset.id))) {
      return fieldErrorResponse({ status: 400, error: USE_INSPECTION_CONFIRM, fieldErrors: { nextStatusId: getApiErrorKey(USE_INSPECTION_CONFIRM) ?? "invalid" } })
    }

    const updatedAsset = await prisma.$transaction(async (tx) => {
      // Conditional on the status read above: a confirm or another change meanwhile is not overwritten.
      const changed = await tx.asset.updateMany({
        where: { id, isActive: true, statusId: asset.statusId },
        data: { statusId: nextStatus.id, updatedBy: user.id },
      })
      if (changed.count !== 1) throw new StatusCorrectionConflictError()

      await tx.assetMovement.create({
        data: {
          assetId: asset.id,
          movementType: "status_correction",
          fromValue: asset.statusId,
          toValue: nextStatus.id,
          reason: input.reason,
          referenceType: "asset",
          referenceId: asset.id,
          performedBy: user.id,
          remark: "Controlled lifecycle correction",
        },
      })

      return tx.asset.findUnique({ where: { id } })
    })

    await logAudit({
      userId: user.id,
      action: "correct_status",
      module: "asset",
      recordId: asset.id,
      oldValue: { statusId: asset.statusId, statusName: asset.status.name },
      newValue: { statusId: nextStatus.id, statusName: nextStatus.name, reason: input.reason },
    })

    return NextResponse.json(updatedAsset)
  } catch (error) {
    if (error instanceof StatusCorrectionConflictError) return NextResponse.json({ error: error.message }, { status: 409 })
    return errorResponse(error, 400)
  }
}

const USE_INSPECTION_CONFIRM = "Confirm this asset under inspection through the inspection confirm"

class StatusCorrectionConflictError extends Error {
  constructor() {
    super("Asset status changed while this request was being saved. Reload the asset and try again.")
    this.name = "StatusCorrectionConflictError"
  }
}
