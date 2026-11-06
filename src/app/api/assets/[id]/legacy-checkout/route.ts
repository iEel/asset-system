import { NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { requireAuth, requirePermission } from "@/lib/auth-utils"
import { logAudit } from "@/lib/audit-log"
import { errorResponse } from "@/lib/api-response"
import {
  AssetComponentOutstandingError,
  AssetOperationConflictError,
  assertNoOutstandingComponentLinks,
} from "@/lib/asset-operation-claim"
import { getAssetLifecycleTransitionError } from "@/lib/asset-lifecycle-policy"
import { getAssetOperationOwnershipRefusal } from "@/lib/asset-operation-eligibility"
import { getRequiredAssetStatusId } from "@/lib/asset-status-flow"
import { backfillLegacyCheckoutInTransaction, legacyReturnBackfillRemark } from "@/lib/legacy-checkout-write"
import { openRepairRecordWhere } from "@/lib/repair-record-policy"

type LegacyCheckoutContext = {
  params: Promise<{ id: string }>
}

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
        statusId: true,
        ownershipType: true,
        status: { select: { name: true, nameTh: true } },
      },
    })
    if (!asset) return NextResponse.json({ error: "Asset not found" }, { status: 404 })
    // An outstanding component is returned late (group 3 spec §8.5, §8.6), never backfilled.
    await assertNoOutstandingComponentLinks(prisma, [id])
    const ownershipRefusal = getAssetOperationOwnershipRefusal("legacyCheckin", asset.ownershipType)
    if (ownershipRefusal) return NextResponse.json({ code: ownershipRefusal, error: ownershipRefusal }, { status: 409 })
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
      where: { ...openRepairRecordWhere, assetId: id },
      select: { id: true },
    })
    if (activeCorrectiveMaintenance) {
      return NextResponse.json({
        code: "ASSET_LEGACY_RETURN_MAINTENANCE_ACTIVE",
        error: "Finish or cancel the unfinished repair record before creating a legacy return",
      }, { status: 409 })
    }

    const checkoutDate = new Date()
    const inUseStatusId = await getRequiredAssetStatusId("In Use")

    const checkout = await prisma.$transaction(async (tx) => {
      return backfillLegacyCheckoutInTransaction(tx, { asset: { ...asset, id }, custodianId, checkoutDate, inUseStatusId }, { userId: user.id })
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
    if (error instanceof AssetComponentOutstandingError) {
      return NextResponse.json({ code: error.code, error: error.code }, { status: 409 })
    }
    if (error instanceof AssetOperationConflictError) {
      return NextResponse.json({ code: error.code, error: error.message }, { status: 409 })
    }
    return errorResponse(error, 400)
  }
}
