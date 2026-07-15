import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import test from "node:test"

const page = readFileSync("src/app/[locale]/(dashboard)/reports/page.tsx", "utf8")
const filterPanel = readFileSync("src/components/reports/report-filter-panel.tsx", "utf8")
const overviewView = readFileSync("src/components/reports/reports-overview-view.tsx", "utf8")
const accountingView = readFileSync("src/components/reports/reports-accounting-view.tsx", "utf8")
const operationsView = readFileSync("src/components/reports/reports-operations-view.tsx", "utf8")
const catalogView = readFileSync("src/components/reports/reports-catalog-view.tsx", "utf8")

test("reports renders the adaptive shell before one active view", () => {
  const order = ["data-report-tabs", "data-report-filters", "data-report-active-filters", "data-report-shared-metrics", "data-report-view-content"]
  const indexes = order.map((token) => page.indexOf(token))
  assert.ok(indexes.every((index) => index >= 0))
  assert.deepEqual(indexes, [...indexes].sort((a, b) => a - b))
  assert.match(page, /parseReportView/)
  assert.match(page, /switch \(activeView\)/)
})

test("filter form keeps view state and uses adaptive columns", () => {
  assert.match(filterPanel, /name="view" value=\{activeView\}/)
  assert.match(filterPanel, /grid-cols-1/)
  assert.match(filterPanel, /md:grid-cols-2/)
  assert.match(filterPanel, /xl:grid-cols-3/)
})

test("filter option labels come from complete lookup collections without id fallbacks", () => {
  const start = page.indexOf("const filterOptions")
  const end = page.indexOf("const viewLabels")
  const options = page.slice(start, end)

  assert.match(options, /companies: filterCompanies\.map/)
  assert.match(options, /branches: filterBranches\.map/)
  assert.match(options, /categories: filterCategories\.map/)
  assert.match(options, /statuses: filterStatuses\.map/)
  assert.match(options, /label: `\$\{company\.code\} - \$\{company\.nameTh\}`/)
  assert.match(options, /label: `\$\{branch\.company\.code\} \/ \$\{branch\.code\} - \$\{branch\.name\}`/)
  assert.match(options, /label: `\$\{category\.code\} - \$\{category\.name\}`/)
  assert.match(options, /label: status\.nameTh/)
  assert.doesNotMatch(options, /Map|get\(|\?\? .*\.id/)
})

test("view empty states distinguish zero matching assets from empty specialized data", () => {
  for (const source of [overviewView, accountingView, operationsView]) {
    assert.match(source, /hasMatchingAssets: boolean/)
    assert.match(source, /selectReportEmptyCopy/)
  }

  assert.equal(page.match(/hasMatchingAssets=\{totalAssets > 0\}/g)?.length, 3)
})

test("catalog and recurring exports use stable non-localized row keys", () => {
  assert.match(catalogView, /ReportRecurringExport = \{\s+key: string/)
  assert.match(catalogView, /ReportCatalogRow = \{\s+key: string/)
  assert.equal(catalogView.match(/key=\{report\.key\}/g)?.length, 2)
  assert.doesNotMatch(catalogView, /key=\{report\.(name|label)\}/)
})
