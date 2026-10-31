import { normalizeAssetStateName } from "./asset-lifecycle-policy.ts"
import { checkinReturnDateError } from "./checkin-route-rules.ts"

// The late return of an outstanding component (group 3 spec §8.6, P2-R17). Pure and client-safe: the รับคืน search row
// (`parentInStock`) and the late-return route (Task 5) ask this one rule.

/** The parent of an outstanding link, as the late return reads it. */
export type LateReturnParent = {
  isActive: boolean
  /** The status's `name` ("Ready", "In Use", …). */
  statusName: string
  custodianId: string | null
  hasOpenCheckout: boolean
  hasOpenRepair: boolean
}

// IT stock: active, พร้อมใช้งาน, no holder, no open handover and no open repair. A component re-attaches only to a parent
// in IT stock; anywhere else it stands alone.
export function getLateReturnOutcome(parent: LateReturnParent): "reattached" | "standalone" {
  const inStock = parent.isActive
    && normalizeAssetStateName(parent.statusName) === "ready"
    && parent.custodianId === null
    && !parent.hasOpenCheckout
    && !parent.hasOpenRepair
  return inStock ? "reattached" : "standalone"
}

// The outcome list and the late date bound (group 3 spec §8.6, P2-R3, P2-R13): the route and Task 9's panel read them.
export const componentLateReturnOutcomes = ["reattached", "standalone"] as const
export type ComponentLateReturnOutcome = (typeof componentLateReturnOutcomes)[number]
export type LateReturnDateError = "CHECKIN_RETURN_DATE_IN_FUTURE" | "COMPONENT_RETURN_DATE_BEFORE_CHECKIN"

// Days are Bangkok "YYYY-MM-DD" strings: no later than today, and no earlier than the RT-'s return day.
export function getLateReturnDateError(input: { returnDay: string; todayDay: string; checkinDay: string }): LateReturnDateError | null {
  // With no handover day the shared bound can only answer the future refusal.
  const future = checkinReturnDateError({ returnDay: input.returnDay, todayDay: input.todayDay, handoverDay: null })
  if (future === "CHECKIN_RETURN_DATE_IN_FUTURE") return future
  if (input.returnDay < input.checkinDay) return "COMPONENT_RETURN_DATE_BEFORE_CHECKIN"
  return null
}
