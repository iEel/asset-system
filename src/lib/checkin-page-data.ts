import { searchAssetOperationOptions, type AssetOperationSearchDb } from "@/lib/asset-operation-search"
import type { AssetOperationSearchRow } from "@/lib/asset-operation-search-rules"
import { prisma } from "@/lib/db"
import { legacyReturnCountWhere } from "@/lib/legacy-return-rule"

// The รับคืน page's bounded reads (server search spec 6.3, 6.4): at most one preselect answer and one count. The
// register itself is never listed here; the picker asks the server search. The legacy where lives in
// legacy-return-rule.ts (pure), re-exported here.
export { legacyReturnCountWhere, legacyReturnOwnershipTypes, legacyReturnStatusNames } from "@/lib/legacy-return-rule"

export function countLegacyReturns(): Promise<number> {
  return prisma.asset.count({ where: legacyReturnCountWhere })
}

export type CheckinPreselect = { row: AssetOperationSearchRow | null; query: string }

function firstParam(value: string | string[] | undefined): string | null {
  const first = Array.isArray(value) ? value[0] : value
  return first ? first : null
}

function searchById(assetId: string) {
  return searchAssetOperationOptions(prisma as unknown as AssetOperationSearchDb, {
    mode: "checkin",
    q: "",
    id: assetId,
    assignCustodian: false,
  })
}

// ?checkoutId= (the handover document's link, and the backfill's own replace) starts with that open handover's row,
// chosen or chosen-but-blocked; it wins over ?assetId=. ?assetId= fills the search with the asset's tag and chooses
// nothing. An outstanding component's ?assetId= starts with its late-return row, chosen or chosen-but-blocked (group 3
// spec §8.6). A repeated parameter reaches the page as an array and the first counts (S-R42).
export async function getCheckinPreselect(params: {
  checkoutId?: string | string[]
  assetId?: string | string[]
}): Promise<CheckinPreselect> {
  const checkoutId = firstParam(params.checkoutId)
  const assetId = firstParam(params.assetId)

  if (checkoutId) {
    const checkout = await prisma.assetCheckout.findFirst({
      where: { id: checkoutId, isReturned: false, transactionStatus: "active" },
      select: { assetId: true },
    })
    if (!checkout) return { row: null, query: "" }
    const answer = await searchById(checkout.assetId)
    const row = answer.rows[0]
    return { row: row && row.checkout?.id === checkoutId ? row : null, query: "" }
  }

  if (assetId) {
    const answer = await searchById(assetId)
    const row = answer.rows[0]
    if (row?.badge === "outstanding") return { row, query: "" }
    return { row: null, query: row?.assetTag ?? "" }

  }

  return { row: null, query: "" }
}
