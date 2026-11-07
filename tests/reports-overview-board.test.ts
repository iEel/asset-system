import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import test from "node:test"

// Group 10 plan 1 Task 2 (spec §3, §4, §7; boards RP-Overview and RP-Phone): the reports header's export caption, the
// collapsible filter bar, the overview's strip that adds up, six group tables with register links and ดูทั้งหมด, the
// breakdown section, the five-column preview and the phone parts, plus the features the boards omit and we keep (§8).
// Sources are read with CRLF folded to LF, so the pins hold on a Windows checkout.

const read = (path: string) => readFileSync(path, "utf8").replace(/\r\n/g, "\n")
const page = read("src/app/[locale]/(dashboard)/reports/page.tsx")
const filterBar = read("src/components/reports/report-filter-panel.tsx")
const overview = read("src/components/reports/reports-overview-view.tsx")
const workbook = read("src/app/api/reports/assets-overview/export/route.ts")
const tabs = read("src/components/reports/report-view-tabs.tsx")
const th = JSON.parse(read("messages/th.json")) as { reportsPage: Record<string, string> }
const tr = th.reportsPage

test("the header keeps both exports with their permissions and says what they export", () => {
  assert.match(page, /canAssetExport \? \(\n\s+<a href=\{"\/api\/assets\/export\?" \+ exportQuery\} download/)
  assert.match(page, /canReportExport \? \(\n\s+<a href=\{"\/api\/reports\/assets-overview\/export\?" \+ exportQuery\} download/)
  assert.match(page, /<p data-report-export-caption className="[^"]*">\{exportCaption\}<\/p>/)
  assert.match(page, /const filterSummary = hasActiveFilters \? activeFilters\.map\(\(chip\) => chip\.label\)\.join\(" · "\) : t\("noFilters"\)/)
  assert.match(page, /t\("exportCaption", \{ count: totalAssets, filters: filterSummary \}\)/)
  assert.match(page, /t\("exportCaptionNoFilters", \{ count: totalAssets \}\)/)
  assert.equal(tr.exportCaption, "ส่งออก {count, number} รายการ · ตัวกรอง: {filters}")
  assert.equal(tr.exportCaptionNoFilters, "ส่งออก {count, number} รายการ · ไม่มีตัวกรอง")
})

test("the filter bar is a details open on a first visit or a field filter, with more filters nested and ใช้ตัวกรอง", () => {
  assert.match(filterBar, /open=\{!hasActiveFilters \|\| fieldFilterSet\}/)
  assert.match(filterBar, /const moreFilterSet = Boolean\(filters\.categoryId \|\| filters\.conditionId \|\| filters\.ownershipType\)/)
  assert.match(filterBar, /<details data-report-more-filters open=\{moreFilterSet\}/)
  // ค้นหา, บริษัท, สาขา, สถานะ before the nested details; หมวดหมู่, สภาพ, ประเภทการถือครอง inside it.
  const more = filterBar.indexOf("<details data-report-more-filters")
  for (const name of ["search", "companyId", "branchId", "statusId"]) assert.ok(filterBar.indexOf(`name="${name}"`) < more, name)
  for (const name of ["categoryId", "conditionId", "ownershipType"]) assert.ok(filterBar.indexOf(`name="${name}"`) > more, name)
  assert.match(filterBar, /<span className="group-open\/filters:hidden">\{labels\.show\}<\/span>/)
  assert.match(filterBar, /<span className="hidden group-open\/filters:inline">\{labels\.hide\}<\/span>/)
  assert.match(filterBar, /submitLabel=\{labels\.apply\}/)
  assert.match(filterBar, /<p data-report-filter-note className="[^"]*">\{labels\.moreLine\}<\/p>/)
  assert.equal(tr.filterTitle, "ตัวกรองรายงาน")
  assert.equal(tr.hideFilters, "ซ่อนตัวกรอง")
  assert.equal(tr.moreFilters, "ตัวกรองเพิ่มเติม")
  assert.equal(tr.applyFilters, "ใช้ตัวกรอง")
  assert.equal(tr.moreFiltersLine, "เพิ่มเติม: {fields} · แก้ค่าแล้วกด \"ใช้ตัวกรอง\" ตัวเลขและไฟล์จึงเปลี่ยน")
  assert.match(page, /moreLine: t\("moreFiltersLine", \{ fields: \[t\("category"\), t\("condition"\), tAsset\("ownershipType"\)\]\.join\(" · "\) \}\)/)
})

test("the filter bar keeps the URL-only filters as hidden inputs and the overview params while on the overview", () => {
  assert.match(filterBar, /<input type="hidden" name="view" value=\{activeView\} \/>/)
  for (const key of ["brandId", "modelId", "custodianId", "supplierId", "dataQuality", "crossScope", "activity"]) {
    assert.match(filterBar, new RegExp(`\\{filters\\.${key} \\? <input type="hidden" name="${key}" value=\\{filters\\.${key}\\} /> : null\\}`), key)
  }
  assert.match(filterBar, /\{viewParams\.map\(\(\[name, value\]\) => <input key=\{name\} type="hidden" name=\{name\} value=\{value\} \/>\)\}/)
  assert.match(page, /const overviewViewParams: Array<\[string, string\]> = activeView === "overview"/)
  assert.match(page, /viewParams=\{overviewViewParams\}/)
  // Chips (company clears branch, in buildReportActiveFilters) and the overview tab carry the same params.
  assert.match(page, /\.map\(\(chip\) => \(overviewViewQuery \? \{ \.\.\.chip, href: `\$\{chip\.href\}&\$\{overviewViewQuery\}` \} : chip\)\)/)
  assert.match(page, /currentViewQuery=\{overviewViewQuery \|\| undefined\}/)
  assert.match(tabs, /view === activeView && currentViewQuery \? `&\$\{currentViewQuery\}` : ""/)
})

test("the strip adds up: total = นอกขั้นตัดจำหน่าย + รอตัดจำหน่าย + ตัดจำหน่ายแล้ว, with list links and the retired foot", () => {
  const strip = overview.slice(overview.indexOf("data-report-overview-strip"), overview.indexOf("data-report-export-card"))
  const order = ['key: "totalAssets"', 'key: "active",\n                operator: "="', 'key: "pendingDisposal",\n                operator: "+"', 'key: "writtenOff",\n                operator: "+"']
  const at = order.map((token) => strip.indexOf(token))
  assert.ok(at.every((index) => index >= 0), String(at))
  assert.deepEqual(at, [...at].sort((a, b) => a - b))
  assert.match(strip, /viewListLink\(statusListHref\(strip\.statusIds\.pendingDisposal\), t\("stripViewList"\)\)/)
  assert.match(strip, /viewListLink\(statusListHref\(strip\.statusIds\.disposed\), t\("stripViewList"\)\)/)
  assert.match(strip, /strip\.retired > 0 && retiredHref \?/)
  assert.match(strip, /t\("stripRetiredFoot", \{ count: strip\.retired \}\)/)
  assert.match(strip, /<p data-report-strip-equation className="[^"]*lg:sr-only">\{equation\}<\/p>/)
  assert.match(strip, /key: "purchaseTotal",\n\s+label: t\("purchaseTotal"\)/)
  assert.match(strip, /t\("purchaseTotalFoot", \{ count: strip\.total \}\)/)
  assert.match(strip, /\["view", "accounting"\]/, "ดูแท็บบัญชี opens the accounting tab with the filters")
  assert.equal(tr.purchaseTotalFoot, "ผลรวมราคาซื้อของ {count, number} รายการ ไม่ใช่มูลค่าตามบัญชี")
  assert.equal(tr.stripActive, "นอกขั้นตัดจำหน่าย")
  // The operator is a picture in StatStrip; the sum in words is the equation line.
  assert.match(read("src/components/ui/stat-strip.tsx"), /\{item\.operator \? \(\n\s+<span aria-hidden="true"/)
  // The overview has its own strip; the other views keep the two shared numbers.
  assert.match(page, /\{activeView !== "overview" \? \(\n\s+<div data-report-shared-metrics>/)
})

test("six group tables: sorted rows that link to the register, others, unassigned, the total and ดูทั้งหมด", () => {
  assert.match(overview, /\{reportBreakdownDimensions\.map\(\(dimension\) => \(\n\s+<BreakdownPanel/)
  assert.match(overview, /className="hidden gap-4 md:grid md:grid-cols-1 lg:grid-cols-2 xl:grid-cols-3"/)
  assert.match(overview, /<Link href=\{breakdownRowHref\(locale, dimension, row\.key, base\)\} className=\{rowLinkClasses\}>/)
  assert.match(overview, /t\("breakdownOthers", \{ count: table\.others\.groups, dimension \}\)/)
  assert.match(overview, /dimension === "department" \? \(\n\s+<Link href=\{breakdownRowHref\(locale, dimension, null, base\)\} className=\{rowLinkClasses\}>/)
  assert.match(overview, /<DataTableRow data-report-breakdown-total>/)
  assert.match(overview, /t\("breakdownDepartmentEquation", \{/)
  assert.match(overview, /t\("breakdownViewAll", \{ count: table\.groupCount, dimension \}\)/)
  assert.match(overview, /viewAllHref=\{reportHref\(\{ breakdown: dimension, bq: null \}\)\}/)
  for (const head of ["breakdownColName", "breakdownColCount", "breakdownColShare"]) assert.ok(overview.includes(`t("${head}")`), head)
  assert.equal(tr.breakdownHelp, "แยกกลุ่ม 8 อันดับแรก เรียงจากมากไปน้อย · กดแถวเพื่อเปิดทะเบียนทรัพย์สินที่กรองตามกลุ่มนั้น พร้อมตัวกรองด้านบน")
  assert.equal(tr.breakdownDepartmentEquation, "= {limit, number} แผนกแรก {top} + อื่น ๆ {others} + ยังไม่ระบุ {unassigned}")
  // An empty table is today's empty copy (selectReportEmptyCopy).
  assert.match(overview, /const emptyLabel = selectReportEmptyCopy\(\{ hasActiveFilters, hasMatchingAssets, \.\.\.emptyCopy \}\)/)
})

test("breakdown= replaces the six tables with the full list, its bq search and a way back", () => {
  assert.match(overview, /\{data\.full \? \(\n\s+<BreakdownFullList/)
  assert.match(overview, /backHref=\{reportHref\(\{ breakdown: null, bq: null \}\)\}/)
  assert.match(overview, /<PageBackLink href=\{backHref\} label=\{t\("backToOverview"\)\} \/>/)
  assert.match(overview, /<SearchField name="bq" defaultValue=\{bq\} placeholder=\{t\("breakdownSearchPlaceholder"\)\} \/>/)
  assert.match(overview, /<Link href=\{breakdownRowHref\(locale, dimension, group\.key, base\)\} className=\{rowLinkClasses\}>/)
  assert.match(page, /const breakdown = parseReportBreakdownDimension\(rawSearchParams\.breakdown\)/)
  assert.match(page, /const phoneGroup = parseReportPhoneGroup\(rawSearchParams\.group\)/)
  assert.equal(tr.backToOverview, "กลับภาพรวม")
})

test("the preview: ten newest in five columns with the register link", () => {
  const preview = overview.slice(overview.indexOf("<DataTable data-report-preview-table"), overview.indexOf("<ul data-report-preview-cards"))
  const heads = ['t("previewColAsset")', 't("category")', 't("previewColBranchDepartment")', 't("previewColHolderOwnership")', 't("status")']
  const at = heads.map((head) => preview.indexOf(head))
  assert.ok(at.every((index) => index >= 0), String(at))
  assert.deepEqual(at, [...at].sort((a, b) => a - b))
  assert.equal(preview.match(/<DataTableHead>/g)?.length, 5)
  assert.match(overview, /<StatusBadge label=\{asset\.statusLabel\} status=\{asset\.statusName\} \/>/)
  assert.match(overview, /t\("previewLatest", \{ count: data\.preview\.length, total: strip\.total \}\)/)
  assert.match(overview, /buildExactAssetRegisterHref\(locale, Object\.fromEntries\(base\)\)/)
  assert.match(overview, /title=\{asset\.name\}/)
  assert.equal(tr.previewShortTitle, "ตัวอย่างก่อนส่งออก")
  assert.equal(tr.viewAllInRegister, "ดูทั้งหมดในทะเบียนทรัพย์สิน")
})

test("phones: the export card, group buttons with one table, three preview cards and the filter button", () => {
  assert.match(overview, /<section data-report-export-card [^>]*className="[^"]*md:hidden">/)
  assert.match(overview, /exports\.overviewHref \? \(\n\s+<a href=\{exports\.overviewHref\} download/)
  assert.match(overview, /exports\.registerHref \? \(\n\s+<a href=\{exports\.registerHref\} download/)
  assert.match(page, /registerHref: canAssetExport \? "\/api\/assets\/export\?" \+ exportQuery : undefined/)
  assert.match(page, /overviewHref: canReportExport \? "\/api\/reports\/assets-overview\/export\?" \+ exportQuery : undefined/)
  // The header's exports step aside on the overview below md, where the card stands in.
  assert.match(page, /activeView === "overview" && "max-md:hidden"/)
  assert.match(overview, /<div className="space-y-3 md:hidden" data-report-phone-groups>/)
  assert.match(overview, /href=\{reportHref\(\{ group: dimension === "status" \? null : dimension \}\)\}/)
  assert.match(overview, /<ul className="flex flex-wrap gap-2">/)
  assert.match(overview, /table=\{data\.tables\[phoneGroup\]\}/)
  assert.match(overview, /const PREVIEW_PHONE_ROWS = 3/)
  assert.match(page, /<ReportFilterToggle\n\s+targetId=\{REPORT_FILTER_BAR_ID\}/)
  assert.match(page, /t\("filterButton", \{ count: activeFilters\.length \}\)/)
  assert.equal(tr.filterButton, "ตัวกรอง ({count, number})")
})

test("the overview workbook counts the assets with no department as ยังไม่ระบุแผนก", () => {
  assert.match(workbook, /prisma\.asset\.groupBy\(\{ by: \["departmentId"\], where: assetWhere, _count: \{ _all: true \} \}\)/)
  assert.doesNotMatch(workbook, /departmentId: \{ not: null \}/)
  assert.match(workbook, /const UNASSIGNED_DEPARTMENT_LABEL = "ยังไม่ระบุแผนก"/)
  assert.match(workbook, /item\.departmentId === null \? UNASSIGNED_DEPARTMENT_LABEL : departmentMap\.get\(item\.departmentId\)/)
})

test("what the boards omit stays: the view content hook, the tab label, timing labels and the empty copy", () => {
  assert.match(page, /<div data-report-view-content>\{viewContent\}<\/div>/)
  assert.equal(tr.viewNavigation, "มุมมองรายงาน")
  for (const label of ["reports.shared-data", "reports.overview-data", "reports.accounting-data", "reports.operations-data", "reports.catalog-data"]) {
    assert.ok(page.includes(`"${label}"`), label)
  }
  assert.match(page, /emptyCopy=\{\{ filtered: t\("previewEmpty"\), dataset: tAsset\("importBatchStatusEmpty"\) \}\}/)
  assert.match(page, /getReportsOverviewData\(\n\s+assetWhere,/)
})
