import assert from "node:assert/strict"
import test from "node:test"

import {
  continueSessionToken,
  DEFAULT_SESSION_CEILING_SECONDS,
  DEFAULT_SESSION_IDLE_SECONDS,
  isSameOriginRequest,
  isSessionCookieName,
  readSessionSeconds,
  sessionClock,
  sessionDeadlines,
} from "../src/lib/session-deadline.ts"

test("the defaults are 60 idle minutes and a 12-hour ceiling", () => {
  assert.equal(DEFAULT_SESSION_IDLE_SECONDS, 3600); assert.equal(DEFAULT_SESSION_CEILING_SECONDS, 43200)
})
test("a bad limit falls back to the default and never signs everyone out (Review Focus F4)", () => {
  for (const fallback of [DEFAULT_SESSION_IDLE_SECONDS, DEFAULT_SESSION_CEILING_SECONDS]) {
    assert.equal(readSessionSeconds(undefined, fallback), fallback)
    for (const bad of ["", " ", "abc", "0", "-5", "90.5", "1e3"]) assert.equal(readSessionSeconds(bad, fallback), fallback, bad)
    assert.equal(readSessionSeconds("7200", fallback), 7200); assert.equal(readSessionSeconds(" 60 ", fallback), 60)
  }
})
test("the idle deadline is the last activity plus the idle limit, capped by the ceiling", () => {
  assert.deepEqual(sessionDeadlines({ loginAt: 1000, activeAt: 2000 }, 2500, 3600, 43200), { idleDeadline: 5600, ceilingDeadline: 44200, expired: false })
  assert.deepEqual(sessionDeadlines({ loginAt: 0, activeAt: 42000 }, 42100, 3600, 43200), { idleDeadline: 43200, ceilingDeadline: 43200, expired: false })
})
test("a session expires after its deadline second, not at it", () => {
  assert.equal(sessionDeadlines({ loginAt: 0, activeAt: 100 }, 3700, 3600, 43200).expired, false)
  assert.equal(sessionDeadlines({ loginAt: 0, activeAt: 100 }, 3701, 3600, 43200).expired, true)
  assert.equal(sessionDeadlines({ loginAt: 0, activeAt: 43000 }, 43201, 3600, 43200).expired, true)
})
test("a token signed before the claims existed counts as expired", () => {
  assert.deepEqual(sessionDeadlines({}, 100, 3600, 43200), { idleDeadline: 0, ceilingDeadline: 0, expired: true })
  assert.equal(sessionDeadlines({ loginAt: 5 }, 100, 3600, 43200).expired, true)
  assert.equal(sessionDeadlines({ loginAt: Number.NaN, activeAt: 5 }, 100, 3600, 43200).expired, true)
})
const limits = { idleSeconds: 3600, ceilingSeconds: 43200 }
test("a read keeps activeAt and only an update moves it; loginAt never moves", async () => {
  let refreshes = 0
  const refresh = async <T,>(token: T) => { refreshes += 1; return token }
  const token = { id: "user-1", loginAt: 0, activeAt: 100 }
  assert.deepEqual(await continueSessionToken(token, { ...limits, now: 200, refresh }), token)
  assert.deepEqual(await continueSessionToken(token, { ...limits, trigger: "update", now: 200, refresh }), { id: "user-1", loginAt: 0, activeAt: 200 })
  assert.equal(refreshes, 2)
})
test("an expired or claimless token ends without a database read, even on an update", async () => {
  let refreshes = 0
  const refresh = async <T,>(token: T) => { refreshes += 1; return token }
  assert.equal(await continueSessionToken({ id: "u", loginAt: 0, activeAt: 100 }, { ...limits, trigger: "update", now: 3701, refresh }), null)
  assert.equal(await continueSessionToken({ id: "u" }, { ...limits, now: 10, refresh }), null)
  assert.equal(refreshes, 0)
})
test("a refresh that ends the session (an inactive user) wins over an update", async () => {
  assert.equal(await continueSessionToken({ id: "u", loginAt: 0, activeAt: 100 }, { ...limits, trigger: "update", now: 200, refresh: async () => null }), null)
})
test("the clock the client gets is ISO time", () => {
  assert.deepEqual(sessionClock({ loginAt: 1_700_000_000, activeAt: 1_700_000_600 }, 3600, 43200), {
    loginAt: "2023-11-14T22:13:20.000Z", activeAt: "2023-11-14T22:23:20.000Z",
    idleDeadline: "2023-11-14T23:23:20.000Z", ceilingDeadline: "2023-11-15T10:13:20.000Z" })
  assert.equal(sessionClock({}, 3600, 43200), null)
})
test("session cookie names, chunked and behind HTTPS", () => {
  for (const name of ["authjs.session-token", "authjs.session-token.0", "__Secure-authjs.session-token.1"]) assert.equal(isSessionCookieName(name), true, name)
  for (const name of ["authjs.csrf-token", "__Host-authjs.csrf-token", "authjs.callback-url", "theme", "authjs.session-token.x"]) assert.equal(isSessionCookieName(name), false, name)
})
test("the keep-alive accepts its own origin behind Nginx and refuses another site", () => {
  const base = { host: "asset.company.test", forwardedHost: null, allowedOrigins: [] as string[] }
  assert.equal(isSameOriginRequest({ ...base, origin: null }), true)
  assert.equal(isSameOriginRequest({ ...base, origin: "https://asset.company.test" }), true)
  assert.equal(isSameOriginRequest({ origin: "https://asset.company.test", host: "localhost:3000", forwardedHost: "asset.company.test", allowedOrigins: [] }), true)
  assert.equal(isSameOriginRequest({ origin: "https://asset.company.test", host: "127.0.0.1:3000", forwardedHost: null, allowedOrigins: ["https://asset.company.test"] }), true)
  assert.equal(isSameOriginRequest({ ...base, origin: "https://evil.test" }), false)
  assert.equal(isSameOriginRequest({ ...base, origin: "null" }), false)
  assert.equal(isSameOriginRequest({ ...base, origin: "not a url" }), false)
})
