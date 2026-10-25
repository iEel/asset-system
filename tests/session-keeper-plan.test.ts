import assert from "node:assert/strict"
import test from "node:test"

import {
  ceilingHours,
  formatSessionCountdown,
  nextSessionStep,
  planSessionTimers,
  readServerOffset,
  readSessionAnswer,
  readSessionTimes,
  SESSION_ACTIVITY_EVENTS,
  SESSION_EXPIRY_GRACE_MS,
  SESSION_KEEP_ALIVE_MIN_GAP_MS,
  SESSION_WARNING_MS,
  shouldSendKeepAlive,
} from "../src/lib/session-keeper-plan.ts"

const times = { loginAt: 0, activeAt: 600_000, idleDeadline: 4_200_000, ceilingDeadline: 43_200_000 }
const capped = { loginAt: 0, activeAt: 40_000_000, idleDeadline: 43_200_000, ceilingDeadline: 43_200_000 }
const body = { loginAt: "2026-10-21T01:00:00.000Z", activeAt: "2026-10-21T01:10:00.000Z", idleDeadline: "2026-10-21T02:10:00.000Z", ceilingDeadline: "2026-10-21T13:00:00.000Z", serverNow: "2026-10-21T01:20:10.000Z" }
const on = (now: number, lastCheckAt: number | null, t = times) => nextSessionStep({ online: true, times: t, offsetMs: 0, now, lastCheckAt })

test("the timings the spec pins", () => {
  assert.equal(SESSION_WARNING_MS, 300_000); assert.equal(SESSION_KEEP_ALIVE_MIN_GAP_MS, 300_000); assert.equal(SESSION_EXPIRY_GRACE_MS, 2_000)
  assert.deepEqual([...SESSION_ACTIVITY_EVENTS], ["pointerdown", "keydown", "touchstart", "wheel"])
})

test("the warning comes 5 minutes before the earlier deadline, in the client's clock", () => {
  assert.deepEqual(planSessionTimers(times, 0), { kind: "idle", deadline: 4_200_000, warnAt: 3_900_000 })
  assert.deepEqual(planSessionTimers(times, 10_000), { kind: "idle", deadline: 4_190_000, warnAt: 3_890_000 })
  assert.deepEqual(planSessionTimers(capped, 0), { kind: "ceiling", deadline: 43_200_000, warnAt: 42_900_000 })
})

test("a keep-alive goes at most once per 5 minutes, and never once the ceiling caps the idle deadline", () => {
  assert.equal(shouldSendKeepAlive({ times, offsetMs: 0, now: 899_999, lastSentAt: null }), false)
  assert.equal(shouldSendKeepAlive({ times, offsetMs: 0, now: 900_000, lastSentAt: null }), true)
  assert.equal(shouldSendKeepAlive({ times, offsetMs: 10_000, now: 890_000, lastSentAt: null }), true)
  assert.equal(shouldSendKeepAlive({ times, offsetMs: 0, now: 900_000, lastSentAt: 800_000 }), false)
  assert.equal(shouldSendKeepAlive({ times: capped, offsetMs: 0, now: 41_000_000, lastSentAt: null }), false)
})

test("the countdown reads m:ss and never goes below zero", () => {
  assert.equal(formatSessionCountdown(300_000), "5:00"); assert.equal(formatSessionCountdown(299_000), "4:59")
  assert.equal(formatSessionCountdown(59_400), "1:00"); assert.equal(formatSessionCountdown(5_000), "0:05")
  assert.equal(formatSessionCountdown(0), "0:00"); assert.equal(formatSessionCountdown(-1), "0:00")
})

test("the ceiling copy names its hours; the status reads as ms with the server's offset", () => {
  assert.equal(ceilingHours(times), 12)
  assert.deepEqual(readSessionTimes(body), { loginAt: Date.parse(body.loginAt), activeAt: Date.parse(body.activeAt), idleDeadline: Date.parse(body.idleDeadline), ceilingDeadline: Date.parse(body.ceilingDeadline) })
  for (const bad of [null, {}, { ...body, idleDeadline: "soon" }]) assert.equal(readSessionTimes(bad), null)
  assert.equal(readServerOffset(body, Date.parse("2026-10-21T01:20:00.000Z")), 10_000)
  assert.equal(readServerOffset({}, 5), 0)
})

test("the first step on mount is the status request", () => {
  assert.deepEqual(on(600_000, null), { kind: "check" })
})

test("two tabs: tab B asks the server at its warning time, sees tab A's later deadline and stays quiet (Review Focus F1)", () => {
  assert.deepEqual(on(600_000, 600_000), { kind: "quiet", wakeAt: 3_900_000 })
  assert.deepEqual(on(3_900_000, 600_000), { kind: "check" })
  const later = { ...times, activeAt: 3_000_000, idleDeadline: 6_600_000 }
  assert.deepEqual(on(3_900_100, 3_900_100, later), { kind: "quiet", wakeAt: 6_300_000 })
  assert.deepEqual(on(3_900_100, 3_900_100), { kind: "warning", wakeAt: 4_202_000 })
  assert.deepEqual(on(4_202_000, 3_900_100), { kind: "check" })
  assert.deepEqual(on(4_202_500, 4_202_500), { kind: "warning", wakeAt: 4_204_500 }) // the same deadline again: re-armed after the grace
})

test("offline across the deadline: nothing is armed; on reconnect the status comes first; only a 401 ends the session (Review Focus F2)", () => {
  assert.deepEqual(nextSessionStep({ online: false, times, offsetMs: 0, now: 5_000_000, lastCheckAt: 3_900_100 }), { kind: "wait" })
  assert.deepEqual(nextSessionStep({ online: true, times: null, offsetMs: 0, now: 5_000_000, lastCheckAt: null }), { kind: "wait" })
  assert.deepEqual(on(5_000_000, null), { kind: "check" })
  assert.deepEqual(on(1_000_000, null), { kind: "check" })
  assert.deepEqual(readSessionAnswer({ status: 401, body: { error: "Unauthorized" } }, 0), { kind: "expired" })
  assert.deepEqual(readSessionAnswer({ status: 200, body }, Date.parse("2026-10-21T01:20:00.000Z")), { kind: "times", times: readSessionTimes(body), offsetMs: 10_000 })
  for (const answer of [{ status: 500, body: null }, { status: 403, body: { error: "Forbidden: cross-site request" } }, { status: 200, body: {} }]) assert.deepEqual(readSessionAnswer(answer, 0), { kind: "ignore" })
})
