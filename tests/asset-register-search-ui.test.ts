import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import test from "node:test"

const read = (path: string) => readFileSync(path, "utf8").replace(/\r\n/g, "\n")
const field = () => read("src/components/assets/asset-register-search-field.tsx")
const provider = () => read("src/components/assets/asset-register-navigation.tsx")
const messages = (locale: "th" | "en") => JSON.parse(readFileSync(`messages/${locale}.json`, "utf8")).asset

test("search waits for a pause and never fires during IME composition", () => {
  const source = field()

  assert.match(source, /window\.setTimeout\([\s\S]*?assetRegisterSearchDebounceMs\)/)
  assert.match(source, /if \(!shouldAutoSearch\(value, filters\.search\)\) return/)
  assert.match(source, /onCompositionStart=\{\(\) => \{[\s\S]*?cancelPendingSearch\(\)/)
  assert.match(source, /onCompositionEnd=\{\(event\) => \{[\s\S]*?scheduleSearch\(event\.currentTarget\.value\)/)
  assert.match(source, /composingRef\.current \|\| \(event\.nativeEvent as InputEvent\)\.isComposing/)
})

test("Enter searches at once and the clear button refocuses the field", () => {
  const source = field()

  assert.match(source, /<form[\s\S]*?role="search"[\s\S]*?action=\{`\/\$\{locale\}\/assets`\}/)
  assert.match(source, /onSubmit=\{\(event\) => \{\s*event\.preventDefault\(\)\s*search\(draft\)/)
  assert.match(source, /clearLabel=\{t\("searchClear"\)\}/)
  assert.match(source, /inputRef\.current\?\.focus\(\)/)
  assert.match(source, /<SearchField\b[\s\S]*?loading=\{isPending\}/)
})

test("a late response never overwrites what the person is typing", () => {
  const source = field()

  assert.match(source, /if \(syncedSearch !== filters\.search\) \{[\s\S]*?if \(!focused\) setDraft\(filters\.search\)/)
  assert.match(source, /onFocus=\{\(\) => setFocused\(true\)\}/)
  assert.match(source, /onBlur=\{\(\) => setFocused\(false\)\}/)
})

test("a pending search is cancelled when the field unmounts", () => {
  assert.match(field(), /useEffect\(\(\) => \{[\s\S]*?return \(\) => \{[\s\S]*?window\.clearTimeout/)
})

test("filter navigation is optimistic, replaces history and keeps the scroll position", () => {
  const source = provider()

  assert.match(source, /"use client"/)
  assert.match(source, /useOptimistic\(/)
  assert.match(source, /mergeAssetRegisterFilters\(latestFiltersRef\.current, overrides\)/)
  assert.match(source, /startTransition\(\(\) => \{[\s\S]*?setOptimisticFilters\(next\)[\s\S]*?router\.replace\(`\$\{pathname\}\?\$\{buildAssetQueryString\(next\)\}`, \{ scroll: false \}\)/)
  assert.doesNotMatch(source + field(), /router\.push\(/)
})

test("search copy exists in Thai and English", () => {
  assert.equal(messages("th").searchPlaceholder, "ค้นหา รหัส · ชื่อ · Serial · ผู้ถือครอง · ที่ตั้ง")
  assert.equal(messages("th").searchClear, "ล้างคำค้นหา")
  assert.equal(typeof messages("en").searchPlaceholder, "string")
  assert.equal(typeof messages("en").searchClear, "string")
})

// Plan 2B-3 Task 6 (spec 2B §7.5, §6.7, R-l): the register search is the shared SearchField at 36px from md (44 below)
// inside the same search form, so the pause, IME, Enter and the hidden GET fields stay exactly as they were.
test("the register search is the shared SearchField with its clear button, inside the old search form (2B §7.5)", () => {
  const source = field()

  assert.match(source, /^import \{ SearchField \} from "@\/components\/ui\/search-field"$/m)
  assert.match(source, /<SearchField\n\s+ref=\{inputRef\}\n\s+name="search"\n\s+type="text"\n\s+inputMode="search"\n\s+enterKeyHint="search"\n\s+autoComplete="off"\n\s+spellCheck=\{false\}\n\s+fieldSize="md"\n\s+loading=\{isPending\}\n\s+aria-label=\{tCommon\("search"\)\}/)
  assert.match(source, /onClear=\{clearSearch\}/)
  assert.match(source, /function clearSearch\(\) \{\n\s+setDraft\(""\)\n\s+search\(""\)\n\s+inputRef\.current\?\.focus\(\)\n\s+\}/)
  assert.match(source, /className=\{cn\("min-w-0", className\)\}/)
  assert.equal(source.match(/<input\b/g)?.length, 1, "only the hidden inputs that keep the other filters stay raw")
  assert.doesNotMatch(source, /getFieldControlClasses|lucide-react|<button\b/)
})
