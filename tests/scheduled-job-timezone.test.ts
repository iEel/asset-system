import assert from "node:assert/strict"
import test from "node:test"

import {
  findNextScheduledRunAt,
  getScheduledJobDecision,
  schedulerTimezoneOffsetMinutes,
} from "../src/lib/scheduled-job.ts"

test("interprets automation cron schedules in Asia/Bangkok time", () => {
  const decision = getScheduledJobDecision({
    enabled: true,
    mode: "scheduled",
    schedule: "0 2 * * *",
    lastRunAt: "2026-05-18T19:00:00.000Z",
    now: new Date("2026-05-19T19:05:00.000Z"),
    timezoneOffsetMinutes: schedulerTimezoneOffsetMinutes,
  })

  assert.equal(decision.shouldRun, true)
  assert.equal(decision.reason, "due")
  assert.equal(decision.dueRunAt?.toISOString(), "2026-05-19T19:00:00.000Z")
  assert.equal(decision.nextRunAt?.toISOString(), "2026-05-20T19:00:00.000Z")
})

test("finds the next scheduled run from a Thailand local wall-clock schedule", () => {
  const nextRun = findNextScheduledRunAt(
    "5 6 * * *",
    new Date("2026-05-19T23:10:00.000Z"),
    366,
    schedulerTimezoneOffsetMinutes
  )

  assert.equal(nextRun?.toISOString(), "2026-05-20T23:05:00.000Z")
})
