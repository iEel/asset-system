import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import test from "node:test"

// Server search Task 4 (spec 6.1, the approved mockup .superpowers/brainstorm/183-1793185385/content/search-picker.html).
// node --test cannot load .tsx, so these read the source with LF line endings.
const read = (path: string) => readFileSync(path, "utf8").replace(/\r\n/g, "\n")
const PART = "src/components/ui/asset-operation-picker.tsx"

test("AssetOperationPicker: a client part, one pick or many; the field's id names its root and the search field is <id>-search", () => {
  const source = read(PART)
  assert.match(source, /^"use client"\n/)
  assert.match(source, /^export function AssetOperationPicker\(props: AssetOperationPickerProps\) \{$/m)
  for (const part of [
    "multiple?: false", "value: AssetOperationSearchRow | null", "onChange: (row: AssetOperationSearchRow | null) => void",
    "multiple: true", "values: AssetOperationSearchRow[]", "onChange: (rows: AssetOperationSearchRow[]) => void",
    "context?: AssetOperationPickerContext", "initialQuery?: string",
    "const searchId = `${id}-search`", "const listboxId = `${id}-listbox`", "const labelId = `${id}-label`",
    "const errorId = shownError ? `${id}-error` : undefined", "<FieldError id={errorId}>{shownError}</FieldError>",
  ]) assert.ok(source.includes(part), part)
  assert.match(source, /<div\s+id=\{id\}\s+data-slot="asset-operation-picker"\s+data-invalid=\{shownError \? true : undefined\}\s+className="grid min-w-0 max-w-full content-start gap-1\.5"/)
  // A chosen asset that cannot be taken (the ?assetId= arrival, spec 6.4) shows its reason as the field's error.
  assert.match(source, /const shownError = error \?\? \(chosenBlockedReason \? tAll\(chosenBlockedReason\) : null\)/)
})

test("asks the server once the text settles; an older answer never shows for a newer text; a failure is kept as failed (Review Focus 3, 5)", () => {
  const source = read(PART)
  assert.match(source, /const requestUrl = buildAssetOperationSearchUrl\(\{ mode, q: query, context \}\)/)
  assert.match(source, /const state = getAssetOperationPickerState\(\{ query, requestKey: requestUrl, result \}\)/)
  assert.match(source, /fetch\(requestUrl, \{ signal: controller\.signal \}\)/)
  assert.match(source, /\}, assetOperationPickerDebounceMs\)/)
  assert.match(source, /return \(\) => \{\s+window\.clearTimeout\(timer\)\s+controller\.abort\(\)\s+\}/)
  assert.match(source, /\}, \[requestUrl, attempt\]\)/)
  assert.match(source, /setResult\(\{ key: requestUrl, answer: null \}\)/)
  assert.match(source, /function retry\(\) \{\s+setResult\(null\)\s+setAttempt\(\(count\) => count \+ 1\)\s+searchRef\.current\?\.focus\(\)\s+\}/)
  assert.doesNotMatch(source, /\bthrow\b/)
})

test("the combobox Task 8 drives: the list, the active row, rows that cannot be taken, the chosen rows, a polite live region (spec 6.1)", () => {
  const source = read(PART)
  for (const part of [
    'role="combobox"', 'aria-autocomplete="list"', "aria-controls={listboxId}", "aria-expanded={listOpen}", 'autoComplete="off"',
    "aria-required={required || undefined}", "aria-invalid={shownError ? true : undefined}",
    'role="listbox"', "id={listboxId}", "aria-labelledby={labelId}",
    'role="option"', "data-asset-option={row.id}", "aria-selected={index === activeIndex}", "aria-disabled={view.selectable ? undefined : true}",
    "onMouseDown={(event) => event.preventDefault()}", "data-asset-option-reason", "data-asset-option-group={section.group.key}", "data-asset-picked={", "data-asset-search-count",
    'aria-live="polite"', '<mark className="rounded-sm bg-warning-soft px-0.5 text-foreground">',
  ]) assert.ok(source.includes(part), part)
  assert.match(source, /aria-activedescendant=\{listOpen && activeIndex >= 0 \? `\$\{id\}-option-\$\{flatRows\[activeIndex\]\.id\}` : undefined\}/)
  assert.match(source, /id=\{`\$\{id\}-option-\$\{row\.id\}`\}/)
  assert.match(source, /\bmin-h-11\b/, "rows are 44px tall below md")
  assert.match(source, /splitSearchHighlight\(/)
  assert.match(source, /const liveText = state === "hint" \? announcement : open \? /)
  assert.ok(source.includes('aria-live="polite">{liveText}</span>'), "the region reads nothing while the list is closed")
  assert.ok(source.includes('setAnnouncement(t("selectedTitle", { count: values.length - 1 }))'), "a remove reads the new count")
  assert.ok(source.includes('setAnnouncement("")'), "typing clears the old count")
})

test("keys: the arrows skip what cannot be taken, Enter picks and never submits the form, Escape closes (spec 6.1)", () => {
  const source = read(PART)
  assert.match(source, /const activeIndex = resolveAssetOperationActive\(selectableRows, activeId\)/)
  assert.match(source, /moveAssetOperationActive\(selectableRows, activeIndex, event\.key === "ArrowDown" \? 1 : -1\)/)
  assert.match(source, /const selectableRows = flatRows\.map\(\(row\) => \(\{ id: row\.id, selectable: getAssetOperationRowView\(row, chosenIds\)\.selectable \}\)\)/)
  assert.match(source, /if \(event\.key === "Enter"\) \{\s+event\.preventDefault\(\)\s+if \(listOpen && activeIndex >= 0\)/)
  assert.match(source, /if \(event\.key === "Escape"\) \{\s+setOpen\(false\)/)
})

test("every word comes from messages: the states, the count, reasons through the root translator, groups, the รับคืน lines (spec 6.1, 6.3)", () => {
  const source = read(PART)
  for (const part of [
    'useTranslations("assetOperation")', 'useTranslations("common")', "const tAll = useTranslations()",
    't("searching")', 't("notFound")', 't("failed")', 'tCommon("tryAgain")', 'tCommon("searchSelectPlaceholder")',
    'tCommon("searchSelectResultCount", { count: formatCount(countLine.count) })',
    't("resultCountMore", { count: formatCount(countLine.count), shown: formatCount(countLine.shown) })',
    't("chosen")', 't("noHolderGroup")', 't("legacyLine")', 't("selectedTitle", { count: values.length })', 't("change")',
    't(mode === "checkin" ? "hintCheckin" : "hint")', "tAll(note.key)",
  ]) assert.ok(source.includes(part), part)
  assert.match(source, /t\("handoverLine", \{ documentNo: detail\.documentNo, date: formatDate\(detail\.checkoutDate\) \}\)/)
  assert.match(source, /t\("groupCount", \{ count: section\.group\.count \}\)/)
})

test("final review I-1: a keyboard move scrolls the active row into view through the listbox ref, never through document; a hover does not", () => {
  const source = read(PART)
  assert.match(source, /const listRef = useRef<HTMLUListElement>\(null\)/)
  assert.match(source, /<ul role="listbox" ref=\{listRef\}/)
  assert.match(source, /const keyboardMove = useRef\(false\)/)
  assert.match(source, /if \(next >= 0\) \{\s+keyboardMove\.current = true\s+setActiveId\(flatRows\[next\]\.id\)/)
  assert.match(
    source,
    /useEffect\(\(\) => \{\s+if \(!keyboardMove\.current \|\| activeId === null\) return\s+keyboardMove\.current = false\s+listRef\.current\?\.querySelector\(`\[data-asset-option="\$\{activeId\}"\]`\)\?\.scrollIntoView\(\{ block: "nearest" \}\)\s+\}, \[activeId\]\)/,
  )
  assert.doesNotMatch(source, /\bdocument\./)
  assert.doesNotMatch(source.replace(/window\.(?:setTimeout|clearTimeout)\(/g, ""), /\bwindow\./)
})

test("final review M-1, M-11, M-6: the counts are grouped, เลือกแล้ว is muted while a reason stays a warning, the search text is capped", () => {
  const source = read(PART)
  assert.ok(source.includes('import { formatCount } from "@/lib/display-format"'))
  assert.ok(source.includes('className={cn("text-meta", note.kind === "chosen" ? "text-muted-foreground" : "text-warning")}'))
  assert.doesNotMatch(source, /data-asset-option-reason className="text-meta text-warning"/)
  assert.ok(source.includes("maxLength={assetOperationSearchMaxChars}"))
  assert.match(source, /import \{[^}]*\bassetOperationSearchMaxChars\b[^}]*\} from "@\/lib\/asset-operation-search-rules"/)
})

test("tokens only (N1, R1, N4, LT5) and the shared parts only (N3, GF2, GB1): no opacity, tint, dark: or color value; no raw button, input or spinner; no popover; no global listener", () => {
  const source = read(PART)
  assert.doesNotMatch(source, /\bopacity-|\bdark:|#[0-9a-fA-F]{3,8}\b|\brgba?\(|\b(?:bg|text|border|ring)-[a-z-]+\/\d+|cursor-not-allowed/)
  assert.doesNotMatch(source, /<button\b|<input\b|<Loader2\b|SearchableSelect|Popover/)
  assert.doesNotMatch(source, /(?:document|window)\.addEventListener\(/)
})

test("the picker's words, Thai and English (glossary: ผู้ถือครอง; Serial stays)", () => {
  const th = JSON.parse(read("messages/th.json"))
  const en = JSON.parse(read("messages/en.json"))
  const words: Record<string, [string, string]> = {
    hint: ["พิมพ์รหัสทรัพย์สิน ชื่อ Serial หรือชื่อผู้ถือครอง อย่างน้อย 2 ตัวอักษร", "Type an asset code, name, serial number or holder's name (at least 2 characters)"],
    hintCheckin: ["พิมพ์รหัสทรัพย์สิน ชื่อผู้ถือครอง หรือเลขที่เอกสารส่งมอบ อย่างน้อย 2 ตัวอักษร", "Type an asset code, the holder's name or the handover document no. (at least 2 characters)"],
    searching: ["กำลังค้นหา…", "Searching…"],
    notFound: ["ไม่พบทรัพย์สินที่ตรงกับคำค้น", "No asset matches this search"],
    failed: ["ค้นหาไม่สำเร็จ", "The search failed"],
    resultCountMore: ["พบ {count} รายการ แสดง {shown} รายการแรก พิมพ์เพิ่มเพื่อให้แคบลง", "{count} found, showing the first {shown}. Type more to narrow the list"],
    selectedTitle: ["ที่เลือกแล้ว {count} รายการ", "Chosen: {count}"],
    chosen: ["เลือกแล้ว", "Chosen"],
    change: ["เปลี่ยน", "Change"],
    changeNamed: ["เปลี่ยน{label} {tag}", "Change {label} {tag}"],
    removeNamed: ["นำ {tag} ออก", "Remove {tag}"],
    noHolderGroup: ["ไม่มีผู้ถือครอง", "No holder"],
    groupCount: ["ถืออยู่ {count} ชิ้น", "Holds {count}"],
    handoverLine: ["ใบส่งมอบ {documentNo} · ส่งมอบ {date}", "Handover {documentNo} · {date}"],
    legacyLine: ["ข้อมูลเก่า (ไม่มีใบส่งมอบ)", "Legacy data (no handover document)"],
  }
  for (const [key, [thai, english]] of Object.entries(words)) {
    assert.equal(th.assetOperation?.[key], thai, `th ${key}`)
    assert.equal(en.assetOperation?.[key], english, `en ${key}`)
  }
  assert.equal(th.common.searchSelectResultCount, "พบ {count} รายการ")
  assert.equal(th.common.tryAgain, "ลองอีกครั้ง")
})

test("DESIGN.md and docs/14 describe AssetOperationPicker, and the guards know it as a shared part with its own label", () => {
  const design = read("DESIGN.md")
  const start = design.indexOf("- **`AssetOperationPicker`**")
  const block = design.slice(start, design.indexOf("- **Migration:** phase 2C batch 1"))
  assert.ok(start > design.indexOf("- **`FileQueueList`**") && block.length > 0, "an Inputs / Fields bullet after FileQueueList")
  for (const phrase of [
    "`src/components/ui/asset-operation-picker.tsx`", "It never holds a list of the register", "`role=\"combobox\"`",
    "after 2 characters and a 250 ms pause", "an older answer never replaces a newer one", "at most 20 rows",
    "no fill and no opacity", "`aria-disabled`", "never shown as not found", "Enter picks and never submits the form",
    "`<id>-search`", "Never inside `Field`",
  ]) assert.ok(block.includes(phrase), phrase)
  const index = read("docs/14_UI_UX_DESIGN_SYSTEM.md")
  const row = index.slice(index.indexOf("\n| An asset for a transaction"), index.indexOf("\n| An action menu |"))
  assert.ok(row.length > 0 && index.indexOf("\n| An asset for a transaction") > index.indexOf("\n| A searchable picker | `SearchableSelect` |"), "the row follows SearchableSelect")
  for (const phrase of ["`AssetOperationPicker`", "never holds a list of the register", "stays listed with its reason", "`multiple` with `values`", "never inside `Field`"]) assert.ok(row.includes(phrase), phrase)
  const listFrame = read("tests/list-frame-guards.test.ts")
  assert.match(listFrame, /const UI_NAME = \/\\bfunction \(\?:[^/]*\|Nil\|AssetOperationPicker\|DesktopSelectionBar\)\\b\/g/)
  assert.match(listFrame, /LN2: \["asset-operation-picker", "data-table", "desktop-selection-bar", "empty-note"/)
  assert.ok(read("tests/validation-guards.test.ts").includes('const SELECT_TAGS = ["SearchableSelect", "MaintenanceOptionSelect", "AuditScanCheckField", "AssetOperationPicker"]'))
  const forms = read("tests/form-migration-guards.test.ts")
  assert.ok(forms.includes('for (const tag of findJsxTags(children, ["SearchableSelect", "AssetOperationPicker"])) problems.push(`${where}: ${tag.name} inside Field (it renders its own label)`)'))
  assert.ok(forms.includes("/<(Field|FileDropzone|ScannerTextInput|SearchableSelect|AssetOperationPicker|label)(?=[\\s/>])/"))
})
