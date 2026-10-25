// The session's idle and ceiling rules (menu B shell spec §6.8), carried as two JWT claims in epoch seconds:
// `loginAt` (set at sign-in, never moves) and `activeAt` (moves only on a keep-alive, `trigger === "update"`).
// Pure and import-free, so tests and src/lib/auth.ts share it.

export const DEFAULT_SESSION_IDLE_SECONDS = 3600
export const DEFAULT_SESSION_CEILING_SECONDS = 43200

export type SessionClock = { loginAt: string; activeAt: string; idleDeadline: string; ceilingDeadline: string }
export type SessionStatusResponse = SessionClock & { serverNow: string }

// The index signature keeps any token shape (Auth.js's JWT, a test literal) assignable: an all-optional type alone
// would reject an object that has neither claim, and such a token must reach the expiry check.
type SessionClaims = Record<string, unknown> & { loginAt?: unknown; activeAt?: unknown }

/** A whole number of seconds above 0, or the fallback: a bad env value never signs everyone out (Review Focus F4). */
export function readSessionSeconds(value: string | undefined, fallback: number): number {
  const trimmed = value?.trim() ?? ""
  if (!/^\d+$/.test(trimmed)) return fallback
  const seconds = Number(trimmed)
  return Number.isSafeInteger(seconds) && seconds > 0 ? seconds : fallback
}

function claim(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null
}

/** The idle deadline is the last activity plus the idle limit, capped by the ceiling. A claimless token is expired. */
export function sessionDeadlines(
  token: { loginAt?: number; activeAt?: number },
  now: number,
  idleSeconds: number,
  ceilingSeconds: number
): { idleDeadline: number; ceilingDeadline: number; expired: boolean } {
  const loginAt = claim(token.loginAt)
  const activeAt = claim(token.activeAt)
  if (loginAt === null || activeAt === null) return { idleDeadline: 0, ceilingDeadline: 0, expired: true }
  const ceilingDeadline = loginAt + ceilingSeconds
  const idleDeadline = Math.min(activeAt + idleSeconds, ceilingDeadline)
  return { idleDeadline, ceilingDeadline, expired: now > idleDeadline }
}

const isoSeconds = (seconds: number) => new Date(seconds * 1000).toISOString()

/** What the client gets: the claims and both deadlines as ISO time, or null for a claimless token. */
export function sessionClock(
  token: { loginAt?: number; activeAt?: number },
  idleSeconds: number,
  ceilingSeconds: number
): SessionClock | null {
  const loginAt = claim(token.loginAt)
  const activeAt = claim(token.activeAt)
  if (loginAt === null || activeAt === null) return null
  const { idleDeadline, ceilingDeadline } = sessionDeadlines({ loginAt, activeAt }, 0, idleSeconds, ceilingSeconds)
  return {
    loginAt: isoSeconds(loginAt),
    activeAt: isoSeconds(activeAt),
    idleDeadline: isoSeconds(idleDeadline),
    ceilingDeadline: isoSeconds(ceilingDeadline),
  }
}

/**
 * The jwt callback after sign-in. An expired or claimless token ends before the access refresh (no database read).
 * A read keeps `activeAt`; only an update (the keep-alive's `unstable_update`) moves it. A refresh that ends the
 * session (an inactive user) wins over an update.
 */
export async function continueSessionToken<T extends SessionClaims>(
  token: T,
  options: {
    trigger?: string
    now: number
    idleSeconds: number
    ceilingSeconds: number
    refresh: (token: T) => Promise<T | null>
  }
): Promise<T | null> {
  const claims = { loginAt: claim(token.loginAt) ?? undefined, activeAt: claim(token.activeAt) ?? undefined }
  if (sessionDeadlines(claims, options.now, options.idleSeconds, options.ceilingSeconds).expired) return null
  const refreshed = await options.refresh(token)
  return refreshed && options.trigger === "update" ? { ...refreshed, activeAt: options.now } : refreshed
}

/** Auth.js's session cookie, chunked (`.0`, `.1`) and with the `__Secure-` prefix behind HTTPS. */
export function isSessionCookieName(name: string): boolean {
  return /^(?:__Secure-)?authjs\.session-token(?:\.\d+)?$/.test(name)
}

function parseOrigin(value: string): URL | null {
  try {
    return new URL(value)
  } catch {
    return null
  }
}

/**
 * The keep-alive's origin check. Production sits behind Nginx and Cloudflare Tunnel (docs/02_ARCHITECTURE.md), so the
 * request's own host may be the upstream one. A missing Origin passes (the cookie is SameSite=Lax); an unparseable one
 * ("null" included) fails; otherwise the Origin must be an AUTH_URL/NEXTAUTH_URL origin, or its host must equal the first
 * x-forwarded-host entry or the host.
 */
export function isSameOriginRequest(request: {
  origin: string | null
  host: string | null
  forwardedHost: string | null
  allowedOrigins: string[]
}): boolean {
  if (request.origin === null) return true
  const url = parseOrigin(request.origin)
  if (!url || url.origin === "null") return false
  const allowed = request.allowedOrigins.flatMap((origin) => {
    const parsed = parseOrigin(origin)
    return parsed ? [parsed.origin] : []
  })
  if (allowed.includes(url.origin)) return true
  const forwardedHost = request.forwardedHost?.split(",")[0]?.trim().toLowerCase() || null
  const host = request.host?.trim().toLowerCase() || null
  return [forwardedHost, host].some((candidate) => candidate !== null && candidate === url.host)
}
