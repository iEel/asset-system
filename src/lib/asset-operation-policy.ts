import {
  getAssetLifecycleTransitionError,
  getTransferTargetStatusName,
} from "./asset-lifecycle-policy.ts"

export { getTransferTargetStatusName }

export type AssetOperation = "checkout" | "transfer"

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
