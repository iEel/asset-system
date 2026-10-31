// The return route's date bound (group 3 spec §8.3, P2-R13): วันที่คืน is no later than today and no earlier than the
// handover's checkout day, in Bangkok days.
// Pure and client-safe: the checkin route calls it now, and the รับคืน page uses it for the date field's min/max (Task 8).
// A legacy-backfilled HO- is dated the moment the backfill runs (legacy-checkout/route.ts), so it has no lower bound.
import { getBangkokDateKey } from "./preventive-maintenance.ts"

export type CheckinReturnDateErrorCode = "CHECKIN_RETURN_DATE_IN_FUTURE" | "CHECKIN_RETURN_DATE_BEFORE_HANDOVER"

export const CHECKIN_RETURN_DATE_ERROR_KEYS: Record<CheckinReturnDateErrorCode, string> = {
  CHECKIN_RETURN_DATE_IN_FUTURE: "checkinReturnDateInFuture",
  CHECKIN_RETURN_DATE_BEFORE_HANDOVER: "checkinReturnDateBeforeHandover",
}

// Days are Bangkok "YYYY-MM-DD" strings, compared as strings. A null handoverDay is a legacy backfill: no lower bound.
export function checkinReturnDateError(input: { returnDay: string; todayDay: string; handoverDay: string | null }): CheckinReturnDateErrorCode | null {
  if (input.returnDay > input.todayDay) return "CHECKIN_RETURN_DATE_IN_FUTURE"
  if (input.handoverDay !== null && input.returnDay < input.handoverDay) return "CHECKIN_RETURN_DATE_BEFORE_HANDOVER"
  return null
}

// The legacy-checkout route marks its backfilled HO- by its remark only (AssetCheckout has no source column).
export function isLegacyBackfilledHandover(remark: string | null | undefined): boolean {
  return typeof remark === "string" && remark.startsWith("legacy_return_backfill")
}

// The handover's Bangkok day, or null for a legacy backfill. checkoutDate is a Date (the route) or an ISO string (the picker row).
export function checkinHandoverDay(checkout: { checkoutDate: Date | string; remark: string | null }): string | null {
  if (isLegacyBackfilledHandover(checkout.remark)) return null
  return getBangkokDateKey(new Date(checkout.checkoutDate))
}
