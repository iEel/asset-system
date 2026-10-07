import { buildAssetQueryString, type AssetListFilters } from "./asset-list-query.ts"

export const assetRegisterSearchDebounceMs = 400
export const assetRegisterMinAutoSearchLength = 2
export const assetRegisterDefaultPageSize = 25

/** Decide whether a pause in typing should run a search. Enter bypasses this. */
export function shouldAutoSearch(draft: string, applied: string): boolean {
  const next = draft.trim()
  if (next === applied.trim()) return false
  if (next.length === 0) return true
  return Array.from(next).length >= assetRegisterMinAutoSearchLength
}

export function mergeAssetRegisterFilters(
  base: AssetListFilters,
  overrides: Partial<AssetListFilters>,
): AssetListFilters {
  return { ...base, ...overrides, page: 1 }
}

export function buildAssetRegisterFilterHref(
  basePath: string,
  base: AssetListFilters,
  overrides: Partial<AssetListFilters>,
) {
  return `${basePath}?${buildAssetQueryString(mergeAssetRegisterFilters(base, overrides))}`
}

/** A branch from another company would empty the list, so it is dropped with the company change. */
export function getCompanyChangeOverrides(
  companyId: string,
  currentBranchId: string,
  branches: readonly { id: string; companyId: string }[],
) {
  if (!companyId || !currentBranchId) return { companyId, branchId: currentBranchId }
  const branch = branches.find((item) => item.id === currentBranchId)
  return { companyId, branchId: branch?.companyId === companyId ? currentBranchId : "" }
}

export type AssetRegisterSheetScope = {
  /** Mobile moves company, branch and category into the sheet. */
  includeScope: boolean
  /** Statuses that have their own tab are not sheet filters. */
  tabStatusIds: readonly string[]
}

export type AssetRegisterSheetFilterKey =
  | "companyId"
  | "branchId"
  | "categoryId"
  | "statusId"
  | "conditionId"
  | "ownershipType"
  | "dataQuality"
  | "crossScope"
  | "pageSize"

const scopeKeys = ["companyId", "branchId", "categoryId"] as const

export function getActiveSheetFilterKeys(
  filters: AssetListFilters,
  scope: AssetRegisterSheetScope,
): AssetRegisterSheetFilterKey[] {
  const keys: AssetRegisterSheetFilterKey[] = []
  if (scope.includeScope) {
    for (const key of scopeKeys) if (filters[key]) keys.push(key)
  }
  if (filters.statusId && !scope.tabStatusIds.includes(filters.statusId)) keys.push("statusId")
  if (filters.conditionId) keys.push("conditionId")
  if (filters.ownershipType) keys.push("ownershipType")
  if (filters.dataQuality) keys.push("dataQuality")
  if (filters.crossScope) keys.push("crossScope")
  if (filters.pageSize !== assetRegisterDefaultPageSize) keys.push("pageSize")
  return keys
}

export function buildSheetClearOverrides(
  filters: AssetListFilters,
  scope: AssetRegisterSheetScope,
): Partial<AssetListFilters> {
  const overrides: Partial<AssetListFilters> = {}
  for (const key of getActiveSheetFilterKeys(filters, scope)) {
    if (key === "pageSize") overrides.pageSize = assetRegisterDefaultPageSize
    else Object.assign(overrides, { [key]: "" })
  }
  return overrides
}
