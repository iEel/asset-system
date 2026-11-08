import assert from "node:assert/strict"
import test from "node:test"

import {
  assetTagMatchWhere,
  bangkokDayBounds,
  buildSystemLogQuery,
  LOG_USER_INTEGRATION,
  LOG_USER_SYSTEM,
  parseSystemLogFilters,
  presetRange,
  systemLogWhere,
  TAG_MATCH_CAP,
  type SystemLogFilters,
} from "../src/lib/system-log-filters.ts"

// Page group 12 plan 2 task 1 (spec §4, §15 items 5, 6, 9): the /admin/logs filter rules.

const EMPTY: SystemLogFilters = {
  tag: "",
  userId: null,
  dateFrom: null,
  dateTo: null,
  module: "",
  action: "",
  recordId: "",
}

test("parses with empty defaults", () => {
  assert.deepEqual(parseSystemLogFilters({}), EMPTY)
  assert.deepEqual(
    parseSystemLogFilters({
      tag: "  NB-001 ",
      userId: ["u1", "u2"],
      dateFrom: "2026-11-01",
      dateTo: "2026-11-08",
      module: " asset ",
      action: "update",
      recordId: "r1",
    }),
    { tag: "NB-001", userId: "u1", dateFrom: "2026-11-01", dateTo: "2026-11-08", module: "asset", action: "update", recordId: "r1" }
  )
  assert.equal(parseSystemLogFilters({ userId: "  " }).userId, null)
})

test("bad or reversed dates are normalised", () => {
  assert.equal(parseSystemLogFilters({ dateFrom: "2026-13-40" }).dateFrom, null)
  assert.equal(parseSystemLogFilters({ dateFrom: "2026-02-30" }).dateFrom, null)
  assert.equal(parseSystemLogFilters({ dateTo: "8/11/2026" }).dateTo, null)
  const swapped = parseSystemLogFilters({ dateFrom: "2026-11-08", dateTo: "2026-11-01" })
  assert.equal(swapped.dateFrom, "2026-11-01")
  assert.equal(swapped.dateTo, "2026-11-08")
})

test("presets use Bangkok days", () => {
  const now = new Date("2026-11-08T18:30:00Z") // 01:30 on 9 Nov in Bangkok
  assert.deepEqual(presetRange("today", now), { dateFrom: "2026-11-09", dateTo: "2026-11-09" })
  assert.deepEqual(presetRange("7d", now), { dateFrom: "2026-11-03", dateTo: "2026-11-09" })
  assert.deepEqual(presetRange("30d", now), { dateFrom: "2026-10-11", dateTo: "2026-11-09" })
})

test("day bounds are Bangkok midnight", () => {
  const bounds = bangkokDayBounds("2026-11-08", "2026-11-08")
  assert.equal(bounds.gte?.toISOString(), "2026-11-07T17:00:00.000Z")
  assert.equal(bounds.lt?.toISOString(), "2026-11-08T17:00:00.000Z")
  assert.deepEqual(bangkokDayBounds(null, null), {})
  assert.deepEqual(Object.keys(bangkokDayBounds("2026-11-08", null)), ["gte"])
  assert.equal(bangkokDayBounds(null, "2026-11-30").lt?.toISOString(), "2026-11-30T17:00:00.000Z")
})

test("an unknown tag matches no logs", () => {
  const where = systemLogWhere({ ...EMPTY, tag: "X" }, [])
  assert.deepEqual(where, { AND: [{ id: { in: [] } }] })
})

test("tag search filters asset logs by record id", () => {
  assert.deepEqual(systemLogWhere({ ...EMPTY, tag: "NB" }, ["a1", "a2"]), {
    AND: [{ module: "asset", recordId: { in: ["a1", "a2"] } }],
  })
  // No tag filter: nothing is added.
  assert.deepEqual(systemLogWhere(EMPTY, null), { AND: [] })
  // module, action and recordId work as today, ANDed with the rest.
  assert.deepEqual(systemLogWhere({ ...EMPTY, module: "asset", action: "update", recordId: "r1" }, null), {
    AND: [{ module: "asset" }, { action: "update" }, { recordId: "r1" }],
  })
})

test("system and integration user options", () => {
  assert.equal(LOG_USER_SYSTEM, "system")
  assert.equal(LOG_USER_INTEGRATION, "integration")
  assert.deepEqual(systemLogWhere({ ...EMPTY, userId: LOG_USER_SYSTEM }, null), {
    AND: [{ userId: null, module: { not: "integration_api" } }],
  })
  // Only the API's own calls (no user): an admin's client changes name the admin in the ผู้ใช้ column (final review).
  assert.deepEqual(systemLogWhere({ ...EMPTY, userId: LOG_USER_INTEGRATION }, null), {
    AND: [{ userId: null, module: "integration_api" }],
  })
  assert.deepEqual(systemLogWhere({ ...EMPTY, userId: "u1" }, null), { AND: [{ userId: "u1" }] })
  const dated = systemLogWhere({ ...EMPTY, userId: "u1", dateFrom: "2026-11-08", dateTo: "2026-11-08" }, null)
  assert.deepEqual(dated, {
    AND: [
      { userId: "u1" },
      { createdAt: { gte: new Date("2026-11-07T17:00:00.000Z"), lt: new Date("2026-11-08T17:00:00.000Z") } },
    ],
  })
})

test("tag prefix caps at 50 assets", () => {
  assert.equal(TAG_MATCH_CAP, 50)
})

test("the query keeps filters and omits defaults", () => {
  assert.equal(buildSystemLogQuery(EMPTY, {}), "")
  assert.equal(buildSystemLogQuery(EMPTY, { page: 1, pageSize: 25 }), "")
  const query = new URLSearchParams(
    buildSystemLogQuery(
      { tag: "NB-1", userId: "system", dateFrom: "2026-11-01", dateTo: "2026-11-08", module: "asset", action: "update", recordId: "r1" },
      { page: 3, pageSize: 50 }
    )
  )
  assert.deepEqual(Object.fromEntries(query), {
    tag: "NB-1",
    userId: "system",
    dateFrom: "2026-11-01",
    dateTo: "2026-11-08",
    module: "asset",
    action: "update",
    recordId: "r1",
    page: "3",
    pageSize: "50",
  })
})

// Final review: SQL Server LIKE reads % _ [ as wildcards and Prisma does not escape them, so the prefix wraps each in [ ].
test("the tag prefix escapes LIKE wildcards", () => {
  assert.deepEqual(assetTagMatchWhere("NB-01"), { OR: [{ assetTag: "NB-01" }, { assetTag: { startsWith: "NB-01" } }] })
  assert.deepEqual(assetTagMatchWhere("NB_01%[a]"), { OR: [{ assetTag: "NB_01%[a]" }, { assetTag: { startsWith: "NB[_]01[%][[]a]" } }] })
  assert.deepEqual(assetTagMatchWhere("_"), { OR: [{ assetTag: "_" }, { assetTag: { startsWith: "[_]" } }] })
})
