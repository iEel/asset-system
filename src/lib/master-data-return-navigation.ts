type ReturnToParam = string | string[] | undefined

const masterDataReturnSections = new Set([
  "branches",
  "brands",
  "categories",
  "companies",
  "departments",
  "employees",
  "locations",
  "suppliers",
])

export type MasterDataReturnSection =
  | "branches"
  | "brands"
  | "categories"
  | "companies"
  | "departments"
  | "employees"
  | "locations"
  | "suppliers"

export function normalizeMasterDataReturnTo(
  locale: string,
  section: MasterDataReturnSection,
  value: ReturnToParam
) {
  const safeSection = masterDataReturnSections.has(section) ? section : "companies"
  const fallback = `/${locale}/master-data/${safeSection}`
  const raw = Array.isArray(value) ? value[0] : value
  if (!raw) return fallback

  try {
    const url = new URL(raw, "http://asset.local")
    if (url.origin !== "http://asset.local") return fallback
    if (url.pathname !== fallback) return fallback
    return `${url.pathname}${url.search}${url.hash}`
  } catch {
    return fallback
  }
}

export function appendMasterDataReturnTo(href: string, returnTo: string) {
  const separator = href.includes("?") ? "&" : "?"
  return `${href}${separator}returnTo=${encodeURIComponent(returnTo)}`
}
