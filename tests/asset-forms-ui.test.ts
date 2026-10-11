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
    /<Field label=\{t\("status"\)\} required labelAction=\{<AssetStateHelpPopover \{\.\.\.assetStatusHelp\} \/>\} hint=\{selectedStatus\?\.description\}>/,
  )
  assert.match(source, /label=\{t\("condition"\)\}\n\s*required\n\s*labelAction=\{<AssetStateHelpPopover \{\.\.\.assetConditionHelp\} \/>\}/)
  assert.equal(source.match(/<NativeSelect value=\{values\.(?:statusId|conditionId)\} required /g)?.length, 2, "both selects keep native required (K4)")
  assert.doesNotMatch(source, /function AssetStateFieldLabel|function Field\(/)
})

test("asset form: the duplicate tag and serial errors belong to their fields (K4 a)", () => {
  const source = read("src/components/assets/asset-form.tsx")
  assert.match(source, /<Field label=\{t\("assetTag"\)\} error=\{duplicateState\.assetTagExists \? t\("duplicateAssetTag"\) : undefined\}>/)
  assert.match(source, /error=\{duplicateState\.serialNumberExists \? t\("duplicateSerialNumber"\) : undefined\}>\n\s*<ScannerTextInput/)
  assert.doesNotMatch(source, /text-xs font-medium text-danger/)
})

test("asset form: money fields carry their unit and the decimal keypad; the new purchase document row has visible labels (K26, I34)", () => {
  const source = read("src/components/assets/asset-form.tsx")
  assert.match(source, /<Field label=\{t\("purchasePriceBaht"\)\}>\n\s*<Input type="number" min="0" step="0\.01" inputMode="decimal" /)
  assert.match(source, /<Field label=\{t\("purchaseDocumentAmountBaht"\)\}>\n\s*<Input\n\s*type="number"\n\s*min="0"\n\s*step="0\.01"\n\s*inputMode="decimal"/)
  for (const key of ["documentType", "purchaseDocumentNo", "purchaseDocumentDate"]) {
    assert.match(source, new RegExp(`<Field label=\\{t\\("${key}"\\)\\}>`), key)
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
  assert.match(source, /<Button\n\s*variant="outline"\n\s*size="icon"\n\s*className="justify-self-start"/)
  assert.equal(source.match(/variant="danger"\n\s*size="icon-sm"/g)?.length, 2, "the 2 queued-file remove icons stay red (2A ย15)")
  assert.match(
    source,
    /<Link href=\{repairWorkflowHref\} className=\{cn\(linkVariants\(\{ size: "inherit" \}\), "mt-2 inline-flex decoration-current"\)\}>/,
  )
})
