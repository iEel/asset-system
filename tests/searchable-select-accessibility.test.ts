import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import test from "node:test"

test("searchable select exposes combobox navigation without nested interactive controls", () => {
  const source = readFileSync("src/components/ui/searchable-select.tsx", "utf8")

  assert.match(source, /role="combobox"/)
  assert.match(source, /aria-activedescendant/)
  assert.match(source, /getNextEnabledOptionIndex/)
  assert.match(source, /event\.key === "ArrowDown"/)
  assert.match(source, /event\.key === "ArrowUp"/)
  assert.match(source, /event\.key === "Home"/)
  assert.match(source, /event\.key === "End"/)
  assert.match(source, /triggerRef\.current\?\.focus\(\)/)
  assert.doesNotMatch(source, /<span\s+role="button"/)
})
