import assert from "node:assert/strict"
import test from "node:test"
import { getAssetActivityWhere, getIdleAssetCutoff, normalizeAssetActivityFilter } from "../src/lib/asset-activity-filter.ts"

test("normalizes only the supported idle activity filter", () => {
  assert.equal(normalizeAssetActivityFilter("idle_180d"), "idle_180d")
  assert.equal(normalizeAssetActivityFilter("anything"), "")
})

test("builds the exact 180-day no-movement predicate", () => {
  const now = new Date("2026-07-15T00:00:00.000Z")
  assert.equal(getIdleAssetCutoff(now).toISOString(), "2026-01-16T00:00:00.000Z")
  assert.deepEqual(getAssetActivityWhere("idle_180d", now), {
    movements: { none: { performedAt: { gte: new Date("2026-01-16T00:00:00.000Z") } } },
  })
})

test("does not build a predicate without an activity filter", () => {
  assert.equal(getAssetActivityWhere(""), null)
})
