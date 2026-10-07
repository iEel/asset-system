import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import test from "node:test"

test("searchable select is a modal Radix popover with a cmdk listbox", () => {
  const source = readFileSync("src/components/ui/searchable-select.tsx", "utf8").replace(/\r\n/g, "\n")
  assert.match(source, /<Popover modal open=\{open && !disabled\} onOpenChange=\{setOpenState\}>/)
  assert.match(source, /<Command shouldFilter=\{false\} loop/)
  assert.match(source, /filterSearchableOptions\(options, query\)/)
  assert.match(source, /w-\(--radix-popover-trigger-width\)/)
  assert.match(source, /<CommandItem[\s\S]*?disabled=\{option\.disabled\}/)
  assert.doesNotMatch(source, /document\.addEventListener|searchable-select-navigation/)
})
