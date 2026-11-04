import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import test from "node:test"

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

test("the board view, SLA and evidence filters are gone", () => {
  const source = read(pagePath)
  assert.doesNotMatch(source, /Kanban|layout=board|overdue=yes|evidence|assignedTo/)
})

test("the export uses the repair record columns", () => {
  const source = read("src/app/api/maintenance-tickets/export/route.ts")
  assert.match(source, /key: "outcome"/)
  assert.doesNotMatch(source, /assignedTo|dueDate|laborCost|partsCost|inspectedBy/)
})
