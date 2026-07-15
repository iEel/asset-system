import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import test from "node:test"

const page = readFileSync("src/app/[locale]/(dashboard)/reports/page.tsx", "utf8")
const filterPanel = readFileSync("src/components/reports/report-filter-panel.tsx", "utf8")
const overviewView = readFileSync("src/components/reports/reports-overview-view.tsx", "utf8")
const accountingView = readFileSync("src/components/reports/reports-accounting-view.tsx", "utf8")
const operationsView = readFileSync("src/components/reports/reports-operations-view.tsx", "utf8")
const catalogView = readFileSync("src/components/reports/reports-catalog-view.tsx", "utf8")
const responsiveList = readFileSync("src/components/reports/responsive-report-list.tsx", "utf8")

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

test("wide report datasets have mutually exclusive table and mobile list hooks", () => {
  assert.match(responsiveList, /data-report-desktop-table/)
  assert.match(responsiveList, /hidden md:block/)
  assert.match(responsiveList, /data-report-mobile-list/)
  assert.match(responsiveList, /md:hidden/)
  assert.match(responsiveList, /<th/)
  assert.match(responsiveList, /<dl/)

  assert.equal(overviewView.match(/<ResponsiveReportList/g)?.length, 1)
  assert.equal(accountingView.match(/<ResponsiveReportList/g)?.length, 2)
  assert.equal(operationsView.match(/<ResponsiveReportList/g)?.length, 1)
})

test("mobile report cards use two labelled columns with optional full-width fields", () => {
  assert.match(responsiveList, /mobileClassName\?: string/)
  assert.match(responsiveList, /<dl className="[^"]*grid-cols-2[^"]*">/)
  assert.match(responsiveList, /cn\("min-w-0", column\.mobileClassName\)/)
})

test("wide report identity fields span both mobile columns", () => {
  assert.equal(overviewView.match(/mobileClassName: "col-span-2"/g)?.length, 2)
  assert.equal(accountingView.match(/mobileClassName: "col-span-2"/g)?.length, 2)

  const crossScopePreview = operationsView.slice(
    operationsView.indexOf("function CrossScopePreviewTable"),
    operationsView.indexOf("function getCrossScopeFlagLabels"),
  )
  assert.match(crossScopePreview, /key: "asset"[\s\S]*?mobileClassName: "col-span-2"/)
})

test("operations cross-scope mobile asset links keep a 44px touch target", () => {
  const crossScopePreview = operationsView.slice(
    operationsView.indexOf("function CrossScopePreviewTable"),
    operationsView.indexOf("function getCrossScopeFlagLabels"),
  )

  assert.match(
    crossScopePreview,
    /className="flex min-h-11 w-full[^"]*md:inline-flex[^"]*md:min-h-0[^"]*md:w-auto"/,
  )
})

test("operations exposes exact actionable drilldowns from the same compatible filter base", () => {
  for (const filter of ["responsibility", "serial", "photo", "warranty"]) {
    assert.ok(operationsView.includes(`dataQuality: "${filter}"`))
  }
  assert.match(operationsView, /activity: "idle_180d"/)
  assert.match(operationsView, /buildAssetQueryString\(filters,/)
  assert.match(operationsView, /min-h-11/)

  assert.match(page, /const operationsQualityFilters = parseAssetListParams\(\{ \.\.\.filters, dataQuality: "", activity: "", page: 1 \}\)/)
  assert.match(page, /const operationsQualityWhere = await applyAssetCrossScopeFilter\(buildAssetWhere\(operationsQualityFilters\), operationsQualityFilters\.crossScope\)/)
  assert.match(page, /filters=\{operationsQualityFilters\}/)
  assert.ok((page.match(/operationsQualityWhere/g)?.length ?? 0) >= 6)
})

test("cross-scope cards and preview share the drilldown filter overrides", () => {
  assert.match(page, /const crossScopeFilters = parseAssetListParams\(\{ \.\.\.filters, dataQuality: "", statusId: "", page: 1 \}\)/)
  assert.match(page, /buildAssetCrossScopeSummary\(buildAssetWhere\(crossScopeFilters\), 8\)/)
  assert.ok((page.match(/buildAssetQueryString\(crossScopeFilters,/g)?.length ?? 0) >= 5)
})
