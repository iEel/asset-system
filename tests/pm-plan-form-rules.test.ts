import assert from "node:assert/strict"
import test from "node:test"

import {
  buildPmPlanImpact,
  buildPmPreview,
  pmPlanChangedFields,
  pmPlanFooterKey,
  validatePmPlanForm,
  type PmPlanFormValues,
} from "../src/lib/pm-plan-form-rules.ts"

// The PM form's rules (group 5 plan 4 Task 2, spec §10, G5P4-R10, Review Focus 4). Pure: the dates are ISO days.
// 2026-03-10 12:00 Bangkok.
const now = new Date("2026-03-10T05:00:00.000Z")

const base: PmPlanFormValues = {
  assetId: "asset-1",
  title: "ล้างแอร์",
  frequency: "monthly",
  intervalDays: "",
  nextDueDate: "2026-04-01",
  vendorId: "",
  notes: "",
}

test("the preview chains each date from the one before, so 31 Jan monthly clamps to the 28th and stays there", () => {
  const preview = buildPmPreview("2026-01-31", "monthly", null, now)
  assert.deepEqual(preview.map((round) => round.date), ["2026-01-31", "2026-02-28", "2026-03-28", "2026-04-28"])
  assert.deepEqual(preview.map((round) => round.step), ["first", "month1", "month1", "month1"])
  // Only the first carries its due badge; 31 Jan is 38 days before 10 Mar.
  assert.deepEqual(preview[0].badge, { key: "overdue", days: 38, tone: "danger" })
  assert.equal(preview[1].badge, undefined)
  // A leap year keeps the 29th.
  assert.deepEqual(buildPmPreview("2028-01-31", "monthly", null, now).map((round) => round.date), ["2028-01-31", "2028-02-29", "2028-03-29", "2028-04-29"])
})

test("the preview's steps: quarterly +3 months, yearly +1 year, custom +N days", () => {
  const quarterly = buildPmPreview("2026-03-10", "quarterly", null, now)
  assert.deepEqual(quarterly.map((round) => round.date), ["2026-03-10", "2026-06-10", "2026-09-10", "2026-12-10"])
  assert.deepEqual(quarterly.map((round) => round.step), ["first", "month3", "month3", "month3"])
  assert.deepEqual(quarterly[0].badge, { key: "today", days: 0, tone: "warning" })

  const yearly = buildPmPreview("2028-02-29", "yearly", null, now)
  assert.deepEqual(yearly.map((round) => round.date), ["2028-02-29", "2029-02-28", "2030-02-28", "2031-02-28"])
  assert.deepEqual(yearly.map((round) => round.step), ["first", "year1", "year1", "year1"])

  const custom = buildPmPreview("2026-03-20", "custom", 45, now)
  assert.deepEqual(custom.map((round) => round.date), ["2026-03-20", "2026-05-04", "2026-06-18", "2026-08-02"])
  assert.deepEqual(custom.map((round) => round.step), ["first", "days", "days", "days"])
  assert.deepEqual(custom.map((round) => round.days), [undefined, 45, 45, 45])
  assert.deepEqual(custom[0].badge, { key: "soon", days: 10, tone: "warning" })
})

test("the preview is empty without a valid date", () => {
  assert.deepEqual(buildPmPreview("", "monthly", null, now), [])
  assert.deepEqual(buildPmPreview("2026-13-45", "monthly", null, now), [])
})

test("the impact moves this plan from its old bucket to its new one (G5P4-R10)", () => {
  const counts = { overdue: 6, soon: 1, later: 1 }
  // An overdue plan moved to a day 5 days ahead.
  assert.deepEqual(
    buildPmPlanImpact({
      counts,
      before: { nextDueDate: "2026-03-01", planState: "active", inScope: true },
      after: { nextDueDate: "2026-03-15" },
      now,
    }),
    { kind: "counts", overdue: [6, 5], soon: [1, 2], later: [1, 1], total: 8, inWeek: true },
  )
  // A new plan 20 days ahead.
  assert.deepEqual(buildPmPlanImpact({ counts, before: null, after: { nextDueDate: "2026-03-30" }, now }), {
    kind: "counts",
    overdue: [6, 6],
    soon: [1, 1],
    later: [1, 2],
    total: 9,
    inWeek: false,
  })
  // A paused plan is not on the PM page's counts.
  assert.deepEqual(
    buildPmPlanImpact({ counts, before: { nextDueDate: "2026-03-01", planState: "paused", inScope: true }, after: { nextDueDate: "2026-03-15" }, now }),
    { kind: "paused" },
  )
})

test("the impact's edges: day 14 is soon, day 15 later, day 7 in the week, overdue counts as in the week", () => {
  const counts = { overdue: 0, soon: 0, later: 0 }
  const create = (nextDueDate: string) => buildPmPlanImpact({ counts, before: null, after: { nextDueDate }, now })
  assert.deepEqual(create("2026-03-24"), { kind: "counts", overdue: [0, 0], soon: [0, 1], later: [0, 0], total: 1, inWeek: false })
  assert.deepEqual(create("2026-03-25"), { kind: "counts", overdue: [0, 0], soon: [0, 0], later: [0, 1], total: 1, inWeek: false })
  assert.equal((create("2026-03-17") as { inWeek: boolean }).inWeek, true)
  assert.equal((create("2026-03-18") as { inWeek: boolean }).inWeek, false)
  assert.deepEqual(create("2026-03-09"), { kind: "counts", overdue: [0, 1], soon: [0, 0], later: [0, 0], total: 1, inWeek: true })
  // A plan whose asset is written off is outside the counts before and after.
  assert.deepEqual(
    buildPmPlanImpact({
      counts: { overdue: 2, soon: 1, later: 0 },
      before: { nextDueDate: "2026-03-01", planState: "active", inScope: false },
      after: { nextDueDate: "2026-03-15" },
      now,
    }),
    { kind: "counts", overdue: [2, 2], soon: [1, 1], later: [0, 0], total: 3, inWeek: false },
  )
})

test("the changed fields count only the fields that differ", () => {
  assert.deepEqual(pmPlanChangedFields(base, base), [])
  assert.deepEqual(pmPlanChangedFields(base, { ...base, title: "ล้างแอร์ใหญ่", nextDueDate: "2026-04-02" }), ["title", "nextDueDate"])
  // The asset is fixed on edit; the days count only between two custom plans.
  assert.deepEqual(pmPlanChangedFields(base, { ...base, assetId: "asset-2", intervalDays: "45" }), [])
  assert.deepEqual(pmPlanChangedFields(base, { ...base, frequency: "custom", intervalDays: "45" }), ["frequency"])
  const custom = { ...base, frequency: "custom" as const, intervalDays: "45" }
  assert.deepEqual(pmPlanChangedFields(custom, { ...custom, intervalDays: "60", vendorId: "v1", notes: "x" }), ["intervalDays", "vendorId", "notes"])
  // Spaces the save trims are no change.
  assert.deepEqual(pmPlanChangedFields(base, { ...base, title: "ล้างแอร์ " }), [])
})

test("validatePmPlanForm keeps today's checks", () => {
  assert.deepEqual(validatePmPlanForm(base, false), {})
  assert.deepEqual(validatePmPlanForm({ ...base, frequency: "custom", intervalDays: "0" }, true), { intervalDays: "outOfRange" })
  assert.deepEqual(validatePmPlanForm({ ...base, frequency: "custom", intervalDays: "3651" }, true), { intervalDays: "outOfRange" })
  assert.deepEqual(validatePmPlanForm({ ...base, frequency: "custom", intervalDays: "" }, true), { intervalDays: "required" })
  assert.deepEqual(validatePmPlanForm({ ...base, frequency: "custom", intervalDays: "1.5" }, true), { intervalDays: "notWholeNumber" })
  // The days are not checked for a fixed frequency.
  assert.deepEqual(validatePmPlanForm({ ...base, intervalDays: "0" }, true), {})
  assert.deepEqual(validatePmPlanForm({ ...base, assetId: "", title: "", nextDueDate: "" }, false), {
    assetId: "required",
    title: "required",
    nextDueDate: "required",
  })
  // An edit keeps its asset.
  assert.deepEqual(validatePmPlanForm({ ...base, assetId: "" }, true), {})
  assert.deepEqual(validatePmPlanForm({ ...base, title: "ก".repeat(201) }, true), { title: "tooLong" })
  assert.deepEqual(validatePmPlanForm({ ...base, notes: "ก".repeat(4001) }, true), { notes: "tooLong" })
})

test("the footer's words: edit and create", () => {
  assert.deepEqual(pmPlanFooterKey(true), {
    line: "maintenancePage.pmFormFooterEdit",
    cancel: "maintenancePage.pmFormCancelEdit",
    submit: "maintenancePage.pmFormSaveEdit",
  })
  assert.deepEqual(pmPlanFooterKey(false), {
    line: "maintenancePage.pmFormFooterCreate",
    cancel: "common.cancel",
    submit: "common.save",
  })
})
