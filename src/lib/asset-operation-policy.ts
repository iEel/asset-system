import {
  getAssetLifecycleTransitionError,
  getTransferTargetStatusName,
} from "./asset-lifecycle-policy.ts"

export { getTransferTargetStatusName }

export type AssetOperation = "checkout" | "transfer"

export type AssetRegisterTransactionAction = "checkout" | "checkin" | "transfer"
export type AssetRegisterTransactionReason =
  | "permission_required"
  | "status_not_ready"
  | "no_return_record"
  | "active_maintenance"
  | "status_not_returnable"
  | "status_not_transferable"

export type AssetRegisterTransaction = {
  action: AssetRegisterTransactionAction
  enabled: boolean
  mode?: "open_checkout" | "legacy_return"
  reason?: AssetRegisterTransactionReason
}

export type AssetOperationStatus = {
  name?: string | null
  nameTh?: string | null
}

export function getAssetOperationStatusError(operation: AssetOperation, status: AssetOperationStatus | null | undefined) {
  const lifecycleOperation = operation === "checkout" ? "checkout" : "assign_custodian"
  const error = getAssetLifecycleTransitionError(lifecycleOperation, status?.name)
  if (!error) return null

  return operation === "checkout"
    ? "Asset status does not allow checkout"
    : "Asset status does not allow transfer"
}

export function getAssetRegisterTransactionActions({
  statusName,
  custodianId,
  openCheckoutId,
  hasActiveMaintenance,
  canEdit,
}: {
  statusName: string
  custodianId: string | null
  openCheckoutId: string | null
  hasActiveMaintenance: boolean
  canEdit: boolean
}): AssetRegisterTransaction[] {
  if (!canEdit) {
    return (["checkout", "checkin", "transfer"] as const).map((action) => ({
      action,
      enabled: false,
      reason: "permission_required",
    }))
  }

  const checkoutEnabled = getAssetLifecycleTransitionError("checkout", statusName) === null
  const transferEnabled = getAssetLifecycleTransitionError("assign_custodian", statusName) === null
  const legacyReturnEnabled = Boolean(custodianId)
    && !openCheckoutId
    && !hasActiveMaintenance
    && getAssetLifecycleTransitionError("legacy_return_backfill", statusName) === null

  let checkin: AssetRegisterTransaction
  if (openCheckoutId && getAssetLifecycleTransitionError("checkin", statusName) === null && !hasActiveMaintenance) {
    checkin = { action: "checkin", enabled: true, mode: "open_checkout" }
  } else if (legacyReturnEnabled) {
    checkin = { action: "checkin", enabled: true, mode: "legacy_return" }
  } else if (hasActiveMaintenance) {
    checkin = { action: "checkin", enabled: false, reason: "active_maintenance" }
  } else if (!custodianId) {
    checkin = { action: "checkin", enabled: false, reason: "no_return_record" }
  } else {
    checkin = { action: "checkin", enabled: false, reason: "status_not_returnable" }
  }

  return [
    checkoutEnabled
      ? { action: "checkout", enabled: true }
      : { action: "checkout", enabled: false, reason: "status_not_ready" },
    checkin,
    transferEnabled
      ? { action: "transfer", enabled: true }
      : { action: "transfer", enabled: false, reason: "status_not_transferable" },
  ]
}

export function buildAssetRegisterTransactionHref(
  locale: string,
  assetId: string,
  action: AssetRegisterTransactionAction,
  returnTo: string,
  checkoutId?: string | null,
) {
  const basePath = action === "checkout"
    ? `/${locale}/asset-management/checkout`
    : action === "checkin"
      ? `/${locale}/asset-management/checkin`
      : `/${locale}/asset-management/transfer`
  const selectionKey = action === "checkin" && checkoutId ? "checkoutId" : "assetId"
  const selectionValue = action === "checkin" && checkoutId ? checkoutId : assetId
  const params = new URLSearchParams({ [selectionKey]: selectionValue, returnTo })
  return `${basePath}?${params.toString()}`
}

/** The single row button: hand over when possible, otherwise return, otherwise none. */
export function getRowNextAction(
  transactions: ReadonlyArray<Pick<AssetRegisterTransaction, "action" | "enabled">>,
): "checkout" | "checkin" | null {
  if (transactions.some((transaction) => transaction.action === "checkout" && transaction.enabled)) return "checkout"
  if (transactions.some((transaction) => transaction.action === "checkin" && transaction.enabled)) return "checkin"
  return null
}
