import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import test from "node:test"

// The edit page shows what changed (group 4 plan 2 Task 8, spec §7.1, §7.3, §7.5; P2-R4, P2-R7): a changed field has a
// frame, "แก้แล้ว", "เดิม: …" and คืนค่าเดิม; the footer's "แก้ไข n ช่อง" opens the list (a Popover on the desktop, a Sheet
// below 768 px); a room, holder or แผนก the person changed needs "เหตุผลที่แก้"; the PUT sends the reason and no isActive.
const C = "src/components/assets/"
const read = (file: string) => readFileSync(file, "utf8").replace(/\r\n/g, "\n")
const messages = (locale: "th" | "en") => JSON.parse(readFileSync(`messages/${locale}.json`, "utf8"))

test("the words, as the brief gives them, in Thai and English, with a glossary row", () => {
  const th = messages("th").asset
  const en = messages("en").asset
  assert.equal(th.fieldChanged, "แก้แล้ว")
  assert.equal(th.fieldWas, "เดิม: {value}")
  assert.equal(th.restoreField, "คืนค่าเดิม")
  // The th count writes {count, number} (tests/i18n-plural-count.test.ts); it reads "แก้ไข 3 ช่อง".
  assert.equal(th.changeCount, "แก้ไข {count, number} ช่อง")
  assert.match(en.changeCount, /^\{count, plural, /)
  assert.equal(th.goToField, "ไปที่ช่อง")
  assert.equal(th.followsHolderFix, "ปรับตามผู้ถือครอง")
  assert.equal(th.correctionReasonLabel, "เหตุผลที่แก้")
  assert.equal(th.correctionReasonRequired, "ระบุเหตุผลที่แก้")
  assert.equal(th.departmentMismatchLater, "แผนกไม่ตรงกับผู้ถือครอง จะปรับเมื่อรับคืนหรือโอนย้าย")
  assert.equal(th.changeListReason, "เหตุผลที่แก้: {reason}")
  for (const key of ["fieldChanged", "fieldWas", "restoreField", "changeCount", "goToField", "followsHolderFix", "correctionReasonLabel", "correctionReasonRequired", "departmentMismatchLater", "changeListReason", "changeTo"]) {
    assert.equal(typeof th[key], "string", `th asset.${key}`)
    assert.equal(typeof en[key], "string", `en asset.${key}`)
  }
  const glossary = read("docs/19_THAI_GLOSSARY.md")
  const row = glossary.split("\n").find((line) => line.includes("**แก้แล้ว**"))
  assert.ok(row, "a glossary row for แก้แล้ว")
  for (const word of ["เดิม:", "คืนค่าเดิม", "แก้ไข n ช่อง", "ไปที่ช่อง", "ปรับตามผู้ถือครอง"]) assert.ok(row.includes(word), word)
})

test("a changed field: its frame, แก้แล้ว, เดิม: <old value> and คืนค่าเดิม; the automatic แผนก says ปรับตามผู้ถือครอง", () => {
  const source = read(`${C}asset-form-changed-field.tsx`)
  assert.match(source, /export type AssetFieldChange = \{ was: string; automatic: boolean; onRestore\?: \(\) => void \}/)
  assert.match(source, /export function AssetFormChangedField\(\{ change, children \}: \{ change: AssetFieldChange \| null; children: ReactNode \}\)/)
  assert.match(source, /if \(!change\) return <>\{children\}<\/>/)
  assert.match(source, /className="grid min-w-0 content-start gap-2 rounded-md border border-primary-border p-3"/)
  assert.match(source, /<span className="font-medium text-primary">\{t\("fieldChanged"\)\}<\/span>/)
  assert.match(source, /\{t\("fieldWas", \{ value: change\.was \}\)\}/)
  assert.match(source, /change\.automatic \? \(\n\s+<span>\{t\("followsHolderFix"\)\}<\/span>\n\s+\) : change\.onRestore \? \(\n\s+<Button variant="ghost" size="sm" onClick=\{change\.onRestore\}>\n\s+\{t\("restoreField"\)\}/)

  // Every field the edit page can change in the main card, the License panel, การจัดซื้อ and the remark is wrapped.
  const wrapped = (file: string) => [...read(file).matchAll(/<AssetFormChangedField change=\{changeOf\("(\w+)"\)\}>/g)].map((match) => match[1])
  assert.deepEqual(wrapped(`${C}asset-form.tsx`), [
    "assetTag", "name", "categoryId", "brandId", "modelId", "serialNumber", "homeLocationId", "currentLocationId", "statusId", "conditionId",
    "licenseTotalSeats", "licenseUsedSeats", "licenseAssignedAssetId",
  ])
  assert.deepEqual(wrapped(`${C}asset-form-ownership.tsx`), ["ownershipType", "companyId", "branchId", "departmentId", "custodianId"])
  assert.deepEqual(wrapped(`${C}asset-form-purchase.tsx`), [
    "purchaseDate", "purchasePrice", "supplierId", "warrantyStartDate", "warrantyEndDate", "fixedAssetCode", "poNumber", "invoiceNumber",
  ])
  assert.deepEqual(wrapped(`${C}asset-form-other.tsx`), ["remark"])
  // The ids ไปที่ช่อง focuses for the fields that have no FIELD_IDS row.
  assert.match(read(`${C}asset-form.tsx`), /<SelectField label=\{t\("brand"\)\} id="asset-brand"/)
  assert.match(read(`${C}asset-form.tsx`), /<SelectField label=\{t\("model"\)\} id="asset-model"/)
  assert.match(read(`${C}asset-form.tsx`), /label=\{t\("licenseAssignedAsset"\)\}\n\s+id="asset-license-assigned-asset"/)
  assert.match(read(`${C}asset-form-purchase.tsx`), /<SelectField label=\{t\("supplier"\)\} id="asset-supplier"/)
  assert.match(read(`${C}asset-form-other.tsx`), /<Field label=\{t\("remark"\)\} id="asset-remark">/)
})

test("the footer's แก้ไข n ช่อง opens the list: a Popover on the desktop, a Sheet below 768 px, with ไปที่ช่อง and the reason", () => {
  const source = read(`${C}asset-form-change-list.tsx`)
  assert.match(source, /import \{ Popover, PopoverContent, PopoverTrigger \} from "@\/components\/ui\/popover"/)
  assert.match(source, /import \{ Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger \} from "@\/components\/ui\/sheet"/)
  assert.match(source, /const isDesktop = useMediaQuery\("\(min-width: 768px\)"\)/)
  assert.match(source, /const title = t\("changeCount", \{ count: changes\.length \}\)/)
  assert.match(source, /<SheetContent side="bottom"/)
  assert.match(source, /<PopoverContent align="start"/)
  // ไปที่ช่อง closes the list without handing focus back to the trigger, then the form opens the section and focuses the field.
  assert.match(source, /onCloseAutoFocus=\{keepFocusOnField\}/)
  assert.match(source, /\{t\("goToField"\)\}/)
  assert.match(source, /change\.automatic \? <span>\{t\("followsHolderFix"\)\}<\/span> :/)
  assert.match(source, /\{reason \? <p className="[^"]*">\{t\("changeListReason", \{ reason \}\)\}<\/p> : null\}/)
  assert.match(source, /<span className="sr-only">\{t\("changeTo"\)\}<\/span>/)
  // No bar of its own: the shared Sheet owns the bottom edge (tests/form-migration-guards.test.ts GL1).
  for (const file of ["asset-form", "asset-form-change-list", "asset-form-changed-field", "asset-form-ownership", "asset-form-purchase", "asset-form-other"]) {
    const text = read(`${C}${file}.tsx`)
    assert.doesNotMatch(text, /"[^"\n]*\bfixed\b[^"\n]*\bbottom-[^"\n]*"/, file)
    assert.doesNotMatch(text, /<button\b/, file)
  }

  const form = read(`${C}asset-form.tsx`)
  assert.match(form, /\{showChanges \? <AssetFormChangeList changes=\{changeRows\} reason=\{correctionReason\.trim\(\)\} onGoToField=\{goToField\} \/> : null\}/)
  assert.match(form, /<span id="asset-save-reason">\{t\("duplicateCheckPending"\)\}<\/span>/)
  assert.match(form, /const showChanges = isEdit && changes\.length > 0/)
  assert.match(form, /function goToField\(field: AssetDiffField\) \{\n\s+openSection\(sectionOfChange\(field\)\)\n\s+requestAnimationFrame\(\(\) => \{\n\s+void waitForElement\(changeFieldId\(field, selectedCustomFieldDefinitions\)\)\.then\(\(element\) => \{\n\s+if \(element\) focusField\(element\)/)
})

test("the diff reads the stored asset, a section with a change has the changed frame and opens once", () => {
  const form = read(`${C}asset-form.tsx`)
  assert.match(form, /const correction = isEdit && asset \? getAssetEditCorrection\(\{ original: asset, values, departmentLocked: departmentLock\.locked \}\) : NO_CORRECTION/)
  assert.match(form, /const changes = isEdit && asset \? diffAssetFormValues\(asset, values, \{ departmentAutomatic: correction\.departmentAutomatic \}\) : NO_CHANGES/)
  assert.match(form, /tone: sectionsWithErrors\.has\(section\) \? "error" : sectionsWithChanges\.has\(section\) \? "changed" : "default"/)
  // A section opens when a change first shows in it; the person may fold it again.
  assert.match(form, /const newlyChanged = \[\.\.\.sectionsWithChanges\]\.filter\(\(section\) => !changedSectionsSeen\.has\(section\)\)/)
  assert.doesNotMatch(form, /open: openSections\.has\(section\) \|\|/)
})

test("the reason: in the main card when the room, holder or แผนก is changed by the person; validate() asks for it; the PUT sends it and no isActive", () => {
  const form = read(`${C}asset-form.tsx`)
  assert.match(form, /const showCorrectionReason = isEdit && \(correction\.reasonNeeded \|\| Boolean\(fieldErrors\.errors\.correctionReason\)\)/)
  assert.match(form, /<Field label=\{t\("correctionReasonLabel"\)\} id="asset-correction-reason" required error=\{errorText\("correctionReason"\)\}>\n\s+<Textarea\n\s+value=\{correctionReason\}/)
  assert.match(form, /maxLength=\{500\}\n\s+required/)
  const locationGroup = form.slice(form.indexOf('<CardGroup title={t("locationStatus")}>'), form.indexOf("</CardGroup>", form.indexOf('<CardGroup title={t("locationStatus")}>')))
  assert.ok(locationGroup.includes('id="asset-correction-reason"'), "the reason sits in the main card, under the room and status rows")
  assert.match(form, /correction: showCorrectionReason \? \{ required: true, reason: correctionReason \} : undefined,/)
  // The server's refusal (Task 3: fieldErrors { correctionReason: "required" }) reads the same words under the field.
  assert.match(form, /if \(key === "correctionReason" && code === "required"\) return t\("correctionReasonRequired"\)/)
  assert.match(form, /body: JSON\.stringify\(isEdit \? assetEditBody\(values, showCorrectionReason \? correctionReason : ""\) : values\),/)
  assert.match(form, /function assetEditBody\(values: AssetFormValues, reason: string\) \{\n\s+const body: Partial<AssetFormValues> & \{ correctionReason\?: string \} = \{ \.\.\.values \}\n\s+delete body\.isActive\n\s+const correctionReason = reason\.trim\(\)\n\s+if \(correctionReason\) body\.correctionReason = correctionReason\n\s+return body\n\}/)
  const rules = read("src/lib/asset-form-rules.ts")
  assert.match(rules, /check\("correctionReason", correction\?\.required && required\(correction\.reason\) \? "correctionReasonRequired" : maxLength\(correction\?\.reason, 500\)\)/)
})

test("an open handover with a แผนก that does not match the holder says it is fixed later", () => {
  const form = read(`${C}asset-form.tsx`)
  assert.match(form, /const departmentMismatchLater =\n\s+custodyLocked &&\n\s+departmentFollowsHolder\(ownershipType\) &&\n\s+Boolean\(values\.custodianId\) &&\n\s+Boolean\(editContext\?\.holderDepartmentId\) &&\n\s+editContext\?\.holderDepartmentId !== \(values\.departmentId \|\| null\)/)
  const ownership = read(`${C}asset-form-ownership.tsx`)
  assert.match(ownership, /hint=\{departmentMismatchLater \? t\("departmentMismatchLater"\) : undefined\}/)
})
