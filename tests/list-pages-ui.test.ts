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
  assert.match(source, /className=\{cn\(checkboxVariants\(\), "mt-0\.5"\)\}/)
  assert.match(source, /<div className="flex min-w-0 flex-col gap-2 md:flex-row md:flex-wrap">\n\s+<Button variant="outline" size="md" onClick=\{toggleAll\}>/)
  assert.match(source, /<Button\n\s+size="md"\n\s+onClick=\{\(\) => openReviewDialog\("approve"\)\}\n\s+busy=\{reviewing === "approve"\}\n\s+disabled=\{selectedCount === 0 \|\| reviewing === "reject" \|\| reviewDialogAction !== null\}\n\s+>/)
  assert.match(source, /<Button\n\s+variant="danger"\n\s+size="md"\n\s+onClick=\{\(\) => openReviewDialog\("reject"\)\}\n\s+busy=\{reviewing === "reject"\}\n\s+disabled=\{selectedCount === 0 \|\| reviewing === "approve" \|\| reviewDialogAction !== null\}\n\s+>/)
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
  assert.match(source, /<TableEmptyRow\n\s+colSpan=\{13\}\n\s+emptyState=\{\{[\s\S]*?actionVariant: "secondary",/)
  assert.match(source, /<DataTableHead align="right" hideLabel>\{tCommon\("actions"\)\}<\/DataTableHead>/)
  assert.match(source, /<AuditFindingReviewActions\n/, "the row triggers stay in the cell: their dialogs have no open() handle (I21)")
  assert.doesNotMatch(source, /<RowActions\b|<MasterDataHeader\b|<ColumnHeader\b|toLocaleString\(/)
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
  assert.match(source, /<DataTable framed=\{false\} className="hidden sm:block" caption=\{title\}>/, "the coverage gap tables sit in their box with no second frame")
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
  assert.match(source, /const query = appendListPage\(params, listPage\)\.toString\(\)/, "default links stay as they were")
  assert.match(source, /href: buildAuditRoundsHref\(locale, value, searchText, \{ pageSize: listPage\.pageSize \}\)/, "a quick filter goes back to page 1 and keeps the page size")
  assert.match(source, /hiddenInputs=\{\{ \.\.\.\(activeView === "all" \? \{\} : \{ view: activeView \}\), \.\.\.Object\.fromEntries\(appendListPage\(new URLSearchParams\(\), \{ pageSize: listPage\.pageSize \}\)\) \}\}/)
  assert.match(source, /pageSizes=\{LIST_PAGE_SIZES\.map\(\(value\) => \(\{ value, href: buildAuditRoundsHref\(locale, activeView, searchText, \{ pageSize: value \}\) \}\)\)\}/)
})

// Plan 2B-2 Task 10 (spec 2B §4.4.3, §5.4 row rounds/[id], I21): the header and the result list of an audit round.
// The root padding and the mobile action bar belong to 2C plan 5 (O11); 2B changed only the bar's back icon (B2).
test("audit round detail: PageHeader, StatStrip numbers and result buckets, the result list on DataTable with RowActions and the shared Pagination (spec 2B §5.4)", () => {
  const source = read(`${D}audit/rounds/[id]/page.tsx`)
  for (const part of ["<PageHeader", "<StatStrip", "<DataTable", "<DataTableHeader>", "<DataTableBody>", "<TableEmptyRow", "<ClickableTableRow", "<RowActions", "<KeyValueList", "<DataTableFoot>", "<Pagination"]) {
    assert.ok(source.includes(part), `no ${part}`)
  }
  assert.match(source, /<div className="pb-24 md:pb-0">\n\s+<PageHeader\n\s+className="mb-6"/, "the root keeps the O11 padding for 2C plan 5, so the header brings its own gap (spec 2B §4.6.1)")
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
