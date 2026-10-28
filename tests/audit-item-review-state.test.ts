import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import { test } from "node:test"
import { auditItemReviewState, updateAuditItemReviewState } from "../src/lib/audit-item-review-state.ts"

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

test("the item-state read seeks the finding's asset as well as its item, so it uses IX_audit_findings_assetId (I-1b)", async () => {
  const reads: unknown[] = []
  const writes: unknown[] = []
  const tx = {
    auditFinding: { findMany: async (args: unknown) => { reads.push(args); return [{ findingType: "wrong_location", reviewStatus: "approved" }] } },
    auditItem: { update: async (args: unknown) => { writes.push(args); return {} } },
  }
  await updateAuditItemReviewState(tx as never, { auditItemId: "item-1", assetId: "asset-1" })
  assert.deepEqual(reads, [{ where: { auditItemId: "item-1", assetId: "asset-1" }, select: { findingType: true, reviewStatus: true } }])
  assert.deepEqual(writes, [{ where: { id: "item-1" }, data: { auditStatus: "reconciled", reconcileStatus: "approved" } }])

  // Every creator copies the item's asset (final-fix-report I-1b); a finding without one still reads its item's whole set.
  reads.length = 0
  await updateAuditItemReviewState(tx as never, { auditItemId: "item-1", assetId: null })
  assert.deepEqual(reads, [{ where: { auditItemId: "item-1" }, select: { findingType: true, reviewStatus: true } }])
})
