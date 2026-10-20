const loginCallbackBaseOrigin = "http://asset.local"

function firstString(value: string | string[] | undefined) {
  return typeof value === "string" ? value : null
}

export function normalizeLoginCallbackUrl(
  locale: string,
  value: string | string[] | undefined,
  allowedOrigins: string[] = []
) {
  const fallback = `/${locale}`
  const candidate = firstString(value)
  if (!candidate || candidate.includes("\\")) return fallback

  try {
    const isRelative = candidate.startsWith("/") && !candidate.startsWith("//")
    const url = new URL(candidate, loginCallbackBaseOrigin)
    const normalizedAllowedOrigins = new Set(
      allowedOrigins.flatMap((origin) => {
        try {
          return [new URL(origin).origin]
        } catch {
          return []
        }
      })
    )

    if (!isRelative && !normalizedAllowedOrigins.has(url.origin)) return fallback
    if (url.username || url.password) return fallback
    if (url.pathname !== fallback && !url.pathname.startsWith(`${fallback}/`)) return fallback

    return `${url.pathname}${url.search}${url.hash}`
  } catch {
    return fallback
  }
}

// The proxy (src/proxy.ts) stamps the page a person asked for into this request header, overwriting any value
// the client sent, so a signed-out page can send the person to the login and back. No imports: the proxy loads this.
export const requestPathHeader = "x-asset-request-path"

export function buildRequestPath(url: URL): string {
  const copy = new URL(url)
  copy.searchParams.delete("_rsc")
  return `${copy.pathname}${copy.search}`
}

export function buildLoginHref(locale: string, requestPath: string | null | undefined): string {
  const login = `/${locale}/login`
  // The same check the login page applies to callbackUrl: same locale, relative only.
  const target = normalizeLoginCallbackUrl(locale, requestPath ?? undefined)
  if (target === `/${locale}` || target === login || target.startsWith(`${login}?`) || target.startsWith(`${login}#`)) {
    return login
  }
  return `${login}?${new URLSearchParams({ callbackUrl: target }).toString()}`
}

export function isSessionExpiredLogin(
  reason: string | string[] | undefined,
  error: string | string[] | undefined
) {
  return firstString(reason) === "session-expired" || firstString(error) === "SessionExpired"
}
