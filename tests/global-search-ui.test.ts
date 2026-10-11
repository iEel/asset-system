import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import test from "node:test"

test("global search results are a Radix popover listbox anchored to the field", () => {
  const source = readFileSync("src/components/layout/global-search.tsx", "utf8").replace(/\r\n/g, "\n")
  assert.match(source, /<PopoverAnchor asChild>/)
  assert.match(source, /<PopoverContent[\s\S]*?id="global-search-results"/)
  assert.match(source, /onOpenAutoFocus=\{\(event\) => event\.preventDefault\(\)\}/)
  assert.match(source, /role="listbox"/)
  assert.match(source, /role="option"/)
  assert.match(source, /aria-activedescendant=/)
  assert.match(source, /<StatusBadge/)
  assert.doesNotMatch(source, /document\.addEventListener|style=\{\{/)
})

test("global search rows highlight like menu items and the footer shows the keys", () => {
  const source = readFileSync("src/components/layout/global-search.tsx", "utf8").replace(/\r\n/g, "\n")
  // onMouseEnter moves the selection, so a separate hover fill would light up two rows.
  assert.doesNotMatch(source, /bg-accent\/60|hover:bg-row-hover/)
  assert.match(source, /"flex w-full min-w-0 cursor-pointer items-start gap-2\.5 rounded-control px-2\.5 py-1\.5 text-left",\s*selected && "bg-primary-soft",/)
  assert.match(source, /className="grid max-h-100 gap-px overflow-y-auto p-1\.5"/)
  assert.match(source, /<Kbd>↑↓<\/Kbd>\s*\{t\("keyboardSelect"\)\}/)
  assert.match(source, /<Kbd>Enter<\/Kbd>\s*\{t\("keyboardOpen"\)\}/)
  assert.match(source, /<Kbd>Esc<\/Kbd>\s*\{t\("keyboardClose"\)\}/)
  assert.doesNotMatch(source, /keyboardHint/)
  for (const locale of ["th", "en"] as const) {
    const messages = JSON.parse(readFileSync(`messages/${locale}.json`, "utf8")).globalSearch
    for (const key of ["keyboardSelect", "keyboardOpen", "keyboardClose"]) {
      assert.equal(typeof messages[key], "string", `${locale} globalSearch.${key}`)
    }
    assert.equal(messages.keyboardHint, undefined, locale)
  }
})
