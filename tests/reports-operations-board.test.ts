import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import test from "node:test"

// Group 10 plan 2 Task 1 (spec §3, §5, §8; board RP-Ops): the operations tab as a data-fix queue: the chips line instead
// of the filter bar, five cells that filter the queue by issue=, the equation, the per-issue register link and export,
// the table with each row's fix, paging by qpage=, and the blocks kept from before (cross-scope with its preview and
// export, the idle count, the three top-5 lists, the data-quality rules link, empty states, the timing label).
// Sources are read with CRLF folded to LF, so the pins hold on a Windows checkout.

const read = (path: string) => readFileSync(path, "utf8").replace(/\r\n/g, "\n")
const page = read("src/app/[locale]/(dashboard)/reports/page.tsx")
const view = read("src/components/reports/reports-operations-view.tsx")
const filterPanel = read("src/components/reports/report-filter-panel.tsx")
const th = (JSON.parse(read("messages/th.json")) as { reportsPage: Record<string, string> }).reportsPage
const en = (JSON.parse(read("messages/en.json")) as { reportsPage: Record<string, string> }).reportsPage

test("operations shows the chips line instead of the filter bar", () => {
  // Task 2: the catalog shows the chips line too (board RP-Library).
  assert.match(page, /const showsFilterBar = activeView !== "operations" && activeView !== "catalog"/)
  assert.match(page, /\{showsFilterBar \? \(\n\s+<div data-report-filters>/)
  assert.match(page, /\{showsFilterBar \? \(\n\s+<div className="md:hidden">\n\s+<ReportFilterToggle/)
  assert.match(page, /\{!showsFilterBar \? \(\n\s+<div data-report-chips-line>\n\s+<ReportChipsLine/)
  assert.match(page, /: hasActiveFilters\n\s+\? \[t\("opsScopeLine", \{ count: operationsScope\.count \}\), \.\.\.\(operationsScope\.skipsFilters \? \[t\("opsScopeLineSkips"\)\] : \[\]\)\]\.join\(" · "\)\n\s+: t\("opsScopeLineNoFilters", \{ count: totalAssets \}\)/)
  assert.match(page, /clearHref=\{hasActiveFilters \? buildReportHref\(locale, activeView, parseAssetListParams\(\{\}\)\) : undefined\}/)
  assert.match(page, /editHref=\{buildReportHref\(locale, "overview", filters\)\}/)
  // The chips keep the chosen issue and toggle while on operations.
  assert.match(page, /\.map\(\(chip\) => \(operationsViewQuery \? \{ \.\.\.chip, href: `\$\{chip\.href\}&\$\{operationsViewQuery\}` \} : chip\)\)/)
  assert.match(filterPanel, /export function ReportChipsLine\(/)
  assert.match(filterPanel, /clearAll=\{clearHref \? \{ href: clearHref, label: labels\.clear \} : undefined\}/)
  assert.equal(th.opsScopeLine, "นับตามตัวกรองนี้ · ทรัพย์สิน {count, number} รายการ")
  assert.equal(th.opsEditFilters, "แก้ตัวกรองที่แท็บภาพรวม")
})

test("the queue's five cells are issue= links, the current one aria-current", () => {
  assert.match(view, /\{ key: "all" as ReportIssueChoice, label: t\("opsQueueAll"\), value: queue\.distinct/)
  assert.match(view, /\.\.\.REPORT_ISSUE_KINDS\.map\(\(kind\) => \(\{ key: kind as ReportIssueChoice, label: issueLabels\[kind\], value: queue\.counts\[kind\], foot: issueFoots\[kind\] \}\)\)/)
  assert.match(view, /href: queue\.links\.cells\[cell\.key\],\n\s+current: queue\.issue === cell\.key,/)
  assert.match(view, /t\("opsQueueEquation", \{/)
  assert.equal(th.opsQueueTitle, "คิวแก้ข้อมูลทะเบียน")
  assert.equal(th.opsQueueAll, "ทั้งหมดในคิว")
  assert.equal(th.opsFootResponsibility, "ผู้ถือครอง/แผนก/ที่ตั้ง")
  assert.equal(th.opsFootSerial, "Serial ว่าง")
  assert.equal(th.opsFootPhoto, "ยกเว้น License")
  assert.equal(th.opsFootWarranty, "ภายใน {days, number} วัน")
  assert.match(th.opsQueueEquation, /^ในคิว \{distinct, number\} ชิ้น = ข้อมูลไม่ครบ \{incomplete, number\} \+ ใกล้หมดประกันอย่างเดียว \{warrantyOnly, number\} · 1 ชิ้นมีได้หลายปัญหา/)
})

test("the register link and export show only with one issue; the export says its count and its cap", () => {
  assert.match(view, /\{queue\.issue !== "all" \? \(\n\s+<div className="flex min-w-0 flex-col gap-1\.5 lg:items-end">/)
  assert.match(view, /\{canAssetExport && queue\.exportIssue \? \(/)
  assert.match(view, /href=\{"\/api\/assets\/export\?" \+ registerQueries\[queue\.exportIssue\]\} download/)
  assert.match(view, /t\("opsExport", \{ count: queue\.total \}\)/)
  assert.match(view, /canAssetExport && queue\.exportIssue && assetExportCapped\(queue\.total\)/)
  assert.match(view, /t\("opsExportCapped", \{ count: queue\.total, max: ASSET_EXPORT_MAX_ROWS \}\)/)
  assert.match(view, /<p data-report-ops-export-pick className="[^"]*">\{t\("opsExportPick"\)\}<\/p>/)
  assert.match(page, /canAssetExport=\{canAssetExport\}/)
  assert.equal(th.opsExport, "ส่งออก {count, number} รายการ Excel")
  assert.equal(th.opsExportPick, "เลือกประเภทปัญหาเพื่อส่งออก")
  assert.equal(th.opsOpenInRegister, "เปิดในทะเบียนทรัพย์สิน")
  assert.equal(th.opsShowOthers, "แสดงปัญหาอื่นของชิ้นเดียวกันด้วย")
  assert.match(view, /href=\{queue\.links\.toggleOthers\}/)
})

test("the queue table: names first, issue badges, category · branch, one fix; cards on phones; paging by qpage", () => {
  for (const key of ["opsColAsset", "opsColIssues", "opsColCategoryBranch", "opsColFix"]) assert.ok(view.includes(`t("${key}")`), key)
  assert.match(view, /<DataTable data-report-ops-table caption=\{t\("opsQueueTableCaption", \{ issue: chosenLabel \}\)\} className="hidden md:block">/)
  assert.match(view, /<ul data-report-ops-cards className="[^"]*md:hidden">/)
  assert.match(view, /fixLabel=\{labels\.fixData\} place=\{fixPlace\(asset\)\}[^\n]*fullWidth \/>/)
  assert.match(view, /t\(row\.fix\.place === "edit" \? "opsFixPlaceEdit" : "opsFixPlaceDetail", \{ field: t\(`opsField_\$\{row\.fix\.fieldKey\}`\) \}\)/)
  assert.equal(th.opsFixPlaceEdit, "หน้าแก้ไข · {field}")
  for (const field of ["responsibility", "serialNumber", "photos", "warranty"]) {
    assert.equal(typeof th[`opsField_${field}`], "string", field)
    assert.equal(typeof en[`opsField_${field}`], "string", field)
  }
  // Paging: the shared Pagination (44px below md) with the lib's qpage links and "แสดง a–b จาก n".
  assert.match(view, /<Pagination\n\s+className="mt-3"\n\s+page=\{queue\.page\}\n\s+totalPages=\{queue\.pageCount\}\n\s+previousHref=\{queue\.links\.previous\}\n\s+nextHref=\{queue\.links\.next\}/)
  assert.match(view, /range: t\("opsQueueRange", \{ from: queue\.from, to: queue\.to, total: queue\.total \}\)/)
  assert.equal(th.opsQueueRange, "แสดง {from, number}–{to, number} จาก {total, number}")
  // The page reads the queue's params and drops them from the asset filters.
  assert.match(page, /const operationsParams = parseOperationsParams\(rawSearchParams\)/)
  for (const name of ["issue", "qpage", "others"]) assert.ok(page.includes(`delete assetSearchParams.${name}`), name)
})

test("the kept blocks: cross-scope with its equation, preview and export, idle, top lists, rules link, empty states, timing", () => {
  // Cross-scope: the four counts with their links, the equation, ส่งออกต่างขอบเขต (asset:view) and the 8-row preview.
  assert.match(page, /loadCrossScope: \(\) => buildAssetCrossScopeSummary\(buildAssetWhere\(crossScopeFilters\), 8\)/)
  assert.equal(page.match(/href: `\/\$\{locale\}\/assets\?\$\{buildAssetQueryString\(crossScopeFilters, \{ crossScope: "[a-z_]+", page: 1 \}\)\}`/g)?.length, 4)
  assert.match(page, /exportHref: canAssetExport\n\s+\? "\/api\/assets\/export\?" \+ buildAssetQueryString\(crossScopeFilters, \{ crossScope: "all", page: 1 \}\)/)
  assert.match(view, /t\("opsCrossScopeEquation", \{/)
  assert.match(view, /<CrossScopePreviewTable rows=\{crossScope\.rows\}/)
  assert.equal(th.opsCrossScopeEquation, "1 ชิ้นเข้าได้หลายข้อ: {custodianCompany, number} + {custodianBranch, number} + {locationBranch, number} = {sum, number} ข้อ ใน {all, number} ชิ้น")
  // Idle: the count and its register link.
  assert.match(view, /<Link href=\{idleAssetsHref\} data-report-ops-idle/)
  assert.match(page, /idleAssetsCount: data\.idle\.count,/)
  // The three top-5 lists, names first.
  for (const list of ["insights.repairs", "insights.custodians", "insights.locations"]) assert.ok(view.includes(`rows={${list}}`), list)
  assert.match(view, /<span className="block truncate text-foreground">\{row\.name\}<\/span>/)
  // The data-quality rules link, the empty states and the timing label and content hook.
  assert.match(view, /<Link href=\{`\/\$\{locale\}\/admin\/data-quality`\} className=\{buttonVariants\(\{ variant: "outline", size: "md" \}\)\}>\n\s+\{labels\.openDataQualityRules\}/)
  assert.equal(view.match(/selectReportEmptyCopy\(\{/g)?.length, 3)
  assert.match(view, /<EmptyNote>\{dataQualityEmpty\}<\/EmptyNote>/)
  assert.match(page, /withPerformanceTiming\("reports\.operations-data", loadOperationsView, timingContext\)/)
  assert.match(page, /<div data-report-view-content>\{viewContent\}<\/div>/)
  // The old 8-row preview of issues is gone: the queue pages through every issue.
  assert.doesNotMatch(page, /take: 8|getDataQualityIssues/)
})

// Group 10 plan 2 Task 3 (board RP-Phone): below md the five cells sit two a row, the queue rows are cards (name, tag,
// issue badges, category · branch, the fix button full width) and the paging controls are 44px tall.
test("queue cards below md", () => {
  assert.match(view, /<DataTable data-report-ops-table [^\n]*className="hidden md:block">/)
  const cards = view.slice(view.indexOf("<ul data-report-ops-cards"), view.indexOf("</ul>", view.indexOf("<ul data-report-ops-cards")))
  assert.match(cards, /<ul data-report-ops-cards className="[^"]*md:hidden">/)
  const order = ["<QueueAssetName", "<QueueIssueBadges", "{asset.categoryName} · {asset.branchName}", "<QueueFix"].map((part) => cards.indexOf(part))
  assert.ok(order.every((at, index) => at >= 0 && (index === 0 || at > order[index - 1])), String(order))
  assert.match(cards, /<QueueFix [^\n]*fullWidth \/>/)
  assert.match(view, /buttonVariants\(\{ size: "sm" \}\), fullWidth && "w-full"\)/)
  // The cells: the shared StatStrip, two columns below lg.
  assert.match(read("src/components/ui/stat-strip.tsx"), /className=\{cn\("grid grid-cols-2 [^"]*lg:grid-cols-none/)
  // Paging: the shared Pagination's controls are size sm buttons, 44px below md.
  assert.match(read("src/components/ui/pagination.tsx"), /const controlClasses = buttonVariants\(\{ variant: "outline", size: "sm" \}\)/)
  assert.match(read("src/components/ui/button-variants.ts"), /const sizeSm = "min-h-11 [^"]*md:min-h-0/)
})

// The controller's ruling after Task 1: each issue badge (table and cards) links to that issue's own fix place, as the
// old page's per-issue links did; the edit-page targets (responsibility, serial) only with asset:edit.
test("each issue badge links to its own fix place; edit targets only with asset:edit", () => {
  assert.equal(view.match(/<QueueIssueBadges locale=\{locale\} asset=\{asset\} canEdit=\{canEdit\} labels=\{issueLabels\} t=\{t\} \/>/g)?.length, 2)
  assert.match(view, /const fix = getReportIssueFix\(locale, asset\.id, issue\)/)
  assert.match(view, /return fix\.place === "detail" \|\| canEdit \? \(\n\s+<Link\n\s+key=\{issue\}\n\s+data-report-ops-issue=\{issue\}\n\s+href=\{fix\.href\}\n/)
  assert.match(view, /<span key=\{issue\} data-report-ops-issue=\{issue\} className="[^"]*">\n\s+\{badge\}\n\s+<\/span>/)
  const lib = read("src/lib/reports-operations-data.ts")
  assert.match(lib, /if \(issue === "serial"\) return \{ href: editHref, fieldKey: "serialNumber", place: "edit" \}/)
  assert.match(lib, /if \(issue === "photo"\) return \{ href: buildAssetDetailSectionHref\(locale, assetId, null, "photos"\), fieldKey: "photos", place: "detail" \}/)
  assert.match(lib, /if \(issue === "warranty"\) return \{ href: buildAssetDetailSectionHref\(locale, assetId, null, "purchase"\), fieldKey: "warranty", place: "detail" \}/)
  assert.match(lib, /return \{ href: editHref, fieldKey: "responsibility", place: "edit" \}/)
})

// Final review (findings 2, 3): the chips line does not claim every number follows every chip. Its count is the queue's
// scope (the filters without dataQuality and activity), it names what the queue and idle count leave out when those chips
// are on, and the cross-scope panel says it leaves out the status filter (the counts keep their scope rules, spec §5).
test("the operations scope line counts the queue's scope and names the filters the queue and cross-scope leave out", () => {
  assert.match(page, /const operationsScope = \{ count: totalAssets, skipsFilters: Boolean\(filters\.dataQuality \|\| filters\.activity\) \}/)
  assert.match(page, /operationsScope\.skipsFilters \? prisma\.asset\.count\(\{ where: operationsQualityWhere \}\) : Promise\.resolve\(totalAssets\)/)
  assert.match(page, /operationsScope\.count = scopeCount/)
  assert.doesNotMatch(th.opsScopeLine, /ทุกตัวเลข/)
  assert.doesNotMatch(en.opsScopeLine, /[Ee]very number/)
  assert.equal(th.opsScopeLineSkips, "คิวและจำนวนไม่เคลื่อนไหวไม่ใช้ตัวกรองคุณภาพข้อมูลและความเคลื่อนไหว")
  assert.equal(typeof en.opsScopeLineSkips, "string")
  // Cross-scope: "ไม่รวมตัวกรองสถานะ" under its equation when a status filter is set.
  assert.match(page, /statusNote: filters\.statusId \? t\("opsCrossScopeNoStatus"\) : undefined,/)
  assert.match(view, /\{crossScope\.statusNote \? \(\n\s+<p data-report-ops-cross-scope-status className="[^"]*">\{crossScope\.statusNote\}<\/p>\n\s+\) : null\}/)
  assert.equal(th.opsCrossScopeNoStatus, "ไม่รวมตัวกรองสถานะ")
  assert.equal(typeof en.opsCrossScopeNoStatus, "string")
})

// Final review (finding 4): the queue's badge links and fix links are named by their visible text, then the asset name
// and tag, so rows with the same issue sound different to a screen reader. The plain <span> badges stay as they are.
test("the queue's badge and fix links are named by their asset", () => {
  assert.match(view, /aria-label=\{t\("opsIssueLinkName", \{ issue: labels\[issue\], asset: asset\.name, tag: asset\.assetTag \}\)\}/)
  assert.match(view, /aria-label=\{t\("opsFixLinkName", \{ label: fixLabel, asset: asset\.name, tag: asset\.assetTag \}\)\}/)
  assert.match(view, /aria-label=\{t\("opsFixLinkName", \{ label: openLabel, asset: asset\.name, tag: asset\.assetTag \}\)\}/)
  assert.equal(th.opsIssueLinkName, "{issue}: {asset} ({tag})")
  assert.equal(en.opsIssueLinkName, "{issue}: {asset} ({tag})")
  assert.equal(th.opsFixLinkName, "{label}: {asset} ({tag})")
  assert.equal(en.opsFixLinkName, "{label}: {asset} ({tag})")
})
