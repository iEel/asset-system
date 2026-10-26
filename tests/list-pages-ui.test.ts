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
      // "ลบ" shows on active rows only: an inactive row comes back by ticking "ใช้งาน" (critique 2026-10-20 E1).
      assert.ok(/deleteAction=\{\w+\.isActive \? \{ endpoint: /.test(source) && source.includes(`{ endpoint: \`${endpoint}\` } : undefined}`), `${path}: "ลบ" in ⋯ calls ${endpoint}`)
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
  assert.match(panel, /deleteAction=\{selectedBrand\.isActive \? \{ endpoint: `\/api\/brands\/\$\{selectedBrand\.id\}` \} : undefined\}/)
  assert.equal(source.match(/aria-current=\{/g)?.length, 2, "the picker keeps aria-current=\"page\" on its two links (I11, LFG EXEMPT.LN1)")
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
  assert.equal(list.match(/deleteAction=\{supplier\.isActive \? \{ endpoint: `\/api\/suppliers\/\$\{supplier\.id\}` \} : undefined\}/g)?.length, 2)
  assert.match(list, /scrollHint=\{labels\.tableScrollHint\}/)
  assert.match(list, /actionVariant=\{hasActiveFilters \? "secondary" : "primary"\}/)
  assert.equal(existsSync(`${C}master-data/supplier-delete-button.tsx`), false, "the wrapper has no caller left (I5)")
})

test("users: edit is the row's only command, so RowActions draws no ⋯, and create is a header button for who may create (spec 2B §5.3; 2D M13, D11)", () => {
  const source = read(`${D}admin/users/page.tsx`)
  assert.match(source, /next=\{\{ label: tCommon\("edit"\), href: editHref, icon: <Pencil aria-hidden="true" \/> \}\}\n\s+groups=\{\[\]\}\n\s+\/>/)
  assert.doesNotMatch(source, /deleteAction=/)
  assert.match(source, /const canCreate = hasPermission\(currentUser, "user", "create"\)/)
  assert.match(source, /<PageHeader\n\s+title=\{t\("title"\)\}\n\s+meta=\{t\("subtitle"\)\}\n\s+actions=\{\n\s+canCreate \? \(\n\s+<Link href=\{`\$\{basePath\}\/new`\} className=\{buttonVariants\(\{ size: "md" \}\)\}>/)
  assert.doesNotMatch(source, /\bfixed bottom-|shadow-lg|rounded-full/)
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

// Plan 2B-2 Task 5 (spec 2B §5.4 row "disposal/batches/[id]", §4.4.3, §4.6.3): the batch page on the list primitives.
test("the disposal batch page builds on PageHeader, StatStrip, KeyValueList, DataTable and RowActions, with no pb-24 of its own (spec 2B §5.4)", () => {
  const source = read(`${D}disposal/batches/[id]/page.tsx`)
  for (const part of ["<PageHeader", "<PageBackLink", "<StatStrip", "<KeyValueList", "<DataTable", "<DataTableHeader>", "<DataTableBody>", "<TableEmptyRow", "<ClickableTableRow", "<RowActions"]) {
    assert.ok(source.includes(part), `no ${part}`)
  }
  assert.match(source, /<div className="space-y-6">/, "the shell already leaves room for the bottom bar (spec 2B §4.6.3)")
  assert.doesNotMatch(source, /\bpb-24\b/)
  assert.match(source, /title=\{<span className="tag font-medium">\{batch\.batchNo\}<\/span>\}/, "a batch has no name of its own, so the h1 is its code (spec 2B §4.3.3 rule 6)")
  assert.match(source, /breadcrumbs=\{\[\{ label: t\("title"\), href: `\/\$\{locale\}\/disposal` \}, \{ label: batch\.batchNo, code: true \}\]\}/)
  assert.match(source, /formatMoney\(Number\(batch\.saleValue\), \{ unit: tCommon\("baht"\) \}\)/)
  assert.match(source, /next=\{\{ label: t\("openRequest"\), href: requestHref, icon: <FileText aria-hidden="true" \/> \}\}\n\s+groups=\{\[\]\}\n\s+\/>/, "one next step and no ⋯")
  assert.match(source, /<DataTableHead align="right" sticky="right" hideLabel>\{t\("nextAction"\)\}<\/DataTableHead>/)
  assert.doesNotMatch(source, /function (?:BatchMetric|BatchInfo|RequestLink)\b/)
})

// Plan 2B-2 Tasks 6–8 (spec 2B §5.4 row "audit/findings", §8.6 rows 7–9): the findings list, its batch panel and its
// row triggers. The panel and the triggers are 2C files, so only their list part is checked; their dialogs stay with 2C.
const FINDINGS_BATCH = `${C}audit/audit-findings-batch-actions.tsx`

test("the findings batch panel: shared checkboxes, Button with busy, approve in the primary color and reject as danger (spec 2B R-c, §8.6 row 8)", () => {
  const source = read(FINDINGS_BATCH)
  assert.match(source, /<ChoiceCard\s+key=\{finding\.id\}\s+type="checkbox"\s+label=\{finding\.label\}\s+description=\{finding\.detail\}\s+checked=\{selectedSet\.has\(finding\.id\)\}\s+onChange=\{\(\) => toggleFinding\(finding\.id\)\}/)
  assert.match(source, /actions=\{\s*<>\s*<Button variant="outline" size="md" onClick=\{toggleAll\}>/)
  // With nothing selected the buttons are aria-disabled with their reason (v-track plan 2 U5); busy stays disabled.
  assert.match(source, /<Button\n\s+size="md"\n\s+onClick=\{\(\) => openReviewDialog\("approve"\)\}\n\s+busy=\{reviewing === "approve"\}\n\s+aria-disabled=\{noSelection \|\| undefined\}\n[^\n]*\n\s+disabled=\{reviewing === "reject" \|\| reviewDialogAction !== null\}\n\s+>/)
  assert.match(source, /<Button\n\s+variant="danger"\n\s+size="md"\n\s+onClick=\{\(\) => openReviewDialog\("reject"\)\}\n\s+busy=\{reviewing === "reject"\}\n\s+aria-disabled=\{noSelection \|\| undefined\}\n[^\n]*\n\s+disabled=\{reviewing === "approve" \|\| reviewDialogAction !== null\}\n\s+>/)
  assert.doesNotMatch(source, /<button\b|<Loader2\b|\bbg-success\b|\bbg-danger\b|opacity-50|h-4 w-4 rounded/, "no hand-written button, spinner, green fill or old checkbox is left")
  assert.match(source, /<ConfirmTextDialog\n/, "the confirm dialog stays as it is (2C plan 3)")
})

// Task 7 (spec 2B §5.4 row "audit/findings", §8.6 row 9, O21): the row triggers of a finding. Its three dialogs have no
// open() handle, so the triggers stay in the row cell (I21) and only become Button sm; the dialogs stay with 2C.
const FINDING_REVIEW = `${C}audit/audit-finding-review-actions.tsx`

test("the finding row triggers are Button sm: approve outline, reject danger, busy while the decision saves, no click through to the row; the dialogs stay (spec 2B §5.4, O21)", () => {
  const source = read(FINDING_REVIEW)
  assert.match(source, /<div className="flex min-w-0 flex-col gap-2 md:flex-row md:flex-wrap md:justify-end" onClick=\{stopPortalClick\}>/, "a click inside a dialog portal does not reach the table row and open the asset")
  assert.match(source, /function stopPortalClick\(event: ReactMouseEvent<HTMLDivElement>\) \{\n\s+if \(!event\.currentTarget\.contains\(event\.target as Node\)\) event\.stopPropagation\(\)\n\}/)
  assert.match(source, /<Button\n\s+variant="outline"\n\s+size="sm"\n\s+onClick=\{\(\) => setReviewModalAction\("approve"\)\}\n\s+busy=\{reviewing === "approve"\}\n\s+disabled=\{reviewing === "reject"\}\n\s+title=\{t\("approve"\)\}\n\s+>\n\s+<Check aria-hidden="true" \/>/)
  assert.match(source, /<Button\n\s+variant="danger"\n\s+size="sm"\n\s+onClick=\{\(\) => setReviewModalAction\("reject"\)\}\n\s+busy=\{reviewing === "reject"\}\n\s+disabled=\{reviewing === "approve"\}\n\s+title=\{t\("reject"\)\}\n\s+>\n\s+<X aria-hidden="true" \/>/)
  assert.match(source, /<Button variant="outline" size="sm" onClick=\{\(\) => setPlanOpen\(true\)\}>\n\s+<CalendarClock aria-hidden="true" \/>/)
  assert.match(source, /<Button variant="outline" size="sm" onClick=\{\(\) => setCloseOpen\(true\)\}>\n\s+<FileUp aria-hidden="true" \/>/)
  assert.doesNotMatch(source, /<button\b|<Loader2\b|\btext-success\b|disabled:opacity-50/, "no hand-written trigger, spinner or green text is left")
  // Audit mobile fix D8, fix round 1: in the findings table the self-review note is small warning text with its icon, no box.
  assert.match(source, /<p className="flex items-start gap-1\.5 text-left text-meta text-warning">\n\s+<AlertTriangle aria-hidden="true" className="mt-0\.5 size-3\.5 shrink-0" \/>\n\s+<span>\{reviewBlockedReason \?\? t\("segregationReviewBlocked"\)\}<\/span>/)
  // Fix round 3 (coordinator ruling, pattern ช1 of 2B): in the table only the review decision stays visible (approve
  // and reject stacked, or the note); plan, close and the page's links (the disposal request) go into the shared ⋯.
  // The menu holds no dialog (R-m): its items set the state that mounts the dialog, which gives focus back to ⋯.
  const compactBranch = source.slice(source.indexOf("  if (compact) {"), source.indexOf("  return (\n    <div className=\"flex min-w-0 flex-col gap-2"))
  assert.match(compactBranch, /<div className="flex min-w-0 items-start justify-end gap-1\.5" onClick=\{stopPortalClick\}>/)
  assert.match(compactBranch, /reviewBlocked \? blockedNote : <div className="flex flex-col items-end gap-2">\{reviewButtons\}<\/div>/)
  assert.match(compactBranch, /<RowActions\n\s+code=\{menuCode\}\n\s+name=\{assetLabel\}\n\s+menuLabel=\{tCommon\("moreActionsFor", \{ code: menuCode \}\)\}\n\s+groups=\{\[\{ key: "finding", items: menuItems \}\]\}\n\s+openerRef=\{openerRef\}/)
  assert.match(compactBranch, /\{ kind: "action", key: "plan", label: t\("actionPlan"\), icon: <CalendarClock aria-hidden="true" \/>, onSelect: \(\) => setPlanOpen\(true\) \}/)
  assert.match(compactBranch, /\{ kind: "action" as const, key: "close", label: t\("closeFinding"\), icon: <FileUp aria-hidden="true" \/>, onSelect: \(\) => setCloseOpen\(true\) \}/)
  assert.match(compactBranch, /\.\.\.menuLinks,/)
  assert.doesNotMatch(compactBranch, /setPlanOpen\(true\)\}>|setCloseOpen\(true\)\}>/, "no plan or close button in the table cell")
  assert.equal(source.match(/returnFocusRef=\{openerRef\}/g)?.length, 2, "the plan and close dialogs give focus back to ⋯")
  assert.equal(source.match(/<AccessibleDialog open title=\{t\("(?:actionPlanTitle|closeFindingTitle)"\)\} busy=\{saving\} size="md" returnFocusRef=\{returnFocusRef\} onClose=\{onClose\}>/g)?.length, 2)
  assert.match(source, /<Notice tone="warning">\{reviewBlockedReason \?\? t\("segregationReviewBlocked"\)\}<\/Notice>/, "the phone cards keep the box: a warning Notice since plan 2D-4")
  assert.equal(source.match(/<AccessibleDialog\b/g)?.length, 3, "the review, action-plan and close dialogs stay as they are (O21)")
})

// Task 8 (spec 2B §5.4 row "audit/findings", §5.9.2 row 3, §5.10 row 2, I21, I24): the findings list page.
const FINDINGS_PAGE = `${D}audit/findings/page.tsx`

test("findings: PageHeader with a back link, StatStrip, TabNav, chips for the hidden filters, DataTable and the shared Pagination (spec 2B §5.4, I24)", () => {
  const source = read(FINDINGS_PAGE)
  for (const part of ["<PageHeader", "<StatStrip", "<TabNav", "<FilterChipList", "<DataTable", "<DataTableHeader>", "<DataTableBody>", "<TableEmptyRow", "<ClickableTableRow", "<KeyValueList", "<DataTableFoot>", "<Pagination"]) {
    assert.ok(source.includes(part), `no ${part}`)
  }
  assert.match(source, /<div className="space-y-6">/)
  assert.match(source, /back=\{<PageBackLink href=\{`\/\$\{locale\}\/audit\/rounds`\} label=\{t\("backToRounds"\)\} \/>\}/, "the way back has the left arrow, not the plus of a create button (spec 2B §5.10 row 2)")
  assert.match(source, /<TabNav aria-label=\{t\("quickFilters"\)\} items=\{resolutionFilters\} current=\{status\} scroll=\{false\} \/>/)
  assert.match(source, /current: status === item\.status,\n\s+scroll: false,/, "the strip cell of the filter in use keeps aria-current and the scroll position")
  assert.match(source, /prisma\.auditRound\.findUnique\(\{ where: \{ id: roundId \}, select: \{ auditNo: true \} \}\)/, "the round chip names its round (I24)")
  assert.match(source, /<FilterChipList chips=\{filterChips\} label=\{t\("activeFilters"\)\} removeLabel=\{tAsset\("clearDrilldownFilter"\)\} \/>/)
  assert.match(source, /<AuditFindingsBatchActions key=\{selectionKey\} findings=\{batchReviewFindings\} \/>/, "another page or filter starts the batch selection empty")
  assert.match(source, /<TableEmptyRow\n\s+colSpan=\{8\}\n\s+emptyState=\{\{[\s\S]*?actionVariant: "secondary",/)
  assert.match(source, /<DataTableHead align="right" sticky="right">\{tCommon\("actions"\)\}<\/DataTableHead>/)
  assert.match(source, /<AuditFindingReviewActions\n/, "the review decision stays visible in the row (fix round 3: the rest is in ⋯)")
  assert.doesNotMatch(source, /<MasterDataHeader\b|<ColumnHeader\b|toLocaleString\(/)
})

test("findings page on the server, count the whole list once and keep the page in returnTo (spec 2B §5.9.2 row 3)", () => {
  const source = read(FINDINGS_PAGE)
  assert.match(source, /const listPage = parseListPage\(\{ page, pageSize \}\)/)
  assert.match(source, /const \{ skip, take \} = listPageWindow\(listPage\)/)
  assert.match(source, /orderBy: \[\{ reportedAt: "desc" \}, \{ id: "asc" \}\],\n\s+skip,\n\s+take,/, "the old order plus id, so no finding shows on two pages")
  assert.doesNotMatch(source, /\btake: \d+/, "no fixed number of rows")
  assert.match(source, /SUMMARY_STATUSES\.has\(status\) \? Promise\.resolve\(null\) : prisma\.auditFinding\.count\(\{ where \}\)/, "one more count only for a status the strip does not count")
  assert.match(source, /const total = summaryCounts\[status\] \?\? otherStatusTotal \?\? 0/)
  assert.match(source, /^import \{ redirect \} from "next\/navigation"$/m)
  assert.match(source, /const lastPage = lastListPage\(\w+, [\w.]+\)\n\s+if \(\w+\.length === 0 && \w+ > 0 && [\w.]+ > lastPage\) \{\n\s+redirect\(/)
  assert.match(source, /appendListPage\(params, listPage\)/, "buildAuditFindingsHref writes page above 1 and pageSize other than 25 only")
  assert.match(source, /buildAuditFindingsHref\(locale, nextStatus, searchText, filters, \{ pageSize: listPage\.pageSize \}\)/, "a filter link goes back to page 1 and keeps the page size")
  assert.match(source, /pageSizes=\{LIST_PAGE_SIZES\.map\(\(value\) => \(\{ value, href: pageHref\(\{ pageSize: value \}\) \}\)\)\}/)
})

// Plan 2B-2 Task 9 (spec 2B §5.4 row rounds, §5.9.2 row 7, I20, I21): the audit rounds list. The view filters and the
// tab counts need the insight of every round, so the query stays whole: the list pages in memory and clamps the page.
test("audit rounds: PageHeader, StatStrip, the quick filters on TabNav, and the list on DataTable with RowActions and Pagination (spec 2B §5.4)", () => {
  const source = read(`${D}audit/rounds/page.tsx`)
  for (const part of ["<PageHeader", "<StatStrip", "<TabNav", "<DataTable", "<DataTableHeader>", "<DataTableBody>", "<TableEmptyRow", "<ClickableTableRow", "<RowActions", "<DataTableFoot>", "<Pagination"]) {
    assert.ok(source.includes(part), `no ${part}`)
  }
  assert.match(source, /<div className="space-y-6">/, "the page root spaces its blocks 24px apart (spec 2B §4.6.1)")
  assert.match(source, /function QuickFilterBar\([\s\S]*?<TabNav\n\s+aria-label=\{title\}/, "QuickFilterBar stays, as a thin wrapper of TabNav (I20)")
  assert.match(source, /<DataTableHead align="right" sticky="right" hideLabel>\{tCommon\("actions"\)\}<\/DataTableHead>/)
  assert.match(source, /<DataTableCell align="right" sticky="right">\s*<RowActions/)
  assert.match(source, /menuLabel=\{tCommon\("moreActionsFor", \{ code: round\.auditNo \}\)\}/, "⋯ is named after its round (I33)")
  assert.match(source, /<DataTable framed=\{false\} className="hidden sm:block" caption=\{title\} scrollHint=\{labels\.scrollHint\}>/, "the coverage gap tables sit in the coverage panel with no frame of their own (plan 2D-4)")
})

test("audit rounds page in memory: page and pageSize from the URL, a slice of the filtered rounds, a clamp past the last page (spec 2B §5.9.2 row 7, I21)", () => {
  const source = read(`${D}audit/rounds/page.tsx`)
  assert.match(source, /const listPage = parseListPage\(\{ page, pageSize \}\)/)
  assert.match(source, /const roundPage = \{ page: Math\.min\(listPage\.page, lastListPage\(filteredRounds\.length, listPage\.pageSize\)\), pageSize: listPage\.pageSize \}/)
  assert.match(source, /const \{ skip, take \} = listPageWindow\(roundPage\)\n\s+const pageRounds = filteredRounds\.slice\(skip, skip \+ take\)/)
  assert.equal(source.match(/\bpageRounds\.map\(/g)?.length, 2, "the phone cards and the table both show the page")
  assert.doesNotMatch(source, /\bfilteredRounds\.map\(/, "never every round at once")
  assert.doesNotMatch(source, /\bredirect\(/, "the total is known before the cut, so the page is clamped, not redirected (I21)")
  assert.match(source, /orderBy: \[\{ createdAt: "desc" \}, \{ id: "asc" \}\]/, "the old order plus id, so no round shows on two pages")
  assert.match(read("src/lib/audit-rounds-list-rules.ts"), /const query = appendListPage\(params, listPage\)\.toString\(\)/, "default links stay as they were")
  assert.match(source, /href: buildAuditRoundsHref\(locale, value, searchText, \{ pageSize: listPage\.pageSize \}\)/, "a quick filter goes back to page 1 and keeps the page size")
  assert.match(source, /hiddenInputs=\{\{ \.\.\.\(activeView === "open" \? \{\} : \{ view: activeView \}\), \.\.\.Object\.fromEntries\(appendListPage\(new URLSearchParams\(\), \{ pageSize: listPage\.pageSize \}\)\) \}\}/)
  assert.match(source, /pageSizes=\{LIST_PAGE_SIZES\.map\(\(value\) => \(\{ value, href: buildAuditRoundsHref\(locale, activeView, searchText, \{ pageSize: value \}\) \}\)\)\}/)
})

// Plan 2B-2 Task 10 (spec 2B §4.4.3, §5.4 row rounds/[id], I21): the header and the result list of an audit round.
// The root padding and the mobile action bar belong to 2C plan 5 (O11); 2B changed only the bar's back icon (B2).
test("audit round detail: PageHeader, StatStrip numbers and result buckets, the result list on DataTable with RowActions and the shared Pagination (spec 2B §5.4)", () => {
  const source = read(`${D}audit/rounds/[id]/page.tsx`)
  for (const part of ["<PageHeader", "<StatStrip", "<DataTable", "<DataTableHeader>", "<DataTableBody>", "<TableEmptyRow", "<ClickableTableRow", "<RowActions", "<KeyValueList", "<DataTableFoot>", "<Pagination"]) {
    assert.ok(source.includes(part), `no ${part}`)
  }
  assert.match(source, /<div className=\{actionBarPagePadding\.single\}>\n\s+<PageHeader\n\s+className="mb-6"/, "the root leaves room for the ActionBar (2C plan 5, O11), so the header brings its own gap (spec 2B §4.6.1)")
  assert.match(source, /\{ href: returnToHref, label: tCommon\("back"\), icon: <ArrowLeft className="h-4 w-4" \/> \}/, "the back item of the mobile action bar has a left arrow (B2)")
  assert.match(source, /current: resultListState\.result === item\.result/, "the bucket in view is the current cell (aria-current from StatStrip)")
  assert.match(source, /next=\{\{ label: t\("editScanResult"\), href: item\.editHref, icon: <Pencil aria-hidden="true" \/> \}\}\n\s+groups=\{\[\]\}/, "the row's only command is the next step, so RowActions draws no ⋯")
  assert.match(source, /<DataTableHead align="right" sticky="right" hideLabel>\{tCommon\("actions"\)\}<\/DataTableHead>/)
  assert.match(source, /pageSizes=\{auditRoundResultPageSizeOptions\.map\(\(value\) => \(\{ value, href: buildAuditRoundResultListHref\(\{ [^}]*page: 1, pageSize: value \}\) \}\)\)\}/, "the result list keeps its own page and pageSize params")
  assert.match(source, /^import \{ notFound, redirect \} from "next\/navigation"$/m)
  assert.match(source, /if \(resultPageRowCount === 0 && resultListTotal > 0 && resultListState\.page > resultLastPage\) \{\n\s+redirect\(buildAuditRoundResultListHref\(/, "a result page past the last one shows the last page (I21)")
})

// Plan 2B-2 Task 11 (spec 2B §5.4 row pending, §5.9.2 row 4, bugs §5.10 #8 and #9, I21, R-m): the pending list of a
// round. It pages like the B4 lists, but it is not in B4_LISTS: its one fixed take is the latest audit movement of each
// asset, which the B4_LISTS check would read as a row limit.
test("the pending list of a round pages on the server and counts every pending item (spec 2B §5.9.2 row 4, bug §5.10 #8)", () => {
  const source = read(`${D}audit/rounds/[id]/pending/page.tsx`)
  assert.match(source, /const listPage = parseListPage\(\{ page: rawSearchParams\.page, pageSize: rawSearchParams\.pageSize \}\)/)
  assert.match(source, /const \{ skip, take \} = listPageWindow\(listPage\)/)
  assert.deepEqual(source.match(/\btake: \d+/g), ["take: 1"], "the only fixed take is the latest audit movement of each asset")
  assert.match(source, /orderBy: \[\{ createdAt: "asc" \}, \{ id: "asc" \}\]/, "the old order plus id, so no item shows on two pages")
  assert.match(source, /await Promise\.all\(\[\n\s+prisma\.auditItem\.findMany\(\{[\s\S]*?\n\s+\}\),\n\s+prisma\.auditItem\.count\(\{ where \}\),\n\s+\]\)/, "findMany and count in one Promise.all")
  assert.ok(source.indexOf("if (!round || isAuditRoundReadOnlyStatus(round.status)) notFound()") < source.indexOf("prisma.auditItem.findMany("), "the items load only after the round passed the read-only check")
  assert.match(source, /t\("pendingCount", \{ count: formatCount\(total\) \}\)/, "the box counts every pending item, not the rows of one page")
  assert.match(source, /^import \{ notFound, redirect \} from "next\/navigation"$/m)
  assert.match(source, /const lastPage = lastListPage\(total, listPage\.pageSize\)\n\s+if \(items\.length === 0 && total > 0 && listPage\.page > lastPage\) \{\n\s+redirect\(listHref\(\{ page: lastPage \}\)\)/, "a page past the last one shows the last page (I21)")
  assert.match(source, /return appendOperationalReturnTo\(query \? `\$\{pendingHref\}\?\$\{query\}` : pendingHref, returnTo\)/, "every list link keeps the page's returnTo, the search and the room")
  assert.match(source, /pageSizes=\{LIST_PAGE_SIZES\.map\(\(value\) => \(\{ value, href: listHref\(\{ pageSize: value \}\) \}\)\)\}/)
})

test("pending rows: RowActions on desktop with the not-found dialog opened through its handle, three buttons on the phone card (spec 2B §5.4, bug §5.10 #9, R-m)", () => {
  const page = read(`${D}audit/rounds/[id]/pending/page.tsx`)
  const wrapper = read(`${C}audit/audit-pending-row-actions.tsx`)
  for (const part of ["<PageHeader", "<DataTable", "<DataTableHeader>", "<DataTableBody>", "<TableEmptyRow", "<ClickableTableRow", "<DataTableFoot>", "<Pagination"]) {
    assert.ok(page.includes(part), `page: no ${part}`)
  }
  assert.match(page, /<div className="space-y-6">/)
  assert.match(page, /back=\{<PageBackLink href=\{returnToHref\} label=\{tCommon\("back"\)\} \/>\}/, "the text link above the title became the back button (B2)")
  assert.match(page, /<DataTableHead align="right" sticky="right" hideLabel>\{tCommon\("actions"\)\}<\/DataTableHead>/)
  assert.match(page, /<DataTableCell align="right" sticky="right">\s*<AuditPendingRowActions/)
  assert.match(page, /<AuditMarkNotFoundButton itemId=\{item\.id\} variant="button" \/>/, "the phone card keeps its own not-found button")
  assert.match(wrapper, /^"use client"/)
  assert.match(wrapper, /next=\{\{ label: t\("scanPendingAsset"\), href: scanHref, icon: <ScanLine aria-hidden="true" \/> \}\}/)
  assert.match(wrapper, /\{ kind: "link", key: "view", label: t\("viewAsset"\), href: assetHref, icon: <Eye aria-hidden="true" \/> \}/)
  assert.match(wrapper, /\{ kind: "action", key: "notFound", label: t\("markNotFound"\), icon: <AlertTriangle aria-hidden="true" \/>, onSelect: \(\) => notFoundRef\.current\?\.open\(\) \}/)
  assert.match(wrapper, /openerRef=\{openerRef\}/)
  assert.match(wrapper, /<AuditMarkNotFoundButton ref=\{notFoundRef\} itemId=\{itemId\} hideTrigger returnFocusRef=\{openerRef\} \/>/, "the dialog sits outside the menu and gives focus back to ⋯")
  assert.match(wrapper, /<div data-no-row-click className="contents" onClick=\{stopPortalEvent\} onKeyDown=\{stopPortalEvent\}>/, "events from the dialog portal never reach the row")
})

// Plan 2B-2 Task 12 (spec 2B §5.4 row "maintenance", §5.10 #4 and #11, I21): the repair-record list. It already paged on
// the server; it keeps its phone cards, moves its table and pager to the shared parts, and its empty state tells a
// filtered list from an empty one.
test("the repair-record list builds on PageHeader, DataTable, the shared filters and one Pagination under cards and table (spec 2B §5.4)", () => {
  const source = read(`${D}maintenance/page.tsx`)
  for (const part of ["<PageHeader", "<FilterPanel>", '<form role="search"', "<FilterFormActions", "<FilterChipList", "<DataTable", "<DataTableHeader>", "<DataTableBody>", "<ClickableTableRow", "<DataTableFoot>", "<Pagination"]) {
    assert.ok(source.includes(part), `no ${part}`)
  }
  assert.match(source, /<div className="space-y-6">\n\s+<PageHeader\n\s+title=\{t\("title"\)\}\n\s+meta=\{t\("subtitle"\)\}/)
  assert.match(source, /<DataTable framed=\{false\} className=\{getDesktopTableOnlyClasses\(\)\} caption=\{t\("listTitle"\)\} scrollHint=\{tCommon\("tableScrollHint"\)\}>/)
  assert.match(source, /pageSizes=\{LIST_PAGE_SIZES\.map\(/)
  assert.match(source, /<DataTableHead align="right">\{t\("cost"\)\}<\/DataTableHead>/, "the cost head names the unit (บาท), so the cells carry none")
  assert.match(source, /<DataTableCell numeric className="text-muted-foreground">\{record\.repairCost == null \? <Nil \/> : formatMoney\(Number\(record\.repairCost\)\)\}<\/DataTableCell>/)
  assert.match(source, /formatMoney\(Number\(record\.repairCost\), \{ unit: tCommon\("baht"\) \}\)/, "the phone card is not under that head, so it shows the unit")
  assert.equal(existsSync(`${C}maintenance/maintenance-pagination.tsx`), false, "the local pager went with its last caller")
})

test("the repair-record list sends a page past the end to the last page and splits its empty state on the filters (spec 2B I21, §5.10 #4)", () => {
  const source = read(`${D}maintenance/page.tsx`)
  assert.match(source, /^import \{ redirect \} from "next\/navigation"$/m)
  assert.match(source, /const lastPage = lastListPage\(total, filters\.pageSize\)\n\s+if \(records\.length === 0 && total > 0 && filters\.page > lastPage\) \{\n\s+redirect\(buildMaintenancePageHref\(locale, listQuery, \{ page: lastPage \}\)\)/)
  assert.match(source, /const hasActiveFilters = Boolean\(filters\.search \|\| filters\.status \|\| filters\.dateFrom \|\| filters\.dateTo\)/)
  assert.match(source, /title=\{t\("emptyFilteredTitle"\)\} description=\{t\("emptyFilteredHelp"\)\} actionHref=\{clearHref\} actionLabel=\{t\("clearFilters"\)\} actionVariant="secondary"/)
  assert.match(source, /title=\{t\("emptyTitle"\)\} description=\{canCreate \? t\("emptyHelp"\) : undefined\} actionHref=\{canCreate \? createHref : undefined\} actionLabel=\{canCreate \? t\("createTitle"\) : undefined\}/)
})

// Plan 2B-2 Task 13 (spec 2B §5.4 row "maintenance/pm", §5.9.2 row 6, I21, I25): the PM plans page by state, as the
// rows of a divided panel, and the page gets the back link it lacked. Row buttons stay in the row (I21).
test("PM plans page on the server by state, as panel rows with one Pagination at the end of the panel (spec 2B §5.9.2 row 6)", () => {
  const source = read(`${D}maintenance/pm/page.tsx`)
  assert.match(source, /const listPage = parseListPage\(\{ page, pageSize \}\)/)
  assert.match(source, /prisma\.maintenancePlan\.groupBy\(\{ by: \["planState"\], _count: \{ _all: true \} \}\)/)
  assert.match(source, /planStatePageSlices\(\n\s+stateCounts\.map\(\(row\) => \(\{ planState: row\.planState, count: row\._count\._all \}\)\),\n\s+listPageWindow\(listPage\),\n\s+\)/)
  assert.match(source, /where: \{ planState: slice\.planState \},/)
  assert.match(source, /orderBy: \[\{ nextDueDate: "asc" \}, \{ id: "asc" \}\],\n\s+skip: slice\.skip,\n\s+take: slice\.take,/)
  assert.doesNotMatch(source, /\btake: \d+|\.sort\(/, "no fixed number of rows, and no sort of a capped list in JS")
  assert.match(source, /<ContentPanel divided flush className="overflow-hidden">/)
  assert.match(source, /<ContentPanelRows>/)
  assert.match(source, /<DataTableFoot>\n\s+<Pagination\n/)
  assert.match(source, /pageSizes=\{LIST_PAGE_SIZES\.map\(\(value\) => \(\{ value, href: listHref\(\{ pageSize: value \}\) \}\)\)\}/)
  assert.match(source, /^import \{ redirect \} from "next\/navigation"$/m)
  assert.match(source, /const lastPage = lastListPage\(total, listPage\.pageSize\)\n\s+if \(plans\.length === 0 && total > 0 && listPage\.page > lastPage\) \{\n\s+redirect\(listHref\(\{ page: lastPage, pageSize: listPage\.pageSize \}\)\)/)
})

test("the PM page goes back to maintenance, has no icon in its title, and its edit link keeps the page (spec 2B I25, B4)", () => {
  const source = read(`${D}maintenance/pm/page.tsx`)
  assert.match(source, /<PageHeader\n\s+breadcrumbs=\{\[\{ label: tRecord\("title"\), href: `\/\$\{locale\}\/maintenance` \}, \{ label: t\("pmTitle"\) \}\]\}\n\s+title=\{t\("pmTitle"\)\}\n\s+meta=\{t\("pmSubtitle"\)\}\n\s+back=\{<PageBackLink href=\{`\/\$\{locale\}\/maintenance`\} label=\{tCommon\("back"\)\} \/>\}/)
  assert.match(source, /^import \{ Plus \} from "lucide-react"$/m, "the title icon (CalendarClock) is gone")
  assert.match(source, /const planListReturnHref = listHref\(listPage\)/)
  assert.match(source, /href=\{appendOperationalReturnTo\(`\/\$\{locale\}\/maintenance\/pm\/\$\{plan\.id\}\/edit`, planListReturnHref\)\} className=\{buttonVariants\(\{ variant: "outline", size: "sm" \}\)\}/)
  assert.match(source, /href=\{`\/\$\{locale\}\/maintenance\/new\?planId=\$\{plan\.id\}`\} className=\{buttonVariants\(\{ size: "sm" \}\)\}/)
  assert.match(source, /\{canEdit \? <MaintenancePlanStateActions planId=\{plan\.id\} state=\{plan\.planState as MaintenancePlanState\} \/> : null\}/)
})

// Plan 2B-2 Task 15 (spec 2B §4.4.3, §5.4 row admin/data-quality, I12): the data-quality header and number strip. The
// rule cards stay as they are, and the labels of DataQualityRuleForm belong to 2C plan 4 (it adds severity there).
test("data quality: PageHeader with the reports link, one StatStrip for the three tinted SummaryCards, and the common words the review queue reads (spec 2B §5.4, I12)", () => {
  const source = read(`${D}admin/data-quality/page.tsx`)
  assert.match(source, /<div className="space-y-6">\n\s+<PageHeader\n\s+title=\{t\("title"\)\}\n\s+meta=\{t\("subtitle"\)\}\n\s+actions=\{\n\s+<Link href=\{`\/\$\{locale\}\/reports`\} className=\{buttonVariants\(\{ variant: "outline", size: "md" \}\)\}>/)
  assert.ok(source.includes("<StatStrip"), "no <StatStrip")
  for (const [key, count] of [["enabledRules", "enabledRules.length"], ["totalIssues", "totalIssues"], ["rulesConfigured", "rules.length"]]) {
    assert.ok(source.includes(`{ key: "${key}", label: t("${key}"), value: formatCount(${count}) },`), `no StatStrip cell for ${key}`)
  }
  assert.match(source, /pagination: tCommon\("pagination"\),\n\s+pageOf: tCommon\.raw\("pageOf"\),\n\s+tableScrollHint: tCommon\("tableScrollHint"\),/, "the review queue's page bar and scroll hint use the common words")
  assert.doesNotMatch(source, /toLocaleString\(/, "counts go through formatCount")
  assert.ok(source.includes("<AssetStateReviewWorkspace") && source.includes("<DataQualityRuleForm"), "the review queue and the rule form stay on the page")
})

// Plan 2B-2 Task 16 (spec 2B §5.4 row admin/data-quality, §6.5 row O3, I12): the review queue on the data-quality page.
// It pages on the client through the review API, so its page bar holds buttons, not Pagination links.
test("data quality review queue: FilterSelect, DataTable and a client page bar of outline sm buttons (spec 2B §5.4, §6.5 O3, I12)", () => {
  const source = read(`${C}admin/asset-state-review-workspace.tsx`)
  assert.match(source, /^"use client"$/m, "busy and the client page bar need client state")
  assert.equal(source.match(/<FilterSelect\n/g)?.length, 3, "three controlled filters")
  assert.equal(source.match(/allLabel=\{labels\.all\}/g)?.length, 2, "severity and issue type start with all; review status has no all")
  assert.match(source, /<DataTable framed=\{false\} caption=\{labels\.title\} minWidth=\{980\} scrollHint=\{labels\.tableScrollHint\} className="hidden md:block">/)
  for (const part of ["<DataTableHeader>", "<DataTableBody>", "<DataTableRow>", '<DataTableHead align="right" sticky="right">', '<DataTableCell align="right" sticky="right">', "<DataTableFoot>"]) {
    assert.ok(source.includes(part), `no ${part}`)
  }
  assert.match(source, /<nav aria-label=\{labels\.pagination\} className="flex flex-wrap items-center justify-between gap-x-3 gap-y-2">\n\s+<p aria-live="polite" className="text-meta text-muted-foreground num">/)
  assert.equal(source.match(/<Button variant="outline" size="sm" disabled=\{loading \|\| result\.page (?:<= 1|>= totalPages)\}/g)?.length, 2, "previous and next")
  assert.match(source, /<Button size="md" busy=\{scanning\} onClick=\{\(\) => void scan\(\)\}>\n\s+<ScanSearch aria-hidden="true" \/>\n\s+\{labels\.scan\}\n/, "the scan button keeps its label while busy (K13); md in the panel head (2D-2, D6)")
  assert.match(source, /<ActionEmptyState title=\{labels\.emptyTitle\} description=\{labels\.emptyDescription\} \/>/)
  assert.doesNotMatch(source, /\bActionButton\b|<table\b|<select\b|toLocaleString\(/)
})

// Plan 2B-2 Task 17 (spec 2B §4.4.3, I12): the integrations header only. IntegrationClientManager and its labels belong
// to 2C plan 5 (it adds confirmScopeExpansionAction there).
test("integrations: the header is PageHeader and the client manager follows it (spec 2B §4.4.3, I12)", () => {
  const source = read(`${D}admin/integrations/page.tsx`)
  assert.match(source, /<div className="space-y-6">\n\s+<PageHeader title=\{t\("title"\)\} meta=\{t\("subtitle"\)\} \/>\n\n\s+<IntegrationClientManager\n\s+labels=\{\{/)
  assert.doesNotMatch(source, /<h1\b/)
})

// Plan 2B-2 Task 18 fix 1: the coverage-gap boxes on the rounds page are about 260px wide. Their number headers wrap
// (as before 2B-2), so the "missing" column shows whole numbers, and the table says when it scrolls.
test("the rounds page coverage-gap tables wrap their number headers and carry the scroll hint (2B-2 Task 18 fix 1)", () => {
  const source = read(`${D}audit/rounds/page.tsx`)
  for (const key of ["missing", "total", "rate"]) {
    assert.match(source, new RegExp(`<DataTableHead align="right" className="whitespace-normal">\\{labels\\.${key}\\}</DataTableHead>`), `${key} header wraps`)
  }
  assert.match(source, /<DataTable framed=\{false\} className="hidden sm:block" caption=\{title\} scrollHint=\{labels\.scrollHint\}>/)
  assert.equal(source.match(/scrollHint: tCommon\("tableScrollHint"\)/g)?.length ?? 0, 2, "both gap lists pass the hint")
})

// Audit mobile fix D8 (2026-10-16, replaces 2B-2 Task 18 fix 2): the desktop findings table had 13 columns (2,272px in a
// ~965px box) with approve/reject last, so reviewers scrolled right on every row. Now 8 columns that fit 1280×800; the
// actions are pinned right (sticky) in a 200px column (approve and reject on one line, fix round 1), so below 1280 they stay in view while it scrolls.
test("the findings desktop table has 8 columns with the actions pinned right (audit mobile fix D8)", () => {
  const source = read(`${D}audit/findings/page.tsx`)
  const table = source.slice(source.indexOf("<DataTable framed={false}"), source.indexOf("</DataTable>"))
  const heads = [...table.matchAll(/<DataTableHead\b[^>]*>(.*?)<\/DataTableHead>/g)].map((match) => match[1])
  assert.deepEqual(heads, [
    `{t("reportedAt")}`,
    `{t("auditRound")}`,
    `{t("asset")}`,
    `{t("findingType")}`,
    `{t("comparisonColumn")}`,
    `{tCommon("status")}`,
    `{t("actionOwner")}`,
    `{tCommon("actions")}`,
  ])
  assert.match(table, /scrollHint=\{tCommon\("tableScrollHint"\)\}/, "the shared hint still shows while the table overflows")
  assert.match(table, /<DataTableCell align="right" sticky="right">\n\s+\{\/\* Pattern ช1/)
  assert.match(table, /\{canApprove \? \(\n\s+<AuditFindingReviewActions\n\s+compact\n\s+menuCode=\{rowCode\}\n\s+menuLinks=\{disposalMenuLinks\}\n/, "fix round 3: plan, close and the disposal request in one ⋯")
  assert.match(table, /\) : disposalMenuLinks\.length > 0 \? \(\n\s+<RowActions code=\{rowCode\} name=\{assetLabel\} menuLabel=\{tCommon\("moreActionsFor", \{ code: rowCode \}\)\} groups=\{\[\{ key: "finding", items: disposalMenuLinks \}\]\} \/>/, "without review rights the disposal request still has its ⋯")
  assert.match(table, /const disposalMenuLinks: RowActionItem\[\] = canCreateDisposal && finding\.asset\n\s+\? \[\{ kind: "link", key: "disposal", label: t\("openDisposalRequest"\), href: appendOperationalReturnTo\(/)
  assert.doesNotMatch(table, /buttonVariants\(/, "no button-styled link left in the table cell")
  assert.match(table, /<FindingValueChange\n/, "system → found as compact text")
  assert.doesNotMatch(table, /<FindingComparison\b/, "no inner bordered box in the table (plan 2D-4 moved the phone card's values into its KeyValueList)")
  assert.match(table, /<FindingStatusBadges items=\{findingStatusBadges\(finding, resolutionState\)\} \/>/, "the five statuses in one cell")
  assert.match(table, /<AuditFindingEvidenceList\n\s+compact\n/)
  assert.match(table, /: <Nil label=\{t\("noActionOwner"\)\} \/>/)
  assert.match(table, /\{finding\.actionDueDate \? t\("dueOn", \{ date: formatDateTime\(finding\.actionDueDate\) \}\) : <Nil \/>\}/, "fix round 1: the second line says what the date is")
  assert.doesNotMatch(table, /\bhideLabel\b/, "fix round 1: the actions header is visible, as in the mockup")
  // Fix round 2: in the real browser the auto layout squeezed the owner column to 40px (its cells were "—"), so the
  // table is fixed: a <colgroup> sets every width (px = 4 × the spacing step) and minWidth is their sum, at most the
  // 963px inside the 1280×800 box. Below that the table scrolls and the actions stay pinned.
  assert.match(table, /^<DataTable framed=\{false\} layout="fixed" minWidth=\{960\} /)
  const cols = [...table.matchAll(/<col className="w-(\d+)" \/>/g)].map((match) => Number(match[1]) * 4)
  // Fix round 3: the comparison gets 152px (an asset name as the found value wrapped into 10 lines at 84px), taken from
  // the round, asset, type, status and action columns; the action column holds approve/reject stacked plus ⋯ (118px).
  assert.deepEqual(cols, [104, 116, 136, 76, 152, 124, 88, 164], "date, round, asset, type, system → found, status, owner, actions")
  assert.equal(cols.reduce((sum, width) => sum + width, 0), 960)
  assert.match(table, /<DataTableHead>\{t\("actionOwner"\)\}<\/DataTableHead>/, "the owner header stays on one line")
  assert.doesNotMatch(table, /<DataTableCell[^>]*\b(?:min-)?w-\d+/, "the widths live in the colgroup only")
  assert.doesNotMatch(table, /\bmin-w-(?:56|64|80)\b/)

  // Fix round 3: in the table the evidence is one line, the count and then the file links, each truncated.
  const evidence = source.slice(source.indexOf("function AuditFindingEvidenceList"), source.indexOf("function resolveFindingState"))
  assert.match(evidence, /if \(compact\) \{\n\s+return \(\n\s+<div className="mt-1 flex min-w-0 items-center gap-1 text-meta text-muted-foreground">\n\s+<span className="shrink-0">\{labels\.count\}<\/span>/)
  assert.match(evidence, /className=\{cn\(linkVariants\(\), "flex min-w-0 items-center gap-1"\)\}/)

  const change = source.slice(source.indexOf("function FindingValueChange"), source.indexOf("function AuditFindingEvidenceList"))
  assert.doesNotMatch(change, /\bborder\b|\brounded/, "the comparison has no box of its own")
  assert.match(change, /<ArrowRight aria-hidden="true"/)
  assert.match(change, /<span className="font-medium text-foreground">\{orNil\(actualValue\)\}<\/span>/, "the found value in medium weight")

  const badges = source.slice(source.indexOf("const findingStatusBadges"), source.indexOf("return (\n    <div className=\"space-y-6\">"))
  assert.match(badges, /resolutionState === "pending_review" \? \[\]/, "the review badge only when the state does not say it already")
  assert.match(badges, /finding\.actionStatus === "not_required" \|\| resolutionState === "closed" \? \[\]/)
  assert.match(badges, /tone: RESOLUTION_STATE_TONES\[resolutionState\]/, "the resolution badge keeps its tones")
  assert.match(badges, /status: finding\.reviewStatus/)
  assert.match(badges, /status: finding\.actionStatus/)
  assert.match(source, /<ul className="flex w-25 flex-col items-start gap-1">/, "a fixed-width status list: a long label truncates instead of widening the table")
})

// Plan 2B-4 Task 5 (spec 2B §4.4.5, §5.5, §4.6.3, bug §5.10 #7): the employee page on the page primitives. The shell
// already leaves room for the bottom navigation, so the page adds no pb-24 of its own.
test("the employee page builds on PageHeader, StatStrip, KeyValueList and three DataTables, with no pb-24 of its own (spec 2B §5.5)", () => {
  const source = read(`${D}master-data/employees/[id]/page.tsx`)
  for (const part of ["<PageHeader", "<PageBackLink", "<StatStrip", "<KeyValueList", "<DataTableHeader>", "<DataTableBody>", "<DataTableRow"]) {
    assert.ok(source.includes(part), `no ${part}`)
  }
  assert.equal(source.match(/<DataTable\b/g)?.length, 3, "the current assets, the handover history and the related repairs")
  assert.match(source, /return \(\n {4}<div className="space-y-6">\n {6}<PageHeader\n/)
  assert.doesNotMatch(source, /\bpb-24\b/)
  assert.match(source, /breadcrumbs=\{\[\n\s+\{ label: t\("title"\), href: returnToHref \},\n\s+\{ label: employee\.code, code: true \},\n\s+\]\}\n\s+title=\{employee\.fullNameTh\}/, "a record with a name: the h1 is the name, the code ends the trail (spec 2B §4.3.3 rule 6)")
  assert.match(source, /<span className="tag">\{employee\.code\}<\/span>/, "the code leads the meta row")
  assert.match(source, /back=\{<PageBackLink href=\{returnToHref\} label=\{tCommon\("back"\)\} \/>\}/)
  assert.match(source, /<Link href=\{editHref\} className=\{buttonVariants\(\{ size: "md" \}\)\}>/)
  assert.match(source, /status: \{ select: \{ name: true, nameTh: true, colorCode: true \} \}/)
  assert.match(source, /tone=\{getAssetStateTone\(asset\.status\.name\)\}/, "bug §5.10 #7: the status badge takes the tone of the status")
  assert.match(source, /tone=\{getAssetStateTone\(asset\.condition\.name\)\}/)
  assert.doesNotMatch(source, /tone="(?:info|muted)"/)
  assert.match(source, /<Link href=\{hrefs\.assets\} className=\{buttonVariants\(\{ variant: "outline", size: "md" \}\)\}>/)
  assert.doesNotMatch(source, /function (?:SummaryTile|Info|ColumnHeader)\b|<table\b|<th\b|toLocaleString\(|"-"/)
})

// Plan 2B-4 Task 6 (spec 2B §4.4.5, §5.5, §5.7, §4.6.3): the supplier page on the page primitives. An empty price is
// Nil, not 0.00 (A/08:225); the counts and the two money totals are StatStrips; the purchase document money column
// reads "(บาท)" from the key 2C added (asset.purchaseDocumentAmountBaht).
test("the supplier page builds on PageHeader, StatStrip and KeyValueList, shows an empty price as Nil and has no pb-24 of its own (spec 2B §5.5)", () => {
  const source = read(`${D}master-data/suppliers/[id]/page.tsx`)
  for (const part of ["<PageHeader", "<PageBackLink", "<KeyValueList", "<SupplierPurchaseDocuments"]) {
    assert.ok(source.includes(part), `no ${part}`)
  }
  assert.equal(source.match(/<StatStrip\b/g)?.length, 2, "the counts, then the two money totals")
  assert.match(source, /<StatStrip\n\s+className="max-lg:grid-cols-1"/, "one money cell per row below lg, so an amount is never cut")
  assert.match(source, /value: formatMoney\(summary\.purchaseAmount\), unit: tCommon\("baht"\)/)
  assert.match(source, /value: formatMoney\(summary\.maintenanceCost\), unit: tCommon\("baht"\)/)
  assert.match(source, /return \(\n {4}<div className="space-y-6">\n {6}<PageHeader\n/)
  assert.doesNotMatch(source, /\bpb-24\b/)
  assert.match(source, /breadcrumbs=\{\[\n\s+\{ label: t\("title"\), href: returnToHref \},\n\s+\{ label: supplier\.code, code: true \},\n\s+\]\}\n\s+title=\{supplier\.name\}/)
  assert.match(source, /back=\{<PageBackLink href=\{returnToHref\} label=\{tCommon\("back"\)\} \/>\}/)
  assert.match(source, /<Link href=\{editHref\} className=\{buttonVariants\(\{ size: "md" \}\)\}>/)
  assert.match(source, /\{asset\.purchasePrice == null \? <Nil \/> : <span className="num">\{formatMoney\(Number\(asset\.purchasePrice\), \{ unit: tCommon\("baht"\) \}\)\}<\/span>\}/)
  assert.match(source, /\{ticket\.repairCost == null \? <Nil \/> : formatMoney\(Number\(ticket\.repairCost\), \{ unit: tCommon\("baht"\) \}\)\}/)
  assert.match(source, /totalAmount: tAsset\("purchaseDocumentAmountBaht"\),/)
  assert.doesNotMatch(source, /function (?:MetricCard|InfoRow)\b|<MetricCard\b|formatCurrency|\?\? 0\)\)|toLocaleString\(|"-"/)
})

// Plan 2B-4 Task 7 (spec 2B §5.5, §5.7, R-p): a supplier's purchase documents on DataTable. The count and money columns
// are right aligned in num cells; the unit sits in the money header (the page passes "ยอดรวม (บาท)"), so the cells hold
// the number only.
test("supplier purchase documents: DataTable with right-aligned count and money columns, formatCount, formatMoney and Nil (spec 2B §5.5, §5.7)", () => {
  const source = read(`${C}master-data/supplier-purchase-documents.tsx`)
  // Plan 2D-3: the table sits in the page's ContentPanel with no frame of its own, and an empty total is Nil (M32 a).
  assert.match(source, /<DataTable data-supplier-documents-desktop framed=\{false\} className="hidden md:block">/)
  assert.match(source, /<DataTableHead align="right">\{labels\.linkedAssets\}<\/DataTableHead>/)
  assert.match(source, /<DataTableHead align="right">\{labels\.totalAmount\}<\/DataTableHead>/)
  assert.match(source, /<DataTableCell numeric className="text-muted-foreground">\{orNil\(formatMoney\(document\.totalAmount\)\)\}<\/DataTableCell>/)
  assert.equal(source.match(/formatCount\(document\.linkedAssets\)/g)?.length, 2, "the table and the phone card")
  assert.equal(source.match(/orNil\(documentReferences\(document\)\)/g)?.length, 2, "the table and the phone card")
  assert.equal(source.match(/<span className="tag">\{document\.documentNo\}<\/span>/g)?.length, 2)
  assert.doesNotMatch(source, /<table\b|formatCurrency|toLocaleString\(|"-"/)
})

// Plan 2B-4 Task 8 (spec 2B §4.4.5, §4.6.3): the My Assets detail page: PageHeader with its back link to the list, the
// facts as one KeyValueList, and no pb-24 of its own. The page is in navigation mode, so the shell already leaves room
// for the bottom bar (tests/mobile-field-navigation.test.ts pins the mode).
test("my asset page: PageHeader with the back link to My Assets, the facts as a KeyValueList, no pb-24 of its own (spec 2B §4.4.5, §4.6.3)", () => {
  const source = read(`${D}my-assets/[id]/page.tsx`)
  // Plan 2D-3 (M32 c): the back link returns to the page of the list it came from (returnTo), not page 1.
  assert.match(source, /return \(\n {4}<div className="space-y-6">\n {6}<PageHeader\n\s+title=\{t\("detailTitle"\)\}\n\s+meta=\{t\("detailHelp"\)\}\n\s+back=\{<PageBackLink href=\{returnToHref\} label=\{t\("backToList"\)\} \/>\}\n\s+\/>/)
  assert.doesNotMatch(source, /\bpb-24\b/)
  assert.match(source, /<KeyValueList\n\s+items=\{\[/)
  assert.match(source, /\{ key: "serialNumber", label: t\("serialNumber"\), value: asset\.serialNumber \? <span className="tag">\{asset\.serialNumber\}<\/span> : null \}/, "an empty serial number shows Nil through KeyValueList")
  assert.doesNotMatch(source, /function DetailItem\b|<h1\b|getSafeActionLinkClasses|"-"/)
})

// Plan 2B-5 Task 1 (spec 2B §5.6 row admin/roles, §4.4.6, R-d, R-q): the role list and the permission matrix on the
// list primitives. Edit is the row's only command, so RowActions draws no ⋯. Plan 2D-2 (M13, D11) moved the floating
// create button into the header, after the export (the primary action last).
test("roles: PageHeader, one StatStrip, and the role list and permission matrix on DataTable, with edit through RowActions (spec 2B §5.6)", () => {
  const source = read(`${D}admin/roles/page.tsx`)
  for (const part of ["<PageHeader", "<StatStrip", "<DataTableHeader>", "<DataTableBody>", "<TableEmptyRow colSpan={7}>", "<ClickableTableRow", "<DataTableRow", "<RowActions"]) {
    assert.ok(source.includes(part), `no ${part}`)
  }
  assert.match(source, /<div className="space-y-6">\n\s+<PageHeader\n\s+title=\{t\("title"\)\}\n\s+meta=\{t\("subtitle"\)\}/)
  assert.match(source, /<a href="\/api\/admin\/roles\/export" download className=\{buttonVariants\(\{ variant: "outline", size: "md" \}\)\}>/)
  assert.equal(source.match(/<ContentPanel divided flush className="overflow-hidden"/g)?.length, 2)
  assert.equal(source.match(/<DataTable framed=\{false\} caption=\{t\("(?:roleSummary|permissionMatrix)"\)\} scrollHint=\{tCommon\("tableScrollHint"\)\}>/g)?.length, 2, "both tables sit flush in their panel and scroll sideways with the hint (B6)")
  assert.match(source, /next=\{\{ label: tCommon\("edit"\), href: editHref, icon: <Pencil aria-hidden="true" \/> \}\}\n\s+groups=\{\[\]\}\n\s+\/>/, "edit is the only command: no ⋯ (spec 2B §5.6)")
  assert.match(source, /menuLabel=\{tCommon\("moreActionsFor", \{ code: role\.name \}\)\}/)
  assert.match(source, /<DataTableHead align="right" sticky="right" hideLabel>\{tCommon\("actions"\)\}<\/DataTableHead>/)
  assert.match(source, /attention: inactiveRolesWithUsers\.length > 0,/, "inactive roles that still have users need action (R-d)")
  assert.match(source, /\{canCreate \? \(\n\s+<Link href=\{`\/\$\{locale\}\/admin\/roles\/new`\} className=\{buttonVariants\(\{ size: "md" \}\)\}>/, "M13: create is the header's primary md button")
  assert.doesNotMatch(source, /\bfixed bottom-|shadow-lg|\bColumnHeader\b|function RoleAuditCard\b|<thead\b|<th\b|toLocaleString\(|font-mono|"-"|>-</)
})

// Plan 2B-5 Task 2 (spec 2B §5.6 row admin/logs, §5.9.2 row 1, §6.5 row 9, B4): the system log pages for real (it
// stopped at the newest 100 entries), its quick filters are TabNav, its filter form uses the shared fields, and the
// table is a DataTable whose small table of changes inside <details> still opens.
test("system log: real pages counted in the same timed Promise.all, TabNav quick filters, shared filter fields and a DataTable (spec 2B §5.6, §5.9.2 row 1)", () => {
  const source = read(`${D}admin/logs/page.tsx`)
  for (const part of ["<PageHeader", "<FilterPanel>", '<form role="search"', "<FilterFormActions", "<DataTable", "<DataTableHeader>", "<DataTableBody>", "<DataTableRow", "<TableEmptyRow colSpan={6}>", "<Pagination", "<details"]) {
    assert.ok(source.includes(part), `no ${part}`)
  }
  assert.match(source, /<TabNav\n\s+aria-label=\{t\("quickFilters"\)\}/)
  assert.match(source, /const listPage = parseListPage\(\{ page: rawFilters\.page, pageSize: rawFilters\.pageSize \}\)/)
  assert.match(source, /const \{ skip, take \} = listPageWindow\(listPage\)/)
  assert.match(source, /await withPerformanceTiming\("admin-logs\.list-data", \(\) => Promise\.all\(\[\n\s+prisma\.systemLog\.findMany\(\{[\s\S]*?orderBy: \[\{ createdAt: "desc" \}, \{ id: "asc" \}\],\n\s+skip,\n\s+take,\n\s+\}\),\n\s+prisma\.systemLog\.count\(\{ where \}\),\n\s+\]\)\)/, "findMany and count in one timed Promise.all, the old order plus id")
  assert.doesNotMatch(source, /\btake: \d+/, "no fixed number of rows")
  assert.match(source, /^import \{ redirect \} from "next\/navigation"$/m)
  assert.match(source, /const lastPage = lastListPage\(total, listPage\.pageSize\)\n\s+if \(logs\.length === 0 && total > 0 && listPage\.page > lastPage\) \{\n\s+redirect\(/)
  assert.match(source, /appendListPage\(new URLSearchParams\(query\), \{ pageSize: listPage\.pageSize \}\)/, "a quick filter goes back to page 1 and keeps the page size")
  assert.match(source, /\{listPage\.pageSize !== LIST_PAGE_SIZES\[0\] \? <input type="hidden" name="pageSize" value=\{listPage\.pageSize\} \/> : null\}/, "the filter form keeps the page size")
  assert.match(source, /pageSizes=\{LIST_PAGE_SIZES\.map\(\(value\) => \(\{ value, href: listHref\(\{ pageSize: value \}\) \}\)\)\}/)
  assert.match(source, /\{hasFilters \? t\("emptyFiltered"\) : t\("empty"\)\}/)
  assert.doesNotMatch(source, /function Head\b|<thead className=|\buppercase\b|<label\b/)
  for (const locale of ["th", "en"]) {
    const messages = JSON.parse(readFileSync(`messages/${locale}.json`, "utf8")) as { systemLogPage: Record<string, unknown> }
    for (const key of ["empty", "emptyFiltered"]) assert.equal(typeof messages.systemLogPage[key], "string", `${locale}: systemLogPage.${key}`)
    assert.doesNotMatch(String(messages.systemLogPage.subtitle), /100/, `${locale}: the subtitle no longer promises the newest 100 entries`)
  }
})

// Plan 2B-5 Task 3 (spec 2B §5.6 row admin/storage, bugs §5.10 #6 and #10, R-d): the three storage tables scroll
// sideways inside their DataTable shell (getTableShellClasses() clipped them with overflow-hidden), the tiles are two
// StatStrips with no tone fill, counts go through formatCount, and every module code reads as its label.
test("storage: PageHeader, two StatStrips and three DataTables that scroll sideways, with every module code as its label (spec 2B §5.6, §5.10 #6, #10)", () => {
  const source = read(`${D}admin/storage/page.tsx`)
  for (const part of ["<PageHeader", "<DataTableHeader>", "<DataTableBody>", "<DataTableRow", "<TableEmptyRow colSpan={4}>", "<TableEmptyRow colSpan={3}>", "<EmptyNote>"]) {
    assert.ok(source.includes(part), `no ${part}`)
  }
  assert.equal(source.match(/<StatStrip\b/g)?.length, 2, "the summary and the dry-run counts")
  // The panels are ContentPanel since plan 2D-2: only the dry-run table, under its StatStrip, keeps a top margin.
  assert.equal(source.match(/<DataTable framed=\{false\}(?: className="mt-4")? caption=\{(?:t\("(?:filesystemDryRun|moduleBreakdown)"\)|title)\} scrollHint=\{(?:tCommon\("tableScrollHint"\)|scrollHint)\}>/g)?.length, 3, "three tables in padded panels, flush, with the scroll hint (B6)")
  assert.match(source, /attention: reviewNeededCount > 0,/)
  assert.match(source, /\{moduleLabel\(item\.module, t\)\} · <span className="tag">\{item\.referenceId\}<\/span>/, "bug §5.10 #10: the review list names the module, not its code")
  assert.match(source, /\{orNil\(item\.filePath\)\}/)
  assert.equal(source.match(/<StorageArchiveButton relativePath=\{action\.relativePath\} \/>/g)?.length, 1)
  assert.doesNotMatch(source, /getTableShellClasses|getEmptyStateClasses|function SummaryCard\b|<thead\b|<th\b|<td colSpan|toLocaleString\(|"-"|\buppercase\b/)
})

// Plan 2B-5 Task 4 (spec 2B §5.6 row admin/approvals, §4.4.6, bug §5.10 #3, R-d, R-g): the approval inbox. The
// module chips are TabNav links with counts, the tinted SummaryCards are one StatStrip, and a row is one link whose
// action reads as words with an arrow, not as a button inside the link.
test("approval inbox: PageHeader, one StatStrip, the queue in a divided panel with TabNav, and rows that are one link (spec 2B §5.6, §5.10 #3)", () => {
  const source = read(`${D}admin/approvals/page.tsx`)
  for (const part of ["<PageHeader", "<StatStrip", "<ContentPanel", "<TabNav", "<ApprovalInboxRow", "<ActionEmptyState"]) {
    assert.ok(source.includes(part), `no ${part}`)
  }
  assert.equal(source.match(/className=\{buttonVariants\(\{ variant: "outline", size: "md" \}\)\}/g)?.length, 3, "history and policy in the header, manage roles in its panel")
  assert.match(source, /<TabNav\n\s+aria-label=\{t\("queueTitle"\)\}\n\s+items=\{filterOptions\.map\(\(filter\) => \(\{\n\s+key: filter\.key,\n\s+label: filter\.label,\n\s+count: formatCount\(filter\.count\),/)
  assert.match(source, /current=\{activeFilter\}/)
  assert.match(source, /<span className="inline-flex shrink-0 items-center gap-1 text-sm font-medium text-primary">\n\s+\{item\.actionLabel\}\n\s+<ChevronRight aria-hidden="true" className="size-4" \/>/, "bug §5.10 #3: no button look inside the row link")
  assert.match(source, /\{orNil\(item\.requestedBy\)\}/)
  assert.match(source, /<span className="tag">\{item\.permissionKey\}<\/span>/)
  assert.doesNotMatch(source, /function (?:FilterChip|SummaryCard|summaryClass)\b|toLocaleString\(|font-mono|"-"|<h1\b/)
})

// Plan 2B-5 Task 5 (spec 2B §5.6 row admin/approvals/history, §5.9.2 row 2, §4.5.2 #31, B2, B4): the decision
// history pages in the database (it stopped at the newest 150 rows and counted only those), its two filter rows are
// TabNav with full counts, the strip counts every decision, and the back button points left.
test("approval history: real pages and full counts from the database, two TabNav rows and a back link that points left (spec 2B §5.6, §5.9.2 row 2)", () => {
  const source = read(`${D}admin/approvals/history/page.tsx`)
  for (const part of ["<PageHeader", "<StatStrip", "<ContentPanel", "<DataTableFoot>", "<Pagination", "<DecisionRow"]) {
    assert.ok(source.includes(part), `no ${part}`)
  }
  assert.match(source, /back=\{<PageBackLink href=\{`\/\$\{locale\}\/admin\/approvals`\} label=\{t\("backToInbox"\)\} \/>\}/, "B2: the back button is the left arrow, not FileCheck2")
  assert.match(source, /const listPage = parseListPage\(\{ page: query\.page, pageSize: query\.pageSize \}\)/)
  assert.match(source, /const allowedWhere = buildApprovalDecisionLogWhere\(\{ \.\.\.decisionAccess, module: "all", decision: "all" \}\)/)
  assert.match(source, /const where = buildApprovalDecisionLogWhere\(\{ \.\.\.decisionAccess, module: activeModule, decision: activeDecision \}\)/)
  assert.match(source, /await withPerformanceTiming\("approval-history\.list-data", \(\) => Promise\.all\(\[\n\s+prisma\.systemLog\.findMany\(\{[\s\S]*?orderBy: \[\{ createdAt: "desc" \}, \{ id: "asc" \}\],\n\s+skip,\n\s+take,\n\s+\}\),\n\s+prisma\.systemLog\.count\(\{ where \}\),\n\s+prisma\.systemLog\.groupBy\(\{ by: \["module", "action"\], where: allowedWhere, _count: \{ _all: true \} \}\),\n\s+\]\)\)/)
  assert.match(source, /const summary = summarizeApprovalDecisionCounts\(decisionCounts\)/, "the strip and the tab counts are full totals (spec 2B §5.9.3)")
  assert.doesNotMatch(source, /\btake: \d+|filterApprovalDecisionLogItems|getAllowedDecisionWhere/, "no fixed number of rows and no filter in JS")
  assert.match(source, /^import \{ notFound, redirect \} from "next\/navigation"$/m)
  assert.match(source, /const lastPage = lastListPage\(total, listPage\.pageSize\)\n\s+if \(logs\.length === 0 && total > 0 && listPage\.page > lastPage\) \{\n\s+redirect\(/)
  assert.match(source, /const queryString = appendListPage\(query, listPage\)\.toString\(\)/)
  assert.match(source, /href: buildFilterHref\(locale, activeModule, activeDecision, param, option\.key, \{ pageSize \}\)/, "a tab goes back to page 1 and keeps the page size")
  assert.equal(source.match(/pageSize=\{listPage\.pageSize\}/g)?.length, 3, "both filter rows and the Pagination get the page size")
  assert.match(source, /<TabNav\n\s+aria-label=\{label\}/)
  assert.doesNotMatch(source, /\bFileCheck2\b|function (?:FilterChip|SummaryCard|summaryClass)\b|toLocaleString\(|<h1\b/)
})

// Plan 2B-5 Task 6 (spec 2B §4.4.6, §5.6 "หน้าสรุป" row readiness, R-d, R-p): the readiness header is PageHeader, the
// four tinted SummaryCards are one StatStrip, and the detected value of a check reads as a code. The check cards stay.
test("readiness: PageHeader, one StatStrip, and each detected value as a code (spec 2B §4.4.6, §5.6)", () => {
  const source = read(`${D}admin/readiness/page.tsx`)
  assert.match(source, /<div className="space-y-6">\n\s+<PageHeader title=\{t\("title"\)\} meta=\{t\("subtitle"\)\} \/>\n\n\s+<StatStrip\n/)
  assert.equal(source.match(/value: formatCount\(summary\.(?:total|pass|warning|fail)\)/g)?.length, 4)
  assert.match(source, /<span className="tag">\{check\.value\}<\/span>/)
  assert.doesNotMatch(source, /<h1\b|function (?:SummaryCard|summaryClass)\b|toLocaleString\(|font-mono/)
})

// Plan 2B-5 Task 6 (spec 2B §4.4.6, §8.9 row 5): only the settings header changes. The form, its tab row (O7, 2C plan 5)
// and the LDAP sync history the page hands it stay as they are (tests/system-log-history.test.ts:73-74).
test("settings: the header is PageHeader and the page still hands the form its LDAP sync history (spec 2B §4.4.6)", () => {
  const source = read(`${D}admin/settings/page.tsx`)
  assert.match(source, /<div className="space-y-6">\n\s+<PageHeader title=\{t\("title"\)\} meta=\{t\("subtitle"\)\} \/>\n\n\s+<SystemSettingsForm\n/)
  assert.match(source, /const ldapSyncHistory = buildLdapSyncHistoryItems\(ldapSyncLogs\)/)
  assert.match(source, /ldapSyncHistory=\{ldapSyncHistory\}/)
  assert.doesNotMatch(source, /<h1\b/)
})

// Plan 2B-5 Task 6 (spec 2B §4.4.7, §5.1 row "page buttons", R-b, R-p): the access-denied page has no header; it is
// the permission empty state in the middle of the screen. Its two links take the shared button look, and the required
// permission is one translated sentence, so it is not set in the code font (Thai words in Plex Mono fall back).
test("access denied: the permission empty state with its two links on the shared button look (spec 2B §4.4.7)", () => {
  const source = read(`${D}access-denied/page.tsx`)
  assert.match(source, /<ActionEmptyState\n\s+tone="permission"/)
  // md since plan 2D-2 (D6: lg only beside a 40px field); the required permission is a neutral Notice (D7).
  assert.match(source, /<Link href=\{homeHref\} className=\{buttonVariants\(\{ size: "md" \}\)\}>/)
  assert.match(source, /<Link href=\{`\/\$\{locale\}\/work-center`\} className=\{buttonVariants\(\{ variant: "outline", size: "md" \}\)\}>/)
  assert.match(source, /<Notice tone="neutral" className="justify-center">/)
  assert.doesNotMatch(source, /font-mono|\bbg-primary\b|hover:bg-accent|<h1\b|rounded-md border|size: "lg"/)
})

// Plan 2B-5 Task 7 (spec 2B §5.6 row notifications, bug §5.10 #1, R-d, O17): the notification center. A delivered
// notification shows its type in Thai words (it showed warning, danger or info), the local StatusBadge and the tinted
// SummaryCards give way to the shared parts, and a muted item greys its title instead of fading the whole card.
// notification-center-actions.tsx (2C plan 4, O17) is placed as before and never edited here.
test("notifications: PageHeader, one StatStrip, the shared StatusBadge, and each delivered type in words (spec 2B §5.6, §5.10 #1)", () => {
  const source = read(`${D}notifications/page.tsx`)
  for (const part of ["<PageHeader", "<StatStrip", "<NotificationCenterActions", "<EmptyNote padded>{t(\"empty\")}</EmptyNote>", "<EmptyNote padded>{t(\"deliveredDigestEmpty\")}</EmptyNote>"]) {
    assert.ok(source.includes(part), `no ${part}`)
  }
  assert.match(source, /^import \{ StatusBadge \} from "@\/components\/ui\/status-badge"$/m)
  assert.match(source, /<StatusBadge label=\{t\.has\(`type_\$\{notification\.type\}`\) \? t\(`type_\$\{notification\.type\}`\) : notification\.type\} tone=\{notification\.type\} \/>/, "bug §5.10 #1: the type in words, an unknown type as it is")
  assert.match(source, /<h2 className=\{item\.isSuppressed \? "font-semibold text-muted-foreground" : "font-semibold text-foreground"\}>/)
  assert.match(source, /\{formatCount\(item\.count\)\}/)
  assert.match(source, /<Link href=\{`\/\$\{locale\}\/work-center`\} className=\{buttonVariants\(\{ variant: "outline", size: "md" \}\)\}>/)
  assert.doesNotMatch(source, /function (?:SummaryCard|StatusBadge|notificationToneClass|summaryClass)\b|opacity-70|toLocaleString\(|border-dashed|<h1\b/)
  for (const locale of ["th", "en"]) {
    const messages = JSON.parse(readFileSync(`messages/${locale}.json`, "utf8")) as { notifications: Record<string, unknown> }
    for (const type of ["info", "warning", "danger", "success"]) assert.equal(typeof messages.notifications[`type_${type}`], "string", `${locale}: notifications.type_${type}`)
  }
})

// Plan 2B-5 Task 8 (spec 2B §5.6 row my-assets, §5.9.2 row 9, I14, B4, R-d, R-p): My Assets on the shared PageHeader
// (the local PageHeader goes in the same commit), real pages with the summary still counting every asset, the four
// tinted Metric boxes as one StatStrip, and the table on DataTable whose rows open the asset.
test("my assets: the shared PageHeader, real pages with a full-total summary, one StatStrip and a DataTable of rows that open the asset (spec 2B §5.6, §5.9.2 row 9)", () => {
  const source = read(`${D}my-assets/page.tsx`)
  for (const part of ["<StatStrip", "<ContentPanel divided flush", "<DataTable framed={false}", "<DataTableHeader>", "<DataTableBody>", "<ClickableTableRow", "<DataTableFoot>", "<Pagination", '<ActionEmptyState tone="permission"']) {
    assert.ok(source.includes(part), `no ${part}`)
  }
  assert.match(source, /^import \{ PageHeader \} from "@\/components\/ui\/page-header"$/m)
  assert.equal(source.match(/<PageHeader\b/g)?.length, 2, "the page and the account without an employee")
  assert.match(source, /const listPage = parseListPage\(\{ page, pageSize \}\)/)
  assert.match(source, /const \[assets, total, summaryAssets\] = await Promise\.all\(\[\n\s+prisma\.asset\.findMany\(\{\n\s+where,\n\s+select: myAssetSelect,\n\s+orderBy: \[\{ status: \{ sortOrder: "asc" \} \}, \{ updatedAt: "desc" \}, \{ id: "asc" \}\],\n\s+skip,\n\s+take,\n\s+\}\),\n\s+prisma\.asset\.count\(\{ where \}\),\n/, "the page, the count and the summary read in one Promise.all; the old order plus id")
  assert.match(source, /const summary = summarizeMyAssets\(\n\s+summaryAssets\.map\(/, "the summary counts every asset, not the page")
  assert.equal(source.match(/\btake: \d+/g)?.length, 2, "no fixed number of rows: only one photo per asset, in the list and in the summary")
  assert.match(source, /^import \{ redirect \} from "next\/navigation"$/m)
  assert.match(source, /const lastPage = lastListPage\(total, listPage\.pageSize\)\n\s+if \(assets\.length === 0 && total > 0 && listPage\.page > lastPage\) \{\n\s+redirect\(/)
  assert.match(source, /pageSizes=\{LIST_PAGE_SIZES\.map\(\(value\) => \(\{ value, href: listHref\(\{ pageSize: value \}\) \}\)\)\}/)
  assert.match(source, /<ClickableTableRow key=\{asset\.id\} href=\{href\} label=\{`\$\{labels\.openDetail\}: \$\{asset\.assetTag\}`\}>/)
  assert.match(source, /<Link href=\{`\/\$\{locale\}\/work-center\?view=mine`\} className=\{buttonVariants\(\{ variant: "outline", size: "md" \}\)\}>/)
  assert.match(source, /<span className="tag font-medium">\{asset\.assetTag\}<\/span>/)
  assert.doesNotMatch(source, /function (?:PageHeader|Metric|Head)\b|<thead\b|<th\b|getEmptyStateClasses|getResponsiveTableScrollClasses|getSafeActionLinkClasses|toLocaleString\(|"-"|<h1\b/)
})

// Group 1 dashboard task 9 (spec 2026-10-25 §6.2): the dashboard title is PageHeader with the as-of line and no buttons,
// the root spaces the blocks 24px apart and the numbers read through the formatters (tests/dashboard-page.test.ts pins
// every KPI value). The counts live in the shared sources; the round rule is pinned on src/lib/dashboard-overview.ts
// (audit-round-cancellation). The employee-home redirect (permission-aware-navigation) stays.
test("the dashboard: PageHeader with the as-of line, blocks 24px apart, numbers through the formatters (spec 2026-10-25 §6.2)", () => {
  const source = read(`${D}dashboard/page.tsx`)
  assert.match(source, /return \(\n {4}<div className="space-y-6">\n {6}<PageHeader title=\{t\("title"\)\} meta=\{t\("asOf", \{ time: formatAsOf\(now, locale\) \}\)\} \/>\n/)
  assert.doesNotMatch(source, /<h1\b|toLocaleString\(|Intl\.NumberFormat|className="mb-[68] /)
  assert.match(source, /if \(user && shouldUseEmployeeHome\(user\)\) \{\n\s+redirect\(`\/\$\{locale\}\/my-assets`\)/)
})

// Plan 2B-5 Task 15 (spec 2B I10, §4.4.6, §5.6): the work center on the shared frame. "งานทั้งหมด / งานของฉัน" changes
// the URL, so it is a TabNav of two links named by workCenter.viewNavigation (R-g, not Segmented), and the sentence under
// it stays. The queue links are a second TabNav; the two summary numbers are a StatStrip under the header and the metrics
// StatStrips of at most four cells. The cancelled-round filter stays (audit-round-cancellation).
test("the work center: PageHeader, a summary StatStrip, the view switch and the queues on TabNav, metric rows of at most four (spec 2B I10, §5.6)", () => {
  const source = read(`${D}work-center/page.tsx`)
  assert.match(source, /<PageHeader title=\{t\("title"\)\} meta=\{t\("subtitle"\)\} \/>/)
  assert.equal(source.match(/<TabNav\b/g)?.length, 2, "the view switch and the queue links")
  assert.match(source, /<TabNav\n\s+aria-label=\{t\("viewNavigation"\)\}\n\s+current=\{workCenterParams\.view\}/)
  assert.match(source, /\{ key: "all", label: t\("allWork"\), href: buildWorkCenterHref\(locale, workCenterParams, \{ view: "all", panel: workCenterParams\.panel \}\) \}/)
  assert.match(source, /\{ key: "mine", label: t\("myWork"\), href: buildWorkCenterHref\(locale, workCenterParams, \{ view: "mine", panel: workCenterParams\.panel \}\) \}/)
  assert.match(source, /<Notice tone="warning">\{t\("myWorkUnavailable"\)\}<\/Notice>/, "the sentence under the switch stays (I10), as a warning Notice since 2D-2 (D7)")
  assert.match(source, /<p className="text-xs text-muted-foreground">\{isMineView \? t\("myWorkDetail"\) : t\("allWorkDetail"\)\}<\/p>/)
  assert.match(source, /<TabNav\n\s+aria-label=\{t\("focusNavigation"\)\}\n\s+current=\{workCenterParams\.panel\}/)
  assert.equal(source.match(/<StatStrip\b/g)?.length, 2, "the summary strip and the metric rows")
  assert.match(source, /attention: metric\.value > 0 && \(metric\.tone === "danger" \|\| metric\.tone === "warning"\)/)
  assert.match(source, /^import \{ splitStatRows \} from "@\/lib\/stat-strip-rows"$/m, "the row split is shared with the dashboard since 2D-2")
  assert.match(source, /status: auditRoundOperationalWhere/)
  assert.doesNotMatch(source, /function (?:MetricCard|SummaryPill|WorkCenterViewLink|WorkCenterFocusLink|toneClass)\b|<h1\b|aria-current=|toLocaleString\(|<Segmented\b|"use client"/)
  for (const locale of ["th", "en"] as const) {
    const messages = JSON.parse(readFileSync(`messages/${locale}.json`, "utf8")) as { workCenter: Record<string, unknown> }
    assert.equal(typeof messages.workCenter.viewNavigation, "string", `${locale}: workCenter.viewNavigation`)
  }
})

// Plan 2B-5 Task 17 (spec 2B §5.14, §9.10 #3, I10, I16): guard LN1 counts only aria-current="page" set by hand, so it
// never saw the link rows that had no aria-current at all. The four of plan 2B-5 are named here: the log quick
// filters, the approval inbox chips, the history filter groups and the work-center switch are TabNav.
test("plan 2B-5: the link rows guard LN1 cannot see are TabNav (spec 2B §5.14, §9.10 #3)", () => {
  for (const path of [`${D}admin/logs/page.tsx`, `${D}admin/approvals/page.tsx`, `${D}admin/approvals/history/page.tsx`, `${D}work-center/page.tsx`]) {
    assert.match(read(path), /<TabNav\b/, `${path}: no <TabNav`)
  }
})

// Plan 2D-1 (spec 2D M31): a header button that downloads from an API route is a plain <a href> with buttonVariants
// (DESIGN.md Navigation), so Next.js neither prefetches nor client-routes the download.
test("the role, category and brand downloads are plain <a> links to the API (spec 2D M31)", () => {
  for (const path of [`${D}admin/roles/page.tsx`, `${D}master-data/categories/page.tsx`, `${D}master-data/brands/page.tsx`]) {
    assert.doesNotMatch(read(path), /<Link href="\/api\//, path)
  }
  assert.equal(read(`${D}master-data/categories/page.tsx`).match(/<a href="\/api\/categories\/(?:export|import-template)" download className=\{buttonVariants\(\{ variant: "outline", size: "md" \}\)\}>/g)?.length, 2)
  assert.equal(read(`${D}master-data/brands/page.tsx`).match(/<a href="\/api\/brand-models\/(?:export|import-template)" download className=\{buttonVariants\(\{ variant: "outline", size: "md" \}\)\}>/g)?.length, 2)
})
