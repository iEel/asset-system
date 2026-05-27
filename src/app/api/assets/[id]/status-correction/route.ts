import { NextRequest, NextResponse } from "next/server"
import { errorResponse } from "@/lib/api-response"
import { getAssetStatusCorrectionError } from "@/lib/asset-lifecycle-exception-policy"
import { logAudit } from "@/lib/audit-log"
import { requireAuth, requirePermission } from "@/lib/auth-utils"
import { prisma } from "@/lib/db"
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
    if (statusError) return NextResponse.json({ error: statusError }, { status: 400 })

    const updatedAsset = await prisma.$transaction(async (tx) => {
      const updated = await tx.asset.update({
        where: { id },
        data: { statusId: nextStatus.id, updatedBy: user.id },
      })

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

      return updated
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
    return errorResponse(error, 400)
  }
}
