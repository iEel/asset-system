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
