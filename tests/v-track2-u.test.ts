import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import test from "node:test"

// V track plan 2, area U: the audit forms show their errors under the field (spec
// docs/superpowers/specs/2026-10-17-v-track-field-errors-design.md §4, §5 #14–#22, §7). One test per task, appended in order.
// The working tree is CRLF on Windows: every read strips \r before the multi-line regexes.
const C = "src/components/audit/"
const read = (path: string) => readFileSync(path, "utf8").replace(/\r\n/g, "\n")
const escape = (text: string) => text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")

// The body of the module-level `function validate(`, up to the first line that is only "}".
function validateBody(source: string) {
  const start = source.search(/^function validate\(/m)
  assert.notEqual(start, -1, "a module-level function validate(")
  const end = source.indexOf("\n}\n", start)
  return source.slice(start, end)
}

// The shape every migrated audit form shares (plan 1's M-R1 to M-R4): noValidate straight after onSubmit (unless the
// submit has no <form>), the table of ids in visual order, validate() feeding the hook, focus on the first wrong field,
// each listed key's message under its field, the server's fieldErrors on the same fields (unless the request is sent by
// a parent, U-R5), and no toast for a validation error.
function assertMigratedForm(
  source: string,
  form: { ids: Record<string, string>; handler?: string; messages?: readonly string[]; table?: string; hook?: string; server?: false; formless?: true },
) {
  const handler = form.handler ?? "handleSubmit"
  const table = form.table ?? "FIELD_IDS"
  const hook = form.hook ?? "fieldErrors"
  if (!form.formless) {
    assert.match(source, new RegExp(`<form onSubmit=\\{${handler}\\} noValidate[ >\\n]`), "noValidate directly after onSubmit")
  }
  assert.match(source, /import \{ useFieldErrors(?:, useValidationMessage)? \} from "@\/components\/ui\/use-field-errors"/)
  const block = source.match(new RegExp(`const ${table} = \\{\\n([\\s\\S]*?)\\n\\} as const`))
  assert.ok(block, `const ${table} = { … } as const`)
  const rows = Object.entries(form.ids).map(([key, id]) => `  ${key}: "${id}",`)
  assert.deepEqual(block[1].split("\n"), rows, `${table}: the fields in visual order with their ids`)
  // Each id once: id="…", or the table's own entry inside id={…}.
  for (const [key, id] of Object.entries(form.ids)) {
    const uses = source.match(new RegExp(`\\bid=(?:"${escape(id)}"|\\{${table}\\.${key}\\})`, "g"))
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
  assert.doesNotMatch(source, /\btoast\.(?:error|warning)\(/, "no validation toast (the catch keeps apiError.toast)")
}

test("audit round: the date pair limits its pickers, validate() restates every rule, and save and preview show the server's refusal under the field (v-track U1)", () => {
  const source = read(`${C}audit-round-form.tsx`)
  assertMigratedForm(source, {
    ids: {
      name: "audit-round-name",
      auditYear: "audit-round-year",
      startDate: "audit-round-start-date",
      endDate: "audit-round-end-date",
      status: "audit-round-status",
      riskPreset: "audit-round-risk-preset",
      sampleRate: "audit-round-sample-rate",
    },
    messages: ["name", "startDate", "endDate", "status", "riskPreset"],
  })
  assert.match(source, /^function validate\(\n\s+values: \{ name: string; auditYear: string; startDate: string; endDate: string; status: string; sampleRate: string \},\n\s+yearRange: \{ min: number; max: number \},\n\): Partial<Record<AuditRoundField, string>> \{$/m)
  const rules = validateBody(source)
  for (const rule of [
    'check("name", required(values.name) ?? maxLength(values.name, 200))',
    'check("auditYear", required(values.auditYear) ?? range(values.auditYear, yearRange.min, yearRange.max) ?? wholeNumber(values.auditYear))',
    'check("startDate", required(values.startDate))',
    'check("endDate", required(values.endDate) ?? notBefore(values.endDate, values.startDate))',
    'check("status", required(values.status))',
    'check("sampleRate", required(values.sampleRate) ?? range(values.sampleRate, 1, 100) ?? wholeNumber(values.sampleRate))',
  ]) assert.ok(rules.includes(rule), rule)
  // The number fields' step of 1, which the browser checked before noValidate (U-R3).
  assert.match(source, /function wholeNumber\(value: string\) \{\n\s+return Number\.isInteger\(Number\(value\.trim\(\)\)\) \? null : "invalidNumber"\n\}/)
  assert.match(source, /fieldErrors\.setErrors\(validate\(values, yearRange\)\)/)
  // The date pair (spec §7.4): each picker is limited by the other date, and changing either clears both errors.
  assert.match(source, /onChange=\{\(event\) => setField\("startDate", event\.target\.value\)\} required max=\{values\.endDate\} \/>/)
  assert.match(source, /onChange=\{\(event\) => setField\("endDate", event\.target\.value\)\} required min=\{values\.startDate\} \/>/)
  assert.match(source, /if \(field === "startDate" \|\| field === "endDate"\) fieldErrors\.clear\("startDate", "endDate"\)\n\s+else if \(field in FIELD_IDS\) fieldErrors\.clear\(field as AuditRoundField\)/)
  // The year and the sample rate say their limits (the year in the reader's calendar).
  assert.ok(source.includes("error={fieldErrors.errors.auditYear ? validationMessage(fieldErrors.errors.auditYear, yearRange) : undefined}"))
  assert.ok(source.includes("error={fieldErrors.errors.sampleRate ? validationMessage(fieldErrors.errors.sampleRate, { min: 1, max: 100 }) : undefined}"))
  // The status and risk selects pass their id and error through the form's Select (U-R4).
  assert.match(source, /<Field label=\{label\} id=\{id\} required=\{required\} error=\{error\}>\n\s+<NativeSelect value=\{value\} required=\{required\}/)
  // Save and preview both put the server's fieldErrors under the fields (the server's endBeforeStart lands on endDate).
  assert.equal(source.match(/if \(fieldErrors\.applyServer\(payload\) && focusFirstError\(\)\) return/g)?.length, 2)
  // The save still waits while the preview runs (that is the busy state of another action, not a gate).
  assert.match(source, /<Button type="submit" busy=\{saving\} disabled=\{previewing\}>/)
})

test("round cancel: the empty reason is an error under the field with its own message, not a toast, and the server's limit is restated (v-track U2)", () => {
  const source = read(`${C}audit-round-cancel-button.tsx`)
  assertMigratedForm(source, { ids: { reason: "audit-round-cancel-reason" }, messages: [] })
  assert.ok(validateBody(source).includes('check("reason", required(values.reason) ?? maxLength(values.reason, 4000))'))
  // The reason's limit reaches its message through the hook's params (the textarea has no maxLength).
  assert.match(source, /const FIELD_PARAMS = \{ reason: \{ max: 4000 \} \}/)
  assert.match(source, /useFieldErrors<CancelField>\(\{ params: FIELD_PARAMS \}\)/)
  assert.ok(source.includes('error={fieldErrors.errors.reason === "required" ? t("cancelReasonRequired") : fieldErrors.message("reason")}'))
  // The id is the Field's, stable for focus (no useId on the textarea); a change clears the error; closing starts over.
  assert.doesNotMatch(source, /useId|reasonId/)
  assert.match(source, /setReason\(event\.target\.value\)\n\s+fieldErrors\.clear\("reason"\)/)
  assert.match(source, /setReason\(""\)\n\s+fieldErrors\.setErrors\(\{\}\)/)
  assert.doesNotMatch(source, /if \(!trimmedReason\)/)
})

test("the two not-found dialogs keep the browser out, name their remark for focus and have a validate() with no rule to restate (v-track U3)", () => {
  // Mark not found sends its own request, so a refusal that names the remark lands under it.
  const notFound = read(`${C}audit-mark-not-found-button.tsx`)
  assertMigratedForm(notFound, { ids: { remark: "audit-not-found-remark" } })
  // The component-missing dialog hands its values to the scan workspace, which sends them and keeps its toast (U-R5).
  const missing = read(`${C}audit-scan-component-missing-dialog.tsx`)
  assertMigratedForm(missing, { ids: { remark: "audit-component-missing-remark" }, handler: "submit", server: false })
  for (const [name, source, type] of [["not found", notFound, "NotFoundField"], ["component missing", missing, "ComponentMissingField"]] as const) {
    // Nothing can be wrong before the request (U-R6): the remark is optional with no limit, the photo optional.
    assert.match(source, new RegExp(`^function validate\\(\\): Partial<Record<${type}, string>> \\{\\n  return \\{\\}\\n\\}$`, "m"), name)
    assert.match(source, /fieldErrors\.setErrors\(validate\(\)\)/, name)
    assert.match(source, /setRemark\(event\.target\.value\)\n\s+fieldErrors\.clear\("remark"\)/, name)
    assert.doesNotMatch(source, /useId|remarkId/, name)
  }
  // Closing the mark-not-found dialog starts the next one with no errors; the empty component remark keeps its default.
  assert.match(notFound, /setEvidenceFile\(null\)\n\s+fieldErrors\.setErrors\(\{\}\)/)
  assert.ok(missing.includes('onSubmit(remark.trim() || t("componentMissingDefaultRemark", { assetTag: parentAssetTag }), evidence)'))
})

test("finding dialogs: decision, action plan and close are forms that validate themselves, and close waits for evidence with its reason beside the button (v-track U4)", () => {
  const source = read(`${C}audit-finding-review-actions.tsx`)
  // Three dialogs, three tables; the decision's request is sent by the row's review(), which keeps its toast (U-R5).
  assertMigratedForm(source, { ids: { reviewRemark: "audit-review-remark" }, table: "REVIEW_FIELD_IDS", server: false })
  assertMigratedForm(source, {
    ids: { actionPlan: "audit-plan-action-plan", actionDueDate: "audit-plan-due-date", actionStatus: "audit-plan-status" },
    table: "PLAN_FIELD_IDS",
  })
  assertMigratedForm(source, { ids: { closureRemark: "audit-close-remark" }, table: "CLOSE_FIELD_IDS" })
  assert.equal(source.match(/<form onSubmit=\{handleSubmit\} noValidate className=\{accessibleDialogFormClasses\}>/g)?.length, 3)
  const rules = validateBody(source)
  for (const rule of [
    'if (values.reviewRemark !== undefined) check("reviewRemark", maxLength(values.reviewRemark, 4000))',
    'if (values.actionPlan !== undefined) check("actionPlan", required(values.actionPlan) ?? maxLength(values.actionPlan, 4000))',
    'if (values.closureRemark !== undefined) check("closureRemark", maxLength(values.closureRemark, 4000))',
  ]) assert.ok(rules.includes(rule), rule)
  for (const call of ["validate({ reviewRemark })", "validate({ actionPlan: values.actionPlan })", "validate({ closureRemark })"]) {
    assert.ok(source.includes(`fieldErrors.setErrors(${call})`), call)
  }
  // The decision submits its form; a second press after a conflict confirms it, as before.
  assert.match(source, /const nextConflict = await onReview\(action, reviewRemark\.trim\(\), Boolean\(conflict\)\)/)
  assert.match(source, /<Button type="submit" variant=\{action === "approve" \? "default" : "destructive"\} busy=\{reviewing\}>/)
  assert.doesNotMatch(source, /onClick=\{\(\) => submit\(|onClick=\{closeFinding\}/)
  // The plan's fields clear their own error when they change.
  assert.match(source, /setValues\(\(current\) => \(\{ \.\.\.current, \[field\]: value \}\)\)\n\s+if \(field in PLAN_FIELD_IDS\) fieldErrors\.clear\(field as PlanField\)/)
  // Close: the evidence is a prerequisite (spec §4.4): the gate returns first, the button stays focusable with its reason.
  assert.match(source, /const needsEvidence = uploadedCount === 0/)
  assert.match(source, /event\.preventDefault\(\)\n\s+if \(needsEvidence\) return\n\s+fieldErrors\.setErrors\(validate\(\{ closureRemark \}\)\)/)
  // The reason is the body's last line, right above the footer, which holds only buttons (FMG GD3).
  assert.match(source, /\{needsEvidence \? <p id="audit-close-reason" className="text-meta text-muted-foreground">\{t\("closeNeedsEvidence"\)\}<\/p> : null\}\n\s+<\/AccessibleDialogBody>/)
  assert.match(source, /<Button\n\s+type="submit"\n\s+busy=\{saving\}\n\s+aria-disabled=\{needsEvidence \|\| undefined\}\n\s+aria-describedby=\{needsEvidence \? "audit-close-reason" : undefined\}\n\s+>/)
  assert.doesNotMatch(source, /disabled=\{uploadedCount === 0\}/)
  const th = JSON.parse(readFileSync("messages/th.json", "utf8"))
  const en = JSON.parse(readFileSync("messages/en.json", "utf8"))
  assert.equal(th.auditFinding.closeNeedsEvidence, "ยังไม่มีหลักฐานปิดงาน ต้องแนบหลักฐานอย่างน้อย 1 ไฟล์ก่อนจึงจะปิดรายการไม่ตรงได้")
  assert.equal(en.auditFinding.closeNeedsEvidence, "No closure evidence yet. Attach at least one file before you close this discrepancy.")
})

test("batch review: approve and reject stay focusable with nothing selected and say why beside them; the confirm dialog's form keeps the browser out (v-track U5)", () => {
  const source = read(`${C}audit-findings-batch-actions.tsx`)
  // The form is ConfirmTextDialog's (a shared part, NOT_IN_SCOPE); it takes noValidate for its caller (spec §4.5).
  assert.match(read("src/components/ui/confirm-text-dialog.tsx"), /<form onSubmit=\{handleSubmit\} noValidate className=\{accessibleDialogFormClasses\}>/)
  // Nothing in the dialog can be wrong before the request (U-R6); no toast for a validation error.
  assert.match(source, /^function validate\(\): Partial<Record<"reviewRemark", string>> \{\n  return \{\}\n\}$/m)
  assert.match(source, /async function reviewSelected\(action: "approve" \| "reject", reviewRemark: string\) \{\n\s+if \(Object\.keys\(validate\(\)\)\.length > 0\) return/)
  assert.doesNotMatch(source, /\btoast\.(?:error|warning)\(/)
  // The selection is a prerequisite (spec §4.4): aria-disabled with the reason beside the buttons; busy stays disabled.
  assert.match(source, /const noSelection = selectedCount === 0/)
  assert.match(source, /function openReviewDialog\(action: "approve" \| "reject"\) \{\n\s+if \(noSelection\) return/)
  for (const [action, other] of [["approve", "reject"], ["reject", "approve"]]) {
    assert.match(
      source,
      new RegExp(`onClick=\\{\\(\\) => openReviewDialog\\("${action}"\\)\\}\\n\\s+busy=\\{reviewing === "${action}"\\}\\n\\s+aria-disabled=\\{noSelection \\|\\| undefined\\}\\n\\s+aria-describedby=\\{noSelection \\? "audit-batch-review-reason" : undefined\\}\\n\\s+disabled=\\{reviewing === "${other}" \\|\\| reviewDialogAction !== null\\}\\n`),
      action,
    )
  }
  assert.ok(source.includes('{noSelection ? <p id="audit-batch-review-reason" className="text-meta text-muted-foreground">{t("batchNeedsSelection")}</p> : null}'))
  assert.doesNotMatch(source, /selectedCount === 0 \|\|/)
  const th = JSON.parse(readFileSync("messages/th.json", "utf8"))
  const en = JSON.parse(readFileSync("messages/en.json", "utf8"))
  assert.equal(th.auditFinding.batchNeedsSelection, "ยังไม่ได้เลือกรายการ ต้องเลือกรายการไม่ตรงอย่างน้อย 1 รายการก่อนจึงจะพิจารณาได้")
  assert.equal(en.auditFinding.batchNeedsSelection, "Nothing selected yet. Select at least one discrepancy before you decide.")
})
