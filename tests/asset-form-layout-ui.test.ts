import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import test from "node:test"

// Group 4 plan 2 Task 6a (spec §8, P2-R7, P2-R11): the create layout. The header holds the title, the hint line and the
// single/batch switch; the required fields sit in one card with a counter and a bar; the optional sections fold, each
// with a summary and a count; เอกสารจัดซื้อ is its own section, open; the footer names what is still missing. The
// working tree is CRLF on Windows: every read strips \r before the multi-line regexes.
const C = "src/components/assets/"
const read = (path: string) => readFileSync(path, "utf8").replace(/\r\n/g, "\n")
const messages = (locale: "th" | "en") => JSON.parse(readFileSync(`messages/${locale}.json`, "utf8")) as { asset: Record<string, unknown> }

test("the create header: the title, the hint line and the workspace's single/batch switch in its actions", () => {
  const header = read(`${C}asset-form-header.tsx`)
  // Task 7 adds the edit variant (edit: the code, status, holder, room and the asset page link).
  assert.match(header, /export function AssetFormHeader\(\{\n\s+mode,\n\s+title,\n\s+backHref,\n\s+actions,\n\s+edit,\n\}: \{\n\s+mode: "create" \| "edit"\n\s+title: string\n\s+backHref: string\n\s+actions\?: ReactNode\n\s+edit\?: \{ assetTag: string; context: AssetEditContext \}\n\}\)/)
  assert.match(header, /<PageHeader\n\s+title=\{title\}\n\s+meta=\{mode === "create" \? t\("createRequiredHint"\) : edit \? <AssetFormEditMeta assetTag=\{edit\.assetTag\} context=\{edit\.context\} \/> : t\("subtitle"\)\}\n\s+actions=\{actions\}\n\s+className="mb-6"\n\s+back=\{<PageBackLink href=\{backHref\} label=\{tCommon\("back"\)\} \/>\}\n\s+\/>/)
  const form = read(`${C}asset-form.tsx`)
  assert.match(form, /<AssetFormHeader mode=\{isEdit \? "edit" : "create"\} title=\{title\} backHref=\{backHref\} actions=\{headerActions\} edit=\{headerEdit\} \/>/)
  const workspace = read(`${C}asset-create-workspace.tsx`)
  assert.match(workspace, /const modeSwitch = \(\n\s+<Segmented\n\s+aria-label=\{t\("createModeLabel"\)\}/)
  assert.match(workspace, /if \(mode === "single"\) return <AssetForm \{\.\.\.props\} headerActions=\{modeSwitch\} \/>/)
  // Batch mode stays reachable: the switch shows above the batch form.
  assert.match(workspace, /\{modeSwitch\}\n\s+<AssetBatchForm \{\.\.\.props\} \/>/)
  // The two modes draw the switch in different places: after a change focus moves to the new pressed button (final review).
  assert.match(workspace, /useEffect\(\(\) => \{\n\s+if \(shownMode\.current === mode\) return\n\s+shownMode\.current = mode\n\s+const group = `\[data-slot="segmented"\]\[aria-label="\$\{CSS\.escape\(t\("createModeLabel"\)\)\}"\]`\n\s+document\.querySelector<HTMLElement>\(`\$\{group\} \[aria-pressed="true"\]`\)\?\.focus\(\)\n\s+\}, \[mode, t\]\)/)
  // A written-off asset keeps its stored แผนก with the holder unchanged, as PUT does (final review).
  assert.match(form, /custodyFrozen: context \? isCustodyFrozen\(context\.statusName\) : false,/)
  assert.equal(messages("th").asset.createRequiredHint, "กรอกช่องที่มี * ในการ์ดแรกให้ครบก็บันทึกได้ ส่วนข้อมูลเพิ่มเติมเปิดกรอกเฉพาะเรื่องที่มีข้อมูล")
  assert.equal(typeof messages("en").asset.createRequiredHint, "string")
})

test("the required card: its title, the counter and a bar with no pace mark", () => {
  const card = read(`${C}asset-form-required-card.tsx`)
  assert.match(card, /const counterText = counter \? t\("requiredFilled", \{ filled: counter\.filled, total: counter\.total \}\) : null/)
  assert.match(card, /<PaceBar value=\{counter\.total > 0 \? counter\.filled \/ counter\.total : 0\} pace=\{null\} label=\{counterText \?\? ""\} behind=\{false\} \/>/)
  const form = read(`${C}asset-form.tsx`)
  // Task 7: on edit the card has no counter; its title is the create one (the user's decision, 2026-11-02).
  assert.match(form, /<AssetFormRequiredCard title=\{t\("requiredCardTitle"\)\} counter=\{isEdit \? null : requiredProgress\}>/)
  assert.match(form, /const requiredProgress = countRequiredFilled\(values, ownershipType\)/)
  // The three groups of the card, in order. Task 6b: the ownership group is its own file (asset-form-ownership.tsx).
  const order = ['<CardGroup title={t("basicInfo")}>', "<AssetFormOwnership", '<CardGroup title={t("locationStatus")}>'].map((tag) => form.indexOf(tag))
  assert.ok(order.every((at) => at > 0) && order[0] < order[1] && order[1] < order[2], "basic info, ownership, location and status")
  assert.match(read(`${C}asset-form-ownership.tsx`), /<CardGroup title=\{t\("ownership"\)\}>/)
  const th = messages("th").asset
  assert.equal(th.requiredCardTitle, "ข้อมูลที่ต้องกรอก")
  assert.equal(th.requiredFilled, "กรอกแล้ว {filled, number} จาก {total, number} ช่องที่ต้องกรอก")
  assert.equal(messages("en").asset.requiredFilled, "{filled, number} of {total, plural, one {# required field} other {# required fields}} filled")
})

test("the optional sections fold: each a FormDisclosure with a summary and a count, in the order of P2-R11", () => {
  const section = read(`${C}asset-form-section.tsx`)
  assert.match(section, /<FormDisclosure id=\{id\} title=\{title\} \{\.\.\.disclosure\}>/)
  const files = ["install", "purchase", "documents", "photos", "custom-fields", "other"]
  for (const name of files) assert.match(read(`${C}asset-form-${name}.tsx`), /<FoldedSection\b[^>]*disclosure=\{disclosure\}/, name)
  const form = read(`${C}asset-form.tsx`)
  const order = ["<AssetFormInstall", "<AssetFormPurchase", "<AssetFormDocuments", "<AssetFormPhotos", "<AssetFormCustomFields", "<AssetFormOther"].map((tag) => form.indexOf(tag))
  assert.ok(order.every((at, index) => at > 0 && (index === 0 || at > order[index - 1])), order.join(","))
  assert.ok(form.indexOf('<Section title={t("licenseManagement")}>') > form.indexOf("</AssetFormRequiredCard>"), "the License seats stay a plain panel after the card")
  assert.ok(form.indexOf('<Section title={t("licenseManagement")}>') < form.indexOf("<AssetFormInstall"))
  // The badge and the summary come from the pure summary of each section.
  assert.match(form, /badge: summary\.total > 0 \? t\("sectionFilled", \{ filled: summary\.filled, total: summary\.total \}\) : undefined/)
  assert.match(form, /const summary = summarizeAssetFormSection\(section, summaryInput\)/)
  // Task 8: a section with a change on the edit page has the changed frame (tests/asset-form-change-list-ui.test.ts).
  assert.match(form, /tone: sectionsWithErrors\.has\(section\) \? "error" : sectionsWithChanges\.has\(section\) \? "changed" : "default"/)
  const th = messages("th").asset
  assert.equal(th.sectionFilled, "กรอกแล้ว {filled, number} จาก {total, number} ช่อง")
  // The last section holds only the remark since the raw JSON editor left (2026-11-02): it reads หมายเหตุ.
  assert.equal(th.remark, "หมายเหตุ")
  assert.equal(th.otherAdvanced, undefined)
  assert.equal(th.customFieldsStructuredTitle, "รายละเอียดเฉพาะทรัพย์สิน")
})

test("เอกสารจัดซื้อ is its own section, open at first; #purchase opens การจัดซื้อและประกัน; an error opens its section", () => {
  const form = read(`${C}asset-form.tsx`)
  assert.match(form, /const \[openSections, setOpenSections\] = useState<Set<AssetFormSection>>\(\(\) => new Set<AssetFormSection>\(\["documents"\]\)\)/)
  assert.match(form, /if \(window\.location\.hash === "#purchase"\) openSectionNow\("purchase"\)/)
  assert.match(form, /reveal: \(key\) => openSection\(sectionOfField\(key\)\),/)
  const documents = read(`${C}asset-form-documents.tsx`)
  assert.match(documents, /<FoldedSection title=\{t\("purchaseDocuments"\)\} disclosure=\{disclosure\}>/)
  const purchase = read(`${C}asset-form-purchase.tsx`)
  assert.doesNotMatch(purchase, /purchaseDocument|FileDropzone|ChoiceCard/, "the documents box left the purchase section")
  assert.match(purchase, /<div id="purchase" className="scroll-mt-24">\s*<FoldedSection title=\{t\("purchaseWarranty"\)\} disclosure=\{disclosure\}>/)
})

test("the create footer: what is missing, a way to the first one, and the duplicate check's reason while it runs", () => {
  const form = read(`${C}asset-form.tsx`)
  // Look step L2: the field names show from sm only, so a 390 px phone's footer stays short; the count is one text.
  assert.match(form, /\{t\("requiredMissing", \{ count: requiredProgress\.missing\.length \}\)\}\r?\n\s+<span className="hidden sm:inline"> \{t\("requiredMissingFields", \{ fields: requiredProgress\.missing\.map\(\(field\) => t\(REQUIRED_FIELD_LABELS\[field\]\)\)\.join\(", "\) \}\)\}<\/span>/)
  assert.match(form, /<Button variant="ghost" size="sm" onClick=\{goToFirstMissing\}>\n\s+\{t\("goToFirstMissing"\)\}/)
  assert.match(form, /function goToFirstMissing\(\) \{\n\s+fieldErrors\.setErrors\(\{ \.\.\.fieldErrors\.errors, \.\.\.Object\.fromEntries\(requiredProgress\.missing\.map\(\(field\) => \[field, "required"\]\)\) \}\)\n\s+focusFirstError\(\)\n\s+\}/)
  assert.match(form, /<span id="asset-save-reason">\{t\("duplicateCheckPending"\)\}<\/span>/)
  // The missing line is the create form's; the save stays enabled (validate() focuses the first wrong field).
  assert.match(form, /const showMissing = !isEdit && requiredProgress\.missing\.length > 0/)
  assert.doesNotMatch(form, /disabled=\{[^}]*requiredProgress/)
  const th = messages("th").asset
  assert.equal(th.requiredMissing, "ยังขาด {count, number} ช่องที่ต้องกรอก")
  assert.equal(th.requiredMissingFields, "· {fields}")
  assert.equal(messages("en").asset.requiredMissingFields, "· {fields}")
  assert.doesNotMatch(String(messages("en").asset.requiredMissing), /\{fields\}/)
  assert.equal(th.goToFirstMissing, "ไปช่องแรกที่ยังขาด")
})

test("the isActive box and the photo add button are gone; a chosen photo joins the queue at once (P2-R7, spec §8)", () => {
  const parts = ["asset-form", "asset-form-custom-fields", "asset-form-other", "asset-form-photos"].map((name) => read(`${C}${name}.tsx`))
  for (const source of parts) {
    assert.doesNotMatch(source, /values\.isActive|setField\("isActive"|tCommon\("active"\)/)
    assert.doesNotMatch(source, /addAssetPhotoWithLabel|t\("addAssetPhoto"\)/)
  }
  const [form, , , photos] = parts
  assert.match(photos, /<FileDropzone\n\s+file=\{null\}\n\s+onFileChange=\{addAssetPhoto\}/)
  assert.match(form, /function addAssetPhoto\(file: File \| null\) \{\n\s+fieldErrors\.clear\("assetPhotoFile"\)\n\s+if \(!file\) return/)
  assert.doesNotMatch(form, /selectedAssetPhotoFile/)
  for (const locale of ["th", "en"] as const) {
    assert.equal(messages(locale).asset.addAssetPhoto, undefined, locale)
    assert.equal(messages(locale).asset.addAssetPhotoWithLabel, undefined, locale)
  }
})

test("no raw JSON control is left in the form; the last section is หมายเหตุ with the remark only (the user's decision, 2026-11-02)", () => {
  const other = read(`${C}asset-form-other.tsx`)
  assert.match(other, /<FoldedSection title=\{t\("remark"\)\} disclosure=\{disclosure\}>/)
  assert.match(other, /<Field label=\{t\("remark"\)\} id="asset-remark">/)
  for (const file of ["asset-form.tsx", "asset-form-other.tsx", "asset-form-custom-fields.tsx"]) {
    const source = read(`${C}${file}`)
    assert.doesNotMatch(source, /asset-custom-fields-json|showRawJson|RawJson|showJson|hideJson|customFieldsJsonHelp|otherAdvanced|Code2/, file)
  }
  const form = read(`${C}asset-form.tsx`)
  assert.match(form, /<AssetFormOther\n\s+values=\{values\}\n\s+setField=\{setField\}\n\s+changeOf=\{changeOf\}\n\s+disclosure=\{disclosureFor\("other"\)\}\n\s+\/>/)
  // The change list's row for a stored JSON the rows replaced reads as the custom-fields section.
  assert.match(form, /customFieldsJson: "customFieldsStructuredTitle",/)
  for (const locale of ["th", "en"] as const) {
    const asset = messages(locale).asset
    for (const key of ["showJson", "hideJson", "customFieldsJson", "customFieldsJsonHelp", "customFieldsJsonInvalid", "otherAdvanced", "mainCardTitle"]) {
      assert.equal(asset[key], undefined, `${locale} asset.${key}`)
    }
  }
})
