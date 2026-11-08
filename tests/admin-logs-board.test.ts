import assert from "node:assert/strict"
import { existsSync, readFileSync } from "node:fs"
import test from "node:test"

import {
  splitAssetRecordLabel,
  systemLogEventDetail,
  systemLogIntegrationClientIds,
  systemLogUserLabel,
} from "../src/lib/system-log-row.ts"

// Page group 12 plan 2 task 3 (spec §4, §15 items 5, 6, 9; board AD-Logs): /admin/logs finds an asset's history by its
// tag, filters by user and Bangkok date range, has Thai module and action selects, and shows five columns whose rows
// expand. Sources are read with LF line endings, so the regexes may contain \n.
const read = (path: string) => (existsSync(path) ? readFileSync(path, "utf8").replace(/\r\n/g, "\n") : "")
const D = "src/app/[locale]/(dashboard)/"
const pagePath = `${D}admin/logs/page.tsx`
const barPath = "src/components/admin/logs/log-filters-bar.tsx"
const userFilterPath = "src/components/admin/logs/log-user-filter.tsx"
const rowPath = "src/components/admin/logs/log-event-row.tsx"
const chipPath = "src/components/maintenance/repair-date-range-chip.tsx"
const th = JSON.parse(readFileSync("messages/th.json", "utf8")) as { systemLogPage: Record<string, string> }
const en = JSON.parse(readFileSync("messages/en.json", "utf8")) as { systemLogPage: Record<string, string> }

test("tag lookup caps and links", () => {
  const page = read(pagePath)
  // Assets first (exact or prefix), one more than the cap so the page knows it was cut; never a LIKE over log values.
  assert.match(page, /prisma\.asset\.findMany\(\{\n\s+where: \{ OR: \[\{ assetTag: filters\.tag \}, \{ assetTag: \{ startsWith: filters\.tag \} \}\] \},\n\s+select: \{ id: true, assetTag: true, name: true \},/)
  assert.match(page, /take: TAG_MATCH_CAP \+ 1,/)
  assert.match(page, /const tagCapped = found !== null && found\.length > TAG_MATCH_CAP/)
  assert.match(page, /found\.slice\(0, TAG_MATCH_CAP\)/)
  assert.match(page, /const where = systemLogWhere\(filters, matchedAssets \? matchedAssets\.map\(\(asset\) => asset\.id\) : null\)/)
  assert.doesNotMatch(page, /oldValue: \{ contains|newValue: \{ contains|remark: \{ contains/)
  // The cap note, the nothing-found empty state and the single-match header with its link to the asset's history tab.
  assert.match(page, /t\("tagCapNote", \{ count: TAG_MATCH_CAP \}\)/)
  assert.match(page, /tagNotFound \? t\("tagNotFound"\)/)
  assert.match(page, /const singleMatch = matchedAssets\?\.length === 1 \? matchedAssets\[0\] : null/)
  assert.match(page, /t\("tagSingleMatch", \{ name: singleMatch\.name, tag: singleMatch\.assetTag \}\)/)
  assert.match(page, /href=\{buildAssetDetailViewHref\(locale, singleMatch\.id, "history"\)\}/)
  assert.match(page, /\{t\("assetHistoryLink"\)\}/)
  assert.equal(th.systemLogPage.tagCapNote, "แสดงเฉพาะ {count, number} รายการแรกที่ตรง")
  assert.equal(th.systemLogPage.tagNotFound, "ไม่พบทรัพย์สินรหัสนี้")
  assert.equal(th.systemLogPage.tagSingleMatch, "{name} · {tag}")
  assert.equal(th.systemLogPage.assetHistoryLink, "ดูประวัติทุกเรื่องของทรัพย์สินนี้")
  assert.equal(th.systemLogPage.tagSearch, "ค้นหารหัสทรัพย์สิน")
  assert.match(en.systemLogPage.tagCapNote, /\{count, plural,/)
  // The bar's tag input is part of the one GET form.
  assert.match(read(barPath), /name="tag"/)
})

test("integration rows fall back to the client id", () => {
  const labels = { system: "ระบบ · งานตามเวลา", integration: (client: string) => `Integration API · ${client}` }
  const names = new Map([["erp", "ERP กลาง"]])
  const base = { module: "integration_api", recordId: "erp", user: null }
  assert.equal(systemLogUserLabel(base, names, labels), "Integration API · ERP กลาง")
  // The client was removed or renamed away: the raw client id shows.
  assert.equal(systemLogUserLabel({ ...base, recordId: "old-client" }, names, labels), "Integration API · old-client")
  // A row with no user outside the integration API is a scheduled job.
  assert.equal(systemLogUserLabel({ module: "employee", recordId: null, user: null }, names, labels), "ระบบ · งานตามเวลา")
  // A user wins, also on integration_api rows (an admin managing clients).
  assert.equal(systemLogUserLabel({ ...base, user: { displayName: "สมชาย", username: "somchai" } }, names, labels), "สมชาย")
  assert.equal(systemLogUserLabel({ ...base, user: { displayName: null, username: "somchai" } }, names, labels), "somchai")
  // Client ids come only from integration rows with no user, once each.
  assert.deepEqual(
    systemLogIntegrationClientIds([
      base,
      { ...base },
      { ...base, recordId: "b" },
      { ...base, recordId: "c", user: { displayName: "x", username: "x" } },
      { module: "asset", recordId: "d", user: null },
    ]),
    ["erp", "b"],
  )
  // One query for the clients on the page.
  const page = read(pagePath)
  assert.match(page, /prisma\.integrationApiClient\.findMany\(\{ where: \{ clientId: \{ in: integrationClientIds \} \}, select: \{ clientId: true, displayName: true \} \}\)/)
  assert.equal(th.systemLogPage.userSystemRow, "ระบบ · งานตามเวลา")
  assert.equal(th.systemLogPage.userIntegrationRow, "Integration API · {client}")
})

test("the approval link shows only with approval access", () => {
  const page = read(pagePath)
  assert.match(page, /const user = await requirePagePermission\(locale, "system", "view"\)/)
  assert.match(page, /const canSeeApprovalHistory = getApprovalInboxAccess\(user\)\.canAnyApproval/)
  assert.match(page, /canSeeApprovalHistory \? \(\n\s+<Link href=\{`\/\$\{locale\}\/admin\/approvals\/history`\}/)
  assert.equal(th.systemLogPage.approvalHistoryLink, "ประวัติการตัดสินใจอนุมัติ")
})

test("five columns with an expand button carrying aria-expanded", () => {
  const page = read(pagePath)
  assert.equal(page.match(/<DataTableHead\b/g)?.length, 5, "เวลา · ผู้ใช้ · เหตุการณ์ · โมดูล · expand")
  for (const key of ["time", "user", "event", "module"]) assert.match(page, new RegExp(`<DataTableHead[^>]*>\\{t\\("${key}"\\)\\}</DataTableHead>`))
  assert.match(page, /<DataTableHead hideLabel>\{t\("detail"\)\}<\/DataTableHead>/)
  assert.match(page, /<TableEmptyRow colSpan=\{5\}>/)
  assert.match(page, /<LogEventRow\b/)
  assert.match(page, /<LogEventCard\b/)
  const row = read(rowPath)
  assert.match(row, /^"use client"/)
  assert.match(row, /aria-expanded=\{open\}/)
  assert.match(row, /aria-controls=\{controls\}/)
  assert.equal(row.match(/controls=\{detailId\}/g)?.length, 2, "the row and the phone card")
  assert.match(row, /<td id=\{detailId\} colSpan=\{5\}/)
  // The expanded part keeps the before/after table, the remark and, for assets, the asset page link.
  assert.match(row, /<DataTable caption=\{labels\.changesCaption\}>/)
  assert.match(row, /labels\.remark/)
  assert.match(row, /log\.assetHref \?/)
  assert.match(row, /\{labels\.openAsset\}/)
  // The event: action label, then the record (asset name before its tag, linked with an href), then the detail.
  assert.match(row, /<span className="font-semibold text-foreground">\{log\.actionLabel\}<\/span>/)
  assert.match(row, /log\.href \? \(/)
  assert.doesNotMatch(row, /dark:|#[0-9a-fA-F]{3,6}\b|rgba?\(/)
  assert.equal(th.systemLogPage.time, "เวลา")
  assert.equal(th.systemLogPage.event, "เหตุการณ์")
  assert.equal(th.systemLogPage.openAsset, "เปิดหน้าทรัพย์สิน")
  assert.equal(th.systemLogPage.headerLine, "{range} · {count, number} รายการ · ใหม่สุดก่อน")
  assert.match(en.systemLogPage.headerLine, /\{count, plural,/)
})

test("the event sentence puts the asset name before its tag and drops what the summary repeats", () => {
  assert.deepEqual(splitAssetRecordLabel("GRL-COM-26-0017 - Notebook Lenovo ThinkPad E14"), { tag: "GRL-COM-26-0017", name: "Notebook Lenovo ThinkPad E14" })
  assert.deepEqual(splitAssetRecordLabel("A - B - C"), { tag: "A", name: "B - C" })
  assert.equal(splitAssetRecordLabel("GRL-COM-26-0017"), null)
  assert.equal(systemLogEventDetail("แก้ไข GRL-1 - PC: ราคา จาก 1 เป็น 2", "GRL-1 - PC"), "ราคา จาก 1 เป็น 2")
  assert.equal(systemLogEventDetail("รับคืนทรัพย์สิน GRL-1 - PC จาก ก ไปยัง ข", "GRL-1 - PC"), "จาก ก ไปยัง ข")
  assert.equal(systemLogEventDetail("สร้างทรัพย์สิน GRL-1 - PC", "GRL-1 - PC"), "")
  assert.equal(systemLogEventDetail("ส่งสรุป 3 รายการ", "สรุปแจ้งเตือน 2026-11-08"), "ส่งสรุป 3 รายการ")
  assert.equal(systemLogEventDetail("x", "-"), "x")
})

test("the user filter is searchable, lists every user, and puts the two fixed options first", () => {
  const filter = read(userFilterPath)
  assert.match(filter, /^"use client"/)
  assert.match(filter, /<FilterMenuChip\n\s+searchable/)
  assert.match(filter, /\{ value: LOG_USER_SYSTEM, label: labels\.system \},\n\s+\{ value: LOG_USER_INTEGRATION, label: labels\.integration \},\n\s+\.\.\.options,/)
  assert.match(filter, /<input ref=\{inputRef\} type="hidden" name="userId"/)
  const page = read(pagePath)
  assert.match(page, /prisma\.user\.findMany\(\{ select: \{ id: true, username: true, displayName: true \}, orderBy: \{ username: "asc" \} \}\)/)
  assert.match(page, /label: `\$\{item\.displayName \?\? item\.username\} · \$\{item\.username\}`/)
  assert.equal(th.systemLogPage.userSystemOption, "ระบบ (งานตามเวลา)")
  assert.equal(th.systemLogPage.userIntegrationOption, "Integration API")
})

test("module and action are Thai selects whose values stay codes", () => {
  const bar = read(barPath)
  assert.match(bar, /<FilterSelect\n\s+label=\{labels\.module\}\n\s+name="module"/)
  assert.match(bar, /<FilterSelect\n\s+label=\{labels\.action\}\n\s+name="action"/)
  const page = read(pagePath)
  assert.match(page, /codeOptions\(systemLogMessages, "module_", filters\.module\)/)
  assert.match(page, /codeOptions\(systemLogMessages, "action_", filters\.action\)/)
})

test("the date chip keeps the repair list unchanged", () => {
  const chip = read(chipPath)
  assert.match(chip, /presets\?: \{ key: string; label: string; href: string; active: boolean \}\[\]/)
  assert.match(chip, /\{presets && presets\.length > 0 \? \(/)
  // The repair list and the disposal queue pass no presets.
  assert.doesNotMatch(read(`${D}maintenance/page.tsx`), /presets=/)
  // The logs bar passes วันนี้ · 7 วัน · 30 วัน from presetRange (Bangkok days).
  assert.match(read(barPath), /presets=\{presets\}/)
  assert.match(read(pagePath), /presetRange\(preset, now\)/)
  assert.equal(th.systemLogPage.presetToday, "วันนี้")
  assert.equal(th.systemLogPage.preset7d, "7 วัน")
  assert.equal(th.systemLogPage.preset30d, "30 วัน")
  assert.equal(th.systemLogPage.rangeAll, "ทั้งหมด")
})

test("kept: quick tabs, recordId chip, paging, last-page redirect, perf timing", () => {
  const page = read(pagePath)
  assert.match(page, /<TabNav\n\s+aria-label=\{t\("quickFilters"\)\}/)
  const quickFilterHref = page.slice(page.indexOf("const quickFilterHref"), page.indexOf("const where"))
  assert.match(quickFilterHref, /if \(filters\.recordId\) params\.set\("recordId", filters\.recordId\)/)
  assert.match(quickFilterHref, /appendListPage\(params, \{ pageSize: listPage\.pageSize \}\)/)
  assert.match(page, /key: "recordId"/)
  assert.match(page, /href: listHref\(\{ pageSize: listPage\.pageSize, recordId: null \}\)/)
  assert.match(page, /pageSizes=\{LIST_PAGE_SIZES\.map\(\(value\) => \(\{ value, href: listHref\(\{ pageSize: value \}\) \}\)\)\}/)
  assert.match(page, /const lastPage = lastListPage\(total, listPage\.pageSize\)\n\s+if \(logs\.length === 0 && total > 0 && listPage\.page > lastPage\) \{\n\s+redirect\(/)
  assert.match(page, /await withPerformanceTiming\("admin-logs\.list-data", \(\) => Promise\.all\(\[/)
  assert.match(page, /await requirePagePermission\(locale, "system", "view"\)/)
  const bar = read(barPath)
  assert.match(bar, /\{pageSize !== LIST_PAGE_SIZES\[0\] \? <input type="hidden" name="pageSize" value=\{pageSize\} \/> : null\}/)
  assert.match(bar, /\{recordId \? <input type="hidden" name="recordId" value=\{recordId\} \/> : null\}/)
})

// Task 5: the E2E spec (e2e/admin/logs.spec.ts) reads the app's own words, opens the logs page with the seed admin's
// saved session (no run role holds system:view) and approval history as the run IT head, and writes only the run asset.
// These pins need no app.
test("the logs E2E spec reads the app's words and writes only the run asset", async () => {
  const { LOGS_WORDS: W, APPROVAL_HISTORY_WORDS: A } = await import("../e2e/admin/logs-words.ts")
  const all = JSON.parse(readFileSync("messages/th.json", "utf8")) as Record<string, Record<string, string>>
  const log = all.systemLogPage
  assert.equal(W.title, log.title)
  assert.equal(W.filterForm, log.filterLabel)
  assert.equal(W.tagSearch, log.tagSearch)
  assert.equal(W.submit, log.filter)
  assert.equal(W.tagNotFound, log.tagNotFound)
  assert.equal(W.tagSingleMatch, log.tagSingleMatch)
  assert.equal(W.assetHistoryLink, log.assetHistoryLink)
  assert.equal(W.headerLine, log.headerLine)
  assert.equal(W.rangeAll, log.rangeAll)
  assert.equal(W.rangeBetween, log.rangeBetween)
  assert.equal(W.actionCreate, log.action_create)
  assert.equal(W.expandRow, log.expandRow)
  assert.equal(W.collapseRow, log.collapseRow)
  assert.equal(W.changesCaption, log.changesCaption)
  assert.equal(W.before, log.before)
  assert.equal(W.after, log.after)
  assert.equal(W.user, log.user)
  assert.equal(W.userAll, log.userAll)
  assert.equal(W.userSearch, log.userSearch)
  assert.equal(W.emptyFiltered, log.emptyFiltered)
  assert.equal(W.dateRange, log.dateRange)
  assert.equal(W.dateRangeApplied, log.dateRangeApplied)
  assert.equal(W.presetToday, log.presetToday)
  const history = all.approvalHistoryPage
  assert.equal(A.title, history.title)
  assert.equal(A.breadcrumb, all.common.breadcrumb)
  assert.equal(A.breadcrumbInbox, history.breadcrumbInbox)
  assert.equal(A.breadcrumbHistory, history.breadcrumbHistory)
  assert.equal(A.actor, history.actor)
  assert.equal(A.actorAll, history.actorAll)
  assert.equal(A.today, history.today)
  assert.equal(A.emptyTitle, history.emptyTitle)

  const spec = read("e2e/admin/logs.spec.ts")
  assert.ok(spec.includes(`from "../support/fixtures.ts"`) && !spec.includes(`from "@playwright/test"`), "the suite's fixtures")
  assert.ok(spec.includes("test.use({ storageState: fromRoot(ADMIN_STATE_FILE) })"), "the seed admin's saved session")
  assert.ok(spec.includes(`asUser("itHead")`), "approval history as the run IT head")
  assert.ok(spec.includes(`import { recordSettled } from "../audit/settle.ts"`) && !spec.includes("measure.recordPage("), "axe through recordSettled")
  // The one write: createTxAsset (POST /api/assets inside tx-support). No other request, no DELETE, no settings, no LDAP.
  assert.equal([...spec.matchAll(/createTxAsset\(/g)].length, 1, "called once")
  assert.doesNotMatch(spec, /\.request\.|\.(?:post|put|patch|delete)\(|method:\s*["'`]|signInOnce\(|ldap-(?:sync|test)|\/api\/admin\/settings|admin\/settings/)
})
