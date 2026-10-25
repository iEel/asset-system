import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import test from "node:test"

const read = (p: string) => readFileSync(p, "utf8").replace(/\r/g, "")

test("auth.ts carries the idle and ceiling claims and slides only on an update", () => {
  const s = read("src/lib/auth.ts")
  assert.match(s, /export const \{ handlers, auth, signIn, signOut, unstable_update \} = NextAuth\(/)
  assert.match(s, /readSessionSeconds\(process\.env\.SESSION_IDLE_SECONDS, DEFAULT_SESSION_IDLE_SECONDS\)/)
  assert.match(s, /readSessionSeconds\(process\.env\.SESSION_CEILING_SECONDS, DEFAULT_SESSION_CEILING_SECONDS\)/)
  assert.match(s, /maxAge: sessionCeilingSeconds/)
  assert.match(s, /async jwt\(\{ token, user, trigger \}\)/)
  assert.match(s, /token\.loginAt = now\n\s+token\.activeAt = now\n\s+return token/)
  assert.match(s, /continueSessionToken\(token, \{/)
  assert.match(s, /refreshSessionToken\(current, getUserAccessSnapshot\)/)
  assert.match(s, /session\.clock = sessionClock\(token, sessionIdleSeconds, sessionCeilingSeconds\)/)
  assert.doesNotMatch(s, /8 \* 60 \* 60/)
})
test("the status route reads, the keep-alive route extends; both are route handlers, not server actions", () => {
  const status = read("src/app/api/session/status/route.ts")
  assert.match(status, /export async function GET\(\)/); assert.match(status, /await requireSessionClock\(\)/)
  assert.match(status, /serverNow: new Date\(\)\.toISOString\(\)/); assert.match(status, /errorResponse\(error\)/)
  assert.doesNotMatch(status, /unstable_update|extendSession/)
  const keep = read("src/app/api/session/keep-alive/route.ts")
  assert.match(keep, /export async function POST\(request: Request\)/); assert.match(keep, /isSameOriginRequest\(\{/)
  assert.match(keep, /throw new Error\("Forbidden: cross-site request"\)/); assert.match(keep, /await extendSession\(\)/)
  for (const s of [status, keep]) assert.doesNotMatch(s, /"use server"/)
  const utils = read("src/lib/auth-utils.ts")
  assert.match(utils, /export async function requireSessionClock\(\): Promise<SessionClock>/)
  assert.match(utils, /export async function extendSession\(\): Promise<SessionClock>/)
  assert.match(utils, /await unstable_update\(\{\}\)/)
  assert.match(utils, /export async function getShellSession\(\)/)
})
test("the proxy never calls auth, so it never re-writes or clears the session cookie", () => {
  assert.doesNotMatch(read("src/proxy.ts"), /lib\/auth["']|\bauth\(/)
})
