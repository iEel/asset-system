export const mobileFieldNavigationItems = ["home", "assets", "scan", "audit", "more"] as const

export type MobileFieldNavigationItem = (typeof mobileFieldNavigationItems)[number]
export type MobileShellMode = "navigation" | "focus"

const focusTaskRoutes = [
  /^\/asset-management\/(?:scan|checkout|checkin|transfer|bulk-move)$/,
  /^\/assets\/new$/,
  /^\/assets\/(?!labels(?:\/|$))[^/]+(?:\/(?:edit|label))?$/,
  /^\/audit\/rounds\/new$/,
  /^\/audit\/rounds\/[^/]+(?:\/scan)?$/,
  /^\/maintenance\/[^/]+$/,
  /^\/disposal\/[^/]+$/,
]

export function getMobileShellMode(pathname: string): MobileShellMode {
  const route = getRouteWithoutLocale(pathname)
  return focusTaskRoutes.some((pattern) => pattern.test(route)) ? "focus" : "navigation"
}

export function getMobileFieldNavigationActiveItem(pathname: string): MobileFieldNavigationItem {
  const route = getRouteWithoutLocale(pathname)

  if (route === "/dashboard") return "home"
  if (route === "/asset-management/scan") return "scan"
  if (route === "/assets" || route.startsWith("/assets/") || route === "/my-assets" || route.startsWith("/asset-management/")) {
    return "assets"
  }
  if (route === "/audit" || route.startsWith("/audit/")) return "audit"
  return "more"
}

export function isMobileVirtualKeyboardVisible(viewportHeight: number | undefined, layoutHeight: number) {
  if (viewportHeight === undefined || !Number.isFinite(viewportHeight) || !Number.isFinite(layoutHeight)) return false
  return layoutHeight - viewportHeight >= 120
}

function getRouteWithoutLocale(pathname: string) {
  const pathOnly = pathname.split(/[?#]/, 1)[0] || "/"
  const normalizedPath = `/${pathOnly.split("/").filter(Boolean).join("/")}`
  const segments = normalizedPath.split("/").filter(Boolean)

  if (segments[0] && /^[a-z]{2}(?:-[A-Za-z]{2})?$/.test(segments[0])) {
    segments.shift()
  }

  return segments.length > 0 ? `/${segments.join("/")}` : "/"
}
