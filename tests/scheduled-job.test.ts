import assert from "node:assert/strict"
import test from "node:test"
import {
  findNextScheduledRunAt,
  getScheduledJobDecision,
  isSupportedCronExpression,
} from "../src/lib/scheduled-job.ts"

test("detects due scheduled jobs from the latest cron occurrence after last run", () => {
  const decision = getScheduledJobDecision({
    enabled: true,
    mode: "scheduled",
    schedule: "0 2 * * *",
    lastRunAt: "2026-05-19T02:00:00.000Z",
    now: new Date("2026-05-20T02:05:00.000Z"),
  })

  assert.equal(decision.shouldRun, true)
  assert.equal(decision.reason, "due")
  assert.equal(decision.dueRunAt?.toISOString(), "2026-05-20T02:00:00.000Z")
})

test("skips scheduled jobs when the latest occurrence was already processed", () => {
  const decision = getScheduledJobDecision({
    enabled: true,
    mode: "scheduled",
    schedule: "0 2 * * *",
    lastRunAt: "2026-05-20T02:00:00.000Z",
    now: new Date("2026-05-20T02:05:00.000Z"),
  })

  assert.equal(decision.shouldRun, false)
  assert.equal(decision.reason, "not_due_yet")
  assert.equal(decision.nextRunAt?.toISOString(), "2026-05-21T02:00:00.000Z")
})

test("skips scheduled jobs when disabled or not scheduled mode", () => {
  assert.equal(getScheduledJobDecision({
    enabled: false,
    mode: "scheduled",
    schedule: "0 2 * * *",
    now: new Date("2026-05-20T02:05:00.000Z"),
  }).reason, "disabled")

  assert.equal(getScheduledJobDecision({
    enabled: true,
    mode: "manual",
    schedule: "0 2 * * *",
    now: new Date("2026-05-20T02:05:00.000Z"),
  }).reason, "mode_not_scheduled")
})

test("supports common cron presets used by the settings page", () => {
  assert.equal(isSupportedCronExpression("0 2 * * *"), true)
  assert.equal(isSupportedCronExpression("0 */6 * * *"), true)
  assert.equal(isSupportedCronExpression("0 2 * * 1-5"), true)
  assert.equal(isSupportedCronExpression("5 6 * * 1"), true)
  assert.equal(isSupportedCronExpression("5 6 * * 6-7"), true)
  assert.equal(isSupportedCronExpression("bad cron"), false)
  assert.equal(isSupportedCronExpression("70 2 * * *"), false)
})

test("matches Sunday when day-of-week uses 7 in a range", () => {
  const decision = getScheduledJobDecision({
    enabled: true,
    mode: "scheduled",
    schedule: "5 6 * * 6-7",
    lastRunAt: "2026-05-23T06:05:00.000Z",
    now: new Date("2026-05-24T06:06:00.000Z"),
  })

  assert.equal(decision.shouldRun, true)
  assert.equal(decision.dueRunAt?.toISOString(), "2026-05-24T06:05:00.000Z")
})

test("finds next scheduled run for stepped hour cron", () => {
  const nextRun = findNextScheduledRunAt("0 */6 * * *", new Date("2026-05-20T02:05:00.000Z"))
  assert.equal(nextRun?.toISOString(), "2026-05-20T06:00:00.000Z")
})
