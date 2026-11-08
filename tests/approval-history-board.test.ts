import assert from "node:assert/strict"
import { existsSync, readFileSync } from "node:fs"
import test from "node:test"

import { approvalDecisionModuleFilters } from "../src/lib/approval-decision-log.ts"

// Page group 12 plan 2 task 4 (spec §5, board AD-ApprovalHistory): /admin/approvals/history gets a breadcrumb, chips
// whose counts follow ผู้ตัดสินใจ and ช่วงวันที่, rows grouped under Bangkok days, and Thai detail with an "open record"
// link. Sources are read with LF line endings, so the regexes may contain \n.
const read = (path: string) => (existsSync(path) ? readFileSync(path, "utf8").replace(/\r\n/g, "\n") : "")
const D = "src/app/[locale]/(dashboard)/"
const pagePath = `${D}admin/approvals/history/page.tsx`
const actorFilterPath = "src/components/admin/approvals/approval-actor-filter.tsx"
const rowPath = "src/components/admin/approvals/approval-decision-row.tsx"
type Messages = { approvalHistoryPage: Record<string, string> }
const th = JSON.parse(readFileSync("messages/th.json", "utf8")) as Messages
const en = JSON.parse(readFileSync("messages/en.json", "utf8")) as Messages

test("chip counts apply actor and date", () => {
  const page = read(pagePath)
  // One permission rule for everything: repair-close history only with maintenance:edit.
  assert.match(page, /const decisionAccess = \{ access, canSeeRepairCloseHistory: hasPermission\(user, "maintenance", "edit"\) \}/)
  const scope = "actorId: filters\\.actorId, dateFrom: filters\\.dateFrom, dateTo: filters\\.dateTo"
  assert.match(page, new RegExp(`const where = buildApprovalDecisionLogWhere\\(\\{ \\.\\.\\.decisionAccess, module: filters\\.module, decision: filters\\.decision, ${scope} \\}\\)`))
  assert.match(page, new RegExp(`const countWhere = buildApprovalDecisionLogWhere\\(\\{ \\.\\.\\.decisionAccess, module: "all", decision: "all", ${scope} \\}\\)`))
  assert.match(page, /prisma\.systemLog\.groupBy\(\{ by: \["module", "action"\], where: countWhere, _count: \{ _all: true \} \}\)/)
  assert.match(page, /const chipCounts = summarizeApprovalDecisionChipCounts\(decisionCounts, filters\.module, filters\.decision\)/)
  assert.match(page, /count: chipCounts\.module\[filter\]/)
  assert.match(page, /count: chipCounts\.decision\[filter\]/)
  // The actor list: everyone with a decision row the viewer may see, through the same permission where.
  assert.match(page, /const allowedWhere = buildApprovalDecisionLogWhere\(\{ \.\.\.decisionAccess, module: "all", decision: "all" \}\)/)
  assert.match(page, /prisma\.user\.findMany\(\{\n\s+where: \{ systemLogs: \{ some: allowedWhere \} \},/)
  // The chips carry the numbers; the strip is gone.
  assert.doesNotMatch(page, /<StatStrip\b|summarizeApprovalDecisionCounts/)
  assert.deepEqual(approvalDecisionModuleFilters, ["all", "disposal", "audit", "maintenance"], "board order: ทั้งหมด · ตัดจำหน่าย · ตรวจนับ · ซ่อมบำรุง")
})

test("the filters: a searchable ผู้ตัดสินใจ chip and the date chip with presets, in one GET form that keeps the tabs", () => {
  const page = read(pagePath)
  const actor = read(actorFilterPath)
  assert.match(actor, /^"use client"/)
  assert.match(actor, /<FilterMenuChip\n\s+searchable\n/)
  assert.match(actor, /<input ref=\{inputRef\} type="hidden" name="actorId" value=\{chosen\} disabled=\{!chosen\} \/>/)
  assert.match(actor, /input\.form\?\.requestSubmit\(\)/)
  assert.match(page, /<ApprovalActorFilter value=\{filters\.actorId \?\? ""\} options=\{actorOptions\}/)
  assert.match(page, /<RepairDateRangeChip\n\s+key=\{`\$\{filters\.dateFrom \?\? ""\}\|\$\{filters\.dateTo \?\? ""\}`\}\n\s+formId=\{FILTER_FORM_ID\}/)
  assert.match(page, /presets=\{presets\}/)
  assert.match(page, /const range = presetRange\(preset, now\)/)
  // The form carries the chosen tabs and the page size, so choosing an actor or dates keeps them.
  assert.match(page, /filters\.module !== "all" \? <input type="hidden" name="module" value=\{filters\.module\} \/> : null/)
  assert.match(page, /filters\.decision !== "all" \? <input type="hidden" name="decision" value=\{filters\.decision\} \/> : null/)
  // A tab keeps the actor and the dates, goes back to page 1 and keeps the page size.
  assert.match(page, /href: hrefFor\(\{ \.\.\.filters, \[param\]: option\.key \}, \{ pageSize \}\)/)
  assert.match(page, /const search = buildApprovalHistoryQuery\(next, page\)/)
  assert.match(page, /<TabNav\n\s+aria-label=\{label\}/)
})

test("rows: day groups, the document number, the asset name before its tag, the decision and the time; Thai detail with an open-record link", () => {
  const page = read(pagePath)
  const row = read(rowPath)
  assert.match(page, /const groups = groupDecisionsByDay\(items, now\)/)
  assert.match(page, /group\.key === "today" \? `\$\{t\("today"\)\} · \$\{date\}` : group\.key === "yesterday" \? `\$\{t\("yesterday"\)\} · \$\{date\}` : date/)
  assert.match(page, /time: formatHistoryTime\(item\.createdAt\)/)
  assert.match(page, /decisionLabel: t\(`filter_decision_\$\{item\.decision\}`\)/)
  assert.match(row, /^"use client"/)
  assert.match(row, /<StatusBadge label=\{row\.decisionLabel\} tone=\{row\.tone\} \/>/)
  // The document number (linked), then the asset name before its tag.
  assert.match(row, /\{row\.record\.assetName\} <span className="tag">\{row\.record\.assetTag\}<\/span>/)
  assert.match(row, /<Chip>\{row\.moduleLabel\}<\/Chip>/)
  assert.match(row, /aria-expanded=\{open\}/)
  assert.match(row, /aria-controls=\{detailId\}/)
  assert.match(row, /<DataTable caption=\{labels\.viewDetails\}>/)
  assert.match(row, /\{row\.href \? \(\n\s+<Link href=\{row\.href\} className=\{linkVariants\(\{ size: "inherit" \}\)\}>\n\s+\{row\.openRecordLabel\}/)
  assert.doesNotMatch(row, /<table\b|<thead\b|<th\b|rounded-full|hover:underline|bg-(?:success|warning|danger|primary)-soft/)
  for (const messages of [th, en]) {
    for (const key of ["today", "yesterday", "hideDetails", "newestFirst", "actorAll", "actorSearch", "actorEmpty", "openRecord_disposal", "openRecord_maintenance", "openRecord_auditFinding", "openRecord_auditRound"]) {
      assert.equal(typeof messages.approvalHistoryPage[key], "string", key)
    }
  }
  assert.equal(th.approvalHistoryPage.today, "วันนี้")
  assert.equal(th.approvalHistoryPage.yesterday, "เมื่อวาน")
  assert.equal(th.approvalHistoryPage.hideDetails, "ซ่อนรายละเอียด")
  assert.equal(th.approvalHistoryPage.actorAll, "ทุกคน")
  assert.equal(th.approvalHistoryPage.openRecord_auditFinding, "เปิดรายการไม่ตรง")
})

test("kept: breadcrumb back to inbox, paging, empty state", () => {
  const page = read(pagePath)
  assert.match(page, /breadcrumbs=\{\[\{ label: t\("breadcrumbInbox"\), href: `\/\$\{locale\}\/admin\/approvals` \}, \{ label: t\("breadcrumbHistory"\) \}\]\}/)
  assert.match(page, /back=\{<PageBackLink href=\{`\/\$\{locale\}\/admin\/approvals`\} label=\{t\("backToInbox"\)\} \/>\}/)
  assert.equal(th.approvalHistoryPage.breadcrumbInbox, "งานรออนุมัติ")
  assert.equal(th.approvalHistoryPage.breadcrumbHistory, "ประวัติการตัดสินใจ")
  assert.equal(th.approvalHistoryPage.backToInbox, "กลับไปงานรออนุมัติ")
  // Real pages, the page sizes, the last-page redirect and the timed queries.
  assert.match(page, /await withPerformanceTiming\("approval-history\.list-data", \(\) => Promise\.all\(\[\n\s+prisma\.systemLog\.findMany\(\{[\s\S]*?orderBy: \[\{ createdAt: "desc" \}, \{ id: "asc" \}\],\n\s+skip,\n\s+take,\n\s+\}\),\n\s+prisma\.systemLog\.count\(\{ where \}\),/)
  assert.match(page, /const lastPage = lastListPage\(total, listPage\.pageSize\)\n\s+if \(logs\.length === 0 && total > 0 && listPage\.page > lastPage\) \{\n\s+redirect\(/)
  assert.match(page, /<Pagination\b/)
  assert.match(page, /pageSizes=\{LIST_PAGE_SIZES\.map/)
  // The empty state, and its words.
  assert.match(page, /<ActionEmptyState\n\s+icon=\{<History className="h-6 w-6" \/>\}\n\s+title=\{t\("emptyTitle"\)\}/)
  // The record links: the presenter's href.
  assert.match(page, /href: item\.href,/)
})
