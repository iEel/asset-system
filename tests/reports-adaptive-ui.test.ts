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

test("applying visible filters preserves supported URL-only report scopes", () => {
  for (const key of ["brandId", "modelId", "custodianId", "supplierId", "dataQuality", "crossScope", "activity"]) {
    assert.match(filterPanel, new RegExp(`name="${key}" value=\\{filters\\.${key}\\}`))
  }
})

test("report chips localize data-quality and cross-scope values", () => {
  assert.match(page, /const dataQualityFilterLabels/)
  assert.match(page, /responsibility: t\("missingCustodian"\)/)
  assert.match(page, /serial: t\("missingSerial"\)/)
  assert.match(page, /photo: t\("missingPhoto"\)/)
  assert.match(page, /department: t\("department"\)/)
  assert.match(page, /purchase: tAsset\("dataQualityPurchase"\)/)
  assert.match(page, /warranty: t\("warrantyExpiring"\)/)
  assert.match(page, /const crossScopeFilterLabels/)
  assert.match(page, /custodian_company: t\("crossScopeCustodianCompany"\)/)
  assert.match(page, /custodian_branch: t\("crossScopeCustodianBranch"\)/)
  assert.match(page, /location_branch: t\("crossScopeLocationBranch"\)/)
  assert.match(page, /dataQuality: dataQualityFilterLabels\[filters\.dataQuality\]/)
  assert.match(page, /crossScope: crossScopeFilterLabels\[filters\.crossScope\]/)
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
  assert.match(responsiveList, /<DataTableHead\b/)
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

test("operations data-quality asset tags keep a 44px mobile touch target", () => {
  const dataQualityPreview = operationsView.slice(
    operationsView.indexOf("dataQuality.rows.map"),
    operationsView.indexOf("function CrossScopePreviewTable"),
  )

  assert.match(
    dataQualityPreview,
    /<Link href=\{`\/\$\{locale\}\/assets\/\$\{asset\.id\}`\} className="inline-flex min-h-11 items-center font-semibold[^"]*md:min-h-0">/,
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

// Plan 2B-5 Task 11 (spec 2B §5.6 row reports, §3.4, B3): from md the wide report lists are the shared DataTable with
// no frame of its own (the panel around it is the frame), a caption, white 13px heads in sentence case and numbers on
// the right; an empty list is one EmptyNote line. This file reads the sources raw (CRLF): no line breaks here.
test("wide report lists render the shared DataTable from md and one EmptyNote line when empty (spec 2B §5.6)", () => {
  assert.match(responsiveList, /<DataTable data-report-desktop-table framed=\{false\} caption=\{caption\} className="hidden md:block">/)
  assert.match(responsiveList, /<DataTableHead key=\{column\.key\} align=\{column\.numeric \? "right" : "left"\}>/)
  assert.match(responsiveList, /<DataTableCell key=\{column\.key\} numeric=\{column\.numeric\} className=\{column\.className\}>/)
  assert.match(responsiveList, /return <EmptyNote padded>\{emptyLabel\}<\/EmptyNote>/)
  assert.doesNotMatch(responsiveList, /<table\b|<thead\b|<th\b|<td\b|uppercase|bg-muted/)
})

// Plan 2B-5 Task 12 (spec 2B §5.6, §5.1, R-p): the overview counts go through formatCount with tabular figures, the
// asset code is a tag, the preview table is named by its panel title, and an empty breakdown is one EmptyNote line.
test("the report overview formats its counts and codes and names its preview table (spec 2B §5.6)", () => {
  assert.match(overviewView, /caption=\{labels\.previewTitle\}/)
  assert.match(overviewView, /<span className="tag font-medium">\{asset\.assetTag\}<\/span>/)
  assert.match(overviewView, /<span className="font-semibold text-foreground num">\{formatCount\(row\.count\)\}<\/span>/)
  assert.match(overviewView, /<EmptyNote>\{emptyLabel\}<\/EmptyNote>/)
  assert.doesNotMatch(overviewView, /toLocaleString/)
})

// Plan 2B-5 Task 12 (spec 2B §5.6, R-d): the catalog's one number is a StatStrip cell, at most 384px wide from sm (the
// old card took half the row), and its count goes through formatCount.
test("the report catalog shows its item count on StatStrip (spec 2B §5.6, R-d)", () => {
  assert.match(catalogView, /<StatStrip className="sm:max-w-sm" items=\{\[\{ key: "catalogItems", label: labels\.catalogItems, value: formatCount\(reportCount\) \}\]\} \/>/)
  assert.doesNotMatch(catalogView, /MetricCard|toLocaleString/)
})

// Plan 2B-5 Task 12 (spec 2B §5.6, §5.1, R-d, R-p): the four data-quality counts and the four cross-scope counts are
// linked StatStrip cells (each still opens the register with its filter), the idle count is a metric number, the codes
// are tags and the counts go through formatCount. The idle box stays a link (tests/report-idle-activity.test.ts).
test("report operations put the data-quality and cross-scope counts on linked StatStrips (spec 2B §5.6, R-d)", () => {
  assert.match(operationsView, /<StatStrip items=\{dataQualityCards\.map\(\(card\) => \(\{ key: card\.key, label: card\.label, value: formatCount\(card\.value\), href: card\.href \}\)\)\} \/>/)
  assert.match(operationsView, /<StatStrip items=\{crossScope\.cards\.map\(\(card\) => \(\{ key: card\.key, label: card\.label, value: formatCount\(card\.value\), href: card\.href \}\)\)\} \/>/)
  assert.match(operationsView, /caption=\{labels\.crossScopePreviewTitle\}/)
  assert.equal(operationsView.match(/<span className="tag font-medium">\{asset\.assetTag\}<\/span>/g)?.length, 2)
  assert.match(operationsView, /<div className="mt-2 text-metric num text-foreground">\{formatCount\(insights\.idleAssetsCount\)\}<\/div>/)
  assert.doesNotMatch(operationsView, /MetricCard|toLocaleString|text-2xl font-bold/)
})

// Plan 2B-5 Task 12 (spec 2B §5.6, §5.7, R-d): the ten accounting cards are two StatStrips, money in formatMoney with
// "บาท" as the unit, never more than two tiles a row; the two tables put "(บาท)" in their money heads, numbers on the
// right, and an unknown price or ratio is Nil. The page hands the view common.baht.
test("report accounting puts its totals on StatStrip and its money through formatMoney (spec 2B §5.6, §5.7, R-d)", () => {
  assert.equal(accountingView.match(/<StatStrip\b/g)?.length, 2)
  assert.equal(accountingView.match(/className=\{moneyStripClasses\}/g)?.length, 2)
  assert.match(accountingView, /const moneyStripClasses = "max-sm:grid-cols-1 lg:grid-flow-row lg:grid-cols-2 lg:grid-rows-none"/)
  assert.equal(accountingView.match(/unit: labels\.baht \}/g)?.length, 5)
  assert.match(accountingView, /repairCost: moneyHead\(labels\.repairCost, labels\.baht\)/)
  assert.match(accountingView, /render: \(asset\) => orNil\(formatMoney\(asset\.purchasePrice\)\)/)
  assert.equal(accountingView.match(/numeric: true/g)?.length, 9)
  assert.equal(accountingView.match(/caption=\{title\}/g)?.length, 2)
  assert.doesNotMatch(accountingView, /MetricCard|formatCurrency|toLocaleString|"-"/)
  assert.match(page, /baht: tCommon\("baht"\)/)
})
