import assert from "node:assert/strict"
import test from "node:test"
import { countByFile, findJsxTags, hasJsxAttr, jsxAttrValue, readSourceFiles } from "./helpers/source-files.ts"
import { linesOutsideCatch, withoutBlockComments } from "./helpers/validation-reader.ts"

// The V track guards (spec docs/superpowers/specs/2026-10-17-v-track-field-errors-design.md §5, §8): every form a person
// submits is in V_SCOPE; a form joins V_FORMS in the commit that moves it to errors under the field, and from then on it
// validates itself (validate(), noValidate right after onSubmit), shows no toast outside a catch, and gives every
// required select an id and an error. SELECT_STAR_ONLY counts down the required selects that nothing checks yet; the
// V track ends with V_FORMS equal to V_SCOPE and SELECT_STAR_ONLY empty. Never add a row to make a guard pass.
const sources = readSourceFiles("src")
const C = "src/components/"
const read = (path: string) => sources.find((file) => file.path === path)?.source ?? ""

// The 51 forms of the scope list (spec §5, the recon inventory at 9e17cab), by the file that holds each form's submit
// handler, with the number of forms in that file. Formless submits (a button and a handler) count too.
const V_SCOPE: Readonly<Record<string, number>> = {
  [`${C}assets/asset-form.tsx`]: 1,
  [`${C}assets/asset-batch-form.tsx`]: 1,
  [`${C}assets/asset-register-table.tsx`]: 1,
  [`${C}assets/asset-component-manager.tsx`]: 2,
  [`${C}assets/asset-status-correction-button.tsx`]: 1,
  [`${C}assets/asset-import-preview-panel.tsx`]: 1,
  [`${C}assets/asset-label-print.tsx`]: 1,
  [`${C}asset-operations/checkout-form.tsx`]: 1,
  [`${C}asset-operations/checkin-form.tsx`]: 1,
  [`${C}asset-operations/transfer-form.tsx`]: 1,
  [`${C}asset-operations/bulk-move-form.tsx`]: 1,
  [`${C}asset-operations/transaction-cancel-dialog.tsx`]: 1,
  [`${C}audit/audit-round-form.tsx`]: 1,
  [`${C}audit/audit-round-cancel-button.tsx`]: 1,
  [`${C}audit/audit-mark-not-found-button.tsx`]: 1,
  [`${C}audit/audit-finding-review-actions.tsx`]: 3,
  [`${C}audit/audit-findings-batch-actions.tsx`]: 1,
  [`${C}audit/audit-scan-check-form.tsx`]: 1,
  [`${C}audit/audit-scan-component-missing-dialog.tsx`]: 1,
  [`${C}disposal/disposal-request-form.tsx`]: 1,
  [`${C}disposal/disposal-batch-form.tsx`]: 1,
  [`${C}disposal/disposal-decision-button.tsx`]: 1,
  [`${C}disposal/disposal-execution-button.tsx`]: 1,
  [`${C}disposal/disposal-bulk-approval.tsx`]: 1,
  [`${C}disposal/disposal-bulk-execution.tsx`]: 1,
  [`${C}maintenance/maintenance-plan-form.tsx`]: 1,
  [`${C}maintenance/repair-record-form.tsx`]: 1,
  [`${C}maintenance/repair-record-actions.tsx`]: 3,
  [`${C}master-data/brand-form.tsx`]: 1,
  [`${C}master-data/branch-form.tsx`]: 1,
  [`${C}master-data/category-form.tsx`]: 1,
  [`${C}master-data/company-form.tsx`]: 1,
  [`${C}master-data/department-form.tsx`]: 1,
  [`${C}master-data/employee-form.tsx`]: 1,
  [`${C}master-data/location-form.tsx`]: 1,
  [`${C}master-data/asset-model-form.tsx`]: 1,
  [`${C}master-data/supplier-form.tsx`]: 1,
  [`${C}admin/admin-user-form.tsx`]: 1,
  [`${C}admin/role-permission-form.tsx`]: 1,
  [`${C}admin/system-settings-form.tsx`]: 2,
  [`${C}admin/IntegrationClientManager.tsx`]: 2,
  [`${C}admin/asset-state-review-dialog.tsx`]: 1,
  [`${C}admin/data-quality-rule-form.tsx`]: 1,
  [`${C}reports/report-preset-controls.tsx`]: 1,
}

// Files with a <form> that is not role="search" and not in V_SCOPE, each with why (spec §3 non-goals, §5 "Left out").
const NOT_IN_SCOPE: Readonly<Record<string, string>> = {
  [`${C}auth/login-form.tsx`]: "the login form keeps its own inline error (spec §3, §5)",
  [`${C}ui/confirm-text-dialog.tsx`]: "the shared confirm-text dialog: the scope counts its caller, audit-findings-batch-actions.tsx",
}

// The files whose every form shows its errors under the fields (spec G1). Each form task adds its file here, in the
// commit that moves the file's last form.
const V_FORMS: readonly string[] = [
  `${C}master-data/brand-form.tsx`,
  `${C}master-data/company-form.tsx`,
  `${C}master-data/department-form.tsx`,
  `${C}master-data/branch-form.tsx`,
  `${C}master-data/location-form.tsx`,
  `${C}master-data/employee-form.tsx`,
  `${C}master-data/supplier-form.tsx`,
  `${C}master-data/category-form.tsx`,
]

// Required selects (SearchableSelect and its two wrappers) with no error=: an asterisk that nothing checks (spec §5).
// Exact counts at the plan's base; a row drops in the commit that gives its selects their errors, and a new one fails.
const SELECT_STAR_ONLY: Readonly<Record<string, number>> = {
  [`${C}asset-operations/bulk-move-form.tsx`]: 1,
  [`${C}asset-operations/checkin-form.tsx`]: 3,
  [`${C}asset-operations/checkout-form.tsx`]: 2,
  [`${C}asset-operations/transfer-form.tsx`]: 1,
  [`${C}audit/audit-scan-check-form.tsx`]: 1,
  [`${C}disposal/disposal-batch-form.tsx`]: 1,
  [`${C}disposal/disposal-execution-button.tsx`]: 1,
  [`${C}disposal/disposal-request-form.tsx`]: 1,
  [`${C}maintenance/maintenance-plan-form.tsx`]: 1,
  [`${C}maintenance/repair-record-form.tsx`]: 2,
}

const SELECT_TAGS = ["SearchableSelect", "MaintenanceOptionSelect", "AuditScanCheckField"]
const VALIDATION_TOAST = /\btoast\.(?:error|warning)\(/g
const formTags = (source: string) => findJsxTags(withoutBlockComments(source), ["form"]).filter((tag) => jsxAttrValue(tag.text, "role") !== "search")
const starOnlySelects = (source: string) => findJsxTags(source, SELECT_TAGS).filter((tag) => hasJsxAttr(tag.text, "required") && !hasJsxAttr(tag.text, "error"))

test("the V readers skip comments and see a catch block, a .catch() handler and a string with braces", () => {
  const source = [
    "function save() {",
    '  if (!name) toast.error(t("nameRequired"))',
    "  try {",
    '    run("{ not a brace }")',
    "  } catch (error) {",
    "    const later = () => { toast.error(describe(error)) }",
    "    later()",
    "  }",
    "  fetch(url).catch(() => toast.warning(labels.offline))",
    "  try { run() } catch {",
    "    toast.error(labels.failed)",
    "  }",
    "  toast.warning(labels.after)",
    "}",
    '{/* The form is the panel: a <form onSubmit={x}> cannot be ContentPanel. */}',
    '<form role="search" onSubmit={search}>',
    '<input accept="image/*" />',
    "<form onSubmit={handleSubmit} noValidate>",
  ].join("\n")
  assert.deepEqual(linesOutsideCatch(source, VALIDATION_TOAST), [2, 13])
  assert.deepEqual(formTags(source).map((tag) => tag.line), [18])
  assert.equal(withoutBlockComments(source).split("\n").length, source.split("\n").length, "line numbers stay")
  assert.match(withoutBlockComments(source), /accept="image\/\*"/)
  const select = '<SearchableSelect id="x" required error={e} />\n<SearchableSelect required />\n<MaintenanceOptionSelect required={required} />\n<AuditScanCheckField label="a" />'
  assert.deepEqual(starOnlySelects(select).map((tag) => tag.line), [2, 3])
})

test("V1 the scope list names every form a person submits, 51 in all (spec §5)", () => {
  const exists = (path: string) => sources.some((file) => file.path === path)
  const problems: string[] = []
  for (const path of [...Object.keys(V_SCOPE), ...Object.keys(NOT_IN_SCOPE), ...V_FORMS, ...Object.keys(SELECT_STAR_ONLY)]) if (!exists(path)) problems.push(`${path} not found`)
  for (const path of Object.keys(NOT_IN_SCOPE)) if (Object.hasOwn(V_SCOPE, path)) problems.push(`${path} is in V_SCOPE and NOT_IN_SCOPE`)
  for (const path of V_FORMS) if (!Object.hasOwn(V_SCOPE, path)) problems.push(`V_FORMS: ${path} is not in V_SCOPE`)
  if (new Set(V_FORMS).size !== V_FORMS.length) problems.push("V_FORMS lists a file twice")
  // A new <form> anywhere in src joins the scope (or says why it stays out) in the commit that adds it.
  for (const file of sources) {
    const forms = formTags(file.source).length
    if (forms === 0) continue
    if (Object.hasOwn(NOT_IN_SCOPE, file.path)) continue
    if (!Object.hasOwn(V_SCOPE, file.path)) problems.push(`${file.path}: ${forms} <form> not in V_SCOPE`)
    else if (forms > V_SCOPE[file.path]) problems.push(`${file.path}: ${forms} <form>, V_SCOPE counts ${V_SCOPE[file.path]}`)
  }
  assert.deepEqual(problems, [])
  assert.equal(Object.values(V_SCOPE).reduce((sum, count) => sum + count, 0), 51)
})

test("V2 a moved form checks itself: validate() and noValidate right after onSubmit (spec §4.5)", () => {
  const problems: string[] = []
  for (const path of V_FORMS) {
    const source = read(path)
    if (!/\bvalidate\(/.test(source)) problems.push(`${path}: no validate(`)
    for (const tag of formTags(source)) {
      const onSubmit = jsxAttrValue(tag.text, "onSubmit")
      if (onSubmit === null || !tag.text.includes(`onSubmit={${onSubmit}} noValidate`)) problems.push(`${path}:${tag.line}: <form> without noValidate right after onSubmit`)
    }
  }
  assert.deepEqual(problems, [])
})

test("V3 a moved form shows no toast outside a catch: validation errors sit under their fields (spec U2)", () => {
  const problems = V_FORMS.flatMap((path) => linesOutsideCatch(read(path), VALIDATION_TOAST).map((line) => `${path}:${line}`))
  assert.deepEqual(problems, [], "show the error under its field (useFieldErrors); a catch keeps its toast for other failures")
})

test("V4 a required select in a moved form has an id for focus and shows its error (spec §7.3)", () => {
  const problems: string[] = []
  for (const path of V_FORMS) {
    for (const tag of findJsxTags(read(path), SELECT_TAGS)) {
      if (!hasJsxAttr(tag.text, "required")) continue
      if (!hasJsxAttr(tag.text, "id") || !hasJsxAttr(tag.text, "error")) problems.push(`${path}:${tag.line}: required <${tag.name}> needs id= and error=`)
    }
  }
  assert.deepEqual(problems, [])
})

test("V5 the required selects that nothing checks only count down (spec §5)", () => {
  assert.deepEqual(countByFile(sources, (file) => starOnlySelects(file.source).length), SELECT_STAR_ONLY)
  for (const path of V_FORMS) assert.ok(!Object.hasOwn(SELECT_STAR_ONLY, path), `${path} is a V form and still has a star-only select`)
})
