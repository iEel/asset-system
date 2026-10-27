import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import { test } from "node:test"
import { auditItemReviewState } from "../src/lib/audit-item-review-state.ts"

test("an item's review state follows its findings: pending, then exception, approved not-found, approved, else rejected", () => {
  const f = (findingType: string, reviewStatus: string) => ({ findingType, reviewStatus })
  assert.deepEqual(auditItemReviewState([f("wrong_location", "pending"), f("out_of_scope", "approved")]), { reconcileStatus: "pending" })
  assert.deepEqual(auditItemReviewState([f("wrong_location", "pending")], { pendingAuditStatus: "reviewed" }), { auditStatus: "reviewed", reconcileStatus: "pending" })
  assert.deepEqual(auditItemReviewState([f("wrong_location", "exception"), f("out_of_scope", "approved")]), { auditStatus: "reviewed", reconcileStatus: "exception" })
  assert.deepEqual(auditItemReviewState([f("not_found", "approved")]), { auditStatus: "reviewed", reconcileStatus: "pending_investigation" })
  assert.deepEqual(auditItemReviewState([f("wrong_location", "rejected"), f("out_of_scope", "approved")]), { auditStatus: "reconciled", reconcileStatus: "approved" })
  assert.deepEqual(auditItemReviewState([f("wrong_location", "rejected")]), { auditStatus: "reviewed", reconcileStatus: "rejected" })
})

test("the review route and the scan route share one review-state helper; routes export only handlers", () => {
  const review = readFileSync("src/app/api/audit-findings/[id]/review/route.ts", "utf8")
  const scan = readFileSync("src/app/api/audit-rounds/[id]/scan/route.ts", "utf8")
  assert.match(review, /import \{ updateAuditItemReviewState \} from "@\/lib\/audit-item-review-state"/)
  assert.doesNotMatch(review, /function updateAuditItemReviewState/)
  assert.match(scan, /import \{ auditItemReviewState \} from "@\/lib\/audit-item-review-state"/)
  assert.match(scan, /auditItemReviewState\(findings, \{ pendingAuditStatus: "reviewed" \}\)/)
})
