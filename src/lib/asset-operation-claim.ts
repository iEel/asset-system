import type { Prisma } from "@prisma/client"

import { outstandingLinkWhere } from "./asset-component-outstanding.ts"

export class AssetOperationConflictError extends Error {
  readonly code: "ASSET_CHANGED_DURING_OPERATION" | "ASSET_ACTIVE_CHECKOUT_EXISTS" | "ASSET_CHECKIN_DEPARTMENT_UNAVAILABLE"

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

type OutstandingLinkReader = {
  assetComponent: {
    findMany(args: {
      where: Prisma.AssetComponentWhereInput
      select: { componentAssetId: true; componentAsset: { select: { assetTag: true } } }
    }): Promise<Array<{ componentAssetId: string; componentAsset: { assetTag: string } }>>
  }
}

export class AssetComponentOutstandingError extends Error {
  readonly code: "ASSET_COMPONENT_OUTSTANDING"
  readonly blocked: Array<{ assetId: string; assetTag: string }>

  constructor(blocked: Array<{ assetId: string; assetTag: string }>) {
    super("ASSET_COMPONENT_OUTSTANDING")
    this.name = "AssetComponentOutstandingError"
    this.code = "ASSET_COMPONENT_OUTSTANDING"
    this.blocked = blocked
  }
}

// An outstanding component (group 3 spec §8.5) is not handed over, transferred, moved or backfilled on its own. The
// routes call this before the transaction and again after the claim.
export async function assertNoOutstandingComponentLinks(db: OutstandingLinkReader, assetIds: readonly string[]): Promise<void> {
  const links = await db.assetComponent.findMany({
    where: { componentAssetId: { in: [...assetIds] }, ...outstandingLinkWhere },
    select: { componentAssetId: true, componentAsset: { select: { assetTag: true } } },
  })
  if (links.length === 0) return
  const tags = new Map<string, string>()
  for (const link of links) if (!tags.has(link.componentAssetId)) tags.set(link.componentAssetId, link.componentAsset.assetTag)
  const blocked: Array<{ assetId: string; assetTag: string }> = []
  for (const assetId of new Set(assetIds)) {
    const assetTag = tags.get(assetId)
    if (assetTag !== undefined) blocked.push({ assetId, assetTag })
  }
  throw new AssetComponentOutstandingError(blocked)
}
