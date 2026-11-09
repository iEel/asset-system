import assert from "node:assert/strict"
import { existsSync, readFileSync } from "node:fs"
import test from "node:test"

const queuePath = "src/app/[locale]/(dashboard)/disposal/page.tsx"
const batchHistoryPath = "src/app/[locale]/(dashboard)/disposal/batches/page.tsx"

test("disposal queue keeps batch context and exposes batch history", () => {
  const page = readFileSync(queuePath, "utf8")

  assert.doesNotMatch(page, /omit:\s*\{\s*batchId:\s*true\s*\}/)
  assert.match(page, /batch:\s*\{\s*select:\s*\{\s*id:\s*true,\s*batchNo:\s*true\s*\}\s*\}/)
  assert.match(page, /\/disposal\/batches`/)
  assert.ok(existsSync(batchHistoryPath))
})

test("disposal queue communicates range, date errors, compact mobile detail, and sticky actions", () => {
  const page = readFileSync(queuePath, "utf8")

  assert.match(page, /getDisposalDateRangeError/)
  assert.match(page, /resultRange/)
  assert.match(page, /<details/)
  // Group 6 plan 4 Task 3: the next-step column names itself ขั้นถัดไป (board DP-Queue).
  assert.match(page, /<DataTableHead align="right" sticky="right">\{t\("queue\.colNext"\)\}<\/DataTableHead>/, "the next-step column stays pinned to the right (DataTable sticky, spec 2B §3.4)")
  assert.match(page, /<DataTableCell align="right" sticky="right">/)
  assert.match(page, /const filterFormProps = \{ locale, filters, hasActiveFilters, clearHref, t, tCommon \}/)
})

// Group 6 plan 2 Task 3 (spec §10.2, decision 3, ruling P2-R2): bulk approval moved to the approvals page. The pending
// tab has no ticks; each row links to its item there, and a note above the table counts what the viewer may decide.
test("the pending tab links each request to the approvals page, with no ticks and no bulk approval provider", () => {
  const page = readFileSync(queuePath, "utf8")

  assert.doesNotMatch(page, /DisposalBulkApproval|bulkApprovalCopy|bulkApprovalEnabled|disposal-bulk-approval"/)
  assert.equal(existsSync("src/components/disposal/disposal-bulk-approval.tsx"), false, "the provider is deleted once nothing imports it")
  assert.match(page, /const pendingInboxEnabled = canApprove && filters\.status === "pending"/)
  assert.equal(page.match(/approvalInboxItemHref\(locale, "disposal", request\.id\)/g)?.length, 2, "the phone card and the table row")
  assert.match(page, /return reason === "requester" \|\| reason === "creator"/, "the viewer's own request: ดู, with why")
  assert.match(page, /t\("pendingInboxCount", \{ decidable: formatCount\(Math\.max\(0, total - ownPendingCount\)\), total: formatCount\(total\) \}\)/)
  assert.match(page, /href=\{`\/\$\{locale\}\/admin\/approvals\?tab=disposal`\}/)
  assert.match(page, /review: t\("reviewInInbox"\), view: tCommon\("view"\), ownNote: t\("ownRequestNote"\)/)
})

// Group 6 plan 4 (P4-R1): bulk execution is retired; an approved request is recorded only in a disposal round.
test("the queue no longer carries bulk execution or a per-row execution", () => {
  const page = readFileSync(queuePath, "utf8")
  const mobileFilter = page.indexOf("<DisposalFilterForm")
  // One DisposalFilterForm renders twice (spec 2B §5.10 #5): the phone <details> copy first, then the desktop FilterPanel copy.
  const desktopFilter = page.indexOf("<DisposalFilterForm", mobileFilter + 1)

  assert.ok(mobileFilter >= 0 && desktopFilter > mobileFilter, "two DisposalFilterForm call sites")
  assert.doesNotMatch(page, /DisposalBulkExecution|DisposalExecutionButton|bulkExecution/)
  assert.match(page, /asset:\s*\{\s*select:[\s\S]*?status:/)
})

test("disposal messages cover queue states in both locales", () => {
  for (const locale of ["th", "en"] as const) {
    const messages = JSON.parse(readFileSync(`messages/${locale}.json`, "utf8")).disposalPage
    assert.equal(typeof messages.resultRange, "string")
    assert.equal(typeof messages.invalidDateRange, "string")
    assert.equal(typeof messages.batchHistory, "string")
    assert.equal(typeof messages.emptyUnfilteredTitle, "string")
  }
})

test("the pending tab's words exist in Thai and English; the bulk-decision reasons stay for the approvals page", () => {
  const th = JSON.parse(readFileSync("messages/th.json", "utf8")).disposalPage
  assert.equal(th.reviewInInbox, "พิจารณาในงานรออนุมัติ")
  assert.equal(th.ownRequestNote, "คุณเป็นผู้ขอ พิจารณาเองไม่ได้")
  assert.equal(th.pendingInboxCount, "คุณพิจารณาได้ {decidable} จาก {total} รายการ")
  assert.equal(th.pendingInboxLink, "อนุมัติหลายรายการได้ที่งานรออนุมัติ")
  for (const locale of ["th", "en"] as const) {
    const messages = JSON.parse(readFileSync(`messages/${locale}.json`, "utf8")).disposalPage
    for (const key of ["reviewInInbox", "ownRequestNote", "pendingInboxCount", "pendingInboxLink"]) {
      assert.equal(typeof messages[key], "string", `${locale}:${key}`)
    }
    for (const key of ["bulkToolbarLabel", "bulkReviewAndApprove", "bulkPreviewTitle", "bulkSelectPage"]) {
      assert.equal(messages[key], undefined, `${locale}:${key} went with the disposal queue's bulk approval`)
    }
    for (const code of ["DISPOSAL_REQUEST_NOT_FOUND", "DISPOSAL_INVALID_STAGE", "DISPOSAL_SOD_CONFLICT", "DISPOSAL_ASSET_INELIGIBLE", "DISPOSAL_CONCURRENT_UPDATE", "DISPOSAL_FORBIDDEN", "DISPOSAL_APPROVAL_FAILED"]) {
      assert.equal(typeof messages.bulkErrors[code], "string", `${locale}:${code}`)
    }
  }
})

// Group 6 plan 4 Task 3 (spec §10, board DP-Queue): the tabs are the only status filter, six columns, the date chip,
// the header with รอบตัดจำหน่าย and ชุดคำขอ ▾, and the approved tab's ticks across pages up to 200.
const read = (path: string) => readFileSync(path, "utf8").replace(/\r\n/g, "\n")
const SELECTION = "src/components/disposal/disposal-round-selection.tsx"
const ROW_ACTIONS = "src/components/disposal/disposal-row-actions.tsx"

test("the five status tabs with counts are the only status filter: the filter form has no status select", () => {
  const page = read(queuePath)
  assert.match(page, /<TabNav\b/)
  for (const status of ['""', '"pending"', '"approved"', '"disposed"', '"rejected"']) {
    assert.match(page, new RegExp(`\\{ status: ${status}, label: `), `the ${status} tab`)
  }
  const form = page.slice(page.indexOf("function DisposalFilterForm("), page.indexOf("function disposalEmptyState("))
  assert.ok(form.length > 0)
  assert.doesNotMatch(form, /<NativeSelect\b|label=\{tCommon\("status"\)\}|disposalStatusFilters/)
  assert.match(form, /\{filters\.status \? <input type="hidden" name="status" value=\{filters\.status\} \/> : null\}/, "a search keeps the tab")
  assert.match(form, /name="disposalType"/)
  assert.match(form, /<SearchField\b/)
  assert.match(form, /<RepairDateRangeChip\b/)
  assert.doesNotMatch(page, /disposalStatusFilters/)
})

test("the header: ยื่นคำขอตัดจำหน่าย, รอบตัดจำหน่าย, the ชุดคำขอ ▾ menu and ส่งออก for disposal:export", () => {
  const page = read(queuePath)
  const header = page.slice(page.indexOf("<PageHeader"), page.indexOf("{/* A <details> cannot be ContentPanel"))
  assert.match(header, /href=\{`\/\$\{locale\}\/disposal\/new`\}/)
  assert.match(header, /t\("createTitle"\)/)
  assert.match(header, /href=\{`\/\$\{locale\}\/disposal\/rounds`\}/)
  assert.match(header, /t\("queue\.rounds"\)/)
  assert.match(header, /<DisposalBatchMenu\b/)
  assert.match(header, /\{canExport \? \(\n\s+<a href=\{`\/api\/disposal-requests\/export/)
  const menu = read(ROW_ACTIONS)
  assert.match(menu, /export function DisposalBatchMenu\(/)
  assert.match(menu, /<ChevronDown aria-hidden="true" \/>/)
  const th = JSON.parse(read("messages/th.json")).disposalPage
  assert.equal(th.createTitle, "ยื่นคำขอตัดจำหน่าย")
  assert.equal(th.queue.rounds, "รอบตัดจำหน่าย")
  assert.equal(th.queue.batchMenu, "ชุดคำขอ")
  assert.equal(th.queue.batchCreate, "สร้างชุดคำขอ")
  assert.equal(th.batchHistory, "ประวัติชุดคำขอ")
  assert.equal(th.subtitle, "ติดตามคำขอที่รอพิจารณา รอตัดจำหน่าย และรอบตัดจำหน่าย")
  assert.equal(th.searchPlaceholder, "ค้นหาเลขคำขอ ชื่อ รหัส ผู้ขอ")
})

test("six columns: the tick (approved tab), ทรัพย์สิน, เลขที่คำขอ · สถานะ, ประเภท, ผู้ขอ, ขั้นถัดไป", () => {
  const page = read(queuePath)
  const head = page.slice(page.indexOf("<DataTableHeader>"), page.indexOf("</DataTableHeader>"))
  const order = ['t("queue.colSelect")', 't("asset")', 't("queue.colNoStatus")', 't("queue.colType")', 't("requestedBy")', 't("queue.colNext")']
  let at = -1
  for (const label of order) {
    const next = head.indexOf(label)
    assert.ok(next > at, `${label} after the previous column`)
    at = next
  }
  assert.match(head, /\{roundSelectionEnabled \? <DataTableHead hideLabel/)
  assert.doesNotMatch(head, /tCommon\("status"\)|t\("requestDate"\)/, "the status and the date sit under the request number")
  const th = JSON.parse(read("messages/th.json")).disposalPage.queue
  assert.equal(th.colNoStatus, "เลขที่คำขอ · สถานะ")
  assert.equal(th.colType, "ประเภท")
  assert.equal(th.colNext, "ขั้นถัดไป")
  assert.equal(th.noValue, "ไม่มีมูลค่า")
  assert.equal(th.you, "(คุณ)")
  assert.equal(th.ageToday, "วันนี้")
  assert.equal(th.ageDays, "{days} วัน")
})

test("the approved tab renders DisposalRoundSelectionProvider, the ticks, select all and the bar's สร้างรอบตัดจำหน่าย", () => {
  const page = read(queuePath)
  assert.match(page, /const roundSelectionEnabled = canEdit && filters\.status === "approved"/)
  assert.match(page, /<DisposalRoundSelectionProvider\b/)
  assert.match(page, /<DisposalRoundTick\b/)
  assert.match(page, /<DisposalRoundSelectAll\b/)
  assert.match(page, /<DisposalRoundSelectionBar\b/)
  assert.match(page, /getDisposalRoundTickBlocks\(prisma, /, "the reasons come from the round service's own checks")
  assert.match(page, /roundSelectionEnabled && tickBlock \? <p data-disposal-round-block className="[^"]*md:block">\{tickReasons\[tickBlock\]\}<\/p>/, "a disabled tick says why in words under the next step")
  assert.match(page, /disposalRoundSelectionScope\(\{ search: filters\.search, disposalType: filters\.disposalType, dateFrom: filters\.dateFrom, dateTo: filters\.dateTo, auditRound: filters\.auditRound \}\)/)
  assert.match(page, /createHref=\{`\/\$\{locale\}\/disposal\/rounds\/new`\}/)
  assert.doesNotMatch(page, /DisposalBulkExecution|DisposalExecutionButton/)
  const selection = read(SELECTION)
  assert.match(selection, /^"use client"/)
  assert.match(selection, /window\.sessionStorage\.setItem\(disposalRoundSelectionStorageKey, JSON\.stringify\(selection\)\)/)
  assert.match(selection, /router\.push\(createHref\)/)
  assert.match(selection, /<DesktopSelectionBar\b/)
  assert.match(selection, /<ArrowRight aria-hidden="true" \/>/)
  assert.doesNotMatch(selection, /from "@\/(?:lib|components\/approvals)\/approval-inbox-selection"/, "mirrors the inbox selection, does not import it")
  const th = JSON.parse(read("messages/th.json")).disposalPage.queue
  assert.equal(th.roundCreate, "สร้างรอบตัดจำหน่าย {count} รายการ")
  assert.equal(th.roundSelectedCount, "{count} เลือกแล้ว (จากทุกหน้า)")
  assert.equal(th.roundClear, "ล้างรายการเลือก")
  assert.equal(th.roundSelectAll, "เลือกทั้ง {count} รายการที่เลือกได้")
  assert.equal(th.roundTickApprover, "คุณอนุมัติรายการนี้")
  assert.equal(th.roundTickNoEvidence, "ยังไม่มีหลักฐาน")
  assert.equal(th.roundPhoneNote, "สร้างรอบตัดจำหน่ายได้บนคอมพิวเตอร์")
  for (const locale of ["th", "en"] as const) {
    const queue = JSON.parse(read(`messages/${locale}.json`)).disposalPage.queue
    assert.deepEqual(Object.keys(queue).sort(), Object.keys(th).sort(), locale)
  }
})

test("a disabled tick names its reason: the viewer approved it, or it has no evidence (a system admin is let through)", () => {
  const page = read(queuePath)
  assert.match(page, /DISPOSAL_SOD_CONFLICT: t\("queue\.roundTickApprover"\)/)
  assert.match(page, /DISPOSAL_EVIDENCE_REQUIRED: t\("queue\.roundTickNoEvidence"\)/)
  const service = read("src/lib/disposal-round-service.ts")
  assert.match(service, /export async function getDisposalRoundTickBlocks\(/)
  assert.match(service, /useHistoricalEvidenceException: canUseHistoricalDisposalEvidenceException\(actor\.roles\)/)
})

test("the disposed tab shows the round's number, linked, in the next-step column", () => {
  const page = read(queuePath)
  assert.match(page, /round: \{ select: \{ id: true, roundNo: true, executionDate: true \} \}/)
  assert.match(page, /href=\{`\/\$\{locale\}\/disposal\/rounds\/\$\{request\.round\.id\}`\}/)
  assert.match(page, /<span className="tag">\{request\.round\.roundNo\}<\/span>/)
})

test("on the phone the approved tab has no ticks and says where a round is made", () => {
  const page = read(queuePath)
  assert.match(page, /\{roundSelectionEnabled \? <p data-disposal-round-phone-note className="[^"]*md:hidden[^"]*">\{t\("queue\.roundPhoneNote"\)\}<\/p> : null\}/)
  const cards = page.slice(page.indexOf("getMobileCardListClasses()"), page.indexOf("<DataTable "))
  assert.doesNotMatch(cards, /DisposalRoundTick/)
})

test("getDisposalOptions had no caller left and is deleted", () => {
  assert.equal(existsSync("src/lib/disposal-options.ts"), false)
})

// ยืนยันผลตรวจ plan 4 task 2: "มาจากรอบตรวจนับ {auditNo}", a removable chip; the search, the tabs and the export keep it.
test("the audit round filter: read once, a removable chip, kept by the form, counted as a filter, applied by the export", () => {
  const page = read(queuePath)
  assert.match(page, /readAuditRoundFindingIds\(prisma, filters\.auditRound\)/)
  assert.match(page, /prisma\.auditRound\.findUnique\(\{ where: \{ id: filters\.auditRound \}, select: \{ auditNo: true \} \}\)/)
  assert.match(page, /const requestWhere = buildDisposalWhere\(filters, \{ auditRoundFindingIds \}\)/)
  assert.match(page, /const stageWhere = buildDisposalWhere\(\{ \.\.\.filters, status: "" \}, \{ auditRoundFindingIds \}\)/)
  assert.match(page, /t\("filterAuditRound", \{ auditNo: auditRoundFilter\?\.auditNo \?\? filters\.auditRound \}\)/)
  assert.match(page, /buildDisposalQueryString\(filters, \{ auditRound: "", page: 1 \}\)/, "removing the chip keeps the tab and the other filters")
  assert.match(page, /<FilterChipList chips=\{auditRoundChips\} label=\{tAsset\("activeFilters"\)\} removeLabel=\{tAsset\("clearDrilldownFilter"\)\} \/>/)
  assert.match(page, /filters\.dateTo \|\| filters\.auditRound\)/, "a round filter counts for hasActiveFilters")
  const form = page.slice(page.indexOf("function DisposalFilterForm("), page.indexOf("function disposalEmptyState("))
  assert.match(form, /\{filters\.auditRound \? <input type="hidden" name="auditRound" value=\{filters\.auditRound\} \/> : null\}/, "a search keeps the round")
  const route = read("src/app/api/disposal-requests/export/route.ts")
  assert.match(route, /const auditRoundFindingIds = await readAuditRoundFindingIds\(prisma, filters\.auditRound\)/)
  assert.match(route, /where: buildDisposalWhere\(filters, \{ auditRoundFindingIds \}\)/)
  const th = JSON.parse(read("messages/th.json")).disposalPage
  const en = JSON.parse(read("messages/en.json")).disposalPage
  assert.equal(th.filterAuditRound, "มาจากรอบตรวจนับ {auditNo}")
  assert.equal(en.filterAuditRound, "From audit round {auditNo}")
  assert.equal(th.sourceAuditRound, "ตรวจนับ {number}")
  assert.equal(en.sourceAuditRound, "Audit {number}")
})

test("every source label reads disposalSourceLabelKey, so an audit round source has its own words", () => {
  for (const path of [
    "src/app/api/disposal-requests/export/route.ts",
    "src/app/[locale]/(dashboard)/disposal/[id]/page.tsx",
    "src/app/[locale]/(print)/disposal/[id]/print/page.tsx",
    "src/components/approvals/approval-disposal-panel.tsx",
  ]) {
    const source = read(path)
    assert.match(source, /disposalSourceLabelKey\((?:link|sourceLink|panel\.source)\.kind\)/, path)
    assert.doesNotMatch(source, /"sourceAuditFinding"/, path)
  }
})
