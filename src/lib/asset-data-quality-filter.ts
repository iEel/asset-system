export const assetDataQualityFilters = ["responsibility", "serial", "photo", "department", "purchase", "warranty"] as const

export type AssetDataQualityFilter = (typeof assetDataQualityFilters)[number]

export function normalizeAssetDataQualityFilter(value: unknown): AssetDataQualityFilter | "" {
  const raw = Array.isArray(value) ? value[0] : value
  return assetDataQualityFilters.includes(raw as AssetDataQualityFilter)
    ? (raw as AssetDataQualityFilter)
    : ""
}
