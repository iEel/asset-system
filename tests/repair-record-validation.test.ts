import assert from "node:assert/strict"
import test from "node:test"

import { repairRecordActionSchema, repairRecordCreateSchema } from "../src/lib/validations/maintenance.ts"

test("a repair can be recorded with only asset, date and what was done", () => {
  const input = repairRecordCreateSchema.parse({ assetId: "asset-1", reportedDate: "2026-10-07", problem: "เปลี่ยนแบตเตอรี่", done: true })

  assert.equal(input.outcome, "usable")
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
