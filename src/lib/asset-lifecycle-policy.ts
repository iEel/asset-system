export type AssetLifecycleOperation =
  | "create"
  | "register_edit"
  | "checkout"
  | "legacy_return_backfill"
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

export type CheckinHandoverStatusError =
  | "ASSET_HANDOVER_MODE_MISSING"
  | "ASSET_HANDOVER_STATUS_MISMATCH"

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

// Disposed and Retired assets have left the books; their custody and location are history.
const writtenOffStatusNames: ReadonlySet<string> = new Set(["disposed", "retired"])

const allowedSources: Partial<Record<AssetLifecycleOperation, ReadonlySet<string>>> = {
  checkout: new Set(["ready"]),
  legacy_return_backfill: new Set(["ready", "in use"]),
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
  legacy_return_backfill: "ASSET_STATUS_CHECKOUT_NOT_ALLOWED",
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

  if (operation === "move_scope") {
    return writtenOffStatusNames.has(current) ? "ASSET_STATUS_TRANSFER_NOT_ALLOWED" : null
  }

  const allowed = allowedSources[operation]
  if (allowed?.has(current)) return null
  return operationErrorCodes[operation]
}

// Opening an unfinished repair moves a permanent handover In Use -> Under Maintenance (getRepairRecordCreateEffect), so
// while that repair is open Under Maintenance and Pending Repair also fit the mode; the return then goes into ส่งซ่อม
// under that repair (S-R48, extends S-R43). A temporary loan is unchanged: no unfinished repair opens on Checked Out.
const permanentUnderRepairStatusNames = new Set(["Under Maintenance", "Pending Repair"].map(normalizeAssetStateName))

export function getCheckinHandoverStatusError(
  mode: AssetHandoverMode | string | null | undefined,
  currentStatusName: string | null | undefined,
  options: { hasOpenRepair?: boolean } = {},
): CheckinHandoverStatusError | null {
  if (!isAssetHandoverMode(mode)) return "ASSET_HANDOVER_MODE_MISSING"
  const current = normalizeAssetStateName(currentStatusName)
  if (current === normalizeAssetStateName(getHandoverRequiredSourceStatusName(mode))) return null
  if (mode === "permanent_assignment" && options.hasOpenRepair && permanentUnderRepairStatusNames.has(current)) return null
  return "ASSET_HANDOVER_STATUS_MISMATCH"
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

// The conditions a transaction offers and its route accepts (group 3 spec §19.1): ส่งมอบ hands over only ใหม่/ดี/พอใช้;
// รับคืน also takes เสียหาย/ใช้งานไม่ได้/ซาก. ยังไม่ประเมิน is never chosen on either (the asset form, the import and the
// state review keep selectableConditionNames).
export type AssetOperationConditionOperation = "checkout" | "checkin"
export const checkoutConditionNames = ["New", "Good", "Fair"] as const
export const checkinConditionNames = ["New", "Good", "Fair", "Damaged", "Non-functional", "Salvage"] as const

const operationConditionNames: Record<AssetOperationConditionOperation, ReadonlySet<string>> = {
  checkout: new Set(checkoutConditionNames.map(normalizeAssetStateName)),
  checkin: new Set(checkinConditionNames.map(normalizeAssetStateName)),
}

/** The active masters the operation offers, in master order. */
export function getAssetOperationConditionOptions<T extends AssetStateMaster>(
  operation: AssetOperationConditionOperation,
  conditions: readonly T[],
): T[] {
  const allowed = operationConditionNames[operation]
  return conditions.filter((condition) => condition.isActive !== false && allowed.has(normalizeAssetStateName(condition.name)))
}

export function getAssetOperationConditionError(
  operation: AssetOperationConditionOperation,
  condition: AssetStateMaster | null | undefined,
): Extract<AssetStateSelectionError, "ASSET_STATE_MASTER_NOT_FOUND" | "ASSET_CONDITION_NOT_SELECTABLE"> | null {
  if (!condition || condition.isActive === false) return "ASSET_STATE_MASTER_NOT_FOUND"
  return operationConditionNames[operation].has(normalizeAssetStateName(condition.name)) ? null : "ASSET_CONDITION_NOT_SELECTABLE"
}

// The conditions a repair closed as ใช้งานได้ may end in (group 3 spec §19.4): ดี or พอใช้. ซ่อมไม่ได้ always ends in ซาก
// (repairBeyondRepairConditionName), which nobody chooses.
export const repairUsableConditionNames = ["Good", "Fair"] as const
export const repairBeyondRepairConditionName = "Salvage"

const repairUsableConditions: ReadonlySet<string> = new Set(repairUsableConditionNames.map(normalizeAssetStateName))

/** The active ดี and พอใช้ masters, in master order. */
export function getRepairConditionOptions<T extends AssetStateMaster>(conditions: readonly T[]): T[] {
  return conditions.filter((condition) => condition.isActive !== false && repairUsableConditions.has(normalizeAssetStateName(condition.name)))
}

export function getRepairConditionError(
  condition: AssetStateMaster | null | undefined,
): Extract<AssetStateSelectionError, "ASSET_STATE_MASTER_NOT_FOUND" | "ASSET_CONDITION_NOT_SELECTABLE"> | null {
  if (!condition || condition.isActive === false) return "ASSET_STATE_MASTER_NOT_FOUND"
  return repairUsableConditions.has(normalizeAssetStateName(condition.name)) ? null : "ASSET_CONDITION_NOT_SELECTABLE"
}

/** The asset's own condition when the repair offers it (a routine repair on a ดี asset), else none chosen. */
export function repairConditionDefault(currentConditionId: string | null, options: readonly { id: string }[]): string {
  return currentConditionId && options.some((option) => option.id === currentConditionId) ? currentConditionId : ""
}

// A recorded เสียหาย, ใช้งานไม่ได้ or ซาก refuses a handover (group 3 spec §19.2): the picker, the asset page and the
// checkout route all ask this. ยังไม่ประเมิน is not refused.
export type CheckoutConditionBlock = "damaged" | "nonFunctional" | "salvage"

const checkoutConditionBlocks: ReadonlyMap<string, CheckoutConditionBlock> = new Map([
  [normalizeAssetStateName("Damaged"), "damaged"],
  [normalizeAssetStateName("Non-functional"), "nonFunctional"],
  [normalizeAssetStateName("Salvage"), "salvage"],
])

export function getCheckoutConditionBlock(conditionName: string | null | undefined): CheckoutConditionBlock | null {
  return checkoutConditionBlocks.get(normalizeAssetStateName(conditionName)) ?? null
}

/** Each block's words, full message keys. */
export const checkoutConditionBlockReasonKeys: Readonly<Record<CheckoutConditionBlock, string>> = {
  damaged: "asset.transactionReasonConditionDamaged",
  nonFunctional: "asset.transactionReasonConditionNonFunctional",
  salvage: "asset.transactionReasonConditionSalvage",
}

// The server's legacy return (api/assets/[id]/legacy-checkout) accepts exactly this: Ready or In Use,
// a custodian, no open checkout and no open repair. The register, the asset page and the check-in
// picker all ask this one rule.
export function isLegacyReturnEligible(input: {
  statusName?: string | null
  custodianId?: string | null
  hasOpenCheckout: boolean
  hasActiveMaintenance: boolean
}): boolean {
  return Boolean(input.custodianId)
    && !input.hasOpenCheckout
    && !input.hasActiveMaintenance
    && getAssetLifecycleTransitionError("legacy_return_backfill", input.statusName) === null
}

export function filterLegacyReturnEligibleAssets<T extends {
  status?: AssetStateMaster | null
  custodianId?: string | null
  hasOpenCheckout: boolean
  hasActiveMaintenance: boolean
}>(assets: readonly T[]): T[] {
  return assets.filter((asset) => isLegacyReturnEligible({
    statusName: asset.status?.name,
    custodianId: asset.custodianId,
    hasOpenCheckout: asset.hasOpenCheckout,
    hasActiveMaintenance: asset.hasActiveMaintenance,
  }))
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

export function getTransferTargetStatusName(toCustodianId?: string | null): "In Use" | null {
  return toCustodianId ? "In Use" : null
}

export function getAssetConditionCompatibilityIssue(
  statusName: string | null | undefined,
  conditionName: string | null | undefined,
): "operational_asset_is_damaged" | "repair_asset_marked_good" | null {
  const status = normalizeAssetStateName(statusName)
  const condition = normalizeAssetStateName(conditionName)
  if (["ready", "in use"].includes(status) && ["damaged", "non-functional", "salvage"].includes(condition)) {
    return "operational_asset_is_damaged"
  }
  if (["pending repair", "under maintenance"].includes(status) && condition === "good") {
    return "repair_asset_marked_good"
  }
  return null
}

export function normalizeAssetStateName(value: string | null | undefined): string {
  return value?.trim().toLowerCase() ?? ""
}
import { getHandoverRequiredSourceStatusName, isAssetHandoverMode } from "./asset-handover-mode.ts"
import type { AssetHandoverMode } from "./asset-handover-mode.ts"
