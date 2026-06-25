import assert from "node:assert/strict"
import test from "node:test"

import {
  isPerformanceTimingEnabled,
  withPerformanceTiming,
} from "../src/lib/performance-timing.ts"

test("performance timing is disabled unless explicitly enabled", async () => {
  const entries: unknown[] = []
  const result = await withPerformanceTiming(
    "asset-register.query",
    async () => "ok",
    { route: "/assets" },
    {
      env: { NODE_ENV: "test" },
      logger: (entry) => entries.push(entry),
      now: () => 100,
    }
  )

  assert.equal(result, "ok")
  assert.deepEqual(entries, [])
  assert.equal(isPerformanceTimingEnabled({ NODE_ENV: "test" }), false)
})

test("performance timing logs duration and metadata when enabled", async () => {
  const entries: unknown[] = []
  const times = [10, 47.8]

  const result = await withPerformanceTiming(
    "reports.initial-data",
    async () => ({ rows: 3 }),
    { route: "/reports", pageSize: 25 },
    {
      env: { NODE_ENV: "test", PERFORMANCE_TIMING: "true" },
      logger: (entry) => entries.push(entry),
      now: () => times.shift() ?? 47.8,
    }
  )

  assert.deepEqual(result, { rows: 3 })
  assert.equal(entries.length, 1)
  assert.deepEqual(entries[0], {
    event: "performance_timing",
    label: "reports.initial-data",
    durationMs: 37.8,
    ok: true,
    meta: { route: "/reports", pageSize: 25 },
  })
  assert.equal(isPerformanceTimingEnabled({ NODE_ENV: "test", PERFORMANCE_TIMING: "1" }), true)
})

test("performance timing logs failed operations and rethrows the original error", async () => {
  const entries: unknown[] = []
  const expected = new TypeError("database timeout")
  const times = [200, 260.4]

  await assert.rejects(
    () =>
      withPerformanceTiming(
        "dashboard.summary",
        async () => {
          throw expected
        },
        { route: "/dashboard" },
        {
          env: { NODE_ENV: "test", PERFORMANCE_TIMING: "1" },
          logger: (entry) => entries.push(entry),
          now: () => times.shift() ?? 260.4,
        }
      ),
    expected
  )

  assert.deepEqual(entries, [
    {
      event: "performance_timing",
      label: "dashboard.summary",
      durationMs: 60.4,
      ok: false,
      errorName: "TypeError",
      meta: { route: "/dashboard" },
    },
  ])
})
