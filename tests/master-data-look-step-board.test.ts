import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import test from "node:test"

// The group 8 look step (2026-11-07, run E2E-1107E screenshots at 1440 and 390): the category form's template table,
// the supplier page's assets table and repair cards, and the phone filter fold on companies, branches, departments and
// categories. Sources are read with \r stripped, so a regex here may hold \n.
const read = (path: string) => readFileSync(path, "utf8").replace(/\r\n/g, "\n")
const D = "src/app/[locale]/(dashboard)/master-data/"
const table = read("src/components/master-data/category-form/template-table.tsx")
const supplier = read(`${D}suppliers/[id]/page.tsx`)
const th = JSON.parse(read("messages/th.json")) as Record<string, Record<string, unknown>>
const en = JSON.parse(read("messages/en.json")) as Record<string, Record<string, unknown>>

test("the template table: ชื่อ field, ป้ายชื่อ and ป้ายชื่อภาษาไทย share the free width equally; the fixed columns stay narrow", () => {
  const colgroup = table.slice(table.indexOf("<colgroup>"), table.indexOf("</colgroup>"))
  const cols = colgroup.match(/<col\b[^>]*\/>/g) ?? []
  assert.equal(cols.length, 6)
  // The three text columns carry no width, so the fixed layout splits what is left equally: the Thai label is never
  // narrower than the English one (it was ~80px beside two 22% columns).
  for (const [index, name] of ["name", "label", "label-th"].entries()) {
    assert.equal(cols[index], `<col data-template-col="${name}" />`)
  }
  assert.equal(cols[3], '<col className="w-36" />', "ชนิดข้อมูล keeps room for รายการเลือก")
  assert.equal(cols[4], '<col className="w-14" />', "จำเป็น is a checkbox")
  assert.equal(cols[5], '<col className="w-40" />', "ขึ้น, ลง and ⋯ on one line (3 × 36px + gaps + the cell's padding; w-32 wrapped ⋯, look step 2026-11-07)")
  assert.doesNotMatch(colgroup, /w-\[\d+%\]/, "no percentage width on a text column")
  // 1440 beside ผลของการแก้ไข: the card is ~794px; (794 − 144 − 56 − 128) / 3 ≈ 155px a text column, an input of ~143px.
  const fixed = 144 + 56 + 128
  assert.ok((794 - fixed) / 3 >= 150, "each text column fits a 12-character Thai label at 1440")
  assert.ok((720 - fixed) / 3 >= 120, "and still a usable input at the table's minimum width")
  // The table keeps its horizontal scroll below that.
  assert.match(table, /<DataTable\n\s+framed=\{false\}\n\s+layout="fixed"\n\s+minWidth=\{720\}/)
  assert.match(table, /scrollHint=\{tCommon\("tableScrollHint"\)\}/)
})

test("the supplier's assets table: every column fits the ~730px main column at 1440 (only the badge and the amount stay on one line)", () => {
  const start = supplier.indexOf("<DataTable data-supplier-assets-desktop")
  const desktop = supplier.slice(start, supplier.indexOf("</DataTable>", start))
  assert.match(desktop, /scrollHint=\{tCommon\("tableScrollHint"\)\}/, "the hint stays for widths where it still overflows")
  assert.match(desktop, /<DataTableCell data-supplier-asset-cell="asset" className="min-w-36">/)
  assert.match(desktop, /<DataTableCell data-supplier-asset-cell="categoryLocation" className="min-w-32">\n\s+<span className="block text-foreground">\{asset\.categoryName\}<\/span>\n\s+<span className="block text-meta text-muted-foreground">\{asset\.locationName\} · \{asset\.branchName\}<\/span>/)
  assert.match(desktop, /<DataTableCell data-supplier-asset-cell="document">/, "the document cell may wrap")
  assert.match(desktop, /<span className="tag whitespace-nowrap">\{asset\.documents\[0\]\.documentNo\}<\/span>/, "a document number stays whole")
  assert.match(desktop, /<DataTableCell numeric className="text-muted-foreground">/, "the amount right-aligned with tabular figures")
  assert.doesNotMatch(desktop, /min-w-48|min-w-40|<DataTableCell className="whitespace-nowrap">/)
  // The narrowest the five columns get (px): 144 + 128 + a badge ~124 + a document number ~146 + the amount ~130.
  assert.ok(144 + 128 + 124 + 146 + 130 <= 730)
})

test("the supplier's repair cards: the title takes the full width and the badge sits on its own line under it", () => {
  const start = supplier.indexOf("detail.repairHistory.map")
  const card = supplier.slice(start, supplier.indexOf("return (", start))
  assert.match(card, /<div data-supplier-repair-title className="font-medium text-foreground">\{ticket\.asset\.name\}<\/div>\n\s+<div className="mt-1 flex">\n\s+<StatusBadge /)
  assert.doesNotMatch(card, /justify-between gap-2">\n\s+<span className="min-w-0 font-medium text-foreground">\{ticket\.asset\.name\}/, "no badge beside the title")
  assert.doesNotMatch(card, /break-all/)
})

const folds = [
  { page: "companies", ns: "company", has: /const hasFieldFilters = Boolean\(listState\.search \|\| listState\.assetUsage !== "all" \|\| listState\.branchUsage !== "all"\)/ },
  { page: "branches", ns: "branch", has: /const hasFieldFilters = Boolean\(listState\.search \|\| listState\.companyId \|\| listState\.assetUsage !== "all" \|\| listState\.locationUsage !== "all"\)/ },
  { page: "departments", ns: "department", has: /const hasFieldFilters = departmentListHasFilters\(listState\)/ },
  { page: "categories", ns: "category", has: /const hasFieldFilters = Boolean\(\n\s+searchText \|\|\n\s+listState\.assetUsage !== "all" \|\|\n\s+listState\.modelStatus !== "all" \|\|\n\s+listState\.customFieldStatus !== "all" \|\|\n\s+listState\.checklistStatus !== "all" \|\|\n\s+listState\.prefixStatus !== "all",\n\s+\)/ },
] as const

for (const fold of folds) {
  test(`${fold.page}: phones fold the filters under ค้นหาและตัวกรอง (as suppliers and employees); the desktop panel is unchanged`, () => {
    const page = read(`${D}${fold.page}/page.tsx`)
    assert.match(page, fold.has)
    assert.match(page, /const hasActiveFilters = listState\.status !== "active" \|\| hasFieldFilters\n/, "the status switch still counts for ล้างตัวกรอง, not for the fold")
    assert.match(page, /import \{ getPanelClasses \} from "@\/lib\/design-system"/)
    assert.match(page, /import \{[^}]*\bSlidersHorizontal\b[^}]*\} from "lucide-react"/)
    // One form, rendered twice: Field gives each copy its own ids (useId), so no id is shared.
    assert.equal(page.match(/const filterForm = \(className: string\) => \(\n\s+<form key=\{\w+ReturnHref\} role="search" action=\{basePath\} className=\{className\}>/g)?.length, 1)
    assert.equal(page.match(/<form\b/g)?.length, 1, "the page writes the form once")
    const form = page.slice(page.indexOf("const filterForm"), page.indexOf("</form>"))
    assert.doesNotMatch(form, /\bid=|htmlFor=/, "no fixed id in the form, so the two copies never share one")
    const at = page.indexOf('<details className={cn(getPanelClasses(), "md:hidden")} open={hasFieldFilters}>')
    assert.ok(at > 0, "the phone disclosure, open while a field filter is set")
    const details = page.slice(at, page.indexOf("</details>", at))
    assert.match(details, /<summary className="flex min-h-11 cursor-pointer list-none items-center gap-2 px-4 text-sm font-semibold text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring">\n\s+<SlidersHorizontal className="h-4 w-4" aria-hidden="true" \/>\n\s+\{t\("filtersTitle"\)\}\n\s+<\/summary>/)
    assert.match(details, /\{filterForm\("grid gap-3 border-t border-border p-4"\)\}/)
    assert.match(page, /<FilterPanel className="hidden md:block">\{filterForm\("grid grid-cols-\[repeat\(auto-fit,minmax\(min\(100%,11rem\),1fr\)\)\] gap-3"\)\}<\/FilterPanel>/)
    assert.ok(at < page.indexOf('<FilterPanel className="hidden md:block">'), "the fold comes first, as on suppliers")
    assert.equal(page.match(/\{filterForm\(/g)?.length, 2)
    // Every field, sort and the direction stay in the one form.
    for (const name of ["search", "sort", "direction"]) assert.match(form, new RegExp(`name="${name}"`))
    assert.match(form, /<FilterFormActions submitLabel=\{tCommon\("filter"\)\} clear=\{hasActiveFilters \? \{ href: basePath, label: t\("clearFilters"\) \} : undefined\} \/>/)
    // The suppliers page's wording.
    assert.equal(th[fold.ns].filtersTitle, th.supplier.filtersTitle)
    assert.equal(en[fold.ns].filtersTitle, en.supplier.filtersTitle)
  })
}
