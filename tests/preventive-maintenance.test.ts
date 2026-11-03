import assert from "node:assert/strict"
import test from "node:test"

import {
  bangkokDayDiff,
  buildPmDueBucketWhere,
  calculateNextMaintenanceDueDate,
  endOfBangkokDay,
  getMaintenancePlanDueState,
  getMaintenancePlanIntervalDays,
  getPmDueBadge,
  pmDueScopeWhere,
  pmDueSoonWindowDays,
  pmReminderWindowDays,
  startOfBangkokDay,
  summarizeMaintenancePlans,
} from "../src/lib/preventive-maintenance.ts"

test("calculates the next preventive maintenance due date by frequency", () => {
  assert.equal(calculateNextMaintenanceDueDate(new Date("2026-01-15"), "monthly").toISOString().slice(0, 10), "2026-02-15")
  assert.equal(calculateNextMaintenanceDueDate(new Date("2026-01-15"), "quarterly").toISOString().slice(0, 10), "2026-04-15")
  assert.equal(calculateNextMaintenanceDueDate(new Date("2026-01-15"), "yearly").toISOString().slice(0, 10), "2027-01-15")
  assert.equal(calculateNextMaintenanceDueDate(new Date("2026-01-15"), "custom", 10).toISOString().slice(0, 10), "2026-01-25")
})

test("normalizes interval days for plan frequency", () => {
  assert.equal(getMaintenancePlanIntervalDays("monthly"), 30)
  assert.equal(getMaintenancePlanIntervalDays("quarterly"), 90)
  assert.equal(getMaintenancePlanIntervalDays("yearly"), 365)
  assert.equal(getMaintenancePlanIntervalDays("custom", 45), 45)
  assert.equal(getMaintenancePlanIntervalDays("custom", 0), 30)
})

test("summarizes preventive maintenance plan due states", () => {
  const now = new Date("2026-05-20T00:00:00.000Z")
  const summary = summarizeMaintenancePlans(
    [
      { isActive: true, nextDueDate: new Date("2026-05-10") },
      { isActive: true, nextDueDate: new Date("2026-05-25") },
      { isActive: true, nextDueDate: new Date("2026-06-20") },
      { isActive: false, nextDueDate: new Date("2026-05-01") },
    ],
    now
  )

  assert.deepEqual(summary, {
    total: 3,
    overdue: 1,
    dueSoon: 1,
    upcoming: 1,
  })
  assert.equal(getMaintenancePlanDueState(new Date("2026-05-25"), now), "due_soon")
})

// 00:30 on 3 Nov in Bangkok, still 2 Nov in UTC: code that reads the server's zone fails here on a UTC server.
const bangkokNow = new Date("2026-11-02T17:30:00Z")

test("the PM due state counts Bangkok days: overdue before today, due soon up to today + 14", () => {
  assert.equal(getMaintenancePlanDueState(new Date("2026-11-02T10:00:00Z"), bangkokNow), "overdue")
  assert.equal(getMaintenancePlanDueState(new Date("2026-11-03T00:00:00Z"), bangkokNow), "due_soon")
  assert.equal(getMaintenancePlanDueState(new Date("2026-11-17T00:00:00Z"), bangkokNow), "due_soon")
  assert.equal(getMaintenancePlanDueState(new Date("2026-11-18T00:00:00Z"), bangkokNow), "upcoming")
})

test("the PM due badge: days late, today, days left, never negative", () => {
  assert.deepEqual(getPmDueBadge(new Date("2026-11-01T00:00:00Z"), bangkokNow), { key: "overdue", days: 2, tone: "danger" })
  assert.deepEqual(getPmDueBadge(new Date("2026-11-03T00:00:00Z"), bangkokNow), { key: "today", days: 0, tone: "warning" })
  assert.deepEqual(getPmDueBadge("2026-11-05T00:00:00Z", bangkokNow), { key: "soon", days: 2, tone: "warning" })
  assert.deepEqual(getPmDueBadge(new Date("2026-11-18T00:00:00Z"), bangkokNow), { key: "later", days: 15, tone: "primary" })
})

test("the end of a Bangkok day, today or some days on", () => {
  assert.equal(endOfBangkokDay(bangkokNow).toISOString(), "2026-11-03T16:59:59.999Z")
  assert.equal(endOfBangkokDay(bangkokNow, 7).toISOString(), "2026-11-10T16:59:59.999Z")
  assert.equal(startOfBangkokDay(bangkokNow).toISOString(), "2026-11-02T17:00:00.000Z")
  assert.equal(bangkokDayDiff(bangkokNow, new Date("2026-11-05T00:00:00Z")), 2)
  assert.equal(pmDueSoonWindowDays, 14)
  assert.equal(pmReminderWindowDays, 7)
})

test("the four PM due buckets: the shared scope and Bangkok day edges (G5P1-R2)", () => {
  const scope = {
    isActive: true,
    planState: "active",
    asset: { isActive: true, status: { name: { notIn: ["Disposed", "Retired"] } } },
  }
  assert.deepEqual(pmDueScopeWhere, scope)
  assert.deepEqual(buildPmDueBucketWhere("overdue", bangkokNow), {
    ...scope,
    nextDueDate: { lt: new Date("2026-11-02T17:00:00.000Z") },
  })
  assert.deepEqual(buildPmDueBucketWhere("week", bangkokNow), {
    ...scope,
    nextDueDate: { gte: new Date("2026-11-02T17:00:00.000Z"), lte: new Date("2026-11-10T16:59:59.999Z") },
  })
  assert.deepEqual(buildPmDueBucketWhere("soon", bangkokNow), {
    ...scope,
    nextDueDate: { gte: new Date("2026-11-02T17:00:00.000Z"), lte: new Date("2026-11-17T16:59:59.999Z") },
  })
  assert.deepEqual(buildPmDueBucketWhere("later", bangkokNow), {
    ...scope,
    nextDueDate: { gt: new Date("2026-11-17T16:59:59.999Z") },
  })
})
