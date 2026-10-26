import test from "node:test"
import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import {
  buildDashboardHref,
  buildDashboardRegisterHref,
  buildDashboardWaiting,
  DASHBOARD_BRANCH_ROW_LIMIT,
  DASHBOARD_COMPANY_TAB_LIMIT,
  describeWaitingAge,
  formatDayMonth,
  formatRecentTime,
  normalizeDashboardCompanyId,
  pickDashboardBranchRows,
} from "../src/lib/dashboard-page.ts"
import { buildExactAssetRegisterHref } from "../src/lib/asset-register-view-memory.ts"
import { dashboardRegisterParams, type DashboardRegisterCount } from "../src/lib/dashboard-overview-rules.ts"
import { WAITING_WORK_KEYS, type WaitingWorkAge, type WaitingWorkKey } from "../src/lib/waiting-work-rules.ts"

const read = (path: string) => readFileSync(path, "utf8").replace(/\r\n/g, "\n")
const page = () => read("src/app/[locale]/(dashboard)/dashboard/page.tsx")

test("the company in the URL counts only when it is an active company (spec §6.2)", () => {
  const companies = [{ id: "c1" }, { id: "c2" }]
  assert.equal(normalizeDashboardCompanyId("c2", companies), "c2")
  assert.equal(normalizeDashboardCompanyId(" c1 ", companies), "c1")
  assert.equal(normalizeDashboardCompanyId(["c1", "c2"], companies), "c1")
  assert.equal(normalizeDashboardCompanyId("gone", companies), null)
  assert.equal(normalizeDashboardCompanyId("", companies), null)
  assert.equal(normalizeDashboardCompanyId(undefined, companies), null)
  assert.equal(DASHBOARD_COMPANY_TAB_LIMIT, 4)
  assert.equal(buildDashboardHref("th", null), "/th/dashboard")
  assert.equal(buildDashboardHref("en", "c 1"), "/en/dashboard?companyId=c+1")
})

test("every register link carries the overview's own filter, exact, with the chosen company (spec §6.2, §6.5; R21)", () => {
  assert.equal(buildDashboardRegisterHref("th", "total", null), "/th/assets?exact=1")
  assert.equal(buildDashboardRegisterHref("th", "total", "c1"), "/th/assets?companyId=c1&exact=1")
  assert.equal(buildDashboardRegisterHref("th", "custodianAssigned", null), "/th/assets?custodianState=assigned&exact=1")
  assert.equal(buildDashboardRegisterHref("en", "idle180", "c1"), "/en/assets?companyId=c1&activity=idle_180d&exact=1")
  const counts: DashboardRegisterCount[] = ["total", "idle180", "custodianAssigned", "responsibilityMissing", "crossScope", { statusId: "s 1" }]
  for (const count of counts) {
    for (const companyId of [null, "c1"]) {
      assert.equal(buildDashboardRegisterHref("th", count, companyId), buildExactAssetRegisterHref("th", dashboardRegisterParams(count, companyId)), JSON.stringify(count))
    }
  }
})

test("งานที่รอคุณ: the visible kinds with a count in the shared order, the kinds at zero, the sum and the oldest (spec §6.3)", () => {
  const counts = {
    approvalInbox: 9, openRepairs: 4, stuckRepairs: 2, duePm: 0, pendingAuditFindings: 3, openAuditActions: 0,
    auditActionsDueSoon: 0, pendingDisposals: 1, approvedDisposals: 0, returnsDueSoon: 5, warrantyExpiringSoon: 7, licenseExpiringSoon: 0,
  }
  const visibleKeys: WaitingWorkKey[] = ["openRepairs", "stuckRepairs", "duePm", "pendingAuditFindings", "pendingDisposals", "approvedDisposals", "returnsDueSoon", "warrantyExpiringSoon"]
  const ages: Partial<Record<WaitingWorkKey, WaitingWorkAge>> = {
    openRepairs: { kind: "age", days: 12, overdue: false },
    stuckRepairs: { kind: "age", days: 5, overdue: false },
    pendingAuditFindings: { kind: "age", days: 2, overdue: false },
    pendingDisposals: { kind: "age", days: 0, overdue: false },
    returnsDueSoon: { kind: "due", days: -3, overdue: true },
    warrantyExpiringSoon: { kind: "expires", date: new Date("2027-01-12T00:00:00Z"), days: 78 },
  }
  const waiting = buildDashboardWaiting({ counts, visibleKeys }, ages)
  assert.deepEqual(waiting.rows.map((row) => [row.key, row.count]), [
    ["openRepairs", 4], ["stuckRepairs", 2], ["pendingAuditFindings", 3], ["pendingDisposals", 1], ["returnsDueSoon", 5], ["warrantyExpiringSoon", 7],
  ])
  assert.deepEqual(waiting.rows[0].age, ages.openRepairs)
  assert.deepEqual(waiting.zeroKeys, ["duePm", "approvedDisposals"])
  assert.equal(waiting.total, 22, "approvals are not visible here, so their 9 never count")
  assert.deepEqual(waiting.oldest, { days: 12, overdue: true }, "the oldest age, overdue because a return is past due")
  assert.equal(buildDashboardWaiting({ counts, visibleKeys: ["pendingDisposals", "warrantyExpiringSoon"] }, ages).oldest, null, "nothing older than today, nothing overdue")
  assert.equal(buildDashboardWaiting({ counts, visibleKeys: ["openRepairs"] }, {}).rows[0].age, null)
})

test("ค้างนานสุด reads an age, a due date or an expiry, in Bangkok days (spec §6.3)", () => {
  const now = new Date("2026-10-26T03:00:00Z")
  assert.deepEqual(describeWaitingAge({ kind: "age", days: 12, overdue: false }, "th", now), { key: "waitingAgeDays", values: { days: "12" }, overdue: false })
  // An approval past its SLA: only approvals are overdue by age; the flag is Task 2's, read as it is (R9).
  assert.deepEqual(describeWaitingAge({ kind: "age", days: 4, overdue: true }, "th", now), { key: "waitingAgeDays", values: { days: "4" }, overdue: true })
  assert.deepEqual(describeWaitingAge({ kind: "age", days: 0, overdue: false }, "th", now), { key: "waitingAgeUnderDay", values: {}, overdue: false })
  assert.deepEqual(describeWaitingAge({ kind: "due", days: -3, overdue: true }, "th", now), { key: "waitingOverdue", values: { days: "3" }, overdue: true })
  assert.deepEqual(describeWaitingAge({ kind: "due", days: 0, overdue: false }, "th", now), { key: "waitingDueToday", values: {}, overdue: false })
  assert.deepEqual(describeWaitingAge({ kind: "due", days: 2, overdue: false }, "th", now), { key: "waitingDueIn", values: { days: "2" }, overdue: false })
  assert.deepEqual(describeWaitingAge({ kind: "expires", date: new Date("2026-11-20T00:00:00Z"), days: 25 }, "th", now), { key: "waitingExpires", values: { date: "20 พ.ย." }, overdue: false })
  assert.deepEqual(describeWaitingAge({ kind: "expires", date: new Date("2027-01-12T00:00:00Z"), days: 78 }, "en", now), { key: "waitingExpires", values: { date: "12 Jan 2027" }, overdue: false })
})

test("a day and month in Bangkok, with the year only when it is not this year, Buddhist in Thai", () => {
  const now = new Date("2026-10-26T03:00:00Z")
  assert.equal(formatDayMonth(new Date("2026-11-20T00:00:00Z"), "th", now), "20 พ.ย.")
  assert.equal(formatDayMonth(new Date("2027-01-12T00:00:00Z"), "th", now), "12 ม.ค. 2570")
  assert.equal(formatDayMonth(new Date("2026-12-31T17:30:00Z"), "th", now), "1 ม.ค. 2570", "already the new year in Bangkok")
  assert.equal(formatDayMonth(new Date("2026-11-20T00:00:00Z"), "en", now), "20 Nov")
})

test("the page reads the shared sources in two rounds and never writes: getWaitingWork, never getNotificationCenter (spec §6.3, §5 Performance; R10, R11)", () => {
  const source = page()
  assert.match(source, /getWaitingWork\(user, now\)/)
  assert.match(source, /getWaitingWorkAges\(user, waitingKeysWithCount, waitingWork\.rules, now\)/)
  assert.match(source, /getDashboardOverview\(\{ companyId, now \}\)/)
  assert.match(source, /getDashboardProfile\(user, getApprovalInboxAccess\(user\)\.canAnyApproval\)/)
  assert.doesNotMatch(source, /getNotificationCenter|getApprovalInboxCounts|getMessages|systemLog|prisma\.(?!company\.findMany\b)/)
})

test("the KPIs and the sections follow the profile's order, and each KPI names its filter (spec §6.1, §6.4, §6.5)", () => {
  const source = page()
  const kpis = source.slice(source.indexOf("const kpiCells"), source.indexOf("const kpiItems"))
  assert.equal(kpis.match(/\bfilterNote: /g)?.length, 4)
  for (const value of kpis.matchAll(/\bvalue: ([^\n]+)/g)) assert.match(value[1], /formatCount\(|formatPercent\(/, value[0])
  assert.match(source, /const kpiItems = DASHBOARD_KPI_ORDER\[profile\]/)
  assert.match(source, /<StatStrip items=\{kpiItems\} \/>/)
  assert.match(source, /href: "#dashboard-waiting"/)
  assert.match(source, /attention: Boolean\(waiting\.oldest\?\.overdue\)/)
  for (const count of ["total", "idle180", "custodianAssigned", "responsibilityMissing"]) {
    assert.match(kpis, new RegExp(`buildDashboardRegisterHref\\(locale, "${count}", companyId\\)`), count)
  }
  // The round KPI (R13, R15, R18, R21): the round page's own percent and behind rule, the bar in the meter slot,
  // the round's item list narrowed to the chosen company, and no number for the other rounds.
  assert.match(source, /const auditValue = round && overview\.audit\.expected > 0 \? auditPercent\(overview\.audit\.processed, overview\.audit\.expected\) \/ 100 : null/)
  assert.match(kpis, /meter: round \? <PaceBar /)
  assert.match(kpis, /behind=\{isBehindPace\(overview\.audit\.processed, overview\.audit\.expected, overview\.audit\.pace\)\}/)
  assert.match(kpis, /href: round \? buildAuditRoundItemsHref\(locale, round\.id, \{ companyId: companyId \?\? undefined \}\)/)
  assert.match(kpis, /overview\.audit\.otherOpen > 0 \? "\?view=open" : ""/)
  assert.match(kpis, /t\(overview\.audit\.otherOpen > 0 \? "noDueRound" : "noRound"\)/)
  assert.doesNotMatch(source, /formatCount\(overview\.audit\.otherOpen\)/, "the other rounds are never a number")
  assert.match(source, /DASHBOARD_SECTION_ORDER\[profile\]/)
  assert.match(source, /id=\{`dashboard-\$\{key\}`\}/)
  assert.match(source, /data-dashboard-section=\{key\}/)
  assert.match(source, /<div className="grid grid-cols-1 gap-6 lg:grid-cols-12">/)
  assert.match(source, /index % 2 === 0 \? "lg:col-span-7" : "lg:col-span-5"/)
})

test("the company switcher: links that change the URL from md, a select past four companies, a removable chip on the phone (spec §6.2)", () => {
  const source = page()
  assert.match(source, /<TabNav\n\s+aria-label=\{t\("scopeNavigation"\)\}\n\s+current=\{companyId \?\? "all"\}/)
  assert.match(source, /className="hidden md:block"/)
  assert.match(source, /companies\.length > DASHBOARD_COMPANY_TAB_LIMIT/)
  assert.match(source, /<form role="search" action=\{`\/\$\{locale\}\/dashboard`\}/)
  assert.match(source, /<FilterSelect[\s\S]*?name="companyId"/)
  assert.match(source, /href: buildDashboardHref\(locale, null\), mobileOnly: true/)
})

test("งานที่รอคุณ: the bell's titles, links and order, one row per kind on both widths, the zero line, the work center by permission (spec §6.3)", () => {
  const source = page()
  assert.equal(source.match(/data-waiting-key=\{row\.key\}/g)?.length, 2, "the desktop row and the phone link")
  assert.match(source, /buildWaitingWorkHref\(locale, row\.key\)/)
  assert.match(source, /tNotifications\(row\.key\)/)
  assert.match(source, /title=\{tNotifications\(`\$\{row\.key\}Detail`\)\}/)
  assert.match(source, /t\(`waitingNext\.\$\{row\.key\}`\)/)
  assert.match(source, /<DataTable framed=\{false\} className="hidden md:block" caption=\{t\("waitingTitle"\)\}>/)
  assert.match(source, /<ContentPanelRows className="md:hidden">/)
  assert.match(source, /min-h-14/)
  assert.match(source, /const zeroLineClassName = waiting\.rows\.length > 0/)
  assert.match(source, /<EmptyNote tone="clear" padded[^>]*>\{t\("waitingZero", /)
})

test("the dashboard's words (spec §6, docs/19_THAI_GLOSSARY.md)", () => {
  const th = JSON.parse(read("messages/th.json")).dashboard, en = JSON.parse(read("messages/en.json")).dashboard
  const thai: Record<string, string> = {
    asOf: "ข้อมูล ณ {time}", allCompanies: "ทุกบริษัท", custodianAssigned: "มีผู้ถือครอง", waitingTitle: "งานที่รอคุณ",
    noDueRound: "ไม่มีรอบตรวจนับที่ถึงกำหนดช่วงนี้", noRound: "ไม่มีรอบตรวจนับที่กำลังตรวจ", idleFoot: "ไม่มีความเคลื่อนไหวเกิน 180 วัน {count}", responsibilityFoot: "ยังไม่มีผู้รับผิดชอบ {count}",
    oldestFoot: "ค้างนานสุด {days} วัน", auditFoot: "ตรวจแล้ว {processed} / {expected} · ควรถึง {pace}", waitingZero: "ไม่มีงานค้าง: {kinds}",
    statusTitle: "ตามสถานะ", statusSegmentTitle: "{status} {count} รายการ · {note}", crossScopeLine: "นอกขอบเขตเจ้าของรหัส {count} รายการ",
  }
  for (const [key, value] of Object.entries(thai)) assert.equal(th[key], value, `th dashboard.${key}`)
  for (const key of Object.keys(thai)) assert.equal(typeof en[key], "string", `en dashboard.${key}`)
  for (const key of WAITING_WORK_KEYS) {
    assert.equal(typeof th.waitingNext[key], "string", `th dashboard.waitingNext.${key}`)
    assert.equal(typeof en.waitingNext[key], "string", `en dashboard.waitingNext.${key}`)
  }
  assert.equal(th.waitingNext.stuckRepairs, "บันทึกซ่อม")
  for (const key of ["inUse", "warrantyExpiring", "monthlyTrendTitle", "actionableTitle", "recentActivity", "pendingDisposals"]) assert.equal(th[key], undefined, `dashboard.${key} is gone`)
})

test("ตรวจนับแยกสาขา: eight rows on the desktop, three on the phone, and ดูทุกสาขา while more are left (spec §6.7)", () => {
  const branches = (count: number) => Array.from({ length: count }, (_, index) => ({ branchId: `b${index}`, name: `สาขา ${index}`, processed: 0, expected: 10, behind: true }))
  assert.deepEqual(DASHBOARD_BRANCH_ROW_LIMIT, { desktop: 8, phone: 3 })
  assert.deepEqual(pickDashboardBranchRows(branches(2)), { rows: branches(2), moreOnPhone: false, moreOnDesktop: false })
  assert.deepEqual(pickDashboardBranchRows(branches(5)), { rows: branches(5), moreOnPhone: true, moreOnDesktop: false })
  const nine = pickDashboardBranchRows(branches(9))
  assert.deepEqual([nine.rows.length, nine.moreOnPhone, nine.moreOnDesktop], [8, true, true])
})

test("ล่าสุด: the time today, เมื่อวาน, else the date, in Bangkok days (spec §6.8; bangkokDayDiff, R1)", () => {
  const now = new Date("2026-10-25T15:00:00Z") // 22:00 in Bangkok
  assert.deepEqual(formatRecentTime(new Date("2026-10-25T14:40:00Z"), now, "th"), { kind: "time", text: "21:40" })
  assert.deepEqual(formatRecentTime(new Date("2026-10-24T20:00:00Z"), now, "th"), { kind: "time", text: "03:00" }, "03:00 on the 25th in Bangkok")
  assert.deepEqual(formatRecentTime(new Date("2026-10-24T16:59:00Z"), now, "en"), { kind: "yesterday" }, "23:59 on the 24th in Bangkok")
  assert.deepEqual(formatRecentTime(new Date("2026-10-24T10:00:00Z"), now, "th"), { kind: "yesterday" })
  assert.deepEqual(formatRecentTime(new Date("2026-10-23T10:00:00Z"), now, "th"), { kind: "date", text: "23 ต.ค." })
  assert.deepEqual(formatRecentTime(new Date("2025-12-30T10:00:00Z"), now, "en"), { kind: "date", text: "30 Dec 2025" })
})

test("ตรวจนับแยกสาขา: a pace bar per branch, the legend, the behind text with its icon, the branch links narrowed to the chosen company, the rounds in progress as a link without a number, and the no-round state (spec §6.7; R13, R15, R16)", () => {
  const source = page()
  assert.match(source, /pickDashboardBranchRows\(overview\.audit\.branches\)/)
  assert.match(source, /buildAuditRoundItemsHref\(locale, round\.id, \{ branchId: branch\.branchId, companyId: companyId \?\? undefined \}\)/)
  assert.match(source, /const branchValue = auditPercent\(branch\.processed, branch\.expected\) \/ 100/)
  assert.match(source, /pace=\{overview\.audit\.pace\}/)
  assert.match(source, /behind=\{branch\.behind\}/)
  assert.match(source, /t\("branchBarLabel", \{ branch: branch\.name, /, "the overview names the branch (company code / branch under ทุกบริษัท)")
  assert.match(source, /\{t\("legendPace"\)\}/)
  assert.match(source, /\{t\("branchBehind"\)\}/)
  assert.match(source, /toneIcons\.warning/)
  assert.match(source, /index >= DASHBOARD_BRANCH_ROW_LIMIT\.phone && "max-md:hidden"/)
  assert.match(source, /overview\.audit\.otherOpen > 0 \? \(\s*<Link href=\{`\/\$\{locale\}\/audit\/rounds\?view=open`\}/)
  assert.match(source, /\{t\("allOpenRounds"\)\}/)
  assert.doesNotMatch(source, /formatCount\(overview\.audit\.otherOpen\)|otherOpenRounds|viewRounds/, "the other rounds are never a number")
  assert.equal(source.match(/t\(overview\.audit\.otherOpen > 0 \? "noDueRound" : "noRound"\)/g)?.length, 2, "the KPI and the section")
})

test("ล่าสุด: five asset events for asset:view, on the desktop only, the document linked only for those who may open it, with no link to every movement (spec §6.8)", () => {
  const source = page()
  assert.match(source, /canViewAssets \? getRecentAssetEvents\(5\) : Promise\.resolve\(\[\]\)/)
  assert.match(source, /tAll\(assetMovementLabelKey\(event\.movementType\)\)/)
  assert.match(source, /formatRecentTime\(event\.performedAt, now, locale\)/)
  assert.match(source, /<time dateTime=\{event\.performedAt\.toISOString\(\)\}/)
  assert.match(source, /hasPermission\(user, ASSET_MOVEMENT_DOCUMENT_PERMISSION\[event\.document\.kind\]\.module, "view"\)/)
  assert.match(source, /buildAssetMovementDocumentHref\(locale, event\.document\)/)
  assert.match(source, /key === "recent" && "max-md:hidden"/)
  assert.doesNotMatch(source, /\/admin\/logs|systemLog|crossScopeViewAll/)
  assert.equal(source.match(/description=\{companyId \? t\("allCompanies"\) : undefined\}/g)?.length, 2, "งานที่รอคุณ and ล่าสุด say ทุกบริษัท while a company is chosen (R26)")
})
