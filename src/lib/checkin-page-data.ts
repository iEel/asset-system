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

// Every condition's name by id, inactive ones and ยังไม่ประเมิน included (group 3 spec §8.2, §19.2): the handover's
// condition and the asset's own read a name on รับคืน, never an id.
export async function readConditionLabels(): Promise<Record<string, string>> {
  const conditions = await prisma.assetCondition.findMany({ select: { id: true, nameTh: true } })
  return Object.fromEntries(conditions.map((condition) => [condition.id, condition.nameTh]))
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
    // The chosen row's detail (group 3 spec §8.2): the summary card and the components checklist read it.
    detail: true,
  })
}

// ?checkoutId= (the handover document's link, and the backfill's own replace) starts with that open handover's row,
// chosen or chosen-but-blocked; it wins over ?assetId=. ?assetId= starts with the asset's own row, chosen or
// chosen-but-blocked: an outstanding component's late-return row (group 3 spec §8.6), an open handover's row, or a held
// asset's ข้อมูลเก่า row, which the form takes through the legacy backfill and whose tag also fills the search (the
// employee page's "รับคืน", group 7 plan 2, spec §5.2). An asset nobody holds fills the search with its tag and chooses
// nothing. A repeated parameter reaches the page as an array and the first counts (S-R42).
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
    if (row?.badge === "outstanding" || row?.badge === "handover") return { row, query: "" }
    if (row?.badge === "legacy") return { row, query: row.assetTag }
    return { row: null, query: row?.assetTag ?? "" }
  }

  return { row: null, query: "" }
}
