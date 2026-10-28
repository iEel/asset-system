import assert from "node:assert/strict"
import test from "node:test"

import {
  classifyAuditFindingReviewResponse,
  foldAuditFindingBatchResults,
  type AuditFindingReviewOutcome,
} from "../src/lib/audit-finding-review-results.ts"
import { issuesToFieldErrors } from "../src/lib/field-errors.ts"
import { auditFindingReviewSchema } from "../src/lib/validations/audit.ts"

function refused(body: unknown) {
  const result = auditFindingReviewSchema.safeParse(body)
  if (result.success) assert.fail(`accepted ${JSON.stringify(body)}`)
  return issuesToFieldErrors(result.error.issues)
}

test("a reject needs a reason, trimmed, at most 4000; approving needs none (decision 5, P4-R5)", () => {
  for (const body of [{ action: "reject" }, { action: "reject", reviewRemark: null }, { action: "reject", reviewRemark: "   " }]) {
    assert.deepEqual(refused(body), { reviewRemark: "required" }, JSON.stringify(body))
  }
  assert.deepEqual(auditFindingReviewSchema.parse({ action: "reject", reviewRemark: "  ตรวจซ้ำแล้ว สภาพยังดี  " }), { action: "reject", reviewRemark: "ตรวจซ้ำแล้ว สภาพยังดี", confirmConflict: false })
  assert.deepEqual(refused({ action: "reject", reviewRemark: "x".repeat(4001) }), { reviewRemark: "tooLong" })
  const longest = auditFindingReviewSchema.parse({ action: "reject", reviewRemark: "x".repeat(4000) })
  assert.equal(longest.action === "reject" ? longest.reviewRemark.length : 0, 4000)

  assert.deepEqual(auditFindingReviewSchema.parse({ action: "approve" }), { action: "approve", confirmConflict: false })
  assert.deepEqual(auditFindingReviewSchema.parse({ action: "approve", reviewRemark: "" }), { action: "approve", reviewRemark: null, confirmConflict: false })
  assert.deepEqual(auditFindingReviewSchema.parse({ action: "approve", reviewRemark: null }), { action: "approve", reviewRemark: null, confirmConflict: false })
  assert.deepEqual(auditFindingReviewSchema.parse({ action: "approve", reviewRemark: " ย้ายตามที่พบ ", confirmConflict: true }), { action: "approve", reviewRemark: "ย้ายตามที่พบ", confirmConflict: true })
  assert.deepEqual(refused({ action: "approve", reviewRemark: "x".repeat(4001) }), { reviewRemark: "tooLong" }, "the client's cap, now the server's too")
  assert.deepEqual(refused({}), { action: "invalidChoice" })
  assert.deepEqual(refused({ action: "plan" }), { action: "invalidChoice" }, "the route branches out before it parses plan and close")
})

const answer = (status: number, body: unknown) => classifyAuditFindingReviewResponse(status, body)

test("each answer of the review route names one reason; anything else is failed (P4-R4, RA §6)", () => {
  assert.deepEqual(answer(200, { id: "finding-1", reviewStatus: "approved" }), { ok: true })
  assert.deepEqual(answer(200, null), { ok: true })
  assert.deepEqual(
    answer(409, { code: "asset_updated_after_finding", error: "Asset data changed after this audit finding was reported", assetUpdatedAt: "", findingReportedAt: "", currentValue: "loc-9", expectedValue: "loc-1", actualValue: "loc-2" }),
    { ok: false, reason: "assetChanged" },
  )
  assert.deepEqual(answer(400, { error: "Invalid request data", code: "VALIDATION_FAILED", fieldErrors: { reviewRemark: "required" } }), { ok: false, reason: "reasonRequired" })
  assert.deepEqual(answer(400, { error: "Audit finding has already been reviewed" }), { ok: false, reason: "alreadyDecided" })
  assert.deepEqual(answer(403, { error: "Audit finding must be reviewed by a different user than the reporter" }), { ok: false, reason: "ownFinding" })
  assert.deepEqual(answer(400, { error: "Audit round is closed" }), { ok: false, reason: "roundReadOnly" })
  assert.deepEqual(answer(400, { error: "Audit round is cancelled" }), { ok: false, reason: "roundReadOnly" })
  assert.deepEqual(answer(404, { error: "Audit finding not found" }), { ok: false, reason: "notFound" })

  const failed = { ok: false, reason: "failed" }
  assert.deepEqual(answer(409, { error: "Conflict" }), failed, "a 409 without the conflict code")
  assert.deepEqual(answer(400, { error: "Invalid request data", code: "VALIDATION_FAILED", fieldErrors: { reviewRemark: "tooLong" } }), failed)
  assert.deepEqual(answer(400, { error: "Invalid request data", code: "VALIDATION_FAILED", fieldErrors: { action: "invalidChoice" } }), failed)
  assert.deepEqual(answer(403, { error: "Forbidden: insufficient permissions" }), failed)
  assert.deepEqual(answer(401, { error: "Unauthorized" }), failed)
  assert.deepEqual(answer(500, { error: "Unexpected error · ref 0a1b2c3d" }), failed)
  assert.deepEqual(answer(500, null), failed, "a body that was not JSON")
  assert.deepEqual(answer(404, "<html>"), failed, "a 404 that is not the route's")
  assert.deepEqual(answer(403, { error: "Audit finding has already been reviewed" }), failed, "a key only counts with its own status")
})

test("a batch folds every result in order: the ones that took effect and each failure with its reason (bugs 17-18)", () => {
  const ok: AuditFindingReviewOutcome = { ok: true }
  assert.deepEqual(
    foldAuditFindingBatchResults([
      { id: "f-1", outcome: ok },
      { id: "f-2", outcome: { ok: false, reason: "assetChanged" } },
      { id: "f-3", outcome: ok },
      { id: "f-4", outcome: { ok: false, reason: "alreadyDecided" } },
      { id: "f-5", outcome: { ok: false, reason: "failed" } },
    ]),
    { succeeded: ["f-1", "f-3"], failed: [{ id: "f-2", reason: "assetChanged" }, { id: "f-4", reason: "alreadyDecided" }, { id: "f-5", reason: "failed" }] },
  )
  assert.deepEqual(foldAuditFindingBatchResults([]), { succeeded: [], failed: [] })
})
