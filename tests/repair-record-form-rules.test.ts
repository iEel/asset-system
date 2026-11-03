import assert from "node:assert/strict"
import test from "node:test"

import {
  buildRepairCreatePayload,
  buildRepairCreateSummary,
  repairFieldIds,
  repairFieldOrder,
  repairFooterAnswerKey,
  validateRepairForm,
  type RepairFormValues,
} from "../src/lib/repair-record-form-rules.ts"
import type { RepairAssetFacts } from "../src/lib/repair-record-outlook.ts"

// The rules of the บันทึกซ่อม form (group 5 spec §7.3, §7.5; plan 2 G5P2-R3, R5, R6): no default answer, the summary,
// the payload and the footer line.

function values(overrides: Partial<RepairFormValues> = {}): RepairFormValues {
  return {
    assetId: "a-1",
    reportedDate: "2026-11-03",
    problem: "จอไม่ติด",
    done: null,
    outcome: null,
    conditionId: "",
    reportedById: "",
    vendorId: "",
    repairCost: "",
    invoiceNo: "",
    remark: "",
    ...overrides,
  }
}

function facts(overrides: Partial<RepairAssetFacts> = {}): RepairAssetFacts {
  return {
    id: "a-1",
    assetTag: "NB-001",
    name: "Notebook",
    statusName: "Ready",
    statusLabel: "พร้อมใช้งาน",
    conditionId: "c-good",
    conditionLabel: "ดี",
    ownershipType: "shared",
    custodianId: null,
    holderName: null,
    departmentName: "IT",
    roomName: "ห้อง 101",
    branchName: "สำนักงานใหญ่",
    photo: null,
    openRecord: null,
    activeCheckout: null,
    ...overrides,
  }
}

const conditionLabels = { "c-good": "ดี", "c-fair": "พอใช้" }
const today = { needsReporter: false, todayKey: "2026-11-03" }

function summary(input: { facts?: RepairAssetFacts | null; values?: Partial<RepairFormValues>; plan?: Parameters<typeof buildRepairCreateSummary>[0]["plan"] }) {
  return buildRepairCreateSummary({
    facts: input.facts === undefined ? facts() : input.facts,
    values: values(input.values),
    conditionLabels,
    salvageLabel: "ซาก",
    plan: input.plan ?? null,
  })
}

const row = (result: ReturnType<typeof buildRepairCreateSummary>, key: string) => result.rows.find((item) => item.key === key)

test("validateRepairForm: the done question has no default answer", () => {
  assert.equal(validateRepairForm(values(), today).done, "repairDoneRequired")
  assert.equal(validateRepairForm(values({ done: false }), today).done, undefined)
})

test("validateRepairForm: done needs a result", () => {
  assert.equal(validateRepairForm(values({ done: true }), today).outcome, "repairOutcomeRequired")
  assert.equal(validateRepairForm(values({ done: false }), today).outcome, undefined)
  assert.equal(validateRepairForm(values({ done: true, outcome: "beyond_repair" }), today).outcome, undefined)
})

test("validateRepairForm: the record date may not be after today", () => {
  assert.equal(validateRepairForm(values({ done: false, reportedDate: "2026-11-04" }), today).reportedDate, "repairDateInFuture")
  assert.equal(validateRepairForm(values({ done: false, reportedDate: "2026-11-03" }), today).reportedDate, undefined)
  assert.equal(validateRepairForm(values({ done: false, reportedDate: "" }), today).reportedDate, "required")
})

test("validateRepairForm: done and usable names the condition after repair; today's checks stay", () => {
  assert.equal(validateRepairForm(values({ done: true, outcome: "usable" }), today).conditionId, "conditionAfterRepairRequired")
  assert.equal(validateRepairForm(values({ done: true, outcome: "usable", conditionId: "c-good" }), today).conditionId, undefined)
  assert.equal(validateRepairForm(values({ done: true, outcome: "beyond_repair" }), today).conditionId, undefined)
  const errors = validateRepairForm(values({ done: false, assetId: "", problem: "", repairCost: "-1", invoiceNo: "x".repeat(101) }), { needsReporter: true, todayKey: "2026-11-03" })
  assert.equal(errors.assetId, "required")
  assert.equal(errors.problem, "required")
  assert.equal(errors.reportedById, "required")
  assert.ok(errors.repairCost)
  assert.ok(errors.invoiceNo)
  assert.deepEqual(validateRepairForm(values({ done: false }), today), {})
})

test("repairFieldOrder: the outcome only when done, the condition only when done and usable, the reporter when needed", () => {
  assert.deepEqual(repairFieldOrder(values(), false), ["assetId", "reportedDate", "problem", "done", "vendorId", "repairCost", "invoiceNo", "remark"])
  assert.ok(repairFieldOrder(values({ done: true }), false).includes("outcome"))
  assert.ok(!repairFieldOrder(values({ done: true }), false).includes("conditionId"))
  assert.ok(repairFieldOrder(values({ done: true, outcome: "usable" }), false).includes("conditionId"))
  assert.ok(repairFieldOrder(values(), true).includes("reportedById"))
  // Focus order is the screen order (spec §7.3): the reporter sits after the problem, before the done question.
  assert.deepEqual(repairFieldOrder(values({ done: true, outcome: "usable" }), true), [
    "assetId", "reportedDate", "problem", "reportedById", "done", "outcome", "conditionId", "vendorId", "repairCost", "invoiceNo", "remark",
  ])
  assert.equal(repairFieldIds.conditionId, "repair-create-condition")
  assert.equal(repairFieldIds.done, "repair-record-done")
})

test("buildRepairCreatePayload: leaving done drops the result and the condition (G5P2-R5)", () => {
  const payload = buildRepairCreatePayload(values({ done: false, outcome: "beyond_repair", conditionId: "c-1" }), { planId: null, needsReporter: false })
  assert.equal(payload.done, false)
  assert.equal(payload.outcome, null)
  assert.equal(payload.conditionId, null)
  assert.equal(payload.maintenancePlanId, null)
})

test("buildRepairCreatePayload: done and usable sends the result and the condition", () => {
  const payload = buildRepairCreatePayload(
    values({ done: true, outcome: "usable", conditionId: "c-good", reportedById: "emp-1", vendorId: "v-1", repairCost: "120.50" }),
    { planId: "plan-1", needsReporter: true },
  )
  assert.deepEqual(payload, {
    assetId: "a-1",
    maintenancePlanId: "plan-1",
    problem: "จอไม่ติด",
    reportedDate: "2026-11-03",
    done: true,
    outcome: "usable",
    conditionId: "c-good",
    reportedById: "emp-1",
    vendorId: "v-1",
    repairCost: "120.50",
    invoiceNo: null,
    remark: null,
  })
  const beyond = buildRepairCreatePayload(values({ done: true, outcome: "beyond_repair", conditionId: "c-good", reportedById: "emp-1" }), { planId: null, needsReporter: false })
  assert.equal(beyond.outcome, "beyond_repair")
  assert.equal(beyond.conditionId, null)
  assert.equal(beyond.reportedById, null)
})

test("buildRepairCreateSummary: a Ready asset not done goes to Under Maintenance and shows the if-done block", () => {
  const result = summary({ values: { done: false } })
  const status = row(result, "status")
  assert.deepEqual(status?.now, { kind: "status", name: "Ready" })
  assert.deepEqual(status?.next, { kind: "status", name: "Under Maintenance" })
  assert.equal(status?.changed, true)
  assert.notEqual(result.ifDone, null)
  assert.deepEqual(result.ifDone?.usable, { kind: "status", nextStatusName: "Ready", changes: false })
  assert.deepEqual(result.ifDone?.beyondRepair, { kind: "status", nextStatusName: "Pending Disposal", changes: true })
  assert.deepEqual(row(result, "holder")?.next, { kind: "text", messageKey: "createForm.noChange" })
  assert.deepEqual(row(result, "record")?.now, { kind: "text", messageKey: "createForm.noOpenRecord" })
  assert.deepEqual(row(result, "record")?.next, { kind: "text", messageKey: "createForm.recordOpen" })
  assert.equal(row(result, "condition"), undefined)
  assert.equal(row(result, "plan"), undefined)
})

test("buildRepairCreateSummary: unanswered and done-without-result rows", () => {
  const unanswered = summary({})
  assert.deepEqual(row(unanswered, "status")?.next, { kind: "text", messageKey: "createForm.dependsOnAnswer" })
  assert.equal(row(unanswered, "status")?.changed, false)
  assert.deepEqual(row(unanswered, "record")?.next, { kind: "text", messageKey: "createForm.dependsOnAnswer" })
  assert.notEqual(unanswered.ifDone, null)
  const noOutcome = summary({ values: { done: true } })
  assert.deepEqual(row(noOutcome, "status")?.next, { kind: "text", messageKey: "createForm.dependsOnOutcome" })
  assert.deepEqual(row(noOutcome, "record")?.next, { kind: "text", messageKey: "createForm.recordClosed" })
  assert.deepEqual(row(noOutcome, "condition")?.next, { kind: "text", messageKey: "createForm.dependsOnOutcome" })
  assert.notEqual(noOutcome.ifDone, null)
})

test("buildRepairCreateSummary: a refused answer keeps the status unchanged", () => {
  const onLoan = facts({ statusName: "Checked Out", statusLabel: "ถูกยืม", activeCheckout: { id: "co-1", documentNo: "HO-1", holderName: "สมชาย" } })
  const result = summary({ facts: onLoan, values: { done: false } })
  assert.deepEqual(row(result, "status")?.next, { kind: "status", name: "Checked Out" })
  assert.equal(row(result, "status")?.changed, false)
  assert.deepEqual(result.ifDone?.beyondRepair, { kind: "refused", error: "MAINTENANCE_ASSET_ON_LOAN", held: { checkoutId: "co-1", documentNo: "HO-1", holderName: "สมชาย" } })
})

test("buildRepairCreateSummary: an open record is named in the record row, and the refused save changes no row (final review 1)", () => {
  const open = facts({ openRecord: { id: "r-1", repairNo: "RP-1" } })
  const result = summary({ facts: open, values: { done: true, outcome: "usable", conditionId: "c-fair" } })
  const record = row(result, "record")
  assert.deepEqual(record?.now, { kind: "text", messageKey: "createForm.recordHasOpen", values: { repairNo: "RP-1" } })
  assert.deepEqual(record?.next, record?.now)
  assert.equal(record?.changed, false)
  const condition = row(result, "condition")
  assert.deepEqual(condition?.next, condition?.now)
  assert.equal(condition?.changed, false)
})

test("buildRepairCreateSummary: a held asset answered done and beyond repair keeps its condition and record rows (final review 1)", () => {
  const held = facts({ statusName: "Checked Out", statusLabel: "ถูกยืม", activeCheckout: { id: "co-1", documentNo: "HO-1", holderName: "สมชาย" } })
  const result = summary({ facts: held, values: { done: true, outcome: "beyond_repair" } })
  const condition = row(result, "condition")
  assert.deepEqual(condition?.now, { kind: "plain", text: "ดี" })
  assert.deepEqual(condition?.next, condition?.now)
  assert.equal(condition?.changed, false)
  const record = row(result, "record")
  assert.deepEqual(record?.now, { kind: "text", messageKey: "createForm.noOpenRecord" })
  assert.deepEqual(record?.next, record?.now)
  assert.equal(record?.changed, false)
})

test("buildRepairCreateSummary: a refused answer on the PM path leaves the plan row (final review 1)", () => {
  const plan = { nextDueDate: "2026-01-31", frequency: "monthly" as const, intervalDays: null }
  const held = facts({ statusName: "Checked Out", statusLabel: "ถูกยืม", activeCheckout: { id: "co-1", documentNo: "HO-1", holderName: "สมชาย" } })
  const result = summary({ facts: held, plan, values: { done: true, outcome: "beyond_repair", reportedDate: "2026-01-31" } })
  const planRow = row(result, "plan")
  assert.deepEqual(planRow?.now, { kind: "text", messageKey: "createForm.planNext", values: { date: "2026-01-31" } })
  assert.deepEqual(planRow?.next, planRow?.now)
  assert.equal(planRow?.changed, false)
})

test("buildRepairCreateSummary: done and usable shows the chosen condition and no if-done block", () => {
  const result = summary({ values: { done: true, outcome: "usable", conditionId: "c-fair" } })
  assert.equal(result.ifDone, null)
  const condition = row(result, "condition")
  assert.deepEqual(condition?.now, { kind: "plain", text: "ดี" })
  assert.deepEqual(condition?.next, { kind: "plain", text: "พอใช้" })
  assert.equal(condition?.changed, true)
  const beyond = summary({ values: { done: true, outcome: "beyond_repair" } })
  assert.deepEqual(row(beyond, "condition")?.next, { kind: "plain", text: "ซาก" })
  assert.deepEqual(row(beyond, "status")?.next, { kind: "status", name: "Pending Disposal" })
})

test("buildRepairCreateSummary: the holder row names the holder or none", () => {
  assert.deepEqual(row(summary({}), "holder")?.now, { kind: "text", messageKey: "createForm.noHolder" })
  assert.deepEqual(row(summary({ facts: facts({ holderName: "สมชาย" }) }), "holder")?.now, { kind: "plain", text: "สมชาย" })
})

test("buildRepairCreateSummary: the PM plan row moves only when done (G5P2-R6)", () => {
  const plan = { nextDueDate: "2026-01-31", frequency: "monthly" as const, intervalDays: null }
  const done = summary({ plan, values: { done: true, outcome: "usable", conditionId: "c-good", reportedDate: "2026-01-31" } })
  const planRow = row(done, "plan")
  assert.deepEqual(planRow?.now, { kind: "text", messageKey: "createForm.planNext", values: { date: "2026-01-31" } })
  assert.deepEqual(planRow?.next, { kind: "plain", text: "2026-02-28" })
  assert.equal(planRow?.changed, true)
  const notDone = summary({ plan, values: { done: false, reportedDate: "2026-01-31" } })
  assert.deepEqual(row(notDone, "plan")?.next, { kind: "text", messageKey: "createForm.planNotMoved" })
  assert.equal(row(notDone, "plan")?.changed, false)
})

test("buildRepairCreateSummary: the checklist", () => {
  const keys = (result: ReturnType<typeof buildRepairCreateSummary>) => result.checklist.map((item) => item.key)
  assert.deepEqual(keys(summary({})), ["asset", "dateProblem", "done"])
  assert.deepEqual(keys(summary({ values: { done: true } })), ["asset", "dateProblem", "done", "outcome"])
  assert.deepEqual(keys(summary({ values: { done: true, outcome: "usable" } })), ["asset", "dateProblem", "done", "outcome", "condition"])
  assert.deepEqual(summary({ values: { done: true, outcome: "usable", conditionId: "c-good" } }).checklist.every((item) => item.done), true)
  assert.deepEqual(summary({ facts: null, values: { assetId: "", problem: "" } }).checklist, [
    { key: "asset", done: false },
    { key: "dateProblem", done: false },
    { key: "done", done: false },
  ])
})

test("buildRepairCreateSummary: no asset yet, no rows and no if-done block", () => {
  const result = summary({ facts: null })
  assert.deepEqual(result.rows, [])
  assert.equal(result.ifDone, null)
})

test("repairFooterAnswerKey: its five values", () => {
  assert.equal(repairFooterAnswerKey(values()), "unanswered")
  assert.equal(repairFooterAnswerKey(values({ done: false, outcome: "usable" })), "doneNo")
  assert.equal(repairFooterAnswerKey(values({ done: true })), "doneNoOutcome")
  assert.equal(repairFooterAnswerKey(values({ done: true, outcome: "usable" })), "doneUsable")
  assert.equal(repairFooterAnswerKey(values({ done: true, outcome: "beyond_repair" })), "doneBeyond")
})
