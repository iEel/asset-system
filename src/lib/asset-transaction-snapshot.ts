export const assetTransactionSnapshotVersion = 1 as const
export const maxAssetTransactionSnapshotComponents = 500

export type AssetComponentTransactionSnapshotV1 = {
  componentLinkId: string
  componentAssetId: string
  parentAssetId: string
  relationshipStatus: string
  relationshipUpdatedAt: string
  assetUpdatedAt: string
  statusId: string
  conditionId: string
  branchId: string
  currentLocationId: string
  custodianId: string | null
  departmentId: string | null
}

export type AssetTransactionSnapshotV1 = {
  version: typeof assetTransactionSnapshotVersion
  assetId: string
  assetUpdatedAt: string
  statusId: string
  conditionId: string
  branchId: string
  currentLocationId: string
  custodianId: string | null
  departmentId: string | null
  checkout?: { id: string; isReturned: boolean } | null
  components: AssetComponentTransactionSnapshotV1[]
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value)
}

function isString(value: unknown): value is string {
  return typeof value === "string" && value.length > 0
}

function isNullableString(value: unknown): value is string | null {
  return value === null || isString(value)
}

function isComponentSnapshot(value: unknown): value is AssetComponentTransactionSnapshotV1 {
  if (!isRecord(value)) return false

  return (
    isString(value.componentLinkId) &&
    isString(value.componentAssetId) &&
    isString(value.parentAssetId) &&
    isString(value.relationshipStatus) &&
    isString(value.relationshipUpdatedAt) &&
    isString(value.assetUpdatedAt) &&
    isString(value.statusId) &&
    isString(value.conditionId) &&
    isString(value.branchId) &&
    isString(value.currentLocationId) &&
    isNullableString(value.custodianId) &&
    isNullableString(value.departmentId)
  )
}

function isCheckoutSnapshot(value: unknown): value is { id: string; isReturned: boolean } | null | undefined {
  return (
    value === undefined ||
    value === null ||
    (isRecord(value) && isString(value.id) && typeof value.isReturned === "boolean")
  )
}

function isAssetTransactionSnapshotV1(value: unknown): value is AssetTransactionSnapshotV1 {
  if (!isRecord(value) || value.version !== assetTransactionSnapshotVersion) return false
  if (!Array.isArray(value.components) || value.components.length > maxAssetTransactionSnapshotComponents) return false

  return (
    isString(value.assetId) &&
    isString(value.assetUpdatedAt) &&
    isString(value.statusId) &&
    isString(value.conditionId) &&
    isString(value.branchId) &&
    isString(value.currentLocationId) &&
    isNullableString(value.custodianId) &&
    isNullableString(value.departmentId) &&
    isCheckoutSnapshot(value.checkout) &&
    value.components.every(isComponentSnapshot)
  )
}

export function parseAssetTransactionSnapshot(json: string | null | undefined): AssetTransactionSnapshotV1 | null {
  if (!json) return null

  try {
    const value: unknown = JSON.parse(json)
    return isAssetTransactionSnapshotV1(value) ? value : null
  } catch {
    return null
  }
}

export function serializeAssetTransactionSnapshot(snapshot: AssetTransactionSnapshotV1): string {
  if (!isAssetTransactionSnapshotV1(snapshot)) {
    throw new TypeError("Invalid asset transaction snapshot")
  }
  return JSON.stringify(snapshot)
}
