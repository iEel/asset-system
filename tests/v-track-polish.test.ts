import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import test from "node:test"

// V track polish: the user's answers to the V track final plan's open issues 11, 7 and 6 (2026-10-19). One test per
// task, appended in order. The working tree is CRLF on Windows: every read strips \r before the multi-line regexes.
const read = (path: string) => readFileSync(path, "utf8").replace(/\r\n/g, "\n")

test("an aria-disabled button looks disabled in forced colors too: GrayText text and border (v-track polish 11)", () => {
  const css = read("src/app/globals.css")
  const blocks = [...css.matchAll(/@media \(forced-colors: active\) \{\n([\s\S]*?)\n\}/g)].map((match) => match[1])
  assert.ok(blocks.length > 0, "a forced-colors media block exists")
  const rule = blocks
    .map((block) => block.match(/\[data-slot="button"\]\[aria-disabled="true"\] \{([^}]*)\}/))
    .find(Boolean)
  assert.ok(rule, "the forced-colors block has a rule for an aria-disabled button")
  assert.match(rule[1], /(^|[\s;])color: GrayText;/)
  assert.match(rule[1], /border-color: GrayText;/)
  assert.match(read("src/components/ui/button.tsx"), /data-slot="button"/)
})
