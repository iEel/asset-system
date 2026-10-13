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

/**
 * Desktop widths in px. `name` is the minimum; the name column takes the remaining space.
 * actions 172: the RowActions pair (next step 120 + 4 + ⋯ 32 = 156) fits between pl-1.5 pr-2 and the left line
 * (172 − 6 − 8 − 0.5 = 157.5, spec 2B I26). companyBranch 116 keeps the accounting preset at 1,116px, and operations is
 * 1,116px too: a 1440px screen leaves 1,117px, so the default columns never scroll sideways (DESIGN.md, asset register).
 */
export const assetRegisterColumnWidths = {
  select: 44,
  assetTag: 172,
  name: 200,
  category: 160,
  companyBranch: 116,
  currentLocation: 140,
  custodian: 160,
  ownershipType: 120,
  status: 132,
  condition: 96,
  purchasePrice: 120,
  actions: 172,
} satisfies Record<AssetRegisterColumnKey | "select" | "actions", number>

export function getAssetRegisterTableMinWidth(columns: Iterable<AssetRegisterColumnKey>) {
  let width = assetRegisterColumnWidths.select + assetRegisterColumnWidths.actions
  for (const column of columns) width += assetRegisterColumnWidths[column]
  return width
}
