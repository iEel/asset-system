import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import test from "node:test"

// V track plan 2, area A: the asset forms show their errors under the field (spec
// docs/superpowers/specs/2026-10-17-v-track-field-errors-design.md §4, §5, §7). One test per task, appended in order.
// The working tree is CRLF on Windows: every read strips \r before the multi-line regexes.
const C = "src/components/"
const read = (path: string) => readFileSync(path, "utf8").replace(/\r\n/g, "\n")
const escape = (text: string) => text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
const messages = (locale: "th" | "en") => JSON.parse(readFileSync(`messages/${locale}.json`, "utf8"))

// The body of a module-level function, up to the first line that is only "}".
function functionBody(source: string, name = "validate") {
  const start = source.search(new RegExp(`^function ${name}\\(`, "m"))
  assert.notEqual(start, -1, `a module-level function ${name}(`)
  return source.slice(start, source.indexOf("\n}\n", start))
}

// The rows of a field table (v-track M-R1): `const NAME = {`, one `  key: "id",` per line, `} as const`.
function fieldTable(source: string, name = "FIELD_IDS") {
  const block = source.match(new RegExp(`const ${name} = \\{\\n([\\s\\S]*?)\\n\\} as const`))
  assert.ok(block, `const ${name} = { … } as const`)
  return block[1].split("\n")
}

// What every moved form shares (v-track M-R1 to M-R4): noValidate straight after onSubmit, the hook, the client's errors
// from validate(), the server's on the same fields, focus on the first wrong one, and each table id on one control.
function assertMovedForm(
  source: string,
  form: { ids: Record<string, string>; handler?: string; table?: string; hook?: string; server?: false; formless?: true },
) {
  const handler = form.handler ?? "handleSubmit"
  const hook = form.hook ?? "fieldErrors"
  if (!form.formless) assert.match(source, new RegExp(`<form onSubmit=\\{${handler}\\} noValidate[ >\\n]`), "noValidate directly after onSubmit")
  assert.match(source, /import \{ useFieldErrors(?:, useValidationMessage)? \} from "@\/components\/ui\/use-field-errors"/)
  assert.deepEqual(fieldTable(source, form.table), Object.entries(form.ids).map(([key, id]) => `  ${key}: "${id}",`), "the fields in visual order with their ids")
  for (const id of Object.values(form.ids)) {
    assert.equal(source.match(new RegExp(`\\bid="${escape(id)}"`, "g"))?.length, 1, `id "${id}" once`)
  }
  assert.match(source, new RegExp(`${hook}\\.setErrors\\(\\s*validate\\(`), "the client's errors come from validate()")
  if (form.server !== false) {
    assert.match(source, new RegExp(`if \\(${hook}\\.applyServer\\((?:result|payload|body|refusal)\\) && `), "the server's fieldErrors land on the same fields")
  }
  assert.match(source, new RegExp(`${hook}\\.focusFirst\\(`), "focus goes to the first wrong field")
}

test("asset form: validate() restates every rule the toasts said, the save gates name their reason, and the warranty pair holds (v-track A1)", () => {
  const source = read(`${C}assets/asset-form.tsx`)
  assertMovedForm(source, {
    ids: {
      assetTag: "asset-tag",
      name: "asset-name",
      categoryId: "asset-category",
      serialNumber: "asset-serial-number",
      ownershipType: "asset-ownership-type",
      companyId: "asset-company",
      branchId: "asset-branch",
      departmentId: "asset-department",
      custodianId: "asset-custodian",
      licenseTotalSeats: "asset-license-total-seats",
      licenseUsedSeats: "asset-license-used-seats",
      currentLocationId: "asset-current-location",
      statusId: "asset-status",
      conditionId: "asset-condition",
      parentAssetId: "asset-install-parent",
      componentRole: "asset-install-role",
      slotNo: "asset-install-slot",
      installReason: "asset-install-reason",
      purchaseDate: "asset-purchase-date",
      purchasePrice: "asset-purchase-price",
      warrantyStartDate: "asset-warranty-start",
      warrantyEndDate: "asset-warranty-end",
      fixedAssetCode: "asset-fixed-asset-code",
      poNumber: "asset-po-number",
      invoiceNumber: "asset-invoice-number",
      purchaseDocumentNo: "asset-purchase-document-no",
      purchaseDocumentAmount: "asset-purchase-document-amount",
      purchaseDocumentFile: "asset-purchase-document-file",
      assetPhotoFile: "asset-photo-file",
      customFieldsJson: "asset-custom-fields-json",
    },
  })
  const rules = functionBody(source)
  assert.match(source, /^function validate\(\{ values, original, duplicates, install, customFields, purchaseDocument \}: AssetRuleInput\): Partial<Record<AssetField, string>> \{$/m)
  for (const rule of [
    'check("assetTag", duplicates.assetTag ? "duplicate" : maxLength(values.assetTag, 50))',
    'check("name", required(values.name) ?? maxLength(values.name, 200))',
    'check("categoryId", required(values.categoryId))',
    'check("serialNumber", duplicates.serialNumber ? "duplicate" : maxLength(values.serialNumber, 100))',
    'check("departmentId", ownershipType !== "personal" && !isLicense ? required(values.departmentId) : null)',
    'check("custodianId", isLicense && atLeastOne([values.departmentId, values.custodianId]) ? "licenseResponsibilityRequired" : null)',
    // The seats are whole numbers: the shared rule (v-track final task 1).
    'check("licenseTotalSeats", range(values.licenseTotalSeats, 0) ?? wholeNumber(values.licenseTotalSeats))',
    'check("licenseUsedSeats", range(values.licenseUsedSeats, 0) ?? wholeNumber(values.licenseUsedSeats) ?? seatsExceeded(values))',
    'check("parentAssetId", ownershipType === "component" && required(install.parentAssetId) ? "componentParentRequired" : null)',
    'check("componentRole", install.parentAssetId && required(install.componentRole) ? "componentRoleRequired" : maxLength(install.componentRole, 100))',
    'check("purchasePrice", range(values.purchasePrice, 0) ?? decimals(values.purchasePrice, 2))',
    'check("warrantyEndDate", warrantyChanged ? notBefore(values.warrantyEndDate, values.warrantyStartDate) : null)',
    'check("purchaseDocumentNo", purchaseDocument.file && required(purchaseDocument.documentNo) ? "purchaseDocumentNoRequired" : maxLength(purchaseDocument.documentNo, 100))',
    'if (definition.isRequired) check(customFieldKey(definition.fieldName), required(customFields.valueOf(definition.fieldName)))',
    'check("customFieldsJson", isValidCustomFieldsJson(values.customFieldsJson) ? null : "customFieldsJsonInvalid")',
  ]) assert.ok(rules.includes(rule), rule)
  // The warranty pair on edit is checked only when one of its dates changed, so an old asset stored with reversed dates
  // still saves an unrelated change (spec §7.4); the end cannot be picked before the start (U4).
  assert.match(rules, /const warrantyChanged =\n\s+!original \|\|\n\s+\(values\.warrantyStartDate \?\? ""\) !== \(original\.warrantyStartDate \?\? ""\) \|\|\n\s+\(values\.warrantyEndDate \?\? ""\) !== \(original\.warrantyEndDate \?\? ""\)/)
  assert.match(source, /value=\{values\.warrantyStartDate \?\? ""\}\n\s+max=\{values\.warrantyEndDate \|\| undefined\}/)
  assert.match(source, /value=\{values\.warrantyEndDate \?\? ""\}\n\s+min=\{values\.warrantyStartDate \|\| undefined\}/)
  assert.match(functionBody(source, "seatsExceeded"), /return Number\(values\.licenseUsedSeats\) > Number\(values\.licenseTotalSeats\) \? "licenseSeatsExceeded" : null/)
  // The asset rules keep the message their toast used (spec §7.1); the server's own codes read the catalog.
  assert.match(source, /const ASSET_MESSAGE_CODES = \[\n\s+"componentParentRequired",\n\s+"componentRoleRequired",\n\s+"licenseResponsibilityRequired",\n\s+"purchaseDocumentNoRequired",\n\s+"fileRequired",\n\s+"customFieldsJsonInvalid",\n\] as const/)
  assert.match(source, /return code && isAssetMessageCode\(code\) \? t\(code\) : fieldErrors\.message\(key\)/)
  // No validation toast is left; the catch keeps its toast for the server's protected-status refusal.
  assert.doesNotMatch(source, /toast\.error\(t\("(?:duplicateWarning|customFieldsJsonInvalid|customFieldRequired|componentRoleRequired|componentParentRequired|licenseResponsibilityRequired|licenseSeatUsageInvalid|purchaseDocumentNoRequired|fileRequired)"/)
  assert.match(source, /if \(errorMessage\.includes\("Protected lifecycle statuses"\)\) toast\.error\(t\("protectedStatusEditBlocked"\)\)/)
  // Prerequisites keep their gate, focusable and tied to a visible reason (spec §4.4); a duplicate is a field error now.
  assert.ok(source.includes('const saveBlockedBy = isProtectedStatusChange ? "asset-status-protected" : duplicateState.checking ? "asset-save-reason" : null'))
  assert.match(source, /event\.preventDefault\(\)\n\s+if \(saveBlockedBy\) return\n\s+fieldErrors\.setErrors\(/)
  assert.match(source, /aria-disabled=\{saveBlockedBy \? true : undefined\}\n\s+aria-describedby=\{saveBlockedBy \?\? undefined\}/)
  assert.match(source, /<Notice id="asset-status-protected" tone="warning" className="mt-2" title=\{t\("protectedStatusEditBlocked"\)\}>/)
  assert.ok(source.includes('<StickyFormFooter status={duplicateState.checking ? <span id="asset-save-reason">{t("duplicateCheckPending")}</span> : undefined}>'))
  assert.doesNotMatch(source, /disabled=\{isProtectedStatusChange/)
  for (const locale of ["th", "en"] as const) {
    assert.equal(typeof messages(locale).asset.duplicateCheckPending, "string", `${locale} asset.duplicateCheckPending`)
    assert.equal(messages(locale).asset.licenseSeatUsageInvalid, undefined, `${locale}: the seats read apiErrors.licenseSeatsExceeded`)
    assert.equal(messages(locale).asset.customFieldRequired, undefined, `${locale}: a template field says required under itself`)
  }
  // The duplicate checks stay live (spec U8): a save that finds one shows the same line, not a second one.
  assert.match(source, /liveError=\{duplicateState\.assetTagExists \? t\("duplicateAssetTag"\) : null\}\n\s+error=\{duplicateState\.assetTagExists \? t\("duplicateAssetTag"\) : errorText\("assetTag"\)\}/)
  assert.match(source, /liveError=\{duplicateState\.serialNumberExists \? t\("duplicateSerialNumber"\) : null\}\n\s+error=\{duplicateState\.serialNumberExists \? t\("duplicateSerialNumber"\) : errorText\("serialNumber"\)\}/)
  // The server lets the total seats stay empty, so the star goes (spec §11 call 8).
  assert.ok(source.includes('<Field label={t("licenseTotalSeats")} id="asset-license-total-seats" error={errorText("licenseTotalSeats")}>'))
  // The server's refusal lands on the same fields; the raw JSON opens first; the template fields are ids by place.
  assert.match(source, /if \(fieldErrors\.applyServer\(result\) && focusFirstError\(\)\) return\n\s+throw new Error\(result\?\.error \?\? tCommon\("error"\)\)/)
  assert.match(source, /reveal: \(key\) => \{\n\s+if \(key === "customFieldsJson"\) setShowRawJson\(true\)/)
  assert.match(source, /id=\{`asset-custom-field-\$\{index\}`\}/)
  // The add buttons check their own fields under the same hook; the save's errors stay.
  assert.match(source, /const documentErrors = validatePurchaseDocument\(selectedPurchaseFile, purchaseDocumentNo\)/)
  assert.match(source, /fieldErrors\.setErrors\(\{ \.\.\.fieldErrors\.errors, assetPhotoFile: "fileRequired" \}\)/)
  // A pair or a group clears together (spec §4.3).
  assert.match(source, /if \(field === "warrantyStartDate"\) fieldErrors\.clear\("warrantyEndDate"\)/)
  assert.match(source, /if \(field === "licenseTotalSeats"\) fieldErrors\.clear\("licenseUsedSeats"\)/)
  assert.match(source, /if \(field === "departmentId"\) fieldErrors\.clear\("custodianId"\)/)
})

test("asset batch form: shared fields and rows show their errors, duplicates stay live under the rows, and a refusal leaves the review (v-track A2)", () => {
  const source = read(`${C}assets/asset-batch-form.tsx`)
  assertMovedForm(source, {
    table: "COMMON_FIELD_IDS",
    ids: {
      name: "asset-batch-name",
      categoryId: "asset-batch-category",
      ownershipType: "asset-batch-ownership-type",
      companyId: "asset-batch-company",
      branchId: "asset-batch-branch",
      departmentId: "asset-batch-department",
      custodianId: "asset-batch-custodian",
      currentLocationId: "asset-batch-current-location",
      statusId: "asset-batch-status",
      conditionId: "asset-batch-condition",
      purchaseDate: "asset-batch-purchase-date",
      purchasePrice: "asset-batch-purchase-price",
      warrantyStartDate: "asset-batch-warranty-start",
      warrantyEndDate: "asset-batch-warranty-end",
      poNumber: "asset-batch-po-number",
      invoiceNumber: "asset-batch-invoice-number",
    },
  })
  // The keys are the server's (S-R12): common.<field> for the shared fields, rows.<index>.<field> for each row.
  assert.match(source, /type BatchField = `common\.\$\{CommonField\}` \| `rows\.\$\{number\}\.\$\{RowField\}`/)
  const rules = functionBody(source)
  for (const rule of [
    'check("common.name", required(common.name) ?? maxLength(common.name, 200))',
    'check("common.departmentId", ownershipType !== "personal" && !isLicense ? required(common.departmentId) : null)',
    'check("common.custodianId", isLicense && atLeastOne([common.departmentId, common.custodianId]) ? "licenseResponsibilityRequired" : null)',
    'check("common.purchasePrice", range(common.purchasePrice, 0) ?? decimals(common.purchasePrice, 2))',
    'check("common.warrantyEndDate", notBefore(common.warrantyEndDate, common.warrantyStartDate))',
    'rows.forEach((row, index) => check(rowKey(index, "serialNumber"), maxLength(row.serialNumber, 100)))',
    "Object.assign(errors, buildAssetBatchDuplicateFieldErrors(rows, findDuplicateBatchValues(rows)))",
  ]) assert.ok(rules.includes(rule), rule)
  assert.match(source, /value=\{common\.warrantyStartDate\}\n\s+max=\{common\.warrantyEndDate \|\| undefined\}/)
  assert.match(source, /value=\{common\.warrantyEndDate\}\n\s+min=\{common\.warrantyStartDate \|\| undefined\}/)
  // Both row views are rendered (cards below md, the table from md): focus goes to the one on screen; a server refusal
  // closes the review first (spec §4.2).
  assert.match(functionBody(source, "rowFieldId"), /return `asset-batch-\$\{view\}-\$\{index\}-\$\{field === "assetTag" \? "tag" : "serial"\}`/)
  assert.match(source, /return document\.getElementById\(tableId\)\?\.getClientRects\(\)\.length \? tableId : rowFieldId\(Number\(row\[1\]\), row\[2\] as RowField, "card"\)/)
  assert.match(source, /reveal: \(\) => setReviewing\(false\),/)
  assert.match(source, /event\.preventDefault\(\)\n\s+fieldErrors\.setErrors\(validate\(common, rows\)\)\n\s+if \(focusFirstError\(\)\) return\n\s+if \(!reviewing\) \{/)
  // The duplicate warning moves under each row that holds the value and stays live (spec U8); no box says it again.
  assert.match(source, /const liveDuplicates = useMemo\(\(\) => buildAssetBatchDuplicateFieldErrors\(rows, duplicateValues\), \[rows, duplicateValues\]\)/)
  assert.match(source, /liveDuplicates\[rowKey\(index, field\)\] \? t\("batchRowDuplicate"\) : fieldErrors\.message\(rowKey\(index, field\)\)/)
  for (const view of ["card", "row"]) {
    for (const field of ["assetTag", "serialNumber"]) {
      assert.match(source, new RegExp(`id=\\{rowFieldId\\(index, "${field}", "${view}"\\)\\}[^\\n]* liveError=\\{rowLiveError\\(index, "${field}"\\)\\} error=\\{rowError\\(index, "${field}"\\)\\}>`), `${view} ${field}`)
    }
  }
  assert.doesNotMatch(source, /\{t\("duplicateWarning"\)\}/)
  // No toast for a validation error or for the duplicates the check found: the check's Notice reads them out.
  assert.doesNotMatch(source, /\btoast\.(?:error|warning)\(/)
  assert.match(source, /className="md:col-span-2"\n\s+role=\{duplicateCheckStatus === "duplicate" \? "status" : undefined\}/)
  assert.match(source, /<Button type="submit" className="w-full sm:w-auto" busy=\{saving\}>/)
  assert.match(source, /if \(fieldErrors\.applyServer\(result\) && focusFirstError\(\)\) return\n\s+throw new Error\(getErrorMessage\(result\) \?\? tCommon\("error"\)\)/)
  for (const locale of ["th", "en"] as const) {
    assert.equal(typeof messages(locale).asset.batchRowDuplicate, "string", `${locale} asset.batchRowDuplicate`)
    assert.equal(messages(locale).asset.duplicateWarning, undefined, `${locale}: the duplicate box is gone`)
  }
})

test("asset register bulk update: one of the two changes and the reason are errors on submit, apply is enabled, and a refusal stays in the dialog (v-track A3)", () => {
  const source = read(`${C}assets/asset-register-table.tsx`)
  assertMovedForm(source, {
    handler: "submitBulkUpdate",
    table: "BULK_FIELD_IDS",
    hook: "bulkErrors",
    ids: { toLocationId: "asset-bulk-location", toCustodianId: "asset-bulk-custodian", reason: "asset-bulk-reason" },
  })
  const rules = functionBody(source)
  for (const rule of [
    'check("toLocationId", atLeastOne([values.toLocationId, values.toCustodianId]) ? "bulkUpdateFieldRequired" : null)',
    'check("reason", required(values.reason) ?? maxLength(values.reason, 500))',
  ]) assert.ok(rules.includes(rule), rule)
  // A content rule, not a gate (spec §4.4): apply is enabled. An empty selection cannot open the dialog.
  assert.match(source, /<Button type="submit" busy=\{bulkSaving\}>/)
  assert.doesNotMatch(source, /disabled=\{!bulkForm\.toLocationId/)
  assert.match(source, /if \(selectedAssets\.length === 0\) return\n\s+bulkErrors\.setErrors\(validate\(bulkForm\)\)\n\s+if \(focusBulkError\(\)\) return/)
  assert.ok(source.includes('<Field label={labels.currentLocation} id="asset-bulk-location" error={bulkErrors.message("toLocationId")}>'))
  assert.ok(source.includes('<Field label={labels.custodian} id="asset-bulk-custodian" error={bulkErrors.message("toCustodianId")}>'))
  assert.ok(source.includes('<Field label={labels.reason} id="asset-bulk-reason" required error={bulkErrors.message("reason")}>'))
  // The two changes are one rule and clear together; each opening starts without errors (spec §4.3).
  assert.match(source, /if \(field === "toLocationId" \|\| field === "toCustodianId"\) bulkErrors\.clear\("toLocationId", "toCustodianId"\)/)
  assert.match(source, /function openBulkUpdate\(\) \{\n\s+bulkErrors\.setErrors\(\{\}\)/)
  assert.match(source, /if \(bulkErrors\.applyServer\(payload\) && focusBulkError\(\)\) return\n\s+throw new Error\(payload\?\.error \?\? labels\.bulkUpdateFailed\)/)
})

test("component install and removal: the details step and the removal dialog are forms that check themselves, and a refusal returns to the details step (v-track A4)", () => {
  const source = read(`${C}assets/asset-component-manager.tsx`)
  assertMovedForm(source, {
    handler: "openReview",
    table: "INSTALL_FIELD_IDS",
    hook: "installErrors",
    ids: {
      componentRole: "component-install-role",
      slotNo: "component-install-slot",
      installedAt: "component-install-installed-at",
      reason: "component-install-reason",
    },
  })
  const rules = functionBody(source)
  for (const rule of [
    'check("componentRole", required(values.componentRole) ?? maxLength(values.componentRole, 100))',
    'check("slotNo", maxLength(values.slotNo, 50))',
    'check("reason", maxLength(values.reason, 500))',
  ]) assert.ok(rules.includes(rule), rule)
  // The role is required by the server, so it shows the star; the continue button submits the details step.
  assert.ok(source.includes('<Field label={labels.componentRole} id="component-install-role" required error={installErrors.message("componentRole")}>'))
  assert.match(source, /<form onSubmit=\{openReview\} noValidate className="space-y-4">/)
  assert.match(source, /<Button type="submit">\n\s+<CheckCircle2 aria-hidden="true" \/>\n\s+\{labels\.continueReview\}/)
  // A multi-step flow goes back to the step that owns the field (spec §4.2).
  assert.match(source, /reveal: \(\) => setInstallStep\("details"\)/)
  assert.match(source, /if \(installErrors\.applyServer\(payload\) && focusInstallError\(\)\) return\n\s+throw new Error\(payload\?\.error \?\? labels\.error\)/)
  assert.match(source, /async function installComponent\(\) \{\n\s+\/\/[^\n]*\n\s+if \(!selectedComponent\) return\n/)
  // The removal dialog is a form too: its optional reason keeps its maxLength; the server has no rule for it.
  assert.match(source, /<form onSubmit=\{handleSubmit\} noValidate className=\{accessibleDialogFormClasses\}>/)
  assert.match(functionBody(source, "validateRemoval"), /const code = maxLength\(reason, 500\)/)
  assert.match(source, /removeErrors\.setErrors\(validateRemoval\(reason\)\)\n\s+if \(removeErrors\.focusFirst\(\["reason"\], \{ idFor: \(\) => "component-remove-reason" \}\)\) return/)
  assert.match(source, /<Button type="submit" variant="destructive" busy=\{busy\}>/)
  assert.doesNotMatch(source, /\btoast\.(?:error|warning)\(/)
})

test("status correction: the reason's 5 characters are an error on submit with its numbers, and the confirm is enabled (v-track A5)", () => {
  const source = read(`${C}assets/asset-status-correction-dialog.tsx`)
  assertMovedForm(source, { ids: { reason: "asset-status-correction-reason" } })
  assert.ok(functionBody(source).includes('check("reason", required(values.reason) ?? minLength(values.reason, 5) ?? maxLength(values.reason, 500))'))
  // A content rule, not a gate (spec §4.4): the dialog holds a form and its confirm is enabled (group 1 asset detail task 8A).
  assert.match(source, /<form onSubmit=\{handleSubmit\} noValidate className=\{accessibleDialogFormClasses\}>/)
  assert.match(source, /<Button type="submit" busy=\{isSubmitting\}>/)
  assert.doesNotMatch(source, /(?<![\w-])disabled=\{/)
  // The field says its numbers and shows the star; the server's other refusals keep the error line under it.
  assert.match(source, /<Field\s+label=\{labels\.reason\}\s+required\s+error=\{fieldErrors\.errors\.reason \? validationMessage\(fieldErrors\.errors\.reason, \{ min: 5, max: 500 \}\) : undefined\}\s*>/)
  assert.match(source, /if \(fieldErrors\.applyServer\(payload\) && focusFirstError\(\)\) return\n\s+setError\(payload\?\.error \?\? labels\.errorFallback\)/)
  assert.match(source, /\{error \? <p className="mt-2 text-sm text-danger"><ApiErrorText error=\{error\} \/><\/p> : null\}/)
})

test("import wizard: a picked file is its one rule, and the import waits for a ready row, focusable and tied to the counts (v-track A6)", () => {
  const source = read(`${C}assets/asset-import-preview-panel.tsx`)
  // No field a person types: validate() states the wizard's prerequisite; the file's own rules stay the server's (_form).
  assert.match(functionBody(source), /^function validate\(file: File \| undefined\): string \| null \{\n\s+return required\(file\)$/)
  assert.match(source, /if \(validate\(file\) \|\| !file\) \{\n\s+setError\(labels\.fileRequired\)/)
  // A prerequisite keeps its gate and says why (spec §4.4): aria-disabled, tied to the counts beside the button.
  assert.match(source, /const noReadyRows = preview\?\.summary\.readyRows === 0\n/)
  assert.match(source, /<p id="asset-import-ready-summary" className="text-sm text-muted-foreground">/)
  assert.match(source, /aria-disabled=\{noReadyRows \|\| undefined\}\n\s+aria-describedby=\{noReadyRows \? "asset-import-ready-summary" : undefined\}/)
  assert.doesNotMatch(source, /disabled=\{preview\.summary\.readyRows === 0\}/)
  assert.match(source, /if \(!selectedFile \|\| !preview \|\| preview\.summary\.readyRows === 0\) return/)
})

test("label print: the toolbar is a form whose reason shows its error under the row, and the queue's created dates hold their order (v-track A7)", () => {
  const source = read(`${C}assets/asset-label-print.tsx`)
  assertMovedForm(source, { handler: "handlePrint", ids: { reason: "asset-label-print-reason" } })
  assert.ok(functionBody(source).includes('check("reason", maxLength(values.reason, 500))'))
  assert.match(source, /event\.preventDefault\(\)\n\s+if \(recordingPrint \|\| assetIds\.length === 0\) return\n\s+fieldErrors\.setErrors\(validate\(\{ reason: printReason \}\)\)/)
  assert.match(source, /<Button type="submit" size="lg" busy=\{recordingPrint\} className="w-full sm:w-auto">/)
  // The boxed reason (2C K21) takes the error look itself, ties its error line, and turns teal on focus.
  assert.match(source, /fieldErrors\.errors\.reason && "border-danger ring-1 ring-danger shadow-field-error",/)
  assert.match(source, /aria-invalid=\{fieldErrors\.errors\.reason \? true : undefined\}\n\s+aria-describedby=\{fieldErrors\.errors\.reason \? "asset-label-print-reason-error" : undefined\}/)
  assert.ok(source.includes('{fieldErrors.errors.reason ? <FieldError id="asset-label-print-reason-error">{fieldErrors.message("reason")}</FieldError> : null}'))
  assert.match(source, /if \(fieldErrors\.applyServer\(payload\) && focusFirstError\(\)\) return\n\s+throw new Error\("Unable to record label print"\)/)
  // The print queue's filter: the end cannot be picked before the start (spec U4, §7.4); a filter has no validate().
  const queue = read(`${C}assets/asset-label-batch-tool.tsx`)
  assert.match(queue, /value=\{queueFilters\.createdFrom\}\n\s+max=\{queueFilters\.createdTo \|\| undefined\}/)
  assert.match(queue, /value=\{queueFilters\.createdTo\}\n\s+min=\{queueFilters\.createdFrom \|\| undefined\}/)
})
