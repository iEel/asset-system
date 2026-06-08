export const assetRegisterColumnOrder = [
  "assetTag",
  "name",
  "category",
  "companyBranch",
  "currentLocation",
  "custodian",
  "ownershipType",
  "status",
  "condition",
  "purchasePrice",
] as const

export type AssetRegisterColumnKey = (typeof assetRegisterColumnOrder)[number]

export type AssetRegisterColumnPresetKey = "all" | "operations" | "accounting" | "audit"

export const assetRegisterColumnStorageKey = "asset-register-columns:v1"

export const assetRegisterColumnPresets = {
  all: assetRegisterColumnOrder,
  operations: ["assetTag", "name", "currentLocation", "custodian", "status", "condition"],
  accounting: ["assetTag", "name", "companyBranch", "category", "purchasePrice", "status"],
  audit: ["assetTag", "name", "category", "currentLocation", "custodian", "status", "condition"],
} satisfies Record<AssetRegisterColumnPresetKey, readonly AssetRegisterColumnKey[]>

const assetRegisterColumnSet = new Set<AssetRegisterColumnKey>(assetRegisterColumnOrder)

export function normalizeAssetRegisterColumns(value: unknown): AssetRegisterColumnKey[] {
  if (!Array.isArray(value)) return [...assetRegisterColumnPresets.all]

  const columns: AssetRegisterColumnKey[] = []
  const seen = new Set<AssetRegisterColumnKey>()

  for (const item of value) {
    if (!assetRegisterColumnSet.has(item as AssetRegisterColumnKey)) continue

    const column = item as AssetRegisterColumnKey
    if (seen.has(column)) continue
    seen.add(column)
    columns.push(column)
  }

  return columns.length > 0 ? columns : [...assetRegisterColumnPresets.all]
}

export function assetRegisterColumnsMatchPreset(
  columns: Iterable<AssetRegisterColumnKey>,
  preset: readonly AssetRegisterColumnKey[]
) {
  const current = Array.from(columns)
  if (current.length !== preset.length) return false
  return preset.every((column) => current.includes(column))
}
