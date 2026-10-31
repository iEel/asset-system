import { normalizeAssetStateName } from "./asset-lifecycle-policy.ts"

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
