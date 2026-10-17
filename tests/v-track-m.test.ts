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

test("admin user: errors under the field, the password rule of create and edit, and one error under the role group (v-track M7)", () => {
  const source = read(`${C}admin/admin-user-form.tsx`)
  assertMigratedForm(source, {
    ids: {
      username: "admin-user-username",
      password: "admin-user-password",
      displayName: "admin-user-display-name",
      email: "admin-user-email",
      employeeId: "admin-user-employee",
      roleIds: "admin-user-roles",
    },
    messages: ["username", "displayName", "email", "employeeId"],
  })
  const rules = validateBody(source)
  assert.match(source, /^function validate\(values: AdminUserFormValues, isEdit: boolean\) \{$/m)
  for (const rule of [
    'check("username", required(values.username) ?? maxLength(values.username, 100))',
    'check("password", (isEdit ? null : required(values.password)) ?? minLength(values.password, 8) ?? maxLength(values.password, 100))',
    'check("displayName", required(values.displayName) ?? maxLength(values.displayName, 200))',
    'check("email", email(values.email) ?? maxLength(values.email, 200))',
    'check("roleIds", atLeastOne(values.roleIds))',
  ]) assert.ok(rules.includes(rule), rule)
  assert.match(source, /fieldErrors\.setErrors\(validate\(values, isEdit\)\)/)
  // A minimum length is said with its number (M-R4).
  assert.ok(source.includes("error={fieldErrors.errors.password ? validationMessage(fieldErrors.errors.password, { min: 8, max: 100 }) : undefined}"))
  // The roles: a labelled group tied to its one error; focus goes to the first checkbox; a toggle clears the error.
  assert.match(source, /<section\n\s+className="mt-6 border-t border-border pt-5"\n\s+role="group"\n\s+aria-labelledby="admin-user-roles-label"\n\s+aria-describedby=\{fieldErrors\.errors\.roleIds \? "admin-user-roles-error" : undefined\}\n\s+>/)
  assert.match(source, /<div id="admin-user-roles-label" className="mb-3 text-sm font-medium text-foreground">\{t\("roles"\)\}<\/div>/)
  assert.match(source, /<input\n\s+id=\{index === 0 \? "admin-user-roles" : undefined\}\n\s+type="checkbox"/)
  assert.ok(source.includes('<FieldError id="admin-user-roles-error" className="mt-2">{fieldErrors.message("roleIds")}</FieldError>'))
  assert.match(source, /: \[\.\.\.current\.roleIds, roleId\],\n\s+\}\)\)\n\s+fieldErrors\.clear\("roleIds"\)/)
})

test("role: errors under the field, the role key's length and pattern restated, and one error above the permission table (v-track M8)", () => {
  const source = read(`${C}admin/role-permission-form.tsx`)
  assertMigratedForm(source, {
    ids: {
      name: "role-key",
      displayName: "role-display-name",
      displayNameTh: "role-display-name-th",
      description: "role-description",
      permissionIds: "role-permissions",
    },
    messages: ["displayName", "displayNameTh", "description"],
  })
  const rules = validateBody(source)
  for (const rule of [
    'check("name", required(values.name) ?? minLength(values.name, 2) ?? maxLength(values.name, 50) ?? pattern(values.name, /^[a-z][a-z0-9_]*$/))',
    'check("displayName", required(values.displayName) ?? maxLength(values.displayName, 200))',
    'check("displayNameTh", maxLength(values.displayNameTh, 200))',
    'check("description", maxLength(values.description, 500))',
  ]) assert.ok(rules.includes(rule), rule)
  assert.match(source, /fieldErrors\.setErrors\(validate\(meta\)\)/)
  assert.ok(source.includes("error={fieldErrors.errors.name ? validationMessage(fieldErrors.errors.name, { min: 2, max: 50 }) : undefined}"))
  // Every meta field goes through setMetaField, which clears its error.
  assert.equal(source.match(/setMeta\(\(current\) =>/g)?.length, 1, "only inside setMetaField")
  assert.equal(source.match(/onChange=\{\(event\) => setMetaField\("\w+", event\.target\.(?:value|checked)\)\}/g)?.length, 5)
  // "Invalid permission selection" lands above the table, tied to the group; a toggle clears it.
  assert.ok(source.includes('<FieldError id="role-permissions-error" className="px-4 pt-3 md:px-5">{fieldErrors.message("permissionIds")}</FieldError>'))
  assert.match(source, /<div\n\s+role="group"\n\s+aria-label=\{t\("permissionSelection"\)\}\n\s+aria-describedby=\{fieldErrors\.errors\.permissionIds \? "role-permissions-error" : undefined\}\n\s+>/)
  assert.ok(source.includes('id={permission.id === firstPermissionId ? "role-permissions" : undefined}'))
  assert.equal(source.match(/\n    fieldErrors\.clear\("permissionIds"\)\n/g)?.length, 2, "togglePermission and setModulePermissions")
})

test("integration clients: create and edit show errors under the field, at least one scope is an error on submit, and the server's reason is no longer thrown away (v-track M9)", () => {
  const source = read(`${C}admin/IntegrationClientManager.tsx`)
  assertMigratedForm(source, {
    handler: "createClient",
    table: "CREATE_FIELD_IDS",
    hook: "createErrors",
    ids: { clientId: "integration-client-id", displayName: "integration-display-name", scopes: "integration-scopes" },
    messages: ["displayName", "scopes"],
  })
  assertMigratedForm(source, {
    handler: "updateEditingClient",
    table: "EDIT_FIELD_IDS",
    hook: "editErrors",
    ids: { displayName: "integration-edit-display-name", scopes: "integration-edit-scopes" },
    messages: ["displayName", "scopes"],
  })
  const rules = validateBody(source)
  for (const rule of [
    'check("clientId", required(values.clientId) ?? minLength(values.clientId, 3) ?? maxLength(values.clientId, 100) ?? pattern(values.clientId, /^[A-Za-z0-9._:-]+$/))',
    'check("displayName", required(values.displayName) ?? maxLength(values.displayName, 200))',
    'check("scopes", atLeastOne(values.scopes))',
  ]) assert.ok(rules.includes(rule), rule)
  assert.ok(source.includes("createErrors.setErrors(validate({ clientId, displayName, scopes: selectedScopes }))"))
  assert.ok(source.includes("editErrors.setErrors(validate({ displayName: editDisplayName, scopes: editScopes }))"))
  assert.ok(source.includes("error={createErrors.errors.clientId ? validationMessage(createErrors.errors.clientId, { min: 3, max: 100 }) : undefined}"))
  // "At least one scope" is a content rule (spec §4.4): no silent keep-the-last rule, no disabled save, one group error.
  assert.doesNotMatch(source, /next\.length > 0 \? next : current|disabled=\{editScopes\.length === 0\}/)
  // Each scope list is a FieldGroup (F7): its error under the group, tied to the fieldset; focus goes to its first box.
  assert.ok(source.includes('<FieldGroup legend={labels.scopes} id="integration-scopes" className="lg:col-span-2" error={createErrors.message("scopes")}>'))
  assert.ok(source.includes('<FieldGroup legend={labels.scopes} id="integration-edit-scopes" error={editErrors.message("scopes")}>'))
  assert.doesNotMatch(source, /<fieldset\b|fieldLabelClasses|<FieldError\b/)
  // The server's reason, described like every other server error, instead of the fixed createFailed / actionFailed.
  assert.ok(source.includes("throw new Error(apiError.describe(result?.error ?? labels.createFailed).message)"))
  assert.ok(source.includes("throw new Error(apiError.describe(result?.error ?? labels.actionFailed).message)"))
  assert.doesNotMatch(source, /throw new Error\(labels\.(?:createFailed|actionFailed)\)\n\s+const payload = \(await response\.json\(\)\) as \{ data: IntegrationClient(?:; token: string)? \}/)
})

test("asset state review: the 10-character reason is an error on submit, and a refusal comes back from the workspace to the dialog's fields (v-track M10)", () => {
  const dialog = read(`${C}admin/asset-state-review-dialog.tsx`)
  assertMigratedForm(dialog, {
    ids: { statusId: "state-review-status", conditionId: "state-review-condition", reason: "state-review-reason" },
    messages: ["statusId", "conditionId"],
  })
  assert.ok(validateBody(dialog).includes('check("reason", required(values.reason) ?? minLength(values.reason, 10) ?? maxLength(values.reason, 2000))'))
  assert.ok(dialog.includes("error={fieldErrors.errors.reason ? validationMessage(fieldErrors.errors.reason, { min: 10, max: 2000 }) : undefined}"))
  // A content rule, not a gate (spec §4.4): the confirm button is enabled.
  assert.doesNotMatch(dialog, /(?<![\w-])disabled=\{/)
  // The server's target rule has no field: the _form key shows in the dialog's Notice.
  assert.ok(dialog.includes('{fieldErrors.errors._form ? <Notice tone="danger" role="alert">{fieldErrors.message("_form")}</Notice> : null}'))
  assert.match(dialog, /onSubmit: \(input: \{ statusId\?: string; conditionId\?: string; reason: string \}\) => Promise<unknown>/)
  assert.match(dialog, /const refusal = await onSubmit\(\{/)
  const workspace = read(`${C}admin/asset-state-review-workspace.tsx`)
  assert.ok(workspace.includes('else if (body.code === "VALIDATION_FAILED" && body.fieldErrors) return body'))
  assert.ok(workspace.includes('if (body.code === "ASSET_STATE_REVIEW_STALE") toast.error(labels.staleError)'), "the stale conflict keeps its toast")
})

test("data-quality rules and the report preset name become forms that validate themselves; the rules keep the server's reason (v-track M11)", () => {
  // The data-quality rules: one severity per rule, keyed <rule>.severity; the bare catch now shows the server's reason.
  const rules = read(`${C}admin/data-quality-rule-form.tsx`)
  assert.match(rules, /<form onSubmit=\{handleSubmit\} noValidate>/)
  assert.match(rules, /<Button type="submit" busy=\{saving\} className="w-fit">/)
  assert.ok(validateBody(rules).includes('for (const rule of items) check(`${rule.key}.severity`, rule.severity === "warning" || rule.severity === "danger" ? null : "invalidChoice")'))
  assert.match(rules, /fieldErrors\.setErrors\(validate\(items\)\)/)
  assert.match(rules, /if \(fieldErrors\.applyServer\(result\) && focusFirstError\(\)\) return/)
  assert.ok(rules.includes("<Field label={labels.severity} id={severityId(rule.key)} error={fieldErrors.message(`${rule.key}.severity`)}>"))
  assert.match(rules, /\} catch \(error\) \{\n[^\n]*\n\s+apiError\.toast\(error\)\n/)
  assert.doesNotMatch(rules, /toast\.error\(|await response\.text\(\)|\} catch \{/)

  // The report preset name: saved on this device only (no server); its required text is the preset's own message.
  const preset = read(`${C}reports/report-preset-controls.tsx`)
  assertMigratedForm(preset, { ids: { name: "report-preset-name" }, messages: [], server: false })
  assert.ok(validateBody(preset).includes('check("name", required(values.name) ?? maxLength(values.name, 60))'))
  assert.ok(preset.includes('error={fieldErrors.errors.name === "required" ? labels.presetNameRequired : fieldErrors.message("name")}'))
  assert.match(preset, /<form onSubmit=\{handleSubmit\} noValidate className="flex flex-col gap-3 sm:flex-row sm:items-start">/)
  assert.doesNotMatch(preset, /setMessage\(labels\.presetNameRequired\)|function savePreset\b/)
  // The Notice under the row stays for the storage failure, which is not a field error.
  assert.match(preset, /setMessage\(labels\.presetStorageFailed\)/)
})
