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
  assert.match(layout, /import \{ Button, buttonVariants \} from "@\/components\/ui\/button"/)
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

test("TabNav is a named nav of links with aria-current and one underline at every width (2B §3.12, I9)", () => {
  const path = "src/components/ui/tab-nav.tsx"
  const source = readFileSync(path, "utf8").replace(/\r\n/g, "\n")
  assertListPrimitiveRules(path, source)
  assert.match(source, /type TabNavProps = Omit<React\.ComponentProps<"nav">, "children" \| "aria-label" \| "onSelect"> & \{/)
  assert.match(source, /export function TabNav\(\{ "aria-label": ariaLabel, items, current, scroll, onSelect, linkClassName, className, \.\.\.navProps \}: TabNavProps\)/)
  assert.match(source, /<nav aria-label=\{ariaLabel\} data-slot="tab-nav" \{\.\.\.navProps\} className=\{cn\("overflow-x-auto overscroll-x-contain", className\)\}>/)
  assert.match(source, /<ul className="flex w-max min-w-full gap-5\.5 shadow-\[inset_0_-1px_0_var\(--border\)\]">/)
  assert.match(source, /aria-current=\{selected \? "page" : undefined\}/)
  assert.match(source, /scroll=\{scroll\}/)
  assert.match(source, /onNavigate=\{onSelect \? \(event\) => onSelect\(item\.key, event\) : undefined\}/)
  assert.match(source, /className=\{cn\(tabNavLinkClasses, selected \? tabNavSelectedClasses : tabNavIdleClasses, linkClassName\)\}/)
  assert.equal(
    source.match(/const tabNavLinkClasses = "([^"]+)"/)?.[1],
    "flex min-h-11 items-center gap-1.5 pt-2 pb-2.5 text-sm transition-colors motion-reduce:transition-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring md:min-h-0",
  )
  assert.equal(source.match(/const tabNavSelectedClasses = "([^"]+)"/)?.[1], "font-semibold text-foreground shadow-[inset_0_-2px_0_var(--primary)] forced-colors:border-b-2 forced-colors:border-[CanvasText] forced-colors:pb-2")
  assert.equal(source.match(/const tabNavIdleClasses = "([^"]+)"/)?.[1], "text-muted-foreground hover:text-foreground hover:shadow-[inset_0_-2px_0_var(--border)]")
  assert.match(source, /cn\("ms-1\.5 text-meta num", selected \? "font-semibold text-primary" : "text-faint-foreground"\)/)
  assert.doesNotMatch(source, /fullBleed|role="tablist"|aria-pressed|scrollbar-none|(?<!forced-colors:)border-b-2/)
})

test("StatStrip is one flat frame of dt/dd cells; a filter cell is primary-soft, never a status fill (2B §3.13)", () => {
  const path = "src/components/ui/stat-strip.tsx"
  const source = readFileSync(path, "utf8").replace(/\r\n/g, "\n")
  assertListPrimitiveRules(path, source)
  assert.match(source, /export function StatStrip\(\{ items, className \}: \{ items: readonly StatStripItem\[\]; className\?: string \}\)/)
  assert.match(source, /<dl data-slot="stat-strip" className=\{cn\("grid grid-cols-2 gap-px overflow-hidden rounded-lg border border-border bg-border max-lg:\[&>:last-child:nth-child\(odd\)\]:col-span-2 lg:auto-cols-fr lg:grid-flow-col lg:grid-cols-none lg:grid-rows-\[repeat\(3,auto\)\]", className\)\}>/)
  assert.equal(source.match(/const statClasses = "([^"]+)"/)?.[1], "group relative row-span-3 grid grid-rows-subgrid content-start gap-y-1 bg-surface px-4 py-3 transition-colors md:px-5 md:py-4")
  assert.equal(source.match(/const statLinkClasses = "([^"]+)"/)?.[1], "has-[a:focus-visible]:ring-2 has-[a:focus-visible]:ring-inset has-[a:focus-visible]:ring-ring")
  assert.equal(source.match(/const statCurrentClasses = "([^"]+)"/)?.[1], "bg-primary-soft shadow-[inset_0_-2px_0_var(--primary)]")
  assert.match(source, /className=\{cn\(statClasses, item\.href && !item\.current && "hover:bg-background", item\.href && statLinkClasses, item\.current && statCurrentClasses\)\}/)
  assert.match(source, /<dt className="text-meta font-medium text-muted-foreground text-balance">/)
  assert.match(source, /aria-current=\{item\.current \? "page" : undefined\} className="after:absolute after:inset-0 focus-visible:outline-none"/)
  assert.match(source, /<ChevronRight aria-hidden="true" className="pointer-events-none absolute top-4\.5 right-4 size-3\.5 text-faint-foreground invisible group-hover:visible group-focus-within:visible" \/>/)
  assert.match(source, /<span className="text-metric num text-foreground">\{item\.value\}<\/span>/)
  assert.match(source, /<span className="text-base font-medium text-faint-foreground">\{item\.unit\}<\/span>/)
  assert.match(source, /cn\("flex min-w-0 items-center gap-1 text-meta", item\.attention \? "text-warning" : "text-faint-foreground"\)/)
  assert.match(source, /const AttentionIcon = toneIcons\.warning/)
  assert.match(source, /<span className="truncate" title=\{item\.footTitle\}>\{item\.foot\}<\/span>/)
  assert.doesNotMatch(source, /\bbg-(?:success|warning|danger|info)-soft\b|\bborder-(?:success|warning|danger|info)-border\b/, "no status fills or borders (DESIGN.md: color only marks what needs action)")
  assert.doesNotMatch(source, /<dl\b[^>]*aria-label/, "a dl takes no aria-label")
  for (const tag of ["<dl ", "<dt ", "<dd "]) assert.ok(source.includes(tag), `uses ${tag.trim()}`)
})

test("KeyValueList pairs dt and dd in a 120px label column and shows Nil for an empty value (2B §3.14)", () => {
  const path = "src/components/ui/key-value-list.tsx"
  const source = readFileSync(path, "utf8").replace(/\r\n/g, "\n")
  assertListPrimitiveRules(path, source)
  assert.match(source, /export type KeyValueItem = \{ key\?: string; label: ReactNode; value: ReactNode; nilLabel\?: string \}/)
  assert.match(source, /export function KeyValueList\(\{ items, className \}: \{ items: readonly KeyValueItem\[\]; className\?: string \}\)/)
  assert.match(source, /<dl data-slot="key-value-list" className=\{cn\("grid grid-cols-\[120px_minmax\(0,1fr\)\] gap-x-4 gap-y-2 max-sm:grid-cols-1 max-sm:gap-y-0\.5 max-sm:\[&>dd\+dt\]:mt-2", className\)\}>/)
  assert.match(source, /<Fragment key=\{item\.key \?\? index\}>/)
  assert.match(source, /<dt className="text-meta text-faint-foreground">\{item\.label\}<\/dt>/)
  assert.match(source, /<dd className="m-0 min-w-0 break-words text-sm text-foreground">\{orNil\(item\.value, item\.nilLabel\)\}<\/dd>/)
  assert.match(source, /import \{ orNil \} from "@\/components\/ui\/nil"/)
  assert.doesNotMatch(source, /"-"|<div\b/, "an empty value is Nil, never a written dash; pairs are dt and dd, not divs")
})

test("ContentPanel divided has a 56px head over a line and a padded or flush body; the default panel is unchanged (2B §3.15)", () => {
  const path = "src/components/ui/content-panel.tsx"
  const source = readFileSync(path, "utf8").replace(/\r\n/g, "\n")
  assertListPrimitiveRules(path, source)
  assert.match(source, /\| \{ divided\?: false; flush\?: never \}/)
  assert.match(source, /\| \{ divided: true; flush\?: boolean \}/)
  assert.match(source, /export function ContentPanel\(\{ title, description, actions, children, className, divided = false, flush = false \}: ContentPanelProps\)/)
  // The default path renders exactly as before 2B.
  assert.match(source, /<section className=\{cn\(getPanelClasses\(\), "p-4 sm:p-5", className\)\}>/)
  assert.match(source, /<div className="mb-4 flex min-w-0 flex-col gap-3 md:flex-row md:items-start md:justify-between">/)
  assert.match(source, /\{actions \? <div className="flex w-full min-w-0 flex-col gap-2 sm:w-auto sm:flex-row sm:flex-wrap">\{actions\}<\/div> : null\}/)
  // divided
  assert.match(source, /<section className=\{cn\(getPanelClasses\(\), className\)\}>/)
  assert.match(source, /<div data-slot="content-panel-head" className="flex min-h-14 min-w-0 flex-wrap items-center justify-between gap-3 border-b border-border px-4 py-2\.5 md:px-5">/)
  assert.match(source, /<h2 className="text-base font-semibold text-foreground text-balance">\{title\}<\/h2>/)
  assert.match(source, /<p className="text-meta text-muted-foreground text-pretty">\{description\}<\/p>/)
  assert.match(source, /\{actions \? <div className="flex flex-wrap items-center gap-2">\{actions\}<\/div> : null\}/)
  assert.match(source, /<div className=\{cn\("min-w-0 max-w-full", !flush && "px-4 py-4 md:px-5"\)\}>\{children\}<\/div>/)
  // rows
  assert.match(source, /export function ContentPanelRows\(\{ className, \.\.\.props \}: React\.ComponentProps<"ul">\)/)
  assert.match(source, /<ul data-slot="content-panel-rows" className=\{cn\("divide-y divide-border-soft \[&>\*\]:px-4 \[&>\*\]:py-3 md:\[&>\*\]:px-5", className\)\} \{\.\.\.props\} \/>/)
})

test("MasterDataSearch is a frameless search toolbar on SearchField and Button, with its props unchanged (2B §6.3.5, I8)", () => {
  const source = readFileSync("src/components/master-data/master-data-layout.tsx", "utf8").replace(/\r\n/g, "\n")
  const search = source.match(/export function MasterDataSearch\([\s\S]*?\n\}\n/)?.[0] ?? ""
  assert.ok(search, "function MasterDataSearch not found")
  assert.match(search, /^export function MasterDataSearch\(\{\n  action,\n  defaultValue,\n  placeholder,\n  submitLabel,\n  hiddenInputs = \{\},\n\}: \{/)
  assert.match(search, /<form role="search" action=\{action\} className="mb-4 flex min-w-0 flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">/)
  assert.match(search, /<input key=\{name\} type="hidden" name=\{name\} value=\{value\} \/>/)
  assert.match(search, /<SearchField name="search" defaultValue=\{defaultValue\} placeholder=\{placeholder\} aria-label=\{submitLabel\} fieldSize="md" className="sm:flex-\[1_1_320px\]" \/>/)
  assert.match(search, /<Button type="submit" variant="outline" size="md">\{submitLabel\}<\/Button>/)
  assert.ok(search.indexOf('type="hidden"') < search.indexOf("<SearchField"), "hidden inputs come before the visible field")
  assert.doesNotMatch(search, /<input\s+type="search"|<button\b|rounded-lg border|bg-surface p-4|onClear/)
  assert.match(source, /import \{ Button, buttonVariants \} from "@\/components\/ui\/button"/)
  assert.match(source, /import \{ SearchField \} from "@\/components\/ui\/search-field"/)
  assert.doesNotMatch(source, /import \{[^}]*\bSearch\b[^}]*\} from "lucide-react"/, "the Search icon left with the raw field")
  assert.doesNotMatch(source, /"use client"/)
})

test("TabNav: the selected tab keeps a 2px underline in forced-colors mode (2B-3 Task 15)", () => {
  const source = readFileSync("src/components/ui/tab-nav.tsx", "utf8").replace(/\r\n/g, "\n")
  const selected = source.match(/const tabNavSelectedClasses = "([^"]+)"/)?.[1] ?? ""
  for (const name of ["shadow-[inset_0_-2px_0_var(--primary)]", "forced-colors:border-b-2", "forced-colors:border-[CanvasText]", "forced-colors:pb-2"]) {
    assert.ok(selected.split(" ").includes(name), `tabNavSelectedClasses has ${name}`)
  }
})
