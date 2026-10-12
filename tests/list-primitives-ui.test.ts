import assert from "node:assert/strict"
import { existsSync, readFileSync } from "node:fs"
import test from "node:test"

// Phase 2B list primitives (spec 2B §3, §10.2). Each later 2B-1 primitive task appends its own block below, with its
// own server-safe and class checks. Sources are read with \r stripped, so a regex here may hold \n.
const UI = "src/components/ui/"
const read = (path: string) => (existsSync(path) ? readFileSync(path, "utf8").replace(/\r\n/g, "\n") : "")

// Server-safe primitives (spec 2B §3.2): no client directive, no state, no effect, no context.
const SERVER_SAFE = ["page-header.tsx"]
// Every 2B primitive, client ones included, keeps to the shared class rules (spec 2B §3.2, §3.21 table C).
const PRIMITIVES = [...SERVER_SAFE]

test("the 2B list primitives render on the server", () => {
  for (const name of SERVER_SAFE) {
    assert.ok(existsSync(UI + name), `${UI}${name} is missing`)
    assert.doesNotMatch(read(UI + name), /"use client"|\buseState\b|\buseEffect\b|\bcreateContext\b|\buseContext\b/, name)
  }
})

test("the 2B list primitives keep to the shared class rules", () => {
  for (const name of PRIMITIVES) {
    assert.ok(existsSync(UI + name), `${UI}${name} is missing`)
    assert.doesNotMatch(
      read(UI + name),
      /\bshadow-(?:sm|md|lg|xl|2xl)\b|\bopacity-|\bleading-tight\b|\bleading-4\b|rounded-\[|\bflex-col-reverse\b|\buppercase\b|\bbg-muted\//,
      name,
    )
  }
})

test("PageHeader: one h1 at 600, breadcrumbs 4px above it, a meta row, and buttons that share the title row from md (I1)", () => {
  const source = read(`${UI}page-header.tsx`)
  assert.match(source, /export function PageHeader\(\{ title, meta, actions, back, breadcrumbs, compactOnMobile = false, className \}: PageHeaderProps\)/)
  for (const prop of ["title: ReactNode", "meta\\?: ReactNode", "actions\\?: ReactNode", "back\\?: ReactNode", "breadcrumbs\\?: BreadcrumbItem\\[\\]", "compactOnMobile\\?: boolean", "className\\?: string"]) {
    assert.match(source, new RegExp(`\\n  ${prop}\\n`), prop)
  }
  assert.match(source, /<header data-slot="page-header" className=\{cn\("min-w-0", className\)\}>/)
  assert.doesNotMatch(source.match(/<header\b[^>]*>/)?.[0] ?? "", /\bm[tb]-/, "the header has no outer margin")
  assert.equal(source.match(/<Breadcrumbs\b/g)?.length, 1)
  assert.match(source, /\{breadcrumbs \? <Breadcrumbs items=\{breadcrumbs\} className="mb-1" \/> : null\}/)
  assert.match(
    source,
    /compactOnMobile \? "flex items-center justify-between gap-3 md:items-start md:gap-x-6" : "flex flex-col gap-3 md:flex-row md:items-start md:justify-between md:gap-x-6"/,
  )
  assert.match(source, /<h1 className=\{cn\("text-2xl font-semibold text-balance break-words text-foreground", compactOnMobile && "max-md:text-xl"\)\}>\{title\}<\/h1>/)
  assert.equal(source.match(/<h1\b/g)?.length, 1)
  assert.match(source, /data-slot="page-header-meta" className=\{cn\("mt-1 flex max-w-3xl flex-wrap items-center gap-x-3 gap-y-1 text-meta text-muted-foreground", compactOnMobile && "max-md:hidden"\)\}/)
  assert.match(source, /data-slot="page-header-actions" className=\{cn\("flex flex-wrap items-center gap-2 md:justify-end", compactOnMobile && "shrink-0"\)\}>\n\s+\{back\}\n\s+\{actions\}\n/)
  assert.doesNotMatch(source, /\bfont-bold\b|\buseTranslations\b|\bdescription\b|\bflex-1\b/)
})

test("PageBackLink: outline md with a left arrow, a 44px icon button below md whose name is the visible words (I1, B2)", () => {
  const source = read(`${UI}page-header.tsx`)
  assert.match(source, /export type PageBackLinkProps = \{\n(?:  \/\/[^\n]*\n)?  href: string\n(?:  \/\/[^\n]*\n)?  label: string\n(?:  \/\/[^\n]*\n)?  onClick\?: MouseEventHandler<HTMLAnchorElement>\n(?:  \/\/[^\n]*\n)?  className\?: string\n\}/)
  assert.match(
    source,
    /<Link href=\{href\} onClick=\{onClick\} data-slot="page-back-link" className=\{cn\(buttonVariants\(\{ variant: "outline", size: "md" \}\), "min-w-11 max-md:px-0", className\)\}>\n\s+<ArrowLeft aria-hidden="true" \/>\n\s+<span className="max-md:sr-only">\{label\}<\/span>\n\s+<\/Link>/,
  )
  assert.doesNotMatch(source, /aria-label=/)
})

test("MasterDataHeader is a thin wrapper of PageHeader until its last callers move (I2)", () => {
  const layout = read("src/components/master-data/master-data-layout.tsx")
  assert.match(layout, /import \{ buttonVariants \} from "@\/components\/ui\/button"/)
  assert.match(layout, /import \{ PageHeader \} from "@\/components\/ui\/page-header"/)
  assert.match(layout, /<PageHeader\n\s+title=\{title\}\n\s+meta=\{subtitle\}\n\s+compactOnMobile=\{compactOnMobile\}\n/)
  assert.match(layout, /<Link href=\{createHref\} className=\{buttonVariants\(\{ size: "md" \}\)\}>\n\s+<Plus aria-hidden="true" \/>\n\s+\{createLabel\}\n\s+<\/Link>/)
  assert.doesNotMatch(layout, /<h1\b|\bfont-bold\b/)
})

// Task 4 (spec 2B §3.4–3.7, I3, I4): DataTable with TableEmptyRow, the client scroll hint, and the shared row classes.
// Each test reads its files itself, so this block needs only the three imports at the top of the file.
test("DataTable keeps one density, the B3 header and cell look, and real table semantics (I3)", () => {
  const source = readFileSync("src/components/ui/data-table.tsx", "utf8").replace(/\r\n/g, "\n")
  const constant = (name: string) => source.match(new RegExp(`export const ${name} = "([^"]+)"`))?.[1]

  assert.equal(constant("dataTableHeadClasses"), "border-b border-border bg-surface px-3 py-2.5 text-left align-bottom text-meta font-medium whitespace-nowrap text-faint-foreground first:pl-4 last:pr-4 md:first:pl-5 md:last:pr-5")
  assert.equal(constant("dataTableCellClasses"), "border-b border-border-soft p-3 align-top first:pl-4 last:pr-4 md:first:pl-5 md:last:pr-5")
  assert.equal(constant("dataTableRowClasses"), "group/row transition-colors hover:bg-row-hover hover:duration-0 focus-within:bg-row-hover focus-within:duration-0 has-[[aria-expanded=true]]:bg-row-hover")
  assert.doesNotMatch(source, /group-data-\[density|data-density|group\/table/, "one density only: the register keeps its compact rows in its own file (I3)")
  assert.doesNotMatch(source, /"use client"|\buse(?:State|Effect|Context)\b|\bcreateContext\b/, "server-safe, no hooks (R-j)")
  assert.doesNotMatch(source, /\bshadow-(?:sm|md|lg|xl|2xl)\b|opacity-|leading-tight|leading-4|rounded-\[|flex-col-reverse|uppercase|bg-muted\//)
  assert.match(source, /const dataTableFrameClasses = "min-w-0 max-w-full overflow-hidden rounded-lg border border-border bg-surface"/)
  assert.match(source, /<table className=\{cn\("w-full text-sm", layout === "fixed" && "table-fixed"\)\} style=\{minWidth \? \{ minWidth \} : undefined\}>/)
  assert.match(source, /<caption className="sr-only">\{caption\}<\/caption>/)
  assert.match(source, /<DataTableScrollArea hint=\{scrollHint\} label=\{caption\}>/)
  assert.match(source, /<div data-slot="data-table-scroll" className="overflow-x-auto overscroll-x-contain">/)
  assert.match(source, /scope="col"/)
  assert.match(source, /aria-sort=\{direction === "asc" \? "ascending" : direction === "desc" \? "descending" : undefined\}/)
  assert.match(source, /<ArrowUp className="size-3\.5 shrink-0" aria-hidden="true" \/>/)
  assert.match(source, /<ArrowDown className="size-3\.5 shrink-0" aria-hidden="true" \/>/)
  assert.match(source, /<span className="sr-only">\{children\}<\/span>/, "hideLabel keeps the column name for screen readers")
  assert.match(source, /className=\{cn\("\[&>tr:last-child>td\]:border-b-0", className\)\}/)
  assert.match(source, /numeric && "text-right whitespace-nowrap num"/)
  assert.match(source, /"border-t border-border bg-surface px-4 py-2\.5 text-meta text-muted-foreground num md:px-5"/)
  assert.match(source, /<td colSpan=\{colSpan\} className="p-0">/)
  assert.match(source, /<ActionEmptyState \{\.\.\.content\.emptyState\} \/> : <EmptyNote padded tone=\{content\.tone\}>/)
  assert.doesNotMatch(source, /<tr data-slot="table-empty-row" className/, "the empty row has no hover fill")
})

test("DataTableScrollArea shows the hint and a focusable region only while the table overflows (B6, I4)", () => {
  const source = readFileSync("src/components/ui/data-table-scroll.tsx", "utf8").replace(/\r\n/g, "\n")

  assert.ok(source.startsWith('"use client"'), "the one client leaf of DataTable")
  assert.match(source, /const observer = new ResizeObserver\(measure\)/)
  assert.match(source, /setOverflowing\(element\.scrollWidth > element\.clientWidth \+ 1\)/)
  assert.match(source, /if \(element\.firstElementChild\) observer\.observe\(element\.firstElementChild\)/)
  assert.match(source, /return \(\) => observer\.disconnect\(\)/)
  assert.match(source, /const region = overflowing && Boolean\(label\)/)
  assert.match(source, /role=\{[^}]*"region"/)
  assert.match(source, /aria-label=\{region \? label : undefined\}/)
  assert.match(source, /tabIndex=\{region \? 0 : undefined\}/)
  assert.match(source, /\{overflowing \? \(\s*<p data-slot="data-table-scroll-hint" className="flex items-center gap-1\.5 border-b border-border-soft px-4 py-1\.5 text-meta text-faint-foreground md:px-5 \[&>svg\]:size-4 \[&>svg\]:shrink-0">/)
  assert.match(source, /<MoveHorizontal aria-hidden="true" \/>/)
  assert.match(source, /className="overflow-x-auto overscroll-x-contain focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring"/)
  assert.doesNotMatch(source, /\bshadow-(?:sm|md|lg|xl|2xl)\b|opacity-|leading-tight|leading-4|rounded-\[|flex-col-reverse|uppercase|bg-muted\//)
})

test("ClickableTableRow takes the shared row classes: lit while focus is inside, and while its menu is open (§3.7)", () => {
  const source = readFileSync("src/components/ui/clickable-table-row.tsx", "utf8").replace(/\r\n/g, "\n")

  assert.match(source, /import \{ dataTableRowClasses \} from "@\/components\/ui\/data-table"/)
  assert.match(source, /className=\{cn\(dataTableRowClasses, "cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring", className\)\}/)
  assert.doesNotMatch(source, /focus:bg-row-hover|className = ""/, "focus-within covers focus on the row itself")
  assert.match(source, /target\.closest\("a,button,input,select,textarea,\[data-no-row-click\]"\)/, "clicks on controls inside the row still do not open it")
})

test("the shared table scroll hint reads the first sentence of the register's hint (I33)", () => {
  const messages = (locale: "th" | "en") => JSON.parse(readFileSync(`messages/${locale}.json`, "utf8"))

  assert.equal(messages("th").common.tableScrollHint, "เลื่อนตารางซ้าย/ขวาเพื่อดูคอลัมน์เพิ่มเติม")
  assert.equal(messages("en").common.tableScrollHint, "Scroll left/right to see more columns.")
  for (const locale of ["th", "en"] as const) {
    assert.ok(messages(locale).asset.tableScrollHint.startsWith(messages(locale).common.tableScrollHint), locale)
  }
})

// Task 5 (spec 2B §3.8, I33): Pagination in the table foot, with the range and the page sizes.
test("Pagination puts the range left, page sizes as Segmented-look links, and words-only outline sm buttons (§3.8)", () => {
  const source = readFileSync("src/components/ui/pagination.tsx", "utf8").replace(/\r\n/g, "\n")
  const constant = (name: string) => source.match(new RegExp(`const ${name} = "([^"]+)"`))?.[1]

  assert.doesNotMatch(source, /"use client"|\buse(?:State|Effect|Context)\b|\bcreateContext\b/, "server-safe, no hooks")
  assert.doesNotMatch(source, /\bshadow-(?:sm|md|lg|xl|2xl)\b|opacity-|leading-tight|leading-4|rounded-\[|flex-col-reverse|uppercase|bg-muted/)
  assert.doesNotMatch(source, /ChevronLeft|ChevronRight/, "words only, like the mockup's table foot")
  assert.match(source, /const controlClasses = buttonVariants\(\{ variant: "outline", size: "sm" \}\)/)
  assert.match(source, /<nav aria-label=\{labels\.navigation\} className=\{cn\("flex flex-wrap items-center justify-between gap-x-3 gap-y-2", className\)\}>/)
  assert.match(source, /<p aria-live="polite" className="text-meta text-muted-foreground num">/)
  assert.match(source, /\{labels\.range \? <>\{labels\.range\}<span aria-hidden="true"> · <\/span><\/> : null\}/)
  assert.match(source, /<div role="group" aria-label=\{labels\.pageSizeGroup\} className="flex items-center gap-2">/)
  assert.match(source, /<span aria-hidden="true" className="text-meta text-muted-foreground">\{labels\.rowsPerPage\}<\/span>/)
  assert.match(source, /aria-current=\{size\.value === pageSize \? "true" : undefined\}/)
  assert.equal(constant("pageSizeFrameClasses"), "inline-flex gap-0.5 rounded-md border border-border bg-surface p-0.5")
  assert.equal(constant("pageSizeOptionClasses"), "inline-flex min-h-11 min-w-11 items-center justify-center rounded-control px-2 text-meta transition-colors motion-reduce:transition-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring md:min-h-6.5 md:min-w-8")
  assert.equal(constant("pageSizeCurrentClasses"), "bg-primary-soft font-semibold text-primary-hover")
  assert.equal(constant("pageSizeIdleClasses"), "font-medium text-muted-foreground hover:bg-background hover:text-foreground")
  assert.match(source, /<PaginationControl href=\{previousHref\} enabled=\{page > 1\} rel="prev" label=\{labels\.previous\} \/>/)
  assert.match(source, /<PaginationControl href=\{nextHref\} enabled=\{page < totalPages\} rel="next" label=\{labels\.next\} \/>/)
  assert.match(source, /<span aria-disabled="true" className=\{controlClasses\}>/, "a disabled button takes no focus and keeps the shared disabled look")
  assert.match(source, /<Link href=\{href\} rel=\{rel\} className=\{controlClasses\}>/)
  assert.match(source, /pageSizes\?: readonly PaginationPageSize\[\]/)
})

test("the pagination range and page-size group read the register's words (I33)", () => {
  const messages = (locale: "th" | "en") => JSON.parse(readFileSync(`messages/${locale}.json`, "utf8"))

  assert.equal(messages("th").common.showingRange, "{from}–{to} จาก {total} รายการ")
  assert.equal(messages("en").common.showingRange, "{from}–{to} of {total}")
  assert.equal(messages("th").common.pageSizeLabel, "จำนวนต่อหน้า")
  assert.equal(messages("en").common.pageSizeLabel, "Rows per page")
  for (const locale of ["th", "en"] as const) {
    assert.equal(messages(locale).common.showingRange, messages(locale).asset.registerRange, locale)
    assert.equal(messages(locale).common.pageSizeLabel, messages(locale).asset.pageSizeLabel, locale)
  }
})

// Spec 2B §3.2 and §3.21 table C row 1, for the primitive files the blocks below read: server-safe (no client
// directive, no state or context hook) and none of the classes the 2A guards retire. Declared once (Task 6).
function assertListPrimitiveRules(path: string, source: string) {
  for (const pattern of [/"use client"/, /\buseState\b/, /\buseEffect\b/, /\bcreateContext\b/, /\buseContext\b/]) {
    assert.doesNotMatch(source, pattern, `${path} must stay server-safe`)
  }
  for (const pattern of [/\bshadow-(?:sm|md|lg|xl|2xl)\b/, /opacity-/, /\bleading-tight\b/, /\bleading-4\b/, /rounded-\[/, /\bflex-col-reverse\b/, /\buppercase\b/, /bg-muted\//]) {
    assert.doesNotMatch(source, pattern, `${path} uses a retired class`)
  }
}

test("FilterSelect is a Field around NativeSelect, 40px by default, with an optional all option (2B §6.3.1, I6)", () => {
  const path = "src/components/ui/filter-select.tsx"
  const source = readFileSync(path, "utf8").replace(/\r\n/g, "\n")
  assertListPrimitiveRules(path, source)
  assert.match(source, /import \{ Field \} from "@\/components\/ui\/field"/)
  assert.match(source, /import \{ NativeSelect \} from "@\/components\/ui\/native-select"/)
  assert.match(source, /export type FilterSelectOption = \{ value: string; label: string \}/)
  assert.match(source, /type FilterSelectProps = Omit<React\.ComponentProps<"select">, "size" \| "multiple" \| "className"> & \{/)
  assert.match(source, /export function FilterSelect\(\{ label, options, allLabel, fieldSize = "lg", hideLabel, labelAction, className, children, \.\.\.selectProps \}: FilterSelectProps\)/)
  assert.match(source, /<Field label=\{label\} hideLabel=\{hideLabel\} labelAction=\{labelAction\} className=\{className\}>/)
  assert.match(source, /<NativeSelect fieldSize=\{fieldSize\} \{\.\.\.selectProps\}>/)
  assert.match(source, /\{allLabel \? <option value="">\{allLabel\}<\/option> : null\}/)
  const order = ["{allLabel ?", "{options?.map(", "{children}"].map((text) => source.indexOf(text))
  assert.ok(order[0] !== -1 && order[0] < order[1] && order[1] < order[2], "options render as allLabel, then options, then children")
  assert.doesNotMatch(source, /<select\b|<label\b|data-slot=/, "no raw select or label, and no data-slot of its own: Field and NativeSelect bring theirs")
})

test("FilterChipList makes each chip one remove link named by what it removes, 36px from md (2B §6.3.3, I7)", () => {
  const path = "src/components/ui/filter-chips.tsx"
  const source = readFileSync(path, "utf8").replace(/\r\n/g, "\n")
  assertListPrimitiveRules(path, source)
  assert.match(source, /export type FilterChipItem = \{ key: string; label: string; href: string; mobileOnly\?: boolean \}/)
  assert.match(source, /export function FilterChipList\(\{ chips, label, removeLabel, clearAll, className \}: FilterChipListProps\)/)
  assert.match(source, /if \(chips\.length === 0\) return null/)
  assert.match(source, /<div role="group" aria-label=\{label\} data-slot="filter-chips" className=\{cn\("flex min-w-0 flex-wrap items-center gap-2", chips\.every\(\(chip\) => chip\.mobileOnly\) && "md:hidden", className\)\}>/)
  assert.match(source, /aria-label=\{`\$\{removeLabel\}: \$\{chip\.label\}`\}/)
  assert.equal(
    source.match(/className=\{cn\("(group\/chip [^"]+)", chip\.mobileOnly && "md:hidden"\)\}/)?.[1],
    "group/chip inline-flex min-h-11 max-w-full items-center gap-1.5 rounded-md border border-primary-border bg-primary-soft pl-3 pr-1 text-meta text-primary-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 md:h-9 md:min-h-0",
  )
  assert.match(source, /<span aria-hidden="true" className="inline-flex size-6 shrink-0 items-center justify-center rounded-sm transition-colors motion-reduce:transition-none group-hover\/chip:bg-primary-border">/)
  assert.match(source, /<Link href=\{clearAll\.href\} className=\{cn\(linkVariants\(\), "inline-flex min-h-11 items-center md:min-h-0"\)\}>/)
  assert.doesNotMatch(source, /rounded-full/)
})
