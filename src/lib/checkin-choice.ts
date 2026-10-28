import type { AssetOperationSearchRow } from "./asset-operation-search-rules.ts"

// What a รับคืน pick takes (server search spec 6.3, 6.4): the open handover of an eligible row, and the holder as the
// return-by. A holder who is no longer an active employee still returns it: returnByInactiveLabel names them, so the
// form can offer them once more as a former employee (S-R46). A blocked row stays chosen with its reason and takes
// nothing; a ข้อมูลเก่า row has no handover until the backfill makes one.
export type CheckinChoice = {
  checkoutId: string
  returnByEmployeeId: string | null
  /** The holder's label when they are not among the active employees; else null. */
  returnByInactiveLabel: string | null
  reasonKey: string | null
}

export function getCheckinChoice(row: AssetOperationSearchRow | null, employeeIds: ReadonlySet<string>): CheckinChoice {
  if (!row) return { checkoutId: "", returnByEmployeeId: null, returnByInactiveLabel: null, reasonKey: null }
  if (!row.eligible) return { checkoutId: "", returnByEmployeeId: null, returnByInactiveLabel: null, reasonKey: row.reasonKey }
  if (!row.checkout) return { checkoutId: "", returnByEmployeeId: null, returnByInactiveLabel: null, reasonKey: null }
  const holder = row.holderEmployeeId ?? null
  return {
    checkoutId: row.checkout.id,
    returnByEmployeeId: holder,
    returnByInactiveLabel: holder && !employeeIds.has(holder) ? row.holderLabel ?? null : null,
    reasonKey: null,
  }
}
