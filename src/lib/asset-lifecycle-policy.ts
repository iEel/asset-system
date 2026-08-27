export type AssetLifecycleOperation =
  | "create"
  | "register_edit"
  | "checkout"
  | "checkin"
  | "assign_custodian"
  | "move_scope"
  | "maintenance_create"
  | "maintenance_start"
  | "maintenance_close"
  | "disposal_create"
  | "disposal_execute"

export type AssetLifecycleErrorCode =
  | "ASSET_STATUS_CREATE_NOT_ALLOWED"
  | "ASSET_STATUS_EDIT_NOT_ALLOWED"
  | "ASSET_STATUS_CHECKOUT_NOT_ALLOWED"
  | "ASSET_STATUS_CHECKIN_NOT_ALLOWED"
  | "ASSET_STATUS_TRANSFER_NOT_ALLOWED"
  | "ASSET_STATUS_MAINTENANCE_NOT_ALLOWED"
  | "ASSET_STATUS_DISPOSAL_NOT_ALLOWED"

export type AssetCustodyContext = {
  ownershipType?: string | null
  custodianId?: string | null
}

export type AssetStateMaster = {
  name?: string | null
  isActive?: boolean
}

export type AssetStateSelectionError =
  | AssetLifecycleErrorCode
  | "ASSET_STATE_MASTER_NOT_FOUND"
  | "ASSET_CONDITION_NOT_SELECTABLE"

export const assetCreateStatusNames = ["Draft", "Ready"] as const
export const selectableConditionNames = [
  "Not Assessed",
  "New",
  "Good",
  "Fair",
  "Damaged",
  "Non-functional",
  "Salvage",
] as const

const allowedSources: Partial<Record<AssetLifecycleOperation, ReadonlySet<string>>> = {
  checkout: new Set(["ready"]),
  checkin: new Set(["checked out"]),
  assign_custodian: new Set(["ready", "in use"]),
  maintenance_create: new Set(["ready", "in use"]),
  maintenance_start: new Set(["pending repair"]),
  disposal_create: new Set(["ready", "in use"]),
  disposal_execute: new Set(["pending disposal"]),
}

const operationErrorCodes: Record<AssetLifecycleOperation, AssetLifecycleErrorCode | null> = {
  create: "ASSET_STATUS_CREATE_NOT_ALLOWED",
  register_edit: "ASSET_STATUS_EDIT_NOT_ALLOWED",
  checkout: "ASSET_STATUS_CHECKOUT_NOT_ALLOWED",
  checkin: "ASSET_STATUS_CHECKIN_NOT_ALLOWED",
  assign_custodian: "ASSET_STATUS_TRANSFER_NOT_ALLOWED",
  move_scope: null,
  maintenance_create: "ASSET_STATUS_MAINTENANCE_NOT_ALLOWED",
  maintenance_start: "ASSET_STATUS_MAINTENANCE_NOT_ALLOWED",
  maintenance_close: "ASSET_STATUS_MAINTENANCE_NOT_ALLOWED",
  disposal_create: "ASSET_STATUS_DISPOSAL_NOT_ALLOWED",
  disposal_execute: "ASSET_STATUS_DISPOSAL_NOT_ALLOWED",
}

export function getAssetLifecycleTransitionError(
  operation: AssetLifecycleOperation,
  currentStatusName: string | null | undefined,
  targetStatusName?: string | null
): AssetLifecycleErrorCode | null {
  const current = normalizeAssetStateName(currentStatusName)
  const target = normalizeAssetStateName(targetStatusName)

  if (operation === "create") {
    return assetCreateStatusNames.some((name) => normalizeAssetStateName(name) === (target || current))
      ? null
      : "ASSET_STATUS_CREATE_NOT_ALLOWED"
  }

  if (operation === "register_edit") {
    if (!target || target === current) return null
    if (current === "draft" && target === "ready") return null
    return "ASSET_STATUS_EDIT_NOT_ALLOWED"
  }

  if (operation === "move_scope") return null

  const allowed = allowedSources[operation]
  if (allowed?.has(current)) return null
  return operationErrorCodes[operation]
}

export function getAssetCreateStatusNames(): string[] {
  return [...assetCreateStatusNames]
}

export function getAssetRegisterStatusNames(currentStatusName: string | null | undefined): string[] {
  const current = currentStatusName?.trim()
  if (!current) return []
  if (normalizeAssetStateName(current) === "draft") return ["Draft", "Ready"]
  return [current]
}

export function getSelectableConditionNames(): string[] {
  return [...selectableConditionNames]
}

export function filterAssetCreateStatuses<T extends AssetStateMaster>(statuses: readonly T[]): T[] {
  const allowed = new Set(assetCreateStatusNames.map(normalizeAssetStateName))
  return statuses.filter((status) => status.isActive !== false && allowed.has(normalizeAssetStateName(status.name)))
}

export function filterSelectableConditions<T extends AssetStateMaster>(conditions: readonly T[]): T[] {
  const allowed = new Set(selectableConditionNames.map(normalizeAssetStateName))
  return conditions.filter((condition) => condition.isActive !== false && allowed.has(normalizeAssetStateName(condition.name)))
}

export function filterCheckoutEligibleAssets<T extends { status?: AssetStateMaster | null }>(assets: readonly T[]): T[] {
  return assets.filter((asset) => getAssetLifecycleTransitionError("checkout", asset.status?.name) === null)
}

export function filterPersonalTransferEligibleAssets<T extends { status?: AssetStateMaster | null }>(assets: readonly T[]): T[] {
  return assets.filter((asset) => getAssetLifecycleTransitionError("assign_custodian", asset.status?.name) === null)
}

export function getAssetStateSelectionError({
  operation,
  currentStatusName,
  currentConditionName,
  status,
  condition,
}: {
  operation: "create" | "register_edit"
  currentStatusName?: string | null
  currentConditionName?: string | null
  status: AssetStateMaster | null | undefined
  condition: AssetStateMaster | null | undefined
}): AssetStateSelectionError | null {
  if (!status || !condition || status.isActive === false || condition.isActive === false) {
    return "ASSET_STATE_MASTER_NOT_FOUND"
  }

  const statusError = getAssetLifecycleTransitionError(operation, currentStatusName, status.name)
  if (statusError) return statusError

  const nextCondition = normalizeAssetStateName(condition.name)
  const currentCondition = normalizeAssetStateName(currentConditionName)
  const conditionIsSelectable = selectableConditionNames.some(
    (name) => normalizeAssetStateName(name) === nextCondition
  )
  if (!conditionIsSelectable && !(operation === "register_edit" && nextCondition === currentCondition)) {
    return "ASSET_CONDITION_NOT_SELECTABLE"
  }

  return null
}

export function getMaintenanceOperationalTarget(context: AssetCustodyContext): "In Use" | "Ready" {
  return normalizeAssetStateName(context.ownershipType) === "personal" && Boolean(context.custodianId)
    ? "In Use"
    : "Ready"
}

export function getMaintenanceCloseStatusNames(context: AssetCustodyContext): Array<"In Use" | "Ready" | "Pending Disposal"> {
  return [getMaintenanceOperationalTarget(context), "Pending Disposal"]
}

export function getTransferTargetStatusName(toCustodianId?: string | null): "In Use" | null {
  return toCustodianId ? "In Use" : null
}

export function normalizeAssetStateName(value: string | null | undefined): string {
  return value?.trim().toLowerCase() ?? ""
}
