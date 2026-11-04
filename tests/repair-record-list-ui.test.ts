import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import test from "node:test"

import { maintenanceStatusFilters } from "../src/lib/maintenance-query.ts"
import { getMaintenanceStatusLabel, getMaintenanceStatusTone, maintenanceStatuses } from "../src/lib/maintenance-status.ts"

const pagePath = "src/app/[locale]/(dashboard)/maintenance/page.tsx"
const stripPath = "src/components/maintenance/repair-list-strip.tsx"
const stuckPath = "src/components/maintenance/repair-stuck-card.tsx"
const pmPath = "src/components/maintenance/repair-pm-due-card.tsx"
// Sources are read with LF line endings, so the regexes may contain \n.
const read = (path: string) => readFileSync(path, "utf8").replace(/\r\n/g, "\n")
const messages = (locale: "th" | "en") => JSON.parse(read(`messages/${locale}.json`)).repairRecord

test("history screens show old workflow tickets with the new three statuses", () => {
  const labels = { in_progress: "ยังซ่อมไม่เสร็จ", closed: "ซ่อมเสร็จแล้ว", cancelled: "ยกเลิก" }
  assert.deepEqual([...maintenanceStatuses], ["in_progress", "closed", "cancelled"])
  assert.equal(getMaintenanceStatusLabel("waiting_vendor", labels), "ยังซ่อมไม่เสร็จ")
  assert.equal(getMaintenanceStatusTone("reported"), "warning")
})

// Group 5 plan 5 Task 2: the page reads everything through readRepairListPage; the stuck list and its count keep the
// bell's where there (group 1 dashboard task 1), and the PM card reads the reminder set.
test("the maintenance page reads the list, the strip and both cards through readRepairListPage", () => {
  const source = read(pagePath)
  assert.match(source, /^import \{ readRepairListPage \} from "@\/lib\/repair-list-page-data"$/m)
  assert.match(source, /= await readRepairListPage\(prisma, filters, now\)/)
  assert.doesNotMatch(source, /prisma\.(?:maintenanceTicket|maintenancePlan|asset)\./, "no read of its own beside the reader")
  const data = read("src/lib/repair-list-page-data.ts")
  assert.match(data, /^import \{ stuckRepairsWhere \} from "\.\/waiting-work-rules\.ts"$/m)
  assert.equal(data.match(/where: stuckRepairsWhere/g)?.length, 2, "the stuck list and its count use the bell's where")
  assert.match(data, /where: buildDuePmPlanWhere\(now\)/)
  assert.match(read("src/lib/waiting-work-rules.ts"), /maintenanceTickets: \{ none: openRepairRecordWhere \}/)
})

test("header: the title, the subtitle, จัดการแผน PM for every viewer, then บันทึกซ่อม behind create (spec §11.1, §6)", () => {
  const source = read(pagePath)
  const header = source.slice(source.indexOf("<PageHeader"), source.indexOf("/>", source.indexOf("actions={")))
  assert.match(header, /title=\{t\("title"\)\}\n\s+meta=\{t\("subtitle"\)\}/)
  assert.match(header, /<Link href=\{`\/\$\{locale\}\/maintenance\/pm`\} className=\{buttonVariants\(\{ variant: "outline", size: "md" \}\)\}>\n\s+\{t\("pmManage"\)\}\n\s+<\/Link>\n\s+\{canCreate \? \(\n\s+<Link href=\{createHref\} className=\{buttonVariants\(\{ size: "md" \}\)\}>/)
  assert.ok(header.indexOf('t("pmManage")') < header.indexOf("canCreate ?"), "the outline link comes first and is not behind create")
})

test("strip: the heading with its parts line or ไม่มีงานที่ต้องจัดการ, and four link cells (G5P5-R1, R2)", () => {
  const page = read(pagePath)
  assert.match(page, /<RepairListStrip strip=\{strip\} locale=\{locale\} current=\{filters\.status === "in_progress"\} \/>/)
  const source = read(stripPath)
  assert.doesNotMatch(source, /^"use client"/m)
  assert.match(source, /export function RepairListStrip\(\{ strip, locale, current \}: \{ strip: RepairStrip; locale: string; current: boolean \}\)/)
  assert.match(source, /\{strip\.total > 0 \? t\("stripTitle", \{ count: formatCount\(strip\.total\) \}\) : t\("stripEmpty"\)\}/)
  assert.match(source, /\{strip\.total > 0 \? \(\n\s+<p data-repair-strip-sum className="text-meta text-muted-foreground">/)
  assert.match(source, /\[strip\.open\.count, strip\.stuck, strip\.pmOverdue\.count, strip\.pmWeek\.count\]\.map\(\(count\) => formatCount\(count\)\)\.join\(" \+ "\)/)
  assert.match(source, /<StatStrip items=\{items\} \/>/)
  for (const cell of ["open", "stuck", "pmOverdue", "pmWeek"]) {
    assert.match(source, new RegExp(`data: \\{ "data-repair-strip-cell": "${cell}" \\}`), cell)
  }
  assert.match(source, /href: `\/\$\{locale\}\/maintenance\?status=in_progress`,\n\s+current,/)
  assert.match(source, /href: "#stuck",/)
  assert.match(source, /href: `\/\$\{locale\}\/maintenance\/pm\?due=overdue`,/)
  assert.match(source, /href: `\/\$\{locale\}\/maintenance\/pm\?due=week`,/)
  assert.match(source, /attention: strip\.stuck > 0,/)
  assert.match(source, /attention: strip\.pmOverdue\.count > 0,/)
  assert.equal(source.match(/attention:/g)?.length, 2, "only the stuck and PM-overdue cells can need attention")
  assert.match(source, /bangkokDayDiff\(earliest, now\)/)
  assert.match(source, /foot: longest\(strip\.open\.earliest\),/)
  assert.match(source, /foot: longest\(strip\.pmOverdue\.earliest\),/)
  assert.match(source, /foot: strip\.pmWeek\.earliest \? t\("pmDueOn", \{ date: formatDate\(strip\.pmWeek\.earliest\) \}\) : t\("stripPmWeekNone"\),/)
})

test("both cards always render, half width from lg, with #stuck and #pm-due once each (spec §11.2, Review Focus 3)", () => {
  const page = read(pagePath)
  assert.doesNotMatch(page, /stuckTotal > 0 \?|stuck\.total > 0 \?/)
  assert.match(page, /<div className="grid gap-6 lg:grid-cols-2">\n\s+<RepairStuckCard\n[\s\S]*?\/>\n\s+<RepairPmDueCard\n[\s\S]*?\/>\n\s+<\/div>/)
  const all = [page, read(stuckPath), read(pmPath)].join("\n")
  assert.equal(all.match(/id="stuck"/g)?.length, 1)
  assert.equal(all.match(/id="pm-due"/g)?.length, 1)
  // The more and less links keep today's query (search, page, filters), with or without stuck=all, and land on the card.
  assert.match(page, /moreHref=\{`\/\$\{locale\}\/maintenance\?\$\{buildMaintenanceQueryString\(filters, \{ stuck: "all" \}\)\}#stuck`\}/)
  assert.match(page, /lessHref=\{`\/\$\{locale\}\/maintenance\?\$\{buildMaintenanceQueryString\(filters, \{ stuck: "" \}\)\}#stuck`\}/)
  assert.match(page, /expanded=\{filters\.stuck === "all"\}/)
  assert.match(page, /\{filters\.stuck \? <input type="hidden" name="stuck" value=\{filters\.stuck\} \/> : null\}/)
})

test("stuck card: the name links to the asset (44px), tag · room with Nil, the outline บันทึกซ่อม with returnTo, the foot and the empty line", () => {
  const source = read(stuckPath)
  assert.doesNotMatch(source, /^"use client"/m)
  assert.match(source, /export function RepairStuckCard\(\{ rows, total, expanded, locale, returnTo, canCreate, moreHref, lessHref \}: \{/)
  assert.match(source, /<ContentPanel\n\s+id="stuck"\n\s+divided\n\s+flush\n/)
  assert.match(source, /title=\{t\("stuckTitle"\)\}/)
  assert.match(source, /<StatusBadge label=\{t\("stuckCount", \{ count: formatCount\(total\) \}\)\}/)
  assert.match(source, /<Notice tone="warning"[^>]*>\{t\("stuckHelp"\)\}<\/Notice>/)
  assert.match(source, /<Link href=\{`\/\$\{locale\}\/assets\/\$\{asset\.id\}`\} className=\{cn\(linkVariants\(\{ size: "inherit" \}\), "inline-flex min-h-11 min-w-0 max-w-full items-center md:min-h-0"\)\}>\n\s+<span className="truncate">\{asset\.name\}<\/span>/)
  assert.match(source, /<span className="tag">\{asset\.assetTag\}<\/span> · \{asset\.roomName \?\? <Nil \/>\}/)
  assert.match(source, /\{canCreate \? \(\n\s+<Link href=\{appendOperationalReturnTo\(`\/\$\{locale\}\/maintenance\/new\?assetId=\$\{asset\.id\}`, returnTo\)\} className=\{cn\(buttonVariants\(\{ variant: "outline" \}\), "shrink-0"\)\}>\n\s+\{t\("createTitle"\)\}/)
  assert.match(source, /t\("shownOfTotal", \{ shown: formatCount\(rows\.length\), total: formatCount\(total\) \}\)/)
  assert.match(source, /<Link href=\{expanded \? lessHref : moreHref\}/)
  assert.match(source, /\{expanded \? t\("stuckShowLess"\) : t\("stuckShowAll", \{ count: formatCount\(total\) \}\)\}/)
  assert.match(source, /<EmptyNote padded>\{t\("stuckEmpty"\)\}<\/EmptyNote>/)
})

test("PM card: the count badge, the help line, rows with a badge and asset · tag, บันทึกว่าทำแล้ว or the open record, the foot link (G5P5-R7)", () => {
  const page = read(pagePath)
  assert.match(page, /<RepairPmDueCard\n\s+rows=\{pm\.rows\}\n\s+overdue=\{pm\.overdue\}\n\s+week=\{pm\.week\}\n\s+locale=\{locale\}\n\s+returnTo=\{returnHref\}\n\s+canCreate=\{canCreate\}\n\s+\/>/)
  const source = read(pmPath)
  assert.doesNotMatch(source, /^"use client"/m)
  assert.match(source, /export function RepairPmDueCard\(\{ rows, overdue, week, locale, returnTo, canCreate \}: \{/)
  assert.match(source, /<ContentPanel\n\s+id="pm-due"\n\s+divided\n\s+flush\n/)
  assert.match(source, /title=\{t\("pmDueTitle"\)\}/)
  assert.match(source, /t\("pmDueHelp", \{ overdue: formatCount\(overdue\), soon: formatCount\(week\) \}\)/)
  assert.match(source, /<StatusBadge label=\{t\("pmDueCount", \{ count: formatCount\(total\) \}\)\}/)
  assert.match(source, /<li key=\{row\.id\} data-pm-due-row=\{row\.id\}/)
  assert.match(source, /row\.badge\.kind === "overdue" \? t\("pmOverdue", \{ days: row\.badge\.days \}\) : t\("pmDueOn", \{ date: formatDate\(row\.badge\.date\) \}\)/)
  assert.match(source, /\{row\.assetName\} · <span className="tag">\{row\.assetTag\}<\/span>/)
  assert.match(source, /\{row\.openRecord \? \(\n\s+<Link href=\{appendOperationalReturnTo\(`\/\$\{locale\}\/maintenance\/\$\{row\.openRecord\.id\}`, returnTo\)\}/)
  assert.match(source, /\{tPage\("pmOpenRecord", \{ repairNo: row\.openRecord\.repairNo \}\)\}/)
  assert.match(source, /\) : canCreate \? \(\n\s+<Link href=\{appendOperationalReturnTo\(`\/\$\{locale\}\/maintenance\/new\?planId=\$\{row\.id\}`, returnTo\)\}/)
  assert.match(source, /const footLink = pmCardFootLink\(overdue, week\)/)
  assert.match(source, /href=\{`\/\$\{locale\}\/maintenance\/pm\?due=\$\{footLink\.due\}`\}/)
  assert.match(source, /t\(footLink\.due === "overdue" \? "pmDueOverdueLink" : "pmDueWeekLink", \{ count: formatCount\(footLink\.count\) \}\)/)
  assert.match(source, /<EmptyNote padded>\{t\("pmDueEmpty"\)\}<\/EmptyNote>/)
})

test("the strip and card words are §13's, and stuckMore and pmDueMore are gone", () => {
  const th = messages("th")
  const expected: Record<string, string> = {
    subtitle: "ประวัติการซ่อมของทรัพย์สินทุกชิ้น และงานที่ต้องจัดการต่อ",
    stripTitle: "ต้องจัดการ {count} เรื่อง",
    stripEmpty: "ไม่มีงานที่ต้องจัดการ",
    stripOpen: "ยังซ่อมไม่เสร็จ",
    stripStuck: "ค้างสถานะซ่อมไม่มีบันทึก",
    stripPmOverdue: "PM เกินกำหนด",
    stripPmWeek: "PM ครบกำหนดใน 7 วัน",
    stripLongestDays: "นานสุด {days} วัน",
    stripStuckFoot: "สถานะกับประวัติยังไม่ตรงกัน",
    pmDueOn: "ครบกำหนด {date}",
    stripPmWeekNone: "ไม่มีแผนที่ครบกำหนด",
    stuckCount: "{count} ชิ้น",
    shownOfTotal: "แสดง {shown} จาก {total}",
    stuckShowAll: "ดูทั้งหมด {count} ชิ้น",
    stuckShowLess: "แสดงน้อยลง",
    stuckEmpty: "ไม่มีทรัพย์สินค้างสถานะซ่อม",
    pmDueTitle: "บำรุงรักษาตามรอบ (PM) ครบกำหนดใน 7 วัน",
    pmDueCount: "{count} แผน",
    pmDueHelp: "เกินกำหนด {overdue} · ครบกำหนดใน 7 วัน {soon} · เรียงจากที่เกินกำหนดนานที่สุด",
    pmOverdue: "เกินกำหนด {days} วัน",
    pmDueOverdueLink: "ดูแผนที่เกินกำหนด {count} แผน",
    pmDueWeekLink: "ดูแผนที่ครบกำหนดใน 7 วัน {count} แผน",
    pmDueEmpty: "ไม่มีแผน PM ที่ครบกำหนดใน 7 วัน",
    pmManage: "จัดการแผน PM",
    createTitle: "บันทึกซ่อม",
  }
  for (const [key, value] of Object.entries(expected)) assert.equal(th[key], value, key)
  const en = messages("en")
  for (const key of Object.keys(expected)) assert.equal(typeof en[key], "string", `en ${key}`)
  for (const locale of ["th", "en"] as const) {
    assert.equal(messages(locale).stuckMore, undefined, `${locale} stuckMore`)
    assert.equal(messages(locale).pmDueMore, undefined, `${locale} pmDueMore`)
  }
  assert.equal(JSON.parse(read("messages/th.json")).maintenancePage.pmOpenRecord, "มีบันทึกซ่อมที่ยังไม่เสร็จ {repairNo}")
})

// Group 5 plan 5 Task 3 (spec §11.3, G5P5-R3..R6, R8): the records section.
test("records toolbar: four status tabs with counts, the search, the date chip and the hidden filters in one GET form", () => {
  const source = read(pagePath)
  assert.match(source, /^import \{ TabNav \} from "@\/components\/ui\/tab-nav"$/m)
  assert.match(source, /^import \{ RepairDateRangeChip \} from "@\/components\/maintenance\/repair-date-range-chip"$/m)
  // ทั้งหมด first, then the three statuses (four tabs); each keeps the filters, sets or drops the status, page 1.
  assert.deepEqual([...maintenanceStatusFilters], ["in_progress", "closed", "cancelled"])
  assert.match(source, /const statusTabs = \[\n\s+\{ key: "all", label: tCommon\("all"\), count: formatCount\(statusCounts\.all\), href: buildMaintenancePageHref\(locale, listQuery, \{ status: "", page: 1 \}\) \},\n\s+\.\.\.maintenanceStatusFilters\.map\(\(status\) => \(\{\n\s+key: status,\n\s+label: t\(`status\.\$\{status\}`\),\n\s+count: formatCount\(statusCounts\[status\]\),\n\s+href: buildMaintenancePageHref\(locale, listQuery, \{ status, page: 1 \}\),\n\s+\}\)\),\n\s+\]/)
  assert.match(source, /<TabNav data-repair-tabs aria-label=\{tCommon\("status"\)\} items=\{statusTabs\} current=\{filters\.status \|\| "all"\} \/>/)
  const form = source.slice(source.indexOf('<form id="repair-list-filter"'), source.indexOf("</form>"))
  assert.match(form, /^<form id="repair-list-filter" role="search" action=\{`\/\$\{locale\}\/maintenance`\}/)
  assert.match(form, /\{filters\.assetId \? <input type="hidden" name="assetId" value=\{filters\.assetId\} \/> : null\}/)
  assert.match(form, /\{filters\.status \? <input type="hidden" name="status" value=\{filters\.status\} \/> : null\}/)
  assert.match(form, /\{filters\.stuck \? <input type="hidden" name="stuck" value=\{filters\.stuck\} \/> : null\}/)
  assert.match(form, /<input type="hidden" name="pageSize" value=\{filters\.pageSize\} \/>/)
  assert.match(form, /<SearchField\n\s+name="search"\n\s+defaultValue=\{filters\.search\}\n\s+aria-label=\{tCommon\("search"\)\}\n\s+placeholder=\{t\("searchPlaceholder"\)\}/)
  // Keyed on the applied dates, so the chip remounts closed after a clear or an apply (final review).
  assert.match(form, /<RepairDateRangeChip\n\s+key=\{`\$\{filters\.dateFrom\}\|\$\{filters\.dateTo\}`\}\n\s+formId="repair-list-filter"\n\s+dateFrom=\{filters\.dateFrom\}\n\s+dateTo=\{filters\.dateTo\}\n/)
  // The applied words: an empty side reads "–" (G5P5-R8).
  assert.match(form, /applied: t\("dateRangeApplied", \{ from: filters\.dateFrom \? formatDate\(filters\.dateFrom\) : "–", to: filters\.dateTo \? formatDate\(filters\.dateTo\) : "–" \}\),/)
  assert.match(form, /clearHref=\{`\/\$\{locale\}\/maintenance\?\$\{buildMaintenanceQueryString\(filters, \{ dateFrom: "", dateTo: "", page: 1 \}\)\}`\}/)
  // The export keeps the list's query and its permission.
  assert.match(source, /\{canExport \? \(\n\s+<a href=\{`\/api\/maintenance-tickets\/export\?\$\{listQuery\}`\} download className=\{cn\(buttonVariants\(\{ variant: "outline", size: "md" \}\), "md:ms-auto"\)\}>/)
  assert.match(source, /\{getMaintenanceDateRangeError\(filters\) \? \(\n\s+<Notice tone="danger" role="alert">\{t\("invalidDateRange"\)\}<\/Notice>\n\s+\) : null\}/)
  assert.doesNotMatch(source, /FilterSelect|<FilterPanel|FilterFormActions|resultCount/)
})

test("records table: six heads whatever the rights, rows to the record with returnTo and data-repair-row", () => {
  const source = read(pagePath)
  assert.equal(source.match(/<DataTableHead\b/g)?.length, 6)
  for (const head of ['t("colDateNo")', 't("asset")', 't("problem")', 't("colStatusOutcome")', 't("vendor")']) {
    assert.ok(source.includes(`<DataTableHead>{${head}}</DataTableHead>`), head)
  }
  assert.match(source, /<DataTableHead align="right">\{t\("cost"\)\}<\/DataTableHead>/)
  assert.doesNotMatch(source, /canExport \?[^\n]*<DataTableHead/)
  assert.match(source, /<ClickableTableRow key=\{row\.id\} href=\{recordHref\(row\.id\)\} label=\{`\$\{tCommon\("view"\)\}: \$\{row\.repairNo\}`\} rowData=\{\{ "data-repair-row": row\.id \}\}>/)
  assert.match(source, /const recordHref = \(id: string\) => appendOperationalReturnTo\(`\/\$\{locale\}\/maintenance\/\$\{id\}`, returnHref\)/)
  // Date with the record number under it; the asset as plain text, its tag under it.
  assert.match(source, /<div className="text-foreground">\{formatDate\(row\.reportedDate\)\}<\/div>\n\s+<div className="mt-1 text-meta text-muted-foreground"><span className="tag">\{row\.repairNo\}<\/span><\/div>/)
  assert.match(source, /<div className="font-medium text-foreground">\{row\.asset\.name\}<\/div>\n\s+<div className="mt-1 text-meta text-muted-foreground"><span className="tag">\{row\.asset\.assetTag\}<\/span><\/div>/)
  // G5P5-R5: the problem and the resolution on one line each, or the problem on two.
  assert.match(source, /\{row\.resolution \? \(\n\s+<>\n\s+<div className="line-clamp-1 text-foreground">\{row\.problem\}<\/div>\n\s+<div className="mt-1 line-clamp-1 text-meta text-muted-foreground">\{row\.resolution\}<\/div>\n\s+<\/>\n\s+\) : \(\n\s+<div className="line-clamp-2 text-foreground">\{row\.problem\}<\/div>\n\s+\)\}/)
  // G5P5-R6: the badge, then one plain secondary line.
  assert.match(source, /const statusLine = \(line: RepairListLine\) =>\n\s+line == null\n\s+\? null\n\s+: line\.kind === "outcome"\n\s+\? t\(`outcome\.\$\{line\.key\}`\)\n\s+: line\.kind === "duration"\n\s+\? t\(`detail\.\$\{line\.key\}`, \{ days: line\.days \}\)\n\s+: line\.text/)
  assert.match(source, /<StatusBadge label=\{t\(`status\.\$\{row\.status\}`\)\} tone=\{getRepairRecordStatusTone\(row\.status\)\} \/>\n\s+\{line \? <div className="mt-1 line-clamp-1 text-meta text-muted-foreground">\{line\}<\/div> : null\}/)
  // The vendor or ช่างภายใน, บันทึกโดย under it; the cost or Nil.
  assert.match(source, /<div className="text-foreground">\{row\.vendorName \?\? t\("internal"\)\}<\/div>\n\s+<div className="mt-1 text-meta text-muted-foreground">\{t\("recordedBy", \{ name: row\.reporterName \}\)\}<\/div>/)
  assert.match(source, /<DataTableCell numeric className="text-muted-foreground">\{row\.cost == null \? <Nil \/> : formatMoney\(row\.cost\)\}<\/DataTableCell>/)
})

test("phone cards: the name, the tag that breaks, the badge that keeps its width, the status line, then date · vendor · cost", () => {
  const source = read(pagePath)
  const start = source.indexOf("getMobileCardListClasses()")
  const card = source.slice(start, source.indexOf("<DataTable ", start))
  assert.match(card, /<div className="text-sm font-semibold text-foreground">\{row\.asset\.name\}<\/div>\n\s+<div className="mt-1 text-meta text-muted-foreground"><span className="tag break-all">\{row\.asset\.assetTag\}<\/span><\/div>/)
  assert.match(card, /<StatusBadge className="shrink-0" label=\{t\(`status\.\$\{row\.status\}`\)\} tone=\{getRepairRecordStatusTone\(row\.status\)\} \/>/)
  assert.match(card, /\{line \? <p className="mt-2 text-meta text-muted-foreground">\{line\}<\/p> : null\}/)
  assert.match(card, /\{formatDate\(row\.reportedDate\)\} · \{row\.vendorName \?\? t\("internal"\)\}\n\s+\{row\.cost == null \? "" : ` · \$\{formatMoney\(row\.cost, \{ unit: tCommon\("baht"\) \}\)\}`\}/)
  assert.ok(card.indexOf("row.asset.name") < card.indexOf("row.asset.assetTag"), "the name comes first")
})

test("foot: the cost total and the cancelled line, hidden on the ยกเลิก tab, then the pager (G5P5-R4)", () => {
  const source = read(pagePath)
  assert.match(source, /= await readRepairListPage\(prisma, filters, now\)/)
  assert.match(source, /const \{ rows, total, statusCounts, cost, strip, stuck, pm \} = await readRepairListPage/)
  const foot = source.slice(source.indexOf("<DataTableFoot"), source.indexOf("</DataTableFoot>"))
  assert.match(foot, /\{filters\.status !== "cancelled" \? \(\n\s+<div data-repair-cost className="space-y-0\.5">/)
  assert.match(foot, /<span>\{t\("costTotal", \{ count: formatCount\(cost\.count\) \}\)\}<\/span>\n\s+<span data-repair-cost-total className="font-semibold text-foreground">\{formatMoney\(cost\.sum, \{ unit: tCommon\("baht"\) \}\)\}<\/span>/)
  assert.match(foot, /\{cost\.cancelled > 0 \? <p>\{t\("costExcludesCancelled", \{ count: formatCount\(cost\.cancelled\) \}\)\}<\/p> : null\}/)
  assert.ok(foot.indexOf("data-repair-cost") < foot.indexOf("<Pagination"), "the cost line sits above the pager")
  assert.match(foot, /range: tCommon\("showingRange", \{ from: formatCount\(pagination\.start\), to: formatCount\(pagination\.end\), total: formatCount\(pagination\.total\) \}\)/)
})

test("the records words are §13's, the duration words are plan 3's, and the old filter words are gone", () => {
  const th = messages("th")
  const expected: Record<string, string> = {
    searchPlaceholder: "ค้นหาเลขที่ ทรัพย์สิน อาการ เลขใบเสร็จ หรือร้าน",
    dateRange: "ช่วงวันที่",
    dateRangeApplied: "ช่วงวันที่: {from} – {to}",
    dateRangeApply: "ใช้ตัวกรอง",
    dateRangeClear: "ล้างช่วงวันที่",
    colDateNo: "วันที่ · เลขที่",
    colStatusOutcome: "สถานะ · ผลการซ่อม",
    recordedBy: "บันทึกโดย {name}",
    costTotal: "ค่าใช้จ่ายรวม {count} รายการ",
    costExcludesCancelled: "ไม่นับ {count} รายการที่ยกเลิก",
    asset: "ทรัพย์สิน",
    problem: "อาการ / สิ่งที่ซ่อม",
    vendor: "ร้าน / ผู้ซ่อมภายนอก",
    cost: "ค่าใช้จ่ายรวม (บาท)",
    internal: "ช่างภายใน",
    export: "ส่งออก Excel",
    assetFilter: "เฉพาะทรัพย์สินนี้",
  }
  for (const [key, value] of Object.entries(expected)) assert.equal(th[key], value, key)
  const en = messages("en")
  for (const key of Object.keys(expected)) assert.equal(typeof en[key], "string", `en ${key}`)
  assert.deepEqual(th.detail.sentDays, "ส่งซ่อมมา {days, number} วัน")
  assert.deepEqual(th.detail.repairDays, "ซ่อมมา {days, number} วัน")
  assert.deepEqual(th.detail.sentToday, "ส่งซ่อมวันนี้")
  assert.deepEqual(th.detail.repairToday, "ซ่อมวันนี้")
  assert.deepEqual(th.outcome, { usable: "ใช้งานได้", beyond_repair: "ซ่อมไม่ได้ เสนอจำหน่าย", unknown: "ไม่ระบุ" })
  for (const locale of ["th", "en"] as const) {
    for (const key of ["filterStatus", "filter", "resultCount"]) assert.equal(messages(locale)[key], undefined, `${locale} ${key}`)
  }
})

test("the board view, SLA and evidence filters are gone", () => {
  const source = read(pagePath)
  assert.doesNotMatch(source, /Kanban|layout=board|overdue=yes|evidence|assignedTo/)
})

test("the export uses the repair record columns", () => {
  const source = read("src/app/api/maintenance-tickets/export/route.ts")
  assert.match(source, /key: "outcome"/)
  assert.doesNotMatch(source, /assignedTo|dueDate|laborCost|partsCost|inspectedBy/)
})
