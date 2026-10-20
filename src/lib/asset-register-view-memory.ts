const assetRegisterViewKeys = [
  "search",
  "companyId",
  "branchId",
  "categoryId",
  "brandId",
  "modelId",
  "statusId",
  "conditionId",
  "ownershipType",
  "custodianId",
  "supplierId",
  "dataQuality",
  "crossScope",
  "pageSize",
  "sort",
  "direction",
] as const

// A link from a number on the dashboard or the work center carries this flag: the register
// shows exactly what the link asks for, without restoring or overwriting the saved view.
export const assetRegisterExactLinkParam = "exact"

export function isExactAssetRegisterLink(params: URLSearchParams): boolean {
  return params.get(assetRegisterExactLinkParam) === "1"
}

export function buildExactAssetRegisterHref(locale: string, params: Record<string, string> = {}): string {
  const query = new URLSearchParams(params)
  query.set(assetRegisterExactLinkParam, "1")
  return `/${locale}/assets?${query.toString()}`
}

export function assetRegisterViewPreferenceKey(locale: string) {
  return `asset-register-view:v1:${locale}`
}

export function assetRegisterScrollMemoryKey(returnHref: string) {
  return `asset-register-scroll:v1:${returnHref}`
}

export function getPersistedAssetRegisterView(searchParams: URLSearchParams) {
  const persisted = new URLSearchParams()

  for (const key of assetRegisterViewKeys) {
    const value = searchParams.get(key)?.trim()
    if (value) persisted.set(key, value)
  }

  return persisted
}

export function hasExplicitAssetRegisterView(searchParams: URLSearchParams) {
  return assetRegisterViewKeys.some((key) => Boolean(searchParams.get(key)?.trim()))
}

export function readPersistedAssetRegisterView(value: string | null) {
  if (!value) return new URLSearchParams()
  return getPersistedAssetRegisterView(new URLSearchParams(value))
}

export function rememberAssetRegisterScrollPosition(returnHref: string) {
  if (typeof window === "undefined") return

  const main = document.querySelector<HTMLElement>("[data-dashboard-main]")
  if (!main) return

  window.sessionStorage.setItem(assetRegisterScrollMemoryKey(returnHref), String(main.scrollTop))
}
