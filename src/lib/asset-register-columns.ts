// Group 4 plan 1 Task 2 (spec §6.1): one "asset" column (photo, the full name, the tag under it) replaces the tag and
// the name columns.
export const assetRegisterColumnOrder = [
  "asset",
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
  operations: ["asset", "currentLocation", "custodian", "status", "condition"],
  accounting: ["asset", "companyBranch", "category", "purchasePrice", "status"],
  audit: ["asset", "category", "currentLocation", "custodian", "status", "condition"],
} satisfies Record<AssetRegisterColumnPresetKey, readonly AssetRegisterColumnKey[]>

const assetRegisterColumnSet = new Set<AssetRegisterColumnKey>(assetRegisterColumnOrder)
// The keys a column set stored before group 4 can hold: the tag and the name became "asset" (P1-R4).
const legacyAssetColumnKeys = new Set(["assetTag", "name"])

export function normalizeAssetRegisterColumns(value: unknown): AssetRegisterColumnKey[] {
  if (!Array.isArray(value)) return [...assetRegisterColumnPresets.all]

  const columns: AssetRegisterColumnKey[] = []
  const seen = new Set<AssetRegisterColumnKey>()

  for (const item of value) {
    const mapped = legacyAssetColumnKeys.has(item as string) ? "asset" : item
    if (!assetRegisterColumnSet.has(mapped as AssetRegisterColumnKey)) continue

    const column = mapped as AssetRegisterColumnKey
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
 * Desktop widths in px. `asset` is the minimum; the asset column takes the remaining space.
 * actions 172: the RowActions pair (next step 120 + 4 + ⋯ 32 = 156) fits between pl-1.5 pr-2 and the left line
 * (172 − 6 − 8 − 0.5 = 157.5, spec 2B I26). Group 4 plan 1 P1-R3: asset 280, currentLocation 180 and custodian 200 (two
 * lines each), so operations is 44 + 280 + 180 + 200 + 132 + 96 + 172 = 1,104px and accounting 1,024px: a 1440px screen
 * leaves 1,117px, so the default columns never scroll sideways (DESIGN.md, asset register).
 */
export const assetRegisterColumnWidths = {
  select: 44,
  asset: 280,
  category: 160,
  companyBranch: 116,
  currentLocation: 180,
  custodian: 200,
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
