import { assetOperationRefusalReasonKeys } from "./asset-operation-eligibility.ts"

// The assets a ย้ายที่ตั้งหลายรายการ refusal names: the 409 of /api/assets/bulk-move carries `blocked: [{ assetId, assetTag,
// code }]`, one entry per refused asset with its own code, in bulkMoveBlockedOrder (group 3 plan 4 P4-R4). The list under
// the table words each code with the row's reason key (bulkMoveBlockedReasonKey, P4-R6), so the row and the refusal agree.
export type BulkMoveBlockedAsset = { assetId: string; assetTag: string; code: string }

/** The save's refusal codes, in getBulkMoveVerdict's order: outstanding, License, open handover, written off. */
export type BulkMoveBlockedCode =
  | "ASSET_COMPONENT_OUTSTANDING"
  | "ASSET_LICENSE_MOVE_NOT_ALLOWED"
  | "ASSET_ACTIVE_CHECKOUT_EXISTS"
  | "ASSET_STATUS_TRANSFER_NOT_ALLOWED"

export const bulkMoveBlockedOrder = [
  "ASSET_COMPONENT_OUTSTANDING",
  "ASSET_LICENSE_MOVE_NOT_ALLOWED",
  "ASSET_ACTIVE_CHECKOUT_EXISTS",
  "ASSET_STATUS_TRANSFER_NOT_ALLOWED",
] as const satisfies readonly BulkMoveBlockedCode[]

// Each code's words are the row's (getBulkMoveVerdict's reason keys), so the list under the table and the row agree.
const bulkMoveBlockedReasonKeys: Readonly<Record<BulkMoveBlockedCode, string>> = {
  ASSET_COMPONENT_OUTSTANDING: assetOperationRefusalReasonKeys.ASSET_COMPONENT_OUTSTANDING,
  ASSET_LICENSE_MOVE_NOT_ALLOWED: assetOperationRefusalReasonKeys.ASSET_LICENSE_MOVE_NOT_ALLOWED,
  ASSET_ACTIVE_CHECKOUT_EXISTS: "asset.transactionReasonOpenCheckoutBulkMove",
  ASSET_STATUS_TRANSFER_NOT_ALLOWED: "asset.transactionReasonWrittenOff",
}

/** The row's reason key for a save refusal code; null for any other code (the caller falls back to apiError.describe). */
export function bulkMoveBlockedReasonKey(code: string): string | null {
  return Object.hasOwn(bulkMoveBlockedReasonKeys, code) ? bulkMoveBlockedReasonKeys[code as BulkMoveBlockedCode] : null
}

export function readBulkMoveBlocked(payload: unknown): BulkMoveBlockedAsset[] {
  if (!payload || typeof payload !== "object") return []
  const blocked = (payload as { blocked?: unknown }).blocked
  if (!Array.isArray(blocked)) return []
  const out: BulkMoveBlockedAsset[] = []
  for (const entry of blocked) {
    if (!entry || typeof entry !== "object") continue
    const { assetId, assetTag, code } = entry as Record<string, unknown>
    if (typeof assetId === "string" && typeof assetTag === "string" && typeof code === "string") out.push({ assetId, assetTag, code })
  }
  return out
}

// "NB-001, NB-002 (reason) · LIC-007 (reason)": the tags grouped by reason, in the order the server first named each.
export function bulkMoveBlockedList(blocked: readonly BulkMoveBlockedAsset[], reasonOf: (code: string) => string): string {
  const groups = new Map<string, string[]>()
  for (const asset of blocked) {
    const tags = groups.get(asset.code)
    if (tags) tags.push(asset.assetTag)
    else groups.set(asset.code, [asset.assetTag])
  }
  return [...groups].map(([code, tags]) => `${tags.join(", ")} (${reasonOf(code)})`).join(" · ")
}
