type ReturnToParam = string | string[] | undefined

const operationalReturnPaths = {
  maintenance: (locale: string) => `/${locale}/maintenance`,
  disposal: (locale: string) => `/${locale}/disposal`,
  "audit-rounds": (locale: string) => `/${locale}/audit/rounds`,
  "audit-findings": (locale: string) => `/${locale}/audit/findings`,
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
