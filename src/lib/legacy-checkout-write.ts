// The legacy HO- backfill (สร้างใบส่งมอบย้อนหลัง), run inside a caller's transaction: the legacy-checkout route
// (src/app/api/assets/[id]/legacy-checkout/route.ts) and the multi-return batch (group 7 plan 4, G7P4-R6) use it for a
// held asset that has no handover. The caller runs the refusals before the transaction and logs the audit after commit.
import type { Asset, Prisma } from "@prisma/client"
import { assertNoOutstandingComponentLinks, claimAssetForCustodyChange } from "@/lib/asset-operation-claim"
import { generateCheckoutDocumentNo } from "@/lib/operation-document-number"

export const legacyReturnBackfillRemark = "legacy_return_backfill: Created from current custodian before check-in"

export type LegacyCheckoutBackfillInput = {
  // The asset as read before the transaction: the claim expects its status; the HO- takes its condition and room.
  asset: Pick<Asset, "id" | "statusId" | "conditionId" | "currentLocationId">
  // The asset's current holder, who becomes the HO-'s holder.
  custodianId: string
  checkoutDate: Date
  inUseStatusId: string
}

export type LegacyCheckoutBackfillActor = {
  userId: string
}

// Claims the asset (its status must still be the pre-read one), refuses an outstanding component link, writes the HO-
// (permanent_assignment, the legacy remark), sets the asset In Use and writes its checkout movement.
export async function backfillLegacyCheckoutInTransaction(
  tx: Prisma.TransactionClient,
  input: LegacyCheckoutBackfillInput,
  actor: LegacyCheckoutBackfillActor,
) {
  const { asset, custodianId, checkoutDate, inUseStatusId } = input
  const id = asset.id
  await claimAssetForCustodyChange(tx, { assetId: id, expectedStatusId: asset.statusId, updatedBy: actor.userId })
  await assertNoOutstandingComponentLinks(tx, [id])
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
      checkedOutBy: actor.userId,
    },
  })

  await tx.asset.update({
    where: { id },
    data: {
      statusId: inUseStatusId,
      updatedBy: actor.userId,
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
      performedBy: actor.userId,
      remark: "legacy_return_backfill",
    },
  })

  return record
}
