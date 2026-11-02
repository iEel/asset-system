import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import test from "node:test"
import { filterMenuChipMatches, filterMenuChipText, type FilterMenuChipOption } from "../src/lib/filter-menu-chip.ts"

// Group 4 plan 6 (P6-R4): FilterChipList renders remove links only, so the labels queue's filters are a new shared
// client part: a chip trigger that reads "<ชื่อตัวกรอง>: <ชื่อ>", a DropdownMenu of radio items whose options read
// "code - name" (spec §5), a searchable variant in a Popover (the room chip), and a slot for custom content (the date
// range chip, Task 4).
const read = (path: string) => readFileSync(path, "utf8").replace(/\r\n/g, "\n")
const chip = () => read("src/components/ui/filter-menu-chip.tsx")

const companies: FilterMenuChipOption[] = [
  { value: "", label: "ทั้งหมด" },
  { value: "c1", label: "GRL - Glink Rental", name: "Glink Rental" },
  { value: "c2", label: "GTH - Glink Thai" },
]

test("the closed chip reads <label>: <the chosen option's name>, the option's label when it has no name", () => {
  assert.equal(filterMenuChipText("บริษัท", companies, ""), "บริษัท: ทั้งหมด")
  assert.equal(filterMenuChipText("บริษัท", companies, "c1"), "บริษัท: Glink Rental")
  assert.equal(filterMenuChipText("บริษัท", companies, "c2"), "บริษัท: GTH - Glink Thai")
  // A value with no option yet (the options still loading) shows the filter's name alone, never "บริษัท: undefined".
  assert.equal(filterMenuChipText("บริษัท", companies, "c9"), "บริษัท")
})

test("the room chip's search matches the code or the name, ignoring case and spaces, in the options' order", () => {
  const rooms: FilterMenuChipOption[] = [
    { value: "", label: "ทั้งหมด" },
    { value: "r1", label: "R-301 - ห้องบัญชี ชั้น 3", name: "ห้องบัญชี ชั้น 3" },
    { value: "r2", label: "R-101 - Lobby", name: "Lobby" },
    { value: "r3", label: "R-302 - ห้องประชุม ชั้น 3", name: "ห้องประชุม ชั้น 3" },
  ]
  assert.deepEqual(filterMenuChipMatches(rooms, "").map((room) => room.value), ["", "r1", "r2", "r3"])
  assert.deepEqual(filterMenuChipMatches(rooms, "r-30").map((room) => room.value), ["r1", "r3"])
  assert.deepEqual(filterMenuChipMatches(rooms, "LOBBY").map((room) => room.value), ["r2"])
  assert.deepEqual(filterMenuChipMatches(rooms, "ชั้น 3").map((room) => room.value), ["r1", "r3"])
  assert.deepEqual(filterMenuChipMatches(rooms, "ห้องบัญชีชั้น3").map((room) => room.value), ["r1"])
  assert.deepEqual(filterMenuChipMatches(rooms, "ไม่มี"), [])
})

test("the trigger is one chip button: the text is its name, the chevron is hidden, 44px on phones, a focus ring, tokens only", () => {
  const source = chip()
  assert.match(source, /^"use client"/)
  assert.equal(source.match(/<button\b/g)?.length, 1, "one raw button: the chip trigger, shared by the three variants")
  assert.match(source, /<button\n?\s*type="button"\n?\s*data-slot="filter-menu-chip"/)
  assert.match(source, /<span className="min-w-0 truncate">\{text\}<\/span>/)
  assert.match(source, /<ChevronDown aria-hidden="true" className="size-3\.5 shrink-0" \/>/)
  assert.match(source, /min-h-11/)
  assert.match(source, /md:h-8 md:min-h-0/)
  assert.match(source, /focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2/)
  // An applied filter looks like FilterChipList's applied chip; an idle one is a plain outlined chip.
  assert.match(source, /const chipActiveClasses = "border-primary-border bg-primary-soft font-semibold text-primary-hover"/)
  assert.match(source, /const chipIdleClasses = "border-border bg-surface font-medium text-foreground hover:bg-background"/)
  assert.match(source, /data-active=\{active \|\| undefined\}/)
  assert.doesNotMatch(source, /#[0-9a-fA-F]{3,8}\b|rgba?\(|\bdark:|\/\d{1,3}\b(?!\))|opacity-/)
})

test("the menu variant: Radix's DropdownMenu trigger (aria-haspopup, aria-expanded, arrow keys) and one radio item per option", () => {
  const source = chip()
  assert.match(source, /<DropdownMenuTrigger asChild>\n\s*<ChipButton text=\{text\} active=\{active\} className=\{className\} \/>\n\s*<\/DropdownMenuTrigger>/)
  assert.match(source, /<DropdownMenuLabel>\{label\}<\/DropdownMenuLabel>/)
  assert.match(source, /<DropdownMenuRadioGroup value=\{value\} onValueChange=\{onValueChange\}>/)
  assert.match(source, /<DropdownMenuRadioItem key=\{option\.value\} value=\{option\.value\}>\n\s*<span className="min-w-0 truncate">\{option\.label\}<\/span>\n\s*<\/DropdownMenuRadioItem>/)
})

test("the searchable variant: a Popover named by the filter, a search box named by its placeholder, the matching options", () => {
  const source = chip()
  assert.match(source, /<PopoverTrigger asChild>\n\s*<ChipButton text=\{text\} active=\{active\} className=\{className\} \/>\n\s*<\/PopoverTrigger>/)
  assert.match(source, /<PopoverContent align="start" aria-label=\{label\} className="w-80 max-w-\[calc\(100vw-2rem\)\] p-0">/)
  assert.match(source, /<Command shouldFilter=\{false\} loop label=\{label\}>/)
  assert.match(source, /<CommandInput value=\{query\} onValueChange=\{setQuery\} placeholder=\{searchPlaceholder\} aria-label=\{searchPlaceholder\} \/>/)
  assert.match(source, /const matches = useMemo\(\(\) => filterMenuChipMatches\(options, query\), \[options, query\]\)/)
  assert.match(source, /<CommandEmpty>\{emptyLabel\}<\/CommandEmpty>/)
  assert.match(source, /<CommandList className="max-h-64" hidden=\{matches\.length === 0\}>/)
  // A choice calls back and closes; closing clears the search, so the list is whole the next time.
  assert.match(source, /onSelect=\{\(\) => choose\(option\.value\)\}/)
  assert.match(source, /function setOpenState\(next: boolean\) \{\n\s*setOpen\(next\)\n\s*if \(!next\) setQuery\(""\)\n\s*\}/)
  assert.match(source, /\{option\.value === value \? <Check className="ml-auto size-4 text-primary" aria-hidden="true" \/> : null\}/)
})

test("the custom variant: a Popover named by the filter that holds the caller's content (the date range)", () => {
  const source = chip()
  assert.match(source, /<PopoverContent align="start" aria-label=\{label\} className="w-80 max-w-\[calc\(100vw-2rem\)\]">\n\s*\{children\}\n\s*<\/PopoverContent>/)
  assert.match(source, /filterMenuChipJoin\(label, valueText\)/)
})

test("the guards know the part: N3 lists it as a raw-button owner, and it avoids the local filter-select names", () => {
  assert.match(read("tests/visual-foundation-guards.test.ts"), /const RAW_BUTTON_OWNERS = \[[^\]]*"src\/components\/ui\/filter-menu-chip\.tsx"[^\]]*\]/)
  assert.doesNotMatch(chip(), /\bfunction (?:FilterSelect|ReportSelect|LabeledSelect)\b|\bfunction Filter\(/)
})
