import type { AssetOperationSearchRow } from "./asset-operation-search-rules.ts"

// What a รับคืน pick takes (server search spec 6.3, 6.4): the open handover of an eligible row, and the holder as the
// return-by when the holder is an active employee. A blocked row stays chosen with its reason and takes nothing; a
// ข้อมูลเก่า row has no handover until the backfill makes one.
export type CheckinChoice = { checkoutId: string; returnByEmployeeId: string | null; reasonKey: string | null }

export function getCheckinChoice(row: AssetOperationSearchRow | null, employeeIds: ReadonlySet<string>): CheckinChoice {
  if (!row) return { checkoutId: "", returnByEmployeeId: null, reasonKey: null }
  if (!row.eligible) return { checkoutId: "", returnByEmployeeId: null, reasonKey: row.reasonKey }
  if (!row.checkout) return { checkoutId: "", returnByEmployeeId: null, reasonKey: null }
  const holder = row.holderEmployeeId ?? null
  return {
    checkoutId: row.checkout.id,
    returnByEmployeeId: holder && employeeIds.has(holder) ? holder : null,
    reasonKey: null,
  }
}
