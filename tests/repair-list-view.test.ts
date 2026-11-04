import assert from "node:assert/strict"
import test from "node:test"

import {
  foldRepairStatusCounts,
  pmCardFootLink,
  toPmCardRowView,
  toRepairListRowView,
  type PmCardPlan,
  type RepairListRecord,
} from "../src/lib/repair-list-view.ts"

// Group 5 plan 5 Task 1 (G5P5-R4, R6, R7; Review Focus 1, 2, 4): the list's pure views.
// 2026-11-05 00:30 Bangkok.
const now = new Date("2026-11-04T17:30:00Z")

function record(overrides: Partial<RepairListRecord> = {}): RepairListRecord {
  return {
    id: "rec-1",
    repairNo: "RP-2026-0001",
    // 2026-10-31 09:00 Bangkok: five Bangkok days before now.
    reportedDate: new Date("2026-10-31T02:00:00Z"),
    returnDate: null,
    repairStatus: "in_progress",
    outcome: null,
    problem: "เปิดไม่ติด",
    resolution: null,
    repairCost: null,
    createdBy: "admin",
    maintenancePlanId: null,
    asset: { name: "UPS ห้อง 3", assetTag: "AT-0001" },
    reportedBy: { fullNameTh: "สมชาย ใจดี" },
    vendor: null,
    ...overrides,
  }
}

test("status counts fold old workflow statuses into in_progress, and all is their sum", () => {
  assert.deepEqual(
    foldRepairStatusCounts([
      { repairStatus: "in_progress", _count: { _all: 2 } },
      { repairStatus: "waiting_vendor", _count: { _all: 1 } },
      { repairStatus: "reported", _count: { _all: 1 } },
      { repairStatus: "closed", _count: { _all: 3 } },
      { repairStatus: "cancelled", _count: { _all: 1 } },
    ]),
    { all: 8, in_progress: 4, closed: 3, cancelled: 1 },
  )
  assert.deepEqual(foldRepairStatusCounts([]), { all: 0, in_progress: 0, closed: 0, cancelled: 0 })
})

test("a closed row's line is its outcome, unknown when none was recorded", () => {
  const usable = toRepairListRowView(record({ repairStatus: "closed", outcome: "usable" }), null, now)
  assert.deepEqual(usable.line, { kind: "outcome", key: "usable" })
  assert.equal(usable.status, "closed")
  const beyond = toRepairListRowView(record({ repairStatus: "closed", outcome: "beyond_repair" }), null, now)
  assert.deepEqual(beyond.line, { kind: "outcome", key: "beyond_repair" })
  const none = toRepairListRowView(record({ repairStatus: "closed", outcome: null }), null, now)
  assert.deepEqual(none.line, { kind: "outcome", key: "unknown" })
})

test("an open row's line is its Bangkok day count, sent with a vendor", () => {
  const sent = toRepairListRowView(record({ vendor: { name: "ร้านซ่อม" } }), null, now)
  assert.deepEqual(sent.line, { kind: "duration", key: "sentDays", days: 5 })
  assert.equal(sent.vendorName, "ร้านซ่อม")
  const inHouse = toRepairListRowView(record(), null, now)
  assert.deepEqual(inHouse.line, { kind: "duration", key: "repairDays", days: 5 })
  const today = toRepairListRowView(record({ reportedDate: new Date("2026-11-04T17:10:00Z") }), null, now)
  assert.deepEqual(today.line, { kind: "duration", key: "repairToday", days: 0 })
})

test("an old workflow status shows as in_progress with a duration", () => {
  const row = toRepairListRowView(record({ repairStatus: "waiting_vendor", vendor: { name: "ร้านซ่อม" } }), null, now)
  assert.equal(row.status, "in_progress")
  assert.deepEqual(row.line, { kind: "duration", key: "sentDays", days: 5 })
})

test("a cancelled row's line is the cancel reason, none when the reason is empty", () => {
  const withReason = toRepairListRowView(record({ repairStatus: "cancelled" }), "แจ้งซ้ำ", now)
  assert.deepEqual(withReason.line, { kind: "cancelReason", text: "แจ้งซ้ำ" })
  assert.equal(withReason.status, "cancelled")
  assert.equal(toRepairListRowView(record({ repairStatus: "cancelled" }), "", now).line, null)
  assert.equal(toRepairListRowView(record({ repairStatus: "cancelled" }), "  ", now).line, null)
  assert.equal(toRepairListRowView(record({ repairStatus: "cancelled" }), null, now).line, null)
})

test("the row carries its fields, with the Decimal cost as a number", () => {
  const row = toRepairListRowView(
    record({ repairCost: { toString: () => "1250.50" }, resolution: "เปลี่ยนแบตเตอรี่" }),
    null,
    now,
  )
  assert.equal(row.id, "rec-1")
  assert.equal(row.repairNo, "RP-2026-0001")
  assert.deepEqual(row.asset, { name: "UPS ห้อง 3", assetTag: "AT-0001" })
  assert.equal(row.problem, "เปิดไม่ติด")
  assert.equal(row.resolution, "เปลี่ยนแบตเตอรี่")
  assert.equal(row.reporterName, "สมชาย ใจดี")
  assert.equal(row.vendorName, null)
  assert.equal(row.cost, 1250.5)
  assert.equal(toRepairListRowView(record({ repairCost: 0 }), null, now).cost, 0)
  assert.equal(toRepairListRowView(record(), null, now).cost, null)
})

function plan(overrides: Partial<PmCardPlan> = {}): PmCardPlan {
  return {
    id: "plan-1",
    title: "ล้างแอร์",
    // 2026-11-02 Bangkok: three Bangkok days before now.
    nextDueDate: new Date("2026-11-01T17:00:00Z"),
    asset: { name: "แอร์ห้องประชุม", assetTag: "AT-0002", maintenanceTickets: [] },
    ...overrides,
  }
}

test("a PM card row past its due day shows the overdue days", () => {
  const row = toPmCardRowView(plan(), now)
  assert.deepEqual(row.badge, { kind: "overdue", days: 3 })
  assert.equal(row.title, "ล้างแอร์")
  assert.equal(row.assetName, "แอร์ห้องประชุม")
  assert.equal(row.assetTag, "AT-0002")
  assert.equal(row.openRecord, null)
})

test("a PM card row due today or later shows its due date", () => {
  const today = new Date("2026-11-04T17:00:00Z")
  assert.deepEqual(toPmCardRowView(plan({ nextDueDate: today }), now).badge, { kind: "due", date: today })
  const later = new Date("2026-11-08T17:00:00Z")
  assert.deepEqual(toPmCardRowView(plan({ nextDueDate: later }), now).badge, { kind: "due", date: later })
})

test("a PM card row whose asset has an open record carries it", () => {
  const row = toPmCardRowView(
    plan({ asset: { name: "แอร์", assetTag: "AT-0002", maintenanceTickets: [{ id: "rec-9", repairNo: "RP-2026-0009" }] } }),
    now,
  )
  assert.deepEqual(row.openRecord, { id: "rec-9", repairNo: "RP-2026-0009" })
})

test("the PM card's foot link prefers the overdue plans, and hides at zero", () => {
  assert.deepEqual(pmCardFootLink(2, 5), { due: "overdue", count: 2 })
  assert.deepEqual(pmCardFootLink(0, 5), { due: "week", count: 5 })
  assert.equal(pmCardFootLink(0, 0), null)
})
