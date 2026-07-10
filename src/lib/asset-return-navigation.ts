type ReturnToParam = string | string[] | undefined

export function normalizeAssetReturnTo(locale: string, value: ReturnToParam) {
  const fallback = `/${locale}/assets`
  const safeTargets = new Set([
    fallback,
    `/${locale}/asset-management/scan`,
  ])
  const raw = Array.isArray(value) ? value[0] : value
  if (!raw) return fallback

  try {
    const url = new URL(raw, "http://asset.local")
    if (url.origin !== "http://asset.local") return fallback
    if (!safeTargets.has(url.pathname)) return fallback
    return `${url.pathname}${url.search}${url.hash}`
  } catch {
    return fallback
  }
}

export function appendReturnTo(href: string, returnTo: string) {
  const separator = href.includes("?") ? "&" : "?"
  return `${href}${separator}returnTo=${encodeURIComponent(returnTo)}`
}
