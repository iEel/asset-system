export const assetCrossScopeFilterValues = ["all", "custodian_company", "custodian_branch", "location_branch"] as const

export type AssetCrossScopeFilter = (typeof assetCrossScopeFilterValues)[number]

export type AssetCrossScopeFlags = {
  custodianCompany: boolean
  custodianBranch: boolean
  locationBranch: boolean
  any: boolean
}

export type AssetCrossScopeInput = {
  companyId: string
  branchId: string
  custodian?: { companyId: string; branchId: string } | null
  homeLocation?: { branchId: string } | null
  currentLocation?: { branchId: string } | null
}

export function normalizeAssetCrossScopeFilter(value: unknown): AssetCrossScopeFilter | "" {
  const normalized = typeof value === "string" ? value.trim() : ""
  return assetCrossScopeFilterValues.includes(normalized as AssetCrossScopeFilter)
    ? (normalized as AssetCrossScopeFilter)
    : ""
}

export function getAssetCrossScopeFlags(asset: AssetCrossScopeInput): AssetCrossScopeFlags {
  const custodianCompany = Boolean(asset.custodian && asset.custodian.companyId !== asset.companyId)
  const custodianBranch = Boolean(asset.custodian && asset.custodian.branchId !== asset.branchId)
  const locationBranch = Boolean(
    (asset.homeLocation && asset.homeLocation.branchId !== asset.branchId) ||
      (asset.currentLocation && asset.currentLocation.branchId !== asset.branchId)
  )

  return {
    custodianCompany,
    custodianBranch,
    locationBranch,
    any: custodianCompany || custodianBranch || locationBranch,
  }
}

export function assetMatchesCrossScopeFilter(asset: AssetCrossScopeInput, filter: AssetCrossScopeFilter | "") {
  const flags = getAssetCrossScopeFlags(asset)
  if (filter === "all") return flags.any
  if (filter === "custodian_company") return flags.custodianCompany
  if (filter === "custodian_branch") return flags.custodianBranch
  if (filter === "location_branch") return flags.locationBranch
  return true
}

export function summarizeAssetCrossScope(assets: AssetCrossScopeInput[]) {
  return assets.reduce(
    (summary, asset) => {
      const flags = getAssetCrossScopeFlags(asset)
      if (flags.any) summary.all += 1
      if (flags.custodianCompany) summary.custodianCompany += 1
      if (flags.custodianBranch) summary.custodianBranch += 1
      if (flags.locationBranch) summary.locationBranch += 1
      return summary
    },
    { all: 0, custodianCompany: 0, custodianBranch: 0, locationBranch: 0 }
  )
}

export function getAssetCrossScopeFlagLabels(
  flags: AssetCrossScopeFlags,
  labels: { custodianCompany: string; custodianBranch: string; locationBranch: string }
) {
  return [
    flags.custodianCompany ? labels.custodianCompany : null,
    flags.custodianBranch ? labels.custodianBranch : null,
    flags.locationBranch ? labels.locationBranch : null,
  ].filter((label): label is string => Boolean(label))
}
