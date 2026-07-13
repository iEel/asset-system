import assert from "node:assert/strict"
import test from "node:test"

import {
  getDisposalBulkSelectionBlockCode,
  normalizeDisposalBulkExecutionIds,
  summarizeDisposalBulkExecution,
  type DisposalBulkExecutionItem,
} from "../src/lib/disposal-bulk-execution.ts"
import { getDisposalApiErrorMessage } from "../src/lib/disposal-error-message.ts"
import { disposalBulkExecutionSchema } from "../src/lib/validations/disposal.ts"

const validInput = {
  mode: "preview" as const,
  requestIds: ["r1"],
  executionDate: "2026-07-13",
  executedById: "employee-executor",
  nextStatusId: "status-disposed",
}

test("normalizes bulk execution IDs by trimming and preserving first occurrence order", () => {
  assert.deepEqual(normalizeDisposalBulkExecutionIds(["r1", "r1", " r2 "]), ["r1", "r2"])
})

test("requires between one and twenty bulk execution IDs", () => {
  assert.throws(() => disposalBulkExecutionSchema.parse({ ...validInput, requestIds: [] }))
  assert.throws(() => disposalBulkExecutionSchema.parse({
    ...validInput,
    requestIds: Array.from({ length: 21 }, (_, index) => `r${index}`),
  }))
})

test("accepts shared execution values and defaults historical exception fields", () => {
  const parsed = disposalBulkExecutionSchema.parse({
    ...validInput,
    requestIds: [" r1 "],
    evidenceExceptionReason: "",
  })

  assert.deepEqual(parsed, {
    ...validInput,
    requestIds: ["r1"],
    executionDate: new Date("2026-07-13"),
    useHistoricalEvidenceException: false,
    evidenceExceptionReason: null,
    evidenceExceptionAcknowledged: false,
  })
})

test("blocks a selected request whose disposal type differs from the established type", () => {
  const sellCandidate = { disposalType: "sell" as const }
  const destroyCandidate = { disposalType: "destroy" as const }

  assert.equal(getDisposalBulkSelectionBlockCode(sellCandidate, "sell"), null)
  assert.equal(getDisposalBulkSelectionBlockCode(destroyCandidate, "sell"), "DISPOSAL_BULK_MIXED_TYPES")
})

test("localizes the stable bulk execution error codes through the shared disposal message helper", () => {
  for (const code of [
    "DISPOSAL_BULK_INVALID_SELECTION",
    "DISPOSAL_BULK_MIXED_TYPES",
    "DISPOSAL_BULK_EXECUTION_FAILED",
  ]) {
    assert.equal(getDisposalApiErrorMessage({ code, error: "server detail" }, (key) => key, "fallback"), `errors.${code}`)
  }
})

test("summarizes bulk execution outcomes without hiding blocked or failed items", () => {
  const items: DisposalBulkExecutionItem[] = [
    { requestId: "r1", disposalNo: "DP-1", assetLabel: "IT-1", disposalType: "sell", outcome: "blocked", code: "DISPOSAL_ASSET_INELIGIBLE" },
    { requestId: "r2", disposalNo: "DP-2", assetLabel: "IT-2", disposalType: "sell", outcome: "executed", code: null },
    { requestId: "r3", disposalNo: "DP-3", assetLabel: "IT-3", disposalType: "sell", outcome: "failed", code: "DISPOSAL_BULK_EXECUTION_FAILED" },
  ]

  assert.deepEqual(summarizeDisposalBulkExecution(items), {
    selected: 3,
    eligible: 0,
    blocked: 1,
    executed: 1,
    failed: 1,
  })
})
