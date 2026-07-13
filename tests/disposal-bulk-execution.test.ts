import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
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

test("enforces the bulk execution limit after normalizing to unique IDs", () => {
  assert.throws(() => disposalBulkExecutionSchema.parse({ ...validInput, requestIds: [] }))
  assert.deepEqual(
    disposalBulkExecutionSchema.parse({ ...validInput, requestIds: Array.from({ length: 21 }, () => " r1 ") }).requestIds,
    ["r1"],
  )
  assert.throws(() => disposalBulkExecutionSchema.parse({
    ...validInput,
    requestIds: Array.from({ length: 21 }, (_, index) => `r${index}`),
  }))
})

test("rejects a bulk execution selection containing only blank IDs", () => {
  assert.throws(() => disposalBulkExecutionSchema.parse({ ...validInput, requestIds: [" ", "   "] }))
})

test("rejects a blank ID mixed into an otherwise valid bulk execution selection", () => {
  assert.throws(() => disposalBulkExecutionSchema.parse({ ...validInput, requestIds: ["r1", " "] }))
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

test("localizes stable bulk execution error codes from both locale files", () => {
  const codes = [
    "DISPOSAL_BULK_INVALID_SELECTION",
    "DISPOSAL_BULK_MIXED_TYPES",
    "DISPOSAL_BULK_EXECUTION_FAILED",
  ] as const

  for (const locale of ["en", "th"] as const) {
    const errors = JSON.parse(readFileSync(`messages/${locale}.json`, "utf8")).disposalPage.errors as Record<string, string>

    for (const code of codes) {
      assert.equal(typeof errors[code], "string", `${locale}:${code}`)
      assert.notEqual(errors[code], code, `${locale}:${code}`)
      assert.equal(
        getDisposalApiErrorMessage(
          { code, error: "server detail" },
          (key) => errors[key.replace("errors.", "")],
          "fallback",
        ),
        errors[code],
      )
    }
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
