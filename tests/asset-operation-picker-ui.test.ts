import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import test from "node:test"

// Server search Task 4 (spec 6.1, the approved mockup .superpowers/brainstorm/183-1793185385/content/search-picker.html).
// node --test cannot load .tsx, so these read the source with LF line endings.
const read = (path: string) => readFileSync(path, "utf8").replace(/\r\n/g, "\n")
const PART = "src/components/ui/asset-operation-picker.tsx"

test("AssetOperationPicker: a client part that takes one asset per field; the field's id names its root and the search field is <id>-search (group 3 spec §10.1; P4-R24)", () => {
  const source = read(PART)
  assert.match(source, /^"use client"\n/)
  assert.match(source, /^export function AssetOperationPicker\(props: AssetOperationPickerProps\) \{$/m)
  for (const part of [
    "value: AssetOperationSearchRow | null", "onChange: (row: AssetOperationSearchRow | null) => void",
    "pickBlocked?: (row: AssetOperationSearchRow) => boolean",
    "context?: AssetOperationPickerContext", "initialQuery?: string",
    "const searchId = `${id}-search`", "const listboxId = `${id}-listbox`", "const labelId = `${id}-label`",
    "const errorId = shownError ? `${id}-error` : undefined", "<FieldError id={errorId}>{shownError}</FieldError>",
  ]) assert.ok(source.includes(part), part)
  assert.match(source, /^export type AssetOperationPickerProps = \{$/m, "one shape, no union")
  assert.doesNotMatch(source, /\bmultiple\b|\bvalues\b|chosenIds|noIds|selectedTitle|removeNamed|t\("chosen"\)|announcement|S-R44|function remove\(/)
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

test("the combobox Task 8 drives: the list, the active row, rows that cannot be taken, the chosen asset, a polite live region (spec 6.1)", () => {
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
  assert.match(source, /splitSearchHighlightWords\(value, words\)/)
  assert.doesNotMatch(source, /\bsplitSearchHighlight\(/)
  for (const part of [
    "const words = splitAssetOperationSearchWords(query)", "<WordsHighlight value={row.assetTag} words={words} />",
    "<WordsHighlight value={row.name} words={words} />", "<WordsHighlight value={section.group.label} words={words} />",
  ]) assert.ok(source.includes(part), part)
  // The polite region reads the state and the count while the list is open; a pick closes it and focus names the asset.
  assert.match(source, /const liveText = open && state !== "hint" \? stateText : ""/)
  assert.ok(source.includes('aria-live="polite">{liveText}</span>'), "the region reads nothing while the list is closed")
})

test("keys: the arrows skip what cannot be taken, Enter picks and never submits the form, Escape closes (spec 6.1)", () => {
  const source = read(PART)
  assert.match(source, /const activeIndex = resolveAssetOperationActive\(selectableRows, activeId\)/)
  assert.match(source, /moveAssetOperationActive\(selectableRows, activeIndex, event\.key === "ArrowDown" \? 1 : -1\)/)
  // One view per row for the pointer, the arrows, Enter and the look, so a pickBlocked row is reachable by keyboard (A1-R1).
  assert.match(source, /const rowView = \(row: AssetOperationSearchRow\) => getAssetOperationRowView\(row, pickBlocked && \(\(\) => pickBlocked\(row\)\)\)/)
  assert.match(source, /const \{ id, label, mode, context, hint, error, required, initialQuery, pickedBody, value, onChange, pickBlocked \} = props/)
  assert.match(source, /const selectableRows = flatRows\.map\(\(row\) => \(\{ id: row\.id, selectable: rowView\(row\)\.selectable \}\)\)/)
  assert.ok(source.includes("if (!rowView(row).selectable) return"), "pick takes what the row shows as takeable")
  assert.ok(source.includes("const view = rowView(row)"), "the row's look reads the same view")
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
    't("noHolderGroup")', 't("legacyLineAt", { location: detail.locationLabel })', 't("change")',
    't(mode === "checkin" ? "hintCheckin" : "hint")', "tAll(note.key)",
    't("outstandingLine", { parentTag: detail.parentTag })',
  ]) assert.ok(source.includes(part), part)
  assert.match(source, /t\("handoverLine", \{ documentNo: detail\.documentNo, date: formatDate\(detail\.checkoutDate\) \}\)/)
  assert.match(source, /t\("groupCount", \{ count: section\.group\.count \}\)/)
})

test("one pick: the field takes the row, the list closes and focus goes to เปลี่ยน; เปลี่ยน empties the field and focuses the search (group 3 spec §10.1; P4-R24)", () => {
  const source = read(PART)
  const body = (head: string) => {
    const start = source.indexOf(head)
    assert.ok(start > 0, head)
    return source.slice(start, source.indexOf("\n  }\n", start))
  }
  assert.match(body("  function pick(row: AssetOperationSearchRow) {"), /\{\n\s+if \(!rowView\(row\)\.selectable\) return\n\s+onChange\(row\)\n\s+setOpen\(false\)\n\s+focusRequest\.current = "change"$/)
  assert.match(body("  function change() {"), /\{\n\s+onChange\(null\)\n\s+setQuery\(""\)\n\s+setActiveId\(null\)\n\s+focusRequest\.current = "search"$/)
  assert.match(source, /else searchRef\.current\?\.focus\(\)\n\s+\}, \[value\]\)/, "focus moves once the page has taken the pick or the change")
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

test("final review M-1, M-6: the counts are grouped, a reason under a row reads as a warning, the search text is capped (M-11's muted เลือกแล้ว went with the multiple mode, group 3 spec §10.1; P4-R24)", () => {
  const source = read(PART)
  assert.ok(source.includes('import { formatCount } from "@/lib/display-format"'))
  assert.ok(source.includes('<span data-asset-option-reason className="text-meta text-warning">'))
  assert.doesNotMatch(source, /note\.kind === "chosen"|text-muted-foreground" : "text-warning"/)
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
    change: ["เปลี่ยน", "Change"],
    changeNamed: ["เปลี่ยน{label} {tag}", "Change {label} {tag}"],
    noHolderGroup: ["ไม่มีผู้ถือครอง", "No holder"],
    groupCount: ["ถืออยู่ {count} ชิ้น", "Holds {count}"],
    handoverLine: ["ใบส่งมอบ {documentNo} · ส่งมอบ {date}", "Handover {documentNo} · {date}"],
    legacyLineAt: ["ข้อมูลเก่า (ไม่มีใบส่งมอบ) · {location}", "Legacy record (no handover) · {location}"],
    outstandingLine: ["ส่วนควบค้างคืน ของ {parentTag}", "Outstanding component of {parentTag}"],
  }
  for (const [key, [thai, english]] of Object.entries(words)) {
    assert.equal(th.assetOperation?.[key], thai, `th ${key}`)
    assert.equal(en.assetOperation?.[key], english, `en ${key}`)
  }
  // S-R47: the line without the place has no reader left.
  assert.equal(th.assetOperation?.legacyLine, undefined)
  assert.equal(en.assetOperation?.legacyLine, undefined)
  // Group 3 plan 4 P4-R24: the picker's multiple mode was the only reader of these three (Task 7 removed it).
  for (const key of ["selectedTitle", "chosen", "removeNamed"]) {
    for (const [locale, messages] of [["th", th], ["en", en]] as const) {
      assert.equal(messages.assetOperation?.[key], undefined, `${locale}.assetOperation.${key} has no reader and is removed`)
    }
  }
  assert.equal(th.common.searchSelectResultCount, "พบ {count} รายการ")
  assert.equal(th.common.tryAgain, "ลองอีกครั้ง")
})

test("DESIGN.md and docs/14 describe AssetOperationPicker, and the guards know it as a shared part with its own label (group 3 spec §10.1; P4-R24)", () => {
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
  assert.ok(!block.includes("`multiple`") && !block.includes("Many picks") && !block.includes("เลือกแล้ว"), "DESIGN.md describes one asset per field (P4-R24)")
  assert.ok(block.includes("one asset per field"))
  const index = read("docs/14_UI_UX_DESIGN_SYSTEM.md")
  const row = index.slice(index.indexOf("\n| An asset for a transaction"), index.indexOf("\n| An action menu |"))
  assert.ok(row.length > 0 && index.indexOf("\n| An asset for a transaction") > index.indexOf("\n| A searchable picker | `SearchableSelect` |"), "the row follows SearchableSelect")
  for (const phrase of ["`AssetOperationPicker`", "never holds a list of the register", "stays listed with its reason", "one asset per field", "never inside `Field`"]) assert.ok(row.includes(phrase), phrase)
  assert.ok(row.startsWith("\n| An asset for a transaction (ส่งมอบ, รับคืน, โอนย้าย) |") && !row.includes("`multiple`"), "docs/14: no multiple mode (P4-R24)")
  const listFrame = read("tests/list-frame-guards.test.ts")
  assert.match(listFrame, /const UI_NAME = \/\\bfunction \(\?:[^/]*\|Nil\|AssetOperationPicker\|DesktopSelectionBar\)\\b\/g/)
  assert.match(listFrame, /LN2: \["asset-operation-picker", "data-table", "desktop-selection-bar", "empty-note"/)
  assert.ok(read("tests/validation-guards.test.ts").includes('const SELECT_TAGS = ["SearchableSelect", "MaintenanceOptionSelect", "AuditScanCheckField", "AssetOperationPicker"]'))
  const forms = read("tests/form-migration-guards.test.ts")
  assert.ok(forms.includes('for (const tag of findJsxTags(children, ["SearchableSelect", "AssetOperationPicker"])) problems.push(`${where}: ${tag.name} inside Field (it renders its own label)`)'))
  assert.ok(forms.includes("/<(Field|FileDropzone|ScannerTextInput|SearchableSelect|AssetOperationPicker|label)(?=[\\s/>])/"))
})

test("look step: the hint shows only with the search field, so a chosen value never reads 'type...'; the combobox names it, เปลี่ยน names only the error", () => {
  const source = read(PART)
  assert.ok(source.includes('{showSearch ? <FieldHint id={hintId}>{hint ?? t(mode === "checkin" ? "hintCheckin" : "hint")}</FieldHint> : null}'))
  assert.equal(source.match(/<FieldHint /g)?.length, 1)
  assert.match(source, /const showSearch = !value\n/)
  assert.match(source, /onClick=\{change\}\n\s+aria-label=\{t\("changeNamed", \{ label, tag: value\.assetTag \}\)\}\n\s+aria-describedby=\{errorId\}/)
  assert.match(source, /role="combobox"[\s\S]*?aria-describedby=\{describedBy\}/)
})

test("รับคืน's rows keep their line and gain a badge between the tag line and that line (group 3 spec §8.2, P2-R17)", () => {
  const source = read(PART)
  for (const part of [
    'import { StatusBadge } from "@/components/ui/status-badge"', "const badge = getAssetOperationRowBadge(row)", "{badge ? <RowBadge badge={badge} /> : null}",
    "function RowBadge({ badge }: { badge: AssetOperationRowBadgeView })",
    't("badgeHandover", { documentNo: badge.documentNo })', 't("badgeLegacy")', 't("badgeOutstanding")', 'className="self-start"',
  ]) assert.ok(source.includes(part), part)
  assert.ok(source.indexOf("{badge ? <RowBadge badge={badge} /> : null}") < source.indexOf("<RowDetail row={row} />"), "the badge sits between the tag line and the row's line")
})
