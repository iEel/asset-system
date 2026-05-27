export type AssetOperation = "checkout" | "transfer"

export type AssetOperationStatus = {
  name?: string | null
  nameTh?: string | null
}

const checkoutBlockedStatusNames = new Set([
  "disposed",
  "retired",
  "pending disposal",
  "under maintenance",
  "lost",
  "missing",
])

const transferBlockedStatusNames = new Set([
  "disposed",
  "retired",
  "pending disposal",
])

export function getAssetOperationStatusError(operation: AssetOperation, status: AssetOperationStatus | null | undefined) {
  const statusName = normalizeStatusName(status?.name)
  const blockedStatuses = operation === "checkout" ? checkoutBlockedStatusNames : transferBlockedStatusNames
  if (!statusName || !blockedStatuses.has(statusName)) return null

  return operation === "checkout"
    ? "Asset status does not allow checkout"
    : "Asset status does not allow transfer"
}

function normalizeStatusName(value: string | null | undefined) {
  return value?.trim().toLowerCase() ?? ""
}
