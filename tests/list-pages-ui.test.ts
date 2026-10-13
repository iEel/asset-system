import assert from "node:assert/strict"
import { existsSync, readFileSync } from "node:fs"
import test from "node:test"

// Phase 2B (spec 2B §5.14, I16): what the migrated list pages must have. The "none left" checks (local sort headers
// and pagers, typed "-", bare toLocaleString(), <…DeleteButton id=, the old headers) are the LFG guards of
// tests/list-frame-guards.test.ts (I15). Sources are read with \r stripped, so a regex here may hold \n.
const D = "src/app/[locale]/(dashboard)/"
const C = "src/components/"
const read = (path: string) => readFileSync(path, "utf8").replace(/\r\n/g, "\n")

type MasterDataList = {
  path: string
  // The endpoints "ลบ" in ⋯ calls, as the page writes them: those of the *-delete-button.tsx wrappers it replaces (B5).
  deleteEndpoints: readonly string[]
  // The wrappers this page was the last caller of. They go in the same commit (spec 2B I5).
  removedWrappers: readonly string[]
  // The page shows a StatStrip in place of its local SummaryTile.
  stats: boolean
}

// The master-data lists of plan 2B-1. The commit that moves a page adds its line.
const MASTER_DATA_LISTS: readonly MasterDataList[] = [
  { path: `${D}master-data/branches/page.tsx`, deleteEndpoints: ["/api/branches/${branch.id}"], removedWrappers: [`${C}master-data/branch-delete-button.tsx`], stats: true },
  { path: `${D}master-data/brands/page.tsx`, deleteEndpoints: ["/api/models/${model.id}", "/api/brands/${selectedBrand.id}"], removedWrappers: [`${C}master-data/brand-delete-button.tsx`, `${C}master-data/asset-model-delete-button.tsx`], stats: true },
  { path: `${D}master-data/categories/page.tsx`, deleteEndpoints: ["/api/categories/${category.id}"], removedWrappers: [`${C}master-data/category-delete-button.tsx`], stats: true },
  { path: `${D}master-data/companies/page.tsx`, deleteEndpoints: ["/api/companies/${company.id}"], removedWrappers: [`${C}master-data/company-delete-button.tsx`], stats: true },
  { path: `${D}master-data/departments/page.tsx`, deleteEndpoints: ["/api/departments/${department.id}"], removedWrappers: [`${C}master-data/department-delete-button.tsx`], stats: false },
  { path: `${D}master-data/employees/page.tsx`, deleteEndpoints: ["/api/employees/${employee.id}"], removedWrappers: [`${C}master-data/employee-delete-button.tsx`], stats: true },
  { path: `${D}master-data/locations/page.tsx`, deleteEndpoints: ["/api/locations/${location.id}"], removedWrappers: [`${C}master-data/location-delete-button.tsx`], stats: true },
  { path: `${D}admin/users/page.tsx`, deleteEndpoints: [], removedWrappers: [], stats: false },
]

test("master-data lists build on PageHeader, DataTable, TableEmptyRow, RowActions and the shared Pagination (spec 2B §5.3, B5, B6)", () => {
  for (const { path, deleteEndpoints, removedWrappers, stats } of MASTER_DATA_LISTS) {
    const source = read(path)
    for (const part of ["<PageHeader", "<DataTable", "<DataTableHeader>", "<DataTableBody>", "<TableEmptyRow", "<ClickableTableRow", "<RowActions", "<Pagination"]) {
      assert.ok(source.includes(part), `${path}: no ${part}`)
    }
    if (stats) assert.ok(source.includes("<StatStrip"), `${path}: no <StatStrip`)
    assert.match(source, /<div className="space-y-6">/, `${path}: the page root spaces its blocks 24px apart (spec 2B §4.6.1)`)
    assert.match(source, /scrollHint=\{tCommon\("tableScrollHint"\)\}/, `${path}: a table with no phone list scrolls sideways with the hint (B6)`)
    assert.match(source, /pageSizes=\{LIST_PAGE_SIZES\.map\(/, `${path}: 25, 50 or 100 rows per page (R-k)`)
    assert.match(source, /menuLabel=\{tCommon\("moreActionsFor", \{ code: [\w.]+ \}\)\}/, `${path}: ⋯ is named after its row (I33)`)
    assert.match(source, /next=\{\{ label: (?:tCommon\("edit"\)|t\("\w+"\)), href: \w+, icon: <Pencil aria-hidden="true" \/> \}\}/, `${path}: the next step is the edit link (B5)`)
    for (const endpoint of deleteEndpoints) {
      assert.ok(source.includes(`deleteAction={{ endpoint: \`${endpoint}\` }}`), `${path}: "ลบ" in ⋯ calls ${endpoint}`)
    }
    for (const wrapper of removedWrappers) assert.equal(existsSync(wrapper), false, `${wrapper} has no caller left (I5)`)
  }
})

test("a master-data list past its last page sends the user to the last page (spec 2B I21, §5.9.1)", () => {
  for (const { path } of MASTER_DATA_LISTS) {
    const source = read(path)
    assert.match(source, /^import \{ redirect \} from "next\/navigation"$/m, path)
    assert.match(source, /const lastPage = lastListPage\(\w+, [\w.]+\)\n\s+if \(\w+\.length === 0 && \w+ > 0 && [\w.]+ > lastPage\) \{\n\s+redirect\(/, path)
  }
})

test("the selected brand keeps the vertical brand picker and gets RowActions: edit brand, delete in ⋯ (spec 2B I5, I11)", () => {
  const source = read(`${D}master-data/brands/page.tsx`)
  const start = source.indexOf("{selectedBrand ? (")
  assert.ok(start !== -1, "the selected brand panel")
  const panel = source.slice(start, source.indexOf("</aside>", start))
  assert.match(panel, /<RowActions\n\s+code=\{selectedBrand\.name\}/)
  assert.match(panel, /next=\{\{ label: t\("editSelectedBrand"\), href: selectedBrandEditHref, icon: <Pencil aria-hidden="true" \/> \}\}/)
  assert.match(panel, /deleteAction=\{\{ endpoint: `\/api\/brands\/\$\{selectedBrand\.id\}` \}\}/)
  assert.equal(source.match(/aria-current=\{/g)?.length, 2, "the picker keeps aria-current=\"page\" on its two links (I11, LFG KEEP.LN1)")
  assert.match(source, /<ContentPanel\n\s+divided\n\s+flush\n/, "the model table sits flush in a divided panel: no frame in a frame")
  assert.match(source, /<DataTable\n\s+framed=\{false\}/)
})

// B4 (spec 2B §5.9): the lists that now page on the server. Plans 2B-2 and 2B-5 add theirs, one line each, before the "]".
const B4_LISTS = [
  `${D}master-data/departments/page.tsx`,
  `${D}disposal/batches/page.tsx`,
]

test("B4 lists read page and pageSize with parseListPage and count the whole list in the same Promise.all (spec 2B §5.9.1)", () => {
  for (const path of B4_LISTS) {
    const source = read(path)
    assert.match(source, /\bparseListPage\(/, path)
    assert.match(source, /\blistPageWindow\(/, path)
    assert.match(source, /\bappendListPage\(/, path)
    assert.doesNotMatch(source, /\btake: \d+/, `${path}: no fixed number of rows`)
    assert.match(source, /orderBy: \[[^\]\n]*\{ id: "asc" \}\]/, `${path}: the old order plus id, so no row shows on two pages`)
    assert.match(source, /await Promise\.all\(\[\n\s+prisma\.(\w+)\.findMany\(\{[\s\S]*?\n\s+\}\),\n\s+prisma\.\1\.count\(\{ where \}\),\n\s+\]\)/, `${path}: findMany and count in one Promise.all`)
  }
})

test("the departments list keeps its page and page size in returnTo, in its page links and in its search (spec 2B §5.9.2 row 8)", () => {
  const source = read(`${D}master-data/departments/page.tsx`)
  assert.match(source, /const departmentReturnHref = listHref\(listPage\)/)
  assert.match(source, /appendListPage\(new URLSearchParams\(searchText \? \{ search: searchText \} : \{\}\), next\)/)
  assert.match(source, /hiddenInputs=\{Object\.fromEntries\(appendListPage\(new URLSearchParams\(\), \{ pageSize: listPage\.pageSize \}\)\)\}/)
  assert.match(source, /pageSizes=\{LIST_PAGE_SIZES\.map\(\(value\) => \(\{ value, href: listHref\(\{ pageSize: value \}\) \}\)\)\}/)
})

// Suppliers is not in MASTER_DATA_LISTS: its table, row actions and foot live in supplier-list-view.tsx, and its empty
// state is an ActionEmptyState outside the table. This test reads the page and the list view together (2B-1 Task 20).
test("suppliers: the page and its list view build on PageHeader, StatStrip, DataTable, RowActions and one shared Pagination (spec 2B §5.3, B5)", () => {
  const page = read(`${D}master-data/suppliers/page.tsx`)
  const list = read(`${C}master-data/supplier-list-view.tsx`)
  for (const part of ["<PageHeader", "<StatStrip", '<FilterPanel className="hidden md:block">', '<form role="search"', "<FilterFormActions", "<Pagination"]) {
    assert.ok(page.includes(part), `page: no ${part}`)
  }
  for (const part of ["<DataTable", "<DataTableHeader>", "<DataTableBody>", "<ClickableTableRow", "<DataTableFoot>{pagination}</DataTableFoot>", "<RowActions"]) {
    assert.ok(list.includes(part), `list view: no ${part}`)
  }
  assert.match(page, /<div className="space-y-6">/)
  assert.match(page, /tableScrollHint: tCommon\("tableScrollHint"\)/)
  assert.match(page, /pageSizes=\{LIST_PAGE_SIZES\.map\(/)
  assert.match(page, /moreActionsFor: \(code\) => tCommon\("moreActionsFor", \{ code \}\)/)
  assert.match(page, /^import \{ redirect \} from "next\/navigation"$/m)
  assert.match(page, /const lastPage = lastListPage\(total, listState\.pageSize\)\n\s+if \(suppliers\.length === 0 && total > 0 && listState\.page > lastPage\) \{\n\s+redirect\(/)
  assert.equal(page.match(/<SupplierFilterForm [^\n]*hasActiveFilters=\{hasActiveFilters\}/g)?.length, 2, "both filter forms show clear filters only while a filter is on")
  assert.equal(list.match(/next=\{\{ label: labels\.edit, href: hrefs\.edit, icon: <Pencil aria-hidden="true" \/> \}\}/g)?.length, 2, "the desktop row and the phone card")
  assert.equal(list.match(/deleteAction=\{\{ endpoint: `\/api\/suppliers\/\$\{supplier\.id\}` \}\}/g)?.length, 2)
  assert.match(list, /scrollHint=\{labels\.tableScrollHint\}/)
  assert.match(list, /actionVariant=\{hasActiveFilters \? "secondary" : "primary"\}/)
  assert.equal(existsSync(`${C}master-data/supplier-delete-button.tsx`), false, "the wrapper has no caller left (I5)")
})

test("users: edit is the row's only command, so RowActions draws no ⋯, and the floating create button stays (spec 2B §5.3, R-q)", () => {
  const source = read(`${D}admin/users/page.tsx`)
  assert.match(source, /next=\{\{ label: tCommon\("edit"\), href: editHref, icon: <Pencil aria-hidden="true" \/> \}\}\n\s+groups=\{\[\]\}\n\s+\/>/)
  assert.doesNotMatch(source, /deleteAction=/)
  assert.match(source, /<PageHeader title=\{t\("title"\)\} meta=\{t\("subtitle"\)\} \/>/)
  assert.match(source, /className="fixed bottom-6 right-6 [^"]*shadow-lg/, "R-q: phase 2D moves the floating button")
  assert.match(source, /hiddenInputs=\{\{ pageSize: listState\.pageSize, sort: listState\.sort, direction: listState\.direction \}\}/)
})

test("wide lists pin the actions column to the right, so edit and ⋯ stay visible while the table scrolls (2B-1 Task 25 fix 1)", () => {
  const D = "src/app/[locale]/(dashboard)/"
  const files = [
    `${D}master-data/branches/page.tsx`,
    `${D}master-data/brands/page.tsx`,
    `${D}master-data/categories/page.tsx`,
    `${D}master-data/companies/page.tsx`,
    `${D}master-data/departments/page.tsx`,
    `${D}master-data/employees/page.tsx`,
    `${D}master-data/locations/page.tsx`,
    "src/components/master-data/supplier-list-view.tsx",
    `${D}admin/users/page.tsx`,
  ]
  for (const file of files) {
    const source = read(file)
    assert.match(source, /<DataTableHead align="right" sticky="right" hideLabel>/, `${file}: the actions header is pinned`)
    assert.match(source, /<DataTableCell align="right" sticky="right">\s*<RowActions/, `${file}: the actions cell is pinned`)
    assert.doesNotMatch(source, /<DataTableCell align="right">\s*<RowActions/, `${file}: no unpinned actions cell is left`)
  }
})

// Plan 2B-2 Task 3 (spec 2B §5.4 row "disposal", §5.10 #5, R-m): the disposal queue on the list primitives. The page is a
// server component, so ⋯ opens the 2C decision and execution dialogs through their handles from DisposalRowActions.
test("the disposal queue builds on PageHeader, TabNav, a divided panel, DataTable, one shared Pagination and RowActions (spec 2B §5.4)", () => {
  const source = read(`${D}disposal/page.tsx`)
  for (const part of ["<PageHeader", "<TabNav", "<ContentPanel", "<DataTable", "<DataTableHeader>", "<DataTableBody>", "<TableEmptyRow", "<ClickableTableRow", "<DataTableFoot>", "<Pagination", "<DisposalRowActions"]) {
    assert.ok(source.includes(part), `no ${part}`)
  }
  assert.match(source, /<div className="space-y-6">/)
  assert.match(source, /<ContentPanel\n\s+divided\n\s+flush\n/, "the table sits flush in the panel: no frame in a frame")
  assert.match(source, /<DataTable framed=\{false\} className=\{getDesktopTableOnlyClasses\(\)\} caption=\{t\("requestList"\)\} scrollHint=\{tCommon\("tableScrollHint"\)\}>/)
  assert.match(source, /aria-label=\{t\("stageFilterLabel"\)\}/)
  assert.match(source, /current=\{filters\.status \|\| "all"\}/)
  assert.match(source, /count: formatCount\(stage\.count\)/)
  assert.match(source, /<DataTableHead align="right" sticky="right" hideLabel>\{tCommon\("actions"\)\}<\/DataTableHead>/)
  assert.match(source, /<DataTableCell align="right" sticky="right">\s*<DisposalNextAction /)
  assert.match(source, /row=\{\{ menuLabel: tCommon\("moreActionsFor", \{ code: request\.disposalNo \}\), batchHref: /)
  assert.match(source, /pageSizes=\{LIST_PAGE_SIZES\.map\(/)
  assert.match(source, /<TableEmptyRow colSpan=\{[^}]+\} emptyState=\{emptyState\} \/>/)
  assert.match(source, /actionVariant: hasActiveFilters \? "secondary" : "primary"/)
  assert.match(source, /formatMoney\(Number\(request\.saleValue\), \{ unit \}\)/)
  assert.match(source, /executeShort: t\("executeDisposalShort"\),/, "the row button says บันทึกตัดจำหน่าย: the full words do not fit the 120px slot")
  assert.match(source, /\{ kind: "execute", label: labels\.executeShort, dialog: /)
  for (const locale of ["th", "en"]) {
    const messages = JSON.parse(readFileSync(`messages/${locale}.json`, "utf8")) as { disposalPage: Record<string, unknown> }
    assert.equal(typeof messages.disposalPage.executeDisposalShort, "string", `${locale}: disposalPage.executeDisposalShort`)
  }
  assert.match(source, /^import \{ redirect \} from "next\/navigation"$/m)
  assert.match(source, /const lastPage = lastListPage\(total, filters\.pageSize\)\n\s+if \(requests\.length === 0 && total > 0 && filters\.page > lastPage\) \{\n\s+redirect\(`\/\$\{locale\}\/disposal\?\$\{buildDisposalQueryString\(filters, \{ page: lastPage \}\)\}`\)/)
  assert.match(source, /const bulkApprovalCopy: DisposalBulkApprovalCopy = \{/, "2C plan 5 adds keys to bulkApprovalCopy and bulkExecutionCopy")
  assert.match(source, /const bulkExecutionCopy: DisposalBulkExecutionCopy = \{/)
  assert.equal(existsSync(`${C}disposal/disposal-pagination.tsx`), false, "the queue was the last caller of DisposalPagination")
})

test("DisposalRowActions opens the 2C dialogs through their handles and gives focus back to the button that opened them (spec 2B R-m, §3.11)", () => {
  const source = read(`${C}disposal/disposal-row-actions.tsx`)
  assert.match(source, /^"use client"/)
  assert.match(source, /<RowActions\n\s+code=\{code\}/)
  assert.match(source, /openerRef=\{openerRef\}\n\s+menu="dropdown"/)
  assert.match(source, /onSelect: \(\) => decisionRef\.current\?\.open\(\)/)
  assert.match(source, /onSelect: \(\) => executionRef\.current\?\.open\(\)/)
  assert.match(source, /<DisposalDecisionButton \{\.\.\.next\.dialog\} ref=\{decisionRef\} hideTrigger returnFocusRef=\{openerRef\} \/>/)
  assert.match(source, /<DisposalExecutionButton \{\.\.\.next\.dialog\} ref=\{executionRef\} hideTrigger returnFocusRef=\{openerRef\} \/>/)
  assert.match(source, /<span hidden onClick=\{stopPortalEvent\} onKeyDown=\{stopPortalEvent\}>/, "a click or Enter inside a dialog never reaches the row")
  assert.match(source, /if \(!event\.currentTarget\.contains\(event\.target as Node\)\) event\.stopPropagation\(\)/)
  assert.match(source, /\.\.\.\(next\.kind === "view" \? \[\] : \[/, "a view row's next step already opens the request, so ⋯ does not repeat it")
  assert.doesNotMatch(source, /\bbusy\b|shadow-|flex-col-reverse/)
})

// Plan 2B-2 Task 4 (spec 2B §5.4 row "disposal/batches", §5.9.2 row 5, B4): the batch history pages for real, and the
// link to a batch carries the list page, so the batch page's back button returns to it (Task 5 reads it).
test("disposal batches: real pages, the list page in returnTo, and RowActions with the next step only (spec 2B §5.4, §5.9.2 row 5)", () => {
  const source = read(`${D}disposal/batches/page.tsx`)
  for (const part of ["<PageHeader", "<DataTable", "<DataTableHeader>", "<DataTableBody>", "<ClickableTableRow", "<RowActions", "<DataTableFoot>", "<Pagination"]) {
    assert.ok(source.includes(part), `no ${part}`)
  }
  assert.match(source, /<div className="space-y-6">/)
  assert.match(source, /back=\{<PageBackLink href=\{`\/\$\{locale\}\/disposal`\} label=\{t\("backToQueue"\)\} \/>\}/)
  assert.match(source, /searchParams: Promise<\{ page\?: string \| string\[\]; pageSize\?: string \| string\[\] \}>/)
  assert.match(source, /const batchesReturnHref = listHref\(listPage\)/)
  assert.match(source, /appendOperationalReturnTo\(`\/\$\{locale\}\/disposal\/batches\/\$\{id\}`, batchesReturnHref\)/)
  assert.match(source, /next=\{\{ label: t\("openBatch"\), href, icon: <FolderOpen aria-hidden="true" \/> \}\}\n\s+groups=\{\[\]\}\n\s+\/>/, "one next step and no ⋯: opening the batch is the row's only command")
  assert.doesNotMatch(source, /deleteAction=/)
  assert.match(source, /<DataTableHead align="right" sticky="right" hideLabel>\{tCommon\("actions"\)\}<\/DataTableHead>/)
  assert.match(source, /pageSizes=\{LIST_PAGE_SIZES\.map\(\(value\) => \(\{ value, href: listHref\(\{ pageSize: value \}\) \}\)\)\}/)
  assert.match(source, /^import \{ redirect \} from "next\/navigation"$/m)
  assert.match(source, /const lastPage = lastListPage\(total, listPage\.pageSize\)\n\s+if \(batches\.length === 0 && total > 0 && listPage\.page > lastPage\) \{\n\s+redirect\(/)
  assert.match(source, /canCreate && total > 0 \?/, "the create button in the header shows once a batch exists, counted over all pages")
})
