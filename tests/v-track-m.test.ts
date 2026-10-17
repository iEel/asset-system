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

test("branch and location: errors under the field, and the no-company or no-branch gate keeps focus and says why beside the button (v-track M2)", () => {
  const th = JSON.parse(readFileSync("messages/th.json", "utf8"))
  const en = JSON.parse(readFileSync("messages/en.json", "utf8"))
  const forms = [
    {
      path: `${C}master-data/branch-form.tsx`,
      ids: { code: "branch-code", name: "branch-name", companyId: "branch-company", contactPerson: "branch-contact-person", address: "branch-address" },
      rules: [
        'check("code", required(values.code) ?? maxLength(values.code, 20))',
        'check("name", required(values.name) ?? maxLength(values.name, 200))',
        'check("companyId", required(values.companyId))',
        'check("contactPerson", maxLength(values.contactPerson, 200))',
        'check("address", maxLength(values.address, 500))',
      ],
      gate: "needsCompany",
      options: "companies",
      reason: "branch-save-reason",
      message: ["branch", "saveNeedsCompany"],
    },
    {
      path: `${C}master-data/location-form.tsx`,
      ids: { code: "location-code", name: "location-name", branchId: "location-branch", locationType: "location-type", parentId: "location-parent", description: "location-description" },
      rules: [
        'check("code", required(values.code) ?? maxLength(values.code, 50))',
        'check("name", required(values.name) ?? maxLength(values.name, 200))',
        'check("branchId", required(values.branchId))',
        'check("locationType", required(values.locationType))',
        'check("description", maxLength(values.description, 500))',
      ],
      gate: "needsBranch",
      options: "branches",
      reason: "location-save-reason",
      message: ["location", "saveNeedsBranch"],
    },
  ] as const
  for (const form of forms) {
    const source = read(form.path)
    assertMigratedForm(source, { ids: form.ids })
    const rules = validateBody(source)
    for (const rule of form.rules) assert.ok(rules.includes(rule), `${form.path}: ${rule}`)
    // A prerequisite, not a field (spec §4.4): the gate stays, the reason shows next to the button, and the button stays
    // focusable (aria-disabled, tied to the reason) instead of disabled.
    assert.match(source, new RegExp(`const ${form.gate} = ${form.options}\\.length === 0\\n`))
    assert.match(source, new RegExp(`event\\.preventDefault\\(\\)\\n\\s+if \\(${form.gate}\\) return\\n`))
    assert.ok(source.includes(`{${form.gate} ? <p id="${form.reason}" className="basis-full text-meta text-muted-foreground sm:mr-auto sm:basis-auto sm:self-center">{t("${form.message[1]}")}</p> : null}`), form.reason)
    assert.ok(source.includes(`<Button type="submit" busy={saving} aria-disabled={${form.gate} || undefined} aria-describedby={${form.gate} ? "${form.reason}" : undefined}>`), `${form.path}: the gated button`)
    assert.match(source, /<div className="mt-6 flex flex-wrap justify-end gap-3 border-t border-border pt-5">/)
    assert.doesNotMatch(source, /(?<![\w-])disabled=\{/, "no disabled attribute")
    assert.equal(typeof th[form.message[0]][form.message[1]], "string", `th ${form.message.join(".")}`)
    assert.equal(typeof en[form.message[0]][form.message[1]], "string", `en ${form.message.join(".")}`)
  }
})

test("employee: errors under the field, the email rule, and a company change clears the branch and department errors with it (v-track M3)", () => {
  const source = read(`${C}master-data/employee-form.tsx`)
  assertMigratedForm(source, {
    ids: {
      code: "employee-code",
      fullNameTh: "employee-full-name-th",
      fullNameEn: "employee-full-name-en",
      email: "employee-email",
      companyId: "employee-company",
      branchId: "employee-branch",
      departmentId: "employee-department",
      position: "employee-position",
      employmentStatus: "employee-employment-status",
      managerId: "employee-manager",
    },
  })
  const rules = validateBody(source)
  for (const rule of [
    'check("code", required(values.code) ?? maxLength(values.code, 20))',
    'check("fullNameTh", required(values.fullNameTh) ?? maxLength(values.fullNameTh, 200))',
    'check("fullNameEn", maxLength(values.fullNameEn, 200))',
    'check("email", email(values.email) ?? maxLength(values.email, 200))',
    'check("companyId", required(values.companyId))',
    'check("branchId", required(values.branchId))',
    'check("departmentId", required(values.departmentId))',
    'check("position", maxLength(values.position, 200))',
    'check("employmentStatus", required(values.employmentStatus))',
  ]) assert.ok(rules.includes(rule), rule)
  // The company narrows the branch and department lists, so changing it clears the three together (spec §4.3).
  assert.match(source, /function handleCompanyChange\(companyId: string\) \{\n[\s\S]*?\n    \}\)\)\n    fieldErrors\.clear\("companyId", "branchId", "departmentId"\)\n  \}/)
  // "Employee cannot be their own manager" answers with fieldErrors.managerId (area S), shown under the manager field.
  assert.match(source, /<Field label=\{t\("manager"\)\} id="employee-manager" error=\{fieldErrors\.message\("managerId"\)\}>/)
})

test("supplier: on the shared hook, codes and messages like the other forms, with no toast for a refused field (v-track M4)", () => {
  const source = read(`${C}master-data/supplier-form.tsx`)
  // The ids stay as they were (the supplier test pins them); the keys are the server's.
  assertMigratedForm(source, {
    ids: {
      code: "supplier-code",
      name: "supplier-name",
      contactPerson: "supplier-contact",
      phone: "supplier-phone",
      email: "supplier-email",
      address: "supplier-address",
    },
  })
  const rules = validateBody(source)
  for (const rule of [
    'check("code", required(values.code) ?? maxLength(values.code, 20))',
    'check("name", required(values.name) ?? maxLength(values.name, 200))',
    'check("contactPerson", maxLength(values.contactPerson, 200))',
    'check("phone", maxLength(values.phone, 50))',
    'check("email", email(values.email) ?? maxLength(values.email, 200))',
    'check("address", maxLength(values.address, 500))',
  ]) assert.ok(rules.includes(rule), rule)
  assert.doesNotMatch(source, /parseSupplierFormError|getErrorMessage|supplier-form-errors|SupplierForm(?:Errors|ErrorCode|Field)\b/)
  // The supplier-only texts gave way to common.validation (M-R6).
  for (const locale of ["th", "en"]) {
    const messages = JSON.parse(readFileSync(`messages/${locale}.json`, "utf8"))
    for (const key of ["duplicateCode", "invalidEmail", "fieldTooLong"]) assert.equal(messages.supplier[key], undefined, `${locale} supplier.${key}`)
  }
  // All seven simple master-data forms now carry noValidate (M1 to M4).
  for (const name of ["branch", "brand", "company", "department", "employee", "location", "supplier"]) {
    assert.match(read(`${C}master-data/${name}-form.tsx`), /<form onSubmit=\{handleSubmit\} noValidate className=\{cn\(getPanelClasses\(\), "p-4 sm:p-5"\)\}>/, name)
  }
})

test("category: errors under the field, also on each custom field and photo checklist row, keyed like the server's dotted paths (v-track M5)", () => {
  const source = read(`${C}master-data/category-form.tsx`)
  assertMigratedForm(source, { ids: { code: "category-code", name: "category-name", description: "category-description" } })
  const rules = validateBody(source)
  for (const rule of [
    'check("code", required(values.code) ?? maxLength(values.code, 20))',
    'check("name", required(values.name) ?? maxLength(values.name, 200))',
    'check("description", maxLength(values.description, 500))',
    "check(`customFieldDefs.${index}.fieldName`, required(field.fieldName) ?? maxLength(field.fieldName, 100))",
    "check(`customFieldDefs.${index}.fieldLabel`, required(field.fieldLabel) ?? maxLength(field.fieldLabel, 200))",
    "check(`customFieldDefs.${index}.fieldLabelTh`, maxLength(field.fieldLabelTh, 200))",
    "check(`photoChecklist.${index}`, required(item) ?? maxLength(item, 100))",
  ]) assert.ok(rules.includes(rule), rule)
  // The rows' ids and focus order follow the server's keys (spec §6.1: customFieldDefs.0.fieldName).
  assert.ok(source.includes("const CUSTOM_FIELD_ID_SUFFIX = { fieldName: \"name\", fieldLabel: \"label\", fieldLabelTh: \"label-th\" } as const"))
  assert.ok(source.includes("const focusFirstError = () => fieldErrors.focusFirst(fieldOrder(values), { idFor: fieldId })"))
  for (const field of [
    '<Field label={labels.fieldName} id={`category-field-${index}-name`} required error={errorFor(index, "fieldName")}>',
    '<Field label={labels.fieldLabel} id={`category-field-${index}-label`} required error={errorFor(index, "fieldLabel")}>',
    '<Field label={labels.fieldLabelTh} id={`category-field-${index}-label-th`} error={errorFor(index, "fieldLabelTh")}>',
    "<Field label={labels.item} hideLabel id={`category-photo-${index}`} error={errorFor(index)}>",
  ]) assert.ok(source.includes(field), field)
  // A row's error clears when that row's field changes; removing, copying or moving a row clears that template's errors.
  assert.match(source, /if \(field in CUSTOM_FIELD_ID_SUFFIX\) onFieldEdit\(index, field as CustomFieldErrorField\)/)
  assert.equal(source.match(/\n    onRowsShift\(\)\n/g)?.length, 6, "remove, duplicate and move in each editor")
  assert.ok(source.includes('onRowsShift={() => clearRowErrors("customFieldDefs.")}'))
  assert.ok(source.includes('onRowsShift={() => clearRowErrors("photoChecklist.")}'))
})

test("asset model: errors under the field; a duplicate name for the brand lands under the name, and the photo upload keeps its toasts (v-track M6)", () => {
  const source = read(`${C}master-data/asset-model-form.tsx`)
  assertMigratedForm(source, { ids: { name: "asset-model-name", brandId: "asset-model-brand", categoryId: "asset-model-category" } })
  const rules = validateBody(source)
  for (const rule of [
    'check("name", required(values.name) ?? maxLength(values.name, 200))',
    'check("brandId", required(values.brandId))',
    'check("categoryId", required(values.categoryId))',
  ]) assert.ok(rules.includes(rule), rule)
  // Only the save reads fieldErrors; the photo upload and delete are not field errors and keep apiError.toast.
  assert.equal(source.match(/fieldErrors\.applyServer\(/g)?.length, 1)
  assert.equal(source.match(/apiError\.toast\(error\)/g)?.length, 3)
})
