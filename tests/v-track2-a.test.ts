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
    'check("licenseTotalSeats", range(values.licenseTotalSeats, 0) ?? pattern(String(values.licenseTotalSeats ?? ""), /\\d+/))',
    'check("licenseUsedSeats", range(values.licenseUsedSeats, 0) ?? pattern(String(values.licenseUsedSeats ?? ""), /\\d+/) ?? seatsExceeded(values))',
    'check("parentAssetId", ownershipType === "component" && required(install.parentAssetId) ? "componentParentRequired" : null)',
    'check("componentRole", install.parentAssetId && required(install.componentRole) ? "componentRoleRequired" : maxLength(install.componentRole, 100))',
    'check("purchasePrice", range(values.purchasePrice, 0))',
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
  assert.match(source, /liveError\n\s+error=\{duplicateState\.assetTagExists \? t\("duplicateAssetTag"\) : errorText\("assetTag"\)\}/)
  assert.match(source, /liveError\n\s+error=\{duplicateState\.serialNumberExists \? t\("duplicateSerialNumber"\) : errorText\("serialNumber"\)\}/)
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
