import assert from "node:assert/strict"
import test from "node:test"
import { canSetUpPm, formatRepairPeriod, orderAssetPmPlans, repairDays, summarizeAssetRepairs, type AssetRepairTicket } from "../src/lib/asset-repair-rules.ts"

// Group 1 asset detail task 12 (spec 2026-10-25 §7.7): the repair / PM tab's numbers. A repair is an active record that
// is neither cancelled nor a PM visit; its days run in Bangkok from the report to the return, or to today while open.
// 26 Oct 2026, 10:00 in Bangkok.
const now = new Date("2026-10-26T03:00:00.000Z")
const ticket = (id: string, over: Partial<AssetRepairTicket>): AssetRepairTicket => ({
  id,
  repairStatus: "closed",
  maintenancePlanId: null,
  reportedDate: new Date("2026-08-02T02:00:00.000Z"),
  returnDate: new Date("2026-08-15T09:00:00.000Z"),
  repairCost: null,
  ...over,
})

test("repairDays: Bangkok days from the report to the return, to today while open, none for a cancel", () => {
  assert.equal(repairDays(ticket("t1", {}), now), 13)
  // Reported 21 Oct 03:00 in Bangkok (20 Oct in UTC): 5 days by today.
  assert.equal(repairDays(ticket("t2", { repairStatus: "in_progress", reportedDate: new Date("2026-10-20T20:00:00.000Z"), returnDate: null }), now), 5)
  // An old-workflow status is still open (isOpenRepairStatus); 23:59 on the 25th is yesterday, 00:00 on the 26th today.
  assert.equal(repairDays(ticket("t3", { repairStatus: "waiting_parts", reportedDate: new Date("2026-10-25T16:59:00.000Z"), returnDate: null }), now), 1)
  assert.equal(repairDays(ticket("t4", { repairStatus: "in_progress", reportedDate: new Date("2026-10-25T17:00:00.000Z"), returnDate: null }), now), 0)
  assert.equal(repairDays(ticket("t5", { repairStatus: "cancelled", returnDate: null }), now), null)
  assert.equal(repairDays(ticket("t6", { returnDate: null }), now), null, "a closed record without a return date")
  assert.equal(repairDays(ticket("t7", { returnDate: new Date("2026-08-02T05:00:00.000Z") }), now), 0, "recorded as done the day it was reported")
})

test("the strip: repairs that are neither PM nor cancelled, their days and their cost; the notice at 3 repairs or half the price (spec §7.7)", () => {
  const tickets = [
    ticket("t1", { repairCost: 1500 }),
    ticket("t2", { repairStatus: "in_progress", reportedDate: new Date("2026-10-20T20:00:00.000Z"), returnDate: null }),
    ticket("t3", { repairStatus: "cancelled", returnDate: null, repairCost: 999 }),
    ticket("t4", { maintenancePlanId: "plan-1", repairCost: 300 }),
  ]
  assert.deepEqual(summarizeAssetRepairs(tickets, 2800, now), { repairCount: 2, excludedCount: 2, downtimeDays: 18, hasOpenRepair: true, totalCost: 1500, replacementWarning: true })
  assert.equal(summarizeAssetRepairs(tickets, 4000, now).replacementWarning, false)
  assert.equal(summarizeAssetRepairs(tickets, null, now).replacementWarning, false, "no price: only the count rule")
  assert.equal(summarizeAssetRepairs(tickets, 0, now).replacementWarning, false)
  const three = [ticket("a", {}), ticket("b", {}), ticket("c", {})]
  assert.deepEqual(summarizeAssetRepairs(three, null, now), { repairCount: 3, excludedCount: 0, downtimeDays: 39, hasOpenRepair: false, totalCost: 0, replacementWarning: true })
  assert.deepEqual(summarizeAssetRepairs([], 1000, now), { repairCount: 0, excludedCount: 0, downtimeDays: 0, hasOpenRepair: false, totalCost: 0, replacementWarning: false })
})

test("formatRepairPeriod: one month and one year written once, Bangkok days, Buddhist years in Thai", () => {
  const d = (iso: string) => new Date(iso)
  assert.equal(formatRepairPeriod(d("2026-08-02T03:00:00Z"), d("2026-08-15T03:00:00Z"), "th"), "2 – 15 ส.ค. 2569")
  assert.equal(formatRepairPeriod(d("2026-07-30T03:00:00Z"), d("2026-08-15T03:00:00Z"), "th"), "30 ก.ค. – 15 ส.ค. 2569")
  assert.equal(formatRepairPeriod(d("2026-12-30T03:00:00Z"), d("2027-01-03T03:00:00Z"), "th"), "30 ธ.ค. 2569 – 3 ม.ค. 2570")
  assert.equal(formatRepairPeriod(d("2026-08-02T03:00:00Z"), d("2026-08-02T10:00:00Z"), "th"), "2 ส.ค. 2569")
  assert.equal(formatRepairPeriod(d("2026-08-01T18:30:00Z"), null, "th"), "2 ส.ค. 2569")
  assert.equal(formatRepairPeriod(d("2026-08-01T16:59:00Z"), d("2026-08-01T17:00:00Z"), "th"), "1 – 2 ส.ค. 2569")
  assert.equal(formatRepairPeriod(d("2026-08-02T03:00:00Z"), d("2026-08-15T03:00:00Z"), "en"), "2 – 15 Aug 2026")
})

test("PM plans: active, then paused, then ended, each by next due date; a written-off asset gets no new plan", () => {
  const plan = (id: string, planState: string, due: string) => ({ id, planState, nextDueDate: new Date(due) })
  const plans = [plan("p1", "ended", "2026-01-01"), plan("p2", "active", "2026-12-01"), plan("p3", "paused", "2026-11-01"), plan("p4", "active", "2026-11-15")]
  assert.deepEqual(orderAssetPmPlans(plans).map((entry) => entry.id), ["p4", "p2", "p3", "p1"])
  assert.equal(canSetUpPm("In Use", true), true)
  assert.equal(canSetUpPm("Disposed", true), false)
  assert.equal(canSetUpPm("Retired", true), false)
  assert.equal(canSetUpPm("Ready", false), false)
})
