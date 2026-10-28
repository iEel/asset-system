import type { AssetOperationSearchRow } from "./asset-operation-search-rules.ts"

// The rules the ส่งมอบ and โอนย้าย forms read about the row the shared picker chose (server search spec 6.3, 6.4).
// Pure: the forms render them, the tests hold them.

/** Today's label of a chosen asset ("TAG - name"): the arrival banner and the review. */
export function assetOperationRowLabel(row: Pick<AssetOperationSearchRow, "assetTag" | "name">): string {
  return `${row.assetTag} - ${row.name}`
}

/** The reason a chosen row reads under the field, only when the transaction cannot take it (a ?assetId= that arrived blocked). */
export function chosenAssetReasonKey(row: Pick<AssetOperationSearchRow, "eligible" | "reasonKey"> | null): string | null {
  return row && !row.eligible ? row.reasonKey : null
}

export type ClearedTransferAsset = { assetTag: string; reasonKey: string }

/**
 * A custodian chosen after the asset makes the transfer an assign: the asset is asked again under that rule, and it is
 * cleared only when that answer is about the asset still chosen, the custodian is still set, and the answer says it no
 * longer fits. A failed search (null) or a late answer changes nothing; the save route still refuses.
 */
export function transferAssetToClear(
  current: { asset: Pick<AssetOperationSearchRow, "id"> | null; toCustodianId: string },
  rechecked: Pick<AssetOperationSearchRow, "id" | "assetTag" | "eligible" | "reasonKey"> | null,
): ClearedTransferAsset | null {
  if (!current.toCustodianId || !current.asset || !rechecked) return null
  if (rechecked.id !== current.asset.id || rechecked.eligible || !rechecked.reasonKey) return null
  return { assetTag: rechecked.assetTag, reasonKey: rechecked.reasonKey }
}
