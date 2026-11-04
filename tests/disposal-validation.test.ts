import assert from "node:assert/strict"
import test from "node:test"

import {
  getDisposalDecisionFieldErrors,
  getDisposalRequestReasonError,
  requiresDisposalExecutionRecipient,
  requiresDisposalExecutionRemark,
  showsActualSalvageValue,
  showsActualSaleValue,
} from "../src/lib/disposal-type-policy.ts"
import {
  disposalBulkDecisionSchema,
  disposalDecisionSchema,
  disposalRequestSchema,
  MAX_DISPOSAL_BULK_DECISION_ITEMS,
} from "../src/lib/validations/disposal.ts"

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

test("accepts preview and commit bulk approval packets", () => {
  assert.equal(disposalBulkDecisionSchema.safeParse({ mode: "preview", requestIds: ["11111111-1111-4111-8111-111111111111"] }).success, true)
  assert.equal(disposalBulkDecisionSchema.safeParse({ mode: "commit", requestIds: ["11111111-1111-4111-8111-111111111111"], approvalRemark: "Reviewed together" }).success, true)
})

test("rejects empty, duplicate, oversized, and malformed bulk approval IDs", () => {
  const id = "11111111-1111-4111-8111-111111111111"
  assert.equal(disposalBulkDecisionSchema.safeParse({ mode: "preview", requestIds: [] }).success, false)
  assert.equal(disposalBulkDecisionSchema.safeParse({ mode: "preview", requestIds: [id, id] }).success, false)
  assert.equal(disposalBulkDecisionSchema.safeParse({ mode: "preview", requestIds: Array.from({ length: 201 }, (_, index) => `11111111-1111-4111-8111-${String(index).padStart(12, "0")}`) }).success, false)
  assert.equal(disposalBulkDecisionSchema.safeParse({ mode: "preview", requestIds: ["not-a-uuid"] }).success, false)
})

test("rejects the same bulk approval ID submitted with mixed casing", () => {
  const id = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa"
  const result = disposalBulkDecisionSchema.safeParse({
    mode: "preview",
    requestIds: [id, id.toUpperCase()],
  })

  assert.equal(result.success, false)
})

const bulkDecisionIds = (count: number) =>
  Array.from({ length: count }, (_, index) => `11111111-1111-4111-8111-${String(index).padStart(12, "0")}`)

test("a bulk decision takes up to 200 requests", () => {
  assert.equal(MAX_DISPOSAL_BULK_DECISION_ITEMS, 200)
  assert.equal(disposalBulkDecisionSchema.safeParse({ mode: "preview", requestIds: bulkDecisionIds(200) }).success, true)
  assert.equal(disposalBulkDecisionSchema.safeParse({ mode: "commit", requestIds: bulkDecisionIds(200) }).success, true)
  assert.equal(disposalBulkDecisionSchema.safeParse({ mode: "preview", requestIds: bulkDecisionIds(201) }).success, false)
})

test("a decision no longer needs a next status id", () => {
  assert.equal(disposalDecisionSchema.safeParse({ decision: "approve" }).success, true)
  assert.equal(disposalDecisionSchema.safeParse({ decision: "reject", approvalRemark: "เครื่องยังใช้งานได้ดี" }).success, true)
  const legacy = disposalDecisionSchema.safeParse({ decision: "approve", nextStatusId: "x" })
  assert.equal(legacy.success, true)
  if (legacy.success) assert.equal(legacy.data.nextStatusId, "x")

  const missingRemark = disposalDecisionSchema.safeParse({ decision: "reject" })
  assert.equal(missingRemark.success, false)
  if (!missingRemark.success) {
    assert.deepEqual(missingRemark.error.issues.map((issue) => issue.path[0]), ["approvalRemark"])
  }
})

test("a disposal request needs no price: the form sends neither value (user 2026-11-04)", () => {
  const parsed = disposalRequestSchema.safeParse({
    assetId: "asset-1",
    disposalType: "sell",
    reason: "จอเสีย ซ่อมไม่คุ้ม เสนอตัดจำหน่าย",
    requestedById: "employee-1",
  })
  assert.equal(parsed.success, true)
})
