import type { AssetTransactionSnapshotV1 } from "./asset-transaction-snapshot.ts"

export type AssetTransactionCancellationReason =
  | "unsupported_snapshot"
  | "not_active"
  | "not_latest"
  | "asset_changed"
  | "components_changed"
  | "downstream_work"

export type AssetTransactionCancellationInput = {
  snapshot: AssetTransactionSnapshotV1 | null
  transactionStatus: string
  isLatestTransaction: boolean
  assetMatchesAfterSnapshot: boolean
  componentsMatchAfterSnapshot: boolean
  downstreamTypes: readonly string[]
}

export type AssetTransactionCancellationResult =
  | { eligible: true }
  | { eligible: false; reasons: AssetTransactionCancellationReason[] }

export function evaluateAssetTransactionCancellation(
  input: AssetTransactionCancellationInput
): AssetTransactionCancellationResult {
  const reasons: AssetTransactionCancellationReason[] = []

  if (!input.snapshot) reasons.push("unsupported_snapshot")
  if (input.transactionStatus !== "active") reasons.push("not_active")
  if (!input.isLatestTransaction) reasons.push("not_latest")
  if (!input.assetMatchesAfterSnapshot) reasons.push("asset_changed")
  if (!input.componentsMatchAfterSnapshot) reasons.push("components_changed")
  if (input.downstreamTypes.length > 0) reasons.push("downstream_work")

  return reasons.length === 0 ? { eligible: true } : { eligible: false, reasons }
}
