import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import test from "node:test"

// Group 4 plan 3 Task 4 (spec §9.1-§9.2, P3-R1, P3-R4, P3-R7, P3-R9): the purchase-document picker. node --test cannot
// load .tsx, so these read the source with LF line endings.
const read = (path: string) => readFileSync(path, "utf8").replace(/\r\n/g, "\n")
const PART = "src/components/assets/purchase-document-picker.tsx"
const th = JSON.parse(readFileSync("messages/th.json", "utf8")) as { asset: Record<string, unknown> }
const en = JSON.parse(readFileSync("messages/en.json", "utf8")) as { asset: Record<string, unknown> }
const sectionSummary = (messages: { asset: Record<string, unknown> }) => messages.asset.sectionSummary as Record<string, string>

test("PurchaseDocumentPicker: a client part with the plan's props", () => {
  const source = read(PART)
  assert.match(source, /^"use client"\n/)
  assert.match(source, /^export function PurchaseDocumentPicker\(props: PurchaseDocumentPickerProps\) \{$/m)
  for (const part of [
    "id: string", "chosen: PurchaseDocumentSearchRow[]", "recent: PurchaseDocumentSearchAnswer", "supplierId: string | null",
    "onChoose: (row: PurchaseDocumentSearchRow) => void", "onRemove: (id: string) => void", "removedIds?: Set<string>", "disabled?: boolean",
    "const searchId = `${id}-search`", "const listboxId = `${id}-listbox`", "const labelId = `${id}-label`",
  ]) assert.ok(source.includes(part), part)
})

test("no request on mount: the recent props show until 2 typed characters or a changed supplier; 300 ms debounce; the older request aborts (P3-R4)", () => {
  const source = read(PART)
  assert.match(source, /const \[initialSupplierId\] = useState\(supplierId\)/)
  assert.match(source, /const requestUrl = buildPurchaseDocumentPickerUrl\(\{ query, supplierId, initialSupplierId \}\)/)
  assert.match(source, /useEffect\(\(\) => \{\n\s+if \(requestUrl === null\) return\n/)
  assert.match(source, /fetch\(requestUrl, \{ signal: controller\.signal \}\)/)
  assert.match(source, /\}, purchaseDocumentPickerDebounceMs\)/)
  assert.match(source, /return \(\) => \{\s+window\.clearTimeout\(timer\)\s+controller\.abort\(\)\s+\}/)
  assert.match(source, /\}, \[requestUrl, attempt\]\)/)
  assert.match(source, /const view = getPurchaseDocumentPickerView\(\{ requestKey: requestUrl, result, recent \}\)/)
  // Every fetch sits in that one effect.
  assert.equal(source.match(/\bfetch\(/g)?.length, 1)
})

test("a failure is a quiet inline line with a retry, never a toast", () => {
  const source = read(PART)
  assert.doesNotMatch(source, /\btoast\b|sonner/)
  assert.match(source, /setResult\(\{ key: requestUrl, answer: null \}\)/)
  assert.match(source, /function retry\(\) \{\s+setResult\(null\)\s+setAttempt\(\(count\) => count \+ 1\)/)
  assert.ok(source.includes('<Button variant="outline" size="sm" onClick={retry}>'))
})

test("the shared search field as a combobox over an inline listbox; shared parts only, no raw controls", () => {
  const source = read(PART)
  for (const part of [
    "<SearchField", 'role="combobox"', 'aria-autocomplete="list"', "aria-controls={listboxId}", 'autoComplete="off"',
    "maxLength={assetOperationSearchMaxChars}", 'role="listbox"', "id={listboxId}", "aria-labelledby={labelId}",
    'role="option"', "aria-selected={index === activeIndex}", "aria-disabled={view.selectable ? undefined : true}",
    "data-purchase-document-option={row.id}", "data-purchase-document-chip={row.id}", "data-purchase-document-footer",
    'aria-live="polite"', "moveAssetOperationActive(", "resolveAssetOperationActive(",
  ]) assert.ok(source.includes(part), part)
  assert.match(source, /aria-activedescendant=\{activeIndex >= 0 \? `\$\{id\}-option-\$\{rows\[activeIndex\]\.id\}` : undefined\}/)
  assert.doesNotMatch(source, /<(button|input|select|textarea)\b/)
  assert.doesNotMatch(source, /#[0-9a-fA-F]{3,8}\b|rgba?\(|\bdark:|[a-z]\/\d{2}\b/)
  assert.match(source, /\bmin-h-11\b/, "rows and chips are 44px tall")
})

test("results and chips: the type words, the supplier's name, the app's date and money formatters, the linked line in เครื่อง", () => {
  const source = read(PART)
  for (const part of [
    "t(`purchaseDocumentTypes.${", "formatDate(", 'formatMoney(view.amount, { unit: tCommon("baht") })',
    't("purchaseDocumentLinkedNames", { count: ', 't("purchaseDocumentLinkedCount", { count: ',
    't("purchaseDocumentChosen")', 't("purchaseDocumentInactive")', 't("purchaseDocumentRemoveNamed", { number: ',
    't("purchaseDocumentSearchFooter", { count: view.answer.total, total: view.answer.activeTotal })',
    "getPurchaseDocumentResultView(", "getPurchaseDocumentChipView(",
  ]) assert.ok(source.includes(part), part)
  // The name, never "code - name" (spec §5); counts go in raw (i18n-plural-count).
  assert.doesNotMatch(source, /supplier\.code|formatCount\(/)
})

test("the words (P3-R1): documents counted in ใบ, linked assets in เครื่อง; plan 2's ฉบับ summaries now ใบ", () => {
  assert.equal(th.asset.purchaseDocumentSearchFooter, "พบ {count, number} ใบ จากเอกสารกลาง {total, number} ใบ · ค้นหาได้ด้วยเลขที่เอกสาร เลข PO เลขใบกำกับ ผู้ขาย หรือชื่อรุ่นของเครื่องที่ผูกไว้")
  assert.equal(th.asset.purchaseDocumentLinkedNames, "ผูกกับ {count, number} เครื่อง: {names}")
  assert.equal(th.asset.purchaseDocumentLinkedCount, "ผูกกับ {count, number} เครื่อง")
  assert.equal(th.asset.purchaseDocumentChosen, "เลือกแล้ว")
  assert.equal(th.asset.purchaseDocumentInactive, "ปิดใช้งาน")
  assert.equal(th.asset.purchaseDocumentRemoveNamed, "เอา {number} ออก")
  assert.equal(sectionSummary(th).documentsSelected, "เลือกแล้ว {count, number} ใบ")
  assert.equal(sectionSummary(th).documentsQueued, "รอบันทึก {count, number} ใบ")
  assert.equal(sectionSummary(th).documentsLinked, "ผูกไว้ {count, number} ใบ")
  assert.match(String(en.asset.purchaseDocumentSearchFooter), /^\{count, plural, /)
  assert.match(String(en.asset.purchaseDocumentLinkedNames), /^\{count, plural, .*\}: \{names\}$/)
  const glossary = readFileSync("docs/19_THAI_GLOSSARY.md", "utf8")
  assert.match(glossary, /\| นับเอกสารจัดซื้อ \| \*\*ใบ\*\*/)
  assert.match(glossary, /\| นับทรัพย์สินที่ผูกกับเอกสารจัดซื้อ \| \*\*เครื่อง\*\*/)
})

test("removing a chip that goes away moves focus to the next chip or the search, never to the page (final review)", () => {
  const source = read(PART)
  assert.ok(source.includes("storedIds?: ReadonlySet<string>"))
  assert.match(source, /const target = focusAfterChipRemoval\(\{ chipIds: chosen\.map\(\(document\) => document\.id\), removedId: row\.id, storedIds \}\)\n\s+onRemove\(row\.id\)\n\s+if \(target\.to === "chip"\) chipsRef\.current\?\.querySelector<HTMLButtonElement>\(`\[data-purchase-document-chip="\$\{target\.id\}"\] button`\)\?\.focus\(\)\n\s+else if \(target\.to === "search"\) searchRef\.current\?\.focus\(\)/)
  assert.match(source, /<ul ref=\{chipsRef\} aria-label=\{t\("purchaseDocumentChosenList"\)\}/)
  assert.doesNotMatch(source, /if \(!removedIds\) searchRef\.current\?\.focus\(\)/)
  // The edit page passes its stored links; create and the batch pass none.
  const form = read("src/components/assets/asset-form.tsx")
  assert.match(form, /storedIds=\{isEdit \? new Set\(originalDocuments\.map\(\(document\) => document\.id\)\) : undefined\}/)
})
