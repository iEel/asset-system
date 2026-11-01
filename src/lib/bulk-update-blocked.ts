import { assetOperationRefusalReasonKeys } from "./asset-operation-eligibility.ts"

// The assets a แก้ไขข้อมูลหลายรายการ refusal names (group 4 plan 1 P1-R1): the 409 of /api/assets/bulk-update carries
// `blocked: [{ assetId, assetTag, code }]`, one entry per refused asset with its own code, in bulkUpdateBlockedOrder.
// The bulk update is a correction (group 4 decision 11), so it refuses what bulk-move refuses and not the transfer's
// condition block: correcting who holds a broken asset stays possible. The payload reads with readBulkMoveBlocked and
// words with bulkMoveBlockedList (bulk-move-blocked.ts), which share the shape.
export type BulkUpdateBlockedCode =
  | "ASSET_NOT_ACTIVE"
  | "ASSET_COMPONENT_OUTSTANDING"
  | "ASSET_LICENSE_MOVE_NOT_ALLOWED"
  | "ASSET_ACTIVE_CHECKOUT_EXISTS"
  | "ASSET_STATUS_TRANSFER_NOT_ALLOWED"

export const bulkUpdateBlockedOrder = [
  "ASSET_NOT_ACTIVE",
  "ASSET_COMPONENT_OUTSTANDING",
  "ASSET_LICENSE_MOVE_NOT_ALLOWED",
  "ASSET_ACTIVE_CHECKOUT_EXISTS",
  "ASSET_STATUS_TRANSFER_NOT_ALLOWED",
] as const satisfies readonly BulkUpdateBlockedCode[]

// An open handover reads as a correction's own words ("รับคืนหรือโอนย้ายก่อนจึงแก้ได้"), not bulk-move's move advice. A status that cannot take the change reads as the
// transfer's words when the holder changes, else as bulk-move's written-off words (P1-R1).
const bulkUpdateBlockedReasonKeys: Readonly<Record<Exclude<BulkUpdateBlockedCode, "ASSET_STATUS_TRANSFER_NOT_ALLOWED">, string>> = {
  ASSET_NOT_ACTIVE: "bulkMove.blockedNotActive",
  ASSET_COMPONENT_OUTSTANDING: assetOperationRefusalReasonKeys.ASSET_COMPONENT_OUTSTANDING,
  ASSET_LICENSE_MOVE_NOT_ALLOWED: assetOperationRefusalReasonKeys.ASSET_LICENSE_MOVE_NOT_ALLOWED,
  ASSET_ACTIVE_CHECKOUT_EXISTS: "asset.transactionReasonOpenCheckoutCorrection",
}

/** The reason key for a save refusal code; null for any other code (the caller falls back to apiError.describe). */
export function bulkUpdateBlockedReasonKey(code: string, changesCustodian: boolean): string | null {
  if (code === "ASSET_STATUS_TRANSFER_NOT_ALLOWED") {
    return changesCustodian ? "asset.transactionReasonStatusNotTransferable" : "asset.transactionReasonWrittenOff"
  }
  return Object.hasOwn(bulkUpdateBlockedReasonKeys, code)
    ? bulkUpdateBlockedReasonKeys[code as keyof typeof bulkUpdateBlockedReasonKeys]
    : null
}
