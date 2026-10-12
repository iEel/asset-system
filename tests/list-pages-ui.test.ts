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

// B4 (spec 2B §5.9): the lists that now page on the server. Plans 2B-2 and 2B-5 add theirs.
const B4_LISTS = [`${D}master-data/departments/page.tsx`]

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
