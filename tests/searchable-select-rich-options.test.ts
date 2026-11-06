import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import test from "node:test"
import { filterSearchableOptions } from "../src/lib/searchable-select-filter.ts"

// Group 7 follow-ups Task 1 (G7F-R3): SearchableSelect options take an optional description (a second muted line) and
// meta (a right-side chip). The label stays the searchable and accessible text; options without either render as before.
const read = (path: string) => readFileSync(path, "utf8").replace(/\r\n/g, "\n")

test("the search reads the label only, never description or meta", () => {
  const options = [
    { id: "1", label: "ห้อง 301", description: "สำนักงานใหญ่ › อาคาร A › ชั้น 3", meta: "ห้อง" },
    { id: "2", label: "ชั้น 3", description: "สำนักงานใหญ่ › อาคาร A", meta: "ชั้น" },
  ]
  assert.deepEqual(filterSearchableOptions(options, "301").map((option) => option.id), ["1"])
  assert.deepEqual(filterSearchableOptions(options, "อาคาร").map((option) => option.id), [])
  assert.deepEqual(filterSearchableOptions(options, "ห้อง").map((option) => option.id), ["1"])
})

test("the option type gains description and meta", () => {
  const lib = read("src/lib/searchable-select-filter.ts")
  assert.match(lib, /description\?: string/)
  assert.match(lib, /meta\?: string/)
})

test("a rich option names itself by its label and describes itself with its second line and chip; a plain one is unchanged", () => {
  const source = read("src/components/ui/searchable-select.tsx")
  assert.match(source, /const rich = Boolean\(option\.description \|\| option\.meta\)/)
  assert.match(source, /aria-labelledby=\{rich \? `\$\{optionId\}-label` : undefined\}/)
  assert.match(source, /aria-describedby=\{rich \? \[option\.description \? `\$\{optionId\}-description` : null, option\.meta \? `\$\{optionId\}-meta` : null\]\.filter\(Boolean\)\.join\(" "\) : undefined\}/)
  assert.match(source, /<span id=\{`\$\{optionId\}-description`\} className="min-w-0 truncate text-meta text-muted-foreground">\{option\.description\}<\/span>/)
  assert.match(source, /<Chip id=\{`\$\{optionId\}-meta`\} className="shrink-0">\{option\.meta\}<\/Chip>/)
  // The plain row is exactly the old one.
  assert.ok(source.includes('<span className="min-w-0 truncate">{option.label}</span>'), "plain label span kept")
  // The trigger still shows the label alone.
  assert.ok(source.includes("{selectedOption?.label ?? placeholder}"))
})
