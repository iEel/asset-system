import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import test from "node:test"

// V track plan 1, area M: the master-data and admin forms show their errors under the field (spec
// docs/superpowers/specs/2026-10-17-v-track-field-errors-design.md §4, §5, §7). One test per task, appended in order.
// The working tree is CRLF on Windows: every read strips \r before the multi-line regexes.
const C = "src/components/"
const read = (path: string) => readFileSync(path, "utf8").replace(/\r\n/g, "\n")
const escape = (text: string) => text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")

// The body of the module-level `function validate(`, up to the first line that is only "}".
function validateBody(source: string) {
  const start = source.search(/^function validate\(/m)
  assert.notEqual(start, -1, "a module-level function validate(")
  const end = source.indexOf("\n}\n", start)
  return source.slice(start, end)
}

// The shape every migrated form shares (M-R1 to M-R4): noValidate straight after onSubmit, the FIELD_IDS table in
// visual order, validate() with one check per rule, the hook, focus on the first wrong field for the client's errors
// and the server's, each listed key's message under its Field, and no toast for a validation error.
function assertMigratedForm(
  source: string,
  form: { ids: Record<string, string>; handler?: string; messages?: readonly string[]; table?: string; hook?: string; server?: false },
) {
  const handler = form.handler ?? "handleSubmit"
  const table = form.table ?? "FIELD_IDS"
  const hook = form.hook ?? "fieldErrors"
  assert.match(source, new RegExp(`<form onSubmit=\\{${handler}\\} noValidate[ >\\n]`), "noValidate directly after onSubmit")
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
  assert.doesNotMatch(source, /\btoast\.(?:error|warning)\(/, "no validation toast (the catch keeps apiError.toast)")
}

test("brand, company and department: the browser's check is off, validate() restates every rule, and errors show under the field (v-track M1)", () => {
  const brand = read(`${C}master-data/brand-form.tsx`)
  assertMigratedForm(brand, { ids: { name: "brand-name" } })
  assert.match(validateBody(brand), /check\("name", required\(values\.name\) \?\? maxLength\(values\.name, 200\)\)/)

  const company = read(`${C}master-data/company-form.tsx`)
  assertMigratedForm(company, {
    ids: {
      code: "company-code",
      assetTagCode: "company-asset-tag-code",
      nameTh: "company-name-th",
      nameEn: "company-name-en",
      taxId: "company-tax-id",
      address: "company-address",
    },
  })
  const companyRules = validateBody(company)
  for (const rule of [
    'check("code", required(values.code) ?? maxLength(values.code, 20))',
    'check("assetTagCode", maxLength(values.assetTagCode, 20))',
    'check("nameTh", required(values.nameTh) ?? maxLength(values.nameTh, 200))',
    'check("nameEn", maxLength(values.nameEn, 200))',
    'check("taxId", maxLength(values.taxId, 20))',
    'check("address", maxLength(values.address, 500))',
  ]) assert.ok(companyRules.includes(rule), rule)

  const department = read(`${C}master-data/department-form.tsx`)
  assertMigratedForm(department, {
    ids: { code: "department-code", name: "department-name" },
  })
  const departmentRules = validateBody(department)
  for (const rule of [
    'check("code", required(values.code) ?? maxLength(values.code, 20))',
    'check("name", required(values.name) ?? maxLength(values.name, 200))',
  ]) assert.ok(departmentRules.includes(rule), rule)

  // A field's error clears when that field changes (spec §4.3): setField clears the key it sets.
  for (const [name, source] of [["brand", brand], ["company", company], ["department", department]] as const) {
    assert.match(source, /setValues\(\(current\) => \(\{ \.\.\.current, \[field\]: value \}\)\)\n\s+if \(field in FIELD_IDS\) fieldErrors\.clear\(field as \w+Field\)/, name)
  }
})
