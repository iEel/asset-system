import assert from "node:assert/strict"
import test from "node:test"

import { createLoginRateLimiter, getClientIp, guardLoginAttempt } from "../src/lib/login-rate-limit.ts"

function limiterAt(clock: { now: number }) {
  return createLoginRateLimiter({
    username: { maxFailures: 5, windowMs: 15 * 60_000, lockMs: 15 * 60_000 },
    ip: { maxFailures: 20, windowMs: 15 * 60_000, lockMs: 15 * 60_000 },
    now: () => clock.now,
  })
}

const failingAttempt = async () => null
const succeedingAttempt = async () => ({ id: "user-1" })

test("locks a username after five failed passwords within fifteen minutes", async () => {
  const clock = { now: 0 }
  const limiter = limiterAt(clock)
  const outcomes: string[] = []
  let attempts = 0

  for (let index = 0; index < 6; index += 1) {
    const result = await guardLoginAttempt({
      limiter,
      username: "Somchai",
      ip: "203.0.113.5",
      attempt: async () => {
        attempts += 1
        return null
      },
    })
    outcomes.push(result.status)
  }

  assert.deepEqual(outcomes, ["failed", "failed", "failed", "failed", "failed", "rate_limited"])
  assert.equal(attempts, 5, "the sixth try must not reach the password check or LDAP bind")
})

test("the username lock is case-insensitive and expires after the lock period", async () => {
  const clock = { now: 0 }
  const limiter = limiterAt(clock)
  for (let index = 0; index < 5; index += 1) {
    await guardLoginAttempt({ limiter, username: "somchai", ip: null, attempt: failingAttempt })
  }

  assert.equal((await guardLoginAttempt({ limiter, username: "SOMCHAI", ip: null, attempt: succeedingAttempt })).status, "rate_limited")

  clock.now = 15 * 60_000 + 1
  assert.equal((await guardLoginAttempt({ limiter, username: "somchai", ip: null, attempt: succeedingAttempt })).status, "ok")
})

test("failures older than the window do not accumulate toward a lock", async () => {
  const clock = { now: 0 }
  const limiter = limiterAt(clock)
  for (let index = 0; index < 4; index += 1) {
    await guardLoginAttempt({ limiter, username: "somchai", ip: null, attempt: failingAttempt })
  }

  clock.now = 15 * 60_000 + 1
  await guardLoginAttempt({ limiter, username: "somchai", ip: null, attempt: failingAttempt })
  assert.equal((await guardLoginAttempt({ limiter, username: "somchai", ip: null, attempt: succeedingAttempt })).status, "ok")
})

test("a successful login clears the username's failure count", async () => {
  const clock = { now: 0 }
  const limiter = limiterAt(clock)
  for (let index = 0; index < 4; index += 1) {
    await guardLoginAttempt({ limiter, username: "somchai", ip: null, attempt: failingAttempt })
  }
  await guardLoginAttempt({ limiter, username: "somchai", ip: null, attempt: succeedingAttempt })

  for (let index = 0; index < 4; index += 1) {
    assert.equal((await guardLoginAttempt({ limiter, username: "somchai", ip: null, attempt: failingAttempt })).status, "failed")
  }
})

test("one address spraying many usernames is locked after twenty failures", async () => {
  const clock = { now: 0 }
  const limiter = limiterAt(clock)
  for (let index = 0; index < 20; index += 1) {
    await guardLoginAttempt({ limiter, username: `user-${index}`, ip: "198.51.100.7", attempt: failingAttempt })
  }

  assert.equal((await guardLoginAttempt({ limiter, username: "fresh-user", ip: "198.51.100.7", attempt: succeedingAttempt })).status, "rate_limited")
  assert.equal((await guardLoginAttempt({ limiter, username: "fresh-user", ip: "198.51.100.8", attempt: succeedingAttempt })).status, "ok")
})

test("returns the authenticated user when the attempt succeeds", async () => {
  const limiter = limiterAt({ now: 0 })
  assert.deepEqual(await guardLoginAttempt({ limiter, username: "somchai", ip: null, attempt: succeedingAttempt }), {
    status: "ok",
    user: { id: "user-1" },
  })
})

test("prefers the Cloudflare client address, then the proxy headers", () => {
  assert.equal(getClientIp(new Headers({ "cf-connecting-ip": "203.0.113.5", "x-forwarded-for": "10.0.0.1" })), "203.0.113.5")
  assert.equal(getClientIp(new Headers({ "x-real-ip": "203.0.113.6" })), "203.0.113.6")
  assert.equal(getClientIp(new Headers({ "x-forwarded-for": "203.0.113.7, 10.0.0.1" })), "203.0.113.7")
  assert.equal(getClientIp(new Headers()), null)
})
