import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import test from "node:test"

// V track plan 2, area D: the disposal forms show their errors under the field (spec
// docs/superpowers/specs/2026-10-17-v-track-field-errors-design.md §4, §5, §6.2, §7). One test per task, appended in order.
// The working tree is CRLF on Windows: every read strips \r before the multi-line regexes.
const read = (path: string) => readFileSync(path, "utf8").replace(/\r\n/g, "\n")

test("the execution's evidence refusals name their field (v-track D1)", async () => {
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

  // The single and bulk executions that sent these fields are retired (group 6 plan 4, P4-R1).
  assert.match(read("src/app/api/disposal-requests/[id]/route.ts"), /if \(action === "execute"\) return disposalApiError\("DISPOSAL_USE_ROUND", "DISPOSAL_USE_ROUND", 410\)/)
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

// Group 6 plan 3 Task 2: board DP-New. The method is a ChoiceCard group whose error reads เลือกวิธีจำหน่าย, the photo
// rule is a field (focus goes to the dropzone), and the estimated values are gone (the user, 2026-11-04: no price).
test("disposal request: the asset, the method, the requester, the reason and the photo are checked on save, and errors show under the field (v-track D2)", () => {
  const source = read(`${C}disposal/disposal-request-form.tsx`)
  assertMigratedForm(source, {
    ids: {
      assetId: "disposal-request-asset",
      disposalType: "disposal-request-type",
      requestedById: "disposal-request-requested-by",
      reason: "disposal-request-reason",
      photos: "disposal-request-photos",
    },
    messages: ["assetId", "requestedById"],
    toasts: 1,
  })
  const rules = validateBody(source)
  for (const rule of [
    'check("assetId", required(values.assetId))',
    'check("disposalType", required(values.disposalType))',
    'check("requestedById", required(values.requestedById))',
    // The server's own 12-character rule; its code is the message's catalog key (disposalReasonTooShort).
    "const reasonTooShort = getDisposalRequestReasonError(values.reason)",
    'check("reason", required(values.reason) ?? (reasonTooShort && getApiErrorKey(reasonTooShort)) ?? maxLength(values.reason, REASON_MAX))',
    'check("photos", getDisposalPhotoRequirementError(files.map((item) => item.file), values.disposalType))',
  ]) assert.ok(rules.includes(rule), rule)
  assert.doesNotMatch(source, /saleValue|salvageValue|showsEstimated/)
  assert.ok(source.includes("const focusFirstError = () => fieldErrors.focusFirst(FIELD_ORDER, { idFor: (key) => FIELD_IDS[key] })"))
  assert.ok(source.includes('error={fieldErrors.errors.disposalType ? t("methodRequired") : undefined}'))
  // The two stars nothing checked (spec §5 bug): the picker and the requester show their errors and take focus.
  assert.match(source, /<DisposalAssetPicker\n\s+id="disposal-request-asset"\n/)
  assert.ok(source.includes('error={fieldErrors.message("assetId")}'))
  assert.match(source, /<SearchableSelect\n\s+id="disposal-request-requested-by"\n\s+label=\{t\("requestedBy"\)\}/)
  // The reason says its limits.
  assert.ok(source.includes("error={fieldErrors.errors.reason ? validationMessage(fieldErrors.errors.reason, { min: REASON_MIN, max: REASON_MAX }) : undefined}"))
  // A requester change clears its error, and the approver it may reset is not a field with a rule.
  assert.match(source, /approverId: current\.approverId === value \? "" : current\.approverId,\n\s+\}\)\)\n\s+fieldErrors\.clear\("requestedById"\)/)
  // The upload result after a saved request stays a toast: it is not about a field (NON_VALIDATION_TOASTS).
  assert.match(source, /toast\.warning\(t\("createSuccessWithUploadErrors"/)

  const picker = read(`${C}disposal/disposal-asset-picker.tsx`)
  assert.match(picker, /const inputId = id \?\? generatedId\n/)
  assert.match(picker, /aria-describedby=\{errorId\} aria-invalid=\{error \? true : undefined\}/)
  assert.ok(picker.includes('{error ? <FieldError id={errorId} className="mt-1.5">{error}</FieldError> : null}'))
})

// Request batches Task 2 (DP-Batch-New): one form on the operation frame, no review step (PB-R1). The machine count is a
// field now ("เลือกอย่างน้อย 2 เครื่อง" under the search), the lot photo, the method cards, the reason and the requester are
// checked on send; a machine's own photo never is.
test("disposal batch: the machines, the lot photo, the method, the reason and the requester are checked on send, and errors show under the field (v-track D3)", () => {
  const source = read(`${C}disposal/disposal-batch-form.tsx`)
  assertMigratedForm(source, {
    ids: {
      assets: "disposal-batch-assets",
      lotFiles: "disposal-batch-lot-files",
      disposalType: "disposal-batch-type",
      reason: "disposal-batch-reason",
      requestedById: "disposal-batch-requested-by",
    },
    messages: ["requestedById"],
    toasts: 0,
  })
  const rules = validateBody(source)
  assert.ok(rules.includes("return validateDisposalBatchForm({ assetCount, lotFiles: lotFiles.map((item) => item.file), ...values })"))
  assert.match(source, /event\.preventDefault\(\)\n\s+if \(uploadFailure\) return\n\s+setLotTried\(true\)\n\s+fieldErrors\.setErrors\(validate\(values, machines\.length, lotFiles\)\)\n\s+if \(focusFirstError\(\)\) return\n\s+setSaving\(true\)/)
  assert.ok(source.includes("const focusFirstError = () => fieldErrors.focusFirst(FIELD_ORDER, { idFor: (key) => FIELD_IDS[key] })"))
  assert.ok(source.includes('error={fieldErrors.errors.assets ? t("batchMinAssets") : undefined}'))
  assert.ok(source.includes('error={fieldErrors.errors.disposalType ? t("methodRequired") : undefined}'))
  assert.ok(source.includes('<Field label={t("batchForm.lotLabel")} id="disposal-batch-lot-files" required hint={t("batchForm.lotHelp")} error={lotError}>'))
  assert.ok(source.includes('{lotRefused ? <FieldError data-disposal-photo-refused>{t("photoTypeRefused")}</FieldError> : null}'))
  assert.doesNotMatch(source, /needsAssets|batchNeedsAssets|setReviewing|saleValue|salvageValue|showsEstimated|<NativeSelect\b/)
  for (const locale of ["th", "en"] as const) {
    const messages = JSON.parse(readFileSync(`messages/${locale}.json`, "utf8")).disposalPage
    assert.equal(typeof messages.batchMinAssets, "string", locale)
    assert.equal(messages.batchNeedsAssets, undefined, locale)
  }
})

test("disposal decision: a rejection's reason is an error on save through the server's own rule, and a refusal lands under its field in the open dialog (v-track D4)", () => {
  const source = read(`${C}disposal/disposal-decision-button.tsx`)
  assertMigratedForm(source, {
    handler: "onSubmit",
    // Group 6 plan 3 Task 3: no next status and no price (the user, 2026-11-04); the decision select shows only
    // without a preset decision.
    ids: {
      decision: "disposal-decision-decision",
      approvalRemark: "disposal-decision-remark",
    },
    messages: ["decision", "approvalRemark"],
  })
  assert.match(source, /^function validate\(values: DecisionValues, preset: boolean\): Partial<Record<DecisionField, string>> \{$/m)
  const rules = validateBody(source)
  for (const rule of [
    "if (code && shown.includes(key)) errors[key] = code",
    'check("decision", required(values.decision))',
    'check("approvalRemark", maxLength(values.approvalRemark, 4000))',
    // The server's own rule (spec §7.2): its message's catalog key is the code, rejectionReasonRequired.
    "for (const error of getDisposalDecisionFieldErrors(values)) check(error.field, getApiErrorKey(error.message))",
  ]) assert.ok(rules.includes(rule), rule)
  // A content rule, not a gate (spec §4.4): save is enabled while the reason is empty.
  assert.doesNotMatch(source, /(?<![\w-])disabled=\{rejectionReasonRequired/)
  assert.match(source, /<Button type="submit" busy=\{saving\}>\n\s+<CheckCircle2 aria-hidden="true" \/>/)
  // Only the fields the dialog shows are checked and focused, so a refusal about a hidden one keeps the toast (D-R4).
  assert.match(source, /return FIELD_ORDER\.filter\(\(key\) => \(key === "decision" \? !preset : true\)\)/)
  assert.ok(source.includes("const focusFirstError = () => fieldErrors.focusFirst(shownFields(preset), { idFor: (key) => FIELD_IDS[key] })"))
  // The hook lives with the submit; the dialog shows its errors and closing it clears them.
  assert.ok(source.includes("type DecisionFieldErrors = ReturnType<typeof useFieldErrors<DecisionField>>"))
  assert.match(source, /function closeDialog\(\) \{\n\s+fieldErrors\.setErrors\(\{\}\)\n\s+setOpen\(false\)\n\s+\}/)
  assert.match(source, /fieldErrors=\{fieldErrors\}\n\s+onClose=\{closeDialog\}/)
  assert.match(source, /if \(field === "decision"\) fieldErrors\.clear\("decision", "approvalRemark"\)\n\s+else fieldErrors\.clear\(field\)/)
  assert.doesNotMatch(source, /saleValue|salvageValue|nextStatusId/)
})
