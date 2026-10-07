export class AssetOperationConflictError extends Error {
  readonly code: "ASSET_CHANGED_DURING_OPERATION" | "ASSET_ACTIVE_CHECKOUT_EXISTS"

  constructor(code: AssetOperationConflictError["code"], message: string) {
    super(message)
    this.name = "AssetOperationConflictError"
    this.code = code
  }
}

type ClaimTransaction = {
  asset: {
    updateMany(args: {
      where: { id: string; isActive: true; statusId: string }
      data: { updatedBy: string }
    }): Promise<{ count: number }>
  }
  assetCheckout: {
    findFirst(args: {
      where: { assetId: string; isReturned: false; transactionStatus: "active" }
      select: { id: true }
    }): Promise<{ id: string } | null>
  }
}

// Status and open-checkout checks made before the transaction can race with another
// request for the same asset. The conditional update takes the row lock inside the
// transaction and fails when another handover, transfer or workflow changed the status
// first, so only one of two concurrent requests can proceed.
export async function claimAssetForCustodyChange(
  tx: ClaimTransaction,
  input: { assetId: string; expectedStatusId: string; updatedBy: string },
) {
  const claim = await tx.asset.updateMany({
    where: { id: input.assetId, isActive: true, statusId: input.expectedStatusId },
    data: { updatedBy: input.updatedBy },
  })
  if (claim.count !== 1) {
    throw new AssetOperationConflictError(
      "ASSET_CHANGED_DURING_OPERATION",
      "Asset status changed while this request was being saved. Reload the asset and try again.",
    )
  }

  const activeCheckout = await tx.assetCheckout.findFirst({
    where: { assetId: input.assetId, isReturned: false, transactionStatus: "active" },
    select: { id: true },
  })
  if (activeCheckout) {
    throw new AssetOperationConflictError("ASSET_ACTIVE_CHECKOUT_EXISTS", "Asset already has an active checkout")
  }
}
