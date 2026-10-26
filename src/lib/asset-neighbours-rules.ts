import { parseAssetListParams } from "./asset-list-query.ts"

// Where the asset page sits in the register list it was opened from: `index` is the 1-based position, the "3" of
// "3 / 24" (group 1 spec §7.2).
export type AssetNeighbours = { index: number; total: number; previousId: string | null; nextId: string | null }

const registerOrigin = "http://asset.local"

/**
 * The register's query when `returnTo` is the register itself (`/<locale>/assets`, with or without a query), else
 * `null`: opened directly, from the scan page or any other page there is no list to step through. Reads the raw
 * value, before normalizeAssetReturnTo turns a missing one into the register.
 */
export function parseRegisterReturnTo(raw: string | string[] | undefined, locale: string): URLSearchParams | null {
  const value = Array.isArray(raw) ? raw[0] : raw
  if (!value) return null

  let url: URL
  try {
    url = new URL(value, registerOrigin)
  } catch {
    return null
  }
  if (url.origin !== registerOrigin || url.pathname !== `/${locale}/assets`) return null
  return url.searchParams
}

// Every filter the register can clear. The order, the page and the page size are not filters.
const registerFilterKeys = [
  "companyId",
  "branchId",
  "categoryId",
  "brandId",
  "modelId",
  "statusId",
  "conditionId",
  "ownershipType",
  "custodianId",
  "custodianState",
  "locationId",
  "supplierId",
  "dataQuality",
  "crossScope",
  "activity",
] as const

/** The middle crumb: the search when there is one, else "filtered" when any filter is set, else none. */
export function buildRegisterCrumbLabel(params: URLSearchParams): { kind: "search"; text: string } | { kind: "filters" } | null {
  const filters = parseAssetListParams(params)
  if (filters.search) return { kind: "search", text: filters.search }
  if (registerFilterKeys.some((key) => Boolean(filters[key]))) return { kind: "filters" }
  return null
}

export function pickAssetNeighbours(ids: readonly string[], assetId: string): AssetNeighbours | null {
  const position = ids.indexOf(assetId)
  if (position === -1) return null
  return {
    index: position + 1,
    total: ids.length,
    previousId: position > 0 ? ids[position - 1] : null,
    nextId: position < ids.length - 1 ? ids[position + 1] : null,
  }
}
