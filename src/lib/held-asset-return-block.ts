import { getCheckinVerdict, type AssetOperationFacts } from "./asset-operation-eligibility.ts"
import { normalizeAssetStateName } from "./asset-lifecycle-policy.ts"

// Why the return form (รับคืน) refuses an asset, as a code (group 7 plan 2, G7P2-R3): the return search and the employee
// page's "รับคืน" read this one helper, so a disabled "รับคืน" names the same reason the form gives. The rule itself is
// getCheckinVerdict; the block's reasonKey is the verdict's own message key, unchanged.

export const heldAssetReturnBlockCodes = [
  "underRepair",
  "pendingDisposal",
  "fittedComponent",
  "componentOwnHandover",
  "license",
  "handoverModeMissing",
  "handoverStatusMismatch",
  "statusNotReturnable",
  "notHeld",
] as const
export type HeldAssetReturnBlockCode = (typeof heldAssetReturnBlockCodes)[number]

/** code: what refuses it; reasonKey: the full message key the return form shows for it. */
export type HeldAssetReturnBlock = { code: HeldAssetReturnBlockCode; reasonKey: string }

const codesByReasonKey: Readonly<Record<string, HeldAssetReturnBlockCode>> = {
  "asset.transactionReasonActiveMaintenance": "underRepair",
  "asset.transactionReasonComponentCheckin": "fittedComponent",
  "asset.transactionReasonComponentOwnHandover": "componentOwnHandover",
  "asset.transactionReasonLicenseCheckin": "license",
  "asset.transactionReasonHandoverModeMissing": "handoverModeMissing",
  "asset.transactionReasonHandoverStatusMismatch": "handoverStatusMismatch",
  "asset.transactionReasonStatusNotReturnable": "statusNotReturnable",
  "asset.transactionReasonNoReturnRecord": "notHeld",
}

// A status refusal of a Pending Disposal asset is named apart: the employee page tells it from the other statuses.
const statusCodes: ReadonlySet<HeldAssetReturnBlockCode> = new Set(["statusNotReturnable", "handoverStatusMismatch"])

export function getHeldAssetReturnBlock(asset: AssetOperationFacts): HeldAssetReturnBlock | null {
  const verdict = getCheckinVerdict(asset)
  if (verdict.eligible) return null
  const code = codesByReasonKey[verdict.reasonKey] ?? "statusNotReturnable"
  if (statusCodes.has(code) && normalizeAssetStateName(asset.statusName) === "pending disposal") {
    return { code: "pendingDisposal", reasonKey: verdict.reasonKey }
  }
  return { code, reasonKey: verdict.reasonKey }
}
