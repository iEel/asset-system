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

// Items 5 and 6 (spec 2B §6.13 table B, I34): the filter forms of the migrated list files. Each page commit adds its
// file; plan 2B-5 completes the list. A raw field in a file outside the list has no guard until 2D (I34).
const MIGRATED_FILTER_FILES = [
  "src/components/master-data/master-data-layout.tsx",
  "src/app/[locale]/(dashboard)/master-data/branches/page.tsx",
  "src/app/[locale]/(dashboard)/master-data/brands/page.tsx",
  "src/app/[locale]/(dashboard)/master-data/categories/page.tsx",
  "src/app/[locale]/(dashboard)/master-data/companies/page.tsx",
]

test("migrated filter forms use Field, SearchField and FilterSelect only, and every form is a search landmark (item 5)", () => {
  for (const path of MIGRATED_FILTER_FILES) {
    const source = read(path)
    assert.doesNotMatch(source, /<select\b|<textarea\b/, `${path}: a raw select or textarea`)
    const rawInputs = (source.match(/<input\b[^>]*>/g) ?? []).filter((tag) => !/\btype="hidden"/.test(tag))
    assert.deepEqual(rawInputs, [], `${path}: only hidden inputs may stay raw`)
    assert.doesNotMatch(source, /space-y-1 text-sm font-medium text-foreground|mb-1\.5 block text-xs font-medium text-muted-foreground/, `${path}: an old filter label`)
    assert.doesNotMatch(source, /\bfunction (?:FilterSelect|ReportSelect)\b|\bfunction Filter\(/, `${path}: a local filter helper`)
    for (const form of source.match(/<form\b[^>]*>/g) ?? []) assert.match(form, /\brole="search"/, `${path}: ${form}`)
  }
})

test("clear filters shows only while a filter is on (item 6)", () => {
  for (const path of MIGRATED_FILTER_FILES) {
    for (const actions of read(path).match(/<FilterFormActions\b[\s\S]*?\/>/g) ?? []) {
      if (/\bclear=/.test(actions)) assert.match(actions, /\bclear=\{hasActiveFilters \?/, `${path}: ${actions}`)
    }
  }
})
