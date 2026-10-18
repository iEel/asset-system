import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import test from "node:test"

// V track plan 2, area D: the disposal forms show their errors under the field (spec
// docs/superpowers/specs/2026-10-17-v-track-field-errors-design.md §4, §5, §6.2, §7). One test per task, appended in order.
// The working tree is CRLF on Windows: every read strips \r before the multi-line regexes.
const read = (path: string) => readFileSync(path, "utf8").replace(/\r\n/g, "\n")

test("the execution's evidence refusals and the bulk rows a dialog field can fix name that field (v-track D1)", async () => {
  const { getDisposalEvidenceFieldErrors } = await import("../src/lib/disposal-evidence-exception.ts")
  const reasonCode = "DISPOSAL_EVIDENCE_EXCEPTION_REASON_REQUIRED"
  const ackCode = "DISPOSAL_EVIDENCE_EXCEPTION_ACK_REQUIRED"
  // The reason's code says what is wrong with it, counted on the trimmed text as the service counts it.
  assert.deepEqual(getDisposalEvidenceFieldErrors(reasonCode, { evidenceExceptionReason: "   " }), { evidenceExceptionReason: "required" })
  assert.deepEqual(getDisposalEvidenceFieldErrors(reasonCode, { evidenceExceptionReason: null }), { evidenceExceptionReason: "required" })
  assert.deepEqual(getDisposalEvidenceFieldErrors(reasonCode, { evidenceExceptionReason: " nineteen characters " }), { evidenceExceptionReason: "tooShort" })
  assert.deepEqual(getDisposalEvidenceFieldErrors(reasonCode, { evidenceExceptionReason: "x".repeat(2001) }), { evidenceExceptionReason: "tooLong" })
  assert.deepEqual(getDisposalEvidenceFieldErrors(ackCode, {}), { evidenceExceptionAcknowledged: "required" })
  // No evidence, not an admin, or an exception that does not apply: not about a field, so no fieldErrors.
  for (const code of ["DISPOSAL_EVIDENCE_REQUIRED", "DISPOSAL_EVIDENCE_EXCEPTION_FORBIDDEN", "DISPOSAL_EVIDENCE_EXCEPTION_NOT_APPLICABLE", null]) {
    assert.equal(getDisposalEvidenceFieldErrors(code, { evidenceExceptionReason: "" }), undefined, String(code))
  }

  // The single execution: the service's evidence refusal keeps its code and adds the field it is about.
  const route = read("src/app/api/disposal-requests/[id]/route.ts")
  assert.match(route, /^import \{ getDisposalEvidenceFieldErrors \} from "@\/lib\/disposal-evidence-exception"$/m)
  assert.ok(route.includes("return disposalApiError(error.code, error.message, getDisposalExecutionErrorStatus(error.code), getDisposalEvidenceFieldErrors(error.code, input))"))

  // The bulk execution: a blocked row whose code a field of the dialog can fix names that field; the rows' own fields
  // (document, sale value, remark) are not in the dialog and name none.
  const { getDisposalBulkExecutionFieldErrors } = await import("../src/lib/disposal-bulk-execution.ts")
  assert.deepEqual(
    getDisposalBulkExecutionFieldErrors([
      { outcome: "eligible", code: null },
      { outcome: "blocked", code: "DISPOSAL_DOCUMENT_REQUIRED" },
      { outcome: "blocked", code: "DISPOSAL_RECIPIENT_REQUIRED" },
      { outcome: "blocked", code: reasonCode },
      { outcome: "blocked", code: ackCode },
      { outcome: "blocked", code: "DISPOSAL_RECIPIENT_REQUIRED" },
    ], { evidenceExceptionReason: "short" }),
    { sharedRecipientName: "recipientRequired", evidenceExceptionReason: "tooShort", evidenceExceptionAcknowledged: "required" },
  )
  assert.equal(getDisposalBulkExecutionFieldErrors([
    { outcome: "blocked", code: "DISPOSAL_DOCUMENT_REQUIRED" },
    { outcome: "blocked", code: "DISPOSAL_SALE_VALUE_REQUIRED" },
    { outcome: "blocked", code: "DISPOSAL_EXECUTION_REMARK_REQUIRED" },
    { outcome: "failed", code: "DISPOSAL_BULK_EXECUTION_FAILED" },
    { outcome: "executed", code: null },
  ], {}), undefined)
  const service = read("src/lib/disposal-bulk-execution-service.ts")
  assert.ok(service.includes('return buildResponse("preview", inspection.items.map(({ item }) => item), command.input)'))
  assert.ok(service.includes('return buildResponse("commit", items, command.input)'))
  assert.match(service, /const fieldErrors = getDisposalBulkExecutionFieldErrors\(items, input\)\n[\s\S]*?\.\.\.\(fieldErrors \? \{ fieldErrors \} : \{\}\),\n/)
  assert.match(read("src/lib/disposal-bulk-execution.ts"), /^ {2}fieldErrors\?: FieldErrors$/m)
})
