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
  // The tag that renders RowActions on this page, when a client wrapper does it.
  rowActions?: string
  // Spec group 8 §3: no next button (the row opens the edit page); แก้ไข is the first link in ⋯.
  editInMenu?: boolean
}

// The master-data lists of plan 2B-1. The commit that moves a page adds its line.
const MASTER_DATA_LISTS: readonly MasterDataList[] = [
  // Group 8 plan 1 Task 3: branches say "ปิดใช้งาน" / "เปิดใช้งาน" through MasterDataRowActions, as companies.
  { path: `${D}master-data/branches/page.tsx`, deleteEndpoints: [], rowActions: "<MasterDataRowActions", editInMenu: true, removedWrappers: [`${C}master-data/branch-delete-button.tsx`], stats: true },
  // Group 7 plan 1 Task 4: brands and models say "ปิดใช้งาน" through BrandModelDeactivateButton (it renders RowActions).
  { path: `${D}master-data/brands/page.tsx`, deleteEndpoints: [], rowActions: "<BrandModelDeactivateButton", removedWrappers: [`${C}master-data/brand-delete-button.tsx`, `${C}master-data/asset-model-delete-button.tsx`], stats: true },
  // Group 8 plan 2 Task 1: categories say "ปิดใช้งาน" / "เปิดใช้งาน" through MasterDataRowActions, as companies.
  { path: `${D}master-data/categories/page.tsx`, deleteEndpoints: [], rowActions: "<MasterDataRowActions", editInMenu: true, removedWrappers: [`${C}master-data/category-delete-button.tsx`], stats: true },
  // Group 8 plan 1 Task 2: companies say "ปิดใช้งาน" / "เปิดใช้งาน" through MasterDataRowActions (it renders RowActions).
  { path: `${D}master-data/companies/page.tsx`, deleteEndpoints: [], rowActions: "<MasterDataRowActions", editInMenu: true, removedWrappers: [`${C}master-data/company-delete-button.tsx`], stats: true },
  // Group 8 plan 1 Task 4: departments say "ปิดใช้งาน" / "เปิดใช้งาน" through MasterDataRowActions, as companies and branches.
  { path: `${D}master-data/departments/page.tsx`, deleteEndpoints: [], rowActions: "<MasterDataRowActions", editInMenu: true, removedWrappers: [`${C}master-data/department-delete-button.tsx`], stats: true },
  // Group 7 follow-ups Task 2: employees say "ปิดใช้งาน" through EmployeeRowActions (it renders RowActions, G7F-R2).
  { path: `${D}master-data/employees/page.tsx`, deleteEndpoints: [], rowActions: "<EmployeeRowActions", removedWrappers: [`${C}master-data/employee-delete-button.tsx`], stats: true },
  // Group 7 plan 3 Task 3: locations say "ปิดใช้งาน" through LocationDeactivateButton (it renders RowActions).
  { path: `${D}master-data/locations/page.tsx`, deleteEndpoints: [], rowActions: "<LocationDeactivateButton", removedWrappers: [`${C}master-data/location-delete-button.tsx`], stats: true },
  { path: `${D}admin/users/page.tsx`, deleteEndpoints: [], removedWrappers: [], stats: false },
]

test("master-data lists build on PageHeader, DataTable, TableEmptyRow, RowActions and the shared Pagination (spec 2B §5.3, B5, B6)", () => {
  for (const { path, deleteEndpoints, removedWrappers, stats, rowActions = "<RowActions", editInMenu = false } of MASTER_DATA_LISTS) {
    const source = read(path)
    for (const part of ["<PageHeader", "<DataTable", "<DataTableHeader>", "<DataTableBody>", "<TableEmptyRow", "<ClickableTableRow", rowActions, "<Pagination"]) {
      assert.ok(source.includes(part), `${path}: no ${part}`)
    }
    if (stats) assert.ok(source.includes("<StatStrip"), `${path}: no <StatStrip`)
    assert.match(source, /<div className="space-y-6">/, `${path}: the page root spaces its blocks 24px apart (spec 2B §4.6.1)`)
    assert.match(source, /scrollHint=\{tCommon\("tableScrollHint"\)\}/, `${path}: a table with no phone list scrolls sideways with the hint (B6)`)
    assert.match(source, /pageSizes=\{LIST_PAGE_SIZES\.map\(/, `${path}: 25, 50 or 100 rows per page (R-k)`)
    assert.match(source, /menuLabel=\{tCommon\("moreActionsFor", \{ code: [\w.]+ \}\)\}/, `${path}: ⋯ is named after its row (I33)`)
    if (editInMenu) {
      // Group 8 plan 1 final review: แก้ไข only with <module>:edit (canEdit), still the first link.
      assert.match(source, /links: (?:\[\n\s+\.\.\.\(canEdit \? \[|canEdit \? \[)\{ key: "edit", label: tCommon\("edit"\), href: editHref, icon: <Pencil aria-hidden="true" \/> \}\]/, `${path}: แก้ไข is the first link in ⋯`)
      assert.doesNotMatch(source, /next=\{\{/, `${path}: no next button`)
    } else {
      assert.match(source, /next=\{\{ label: (?:tCommon\("edit"\)|t\("\w+"\)), href: \w+, icon: <Pencil aria-hidden="true" \/> \}\}/, `${path}: the next step is the edit link (B5)`)
    }
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

test("the selected brand keeps the vertical brand picker and gets RowActions: edit brand, ปิดใช้งาน in ⋯ (spec 2B I5, I11; group 7 §4.3)", () => {
  const source = read(`${D}master-data/brands/page.tsx`)
  const start = source.indexOf("const selectedBrandActions = selectedBrand ? (")
  assert.ok(start !== -1, "the selected brand actions")
  const panel = source.slice(start, source.indexOf(") : null", start))
  assert.match(panel, /<BrandModelDeactivateButton\n\s+kind="brand"/)
  assert.match(panel, /name=\{selectedBrand\.name\}/)
  assert.match(panel, /next=\{\{ label: t\("editSelectedBrand"\), href: selectedBrandEditHref, icon: <Pencil aria-hidden="true" \/> \}\}/)
  assert.match(panel, /endpoint=\{`\/api\/brands\/\$\{selectedBrand\.id\}`\}/)
  assert.match(source, /\{selectedBrand \? \([\s\S]*?\{selectedBrandActions\}[\s\S]*?<\/aside>/, "the picker's panel shows them")
  assert.equal(source.match(/aria-current=\{/g)?.length, 2, "the picker keeps aria-current=\"page\" on its two links (I11, LFG EXEMPT.LN1)")
  assert.match(source, /<ContentPanel\n\s+divided\n\s+flush\n/, "the model table sits flush in a divided panel: no frame in a frame")
  assert.match(source, /<DataTable\n\s+framed=\{false\}/)
})

// B4 (spec 2B §5.9): the lists that now page on the server. Plans 2B-2 and 2B-5 add theirs, one line each, before the "]".
const B4_LISTS: string[] = [
  // departments left in group 8 plan 1 Task 4: it reads page and pageSize through parseDepartmentListParams
  // (src/lib/department-list-query.ts), and tests/departments-list-board.test.ts pins its paging.
  // disposal/batches left in request batches Task 4: it pages through readDisposalBatchList (listPageWindow there), and
  // tests/disposal-batch-page-ui.test.ts and tests/disposal-batch-page-data.test.ts pin it.
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
  // Group 8 plan 1 Task 4: the list state (page and page size included) is departmentListHref's query string.
  const source = read(`${D}master-data/departments/page.tsx`)
  assert.match(source, /const listHref = \(next: Partial<DepartmentListState>\) => departmentListHref\(basePath, listState, next\)/)
  assert.match(source, /const departmentReturnHref = listHref\(\{\}\)/)
  assert.match(source, /\{listState\.pageSize !== 25 \? <input type="hidden" name="pageSize" value=\{listState\.pageSize\} \/> : null\}/)
  assert.match(source, /pageSizes=\{LIST_PAGE_SIZES\.map\(\(value\) => \(\{ value, href: listHref\(\{ pageSize: value, page: 1 \}\) \}\)\)\}/)
})

// Suppliers is not in MASTER_DATA_LISTS: its table, row actions and foot live in supplier-list-view.tsx, and its empty
// state is an ActionEmptyState outside the table. This test reads the page and the list view together (2B-1 Task 20).
test("suppliers: the page and its list view build on PageHeader, StatStrip, DataTable, MasterDataRowActions and one shared Pagination (spec 2B §5.3, B5)", () => {
  const page = read(`${D}master-data/suppliers/page.tsx`)
  const list = read(`${C}master-data/supplier-list-view.tsx`)
  for (const part of ["<PageHeader", "<StatStrip", '<FilterPanel className="hidden md:block">', '<form role="search"', "<FilterFormActions", "<Pagination"]) {
    assert.ok(page.includes(part), `page: no ${part}`)
  }
  // Group 8 plan 3 Task 1: ⋯ is MasterDataRowActions (แก้ไข, ปิดใช้งาน / เปิดใช้งาน) and the foot holds the counts note.
  for (const part of ["<DataTable", "<DataTableHeader>", "<DataTableBody>", "<ClickableTableRow", "<DataTableFoot>", "{pagination}", "<MasterDataRowActions"]) {
    assert.ok(list.includes(part), `list view: no ${part}`)
  }
  assert.match(page, /<div className="space-y-6">/)
  assert.match(page, /tableScrollHint: tCommon\("tableScrollHint"\)/)
  assert.match(page, /pageSizes=\{LIST_PAGE_SIZES\.map\(/)
  assert.match(page, /moreActionsFor: \(code\) => tCommon\("moreActionsFor", \{ code \}\)/)
  assert.match(page, /^import \{ redirect \} from "next\/navigation"$/m)
  assert.match(page, /const lastPage = lastListPage\(total, listState\.pageSize\)\n\s+if \(suppliers\.length === 0 && total > 0 && listState\.page > lastPage\) \{\n\s+redirect\(/)
  assert.equal(page.match(/<SupplierFilterForm [^\n]*hasActiveFilters=\{hasActiveFilters\}/g)?.length, 2, "both filter forms show clear filters only while a filter is on")
  assert.equal(list.match(/<MasterDataRowActions\r?\n/g)?.length, 2, "the desktop row and the phone card")
  assert.doesNotMatch(list, /deleteAction=/)
  assert.match(list, /scrollHint=\{labels\.tableScrollHint\}/)
  assert.match(list, /actionVariant=\{hasActiveFilters \? "secondary" : "primary"\}/)
  assert.equal(existsSync(`${C}master-data/supplier-delete-button.tsx`), false, "the wrapper has no caller left (I5)")
})

test("users: edit is the row's only command, so RowActions draws no ⋯, and create is a header button for who may create (spec 2B §5.3; 2D M13, D11)", () => {
  const source = read(`${D}admin/users/page.tsx`)
  assert.match(source, /next=\{\{ label: tCommon\("edit"\), href: editHref, icon: <Pencil aria-hidden="true" \/> \}\}\r?\n\s+nextWidth="auto"\r?\n\s+groups=\{\[\]\}\r?\n\s+\/>/)
  assert.doesNotMatch(source, /deleteAction=/)
  assert.match(source, /const canCreate = hasPermission\(currentUser, "user", "create"\)/)
  assert.match(source, /<PageHeader\n\s+title=\{t\("title"\)\}\n\s+meta=\{t\("subtitle"\)\}\n\s+actions=\{\n\s+canCreate \? \(\n\s+<Link href=\{`\$\{basePath\}\/new`\} className=\{buttonVariants\(\{ size: "md" \}\)\}>/)
  assert.doesNotMatch(source, /\bfixed bottom-|shadow-lg|rounded-full/)
  // Group 11 plan 1 Task 2: the search also keeps the status and the role (tests/admin-users-board.test.ts pins those).
  assert.match(source, /hiddenInputs=\{\{\n\s+pageSize: listState\.pageSize,\n\s+sort: listState\.sort,\n\s+direction: listState\.direction,\n/)
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
    // admin/users left in group 11 plan 1 Task 2: board US-Users fits at 1440 with no sticky column (spec §4.3), and
    // tests/admin-users-board.test.ts pins its plain actions column.
  ]
  for (const file of files) {
    const source = read(file)
    assert.match(source, /<DataTableHead align="right" sticky="right" hideLabel>/, `${file}: the actions header is pinned`)
    // The brands page renders its row actions through modelActions (BrandModelDeactivateButton, group 7 plan 1 Task 4).
    assert.match(source, /<DataTableCell align="right" sticky="right">\s*(?:<RowActions|<LocationDeactivateButton|<EmployeeRowActions|<MasterDataRowActions|\{modelActions\(model, editModelHref\)\})/, `${file}: the actions cell is pinned`)
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
  // Group 6 plan 4 Task 3 (board DP-Queue): the next-step column names itself ขั้นถัดไป.
  assert.match(source, /<DataTableHead align="right" sticky="right">\{t\("queue\.colNext"\)\}<\/DataTableHead>/)
  // Group 6 plan 2 Task 3 (spec §10.2): the pending tab's rows link to the approvals page instead.
  // Group 6 plan 4 Task 3 (spec §10.2): a request recorded in a round shows its round instead.
  assert.match(source, /<DataTableCell align="right" sticky="right">\s*\{pendingInboxEnabled \? <DisposalInboxStep [^\n]*\n\s+: request\.round \? \([\s\S]*?\)\n\s+: \(\s*<>\s*<DisposalNextAction /)
  assert.match(source, /row=\{\{ menuLabel: tCommon\("moreActionsFor", \{ code: request\.disposalNo \}\), batchHref: /)
  assert.match(source, /pageSizes=\{LIST_PAGE_SIZES\.map\(/)
  assert.match(source, /<TableEmptyRow colSpan=\{[^}]+\} emptyState=\{emptyState\} \/>/)
  assert.match(source, /actionVariant: hasActiveFilters \? "secondary" : "primary"/)
  assert.match(source, /formatMoney\(Number\(request\.saleValue\), \{ unit \}\)/)
  // Group 6 plan 4 (P4-R1): no per-row execution; an approved request is recorded only in a disposal round.
  assert.doesNotMatch(source, /kind: "execute"|executeDisposalShort/)
  assert.match(source, /^import \{ redirect \} from "next\/navigation"$/m)
  assert.match(source, /const lastPage = lastListPage\(total, filters\.pageSize\)\n\s+if \(requests\.length === 0 && total > 0 && filters\.page > lastPage\) \{\n\s+redirect\(`\/\$\{locale\}\/disposal\?\$\{buildDisposalQueryString\(filters, \{ page: lastPage \}\)\}`\)/)
  assert.doesNotMatch(source, /DisposalBulkApproval|bulkApprovalCopy/, "group 6 plan 2 Task 3: bulk approval lives in the approvals page")
  assert.doesNotMatch(source, /DisposalBulkExecution|bulkExecution/, "group 6 plan 4 (P4-R1): bulk execution is retired")
  assert.equal(existsSync(`${C}disposal/disposal-pagination.tsx`), false, "the queue was the last caller of DisposalPagination")
})

test("DisposalRowActions opens the 2C decision dialog through its handle and gives focus back to the button that opened it (spec 2B R-m, §3.11)", () => {
  const source = read(`${C}disposal/disposal-row-actions.tsx`)
  assert.match(source, /^"use client"/)
  assert.match(source, /<RowActions\n\s+code=\{code\}/)
  assert.match(source, /openerRef=\{openerRef\}\n\s+menu="dropdown"/)
  assert.match(source, /onSelect: \(\) => decisionRef\.current\?\.open\(\)/)
  assert.match(source, /<DisposalDecisionButton \{\.\.\.next\.dialog\} ref=\{decisionRef\} hideTrigger returnFocusRef=\{openerRef\} \/>/)
  assert.doesNotMatch(source, /DisposalExecutionButton|executionRef/, "group 6 plan 4 (P4-R1): no per-row execution")
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
  assert.match(source, /searchParams: Promise<\{ q\?: string \| string\[\]; page\?: string \| string\[\]; pageSize\?: string \| string\[\] \}>/)
  assert.match(source, /const batchesReturnHref = listHref\(listPage\)/)
  assert.match(source, /appendOperationalReturnTo\(`\/\$\{locale\}\/disposal\/batches\/\$\{id\}`, batchesReturnHref\)/)
  assert.match(source, /next=\{\{ label: t\("openBatch"\), href, icon: <FolderOpen aria-hidden="true" \/> \}\}\n\s+groups=\{\[\]\}\n\s+\/>/, "one next step and no ⋯: opening the batch is the row's only command")
  assert.doesNotMatch(source, /deleteAction=/)
  assert.match(source, /<DataTableHead align="right" sticky="right" hideLabel>\{tCommon\("actions"\)\}<\/DataTableHead>/)
  assert.match(source, /pageSizes=\{LIST_PAGE_SIZES\.map\(\(value\) => \(\{ value, href: listHref\(\{ pageSize: value \}\) \}\)\)\}/)
  assert.match(source, /^import \{ redirect \} from "next\/navigation"$/m)
  assert.match(source, /const lastPage = lastListPage\(total, listPage\.pageSize\)\n\s+if \(rows\.length === 0 && total > 0 && listPage\.page > lastPage\) \{\n\s+redirect\(/)
  // Request batches Task 4: total is the search's count now, so the header counts every active batch (the strip's).
  assert.match(source, /const hasBatches = strip\.batches > 0/)
  assert.match(source, /canCreate && hasBatches \?/, "the create button in the header shows once a batch exists, counted over all pages")
})

// Plan 2B-2 Task 5 (spec 2B §5.4 row "disposal/batches/[id]", §4.4.3, §4.6.3): the batch page on the list primitives.
// Request batches Task 3 (DP-Batch) rebuilt it on the round page's look: rows link their request, their round and
// "แนบรูป" instead of being one clickable row with a next step (tests/disposal-batch-page-ui.test.ts pins the rest).
test("the disposal batch page builds on PageHeader, StatStrip, KeyValueList and DataTable, with no pb-24 of its own (spec 2B §5.4)", () => {
  const source = read(`${D}disposal/batches/[id]/page.tsx`)
  for (const part of ["<PageHeader", "<PageBackLink", "<StatStrip", "<KeyValueList", "<DataTable", "<DataTableHeader>", "<DataTableBody>", "<TableEmptyRow"]) {
    assert.ok(source.includes(part), `no ${part}`)
  }
  assert.match(source, /<div className="space-y-6">/, "the shell already leaves room for the bottom bar (spec 2B §4.6.3)")
  assert.doesNotMatch(source, /\bpb-24\b/)
  assert.match(source, /title=\{<span className="tag font-medium">\{batch\.batchNo\}<\/span>\}/, "a batch has no name of its own, so the h1 is its code (spec 2B §4.3.3 rule 6)")
  assert.match(source, /breadcrumbs=\{\[\{ label: t\("title"\), href: `\/\$\{locale\}\/disposal` \}, \{ label: batch\.batchNo, code: true \}\]\}/)
  assert.doesNotMatch(source, /function (?:BatchMetric|BatchInfo|RequestLink)\b/)
})

// Plan 2B-2 Tasks 6–8 (spec 2B §5.4 row "audit/findings", §8.6 rows 7–9): the findings list, its batch panel and its
// row triggers. The panel and the triggers are 2C files, so only their list part is checked; their dialogs stay with 2C.
const FINDINGS_BATCH = `${C}audit/audit-findings-batch-actions.tsx`

test("the findings batch: ticks in a 44px label, the shared bar with ล้าง, reject as danger and approve in the primary color, busy while it runs (spec §10, P4-R15)", () => {
  const source = read(FINDINGS_BATCH)
  assert.match(source, /<DesktopSelectionBar\n/)
  assert.match(source, /<Button variant="danger" size="md" onClick=\{\(\) => openDialog\("reject"\)\} busy=\{selection\.running === "reject"\} disabled=\{selection\.running === "approve"\}>/)
  assert.match(source, /<Button size="md" onClick=\{\(\) => openDialog\("approve"\)\} busy=\{selection\.running === "approve"\} disabled=\{selection\.running === "reject"\}>/)
  assert.equal(source.match(/className=\{checkboxVariants\(\)\}/g)?.length, 2, "the header tick and the row tick")
  assert.doesNotMatch(source, /<button\b|<Loader2\b|\bbg-success\b|\bbg-danger\b|opacity-50|h-4 w-4 rounded|<ChoiceCard/, "no hand-written button, spinner, green fill, old checkbox or card list")
  assert.match(source, /<ConfirmTextDialog\n/, "the shared reason stays the shared dialog")
})

// Group 2 plan 4 (spec §10, Appendix A §10): the review decision moved into the review panel (audit-finding-decision.tsx);
// this file keeps a finding's follow-up: "แผนแก้ไข" and "ปิดรายการไม่ตรง" as outline Buttons that mount their dialogs.
const FINDING_FOLLOW_UP = `${C}audit/audit-finding-review-actions.tsx`

test("the finding follow-up: แผนแก้ไข and ปิดรายการไม่ตรง are outline Buttons that mount their two dialogs; the review decision is no longer here (group 2 spec §10, Appendix A §10)", () => {
  const source = read(FINDING_FOLLOW_UP)
  assert.match(source, /export function AuditFindingFollowUpActions\(/)
  assert.match(source, /<Button variant="outline" size="md" onClick=\{\(\) => setPlanOpen\(true\)\}>\n\s+<CalendarClock aria-hidden="true" \/>\n\s+\{t\("actionPlan"\)\}/)
  assert.match(source, /\{actionStatus !== "closed" \? \(\n\s+<Button variant="outline" size="md" onClick=\{\(\) => setCloseOpen\(true\)\}>\n\s+<FileUp aria-hidden="true" \/>\n\s+\{t\("closeFinding"\)\}/)
  assert.equal(source.match(/<AccessibleDialog open title=\{t\("(?:actionPlanTitle|closeFindingTitle)"\)\} busy=\{saving\} size="md" onClose=\{onClose\}>/g)?.length, 2)
  assert.equal(source.match(/<AccessibleDialog\b/g)?.length, 2, "the action-plan and close dialogs stay; the decision has no dialog (group 2 spec §10)")
  assert.doesNotMatch(source, /ReviewDecisionModal|AuditFindingReviewActions|\bcompact\b|RowActions|stopPortalClick|returnFocusRef|segregationReviewBlocked/)
  assert.doesNotMatch(source, /<button\b|<Loader2\b|\btext-success\b|disabled:opacity-50/, "no hand-written trigger, spinner or green text is left")
})

// Task 8 (spec 2B §5.4 row "audit/findings", §5.9.2 row 3, §5.10 row 2, I21, I24): the findings list page.
const FINDINGS_PAGE = `${D}audit/findings/page.tsx`

test("findings: PageHeader with the way back and ส่งออก ▾, TabNav with counts, the list on DataTable, the review pane beside it, and the shared Pagination (spec 2B §5.4, I24; group 2 spec §10)", () => {
  const source = read(FINDINGS_PAGE)
  for (const part of ["<PageHeader", "<PageBackLink", "<AuditFindingsExportMenu", "<TabNav", "<FilterChipList", "<FilterSelect", "<DataTable", "<DataTableHeader>", "<DataTableBody>", "<TableEmptyRow", "<ClickableTableRow", "<DataTableFoot>", "<Pagination", "data-audit-finding-pane"]) {
    assert.ok(source.includes(part), `no ${part}`)
  }
  assert.match(source, /<div className="space-y-6">/)
  assert.match(source, /back=\{<PageBackLink href=\{back\.href\} label=\{backLabel\} className=\{chosen \? "max-xl:hidden" : undefined\} \/>\}/, "the way back has the left arrow (spec 2B §5.10 row 2) and honours returnTo (P4-R12)")
  assert.match(source, /<TabNav aria-label=\{t\("quickFilters"\)\} items=\{resolutionFilters\} current=\{view\.tab\} scroll=\{false\} \/>/)
  assert.match(source, /<FilterChipList chips=\{filterChips\} label=\{t\("activeFilters"\)\} removeLabel=\{tAsset\("clearDrilldownFilter"\)\} \/>/)
  assert.match(source, /<AuditFindingsSelectionProvider key=\{selectionKey\} filterKey=\{filterKey\} findings=\{selectableFindings\}>/, "another page or filter starts the ticks empty")
  assert.match(source, /<TableEmptyRow colSpan=\{[^}]+\} emptyState=\{\{ icon: <FileText \/>, \.\.\.empty, actionVariant: "secondary" \}\} \/>/)
  // Task 2's pin, kept: the round select names a round that is not among its options (I24).
  assert.match(read("src/lib/audit-findings-page-data.ts"), /filters\.roundId \? prisma\.auditRound\.findUnique\(\{ where: \{ id: filters\.roundId \}, select: \{ id: true, auditNo: true, name: true \} \}\)/, "the round select names its round (I24)")
  assert.doesNotMatch(source, /<StatStrip\b|<MasterDataHeader\b|<ColumnHeader\b|toLocaleString\(|sticky="right"/)
})

test("findings page on the server: Task 2's page data pages and counts the list, a page past the end goes to the last, and the page sizes link (spec 2B §5.9.2 row 3; group 2 plan 4)", () => {
  const source = read(FINDINGS_PAGE)
  const data = read("src/lib/audit-findings-page-data.ts")
  const rules = read("src/lib/audit-finding-filters.ts")
  assert.match(source, /const \{ rows, total, listPage, counts, back \} = data/)
  assert.match(rules, /listPage: parseListPage\(\{ page: params\.page, pageSize: params\.pageSize \}\)/)
  assert.match(data, /const \{ skip, take \} = listPageWindow\(listPage\)/)
  assert.match(data, /orderBy: auditFindingsListOrderBy, skip, take/)
  assert.match(rules, /export const auditFindingsListOrderBy: Prisma\.AuditFindingOrderByWithRelationInput\[\] = \[\{ reportedAt: "desc" \}, \{ id: "asc" \}\]/, "the old order plus id, so no finding shows on two pages")
  assert.doesNotMatch(source, /\btake: \d+/, "no fixed number of rows")
  assert.doesNotMatch(data, /\btake: \d+/)
  assert.match(data, /isAuditFindingWaitingStatus\(filters\.status\) \? prisma\.auditFinding\.count\(\{ where: listWhere \}\) : Promise\.resolve\(null\)/, "one more count only for a bell kind, which no tab counts")
  assert.match(data, /const total = isAuditFindingWaitingStatus\(filters\.status\) \? \(waitingTotal \?\? 0\) : counts\[filters\.status\]/)
  assert.match(source, /^import \{ redirect \} from "next\/navigation"$/m)
  assert.match(source, /const lastPage = lastListPage\(\w+, [\w.]+\)\n\s+if \(\w+\.length === 0 && \w+ > 0 && [\w.]+ > lastPage\) \{\n\s+redirect\(/)
  assert.match(source, /pageSizes=\{LIST_PAGE_SIZES\.map\(\(value\) => \(\{ value, href: pageHref\(\{ pageSize: value \}\) \}\)\)\}/)
  assert.match(rules, /appendListPage\(params, \{ page: overrides\.page, pageSize: overrides\.pageSize \}\)/, "buildAuditFindingsHref writes page above 1 and pageSize other than 25 only")
  assert.match(source, /buildAuditFindingsHref\(locale, filters, \{ \.\.\.next, pageSize: listPage\.pageSize \}\)/, "a filter link goes back to page 1 and keeps the page size")
})

// Plan 2B-2 Task 9 (spec 2B §5.4 row rounds, §5.9.2 row 7, I20, I21): the audit rounds list. The view filters and the
// tab counts need the insight of every round, so the query stays whole: the list pages in memory and clamps the page.
test("audit rounds: PageHeader, StatStrip, the quick filters on TabNav, and the list on DataTable with RowActions and Pagination (spec 2B §5.4)", () => {
  const source = read(`${D}audit/rounds/page.tsx`)
  for (const part of ["<PageHeader", "<StatStrip", "<TabNav", "<DataTable", "<DataTableHeader>", "<DataTableBody>", "<TableEmptyRow", "<ClickableTableRow", "<RowActions", "<DataTableFoot>", "<Pagination", "<FilterChipList", "<PaceBar"]) {
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
test("audit round detail: PageHeader, the round-wide StatStrip, the result and category TabNavs, the result list on DataTable with RowActions' ⋯ and the shared Pagination (spec 2B §5.4; group 2 spec §8)", () => {
  const source = read(`${D}audit/rounds/[id]/page.tsx`)
  for (const part of ["<PageHeader", "<StatStrip", "<DataTable", "<DataTableHeader>", "<DataTableBody>", "<TableEmptyRow", "<ClickableTableRow", "<RowActions", "<KeyValueList", "<DataTableFoot>", "<Pagination", "<TabNav", "<FilterChipList"]) {
    assert.ok(source.includes(part), `no ${part}`)
  }
  assert.match(source, /<div className=\{!isRoundReadOnly \? actionBarPagePadding\.single : undefined\}>\n\s+<PageHeader\n\s+className="mb-6"/, "the root leaves room for the ActionBar (2C plan 5, O11), so the header brings its own gap (spec 2B §4.6.1)")
  assert.match(source, /\{ href: returnToHref, label: tCommon\("back"\), icon: <ArrowLeft className="h-4 w-4" \/> \}/, "the back item of the mobile action bar has a left arrow (B2)")
  assert.match(source, /<TabNav aria-label=\{t\("result"\)\} items=\{resultTabs\} current=\{filters\.result\} \/>/, "the result in view is the current tab")
  assert.match(source, /next=\{undefined\}\n\s+groups=\{item\.groups\}/, "แก้ไขผลตรวจ sits in ⋯ (group 2 spec §8, Appendix A §8)")
  assert.match(source, /<DataTableHead align="right" sticky="right" hideLabel>\{tCommon\("actions"\)\}<\/DataTableHead>/)
  assert.match(source, /pageSizes=\{auditRoundResultPageSizeOptions\.map\(\(value\) => \(\{ value, href: pageHref\(filters, \{ page: 1, pageSize: value \}\) \}\)\)\}/, "the result list keeps its own page and pageSize params")
  assert.match(source, /^import \{ notFound, redirect \} from "next\/navigation"$/m)
  assert.match(source, /if \(data\.rows\.length === 0 && resultListTotal > 0 && page > resultLastPage\) \{\n\s+redirect\(pageHref\(filters, \{ page: resultLastPage \}\)\)/, "a result page past the last one shows the last page (I21)")
})

// Plan 2B-2 Task 11 (spec 2B §5.4 row pending, §5.9.2 row 4, bugs §5.10 #8 and #9, I21, R-m): the pending list of a
// round. It pages like the B4 lists, but it is not in B4_LISTS: its load lives in src/lib/audit-pending-list-data.ts
// (group 2 plan 2 Task 6), which has no fixed take since ตรวจล่าสุด moved from movements to audit items (P2-R32).
test("the pending list of a round pages on the server and counts every pending item (spec 2B §5.9.2 row 4, bug §5.10 #8; group 2 spec §9)", () => {
  const source = read(`${D}audit/rounds/[id]/pending/page.tsx`)
  const data = read("src/lib/audit-pending-list-data.ts")
  assert.match(source, /const listPage = parseListPage\(\{ page: rawSearchParams\.page, pageSize: rawSearchParams\.pageSize \}\)/)
  assert.match(data, /const \{ skip, take \} = listPageWindow\(listPage\)/)
  assert.equal(data.match(/\btake: \d+/g), null, "no fixed take: one page of rows, and ตรวจล่าสุด in one read for the page's assets (P2-R32)")
  assert.equal(source.match(/\btake: \d+/g), null)
  assert.match(data, /await Promise\.all\(\[\n\s+prisma\.auditItem\.findMany\(\{ where, include: pendingItemInclude, orderBy: \[\{ createdAt: "asc" \}, \{ id: "asc" \}\], skip, take \}\),\n\s+prisma\.auditItem\.count\(\{ where \}\),\n\s+\]\)/, "findMany and count in one Promise.all, the old order plus id")
  assert.ok(source.indexOf("if (!round || isAuditRoundReadOnlyStatus(round.status)) notFound()") < source.indexOf("getAuditPendingListData("), "the items load only after the round passed the read-only check")
  assert.match(source, /title=\{t\("titleWithCount", \{ count: formatCount\(data\.counts\.pending\) \}\)\}/, "the title counts every pending item of the round, not the rows of one page (P2-R12)")
  assert.match(source, /^import \{ notFound, redirect \} from "next\/navigation"$/m)
  assert.match(source, /const lastPage = lastListPage\(total, listPage\.pageSize\)\n\s+if \(items\.length === 0 && total > 0 && listPage\.page > lastPage\) \{\n\s+redirect\(listHref\(\{ page: lastPage \}\)\)/, "a page past the last one shows the last page (I21)")
  assert.match(source, /return appendOperationalReturnTo\(query \? `\$\{pendingHref\}\?\$\{query\}` : pendingHref, returnTo\)/, "every list link keeps the page's returnTo, the search and the room")
  assert.match(source, /pageSizes=\{LIST_PAGE_SIZES\.map\(\(value\) => \(\{ value, href: listHref\(\{ pageSize: value \}\) \}\)\)\}/)
})

test("pending rows: the whole row and the name open the asset, and the row's two buttons and the phone card's scan and not-found are for audit:edit only (group 2 spec §9, Appendix A §9, bugs 14 and 15, P2-R14, P2-R28)", () => {
  const page = read(`${D}audit/rounds/[id]/pending/page.tsx`)
  for (const part of ["<PageHeader", "<DataTable", "<DataTableHeader>", "<DataTableBody>", "<TableEmptyRow", "<ClickableTableRow", "<DataTableFoot>", "<Pagination"]) {
    assert.ok(page.includes(part), `page: no ${part}`)
  }
  assert.match(page, /<div className="space-y-6">/)
  assert.match(page, /back=\{<PageBackLink href=\{returnToHref\} label=\{tCommon\("back"\)\} \/>\}/, "the text link above the title became the back button (B2)")
  assert.match(page, /\{canScan \? \(\n\s+<DataTableHead align="right" sticky="right" hideLabel>\{tCommon\("actions"\)\}<\/DataTableHead>/)
  assert.match(page, /<AuditMarkNotFoundButton itemId=\{item\.id\} variant="row" asset=\{facts\.notFound\} \/>/)
  assert.match(page, /<AuditMarkNotFoundButton itemId=\{item\.id\} variant="button" asset=\{facts\.notFound\} \/>/, "the phone card keeps its own not-found button")
  assert.doesNotMatch(page, /AuditPendingRowActions|<RowActions/, "two visible buttons, not RowActions' one next slot (P2-R14)")
  assert.equal(existsSync(`${C}audit/audit-pending-row-actions.tsx`), false, "the ⋯ wrapper is gone")
})

// Plan 2B-2 Task 12 (spec 2B §5.4 row "maintenance", §5.10 #4 and #11, I21): the repair-record list. It already paged on
// the server; it keeps its phone cards, moves its table and pager to the shared parts, and its empty state tells a
// filtered list from an empty one.
test("the repair-record list builds on PageHeader, DataTable, the shared filters and one Pagination under cards and table (spec 2B §5.4)", () => {
  const source = read(`${D}maintenance/page.tsx`)
  for (const part of ["<PageHeader", '<form id="repair-list-filter" role="search"', "<FilterChipList", "<DataTable", "<DataTableHeader>", "<DataTableBody>", "<ClickableTableRow", "<DataTableFoot>", "<Pagination"]) {
    assert.ok(source.includes(part), `no ${part}`)
  }
  assert.match(source, /<div className="space-y-6">\n\s+<PageHeader\n\s+title=\{t\("title"\)\}\n\s+meta=\{t\("subtitle"\)\}/)
  assert.match(source, /<DataTable framed=\{false\} className=\{getDesktopTableOnlyClasses\(\)\} caption=\{t\("listTitle"\)\} scrollHint=\{tCommon\("tableScrollHint"\)\}>/)
  assert.match(source, /pageSizes=\{LIST_PAGE_SIZES\.map\(/)
  assert.match(source, /<DataTableHead align="right">\{t\("cost"\)\}<\/DataTableHead>/, "the cost head names the unit (บาท), so the cells carry none")
  assert.match(source, /<DataTableCell numeric className="text-muted-foreground">\{row\.cost == null \? <Nil \/> : formatMoney\(row\.cost\)\}<\/DataTableCell>/)
  assert.match(source, /formatMoney\(row\.cost, \{ unit: tCommon\("baht"\) \}\)/, "the phone card is not under that head, so it shows the unit")
  assert.equal(existsSync(`${C}maintenance/maintenance-pagination.tsx`), false, "the local pager went with its last caller")
})

test("the repair-record list sends a page past the end to the last page and splits its empty state on the filters (spec 2B I21, §5.10 #4)", () => {
  const source = read(`${D}maintenance/page.tsx`)
  assert.match(source, /^import \{ redirect \} from "next\/navigation"$/m)
  assert.match(source, /const lastPage = lastListPage\(total, filters\.pageSize\)\n\s+if \(rows\.length === 0 && total > 0 && filters\.page > lastPage\) \{\n\s+redirect\(buildMaintenancePageHref\(locale, listQuery, \{ page: lastPage \}\)\)/)
  assert.match(source, /const hasActiveFilters = Boolean\(filters\.search \|\| filters\.status \|\| filters\.dateFrom \|\| filters\.dateTo\)/)
  assert.match(source, /title=\{t\("emptyFilteredTitle"\)\} description=\{t\("emptyFilteredHelp"\)\} actionHref=\{clearHref\} actionLabel=\{t\("clearFilters"\)\} actionVariant="secondary"/)
  assert.match(source, /title=\{t\("emptyTitle"\)\} description=\{canCreate \? t\("emptyHelp"\) : undefined\} actionHref=\{canCreate \? createHref : undefined\} actionLabel=\{canCreate \? t\("createTitle"\) : undefined\}/)
})

// Plan 2B-2 Task 13 (spec 2B §5.4 row "maintenance/pm", §5.9.2 row 6, I21, I25): the PM plans page on the server, and
// the page gets the back link it lacked. Group 5 plan 4 (G5P4-R4): one state per page through readPmPlanPage
// (tests/pm-plan-page-data.test.ts pins the read), as a DataTable with phone cards (Task 3, tests/pm-plans-ui.test.ts).
test("PM plans page on the server by state, as a DataTable with one Pagination at the end of the panel (spec 2B §5.9.2 row 6)", () => {
  const source = read(`${D}maintenance/pm/page.tsx`)
  assert.match(source, /const query = parsePmPlanQuery\(await searchParams\)/)
  assert.match(source, /const \{ rows: plans, total, tabCounts, due, allPlansCount \} = await readPmPlanPage\(prisma, query, now\)/)
  assert.doesNotMatch(source, /planStatePageSlices/)
  assert.doesNotMatch(source, /\btake: \d+|\.sort\(/, "no fixed number of rows, and no sort of a capped list in JS")
  assert.match(source, /<ContentPanel divided flush className="overflow-hidden">/)
  assert.match(source, /<DataTableFoot>\n[\s\S]*?<Pagination\n/)
  assert.match(source, /pageSizes=\{LIST_PAGE_SIZES\.map\(\(value\) => \(\{ value, href: listHref\(\{ pageSize: value \}\) \}\)\)\}/)
  assert.match(source, /^import \{ redirect \} from "next\/navigation"$/m)
  assert.match(source, /const lastPage = lastListPage\(total, query\.pageSize\)\n\s+if \(plans\.length === 0 && total > 0 && query\.page > lastPage\) \{\n\s+redirect\(listHref\(\{ page: lastPage, pageSize: query\.pageSize \}\)\)/)
})

test("the PM page goes back to maintenance, has no icon in its title, and its links keep the page (spec 2B I25, B4; group 5 §9)", () => {
  const source = read(`${D}maintenance/pm/page.tsx`)
  assert.match(source, /<PageHeader\n\s+breadcrumbs=\{\[\{ label: tRecord\("title"\), href: `\/\$\{locale\}\/maintenance` \}, \{ label: t\("pmTitle"\) \}\]\}\n\s+title=\{t\("pmTitle"\)\}\n\s+meta=\{<span>\{t\("pmSubtitle"\)\} \{t\("pmPlanCount", \{ count: allPlansCount \}\)\}<\/span>\}\n\s+back=\{<PageBackLink href=\{`\/\$\{locale\}\/maintenance`\} label=\{tCommon\("back"\)\} \/>\}/)
  assert.doesNotMatch(source, /<h1|title=\{<CalendarClock/, "no icon in the title (the CalendarClock title icon is gone)")
  assert.match(source, /const returnTo = listHref\(\{ page: query\.page \}\)/)
  assert.match(source, /<MaintenancePlanRowActions plan=\{plan\} locale=\{locale\} returnTo=\{returnTo\} canCreate=\{canCreate\} canEdit=\{canEdit\} openRecord=\{plan\.openRecord\} assetOut=\{plan\.due\.kind === "assetStatus"\} \/>/)
})

// Plan 2B-2 Task 15 (spec 2B §4.4.3, §5.4 row admin/data-quality, I12): the data-quality header and number strip. The
// rule cards stay as they are, and the labels of DataQualityRuleForm belong to 2C plan 4 (it adds severity there).
test("data quality: PageHeader with the reports link, one StatStrip for the three tinted SummaryCards, and the common words the review queue reads (spec 2B §5.4, I12)", () => {
  const source = read(`${D}admin/data-quality/page.tsx`)
  assert.match(source, /<div className="space-y-6">\n\s+<PageHeader\n\s+title=\{t\("title"\)\}\n\s+meta=\{t\("subtitle"\)\}\n\s+actions=\{\n\s+<Link href=\{`\/\$\{locale\}\/reports`\} className=\{buttonVariants\(\{ variant: "outline", size: "md" \}\)\}>/)
  // Group 12 plan 3 Task 2 (board AD-DataQuality): the StatStrip is gone; the tab ข้อมูลไม่ครบ and the distribution
  // summary carry its numbers (enabled rules, all rules, issues of the enabled rules).
  assert.ok(!source.includes("<StatStrip"), "the StatStrip is gone")
  assert.ok(source.includes('t("distributionSummary", { enabled: enabledCount, all: rules.length, total: issues.total })'))
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

// Group 2 plan 4 Task 3 (spec §10) replaces audit mobile fix D8's 8 columns: the decision, the plan, the badges and the
// evidence are in the review panel beside the list, so the table has four columns (after Task 5's tick column for an
// approver) and no pinned action column.
test("the findings desktop table has the four columns of spec §10 and no action column; the comparison keeps the D8 look", () => {
  const source = read(`${D}audit/findings/page.tsx`)
  const table = source.slice(source.indexOf("<DataTable framed={false}"), source.indexOf("</DataTable>"))
  const heads = [...table.matchAll(/<DataTableHead\b[^>]*>(.*?)<\/DataTableHead>/g)].map((match) => match[1])
  assert.deepEqual(heads.slice(-4), [`{t("findingTopic")}`, `{t("asset")}`, `{t("comparisonColumn")}`, `{t("roundShort")}`])
  assert.ok(heads.length <= 5, "at most the tick column before them")
  assert.match(table, /scrollHint=\{tCommon\("tableScrollHint"\)\}/, "the shared hint still shows while the table overflows")
  assert.match(table, /^<DataTable framed=\{false\} layout="fixed" minWidth=\{[^}]+\} /)
  assert.doesNotMatch(table, /sticky=|<RowActions\b|<AuditFindingReviewActions\b|buttonVariants\(|<FindingComparison\b/, "no action cell, no button-styled link and no inner box in a row")
  assert.doesNotMatch(table, /<DataTableCell[^>]*\b(?:min-)?w-\d+/, "the widths live in the colgroup only")

  const change = source.slice(source.indexOf("function FindingValueChange"), source.indexOf("function resolveFindingState"))
  assert.doesNotMatch(change, /\bborder\b|\brounded/, "the comparison has no box of its own")
  assert.match(change, /<ArrowRight aria-hidden="true"/)
  assert.match(change, /<span className="font-medium text-foreground">\{orNil\(actualValue\)\}<\/span>/, "the found value in medium weight")
  // The evidence list is the shared component (group 6 plan 2 Task 4).
  assert.doesNotMatch(readFileSync("src/components/audit/audit-finding-evidence-list.tsx", "utf8"), /compact/, "one evidence list, the panel's")

  const badges = source.slice(source.indexOf("const findingStatusBadges"), source.indexOf("return (\n    <div className=\"space-y-6\">"))
  assert.match(badges, /resolutionState === "pending_review" \? \[\]/, "the review badge only when the state does not say it already")
  assert.match(badges, /finding\.actionStatus === "not_required" \|\| resolutionState === "closed" \? \[\]/)
  assert.match(badges, /tone: RESOLUTION_STATE_TONES\[resolutionState\]/, "the resolution badge keeps its tones")
  assert.match(badges, /status: finding\.reviewStatus/)
  assert.match(badges, /status: finding\.actionStatus/)
})

// Plan 2B-4 Task 5 (spec 2B §4.4.5, §5.5, §4.6.3, bug §5.10 #7): the employee page on the page primitives. The shell
// already leaves room for the bottom navigation, so the page adds no pb-24 of its own. Group 7 plan 2 Task 3 rebuilt it
// to its board: the organization a FactStrip, the held assets, history and repairs the three DataTables.
test("the employee page builds on PageHeader, FactStrip, StatStrip and three DataTables, with no pb-24 of its own (spec 2B §5.5)", () => {
  const source = read(`${D}master-data/employees/[id]/page.tsx`)
  for (const part of ["<PageHeader", "<PageBackLink", "<FactStrip", "<StatStrip", "<DataTableHeader>", "<DataTableBody>", "<DataTableRow"]) {
    assert.ok(source.includes(part), `no ${part}`)
  }
  assert.equal(source.match(/<DataTable\b/g)?.length, 3, "the held assets, the handover history and the related repairs")
  assert.match(source, /return \(\n {4}<div className="space-y-6">\n {6}<PageHeader\n/)
  assert.doesNotMatch(source, /\bpb-24\b/)
  assert.match(source, /breadcrumbs=\{\[\n\s+\{ label: t\("title"\), href: returnToHref \},\n\s+\{ label: employee\.code, code: true \},\n\s+\]\}\n\s+title=\{employee\.fullNameTh\}/, "a record with a name: the h1 is the name, the code ends the trail (spec 2B §4.3.3 rule 6)")
  assert.match(source, /<span className="tag">\{employee\.code\}<\/span>/, "the code leads the meta row")
  assert.match(source, /back=\{<PageBackLink href=\{returnToHref\} label=\{tCommon\("back"\)\} \/>\}/)
  assert.match(source, /<Link href=\{editHref\} className=\{buttonVariants\(\{ variant: "outline", size: "md" \}\)\}>/)
  assert.match(source, /<StatusBadge label=\{row\.status\.nameTh\} tone=\{getAssetStateTone\(row\.status\.name\)\} \/>/, "bug §5.10 #7: the status badge takes the tone of the status")
  // Group 7 follow-ups Task 3 (G7F-R4): the foot splits the held assets by handover, the plain foot while none is held.
  assert.match(source, /key: "held",\n\s+label: tDetail\("heldStat"\),\n\s+value: formatCount\(data\.held\.total\),/)
  assert.match(source, /: tDetail\("heldStatFoot"\),\n\s+href: hrefs\.assets,/)
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
  // Group 8 plan 3 Task 3 (board MD-Supplier): one strip of four; the purchase total is the เอกสารจัดซื้อ foot.
  assert.equal(source.match(/<StatStrip\b/g)?.length, 1, "one strip of four")
  assert.match(source, /value: formatMoney\(figures\.repairCost\),\n\s+unit: tCommon\("baht"\)/)
  assert.match(source, /t\("detail\.purchaseAmountFoot", \{ amount: formatMoney\(figures\.purchaseAmount\) \}\)/)
  assert.match(source, /return \(\n {4}<div className="space-y-6">\n {6}<PageHeader\n/)
  assert.doesNotMatch(source, /\bpb-24\b/)
  assert.match(source, /breadcrumbs=\{\[\n\s+\{ label: t\("title"\), href: returnToHref \},\n\s+\{ label: supplier\.code, code: true \},\n\s+\]\}\n\s+title=\{supplier\.name\}/)
  assert.match(source, /back=\{<PageBackLink href=\{returnToHref\} label=\{tCommon\("back"\)\} \/>\}/)
  assert.match(source, /<Link href=\{editHref\} className=\{buttonVariants\(\{ size: "md" \}\)\}>/)
  // The price and cost say "(บาท)" in their heads (board MD-Supplier), so a cell holds the number only.
  assert.match(source, /\{asset\.purchasePrice == null \? <Nil \/> : formatMoney\(asset\.purchasePrice\)\}/)
  assert.match(source, /\{ticket\.repairCost == null \? <Nil \/> : formatMoney\(ticket\.repairCost\)\}/)
  assert.match(source, /totalAmount: tAsset\("purchaseDocumentAmountBaht"\),/)
  assert.doesNotMatch(source, /function (?:MetricCard|InfoRow)\b|<MetricCard\b|formatCurrency|\?\? 0\)\)|toLocaleString\(|"-"/)
})

// Plan 2B-4 Task 7 (spec 2B §5.5, §5.7, R-p): a supplier's purchase documents on DataTable. The count and money columns
// are right aligned in num cells; the unit sits in the money header (the page passes "ยอดรวม (บาท)"), so the cells hold
// the number only.
test("supplier purchase documents: DataTable with right-aligned count and money columns, formatCount, formatMoney and Nil (spec 2B §5.5, §5.7)", () => {
  const source = read(`${C}master-data/supplier-purchase-documents.tsx`)
  // Plan 2D-3: the table sits in the page's ContentPanel with no frame of its own, and an empty total is Nil (M32 a).
  assert.match(source, /<DataTable data-supplier-documents-desktop framed=\{false\} caption=\{labels\.caption\} className="hidden md:block">/)
  assert.match(source, /<DataTableHead align="right">\{labels\.linkedAssets\}<\/DataTableHead>/)
  assert.match(source, /<DataTableHead align="right">\{labels\.totalAmount\}<\/DataTableHead>/)
  // Group 8 plan 3 Task 3: an empty total reads "ยังไม่ระบุ" (board MD-Supplier), still never 0.00.
  assert.match(source, /<DataTableCell numeric className="text-muted-foreground">\{amount\(document\.totalAmount\)\}<\/DataTableCell>/)
  assert.match(source, /value == null \? <span className="text-faint-foreground">\{labels\.amountUnset\}<\/span> : formatMoney\(value\)/)
  assert.equal(source.match(/formatCount\(document\.linkedAssets\)/g)?.length, 2, "the table and the phone card")
  assert.equal(source.match(/orNil\(documentReferences\(document, typeLabel\)\)/g)?.length, 2, "the table and the phone card")
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
// create button into the header, after the export (the primary action last). Group 11 plan 3 task 3 (board US-Roles):
// the StatStrip is gone (its facts are in the chips and the warning, pinned in tests/admin-roles-board.test.ts), the
// matrix moved to its own tab (still a flush DataTable in its panel), and the list is a framed DataTable with a footer
// pagination that hides รายละเอียด below xl instead of a sticky action column, so 1024 needs no sideways scroll.
test("roles: PageHeader, the role list and the permission matrix on DataTable, with edit through RowActions (spec 2B §5.6)", () => {
  const source = read(`${D}admin/roles/page.tsx`)
  for (const part of ["<PageHeader", "<DataTableHeader>", "<DataTableBody>", "<TableEmptyRow colSpan={7}>", "<ClickableTableRow", "<DataTableRow", "<RowActions"]) {
    assert.ok(source.includes(part), `no ${part}`)
  }
  assert.match(source, /<div className="space-y-6">\n\s+<PageHeader\n\s+title=\{t\("title"\)\}\n\s+meta=\{t\("subtitle"\)\}/)
  assert.match(source, /<a href="\/api\/admin\/roles\/export" download className=\{buttonVariants\(\{ variant: "outline", size: "md" \}\)\}>/)
  assert.equal(source.match(/<ContentPanel divided flush className="overflow-hidden"/g)?.length, 1, "the matrix keeps its panel")
  assert.match(source, /<DataTable framed=\{false\} caption=\{t\("permissionMatrix"\)\} scrollHint=\{tCommon\("tableScrollHint"\)\}>/, "the matrix sits flush in its panel and scrolls sideways with the hint (B6)")
  assert.match(source, /<DataTable caption=\{t\("roleSummary"\)\} scrollHint=\{tCommon\("tableScrollHint"\)\} footer=\{pagination\}>/)
  assert.match(source, /next=\{\{ label: tCommon\("edit"\), href: editHref, icon: <Pencil aria-hidden="true" \/> \}\}\n\s+nextWidth="auto"\n\s+groups=\{\[\]\}\n\s+\/>/, "edit is the only command: no ⋯ (spec 2B §5.6)")
  assert.match(source, /menuLabel=\{tCommon\("moreActionsFor", \{ code: role\.name \}\)\}/)
  // The actions column is pinned again (group 11 plan 3 final review), as before task 3.
  assert.match(source, /<DataTableHead align="right" sticky="right" hideLabel>\{tCommon\("actions"\)\}<\/DataTableHead>/)
  assert.match(source, /<RoleInactiveWarning roles=\{inactiveWithUsers\}/, "inactive roles that still have users need action (R-d)")
  assert.match(source, /\{canCreate \? \(\n\s+<Link href=\{`\/\$\{locale\}\/admin\/roles\/new`\} className=\{buttonVariants\(\{ size: "md" \}\)\}>/, "M13: create is the header's primary md button")
  assert.doesNotMatch(source, /\bfixed bottom-|shadow-lg|\bColumnHeader\b|function RoleAuditCard\b|<thead\b|<th\b|toLocaleString\(|font-mono|"-"|>-<|<StatStrip\b/)
})

// Plan 2B-5 Task 2 (spec 2B §5.6 row admin/logs, §5.9.2 row 1, §6.5 row 9, B4): the system log pages for real (it
// stopped at the newest 100 entries), its quick filters are TabNav, its filter form uses the shared fields, and the
// table is a DataTable whose small table of changes inside <details> still opens.
// Group 12 plan 2 Task 3 (board AD-Logs): the filter form moved to log-filters-bar.tsx and the row to log-event-row.tsx;
// the table has five columns and the <details> became the row's arrow button (aria-expanded) over a detail row.
test("system log: real pages counted in the same timed Promise.all, TabNav quick filters, shared filter fields and a DataTable (spec 2B §5.6, §5.9.2 row 1)", () => {
  const source = [`${D}admin/logs/page.tsx`, "src/components/admin/logs/log-filters-bar.tsx", "src/components/admin/logs/log-event-row.tsx"].map(read).join("\n")
  for (const part of ["<PageHeader", "<FilterPanel>", '<form id={formId} role="search"', "<FilterFormActions", "<DataTable", "<DataTableHeader>", "<DataTableBody>", "<DataTableRow", "<TableEmptyRow colSpan={5}>", "<Pagination", "aria-expanded={open}"]) {
    assert.ok(source.includes(part), `no ${part}`)
  }
  assert.match(source, /<TabNav\n\s+aria-label=\{t\("quickFilters"\)\}/)
  assert.match(source, /const listPage = parseListPage\(\{ page: rawFilters\.page, pageSize: rawFilters\.pageSize \}\)/)
  assert.match(source, /const \{ skip, take \} = listPageWindow\(listPage\)/)
  assert.match(source, /await withPerformanceTiming\("admin-logs\.list-data", \(\) => Promise\.all\(\[\n\s+prisma\.systemLog\.findMany\(\{[\s\S]*?orderBy: \[\{ createdAt: "desc" \}, \{ id: "asc" \}\],\n\s+skip,\n\s+take,\n\s+\}\),\n\s+prisma\.systemLog\.count\(\{ where \}\),\n\s+\]\)\)/, "findMany and count in one timed Promise.all, the old order plus id")
  assert.doesNotMatch(source, /\btake: \d+/, "no fixed number of rows")
  assert.match(source, /^import \{ redirect \} from "next\/navigation"$/m)
  assert.match(source, /const lastPage = lastListPage\(total, listPage\.pageSize\)\n\s+if \(logs\.length === 0 && total > 0 && listPage\.page > lastPage\) \{\n\s+redirect\(/)
  // Group 11 plan 1 task 3: the quick filter's params also keep recordId before the page size is added.
  assert.match(source, /const params = new URLSearchParams\(query\)\n[\s\S]*?appendListPage\(params, \{ pageSize: listPage\.pageSize \}\)/, "a quick filter goes back to page 1 and keeps the page size")
  assert.match(source, /\{pageSize !== LIST_PAGE_SIZES\[0\] \? <input type="hidden" name="pageSize" value=\{pageSize\} \/> : null\}/, "the filter form keeps the page size")
  assert.match(source, /pageSize=\{listPage\.pageSize\}\n\s+recordId=\{filters\.recordId\}/, "the page hands the bar its page size")
  assert.match(source, /pageSizes=\{LIST_PAGE_SIZES\.map\(\(value\) => \(\{ value, href: listHref\(\{ pageSize: value \}\) \}\)\)\}/)
  assert.match(source, /hasFilters \? t\("emptyFiltered"\) : t\("empty"\)/)
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
// Group 12 plan 3 Task 4 (board AD-Storage): the dry-run StatStrip became the equation line and the filter chips, and
// the dry-run table became expandable StorageRow items (tests/storage-board.test.ts), so one StatStrip and two
// DataTables are left. The review list names the module and the asset instead of the raw reference id.
test("storage: PageHeader, one StatStrip and two DataTables that scroll sideways, with every module code as its label (spec 2B §5.6, §5.10 #6, #10)", () => {
  const source = read(`${D}admin/storage/page.tsx`)
  for (const part of ["<PageHeader", "<DataTableHeader>", "<DataTableBody>", "<DataTableRow", "<TableEmptyRow colSpan={4}>", "<EmptyNote>"]) {
    assert.ok(source.includes(part), `no ${part}`)
  }
  assert.equal(source.match(/<StatStrip\b/g)?.length, 1, "the summary tiles")
  assert.equal(source.match(/<DataTable framed=\{false\} caption=\{t\("(?:moduleBreakdown|largestFiles)"\)\} scrollHint=\{tCommon\("tableScrollHint"\)\}>/g)?.length, 2, "two tables in padded panels, flush, with the scroll hint (B6)")
  assert.match(source, /attention: reviewNeededCount > 0,/)
  assert.match(source, /\{moduleLabel\(item\.module\)\}\n\s+\{" · "\}\n\s+\{recordRef\(item\)\}/, "bug §5.10 #10: the review list names the module, not its code, then the record")
  // The raw reference id is only the fallback when no asset, batch, document or model names the record (group 12 plan 3 final review).
  assert.equal(source.match(/item\.referenceId\}<\/span>/g)?.length, 1)
  assert.match(source, /\{orNil\(item\.filePath\)\}/)
  assert.equal(source.match(/<StorageRow key=\{row\.key\} row=\{row\} canArchive=\{canArchiveStorageFiles\} \/>/g)?.length, 1)
  assert.doesNotMatch(source, /getTableShellClasses|getEmptyStateClasses|function SummaryCard\b|<thead\b|<th\b|<td colSpan|toLocaleString\(|"-"|\buppercase\b/)
})

// Plan 2B-5 Task 4 (spec 2B §5.6 row admin/approvals, §4.4.6, bug §5.10 #3, R-d, R-g): the approval inbox. The
// module chips are TabNav links with counts, the tinted SummaryCards are one StatStrip, and a row is one link whose
// action reads as words with an arrow, not as a button inside the link.
// Group 6 plan 2 Task 2 rebuilt the page as board AP (tests/approval-inbox-ui.test.ts pins the rest): the rows are
// ClickableTableRow, the phone cards whole links whose next step reads as words with an arrow, not a button.
test("approval inbox: PageHeader, one StatStrip, TabNav with counts, a DataTable queue and phone cards that are one link (spec 2B §5.6, §5.10 #3)", () => {
  const source = read(`${D}admin/approvals/page.tsx`)
  for (const part of ["<PageHeader", "<StatStrip", "<TabNav", "<DataTable", "<ClickableTableRow", "<ActionEmptyState", "<Pagination"]) {
    assert.ok(source.includes(part), `no ${part}`)
  }
  assert.match(source, /count: formatCount\(tabs\[tab\]\),/)
  assert.match(source, /current=\{query\.tab\}/)
  assert.match(source, /<span className="inline-flex items-center gap-0\.5 font-medium text-primary">\n\s+\{t\(nextStepKeys\[row\.key\]\)\}\n\s+<ChevronRight aria-hidden="true" className="size-4" \/>/, "bug §5.10 #3: no button look inside the card link")
  assert.match(read("src/components/approvals/approval-inbox-policy.tsx"), /<span className="tag">\{item\.permissionKey\}<\/span>/)
  assert.doesNotMatch(source, /function (?:FilterChip|SummaryCard|summaryClass)\b|toLocaleString\(|font-mono|"-"|<h1\b/)
})

// Plan 2B-5 Task 5 (spec 2B §5.6 row admin/approvals/history, §5.9.2 row 2, §4.5.2 #31, B2, B4): the decision
// history pages in the database (it stopped at the newest 150 rows and counted only those), its two filter rows are
// TabNav with full counts, the strip counts every decision, and the back button points left.
// Group 12 plan 2 Task 4 (board AD-ApprovalHistory): the strip is gone (the chips carry the numbers), the counts follow
// the actor and date filters (countWhere, tests/approval-history-board.test.ts), the rows are ApprovalDecisionRow, and
// the tab hrefs come from buildApprovalHistoryQuery so they keep the actor and the dates.
test("approval history: real pages and full counts from the database, two TabNav rows and a back link that points left (spec 2B §5.6, §5.9.2 row 2)", () => {
  const source = read(`${D}admin/approvals/history/page.tsx`)
  for (const part of ["<PageHeader", "<ContentPanel", "<DataTableFoot>", "<Pagination", "<ApprovalDecisionRow"]) {
    assert.ok(source.includes(part), `no ${part}`)
  }
  assert.doesNotMatch(source, /<StatStrip\b/)
  assert.match(source, /back=\{<PageBackLink href=\{`\/\$\{locale\}\/admin\/approvals`\} label=\{t\("backToInbox"\)\} \/>\}/, "B2: the back button is the left arrow, not FileCheck2")
  assert.match(source, /const listPage = parseListPage\(\{ page: query\.page, pageSize: query\.pageSize \}\)/)
  assert.match(source, /const allowedWhere = buildApprovalDecisionLogWhere\(\{ \.\.\.decisionAccess, module: "all", decision: "all" \}\)/)
  assert.match(source, /const where = buildApprovalDecisionLogWhere\(\{ \.\.\.decisionAccess, module: filters\.module, decision: filters\.decision, /)
  assert.match(source, /await withPerformanceTiming\("approval-history\.list-data", \(\) => Promise\.all\(\[\n\s+prisma\.systemLog\.findMany\(\{[\s\S]*?orderBy: \[\{ createdAt: "desc" \}, \{ id: "asc" \}\],\n\s+skip,\n\s+take,\n\s+\}\),\n\s+prisma\.systemLog\.count\(\{ where \}\),\n\s+prisma\.systemLog\.groupBy\(\{ by: \["module", "action"\], where: countWhere, _count: \{ _all: true \} \}\),/)
  assert.match(source, /const chipCounts = summarizeApprovalDecisionChipCounts\(decisionCounts, filters\.module, filters\.decision\)/, "the tab counts are full totals within the actor and dates (spec 2B §5.9.3, group 12 §5)")
  assert.doesNotMatch(source, /\btake: \d+|filterApprovalDecisionLogItems|getAllowedDecisionWhere/, "no fixed number of rows and no filter in JS")
  // Page group 12 plan 1 Task 1: no approval right redirects to the denied page, so notFound is no longer imported.
  assert.match(source, /^import \{ redirect \} from "next\/navigation"$/m)
  assert.match(source, /const lastPage = lastListPage\(total, listPage\.pageSize\)\n\s+if \(logs\.length === 0 && total > 0 && listPage\.page > lastPage\) \{\n\s+redirect\(/)
  assert.match(source, /const search = buildApprovalHistoryQuery\(next, page\)/)
  assert.match(source, /href: hrefFor\(\{ \.\.\.filters, \[param\]: option\.key \}, \{ pageSize \}\)/, "a tab goes back to page 1 and keeps the page size")
  assert.equal(source.match(/pageSize=\{listPage\.pageSize\}/g)?.length, 3, "both filter rows and the Pagination get the page size")
  assert.match(source, /<TabNav\n\s+aria-label=\{label\}/)
  assert.doesNotMatch(source, /\bFileCheck2\b|function (?:FilterChip|SummaryCard|summaryClass)\b|toLocaleString\(|<h1\b/)
})

// Plan 2B-5 Task 6 (spec 2B §4.4.6, §5.6 "หน้าสรุป" row readiness, R-d, R-p): the readiness header is PageHeader, the
// four tinted SummaryCards are one StatStrip, and the detected value of a check reads as a code. The check cards stay.
// Group 12 plan 1 Task 3 (board AD-Readiness) replaced the StatStrip with the filter chips, which carry the counts, and
// put the checked-at time in the header's meta row. The detected value is now Thai text from check.display, so it left
// the code font; the env names in แก้ที่ไหน take it instead (tests/readiness-presenter.test.ts).
test("readiness: PageHeader with the checked-at line, counts on the chips, env names as code (spec 2B §4.4.6, group 12 spec §6)", () => {
  const source = read(`${D}admin/readiness/page.tsx`)
  assert.match(source, /<div className="space-y-6">\n\s+<PageHeader\n\s+title=\{t\("title"\)\}\n\s+meta=\{\n\s+<>\n\s+<span>\{t\("subtitle"\)\}<\/span>\n\s+<span>\{t\("checkedAt", \{ time: checkedAt \}\)\}<\/span>/)
  assert.match(source, /const checkedAt = formatDateTime\(new Date\(\)\)/)
  assert.match(source, /<ReadinessFilterChips value=\{filter\} counts=\{summary\} hrefFor=\{hrefFor\} \/>/)
  assert.match(source, /<span key=\{name\} className="tag whitespace-normal break-all">\{name\}<\/span>/)
  assert.doesNotMatch(source, /<StatStrip\b|check\.value\b|<h1\b|function (?:SummaryCard|summaryClass)\b|toLocaleString\(|font-mono/)
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

// Plan 2B-5 Task 7 (spec 2B §5.6 row notifications, bug §5.10 #1, R-d, O17), rewritten to board NT by group 9 plan 3
// Task 2: the shared PageHeader, an EmptyNote per status tab and per empty digest, the delivered (legacy digest) rows'
// type in Thai words through the shared StatusBadge (an unknown type as it is), unread titles bold and the rest muted
// instead of fading, and the work-center link as an outline md button.
test("notifications: PageHeader, the shared StatusBadge, each delivered type in words and EmptyNotes (spec 2B §5.6, §5.10 #1; board NT)", () => {
  const source = read(`${D}notifications/page.tsx`)
  const digest = read("src/components/notifications/notification-digest-panel.tsx")
  const row = read("src/components/notifications/notification-topic-row.tsx")
  for (const part of ["<PageHeader", "<NotificationTopicRow", "<NotificationDigestPanel", "<EmptyNote padded>{t(`empty.${data.params.status}`)}</EmptyNote>"]) {
    assert.ok(source.includes(part), `no ${part}`)
  }
  assert.match(digest, /^import \{ StatusBadge \} from "@\/components\/ui\/status-badge"$/m)
  assert.match(digest, /<StatusBadge label=\{t\.has\(`type_\$\{entry\.type\}`\) \? t\(`type_\$\{entry\.type\}`\) : entry\.type\} tone=\{entry\.type\} \/>/, "bug §5.10 #1: the type in words, an unknown type as it is")
  assert.match(digest, /<EmptyNote>\{t\("digest\.empty"\)\}<\/EmptyNote>/)
  assert.match(row, /row\.state === "unread" \? "font-semibold text-foreground" : "text-muted-foreground"/)
  assert.match(row, /\{formatCount\(row\.count\)\}/)
  assert.match(source, /<Link href=\{`\/\$\{locale\}\/work-center`\} className=\{buttonVariants\(\{ variant: "outline", size: "md" \}\)\}>/)
  for (const file of [source, digest, row]) {
    assert.doesNotMatch(file, /function (?:SummaryCard|StatusBadge|notificationToneClass|summaryClass)|opacity-70|toLocaleString\(|border-dashed|<h1/)
  }
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

// Plan 2B-5 Task 15 (spec 2B I10, §4.4.6, §5.6), rebuilt on board WC (group 9 plan 2 Task 2): "งานทั้งหมด / งานของฉัน"
// changes the URL, so it stays links named by workCenter.viewNavigation with aria-current (R-g), drawn in Segmented's
// look like RecordStatusSegmented, never the button Segmented. The queue links are a TabNav. The view=mine notice stays.
test("the work center: PageHeader, the view switch as links, the queues on TabNav, the view=mine notice (spec 2B I10, group 9 §4)", () => {
  const source = read(`${D}work-center/page.tsx`)
  const tabs = read("src/components/work-center/work-center-tabs.tsx")
  assert.match(source, /<PageHeader\n\s+title=\{t\("title"\)\}\n\s+meta=\{t\("subtitle"\)\}/)
  assert.match(tabs, /<nav aria-label=\{t\("viewNavigation"\)\} data-slot="work-center-view-switch"/)
  assert.match(tabs, /aria-current=\{selected \? "page" : undefined\}/)
  assert.match(tabs, /\{view === "all" \? t\("allWork"\) : t\("myWork"\)\}/)
  assert.match(source, /<Notice tone="warning">\{t\("myWorkUnavailable"\)\}<\/Notice>/, "the sentence under the switch stays (I10), as a warning Notice since 2D-2 (D7)")
  assert.equal(tabs.match(/<TabNav\b/g)?.length, 1, "the queue links")
  assert.match(tabs, /<TabNav\n\s+aria-label=\{t\("focusNavigation"\)\}\n\s+current=\{params\.panel\}/)
  assert.doesNotMatch(source + tabs, /<h1\b|toLocaleString\(|<Segmented\b|"use client"/)
  for (const locale of ["th", "en"] as const) {
    const messages = JSON.parse(readFileSync(`messages/${locale}.json`, "utf8")) as { workCenter: Record<string, unknown> }
    assert.equal(typeof messages.workCenter.viewNavigation, "string", `${locale}: workCenter.viewNavigation`)
  }
})

// Plan 2B-5 Task 17 (spec 2B §5.14, §9.10 #3, I10, I16): guard LN1 counts only aria-current="page" set by hand, so it
// never saw the link rows that had no aria-current at all. The four of plan 2B-5 are named here: the log quick
// filters, the approval inbox chips, the history filter groups and the work-center switch are TabNav.
test("plan 2B-5: the link rows guard LN1 cannot see are TabNav (spec 2B §5.14, §9.10 #3)", () => {
  for (const path of [`${D}admin/logs/page.tsx`, `${D}admin/approvals/page.tsx`, `${D}admin/approvals/history/page.tsx`, "src/components/work-center/work-center-tabs.tsx"]) {
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
