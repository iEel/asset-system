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

// A form goes back to its own list; `alsoFrom` names the other lists whose ⋯ opens it (group 8: "เพิ่มสาขาให้บริษัทนี้" on
// companies opens the branch form, "เพิ่มที่ตั้งในสาขานี้" on branches the location form), so it goes back there too.
export function normalizeMasterDataReturnTo(
  locale: string,
  section: MasterDataReturnSection,
  value: ReturnToParam,
  alsoFrom: readonly MasterDataReturnSection[] = []
) {
  const safeSection = masterDataReturnSections.has(section) ? section : "companies"
  const fallback = `/${locale}/master-data/${safeSection}`
  const raw = Array.isArray(value) ? value[0] : value
  if (!raw) return fallback

  try {
    const url = new URL(raw, "http://asset.local")
    if (url.origin !== "http://asset.local") return fallback
    const allowed = [fallback, ...alsoFrom.filter((other) => masterDataReturnSections.has(other)).map((other) => `/${locale}/master-data/${other}`)]
    if (!allowed.includes(url.pathname)) return fallback
    return `${url.pathname}${url.search}${url.hash}`
  } catch {
    return fallback
  }
}

export function appendMasterDataReturnTo(href: string, returnTo: string) {
  const separator = href.includes("?") ? "&" : "?"
  return `${href}${separator}returnTo=${encodeURIComponent(returnTo)}`
}
