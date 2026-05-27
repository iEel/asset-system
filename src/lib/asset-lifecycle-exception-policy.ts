export type AssetLifecycleStatus = {
  name?: string | null
  nameTh?: string | null
}

const maintenanceCloseNextStatuses = new Set(["ready", "pending disposal"])
const disposalExecutionNextStatuses = new Set(["disposed", "retired"])
const protectedLifecycleStatuses = new Set([
  "pending disposal",
  "disposed",
  "retired",
  "lost",
  "missing",
  "under maintenance",
  "pending repair",
])
const correctionSourceStatuses = protectedLifecycleStatuses
const correctionTargetStatus = "ready"

export function getMaintenanceCloseStatusError(status: AssetLifecycleStatus | null | undefined) {
  if (maintenanceCloseNextStatuses.has(normalizeStatusName(status?.name))) return null
  return "Maintenance close can only set asset status to Ready or Pending Disposal"
}

export function getDisposalExecutionStatusError(status: AssetLifecycleStatus | null | undefined) {
  if (disposalExecutionNextStatuses.has(normalizeStatusName(status?.name))) return null
  return "Disposal execution can only set asset status to Disposed or Retired"
}

export function getAssetRegisterStatusChangeError(
  currentStatus: AssetLifecycleStatus | null | undefined,
  nextStatus: AssetLifecycleStatus | null | undefined
) {
  const currentStatusName = normalizeStatusName(currentStatus?.name)
  const nextStatusName = normalizeStatusName(nextStatus?.name)
  if (!nextStatusName || currentStatusName === nextStatusName) return null
  if (protectedLifecycleStatuses.has(currentStatusName) || protectedLifecycleStatuses.has(nextStatusName)) {
    return "Protected lifecycle statuses must be changed through the proper workflow or status correction"
  }
  return null
}

export function getAssetStatusCorrectionError(
  currentStatus: AssetLifecycleStatus | null | undefined,
  nextStatus: AssetLifecycleStatus | null | undefined
) {
  const currentStatusName = normalizeStatusName(currentStatus?.name)
  const nextStatusName = normalizeStatusName(nextStatus?.name)
  if (!correctionSourceStatuses.has(currentStatusName)) {
    return "This asset status does not require controlled correction"
  }
  if (nextStatusName !== correctionTargetStatus) {
    return "Status correction can only return protected lifecycle statuses to Ready"
  }
  return null
}

export function canCorrectAssetStatus(status: AssetLifecycleStatus | null | undefined) {
  return correctionSourceStatuses.has(normalizeStatusName(status?.name))
}

function normalizeStatusName(value: string | null | undefined) {
  return value?.trim().toLowerCase() ?? ""
}
