import assert from "node:assert/strict"
import test from "node:test"

import {
  buildRepairHistory,
  buildRepairNextStep,
  defaultAttachmentType,
  repairDurationLine,
  type RepairDetailRecord,
} from "../src/lib/repair-record-detail-rules.ts"
import type { RepairAssetFacts } from "../src/lib/repair-record-outlook.ts"

// The repair record page's pure rules (group 5 plan 3, spec §8.1-§8.3): the next step, the day count and the history.

function record(overrides: Partial<RepairDetailRecord> = {}): RepairDetailRecord {
  return {
    id: "r-1",
    repairStatus: "in_progress",
    outcome: null,
    reportedDate: new Date("2026-11-01T02:00:00Z"),
    returnDate: null,
    problem: "จอไม่ติด",
    vendorName: null,
    createdBy: "u1",
    maintenancePlanId: null,
    ...overrides,
  }
}

function facts(overrides: Partial<RepairAssetFacts> = {}): RepairAssetFacts {
  return {
    id: "a-1",
    assetTag: "NB-001",
    name: "Notebook",
    statusName: "Under Maintenance",
    statusLabel: "อยู่ระหว่างซ่อม",
    conditionId: "condition-good",
    conditionLabel: "ดี",
    ownershipType: "shared",
    custodianId: null,
    holderName: null,
    departmentName: "IT",
    roomName: "ห้อง 101",
    branchName: "สำนักงานใหญ่",
    photo: null,
    openRecord: { id: "r-1", repairNo: "MT-1" },
    activeCheckout: null,
    ...overrides,
  }
}

const returnDate = new Date("2026-11-02T03:00:00Z")

test("next step: an open record with a vendor offers both outcomes, usable first", () => {
  const step = buildRepairNextStep({ record: record({ vendorName: "ศูนย์ Lenovo" }), facts: facts(), openDisposal: null, cancel: null })
  assert.equal(step.kind, "open")
  if (step.kind !== "open") return
  assert.equal(step.vendorName, "ศูนย์ Lenovo")
  assert.equal(step.rows.length, 2)
  assert.deepEqual(step.rows.map((row) => row.outcome), ["usable", "beyond_repair"])
  assert.deepEqual(step.rows[0].outlook, { kind: "status", nextStatusName: "Ready", note: { key: "noHolder" } })
})

test("next step: closed usable names the asset's status", () => {
  const step = buildRepairNextStep({
    record: record({ repairStatus: "closed", outcome: "usable", returnDate }),
    facts: facts({ statusName: "Ready", openRecord: null }),
    openDisposal: null,
    cancel: null,
  })
  assert.deepEqual(step, { kind: "closedUsable", returnDate, statusName: "Ready" })
})

test("next step: closed beyond repair reads disposed, then an open request, then can request (G5P3-R7)", () => {
  const closed = record({ repairStatus: "closed", outcome: "beyond_repair", returnDate })
  const request = { id: "d-1", disposalNo: "DS-2026-0001" }
  assert.deepEqual(
    buildRepairNextStep({ record: closed, facts: facts({ statusName: " disposed " }), openDisposal: request, cancel: null }),
    { kind: "closedBeyond", returnDate, disposal: { kind: "assetDisposed" } },
  )
  assert.deepEqual(
    buildRepairNextStep({ record: closed, facts: facts({ statusName: "Pending Disposal" }), openDisposal: request, cancel: null }),
    { kind: "closedBeyond", returnDate, disposal: { kind: "openRequest", id: "d-1", disposalNo: "DS-2026-0001" } },
  )
  assert.deepEqual(
    buildRepairNextStep({ record: closed, facts: facts({ statusName: "Pending Disposal" }), openDisposal: null, cancel: null }),
    { kind: "closedBeyond", returnDate, disposal: { kind: "canRequest" } },
  )
})

test("next step: closed without an outcome, and cancelled with its reason (G5P3-R5)", () => {
  assert.deepEqual(
    buildRepairNextStep({ record: record({ repairStatus: "closed", returnDate }), facts: facts(), openDisposal: null, cancel: null }),
    { kind: "closedNoOutcome", returnDate },
  )
  const at = new Date("2026-11-02T05:00:00Z")
  assert.deepEqual(
    buildRepairNextStep({ record: record({ repairStatus: "cancelled" }), facts: facts(), openDisposal: null, cancel: { at, reason: "บันทึกผิดเครื่อง" } }),
    { kind: "cancelled", cancelledAt: at, reason: "บันทึกผิดเครื่อง" },
  )
  assert.deepEqual(
    buildRepairNextStep({ record: record({ repairStatus: "cancelled" }), facts: facts(), openDisposal: null, cancel: { at, reason: "  " } }),
    { kind: "cancelled", cancelledAt: at, reason: null },
  )
  assert.deepEqual(
    buildRepairNextStep({ record: record({ repairStatus: "cancelled" }), facts: facts(), openDisposal: null, cancel: null }),
    { kind: "cancelled", cancelledAt: null, reason: null },
  )
})

test("duration: Bangkok days while open, sent with a vendor, repair without; closed has none", () => {
  const now = new Date("2026-11-02T17:30:00Z")
  assert.deepEqual(repairDurationLine(record({ vendorName: "ศูนย์ Lenovo" }), now), { key: "sentDays", days: 2 })
  assert.deepEqual(repairDurationLine(record(), now), { key: "repairDays", days: 2 })
  const sameDay = new Date("2026-11-01T09:00:00Z")
  assert.deepEqual(repairDurationLine(record(), sameDay), { key: "repairToday", days: 0 })
  assert.deepEqual(repairDurationLine(record({ vendorName: "ศูนย์ Lenovo" }), sameDay), { key: "sentToday", days: 0 })
  assert.equal(repairDurationLine(record({ repairStatus: "closed", returnDate }), now), null)
  assert.equal(repairDurationLine(record({ repairStatus: "cancelled" }), now), null)
})

test("default attachment type: before while open, after once closed or cancelled", () => {
  assert.equal(defaultAttachmentType("in_progress"), "before_repair")
  assert.equal(defaultAttachmentType("open"), "before_repair")
  assert.equal(defaultAttachmentType("closed"), "after_repair")
  assert.equal(defaultAttachmentType("cancelled"), "after_repair")
})

const actorById = new Map([
  ["u1", "สมชาย"],
  ["u2", "สมหญิง"],
])

test("history: twelve photos in a minute by one person, then one invoice by another, are two events (Review Focus 3)", () => {
  const start = Date.parse("2026-11-01T03:00:00Z")
  const photos = Array.from({ length: 12 }, (_, index) => ({
    id: `p-${index + 1}`,
    uploadedAt: new Date(start + index * 5_000),
    uploadedBy: "u1",
    type: "before_repair",
  }))
  const invoice = { id: "inv-1", uploadedAt: new Date(start + 5 * 60_000), uploadedBy: "u2", type: "invoice" }
  const events = buildRepairHistory({
    record: record({ repairStatus: "closed", returnDate }),
    movements: [],
    attachments: [invoice, ...photos.slice().reverse()],
    actorById,
  })
  assert.deepEqual(events, [
    { kind: "attachments", key: "p-1", at: new Date(start), type: "before_repair", count: 12, actor: "สมชาย" },
    { kind: "attachments", key: "inv-1", at: invoice.uploadedAt, type: "invoice", count: 1, actor: "สมหญิง" },
  ])
})

test("history: a run breaks after ten minutes from its first upload, and on another type or uploader (G5P3-R4)", () => {
  const start = Date.parse("2026-11-01T03:00:00Z")
  const at = (minutes: number) => new Date(start + minutes * 60_000)
  const events = buildRepairHistory({
    record: record({ repairStatus: "closed", returnDate }),
    movements: [],
    attachments: [
      { id: "a", uploadedAt: at(0), uploadedBy: "u1", type: "before_repair" },
      { id: "b", uploadedAt: at(6), uploadedBy: "u1", type: "before_repair" },
      { id: "c", uploadedAt: at(11), uploadedBy: "u1", type: "before_repair" },
      { id: "d", uploadedAt: at(12), uploadedBy: "u1", type: "after_repair" },
      { id: "e", uploadedAt: at(13), uploadedBy: "u9", type: "after_repair" },
    ],
    actorById,
  })
  assert.deepEqual(
    events.map((event) => (event.kind === "attachments" ? [event.key, event.count, event.actor] : event.kind)),
    [["a", 2, "สมชาย"], ["c", 1, "สมชาย"], ["d", 1, "สมชาย"], ["e", 1, null]],
  )
})

test("history: movements oldest first, labels, the reason line, actors and the future step while open", () => {
  const status = (value: string) => ({ kind: "status" as const, value })
  const movements = [
    {
      id: "m-2",
      movementType: "condition_change",
      performedAt: new Date("2026-11-01T03:00:00Z"),
      performedBy: "u2",
      fromLabel: { kind: "condition" as const, value: "ดี" },
      toLabel: { kind: "condition" as const, value: "ชำรุด" },
      reason: "  จอไม่ติด ",
    },
    {
      id: "m-1",
      movementType: "maintenance_create",
      performedAt: new Date("2026-11-01T02:00:00Z"),
      performedBy: "u1",
      fromLabel: status("พร้อมใช้งาน"),
      toLabel: status("อยู่ระหว่างซ่อม"),
      reason: "จอไม่ติด",
    },
    {
      id: "m-3",
      movementType: "something_else",
      performedAt: new Date("2026-11-01T04:00:00Z"),
      performedBy: "unknown",
      fromLabel: null,
      toLabel: { kind: "text" as const, value: "x" },
      reason: "ส่งศูนย์",
    },
  ]
  const attachments = [{ id: "f-1", uploadedAt: new Date("2026-11-01T02:30:00Z"), uploadedBy: "u1", type: "before_repair" }]
  const open = buildRepairHistory({ record: record(), movements, attachments, actorById })
  assert.deepEqual(open, [
    { kind: "movement", id: "m-1", at: movements[1].performedAt, labelKey: "create", from: status("พร้อมใช้งาน"), to: status("อยู่ระหว่างซ่อม"), actor: "สมชาย", reason: null },
    { kind: "attachments", key: "f-1", at: attachments[0].uploadedAt, type: "before_repair", count: 1, actor: "สมชาย" },
    { kind: "movement", id: "m-2", at: movements[0].performedAt, labelKey: "conditionChange", from: { kind: "condition", value: "ดี" }, to: { kind: "condition", value: "ชำรุด" }, actor: "สมหญิง", reason: null },
    { kind: "movement", id: "m-3", at: movements[2].performedAt, labelKey: "fallback", from: null, to: { kind: "text", value: "x" }, actor: null, reason: "ส่งศูนย์" },
    { kind: "future" },
  ])
  const closed = buildRepairHistory({ record: record({ repairStatus: "closed", returnDate }), movements, attachments, actorById })
  assert.equal(closed.at(-1)?.kind, "movement")
  assert.equal(closed.some((event) => event.kind === "future"), false)
})

test("history: each maintenance movement type has its label key", () => {
  const types = [
    ["maintenance_create", "create"],
    ["maintenance_status_update", "statusUpdate"],
    ["maintenance_close", "close"],
    ["maintenance_cancel", "cancel"],
    ["maintenance_pm_create", "pmCreate"],
    ["condition_change", "conditionChange"],
  ] as const
  const events = buildRepairHistory({
    record: record({ repairStatus: "cancelled" }),
    movements: types.map(([movementType], index) => ({
      id: `m-${index}`,
      movementType,
      performedAt: new Date(Date.parse("2026-11-01T02:00:00Z") + index * 60_000),
      performedBy: "u1",
      fromLabel: null,
      toLabel: null,
      reason: null,
    })),
    attachments: [],
    actorById,
  })
  assert.deepEqual(events.map((event) => (event.kind === "movement" ? event.labelKey : event.kind)), types.map(([, key]) => key))
})
