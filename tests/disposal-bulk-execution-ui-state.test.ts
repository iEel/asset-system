import assert from "node:assert/strict"
import test from "node:test"
import {
  buildBulkExecutionCommitPayload,
  buildBulkExecutionPayload,
  getBangkokBusinessDate,
  getBulkExecutionUnresolvedIds,
  isHistoricalExceptionAvailable,
  mergeBulkExecutionResults,
  setBulkExecutionSelectionMode,
  toggleBulkExecutionItem,
  toggleBulkExecutionPage,
  validateHistoricalException,
} from "../src/lib/disposal-bulk-execution-ui.ts"

const items = [
  { requestId: "s1", disposalType: "sell", effectiveEvidenceCount: 0 },
  { requestId: "s2", disposalType: "sell", effectiveEvidenceCount: 0 },
  { requestId: "d1", disposalType: "destroy", effectiveEvidenceCount: 0 },
]

test("selection mode enforces same type and the 20 item cap", () => {
  let state = setBulkExecutionSelectionMode({ selectionMode: false, selectedIds: [] }, true)
  state = toggleBulkExecutionItem(items, state, "s1").state

  const mixed = toggleBulkExecutionItem(items, state, "d1")
  assert.deepEqual(mixed, { state, message: "mixed" })

  const sellItems = Array.from({ length: 21 }, (_, index) => ({
    requestId: `s${index}`,
    disposalType: "sell",
    effectiveEvidenceCount: 0,
  }))
  state = { selectionMode: true, selectedIds: sellItems.slice(0, 20).map((item) => item.requestId) }
  const capped = toggleBulkExecutionItem(sellItems, state, "s20")
  assert.deepEqual(capped, { state, message: "limit" })
  assert.deepEqual(setBulkExecutionSelectionMode(state, false), { selectionMode: false, selectedIds: [] })
})

test("select page reports only exclusions that actually occurred", () => {
  const sameType = toggleBulkExecutionPage(items.slice(0, 2), { selectionMode: true, selectedIds: [] })
  assert.equal(sameType.message, null)
  assert.deepEqual(sameType.state.selectedIds, ["s1", "s2"])

  const mixed = toggleBulkExecutionPage(items, { selectionMode: true, selectedIds: [] })
  assert.equal(mixed.message, "mixed")

  const overLimit = toggleBulkExecutionPage(
    Array.from({ length: 21 }, (_, index) => ({ requestId: `s${index}`, disposalType: "sell", effectiveEvidenceCount: 0 })),
    { selectionMode: true, selectedIds: [] },
  )
  assert.equal(overLimit.message, "limit")
  assert.equal(overLimit.state.selectedIds.length, 20)
})

test("historical exception requires exact system_admin and zero evidence for every selected row", () => {
  assert.equal(isHistoricalExceptionAvailable(["system_admin"], ["s1", "s2"], items), true)
  assert.equal(isHistoricalExceptionAvailable(["super_admin"], ["s1"], items), false)
  assert.equal(isHistoricalExceptionAvailable(["system_admin"], ["missing"], items), false)
  assert.equal(isHistoricalExceptionAvailable(["system_admin"], ["s1"], [{ ...items[0], effectiveEvidenceCount: 1 }]), false)
  assert.equal(isHistoricalExceptionAvailable(["system_admin"], [], items), false)
})

test("historical exception validates reason and acknowledgement before preview", () => {
  assert.equal(validateHistoricalException({ enabled: false, reason: "", acknowledged: false }), null)
  assert.equal(validateHistoricalException({ enabled: true, reason: "too short", acknowledged: true }), "reason")
  assert.equal(validateHistoricalException({ enabled: true, reason: "x".repeat(2001), acknowledged: true }), "reason")
  assert.equal(validateHistoricalException({ enabled: true, reason: "x".repeat(20), acknowledged: false }), "acknowledgement")
  assert.equal(validateHistoricalException({ enabled: true, reason: " x".repeat(20), acknowledged: true }), null)
})

test("commit payload preserves the exact successfully previewed shared values", () => {
  const values = {
    executionDate: "2026-07-14",
    executedById: "employee-1",
    nextStatusId: "disposed-status",
    useHistoricalEvidenceException: true,
    evidenceExceptionReason: "Historical evidence was not retained.",
    evidenceExceptionAcknowledged: true,
  }
  const preview = buildBulkExecutionPayload("preview", ["s1", "s2"], values)
  assert.deepEqual(preview, { mode: "preview", requestIds: ["s1", "s2"], ...values })

  const commit = buildBulkExecutionCommitPayload(preview, ["s1"])
  assert.deepEqual(commit, { mode: "commit", requestIds: ["s1"], ...values })
})

test("final results retain preview blocks and retry unresolved IDs in stable deduped order", () => {
  const preview = {
    mode: "preview" as const,
    selectedCount: 3,
    eligibleCount: 2,
    blockedCount: 1,
    executedCount: 0,
    failedCount: 0,
    items: [
      { requestId: "a", disposalNo: "A", assetLabel: "Asset A", disposalType: "sell" as const, outcome: "eligible" as const, code: null },
      { requestId: "b", disposalNo: "B", assetLabel: "Asset B", disposalType: "sell" as const, outcome: "blocked" as const, code: "DISPOSAL_EVIDENCE_REQUIRED" as const },
      { requestId: "c", disposalNo: "C", assetLabel: "Asset C", disposalType: "sell" as const, outcome: "eligible" as const, code: null },
    ],
  }
  const commit = {
    mode: "commit" as const,
    selectedCount: 2,
    eligibleCount: 0,
    blockedCount: 1,
    executedCount: 1,
    failedCount: 0,
    items: [
      { ...preview.items[0], outcome: "executed" as const },
      { ...preview.items[2], outcome: "blocked" as const, code: "DISPOSAL_CONCURRENT_UPDATE" as const },
    ],
  }

  const merged = mergeBulkExecutionResults(preview, commit)
  assert.deepEqual(merged.items.map((item) => [item.requestId, item.outcome]), [
    ["a", "executed"],
    ["b", "blocked"],
    ["c", "blocked"],
  ])
  assert.deepEqual(getBulkExecutionUnresolvedIds(merged), ["b", "c"])
  assert.deepEqual(buildBulkExecutionPayload("preview", getBulkExecutionUnresolvedIds(merged), {
    executionDate: "2026-07-14",
    executedById: "employee-1",
    nextStatusId: "disposed-status",
    useHistoricalEvidenceException: false,
    evidenceExceptionReason: null,
    evidenceExceptionAcknowledged: false,
  }).requestIds, ["b", "c"])
})

test("Bangkok business date does not use the UTC calendar date", () => {
  assert.equal(getBangkokBusinessDate(new Date("2026-07-13T17:30:00.000Z")), "2026-07-14")
  assert.equal(getBangkokBusinessDate(new Date("2026-07-13T01:00:00.000Z")), "2026-07-13")
})
