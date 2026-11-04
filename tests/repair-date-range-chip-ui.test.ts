import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import test from "node:test"

// Group 5 plan 5 Task 3 (G5P5-R8, spec §11.3): the repair list's date range is a FilterMenuChip popover whose two date
// inputs join the toolbar's GET form through the form attribute (the popover content is portaled, outside the form).
// Sources are read with LF line endings, so the regexes may contain \n.
const read = (path: string) => readFileSync(path, "utf8").replace(/\r\n/g, "\n")
const chipPath = "src/components/maintenance/repair-date-range-chip.tsx"

test("the date chip is a client part with the agreed props", () => {
  const source = read(chipPath)
  assert.match(source, /^"use client"/)
  assert.match(source, /export function RepairDateRangeChip\(\{ formId, dateFrom, dateTo, labels, clearHref \}: \{\n\s+formId: string\n\s+dateFrom: string\n\s+dateTo: string\n\s+labels: RepairDateRangeChipLabels\n\s+clearHref: string\n\}\)/)
  assert.match(source, /export type RepairDateRangeChipLabels = \{ chip: string; applied: string; apply: string; clear: string; from: string; to: string \}/)
})

test("the chip reads ช่วงวันที่ until a date is set, then the applied words, as its whole text", () => {
  const source = read(chipPath)
  assert.match(source, /const active = Boolean\(dateFrom \|\| dateTo\)/)
  assert.match(source, /<FilterMenuChip\n\s+label=\{labels\.chip\}\n\s+valueText=\{active \? labels\.applied : labels\.chip\}\n\s+wholeText\n\s+active=\{active\}\n\s+open=\{open\}\n\s+onOpenChange=\{setOpen\}\n\s+>/)
})

test("the two date inputs and the apply button belong to the toolbar's form; the chip keeps the dates while closed", () => {
  const source = read(chipPath)
  // No min or max: they would freeze at the applied dates and block a valid new range; the page's notice reports from > to.
  assert.match(source, /<Input type="date" name="dateFrom" form=\{formId\} defaultValue=\{dateFrom\} \/>/)
  assert.match(source, /<Input type="date" name="dateTo" form=\{formId\} defaultValue=\{dateTo\} \/>/)
  assert.match(source, /<Button type="submit" form=\{formId\} size="sm">\n\s+\{labels\.apply\}\n\s+<\/Button>/)
  assert.match(source, /\{active \? \(\n\s+<Link href=\{clearHref\} onClick=\{\(\) => setOpen\(false\)\} className=\{buttonVariants\(\{ variant: "outline", size: "sm" \}\)\}>\n\s+\{labels\.clear\}/)
  // Radix unmounts the closed popover, so the applied dates ride in hidden inputs until it opens (one value per name).
  assert.match(source, /\{!open && dateFrom \? <input type="hidden" name="dateFrom" form=\{formId\} value=\{dateFrom\} \/> : null\}/)
  assert.match(source, /\{!open && dateTo \? <input type="hidden" name="dateTo" form=\{formId\} value=\{dateTo\} \/> : null\}/)
  assert.doesNotMatch(source, /dark:|#[0-9a-fA-F]{3,6}\b|rgba?\(|border-dashed|\/\d{2}\b/)
})

test("FilterMenuChip's custom variant can take the caller's whole text (a message that names the filter itself)", () => {
  const source = read("src/components/ui/filter-menu-chip.tsx")
  assert.match(source, /\n\s+wholeText\?: boolean\n/)
  assert.match(source, /const text = wholeText \? valueText : filterMenuChipJoin\(label, valueText\)/)
})
