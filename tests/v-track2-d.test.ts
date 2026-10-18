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

// The form helpers (plan 1's area M, tests/v-track-m.test.ts M1; copied, because no test imports a test file).
const C = "src/components/"
const escape = (text: string) => text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")

// The body of the module-level `function validate(`, up to the first line that is only "}".
function validateBody(source: string) {
  const start = source.search(/^function validate\(/m)
  assert.notEqual(start, -1, "a module-level function validate(")
  const end = source.indexOf("\n}\n", start)
  return source.slice(start, end)
}

// The shape every migrated form shares (plan 1 M-R1 to M-R4): noValidate straight after onSubmit, the FIELD_IDS table in
// visual order, validate() with one check per rule, the hook, focus on the first wrong field for the client's errors
// and the server's, each listed key's message under its field, and no validation toast.
function assertMigratedForm(
  source: string,
  form: { ids: Record<string, string>; handler?: string; messages?: readonly string[]; table?: string; hook?: string; server?: false; toasts?: number },
) {
  const handler = form.handler ?? "handleSubmit"
  const table = form.table ?? "FIELD_IDS"
  const hook = form.hook ?? "fieldErrors"
  // The bulk dialogs' forms carry a data attribute before onSubmit, as the V2 guard allows.
  assert.match(source, new RegExp(`<form\\b[^>]*?\\bonSubmit=\\{${handler}\\} noValidate[ >\\n]`), "noValidate directly after onSubmit")
  assert.match(source, /import \{ useFieldErrors(?:, useValidationMessage)? \} from "@\/components\/ui\/use-field-errors"/)
  const block = source.match(new RegExp(`const ${table} = \\{\\n([\\s\\S]*?)\\n\\} as const`))
  assert.ok(block, `const ${table} = { … } as const`)
  const rows = Object.entries(form.ids).map(([key, id]) => `  ${key}: "${id}",`)
  assert.deepEqual(block[1].split("\n"), rows, `${table}: the fields in visual order with their ids`)
  // Each id once: id="…", or a quoted literal inside id={…} (the first checkbox of a group).
  for (const id of Object.values(form.ids)) {
    const uses = source.match(new RegExp(`\\bid=(?:"${escape(id)}"|\\{[^}\\n]*"${escape(id)}"[^}\\n]*\\})`, "g"))
    assert.equal(uses?.length, 1, `id "${id}" once`)
  }
  for (const key of form.messages ?? Object.keys(form.ids)) {
    assert.match(source, new RegExp(`error=\\{${hook}\\.message\\("${escape(key)}"\\)\\}`), `${key}: its error under the field`)
  }
  assert.match(source, new RegExp(`${hook}\\.setErrors\\(validate\\(`), "the client's errors come from validate()")
  if (form.server !== false) {
    assert.match(source, new RegExp(`if \\(${hook}\\.applyServer\\((?:result|payload|body|refusal)\\) && `), "the server's fieldErrors land on the same fields")
  }
  assert.match(source, new RegExp(`${hook}\\.focusFirst\\(`), "focus goes to the first wrong field")
  // Only a toast that is not about a field may stay outside a catch (NON_VALIDATION_TOASTS, v-track D-R5).
  assert.equal(source.match(/\btoast\.(?:error|warning)\(/g)?.length ?? 0, form.toasts ?? 0, "no validation toast (the catch keeps apiError.toast)")
}

test("disposal request: the asset, the requester and the reason are checked on save, and errors show under the field (v-track D2)", () => {
  const source = read(`${C}disposal/disposal-request-form.tsx`)
  assertMigratedForm(source, {
    ids: {
      assetId: "disposal-request-asset",
      disposalType: "disposal-request-type",
      requestedById: "disposal-request-requested-by",
      saleValue: "disposal-request-sale-value",
      salvageValue: "disposal-request-salvage-value",
      reason: "disposal-request-reason",
    },
    messages: ["assetId", "disposalType", "requestedById"],
    toasts: 1,
  })
  const rules = validateBody(source)
  for (const rule of [
    'check("assetId", required(values.assetId))',
    'check("disposalType", required(values.disposalType))',
    'check("requestedById", required(values.requestedById))',
    'check("saleValue", range(values.saleValue, 0))',
    'check("salvageValue", range(values.salvageValue, 0))',
    // The server's own 12-character rule; its code is the message's catalog key (disposalReasonTooShort).
    "const reasonTooShort = getDisposalRequestReasonError(values.reason)",
    'check("reason", required(values.reason) ?? (reasonTooShort && getApiErrorKey(reasonTooShort)) ?? maxLength(values.reason, 4000))',
  ]) assert.ok(rules.includes(rule), rule)
  // A hidden estimated value is neither checked nor focused (D-R4), and a type change clears them with itself.
  assert.ok(rules.includes("if (code && shown.includes(key)) errors[key] = code"))
  assert.match(source, /if \(key === "saleValue"\) return showsEstimatedSaleValue\(type\)\n\s+if \(key === "salvageValue"\) return showsEstimatedSalvageValue\(type\)\n/)
  assert.ok(source.includes("const focusFirstError = () => fieldErrors.focusFirst(shownFields(values), { idFor: (key) => FIELD_IDS[key] })"))
  assert.match(source, /if \(field === "disposalType"\) fieldErrors\.clear\("disposalType", "saleValue", "salvageValue"\)\n\s+else if \(field in FIELD_IDS\) fieldErrors\.clear\(field as DisposalRequestField\)/)
  // The two stars nothing checked (spec §5 bug): the picker and the requester show their errors and take focus.
  assert.match(source, /<DisposalAssetPicker\n\s+id="disposal-request-asset"\n/)
  assert.ok(source.includes('error={fieldErrors.message("assetId")}'))
  assert.match(source, /<SearchableSelect\n\s+id="disposal-request-requested-by"\n\s+label=\{t\("requestedBy"\)\}/)
  // The money fields and the reason say their limits.
  for (const key of ["saleValue", "salvageValue"]) {
    assert.ok(source.includes(`error={fieldErrors.errors.${key} ? validationMessage(fieldErrors.errors.${key}, { min: 0 }) : undefined}`), key)
  }
  assert.ok(source.includes("error={fieldErrors.errors.reason ? validationMessage(fieldErrors.errors.reason, { min: 12, max: 4000 }) : undefined}"))
  // A requester change clears its error, and the approver it may reset is not a field with a rule.
  assert.match(source, /approverId: current\.approverId === value \? "" : current\.approverId,\n\s+\}\)\)\n\s+fieldErrors\.clear\("requestedById"\)/)
  // The upload result after a saved request stays a toast: it is not about a field (NON_VALIDATION_TOASTS).
  assert.match(source, /toast\.warning\(t\("createSuccessWithUploadErrors"/)

  const picker = read(`${C}disposal/disposal-asset-picker.tsx`)
  assert.match(picker, /const inputId = id \?\? generatedId\n/)
  assert.match(picker, /aria-describedby=\{errorId\} aria-invalid=\{error \? true : undefined\}/)
  assert.ok(picker.includes('{error ? <FieldError id={errorId} className="mt-1.5">{error}</FieldError> : null}'))
})
