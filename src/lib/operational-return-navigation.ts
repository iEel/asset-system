type ReturnToParam = string | string[] | undefined

const operationalReturnPaths = {
  maintenance: (locale: string) => `/${locale}/maintenance`,
  disposal: (locale: string) => `/${locale}/disposal`,
  "audit-rounds": (locale: string) => `/${locale}/audit/rounds`,
  "audit-findings": (locale: string) => `/${locale}/audit/findings`,
  // The PM plan list, whose page and page size the edit page carries back (spec 2B B4, §5.9.2 row 6).
  "maintenance-pm": (locale: string) => `/${locale}/maintenance/pm`,
  // My Assets, whose page and page size the detail page carries back (spec 2B §5.9.2 row 9, 2D M32 c).
  "my-assets": (locale: string) => `/${locale}/my-assets`,
} as const

export type OperationalReturnSection = keyof typeof operationalReturnPaths

export function normalizeOperationalReturnTo(
  locale: string,
  section: OperationalReturnSection,
  value: ReturnToParam,
) {
  const fallback = operationalReturnPaths[section](locale)
  return normalizeInternalReturnTo(fallback, value)
}

export function normalizeAuditRoundDetailReturnTo(locale: string, roundId: string, value: ReturnToParam) {
  const fallback = `/${locale}/audit/rounds/${roundId}`
  return normalizeInternalReturnTo(fallback, value)
}

export function normalizeAuditRoundWorkflowReturnTo(locale: string, roundId: string, value: ReturnToParam) {
  const fallback = `/${locale}/audit/rounds/${roundId}`
  const scanPath = `/${locale}/audit/rounds/${roundId}/scan`
  return normalizeInternalReturnTo(fallback, value, [scanPath])
}

// The back button of a disposal batch page (spec 2B §5.9.2 row 5): the batch history list, with its page and page size,
// when the user came from there; otherwise the disposal queue, as before (a queue URL with its filters stays valid too).
export function normalizeDisposalBatchReturnTo(locale: string, value: ReturnToParam) {
  const fallback = `/${locale}/disposal`
  const batchesPath = `/${locale}/disposal/batches`
  return normalizeInternalReturnTo(fallback, value, [batchesPath])
}

// A disposal request page's way back (request batches): the queue (with its query and hash), or the one batch page the
// request was opened from (`/[locale]/disposal/batches/<uuid>`, with its query). Anything else, another site, another
// locale, the batch list or a deeper path, is the queue. `new URL` resolves `..` first.
const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export function normalizeDisposalRequestReturnTo(locale: string, value: ReturnToParam): string {
  const fallback = operationalReturnPaths.disposal(locale)
  const raw = Array.isArray(value) ? value[0] : value
  if (!raw) return fallback

  try {
    const url = new URL(raw, "http://asset.local")
    if (url.origin !== "http://asset.local") return fallback
    if (url.pathname === fallback) return `${url.pathname}${url.search}${url.hash}`
    const batches = `/${locale}/disposal/batches/`
    const batchId = url.pathname.startsWith(batches) ? url.pathname.slice(batches.length) : ""
    if (uuidPattern.test(batchId)) return `${url.pathname}${url.search}`
    return fallback
  } catch {
    return fallback
  }
}

// The findings page's way back (group 2 plan 4, P4-R12): the rounds list with its filters, or one round's page, the pages
// that link here (not the create page). Anything else is no way back (null), and the page falls back to the round or
// the rounds list.
export function normalizeAuditFindingsReturnTo(locale: string, value: ReturnToParam): string | null {
  const raw = Array.isArray(value) ? value[0] : value
  if (!raw) return null

  try {
    const url = new URL(raw, "http://asset.local")
    const rounds = `/${locale}/audit/rounds`
    const roundId = url.pathname.startsWith(`${rounds}/`) ? url.pathname.slice(rounds.length + 1) : ""
    const roundPage = roundId.length > 0 && !roundId.includes("/") && roundId !== "new"
    if (url.origin !== "http://asset.local" || (url.pathname !== rounds && !roundPage)) return null
    return `${url.pathname}${url.search}${url.hash}`
  } catch {
    return null
  }
}

// The repair and PM forms' and the repair record's way back (group 5 spec §5 "Way back", G5P1-R14, R15): the repair
// list (with its query and hash), the PM list (with its query), one asset page (with its query, e.g. ?view=maintenance)
// or one audit round's confirm page (with its query).
// Anything else, another site, another locale or a deeper asset path, is the page's own list. `new URL` resolves `..`
// first, so `/th/maintenance/../admin` is `/th/admin` and falls back.
export function normalizeMaintenanceReturnTo(locale: string, value: ReturnToParam, list: "maintenance" | "maintenance-pm"): string {
  const fallback = operationalReturnPaths[list](locale)
  const raw = Array.isArray(value) ? value[0] : value
  if (!raw) return fallback

  try {
    const url = new URL(raw, "http://asset.local")
    if (url.origin !== "http://asset.local") return fallback
    const repairList = operationalReturnPaths.maintenance(locale)
    if (url.pathname === repairList) return `${url.pathname}${url.search}${url.hash}`
    if (url.pathname === operationalReturnPaths["maintenance-pm"](locale)) return `${url.pathname}${url.search}`
    const assets = `/${locale}/assets/`
    const assetId = url.pathname.startsWith(assets) ? url.pathname.slice(assets.length) : ""
    // `new` is the asset create route, not an asset page.
    if (assetId.length > 0 && assetId !== "new" && !assetId.includes("/")) return `${url.pathname}${url.search}`
    // One round's confirm page, with its query (ยืนยันผลตรวจ plan 4: a damaged asset's บันทึกซ่อม returns to its tab).
    const rounds = `/${locale}/audit/rounds/`
    const confirmSuffix = "/confirm"
    if (url.pathname.startsWith(rounds) && url.pathname.endsWith(confirmSuffix)) {
      const roundId = url.pathname.slice(rounds.length, url.pathname.length - confirmSuffix.length)
      if (uuidPattern.test(roundId)) return `${url.pathname}${url.search}`
    }
    return fallback
  } catch {
    return fallback
  }
}

// The first breadcrumb names the page's own list (G5P1-R14): it keeps returnTo's query only when returnTo is that list,
// and is the bare list otherwise (an asset page, or the other list).
export function maintenanceListCrumbHref(returnTo: string, listPath: string): string {
  try {
    return new URL(returnTo, "http://asset.local").pathname === listPath ? returnTo : listPath
  } catch {
    return listPath
  }
}

export function appendOperationalReturnTo(href: string, returnTo: string) {
  const separator = href.includes("?") ? "&" : "?"
  return `${href}${separator}returnTo=${encodeURIComponent(returnTo)}`
}

function normalizeInternalReturnTo(fallback: string, value: ReturnToParam, allowedPaths: string[] = []) {
  const raw = Array.isArray(value) ? value[0] : value
  if (!raw) return fallback

  try {
    const url = new URL(raw, "http://asset.local")
    if (url.origin !== "http://asset.local") return fallback
    if (url.pathname !== fallback && !allowedPaths.includes(url.pathname)) return fallback
    return `${url.pathname}${url.search}${url.hash}`
  } catch {
    return fallback
  }
}
