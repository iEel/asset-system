import assert from "node:assert/strict"
import test from "node:test"

import { issuesToFieldErrors } from "../src/lib/field-errors.ts"
import { repairRecordActionSchema, repairRecordCreateSchema } from "../src/lib/validations/maintenance.ts"

test("a repair can be recorded with only asset, date and what was done", () => {
  const input = repairRecordCreateSchema.parse({ assetId: "asset-1", reportedDate: "2026-10-07", problem: "เปลี่ยนแบตเตอรี่", done: true, conditionId: "good" })

  assert.equal(input.outcome, "usable")
  assert.equal(input.conditionId, "good")
  assert.equal(input.repairCost, null)
  assert.equal(input.vendorId, null)
})

test("the problem text is required", () => {
  assert.throws(() => repairRecordCreateSchema.parse({ assetId: "asset-1", reportedDate: "2026-10-07", problem: "  ", done: true }))
})

test("completing needs the return date and outcome", () => {
  const input = repairRecordActionSchema.parse({
    action: "complete",
    expectedUpdatedAt: "2026-10-07T03:00:00.000Z",
    returnDate: "2026-10-08",
    outcome: "beyond_repair",
  })
  assert.equal(input.action, "complete")
  assert.throws(() => repairRecordActionSchema.parse({ action: "complete", expectedUpdatedAt: "2026-10-07T03:00:00.000Z" }))
})

test("cancelling does not require a reason", () => {
  assert.equal(repairRecordActionSchema.parse({ action: "cancel", expectedUpdatedAt: "2026-10-07T03:00:00.000Z" }).action, "cancel")
})

const completeBody = { action: "complete", expectedUpdatedAt: "2026-10-07T03:00:00.000Z", returnDate: "2026-10-08" }
const createBody = { assetId: "asset-1", reportedDate: "2026-10-07", problem: "เปลี่ยนแบตเตอรี่" }
const fieldErrorsOf = (result: { success: boolean; error?: { issues: Parameters<typeof issuesToFieldErrors>[0] } }) =>
  result.success ? {} : issuesToFieldErrors(result.error!.issues)

test("a repair closed as usable needs the condition after repair; beyond repair needs none (group 3 spec §19.4)", () => {
  const missing = repairRecordActionSchema.safeParse({ ...completeBody, outcome: "usable" })
  assert.equal(missing.success, false)
  assert.deepEqual(missing.error!.issues.map((issue) => issue.path), [["conditionId"]])
  assert.equal(missing.error!.issues[0].message, "conditionAfterRepairRequired")
  assert.deepEqual(fieldErrorsOf(missing), { conditionId: "conditionAfterRepairRequired" })
  assert.deepEqual(fieldErrorsOf(repairRecordActionSchema.safeParse({ ...completeBody, outcome: "usable", conditionId: "  " })), { conditionId: "conditionAfterRepairRequired" })

  const usable = repairRecordActionSchema.parse({ ...completeBody, outcome: "usable", conditionId: "good" })
  assert.equal(usable.action === "complete" && usable.conditionId, "good")
  const beyond = repairRecordActionSchema.parse({ ...completeBody, outcome: "beyond_repair" })
  assert.equal(beyond.action === "complete" && beyond.conditionId, null)
})

test("recording a finished usable repair needs the condition after repair; an unfinished one needs none", () => {
  assert.deepEqual(fieldErrorsOf(repairRecordCreateSchema.safeParse({ ...createBody, done: true, outcome: "usable" })), { conditionId: "conditionAfterRepairRequired" })
  assert.deepEqual(fieldErrorsOf(repairRecordCreateSchema.safeParse({ ...createBody, done: true })), { conditionId: "conditionAfterRepairRequired" }, "usable is the default outcome")
  assert.equal(repairRecordCreateSchema.parse({ ...createBody, done: true, outcome: "beyond_repair" }).conditionId, null)
  assert.equal(repairRecordCreateSchema.parse({ ...createBody, done: false }).conditionId, null)
  assert.equal(repairRecordCreateSchema.parse({ ...createBody, done: true, outcome: "usable", conditionId: "fair" }).conditionId, "fair")
})
