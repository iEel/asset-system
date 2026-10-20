import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import test from "node:test"

// Batch 1e of UI phase 2C: the asset forms on the shared Field, Button, dialog and choice primitives.
// tests/form-migration-guards.test.ts checks what every migrated file shares; this file pins what is particular
// to these forms. Sources are read with LF line endings, so the regexes below may contain \n.
const read = (path: string) => readFileSync(path, "utf8").replace(/\r\n/g, "\n")
const assetMessages = (locale: "th" | "en") =>
  (JSON.parse(readFileSync(`messages/${locale}.json`, "utf8")) as { asset: Record<string, unknown> }).asset

test("asset form: status and condition keep their help button beside the label, outside the <label> (K2, I4)", () => {
  const source = read("src/components/assets/asset-form.tsx")
  assert.match(
    source,
    /label=\{t\("status"\)\}\n\s*id="asset-status"\n\s*required\n\s*labelAction=\{<AssetStateHelpPopover \{\.\.\.assetStatusHelp\} \/>\}\n\s*hint=\{selectedStatus\?\.description\}/,
  )
  assert.match(source, /label=\{t\("condition"\)\}\n\s*id="asset-condition"\n\s*required\n\s*labelAction=\{<AssetStateHelpPopover \{\.\.\.assetConditionHelp\} \/>\}/)
  assert.equal(source.match(/<NativeSelect value=\{values\.(?:statusId|conditionId)\} required /g)?.length, 2, "both selects keep native required (K4)")
  assert.doesNotMatch(source, /function AssetStateFieldLabel|function Field\(/)
})

test("asset form: the duplicate tag and serial errors belong to their fields (K4 a)", () => {
  const source = read("src/components/assets/asset-form.tsx")
  // A save that finds a duplicate shows the same line; any other error of the field shows in its place (v-track plan 2 A1).
  // The live region reads only the duplicate check's own text (v-track final task 3).
  assert.match(source, /label=\{t\("assetTag"\)\}\n\s*id="asset-tag"\n\s*liveError=\{duplicateState\.assetTagExists \? t\("duplicateAssetTag"\) : null\}\n\s*error=\{duplicateState\.assetTagExists \? t\("duplicateAssetTag"\) : errorText\("assetTag"\)\}\n\s*>/)
  assert.match(source, /liveError=\{duplicateState\.serialNumberExists \? t\("duplicateSerialNumber"\) : null\}\n\s*error=\{duplicateState\.serialNumberExists \? t\("duplicateSerialNumber"\) : errorText\("serialNumber"\)\}\n\s*>\n\s*<ScannerTextInput/)
  assert.doesNotMatch(source, /text-xs font-medium text-danger/)
})

test("asset form: money fields carry their unit and the decimal keypad; the new purchase document row has visible labels (K26, I34)", () => {
  const source = read("src/components/assets/asset-form.tsx")
  assert.match(source, /<Field label=\{t\("purchasePriceBaht"\)\} id="asset-purchase-price" error=\{errorText\("purchasePrice"\)\}>\n\s*<Input type="number" min="0" step="0\.01" inputMode="decimal" /)
  assert.match(source, /<Field label=\{t\("purchaseDocumentAmountBaht"\)\} id="asset-purchase-document-amount" error=\{errorText\("purchaseDocumentAmount"\)\}>\n\s*<Input\n\s*type="number"\n\s*min="0"\n\s*step="0\.01"\n\s*inputMode="decimal"/)
  // The visible labels stay; the number gains its id and its error (v-track plan 2 A1).
  for (const key of ["documentType", "purchaseDocumentNo", "purchaseDocumentDate"]) {
    assert.match(source, new RegExp(`<Field label=\\{t\\("${key}"\\)\\}[ >]`), key)
  }
  assert.doesNotMatch(source, /placeholder=\{t\("purchaseDocument(?:No|Amount)"\)\}/, "a placeholder is not a label (K20)")

  const th = assetMessages("th")
  const en = assetMessages("en")
  assert.equal(th.purchasePriceBaht, "ราคาซื้อ (บาท)")
  assert.equal(en.purchasePriceBaht, "Purchase Price (THB)")
  assert.equal(th.purchaseDocumentAmountBaht, "ยอดรวม (บาท)")
  assert.equal(en.purchaseDocumentAmountBaht, "Total amount (THB)")
  assert.equal(th.purchaseDocumentDate, "วันที่เอกสาร")
  assert.equal(en.purchaseDocumentDate, "Document Date")
  // Read-only labels keep the old keys: the values they show already carry ฿ (I33).
  assert.equal(th.purchasePrice, "ราคาซื้อ")
  assert.equal(en.purchasePrice, "Purchase Price")
})

test("asset form: every button is a Button, the repeater's remove button fits an auto column, and the warning link keeps its underline", () => {
  const source = read("src/components/assets/asset-form.tsx")
  assert.doesNotMatch(source, /<button\b/)
  assert.match(source, /sm:grid-cols-\[minmax\(0,0\.85fr\)_minmax\(0,1\.15fr\)_auto\]/)
  assert.match(source, /<Button\n\s*variant="outline"\n\s*size="icon-lg"\n\s*className="justify-self-start"/)
  assert.equal(source.match(/variant="danger"\n\s*size="icon-sm"/g)?.length, 2, "the 2 queued-file remove icons stay red (2A ย15)")
  assert.match(
    source,
    /<Link href=\{repairWorkflowHref\} className=\{cn\(linkVariants\(\{ size: "inherit" \}\), "mt-2 inline-flex decoration-current"\)\}>/,
  )
})

test("asset batch form: row fields are named by Field and their help, not by aria-label help text (K20)", () => {
  const source = read("src/components/assets/asset-batch-form.tsx")
  // Each row field has its id (card or table row) and its live error (v-track plan 2 A2).
  assert.match(source, /<Field label=\{t\("batchAssetTag"\)\} id=\{rowFieldId\(index, "assetTag", "card"\)\} hint=\{t\("batchAssetTagHelp"\)\} liveError=\{rowLiveError\(index, "assetTag"\)\} error=\{rowError\(index, "assetTag"\)\}>/)
  assert.match(source, /<Field label=\{t\("batchAssetTag"\)\} id=\{rowFieldId\(index, "assetTag", "row"\)\} hideLabel hint=\{t\("batchAssetTagHelp"\)\} liveError=\{rowLiveError\(index, "assetTag"\)\} error=\{rowError\(index, "assetTag"\)\}>/)
  assert.match(source, /<Field label=\{t\("batchSerialNumber"\)\} id=\{rowFieldId\(index, "serialNumber", "row"\)\} hideLabel hint=\{t\("batchPasteSerialHint"\)\} liveError=\{rowLiveError\(index, "serialNumber"\)\} error=\{rowError\(index, "serialNumber"\)\}>\n\s*<ScannerTextInput /)
  assert.match(source, /<Field label=\{t\("batchRemark"\)\} hideLabel>/)
  assert.doesNotMatch(source, /aria-label=\{t\("batchAssetTagHelp"\)\}/)
  assert.match(source, /<Field label=\{t\("purchasePriceBaht"\)\} id="asset-batch-purchase-price" error=\{errorText\("common\.purchasePrice"\)\}>\n\s*<Input type="number" min="0" step="0\.01" inputMode="decimal" /)
  assert.match(source, /<fieldset className="min-w-0" aria-describedby=\{optionalColumnsHelpId\}>\n\s*<legend className=\{fieldLabelClasses\}>\{t\("batchOptionalColumns"\)\}<\/legend>/)
})

test("asset batch form: the duplicate check and the save button are busy without a label swap (K13)", () => {
  const source = read("src/components/assets/asset-batch-form.tsx")
  // While the rows hold a duplicate the check waits, focusable with its reason (v-track plan 2 task 31d).
  assert.match(source, /busy=\{checkingDuplicates\}\n\s*aria-disabled=\{hasClientDuplicates \|\| undefined\}\n\s*aria-describedby=\{hasClientDuplicates \? "asset-batch-row-count" : undefined\}\n\s*>\n\s*\{t\("batchCheckDuplicates"\)\}/)
  // A duplicate is an error under its row now, so it does not gate the save (v-track plan 2 A2).
  assert.match(source, /<Button type="submit" className="w-full sm:w-auto" busy=\{saving\}>/)
  assert.doesNotMatch(source, /batchCheckDuplicatesRunning|<button\b|inputClassName/)
})

test("component install: step rail labels, real buttons, primary last, and Back on the review step (K17, I24, I32)", () => {
  const manager = read("src/components/assets/asset-component-manager.tsx")
  const page = read("src/app/[locale]/(dashboard)/assets/[id]/components/page.tsx")
  assert.match(manager, /const installStepOrder: readonly InstallStep\[\] = \["identify", "details", "review"\]/)
  assert.match(manager, /getLinearStepStates\(installStepOrder\.length, installStepOrder\.indexOf\(installStep\)\)/)
  assert.match(manager, /steps: \{ label: string; identify: string; details: string; review: string \}/)
  assert.match(
    page,
    /steps: \{\n\s*label: t\("componentInstallSteps"\),\n\s*identify: t\("componentStepIdentify"\),\n\s*details: t\("componentStepDetails"\),\n\s*review: t\("componentStepReview"\),\n\s*\},/,
  )
  assert.doesNotMatch(manager, /flex-col-reverse/)
  assert.equal(manager.match(/<div className="flex flex-col gap-2 sm:flex-row sm:justify-end">/g)?.length, 2)
  assert.match(manager, /onClick=\{\(\) => setInstallStep\("details"\)\}>\n\s*\{labels\.back\}/)
  assert.match(manager, /<Button busy=\{saving\} onClick=\{\(\) => void installComponent\(\)\}>/)
  assert.doesNotMatch(manager, /labels\.(?:installing|removing)\b/)
  assert.match(manager, /aria-label=\{labels\.scanOrSearch\}/)

  const th = assetMessages("th")
  const en = assetMessages("en")
  assert.deepEqual(
    [th.componentInstallSteps, th.componentStepIdentify, th.componentStepDetails, th.componentStepReview],
    ["ขั้นตอนติดตั้งส่วนควบ", "เลือกส่วนควบ", "ระบุรายละเอียด", "ตรวจสอบและยืนยัน"],
  )
  assert.deepEqual(
    [en.componentInstallSteps, en.componentStepIdentify, en.componentStepDetails, en.componentStepReview],
    ["Component installation steps", "Choose component", "Enter details", "Check and confirm"],
  )
})

test("component removal dialog uses the shared parts, a code tag in its description and a busy destructive confirm (K9, K11, K13)", () => {
  const manager = read("src/components/assets/asset-component-manager.tsx")
  // v-track plan 2 A4: the dialog is a form; the reason has its id and error, and the confirm submits it.
  assert.match(manager, /<AccessibleDialogBody className="space-y-4">\n\s*<Field label=\{labels\.removeReason\} id="component-remove-reason" error=\{removeErrors\.message\("reason"\)\}>\n\s*<Textarea\n\s*ref=\{reasonRef\}/)
  assert.match(
    manager,
    /<AccessibleDialogFooter>\n\s*<AccessibleDialogCancel>\{labels\.cancel\}<\/AccessibleDialogCancel>\n\s*<Button type="submit" variant="destructive" busy=\{busy\}>/,
  )
  assert.match(manager, /<span className="tag">\{component\.componentAsset\.assetTag\}<\/span> · \{component\.componentAsset\.name\}/)
  assert.doesNotMatch(manager, /closeLabel=/)
})

test("asset photos: the photo-type select has a visible label and the delete icons are busy buttons (K20)", () => {
  const source = read("src/components/assets/asset-attachments.tsx")
  assert.match(source, /<Field label=\{t\("photoType"\)\} className="mb-3">\n\s*<NativeSelect value=\{photoLabel\}/)
  assert.equal(source.match(/variant="danger"\s+size="icon-sm"/g)?.length, 2)
  assert.match(source, /busy=\{deletingId === attachment\.id\}/)
  assert.match(source, /busy=\{deleting\}/)
  assert.doesNotMatch(source, /Loader2|<select\b/)
  assert.doesNotMatch(source, /closeLabel=/, "the preview dialog's X already reads ปิด by default")

  assert.equal(assetMessages("th").photoType, "ประเภทรูป")
  assert.equal(assetMessages("en").photoType, "Photo type")
})

test("asset form: the location section is named for what it holds, and the photo section speaks to edit mode (critique 2026-10-20 B3)", () => {
  const source = read("src/components/assets/asset-form.tsx")
  assert.match(source, /const isEdit = Boolean\(asset\?\.id\)/)
  const location = source.slice(source.indexOf('<Section title={t("locationStatus")}>'))
  const body = location.slice(0, location.indexOf("<Section", 10))
  assert.match(body, /homeLocationId/); assert.match(body, /currentLocation/); assert.match(body, /t\("status"\)/); assert.match(body, /t\("condition"\)/)
  assert.doesNotMatch(body, /custodianId/)
  assert.doesNotMatch(source, /locationCustodian/)
  assert.match(source, /<Section title=\{t\(isEdit \? "assetPhotos" : "initialAssetPhotos"\)\}>/)
  assert.match(source, /\{t\(isEdit \? "assetPhotosEditHelp" : "initialAssetPhotosHelp"\)\}/)
  for (const locale of ["th", "en"] as const) {
    const m = assetMessages(locale)
    assert.equal(m.locationCustodian, undefined)
    assert.doesNotMatch(String(m.assetPhotosEditHelp), /หลังสร้าง|after the asset is created/)
  }
  assert.equal(assetMessages("th").locationStatus, "ที่ตั้งและสถานะ")
  assert.equal(assetMessages("en").locationStatus, "Location & Status")
  assert.equal(assetMessages("th").assetPhotosEditHelp, "ถ่ายหรือแนบรูปตามรายการรูปที่ต้องถ่าย เช่น ป้ายรหัสทรัพย์สิน, Serial Number หรือสภาพเครื่อง รูปจะถูกบันทึกเมื่อกดบันทึก")
})
