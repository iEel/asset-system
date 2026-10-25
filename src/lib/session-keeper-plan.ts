// The client side of the session (menu B shell spec §6.8): when to warn, when to ask the server, when to send a
// keep-alive. Pure and import-free; every time is epoch ms. `SessionTimes` is in the server's clock, and a plan or a
// step is in the client's clock (server time minus `offsetMs`).

export const SESSION_WARNING_MS = 300_000
export const SESSION_KEEP_ALIVE_MIN_GAP_MS = 300_000
export const SESSION_EXPIRY_GRACE_MS = 2_000
/** The person's own input; background requests never extend a session. */
export const SESSION_ACTIVITY_EVENTS = ["pointerdown", "keydown", "touchstart", "wheel"] as const

export type SessionTimes = { loginAt: number; activeAt: number; idleDeadline: number; ceilingDeadline: number }

function readTime(value: unknown): number | null {
  if (typeof value !== "string") return null
  const ms = Date.parse(value)
  return Number.isFinite(ms) ? ms : null
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null
}

/** The status or keep-alive body (or the layout's clock) as ms, or null when any field is missing or unreadable. */
export function readSessionTimes(value: unknown): SessionTimes | null {
  if (!isRecord(value)) return null
  const loginAt = readTime(value.loginAt)
  const activeAt = readTime(value.activeAt)
  const idleDeadline = readTime(value.idleDeadline)
  const ceilingDeadline = readTime(value.ceilingDeadline)
  if (loginAt === null || activeAt === null || idleDeadline === null || ceilingDeadline === null) return null
  return { loginAt, activeAt, idleDeadline, ceilingDeadline }
}

/** How far the server's clock runs ahead of the client's, from the answer's `serverNow`; 0 when it has none. */
export function readServerOffset(value: unknown, receivedAt: number): number {
  const serverNow = isRecord(value) ? readTime(value.serverNow) : null
  return serverNow === null ? 0 : serverNow - receivedAt
}

/** A 401 ends the session; a 200 with readable times updates them; anything else (5xx, 403, a bad body) is ignored. */
export function readSessionAnswer(
  answer: { status: number; body: unknown },
  receivedAt: number,
): { kind: "expired" } | { kind: "times"; times: SessionTimes; offsetMs: number } | { kind: "ignore" } {
  if (answer.status === 401) return { kind: "expired" }
  if (answer.status !== 200) return { kind: "ignore" }
  const times = readSessionTimes(answer.body)
  return times ? { kind: "times", times, offsetMs: readServerOffset(answer.body, receivedAt) } : { kind: "ignore" }
}

/** The earlier deadline in the client's clock, and the warning 5 minutes before it. */
export function planSessionTimers(times: SessionTimes, offsetMs: number): { kind: "idle" | "ceiling"; deadline: number; warnAt: number } {
  const kind = times.idleDeadline >= times.ceilingDeadline ? "ceiling" : "idle"
  const deadline = Math.min(times.idleDeadline, times.ceilingDeadline) - offsetMs
  return { kind, deadline, warnAt: deadline - SESSION_WARNING_MS }
}

export type SessionStep = { kind: "wait" } | { kind: "check" } | { kind: "quiet" | "warning"; wakeAt: number }

/**
 * What the keeper does now. Offline nothing is armed (Review Focus F2). No warning and no sign-out without a fresh
 * answer: at `warnAt` it asks the server first, so another tab's later deadline keeps this one quiet (Review Focus F1).
 * After the deadline plus the grace it asks again; the same answer re-arms after the grace, never in a tight loop.
 */
export function nextSessionStep(input: {
  online: boolean
  times: SessionTimes | null
  offsetMs: number
  now: number
  lastCheckAt: number | null
}): SessionStep {
  const { online, times, offsetMs, now, lastCheckAt } = input
  if (!online || !times) return { kind: "wait" }
  if (lastCheckAt === null) return { kind: "check" }
  const plan = planSessionTimers(times, offsetMs)
  if (now < plan.warnAt) return { kind: "quiet", wakeAt: plan.warnAt }
  if (lastCheckAt < plan.warnAt) return { kind: "check" }
  if (now < plan.deadline + SESSION_EXPIRY_GRACE_MS) return { kind: "warning", wakeAt: plan.deadline + SESSION_EXPIRY_GRACE_MS }
  if (now - lastCheckAt < SESSION_EXPIRY_GRACE_MS) return { kind: "warning", wakeAt: lastCheckAt + SESSION_EXPIRY_GRACE_MS }
  return { kind: "check" }
}

/** At most one keep-alive per 5 minutes of activity, and none once the ceiling caps the idle deadline. */
export function shouldSendKeepAlive(input: { times: SessionTimes; offsetMs: number; now: number; lastSentAt: number | null }): boolean {
  const { times, offsetMs, now, lastSentAt } = input
  if (planSessionTimers(times, offsetMs).kind === "ceiling") return false
  if (lastSentAt !== null && now - lastSentAt < SESSION_KEEP_ALIVE_MIN_GAP_MS) return false
  return now + offsetMs - times.activeAt >= SESSION_KEEP_ALIVE_MIN_GAP_MS
}

/** The wait after the nth failed answer in a row: 2 s, doubling up to a minute, so an outage is never hammered. */
export function sessionRetryDelay(failures: number): number {
  return Math.min(SESSION_EXPIRY_GRACE_MS * 2 ** (Math.max(1, failures) - 1), 60_000)
}

/** m:ss, rounded up to the whole second, never below 0:00. */
export function formatSessionCountdown(ms: number): string {
  const seconds = Math.max(0, Math.ceil(ms / 1000))
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`
}

/** The ceiling's length in whole hours, for its banner copy. */
export function ceilingHours(times: SessionTimes): number {
  return Math.round((times.ceilingDeadline - times.loginAt) / 3_600_000)
}
