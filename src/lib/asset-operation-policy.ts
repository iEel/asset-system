import { getAssetLifecycleTransitionError, getTransferTargetStatusName } from "./asset-lifecycle-policy.ts"

export { getTransferTargetStatusName }

export type AssetOperation = "checkout" | "transfer"

export type AssetRegisterTransactionAction = "checkout" | "checkin" | "transfer"

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
