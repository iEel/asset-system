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

test("disposal batch: the edit step is a form whose requester and reason are errors on review, and the asset count says why review waits (v-track D3)", () => {
  const source = read(`${C}disposal/disposal-batch-form.tsx`)
  assertMigratedForm(source, {
    handler: "handleReview",
    ids: {
      requestedById: "disposal-batch-requested-by",
      saleValue: "disposal-batch-sale-value",
      salvageValue: "disposal-batch-salvage-value",
      reason: "disposal-batch-reason",
    },
    messages: ["requestedById"],
    toasts: 1,
  })
  const rules = validateBody(source)
  for (const rule of [
    'check("requestedById", required(values.requestedById))',
    'check("saleValue", range(values.saleValue, 0))',
    'check("salvageValue", range(values.salvageValue, 0))',
    "const reasonTooShort = getDisposalRequestReasonError(values.reason)",
    'check("reason", required(values.reason) ?? (reasonTooShort && getApiErrorKey(reasonTooShort)) ?? maxLength(values.reason, 4000))',
  ]) assert.ok(rules.includes(rule), rule)
  // The old gate mixed a prerequisite with content rules (spec §4.4): the reason and the requester are now errors on
  // review, and only the asset count still holds the button, focusable and tied to the visible reason beside it.
  assert.doesNotMatch(source, /const valid = /)
  assert.doesNotMatch(source, /(?<![\w-])disabled=\{!valid\}/)
  assert.match(source, /const needsAssets = selectedIds\.length < 2 \|\| selectedIds\.length > 100\n/)
  assert.match(source, /event\.preventDefault\(\)\n\s+if \(needsAssets\) return\n\s+fieldErrors\.setErrors\(validate\(values\)\)\n\s+if \(focusFirstError\(\)\) return\n\s+setReviewing\(true\)/)
  assert.match(source, /<Button\n\s+type="submit"\n\s+aria-disabled=\{needsAssets \|\| undefined\}\n\s+aria-describedby=\{needsAssets \? "disposal-batch-review-reason" : undefined\}\n\s+className="w-full"\n\s+>/)
  assert.ok(source.includes('{needsAssets ? <p id="disposal-batch-review-reason" className="text-meta text-muted-foreground">{t("batchNeedsAssets")}</p> : null}'))
  // A refusal on the review step goes back to the edit step that owns the field (spec §4.2): reveal leaves the review.
  assert.ok(source.includes("const focusFirstError = () => fieldErrors.focusFirst(shownFields(values), { idFor: (key) => FIELD_IDS[key], reveal: () => setReviewing(false) })"))
  // A hidden estimated value is neither checked nor focused (D-R4), and a type change clears them.
  assert.ok(rules.includes("if (code && shown.includes(key)) errors[key] = code"))
  assert.match(source, /if \(field === "disposalType"\) fieldErrors\.clear\("saleValue", "salvageValue"\)\n\s+else if \(field in FIELD_IDS\) fieldErrors\.clear\(field as DisposalBatchField\)/)
  assert.ok(source.includes('<NativeSelect value={values.disposalType} onChange={(event) => setField("disposalType", event.target.value)}>'))
  assert.doesNotMatch(source, /if \(!valid\) return/)
  assert.match(source, /onChange=\{\(value\) => \{\n\s+setValues\(\(current\) => \(\{ \.\.\.current, requestedById: value, approverId: current\.approverId === value \? "" : current\.approverId \}\)\)\n\s+fieldErrors\.clear\("requestedById"\)\n/)
  for (const locale of ["th", "en"] as const) {
    assert.equal(typeof JSON.parse(readFileSync(`messages/${locale}.json`, "utf8")).disposalPage.batchNeedsAssets, "string", locale)
  }
})

test("disposal decision: a rejection's reason is an error on save through the server's own rule, and a refusal lands under its field in the open dialog (v-track D4)", () => {
  const source = read(`${C}disposal/disposal-decision-button.tsx`)
  assertMigratedForm(source, {
    handler: "onSubmit",
    ids: {
      decision: "disposal-decision-decision",
      nextStatusId: "disposal-decision-next-status",
      saleValue: "disposal-decision-sale-value",
      salvageValue: "disposal-decision-salvage-value",
      approvalRemark: "disposal-decision-remark",
    },
    messages: ["decision", "nextStatusId", "approvalRemark"],
  })
  assert.match(source, /^function validate\(values: DecisionValues, disposalType: DisposalType\): Partial<Record<DecisionField, string>> \{$/m)
  const rules = validateBody(source)
  for (const rule of [
    "if (code && shown.includes(key)) errors[key] = code",
    'check("decision", required(values.decision))',
    'check("nextStatusId", required(values.nextStatusId))',
    'check("saleValue", range(values.saleValue, 0))',
    'check("salvageValue", range(values.salvageValue, 0))',
    'check("approvalRemark", maxLength(values.approvalRemark, 4000))',
    // The server's own rule (spec §7.2): its message's catalog key is the code, rejectionReasonRequired.
    "for (const error of getDisposalDecisionFieldErrors(values)) check(error.field, getApiErrorKey(error.message))",
  ]) assert.ok(rules.includes(rule), rule)
  // A content rule, not a gate (spec §4.4): save is enabled while the reason is empty.
  assert.doesNotMatch(source, /(?<![\w-])disabled=\{rejectionReasonRequired/)
  assert.match(source, /<Button type="submit" busy=\{saving\}>\n\s+<CheckCircle2 aria-hidden="true" \/>/)
  // Only the fields the dialog shows are checked and focused, so a refusal about a hidden one keeps the toast (D-R4).
  assert.match(source, /if \(key === "nextStatusId"\) return values\.decision === "approve"\n\s+if \(key === "saleValue"\) return showsEstimatedSaleValue\(disposalType\)\n\s+if \(key === "salvageValue"\) return showsEstimatedSalvageValue\(disposalType\)\n/)
  assert.ok(source.includes("const focusFirstError = () => fieldErrors.focusFirst(shownFields(values, disposalType as DisposalType), { idFor: (key) => FIELD_IDS[key] })"))
  // The hook lives with the submit; the dialog shows its errors and closing it clears them.
  assert.ok(source.includes("type DecisionFieldErrors = ReturnType<typeof useFieldErrors<DecisionField>>"))
  assert.match(source, /function closeDialog\(\) \{\n\s+fieldErrors\.setErrors\(\{\}\)\n\s+setOpen\(false\)\n\s+\}/)
  assert.match(source, /fieldErrors=\{fieldErrors\}\n\s+onClose=\{closeDialog\}/)
  assert.match(source, /if \(field === "decision"\) fieldErrors\.clear\("decision", "nextStatusId", "approvalRemark"\)\n\s+else fieldErrors\.clear\(field\)/)
  for (const key of ["saleValue", "salvageValue"]) {
    assert.ok(source.includes(`error={fieldErrors.errors.${key} ? validationMessage(fieldErrors.errors.${key}, { min: 0 }) : undefined}`), key)
  }
})

test("disposal execution: the executor, the type's own rules and the historical exception are errors on save, and missing evidence says why save waits (v-track D5)", () => {
  const source = read(`${C}disposal/disposal-execution-button.tsx`)
  assertMigratedForm(source, {
    handler: "onSubmit",
    ids: {
      executionDate: "disposal-execution-date",
      executedById: "disposal-execution-executed-by",
      nextStatusId: "disposal-execution-next-status",
      recipientName: "disposal-execution-recipient",
      documentNo: "disposal-execution-document-no",
      actualSaleValue: "disposal-execution-sale-value",
      actualSalvageValue: "disposal-execution-salvage-value",
      executionRemark: "disposal-execution-remark",
      evidenceExceptionReason: "disposal-execution-exception-reason",
      evidenceExceptionAcknowledged: "disposal-execution-exception-acknowledged",
    },
    messages: ["executionDate", "executedById", "nextStatusId", "recipientName", "documentNo", "executionRemark"],
  })
  const rules = validateBody(source)
  for (const rule of [
    "if (code && shown.includes(key)) errors[key] = code",
    'check("executionDate", required(values.executionDate))',
    'check("executedById", required(values.executedById))',
    'check("nextStatusId", required(values.nextStatusId))',
    'check("recipientName", maxLength(values.recipientName, 200))',
    'check("documentNo", maxLength(values.documentNo, 100))',
    'check("actualSaleValue", range(values.actualSaleValue, 0))',
    'check("actualSalvageValue", range(values.actualSalvageValue, 0))',
    'check("executionRemark", maxLength(values.executionRemark, 4000))',
    // The server's own rules for the type (spec §7.2): recipient, document, sale value and remark, by catalog key.
    "for (const error of getDisposalExecutionFieldErrors(policyInput)) check(error.field, getApiErrorKey(error.message))",
    // The historical exception (spec §4.4): content rules, no longer a disabled save.
    'check("evidenceExceptionReason", required(values.evidenceExceptionReason) ?? minLength(values.evidenceExceptionReason, 20) ?? maxLength(values.evidenceExceptionReason, 2000))',
    'check("evidenceExceptionAcknowledged", required(values.evidenceExceptionAcknowledged))',
  ]) assert.ok(rules.includes(rule), rule)
  assert.doesNotMatch(source, /historicalInputInvalid|submitDisabled/)
  // The prerequisite (no evidence and no exception) keeps its gate, focusable and tied to the dialog's evidence Notice.
  assert.match(source, /const evidenceBlocked = effectiveEvidenceCount === 0 && !values\.useHistoricalEvidenceException\n/)
  assert.match(source, /event\.preventDefault\(\)\n\s+if \(evidenceBlocked\) return\n\s+fieldErrors\.setErrors\(validate\(values, disposalType as DisposalType\)\)/)
  assert.match(source, /<Button\n\s+type="submit"\n\s+busy=\{saving\}\n\s+aria-disabled=\{evidenceBlocked \|\| undefined\}\n\s+aria-describedby=\{evidenceBlocked \? "disposal-execution-evidence-reason" : undefined\}\n\s+>/)
  assert.ok(source.includes('<Notice tone="warning" role="alert" id="disposal-execution-evidence-reason" className="md:col-span-2">'))
  // The executor star is checked now (spec §5), and the exception's two fields say the rule in the domain's words.
  assert.match(source, /<SearchableSelect\n\s+id="disposal-execution-executed-by"\n/)
  assert.ok(source.includes('error={fieldErrors.errors.evidenceExceptionReason ? t("errors.DISPOSAL_EVIDENCE_EXCEPTION_REASON_REQUIRED") : undefined}'))
  assert.ok(source.includes('<FieldError id="disposal-execution-exception-acknowledged-error" className="mt-1.5">{t("errors.DISPOSAL_EVIDENCE_EXCEPTION_ACK_REQUIRED")}</FieldError>'))
  assert.match(source, /aria-describedby=\{fieldErrors\.errors\.evidenceExceptionAcknowledged \? "disposal-execution-exception-acknowledged-error" : undefined\}/)
  // A field refusal stays in the open dialog before the evidence refusals that are about no field close it (D1, D-R1).
  assert.match(source, /if \(fieldErrors\.applyServer\(payload\) && focusFirstError\(\)\) return\n\s+const message = getDisposalApiErrorMessage\(payload, t, tCommon\("error"\)\)\n\s+if \(payload\?\.code && evidencePolicyErrorCodes\.has\(payload\.code\)\) \{\n\s+closeExecutionDialog\(\)/)
  assert.match(source, /function closeExecutionDialog\(\) \{\n\s+resetHistoricalEvidenceException\(\)\n\s+fieldErrors\.setErrors\(\{\}\)\n\s+setOpen\(false\)\n\s+\}/)
  assert.match(source, /if \(field === "useHistoricalEvidenceException"\) fieldErrors\.clear\("documentNo", "evidenceExceptionReason", "evidenceExceptionAcknowledged"\)\n\s+else if \(field in FIELD_IDS\) fieldErrors\.clear\(field as ExecutionField\)/)
  assert.match(source, /if \(key === "evidenceExceptionReason" \|\| key === "evidenceExceptionAcknowledged"\) return values\.useHistoricalEvidenceException\n/)
})

test("disposal bulk approval: the shared remark shows its error under the field, and nothing eligible says why approve waits (v-track D6)", () => {
  const source = read(`${C}disposal/disposal-bulk-approval.tsx`)
  assertMigratedForm(source, { ids: { approvalRemark: "disposal-bulk-approval-remark" } })
  assert.ok(validateBody(source).includes('check("approvalRemark", maxLength(values.approvalRemark, 4000))'))
  assert.match(source, /<form data-disposal-bulk-dialog="true" onSubmit=\{handleSubmit\} noValidate className=\{accessibleDialogFormClasses\}>/)
  // The prerequisite keeps its gate, focusable and tied to the zero-eligible Notice (spec §4.4).
  assert.match(source, /const nothingEligible = eligible\.length === 0\n/)
  assert.match(source, /event\.preventDefault\(\)\n\s+if \(dialogState !== "preview" \|\| nothingEligible\) return\n\s+fieldErrors\.setErrors\(validate\(\{ approvalRemark \}\)\)/)
  assert.ok(source.includes('<Notice tone="warning" role="alert" id="disposal-bulk-approval-zero-eligible">{copy.zeroEligible}</Notice>'))
  assert.match(source, /aria-disabled=\{nothingEligible \|\| undefined\}\n\s+aria-describedby=\{nothingEligible \? "disposal-bulk-approval-zero-eligible" : undefined\}/)
  // The commit hands a refusal of the remark back to the dialog (plan 1 M-R9's pattern); every other refusal keeps the
  // dialog's danger Notice.
  assert.match(source, /commit: \(\) => Promise<unknown>/)
  assert.ok(source.includes("throw new Error(mode === \"preview\" ? copy.requestFailed : copy.approvalFailed, { cause: payload })"))
  assert.match(source, /if \(caught instanceof Error && readFieldErrors\(caught\.cause\)\?\.approvalRemark\) \{\n\s+setDialogState\("preview"\)\n\s+return caught\.cause\n\s+\}\n\s+setError\(/)
  assert.match(source, /const refusal = await commit\(\)\n\s+if \(fieldErrors\.applyServer\(refusal\) && focusFirstError\(\)\) return/)
  assert.match(source, /setApprovalRemark\(event\.target\.value\)\n\s+fieldErrors\.clear\("approvalRemark"\)/)
})

test("disposal bulk execution: the shared values, the exception and the confirmation are errors on submit, a field refusal goes back to the review step, and nothing eligible says why (v-track D7)", () => {
  const source = read(`${C}disposal/disposal-bulk-execution.tsx`)
  assertMigratedForm(source, {
    ids: {
      executionDate: "disposal-bulk-execution-date",
      executedById: "disposal-bulk-execution-executor",
      nextStatusId: "disposal-bulk-execution-status",
      sharedRecipientName: "disposal-bulk-execution-recipient",
      evidenceExceptionReason: "disposal-bulk-execution-exception-reason",
      evidenceExceptionAcknowledged: "disposal-bulk-execution-exception-acknowledged",
      permanentConfirmed: "disposal-bulk-execution-permanent",
    },
    messages: ["executionDate", "executedById", "nextStatusId", "sharedRecipientName"],
  })
  const rules = validateBody(source)
  for (const rule of [
    "if (code && shown.includes(key)) errors[key] = code",
    'check("executionDate", required(values.executionDate))',
    'check("executedById", required(values.executedById))',
    'check("nextStatusId", required(values.nextStatusId))',
    'check("sharedRecipientName", maxLength(values.sharedRecipientName, 200))',
    'check("evidenceExceptionReason", required(values.evidenceExceptionReason) ?? minLength(values.evidenceExceptionReason, 20) ?? maxLength(values.evidenceExceptionReason, 2000))',
    'check("evidenceExceptionAcknowledged", required(values.evidenceExceptionAcknowledged))',
    'check("permanentConfirmed", required(values.permanentConfirmed))',
  ]) assert.ok(rules.includes(rule), rule)
  // The old gates and silent returns go (spec §4.4): the review button is enabled and preview no longer checks for itself.
  assert.doesNotMatch(source, /hasSharedValues|validateHistoricalException/)
  assert.doesNotMatch(source, /if \(!values\.executionDate \|\| !values\.executedById \|\| !values\.nextStatusId\) return/)
  // Each step checks its own fields (spec §4.2), and a refusal or an all-blocked preview comes back to the review step.
  assert.match(source, /if \(dialogState === "review"\) \{\n\s+fieldErrors\.setErrors\(validate\(values, fieldsOf\("review"\)\)\)\n\s+if \(focusFirstError\("review"\)\) return\n\s+const refusal = await preview\(\)\n[^\n]*\n\s+if \(fieldErrors\.applyServer\(refusal\) && focusFirstError\("review"\)\) return\n\s+\} else if \(dialogState === "preview"\) \{\n\s+if \(nothingEligible\) return\n\s+fieldErrors\.setErrors\(validate\(values, fieldsOf\("preview"\)\)\)/)
  assert.match(source, /if \(!previousPayload && result\.eligibleCount === 0 && result\.fieldErrors\) \{\n\s+setDialogState\("review"\)\n\s+return result\n\s+\}/)
  assert.match(source, /if \(!previousPayload && named && FIELD_ORDER\.some\(\(key\) => key in named\)\) return \{ fieldErrors: named \}/)
  assert.ok(source.includes("throw new Error(typeof code === \"string\" ? copy.errors[code] ?? fallback : fallback, { cause: body })"))
  assert.match(source, /preview: \(requestIds\?: string\[\], previousPayload\?: BulkExecutionPreviewPayload\) => Promise<unknown>/)
  // The prerequisite keeps its gate, focusable and tied to the zero-eligible Notice.
  assert.ok(source.includes('<Notice tone="warning" role="alert" id="disposal-bulk-execution-zero-eligible">{copy.zeroEligible}</Notice>'))
  // The exception's two fields and the confirmation say the rule in the domain's words, tied to their checkbox.
  assert.ok(source.includes("error={fieldErrors.errors.evidenceExceptionReason ? copy.errors.DISPOSAL_EVIDENCE_EXCEPTION_REASON_REQUIRED : undefined}"))
  assert.ok(source.includes('<FieldError id="disposal-bulk-execution-exception-acknowledged-error" className="mt-1.5">{copy.errors.DISPOSAL_EVIDENCE_EXCEPTION_ACK_REQUIRED}</FieldError>'))
  assert.ok(source.includes('<FieldError id="disposal-bulk-execution-permanent-error" className="mt-1.5">{copy.permanentConfirmationRequired}</FieldError>'))
  assert.match(source, /permanentConfirmationRequired: string\n/)
  const page = read("src/app/[locale]/(dashboard)/disposal/page.tsx")
  assert.ok(page.includes('permanentConfirmationRequired: t("bulkExecutionPermanentConfirmationRequired"), '))
  for (const locale of ["th", "en"] as const) {
    assert.equal(typeof JSON.parse(readFileSync(`messages/${locale}.json`, "utf8")).disposalPage.bulkExecutionPermanentConfirmationRequired, "string", locale)
  }
})
