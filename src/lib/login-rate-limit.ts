type LimitRule = { maxFailures: number; windowMs: number; lockMs: number }

type FailureEntry = { firstFailureAt: number; failures: number; lockedUntil: number }

const maxTrackedKeys = 10_000

function createKeyLimiter(rule: LimitRule, now: () => number) {
  const entries = new Map<string, FailureEntry>()

  function current(key: string) {
    const entry = entries.get(key)
    if (!entry) return null
    const time = now()
    const lockExpired = entry.lockedUntil !== 0 && time > entry.lockedUntil
    const windowExpired = entry.lockedUntil === 0 && time - entry.firstFailureAt > rule.windowMs
    if (lockExpired || windowExpired) {
      entries.delete(key)
      return null
    }
    return entry
  }

  function prune() {
    if (entries.size < maxTrackedKeys) return
    for (const key of Array.from(entries.keys())) current(key)
  }

  return {
    isLocked(key: string) {
      const entry = current(key)
      return entry !== null && entry.lockedUntil !== 0
    },
    recordFailure(key: string) {
      prune()
      const time = now()
      const entry = current(key) ?? { firstFailureAt: time, failures: 0, lockedUntil: 0 }
      entry.failures += 1
      if (entry.failures >= rule.maxFailures) entry.lockedUntil = time + rule.lockMs
      entries.set(key, entry)
    },
    reset(key: string) {
      entries.delete(key)
    },
  }
}

export function createLoginRateLimiter(options: { username: LimitRule; ip: LimitRule; now?: () => number }) {
  const now = options.now ?? Date.now
  return {
    username: createKeyLimiter(options.username, now),
    ip: createKeyLimiter(options.ip, now),
  }
}

export type LoginRateLimiter = ReturnType<typeof createLoginRateLimiter>

export type GuardedLoginResult<T> = { status: "ok"; user: T } | { status: "failed" } | { status: "rate_limited" }

export async function guardLoginAttempt<T>(options: {
  limiter: LoginRateLimiter
  username: string
  ip: string | null
  attempt: () => Promise<T | null>
}): Promise<GuardedLoginResult<T>> {
  const usernameKey = options.username.trim().toLowerCase()
  const { limiter, ip } = options

  if (limiter.username.isLocked(usernameKey) || (ip !== null && limiter.ip.isLocked(ip))) {
    return { status: "rate_limited" }
  }

  const user = await options.attempt()
  if (user === null) {
    limiter.username.recordFailure(usernameKey)
    if (ip !== null) limiter.ip.recordFailure(ip)
    return { status: "failed" }
  }

  limiter.username.reset(usernameKey)
  return { status: "ok", user }
}

export function getClientIp(headers: Headers) {
  const direct = headers.get("cf-connecting-ip") ?? headers.get("x-real-ip")
  if (direct?.trim()) return direct.trim()
  const forwarded = headers.get("x-forwarded-for")?.split(",")[0]?.trim()
  return forwarded || null
}
