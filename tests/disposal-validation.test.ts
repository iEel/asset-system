import assert from "node:assert/strict"
import test from "node:test"

import {
  getDisposalDecisionFieldErrors,
  getDisposalExecutionFieldErrors,
  getDisposalRequestReasonError,
  requiresDisposalExecutionRecipient,
  requiresDisposalExecutionRemark,
  showsActualSalvageValue,
  showsActualSaleValue,
} from "../src/lib/disposal-type-policy.ts"

const baseExecution = {
  action: "execute",
  executionDate: "2026-07-13",
  executedById: "employee-executor",
  nextStatusId: "status-retired",
}

test("requires a meaningful disposal request reason", () => {
  assert.notEqual(getDisposalRequestReasonError("บริจาค"), null)
  assert.equal(getDisposalRequestReasonError("บริจาคอุปกรณ์ให้โรงเรียนตามหนังสืออนุมัติ"), null)
})

test("requires a reason when a disposal request is rejected", () => {
  assert.deepEqual(getDisposalDecisionFieldErrors({ decision: "reject", approvalRemark: "" }), [
    { field: "approvalRemark", message: "Rejection reason is required" },
  ])
  assert.deepEqual(getDisposalDecisionFieldErrors({ decision: "reject", approvalRemark: "Asset returned to service" }), [])
  assert.deepEqual(getDisposalDecisionFieldErrors({ decision: "approve", approvalRemark: "" }), [])
})

test("describes type-aware disposal execution fields", () => {
  assert.equal(requiresDisposalExecutionRecipient("sell"), true)
  assert.equal(requiresDisposalExecutionRecipient("donate"), true)
  assert.equal(requiresDisposalExecutionRecipient("destroy"), false)
  assert.equal(requiresDisposalExecutionRemark("lost"), true)
  assert.equal(requiresDisposalExecutionRemark("destroy"), true)
  assert.equal(requiresDisposalExecutionRemark("donate"), false)
  assert.equal(showsActualSaleValue("sell"), true)
  assert.equal(showsActualSaleValue("donate"), false)
  assert.equal(showsActualSalvageValue("dispose"), true)
  assert.equal(showsActualSalvageValue("lost"), false)
})

test("requires buyer, document, and actual value for a sale", () => {
  const result = getDisposalExecutionFieldErrors({ ...baseExecution, disposalType: "sell" })
  assert.ok(result.length > 0)

  assert.deepEqual(getDisposalExecutionFieldErrors({
    ...baseExecution,
    disposalType: "sell",
    recipientName: "Buyer Co.",
    documentNo: "INV-001",
    actualSaleValue: 12000,
  }), [])
})

test("requires recipient and document for donation and general disposal", () => {
  for (const disposalType of ["donate", "dispose"] as const) {
    assert.ok(getDisposalExecutionFieldErrors({ ...baseExecution, disposalType }).length > 0)
    assert.deepEqual(getDisposalExecutionFieldErrors({
      ...baseExecution,
      disposalType,
      recipientName: "Receiving organization",
      documentNo: "DOC-001",
    }), [])
  }
})

test("requires incident or destruction details and document", () => {
  for (const disposalType of ["destroy", "lost"] as const) {
    assert.ok(getDisposalExecutionFieldErrors({ ...baseExecution, disposalType }).length > 0)
    assert.deepEqual(getDisposalExecutionFieldErrors({
      ...baseExecution,
      disposalType,
      documentNo: "REPORT-001",
      executionRemark: "Recorded procedure and responsible witnesses",
    }), [])
  }
})
