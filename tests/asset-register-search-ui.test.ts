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
  assert.match(source, /aria-label=\{t\("searchClear"\)\}/)
  assert.match(source, /inputRef\.current\?\.focus\(\)/)
  assert.match(source, /isPending \? <Loader2/)
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
