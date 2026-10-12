import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import test from "node:test"

// Phase 2B (spec 2B §6.13 table B): how list pages use the shared filters. The strings of the filter primitives live
// in tests/list-primitives-ui.test.ts (I16); the "none left" guards live in tests/list-frame-guards.test.ts (I15, I34).
// Item 2 lands with FilterFormActions (2B-1 Task 6). Items 5 and 6 come with the first page that moves (Task 13).
const read = (path: string) => readFileSync(path, "utf8").replace(/\r\n/g, "\n")

test("FilterFormActions submits at 40px and offers clear filters as an outline link (2B §6.3.2, item 2)", () => {
  const panel = read("src/components/ui/filter-panel.tsx")
  assert.match(panel, /export function FilterFormActions\(\{ submitLabel, clear, className \}: FilterFormActionsProps\)/)
  assert.match(panel, /clear\?: \{ href: string; label: string \}/)
  assert.match(panel, /<div data-slot="filter-form-actions" className=\{cn\("flex items-end gap-2", className\)\}>/)
  assert.match(panel, /<Button type="submit" size="lg" className="flex-1 md:flex-none">\{submitLabel\}<\/Button>/)
  assert.match(panel, /\{clear \? \(\s*<Link href=\{clear\.href\} className=\{cn\(buttonVariants\(\{ variant: "outline", size: "lg" \}\), "flex-1 md:flex-none"\)\}>/)
  assert.doesNotMatch(panel, /"use client"|\bbusy\b/, "a GET form changes the page itself, so the panel stays server-safe and has no busy state")
  assert.match(panel, /export function FilterPanel\(\{ title, description, children, className \}: FilterPanelProps\)/, "FilterPanel keeps its API")
})
