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

export function isSessionExpiredLogin(
  reason: string | string[] | undefined,
  error: string | string[] | undefined
) {
  return firstString(reason) === "session-expired" || firstString(error) === "SessionExpired"
}
