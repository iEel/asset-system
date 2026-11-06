import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import test from "node:test"

// Plan 2D-3 (spec 2D §3.3, D7, D9, M7, M21, M22, M25, M29, M32 a, M33): the master-data lists, detail pages and forms
// on the shared parts. The drill-down counts are text links with a 44px phone target, the active state is a
// StatusBadge (M7), panels are ContentPanel (or the panel classes where the element cannot be one). Each test pins one
// file (or one tight pair) and fails before that commit. Sources are read with LF line endings.
const read = (path: string) => readFileSync(path, "utf8").replace(/\r\n/g, "\n")
const D = "src/app/[locale]/(dashboard)/"
// The 2D-2 precedent (reports, work center): a stand-alone text link adds the 44px phone target at the call site.
const drilldownLink = /className=\{cn\(linkVariants\(\{ size: "inherit" \}\), "inline-flex min-h-11 items-center md:min-h-0"\)\}/g

test("branches list: drill-down counts are text links with a 44px phone target, and the active state is a StatusBadge (spec 2D M7, §3.3)", () => {
  const source = read(`${D}master-data/branches/page.tsx`)
  assert.equal(source.match(drilldownLink)?.length, 2)
  assert.match(source, /<StatusBadge label=\{(\w+)\.isActive \? tCommon\("active"\) : tCommon\("inactive"\)\} tone=\{\1\.isActive \? "success" : "muted"\} \/>/)
  assert.doesNotMatch(source, /ActiveBadge|hover:bg-primary-soft|\bh-8\b|className="px-2"/)
})

test("categories list: the model and asset counts are text links with a 44px phone target, and the active state is a StatusBadge (spec 2D M7, §3.3)", () => {
  const source = read(`${D}master-data/categories/page.tsx`)
  assert.equal(source.match(drilldownLink)?.length, 2)
  assert.match(source, /<StatusBadge label=\{(\w+)\.isActive \? tCommon\("active"\) : tCommon\("inactive"\)\} tone=\{\1\.isActive \? "success" : "muted"\} \/>/)
  assert.doesNotMatch(source, /ActiveBadge|hover:bg-primary-soft|\bh-8\b|className="px-2"/)
})

test("companies list: the branch and asset counts are text links with a 44px phone target, and the active state is a StatusBadge (spec 2D M7, §3.3)", () => {
  const source = read(`${D}master-data/companies/page.tsx`)
  assert.equal(source.match(drilldownLink)?.length, 2)
  assert.match(source, /<StatusBadge label=\{(\w+)\.isActive \? tCommon\("active"\) : tCommon\("inactive"\)\} tone=\{\1\.isActive \? "success" : "muted"\} \/>/)
  assert.doesNotMatch(source, /ActiveBadge|hover:bg-primary-soft|\bh-8\b|className="px-2"/)
})

test("departments list: the active state is a StatusBadge (spec 2D M7)", () => {
  const source = read(`${D}master-data/departments/page.tsx`)
  assert.match(source, /<StatusBadge label=\{(\w+)\.isActive \? tCommon\("active"\) : tCommon\("inactive"\)\} tone=\{\1\.isActive \? "success" : "muted"\} \/>/)
  assert.doesNotMatch(source, /ActiveBadge|hover:bg-primary-soft|\bh-8\b|className="px-2"/)
})

test("employees list: the asset count is a text link with a 44px phone target, and the active state is a StatusBadge (spec 2D M7, §3.3)", () => {
  const source = read(`${D}master-data/employees/page.tsx`)
  // Group 7 plan 2 Task 4: a former holder's count adds the warning tone as a third cn argument.
  assert.equal(source.match(/className=\{cn\(linkVariants\(\{ size: "inherit" \}\), "inline-flex min-h-11 items-center md:min-h-0", formerHolder && "font-semibold text-warning"\)\}/g)?.length, 1)
  assert.match(source, /<StatusBadge label=\{(\w+)\.isActive \? tCommon\("active"\) : tCommon\("inactive"\)\} tone=\{\1\.isActive \? "success" : "muted"\} \/>/)
  assert.doesNotMatch(source, /ActiveBadge|hover:bg-primary-soft|\bh-8\b|className="px-2"/)
})

// Group 7 plan 2 Task 4 (spec §5.1, G7P2-R1): the former-holder card opens ?former=withAssets, the summary reads every
// record (an AD-deactivated holder included), and a former holder's row shows the held count in the warning tone.
test("employees list: the former-holder card links ?former=withAssets and a former holder's row is marked in the warning tone (G7P2-R1)", () => {
  const source = read(`${D}master-data/employees/page.tsx`)
  assert.match(source, /href: `\$\{basePath\}\?former=withAssets`/)
  assert.match(source, /current: listState\.former === "withAssets"/)
  // Fix round 1: the cards are count queries, the former card's with the list's own where (employeeSummaryWheres).
  const summaryRead = source.slice(source.indexOf("prisma.employee.count({ where }),"), source.indexOf("prisma.company.findMany("))
  assert.doesNotMatch(summaryRead, /prisma\.employee\.findMany\(/, "no employee rows are loaded for the cards")
  assert.match(summaryRead, /prisma\.employee\.count\(\{ where: summaryWheres\.records \}\),/)
  assert.match(summaryRead, /prisma\.employee\.count\(\{ where: summaryWheres\.withAssets \}\),/)
  assert.match(summaryRead, /prisma\.employee\.count\(\{ where: summaryWheres\.formerWithAssets \}\),/)
  assert.match(summaryRead, /prisma\.employee\.groupBy\(\{ by: \["employmentStatus"\], where: summaryWheres\.records, _count: \{ _all: true \} \}\),/)
  assert.match(source, /const formerHolder = isFormerEmployee\(employee\) && employee\._count\.custodianAssets > 0/)
  assert.equal(source.match(/formerHolder && "font-semibold text-warning"/g)?.length, 2, "the table's count and the phone card's")
  assert.match(source, /\{formerHolder \? <span className="block text-meta text-warning">\{t\("formerHolderNote"\)\}<\/span> : null\}/)
  assert.match(source, /<input type="hidden" name="former" value="withAssets" \/>/, "the filter form keeps the card's filter")
})

// Final review fix 3: at 1440 the filter row wraps inside the panel, and the held count sits right after the name.
test("employees list: the filter row wraps and the held-count column follows the name (final review fix 3)", () => {
  const source = read(`${D}master-data/employees/page.tsx`)
  assert.match(source, /\{filterForm\("grid grid-cols-\[repeat\(auto-fit,minmax\(min\(100%,11rem\),1fr\)\)\] gap-3"\)\}/)
  assert.doesNotMatch(source, /repeat\(6,minmax\(150px,1fr\)\)/)
  // Group 7 follow-ups Task 2: the department column (board MD-Employees' merged แผนก · สาขา) follows the count.
  assert.match(source, /<DataTableHead sort=\{sortBy\("fullNameTh"\)\}>\{t\("fullNameTh"\)\}<\/DataTableHead>\n(?:\s+\{\/\*[^\n]*\*\/\}\n)?\s+<DataTableHead align="right" sort=\{sortBy\("assets"\)\}>\{t\("assets"\)\}<\/DataTableHead>\n\s+<DataTableHead sort=\{sortBy\("department"\)\}>/)
  const rowCells = source.slice(source.indexOf("{employee.fullNameTh}</div>"), source.indexOf("<div>{employee.department.name}</div>"))
  assert.match(rowCells, /<DataTableCell numeric className="text-muted-foreground">\n\s+\{employee\._count\.custodianAssets > 0 \? \(\n\s+<Link\n\s+href=\{assetsHref\}/, "the count cell, with its link, between the name and the company")
})

// Fix round 1 (MD-Employees-Phone board): below md one card per employee, the whole card opening the employee page;
// the filters fold into a disclosure like the suppliers list; the table from md up; one pagination under both.
test("employees list: phone cards below md and the table from md up, the filters in a phone disclosure (MD-Employees-Phone)", () => {
  const source = read(`${D}master-data/employees/page.tsx`)
  assert.match(source, /<details className=\{cn\(getPanelClasses\(\), "md:hidden"\)\} open=\{hasFieldFilters\}>/)
  assert.match(source, /const hasFieldFilters = employeeListHasFieldFilters\(listState\)/, "closed by default; the former chip does not open it (final review fix 4)")
  assert.match(source, /<FilterPanel className="hidden md:block">\n\s+\{filterForm\(/)
  assert.equal(source.match(/\{filterForm\("/g)?.length, 2, "one form, rendered in the disclosure and in the panel")
  assert.match(source, /<DataTable data-employee-desktop-table framed=\{false\} className="hidden md:block" caption=\{t\("title"\)\} scrollHint=\{tCommon\("tableScrollHint"\)\}>/)
  const cards = source.slice(source.indexOf("<div data-employee-mobile-list"), source.indexOf("{pagination ? <DataTableFoot>"))
  assert.match(cards, /^<div data-employee-mobile-list className="md:hidden">/)
  assert.match(cards, /<article\n\s+key=\{employee\.id\}\n\s+className=\{cn\("relative /, "the card is the stretched link's frame")
  assert.match(cards, /<Link\n\s+href=\{detailHref\}\n\s+className="[^"]*after:absolute after:inset-0/, "the whole card opens the employee page")
  assert.match(cards, /\{employee\.fullNameTh\}/)
  assert.match(cards, /<span className="tag">\{employee\.code\}<\/span>/)
  assert.match(cards, /\{employee\.department\.name\}/)
  assert.match(cards, /<StatusBadge label=\{t\(`status_\$\{employee\.employmentStatus\}`\)\} tone=\{employmentStatusTone\(employee\.employmentStatus\)\} \/>/)
  assert.match(cards, /\{formerHolder \? <span className="text-meta text-warning">\{t\("formerHolderNote"\)\}<\/span> : null\}/)
  assert.match(cards, /"num relative z-10 inline-flex min-h-11 items-center text-sm font-medium", formerHolder && "font-semibold text-warning"/, "the held count sits above the card link")
  assert.match(cards, /t\("heldCount", \{ count: formatCount\(employee\._count\.custodianAssets\) \}\)/)
  assert.match(cards, /<EmployeeRowActions\n\s+className="relative z-10"/)
  assert.match(cards, /formerHolder \? "border-warning-border" : "border-border"/)
  assert.match(source, /\{pagination \? <DataTableFoot>\{pagination\}<\/DataTableFoot> : null\}/, "one pagination under both layouts")
})

test("locations list: the asset count is a text link with a 44px phone target, and the active state is a StatusBadge (spec 2D M7, §3.3)", () => {
  const source = read(`${D}master-data/locations/page.tsx`)
  assert.equal(source.match(drilldownLink)?.length, 1)
  assert.match(source, /<StatusBadge label=\{(\w+)\.isActive \? tCommon\("active"\) : tCommon\("inactive"\)\} tone=\{\1\.isActive \? "success" : "muted"\} \/>/)
  assert.doesNotMatch(source, /ActiveBadge|hover:bg-primary-soft|\bh-8\b|className="px-2"/)
})

test("brands page: drill-down text links, the panel frame on the picker and the duplicates, the workspace a ContentPanel, an md create button (2D-1 R3) and a StatusBadge (spec 2D M7, D9)", () => {
  const source = read(`${D}master-data/brands/page.tsx`)
  assert.equal(source.match(drilldownLink)?.length, 1, "the model table's asset count")
  assert.equal(source.match(/className=\{cn\(linkVariants\(\), "inline-flex min-h-11 items-center md:min-h-0"\)\}/g)?.length, 2, "the picker's model and asset counts (13px)")
  // Group 7 plan 1 Task 4: phones get a brand select in place of the picker.
  assert.match(source, /<aside className=\{cn\(getPanelClasses\(\), "hidden overflow-hidden md:block lg:sticky lg:top-4 lg:self-start"\)\}>/)
  assert.match(source, /<ContentPanel\n\s+title=\{t\("modelWorkspaceTitle"\)\}/)
  assert.match(source, /<details className=\{cn\(getPanelClasses\(\), "p-4 sm:p-5"\)\}>/)
  assert.match(source, /<Link href=\{createModelHref\} className=\{buttonVariants\(\{ variant: "outline", size: "md" \}\)\}>/)
  assert.match(source, /<StatusBadge label=\{(\w+)\.isActive \? tCommon\("active"\) : tCommon\("inactive"\)\} tone=\{\1\.isActive \? "success" : "muted"\} \/>/)
  assert.equal(source.match(/aria-current=\{/g)?.length, 2, "LN1 stays 2 (I11)")
  assert.doesNotMatch(source, /ActiveBadge|hover:bg-primary-soft|hover:bg-accent|\bh-[78]\b|className="px-2"|size: "lg"|bg-warning-soft|\btext-xs\b|text-lg|rounded-lg border/)
})

test("suppliers list: the asset count is a text link with a 44px phone target, frames are the panel classes and the phone cards quiet groupings with a KeyValueList (spec 2D D9, D19, §3.3)", () => {
  const page = read(`${D}master-data/suppliers/page.tsx`)
  const list = read("src/components/master-data/supplier-list-view.tsx")
  assert.match(page, /<details className=\{cn\(getPanelClasses\(\), "md:hidden"\)\} open=\{hasActiveFilters\}>/)
  assert.equal(list.match(drilldownLink)?.length, 1, "the desktop asset count")
  assert.match(list, /<ContentPanel>\n\s+<ActionEmptyState/)
  assert.match(list, /<div className=\{cn\(getPanelClasses\(\), "overflow-hidden"\)\}>/)
  assert.match(list, /<article key=\{supplier\.id\} className="min-w-0 rounded-md border border-border bg-background p-3">/)
  assert.equal(list.match(/<KeyValueList\b/g)?.length, 1, "the phone card's contact and phone")
  assert.doesNotMatch(page + list, /rounded-lg border|hover:bg-primary-soft|\btext-xs\b|className="px-2"|<dl\b/)
})

test("supplier page: sections are ContentPanels, follow-ups a warning Notice or a clear EmptyNote, rows quiet, and an empty purchase document total is Nil (spec 2D D7, D9, D19, M32 a)", () => {
  const page = read(`${D}master-data/suppliers/[id]/page.tsx`)
  const documents = read("src/components/master-data/supplier-purchase-documents.tsx")
  assert.equal(page.match(/<ContentPanel\b/g)?.length, 5, "profile, follow-up, assets, purchase documents, maintenance")
  assert.match(page, /<EmptyNote tone="clear">\{t\("noFollowUp"\)\}<\/EmptyNote>/)
  assert.match(page, /<Notice tone="warning">\n\s+<ul className="list-disc space-y-1 pl-5">/)
  assert.match(page, /<Link href=\{hrefs\.assets\} className=\{cn\(linkVariants\(\), "inline-flex min-h-11 items-center md:min-h-0"\)\}>/)
  assert.match(page, /totalAmount: document\.totalAmount == null \? null : Number\(document\.totalAmount\),/)
  assert.match(documents, /totalAmount: number \| null/)
  assert.match(documents, /<DataTable data-supplier-documents-desktop framed=\{false\} className="hidden md:block">/)
  assert.match(documents, /<article key=\{document\.id\} className="min-w-0 rounded-md border border-border bg-background p-3">/)
  assert.equal(documents.match(/<KeyValueList\b/g)?.length, 1)
  assert.doesNotMatch(page + documents, /function (?:SectionTitle|DocumentFact)\b|rounded-lg border|bg-(?:success|warning)-soft|hover:bg-accent|\btext-xs\b|document\.totalAmount \?\? 0/)
})

test("employee page: sections are ContentPanels, follow-ups warning Notices, empties EmptyNote, codes tag, table links text links and quiet row links (spec 2D D7, D9, M21, M33)", () => {
  const source = read(`${D}master-data/employees/[id]/page.tsx`)
  // Held, history, repairs; follow-up, audit, disposal, subordinates, the user account (group 7 plan 2 Task 3).
  assert.equal(source.match(/<ContentPanel\b/g)?.length, 8)
  assert.match(source, /<Notice key=\{item\} tone="warning" title=\{t\(`followUp\.\$\{item\}\.title`, \{ count: formatCount\(data\.openHandovers\.overdueLoans\) \}\)\}>/)
  assert.equal(source.match(/<EmptyNote>/g)?.length, 3, "no subordinates, an empty mini list, no user account")
  assert.equal(source.match(/className=\{linkVariants\(\{ size: "inherit" \}\)\}/g)?.length, 5, "the manager, the audit round, the history asset and the two repair links")
  assert.equal(source.match(/className=\{quietRowLinkClasses\}/g)?.length, 2, "the subordinate and mini list rows, on the shared row hover")
  assert.match(source, /<span className="tag">\{subordinate\.code\}<\/span>/)
  assert.doesNotMatch(source, /function SectionHeading\b|rounded-lg border|border-dashed|bg-warning-soft|hover:bg-primary-soft|hover:border-primary-border|hover:underline|\btext-xs\b|\btext-lg\b/)
})

test("asset model form: the form on the panel classes, the photo panel a ContentPanel, empties EmptyNote, the save-first note a neutral Notice, and no box around the dropzone (spec 2D D7, D9, M21)", () => {
  const source = read("src/components/master-data/asset-model-form.tsx")
  assert.match(source, /<form onSubmit=\{handleSubmit\} noValidate className=\{cn\(getPanelClasses\(\), "p-4 sm:p-5"\)\}>/)
  assert.match(source, /<ContentPanel title=\{t\("modelPhoto"\)\} description=\{t\("modelPhotoHelp"\)\}>/)
  assert.match(source, /<Notice tone="neutral" className="mb-4">\{t\("saveModelBeforePhoto"\)\}<\/Notice>/)
  assert.equal(source.match(/<EmptyNote\b/g)?.length, 2, "no spec rows, no model photo")
  assert.doesNotMatch(source, /rounded-lg border|border-dashed|\btext-xs\b|\btext-lg\b|rounded-md border border-border bg-background p-3/)
})

test("category form: three ContentPanels with the add buttons as panel actions, and EmptyNote for empty templates (spec 2D D9, M21)", () => {
  const source = read("src/components/master-data/category-form.tsx")
  assert.equal(source.match(/<ContentPanel\b/g)?.length, 3, "the fields, the custom field template, the photo checklist")
  assert.match(source, /<ContentPanel\n\s+title=\{t\("customFieldTemplate"\)\}\n\s+description=\{t\("customFieldTemplateHelp"\)\}\n\s+actions=\{/)
  assert.match(source, /<ContentPanel\n\s+title=\{t\("photoChecklistTemplate"\)\}\n\s+description=\{t\("photoChecklistTemplateHelp"\)\}\n\s+actions=\{/)
  assert.equal(source.match(/<EmptyNote>\{labels\.empty\}<\/EmptyNote>/g)?.length, 2)
  assert.doesNotMatch(source, /rounded-lg border|border-dashed|\btext-lg\b|<section\b/)
})

test("the seven simple master-data forms: a <form> cannot be ContentPanel, so it takes the panel classes and the one panel spacing (spec 2D D9, 2D-2 R4)", () => {
  for (const name of ["branch", "brand", "company", "department", "employee", "supplier"]) {
    const source = read(`src/components/master-data/${name}-form.tsx`)
    // noValidate straight after onSubmit: the form validates itself (v-track plan 1, M1 to M4).
    assert.match(source, /<form onSubmit=\{handleSubmit\} noValidate className=\{cn\(getPanelClasses\(\), "p-4 sm:p-5"\)\}>/, name)
    assert.doesNotMatch(source, /rounded-lg border/, name)
  }
  // Group 7 plan 3 Task 2: the location form wraps its board (the fields' panel, the preview and the save bar), so the
  // panel classes and the one spacing move to the fields' column.
  const location = read("src/components/master-data/location-form.tsx")
  assert.match(location, /<form onSubmit=\{handleSubmit\} noValidate className="mx-auto max-w-6xl">/)
  assert.match(location, /<div className=\{cn\(getPanelClasses\(\), "grid min-w-0 content-start gap-8 p-4 sm:p-5"\)\}>/)
  assert.doesNotMatch(location, /rounded-lg border/)
})
