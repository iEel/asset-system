import assert from "node:assert/strict"
import test from "node:test"

import {
  buildDuePmPlanWhere,
  calculateNextMaintenanceDueDate,
  getBangkokDateKey,
} from "../src/lib/preventive-maintenance.ts"

const iso = (date: Date) => date.toISOString().slice(0, 10)

test("monthly plans stay in the following month at month end", () => {
  assert.equal(iso(calculateNextMaintenanceDueDate(new Date("2026-01-31T00:00:00Z"), "monthly")), "2026-02-28")
  assert.equal(iso(calculateNextMaintenanceDueDate(new Date("2028-01-31T00:00:00Z"), "monthly")), "2028-02-29")
  assert.equal(iso(calculateNextMaintenanceDueDate(new Date("2026-03-15T00:00:00Z"), "monthly")), "2026-04-15")
})

test("quarterly and yearly plans clamp the same way", () => {
  assert.equal(iso(calculateNextMaintenanceDueDate(new Date("2026-11-30T00:00:00Z"), "quarterly")), "2027-02-28")
  assert.equal(iso(calculateNextMaintenanceDueDate(new Date("2028-02-29T00:00:00Z"), "yearly")), "2029-02-28")
})

test("custom plans add the interval in days", () => {
  assert.equal(iso(calculateNextMaintenanceDueDate(new Date("2026-10-07T00:00:00Z"), "custom", 45)), "2026-11-21")
})

test("the Bangkok date rolls over at 17:00 UTC", () => {
  assert.equal(getBangkokDateKey(new Date("2026-10-06T16:59:00Z")), "2026-10-06")
  assert.equal(getBangkokDateKey(new Date("2026-10-06T17:00:00Z")), "2026-10-07")
})

test("due PM plans are active, not written off, and due within seven Bangkok days", () => {
  const where = buildDuePmPlanWhere(new Date("2026-10-06T17:30:00Z"))

  assert.deepEqual(where, {
    isActive: true,
    planState: "active",
    nextDueDate: { lte: new Date("2026-10-14T16:59:59.999Z") },
    asset: { isActive: true, status: { name: { notIn: ["Disposed", "Retired"] } } },
  })
})
