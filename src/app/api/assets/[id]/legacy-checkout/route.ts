import { NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { requireAuth, requirePermission } from "@/lib/auth-utils"
import { logAudit } from "@/lib/audit-log"
import { errorResponse } from "@/lib/api-response"
import { getAssetLifecycleTransitionError } from "@/lib/asset-lifecycle-policy"
import { getRequiredAssetStatusId } from "@/lib/asset-status-flow"
import { generateCheckoutDocumentNo } from "@/lib/operation-document-number"

type LegacyCheckoutContext = {
  params: Promise<{ id: string }>
}

const legacyReturnBackfillRemark = "legacy_return_backfill: Created from current custodian before check-in"

export async function POST(_request: Request, context: LegacyCheckoutContext) {
  try {
    const user = await requireAuth()
    requirePermission(user, "asset", "edit")

    const { id } = await context.params
    const asset = await prisma.asset.findFirst({
      where: { id, isActive: true },
      select: {
        id: true,
        assetTag: true,
        name: true,
        currentLocationId: true,
        custodianId: true,
        conditionId: true,
        status: { select: { name: true, nameTh: true } },
      },
    })
    if (!asset) return NextResponse.json({ error: "Asset not found" }, { status: 404 })
    const statusError = getAssetLifecycleTransitionError("legacy_return_backfill", asset.status.name)
    if (statusError) return NextResponse.json({ code: statusError, error: statusError }, { status: 409 })
    if (!asset.custodianId) {
      return NextResponse.json({ error: "Asset has no current custodian to backfill" }, { status: 400 })
    }
    const custodianId = asset.custodianId

    const activeCheckout = await prisma.assetCheckout.findFirst({
      where: { assetId: id, isReturned: false, transactionStatus: "active" },
      select: { id: true },
    })
    if (activeCheckout) {
      return NextResponse.json({ error: "Asset already has an active checkout" }, { status: 400 })
    }

    const activeCorrectiveMaintenance = await prisma.maintenanceTicket.findFirst({
      where: {
        assetId: id,
        isActive: true,
        repairStatus: { notIn: ["closed", "cancelled"] },
        maintenancePlanId: null,
        NOT: { problem: { startsWith: "[PM] " } },
      },
      select: { id: true },
    })
    if (activeCorrectiveMaintenance) {
      return NextResponse.json({
        code: "ASSET_LEGACY_RETURN_MAINTENANCE_ACTIVE",
        error: "Cancel or close the active corrective maintenance ticket before creating a legacy return",
      }, { status: 409 })
    }

    const checkoutDate = new Date()
    const inUseStatusId = await getRequiredAssetStatusId("In Use")

    const checkout = await prisma.$transaction(async (tx) => {
      const documentNo = await generateCheckoutDocumentNo(tx, checkoutDate)
      const record = await tx.assetCheckout.create({
        data: {
          documentNo,
          assetId: id,
          checkoutType: "user",
          handoverMode: "permanent_assignment",
          custodianId,
          checkoutDate,
          expectedReturnDate: null,
          conditionBefore: asset.conditionId,
          remark: legacyReturnBackfillRemark,
          checkedOutBy: user.id,
        },
      })

      await tx.asset.update({
        where: { id },
        data: {
          statusId: inUseStatusId,
          updatedBy: user.id,
        },
      })

      await tx.assetMovement.create({
        data: {
          assetId: id,
          movementType: "checkout",
          fromValue: asset.currentLocationId,
          toValue: asset.currentLocationId,
          reason: "Legacy return checkout backfill",
          referenceType: "checkout",
          referenceId: record.id,
          performedBy: user.id,
          remark: "legacy_return_backfill",
        },
      })

      return record
    })

    await logAudit({
      userId: user.id,
      action: "legacy_return_backfill",
      module: "asset",
      recordId: id,
      oldValue: asset,
      newValue: {
        checkoutId: checkout.id,
        checkoutType: "user",
        handoverMode: "permanent_assignment",
        custodianId,
        conditionBefore: asset.conditionId,
        source: "legacy_return_backfill",
      },
      remark: legacyReturnBackfillRemark,
    })

    return NextResponse.json(checkout, { status: 201 })
  } catch (error) {
    return errorResponse(error, 400)
  }
}
