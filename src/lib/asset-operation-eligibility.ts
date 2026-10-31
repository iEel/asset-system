import {
  checkoutConditionBlockReasonKeys,
  getAssetLifecycleTransitionError,
  getCheckinHandoverStatusError,
  getCheckoutConditionBlock,
  isLegacyReturnEligible,
  normalizeAssetStateName,
  transferConditionBlockReasonKeys,
} from "./asset-lifecycle-policy.ts"
import type { AssetOwnershipType } from "./asset-ownership.ts"

// The one rule for "can this transaction take this asset, and if not, why" (server-search spec 6.3, choice ก). Read by
// getAssetActions (the asset page and the register), the transaction search and the save routes, so none can drift.
// Pure: callers pass the open handover and the open repair from dedicated queries. Each verdict returns the first rule
// that fails, in its route's order. Reason keys are full message keys, written as literals.

export const assetOperationModes = ["checkout", "checkin", "transfer", "bulkMove"] as const
export type AssetOperationMode = (typeof assetOperationModes)[number]

export type AssetOperationFacts = {
  /** The status's `name` ("Ready", "In Use", …). */
  statusName: string
  ownership: AssetOwnershipType
  custodianId: string | null
  /** The open checkout (`isReturned: false, transactionStatus: "active"`). */
  openCheckout: { id: string; handoverMode: string | null } | null
  hasOpenRepair: boolean
  /** The condition master's `name` ("Good", "Damaged", …); null when none is read. */
  conditionName: string | null
  /** The outstanding link (group 3 spec §8.5) that holds this asset as a component, from a dedicated query; null when there is none. */
  outstanding: AssetOperationOutstandingFact | null
}

/** An outstanding link holding the asset: its id and its RT- (the link's referenceId). */
export type AssetOperationOutstandingFact = { linkId: string; checkinId: string | null }

export type AssetOperationVerdict = { eligible: true; reasonKey: null } | { eligible: false; reasonKey: string }
export type AssetCheckinPath = "handover" | "legacy" | "componentReturn" | null
export type AssetCheckinVerdict = AssetOperationVerdict & { path: AssetCheckinPath }

export type AssetOperationOwnershipOperation = "checkout" | "legacyCheckin" | "move"
export type AssetOperationOwnershipRefusalCode =
  | "ASSET_COMPONENT_CHECKOUT_NOT_ALLOWED"
  | "ASSET_LICENSE_CHECKOUT_NOT_ALLOWED"
  | "ASSET_COMPONENT_CHECKIN_NOT_ALLOWED"
  | "ASSET_LICENSE_CHECKIN_NOT_ALLOWED"
  | "ASSET_LICENSE_MOVE_NOT_ALLOWED"
export type AssetOperationRefusalCode = AssetOperationOwnershipRefusalCode | "ASSET_COMPONENT_OUTSTANDING"

// Each refusal code's words, defined only here.
export const assetOperationRefusalReasonKeys: Readonly<Record<AssetOperationRefusalCode, string>> = {
  ASSET_COMPONENT_CHECKOUT_NOT_ALLOWED: "asset.transactionReasonComponentCheckout",
  ASSET_LICENSE_CHECKOUT_NOT_ALLOWED: "asset.transactionReasonLicenseCheckout",
  ASSET_COMPONENT_CHECKIN_NOT_ALLOWED: "asset.transactionReasonComponentCheckin",
  ASSET_LICENSE_CHECKIN_NOT_ALLOWED: "asset.transactionReasonLicenseCheckin",
  ASSET_LICENSE_MOVE_NOT_ALLOWED: "asset.transactionReasonLicenseMove",
  ASSET_COMPONENT_OUTSTANDING: "asset.transactionReasonComponentOutstanding",
}

const ownershipRefusals: Record<AssetOperationOwnershipOperation, Partial<Record<AssetOwnershipType, AssetOperationOwnershipRefusalCode>>> = {
  checkout: { component: "ASSET_COMPONENT_CHECKOUT_NOT_ALLOWED", software_license: "ASSET_LICENSE_CHECKOUT_NOT_ALLOWED" },
  legacyCheckin: { component: "ASSET_COMPONENT_CHECKIN_NOT_ALLOWED", software_license: "ASSET_LICENSE_CHECKIN_NOT_ALLOWED" },
  move: { software_license: "ASSET_LICENSE_MOVE_NOT_ALLOWED" },
}

/** What a ส่วนควบ and a License never take; any other ownership value, null and unknown included, gets null. */
export function getAssetOperationOwnershipRefusal(
  operation: AssetOperationOwnershipOperation,
  ownership: string | null | undefined,
): AssetOperationOwnershipRefusalCode | null {
  if (ownership !== "component" && ownership !== "software_license") return null
  return ownershipRefusals[operation][ownership] ?? null
}

// The statuses an outstanding component is never returned from (normalised names).
const componentReturnRefusedStatuses = ["disposed", "retired", "lost"]

const yes: AssetOperationVerdict = { eligible: true, reasonKey: null }
const no = (reasonKey: string): AssetOperationVerdict => ({ eligible: false, reasonKey })

function ownershipRefusal(operation: AssetOperationOwnershipOperation, ownership: AssetOwnershipType): AssetOperationVerdict | null {
  const code = getAssetOperationOwnershipRefusal(operation, ownership)
  return code ? no(assetOperationRefusalReasonKeys[code]) : null
}

// api/assets/[id]/checkout: the ownership, Ready, no open handover, then not เสียหาย/ใช้งานไม่ได้/ซาก (group 3 spec §19.2,
// A1-R2).
export function getCheckoutVerdict(facts: AssetOperationFacts): AssetOperationVerdict {
  if (facts.outstanding) return no(assetOperationRefusalReasonKeys.ASSET_COMPONENT_OUTSTANDING)
  const refused = ownershipRefusal("checkout", facts.ownership)
  if (refused) return refused
  if (getAssetLifecycleTransitionError("checkout", facts.statusName)) return no("asset.transactionReasonStatusNotReady")
  if (facts.openCheckout) return no("asset.transactionReasonOpenCheckoutHandover")
  const block = getCheckoutConditionBlock(facts.conditionName)
  if (block) return no(checkoutConditionBlockReasonKeys[block])
  return yes
}

// api/assets/[id]/checkin against the open handover (any ownership, S-R2), or api/assets/[id]/legacy-checkout. An open
// repair does not refuse the handover's return: the return goes into ส่งซ่อม under that repair (S-R43), and with it open a
// permanent handover's asset may be Under Maintenance or Pending Repair (S-R48). The legacy backfill still refuses one.
// An outstanding component is returned on its own (group 3 spec §8.6): componentReturn comes first, before the handover, legacy and ownership rules.
export function getCheckinVerdict(facts: AssetOperationFacts): AssetCheckinVerdict {
  if (facts.outstanding) {
    const path = "componentReturn"
    // Missing (หาไม่พบ) is not refused: a component brought back has been found. Lost (สูญหาย) is confirmed, so it is.
    if (componentReturnRefusedStatuses.includes(normalizeAssetStateName(facts.statusName))) return { ...no("asset.transactionReasonStatusNotReturnable"), path }
    if (facts.openCheckout) return { ...no("asset.transactionReasonComponentOwnHandover"), path }
    if (facts.hasOpenRepair) return { ...no("asset.transactionReasonActiveMaintenance"), path }
    if (!facts.outstanding.checkinId) return { ...no("asset.transactionReasonNoReturnRecord"), path }
    return { ...yes, path }
  }

  if (facts.openCheckout) {
    const path = "handover"
    const error = getCheckinHandoverStatusError(facts.openCheckout.handoverMode, facts.statusName, { hasOpenRepair: facts.hasOpenRepair })
    if (error === "ASSET_HANDOVER_MODE_MISSING") return { ...no("asset.transactionReasonHandoverModeMissing"), path }
    if (error === "ASSET_HANDOVER_STATUS_MISMATCH") return { ...no("asset.transactionReasonHandoverStatusMismatch"), path }
    return { ...yes, path }
  }

  const path = facts.custodianId ? "legacy" : null
  const refused = ownershipRefusal("legacyCheckin", facts.ownership)
  if (refused) return { ...refused, path }
  if (facts.hasOpenRepair) return { ...no("asset.transactionReasonActiveMaintenance"), path }
  if (!facts.custodianId) return { ...no("asset.transactionReasonNoReturnRecord"), path }
  // The repair and the holder have passed, so this only checks the status.
  if (!isLegacyReturnEligible({ statusName: facts.statusName, custodianId: facts.custodianId, hasOpenCheckout: false, hasActiveMaintenance: false })) {
    return { ...no("asset.transactionReasonStatusNotReturnable"), path }
  }
  return { ...yes, path }
}

// api/assets/[id]/transfer: a custodian is assign_custodian, a move without one is move_scope; then the open handover
// (user decision 2026-10-21 Y2; S-R40: the caller says which); last, a new holder never takes a เสียหาย, ใช้งานไม่ได้ or
// ซาก asset (group 3 spec §19 recorded question; plan 3 P3-R1). A move of a broken asset stays allowed.
// assignCustodian: the transfer gives the asset a new holder. The route and the form's detail reads pass the normalized
// holder; the asset page passes its บุคคล guess (P3-R1 side effect); the S-R40 re-ask passes any holder pick.
export function getTransferVerdict(facts: AssetOperationFacts, context: { assignCustodian: boolean }): AssetOperationVerdict {
  if (facts.outstanding) return no(assetOperationRefusalReasonKeys.ASSET_COMPONENT_OUTSTANDING)
  const refused = ownershipRefusal("move", facts.ownership)
  if (refused) return refused
  if (getAssetLifecycleTransitionError(context.assignCustodian ? "assign_custodian" : "move_scope", facts.statusName)) {
    return no(context.assignCustodian ? "asset.transactionReasonStatusNotTransferable" : "asset.transactionReasonWrittenOff")
  }
  if (facts.openCheckout) return no("asset.transactionReasonOpenCheckout")
  if (context.assignCustodian) {
    const block = getCheckoutConditionBlock(facts.conditionName)
    if (block) return no(transferConditionBlockReasonKeys[block])
  }
  return yes
}

// The bulk move: the ownership, the open handover, then not Disposed/Retired, in the route's order.
export function getBulkMoveVerdict(facts: AssetOperationFacts): AssetOperationVerdict {
  if (facts.outstanding) return no(assetOperationRefusalReasonKeys.ASSET_COMPONENT_OUTSTANDING)
  const refused = ownershipRefusal("move", facts.ownership)
  if (refused) return refused
  if (facts.openCheckout) return no("asset.transactionReasonOpenCheckout")
  if (getAssetLifecycleTransitionError("move_scope", facts.statusName)) return no("asset.transactionReasonWrittenOff")
  return yes
}
