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
