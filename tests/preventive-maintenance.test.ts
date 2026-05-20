import assert from "node:assert/strict"
import test from "node:test"

import {
  calculateNextMaintenanceDueDate,
  getMaintenancePlanDueState,
  getMaintenancePlanIntervalDays,
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
