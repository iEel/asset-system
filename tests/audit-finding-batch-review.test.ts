import assert from "node:assert/strict"
import test from "node:test"
import {
  auditFindingSelectAllState,
  runAuditFindingBatchReview,
  toggleAllAuditFindings,
  toggleAuditFindingSelection,
  type AuditFindingBatchReviewBody,
} from "../src/lib/audit-finding-batch-review.ts"

// Group 2 plan 4 Task 5 (spec §10 "Batch results", bugs 17-18, decision 5, P4-R4): the batch is a client loop over the
// one review route. It goes past every failure, sends one review at a time, never confirms a conflict, and reports each
// finding through Task 1's classifier. The answers below are the review route's own bodies (review/route.ts:115, :118,
// :133-142).
const OK = { status: 200, body: { id: "x", reviewStatus: "approved" } }
const ALREADY_DECIDED = { status: 400, body: { error: "Audit finding has already been reviewed" } }
const ASSET_CHANGED = { status: 409, body: { code: "asset_updated_after_finding", error: "Asset data changed after this audit finding was reported" } }

function fakeSend(answers: Record<string, { status: number; body: unknown } | Error>) {
  const sent: Array<{ id: string; body: AuditFindingBatchReviewBody }> = []
  let inFlight = 0
  let maxInFlight = 0
  const send = async (id: string, body: AuditFindingBatchReviewBody) => {
    sent.push({ id, body })
    inFlight += 1
    maxInFlight = Math.max(maxInFlight, inFlight)
    await new Promise((resolve) => setTimeout(resolve, 1))
    inFlight -= 1
    const answer = answers[id] ?? OK
    if (answer instanceof Error) throw answer
    return answer
  }
  return { send, sent, maxInFlight: () => maxInFlight }
}

test("bug 17: the batch goes past a failure, in page order and one at a time, and reports each finding", async () => {
  const fake = fakeSend({ b: ALREADY_DECIDED })
  const result = await runAuditFindingBatchReview(["a", "b", "c"], { action: "approve", reviewRemark: "" }, fake.send)
  assert.deepEqual(result, { succeeded: ["a", "c"], failed: [{ id: "b", reason: "alreadyDecided" }] })
  assert.deepEqual(fake.sent.map((entry) => entry.id), ["a", "b", "c"])
  assert.equal(fake.maxInFlight(), 1, "one review at a time")
})

test("bug 18: a 409 skips that finding for the panel and the rest still run; a batch never confirms a conflict", async () => {
  const fake = fakeSend({ b: ASSET_CHANGED })
  const result = await runAuditFindingBatchReview(["a", "b", "c"], { action: "reject", reviewRemark: "ตรวจซ้ำแล้วถูกต้อง" }, fake.send)
  assert.deepEqual(result, { succeeded: ["a", "c"], failed: [{ id: "b", reason: "assetChanged" }] })
  for (const entry of fake.sent) {
    assert.deepEqual(entry.body, { action: "reject", reviewRemark: "ตรวจซ้ำแล้วถูกต้อง" }, "one shared reason, as typed")
    assert.equal(Object.hasOwn(entry.body, "confirmConflict"), false)
  }
})

test("a network error fails that finding only; progress counts each answer once", async () => {
  const progress: number[] = []
  const fake = fakeSend({ a: new TypeError("Failed to fetch") })
  const result = await runAuditFindingBatchReview(["a", "b"], { action: "approve", reviewRemark: "" }, fake.send, (done) => progress.push(done))
  assert.deepEqual(result, { succeeded: ["b"], failed: [{ id: "a", reason: "failed" }] })
  assert.deepEqual(progress, [1, 2])
  assert.deepEqual(await runAuditFindingBatchReview([], { action: "approve", reviewRemark: "" }, fake.send), { succeeded: [], failed: [] })
})

// Which rows take a tick is Task 2's row.reviewable (the review route's own refusals), tested by value in
// tests/audit-findings-page-data.test.ts: a pending finding the viewer did not report, on a round still open.

test("the header tick reads none, some or all of the page's tickable rows, and ticks them all or clears them", () => {
  assert.equal(auditFindingSelectAllState([], ["a", "b"]), "none")
  assert.equal(auditFindingSelectAllState(["a"], ["a", "b"]), "some")
  assert.equal(auditFindingSelectAllState(["a", "b"], ["a", "b"]), "all")
  assert.equal(auditFindingSelectAllState([], []), "none")
  assert.deepEqual([...toggleAllAuditFindings(new Set(["a"]), ["a", "b"])], ["a", "b"])
  assert.deepEqual([...toggleAllAuditFindings(new Set(["a", "b"]), ["a", "b"])], [])
  assert.deepEqual([...toggleAllAuditFindings(new Set(), [])], [])
  assert.deepEqual([...toggleAuditFindingSelection(new Set(["a"]), "b")], ["a", "b"])
  assert.deepEqual([...toggleAuditFindingSelection(new Set(["a", "b"]), "a")], ["b"])
  const before = new Set(["a"])
  toggleAuditFindingSelection(before, "b")
  assert.deepEqual([...before], ["a"], "a new set; the state is never changed in place")
})
