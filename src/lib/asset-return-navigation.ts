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
    const assetDetailPrefix = `${fallback}/`
    const assetDetailId = url.pathname.startsWith(assetDetailPrefix) ? url.pathname.slice(assetDetailPrefix.length) : ""
    const isAssetDetailPath = assetDetailId.length > 0 && !assetDetailId.includes("/")
    if (!safeTargets.has(url.pathname) && !isAssetDetailPath) return fallback
    return `${url.pathname}${url.search}${url.hash}`
  } catch {
    return fallback
  }
}

// ยกเลิก on ส่งมอบ, รับคืน and โอนย้าย (group 3 spec §5): the normalized returnTo, else the register.
export function getOperationCancelHref(locale: string, returnTo: string | undefined): string {
  return normalizeAssetReturnTo(locale, returnTo)
}

export function normalizeAssetComponentManagerReturnTo(locale: string, assetId: string, value: ReturnToParam) {
  const allowedPath = `/${locale}/assets/${encodeURIComponent(assetId)}`
  const fallback = `${allowedPath}?view=components`
  const registerPath = `/${locale}/assets`
  // A scan card's จัดการส่วนควบ carries the scan page as its returnTo (group 4 plan 4 final review).
  const scanPath = `/${locale}/asset-management/scan`
  const allowedPaths = new Set([allowedPath, registerPath, scanPath])
  const raw = Array.isArray(value) ? value[0] : value
  if (!raw) return fallback

  try {
    const url = new URL(raw, "http://asset.local")
    if (url.origin !== "http://asset.local" || !allowedPaths.has(url.pathname)) return fallback
    return `${url.pathname}${url.search}${url.hash}`
  } catch {
    return fallback
  }
}

export function appendReturnTo(href: string, returnTo: string) {
  const separator = href.includes("?") ? "&" : "?"
  return `${href}${separator}returnTo=${encodeURIComponent(returnTo)}`
}
