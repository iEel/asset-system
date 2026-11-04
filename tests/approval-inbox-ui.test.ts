import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import test from "node:test"

const read = (path: string) => readFileSync(path, "utf8").replace(/\r\n/g, "\n")
const PAGE = "src/app/[locale]/(dashboard)/admin/approvals/page.tsx"
const POLICY = "src/components/approvals/approval-inbox-policy.tsx"

// Group 6 plan 2 Task 2 (spec §7.1–7.3, §7.7): the approvals page as board AP.
test("approvals page: one read model, the strip, tabs, rows and two panes", () => {
  const source = read(PAGE)
  assert.match(source, /getApprovalInboxPage\(/)
  assert.match(source, /<StatStrip\b/)
  assert.match(source, /"data-approval-strip-cell"/)
  assert.match(source, /<TabNav\b[\s\S]*?data-approval-tabs/)
  assert.match(source, /"data-approval-row"/)
  assert.match(source, /<ClickableTableRow\b/)
  assert.match(source, /scroll=\{false\}/)
  assert.match(source, /grid xl:grid-cols-\[minmax\(0,1fr\)_420px\]/)
  assert.match(source, /data-approval-panel/)
  assert.match(source, /<Pagination\b/)
  assert.match(source, /<SearchField\b/)
  assert.match(source, /aria-pressed=/)
  assert.match(source, /hidden xl:block/)
  assert.match(source, /notFound\(\)/)
  assert.match(source, /redirectToLogin\(locale\)/)
  assert.doesNotMatch(source, /take: 50/)
  assert.doesNotMatch(source, /getApprovalInboxSnapshot|sortApprovalInboxItemsByAge|filterApprovalInboxItems/)
})

test("approvals page: the policy panel and approver matrix live only inside the disclosure", () => {
  const source = read(PAGE)
  assert.doesNotMatch(source, /policyTitle|approverMatrixTitle|นโยบายที่ใช้กับ/)
  assert.match(source, /<ApprovalInboxPolicy\b/)
  const policy = read(POLICY)
  assert.match(policy, /<ApprovalInboxPolicyDisclosure\b/)
  assert.match(policy, /t\("policyTitle"\)/)
  assert.match(policy, /t\("approverMatrixTitle"\)/)
  assert.match(policy, /t\("openPolicySettings"\)/)
  assert.doesNotMatch(policy, /"use client"/)
  const disclosure = read("src/components/approvals/approval-inbox-policy-disclosure.tsx")
  assert.match(disclosure, /"use client"/)
  assert.match(disclosure, /<FormDisclosure\b/)
  assert.match(disclosure, /useState\(false\)/)
})

test("approvals page: the block reasons map through one table of message keys", () => {
  const source = read(PAGE)
  assert.match(source, /requester: "blockRequester"/)
  assert.match(source, /creator: "blockCreator"/)
  assert.match(source, /no_employee: "blockNoEmployee"/)
  assert.match(source, /tDisposal\(`errors\.\$\{/)
})

test("approvals page words are in both message files", () => {
  const th = JSON.parse(readFileSync("messages/th.json", "utf8")).approvalInboxPage
  const en = JSON.parse(readFileSync("messages/en.json", "utf8")).approvalInboxPage
  const expected: Record<string, string> = {
    stripOverdue: "เกิน SLA",
    stripOldest: "รอนานสุด",
    stripTotal: "รอทั้งหมด",
    overdueToggle: "เกิน SLA เท่านั้น",
    searchPlaceholder: "ค้นหาชื่อ รหัส เลขที่คำขอ",
    disclosureTitle: "นโยบายและผู้อนุมัติ",
    blockRequester: "คุณเป็นผู้ขอ",
    blockCreator: "คุณสร้างคำขอนี้",
    blockNoEmployee: "บัญชีของคุณยังไม่ผูกกับพนักงาน",
    selfApprovalBadge: "อนุมัติเองไม่ได้",
    noPhoto: "ยังไม่มีรูป",
    dueToday: "ครบ SLA วันนี้",
    emptyTitle: "ไม่มีงานรออนุมัติ",
    emptyFilterTitle: "ไม่พบรายการที่ตรงกับการค้นหา",
    panelEmpty: "เลือกรายการทางซ้ายเพื่อดูรูปและรายละเอียด",
    backToInbox: "กลับไปงานรออนุมัติ",
  }
  for (const [key, value] of Object.entries(expected)) {
    assert.equal(th[key], value, `th ${key}`)
    assert.equal(typeof en[key], "string", `en ${key}`)
  }
  for (const value of Object.values(th)) assert.doesNotMatch(String(value), /Inbox/i)
})

// Group 6 plan 2 Task 3 (spec §7.4): the ticks, the selection kept across pages, the bar and the bulk approve.
const SELECTION = "src/components/approvals/approval-inbox-selection.tsx"

test("approvals page: the selection provider wraps the list column, ticks skip close rows, the bar is the column's last child", () => {
  const source = read(PAGE)
  assert.match(source, /<ApprovalInboxSelectionProvider scope=\{approvalInboxSelectionScope\(query\)\} tickable=\{tickable\} titles=\{data\.titles\} copy=\{selectionCopy\}>/)
  assert.match(source, /\{row\.key === "round" \? null : \(\n\s+<ApprovalInboxTick\n\s+kind=\{row\.key\}\n\s+id=\{row\.id\}/)
  assert.match(source, /disabled=\{!row\.tickable\}\n\s+reason=\{block \?\? undefined\}/)
  assert.match(source, /<ApprovalInboxSelectionBar \/>\n\s+<\/ApprovalInboxSelectionProvider>\n\s+<\/div>/)
  assert.match(source, /tDisposal\(`bulkErrors\.\$\{code\}`\)/)
})

test("selection: sessionStorage in try/catch, restored on scope or tickable change, one bar from md, a preview-first confirm", () => {
  const source = read(SELECTION)
  assert.match(source, /^"use client"/)
  assert.equal(source.match(/window\.sessionStorage\./g)?.length, 3, "one read, one write, one remove")
  assert.equal(source.match(/try \{\n\s+(?:return window\.sessionStorage|if \(selection\) window\.sessionStorage)/g)?.length, 2, "every storage access is inside a try")
  assert.match(source, /restoreSelection\(parseStoredSelection\(readStorage\(approvalInboxSelectionStorageKey\)\), scope, JSON\.parse\(tickableKey\) as TickableIds\)/)
  assert.match(source, /\}, \[scope, tickableKey\]\)/)
  assert.match(source, /<DesktopSelectionBar\b/)
  assert.match(source, /<label data-no-row-click [^>]*className=\{`hidden min-h-11 w-11 items-center justify-center md:flex/)
  assert.match(source, /<AccessibleDialog open title=\{fill\(copy\.confirmTitle, \{ count: ids\.length \}\)\}/)
  assert.match(source, /sendBulkDecision\(\{ mode: "preview", requestIds: ids \}, copy\)/)
  assert.match(source, /sendBulkDecision\(\{ mode: "commit", requestIds: eligibleIds, approvalRemark: remark\.trim\(\) \|\| null \}, copy\)/)
  assert.match(source, /runAuditFindingBatchReview\(ids, \{ action: "approve", reviewRemark \}, sendFindingReview,/)
  assert.match(source, /failure\.reason === "assetChanged" \|\| failure\.reason === "alreadyDecided"/, "a 409 or an already-decided finding goes to the panel")
  assert.match(source, /const NOT_OPENED_SHOWN = 8\n/)
  assert.match(source, /maxLength\(values\.approvalRemark, 4000\)/)
  assert.match(source, /router\.refresh\(\)/)
  assert.match(source, /toast\.success\(message\)/)
})

test("selection: the 200 limit matches the bulk-decision schema", async () => {
  const { APPROVAL_INBOX_SELECTION_MAX } = await import("../src/lib/approval-inbox-selection.ts")
  const { MAX_DISPOSAL_BULK_DECISION_ITEMS } = await import("../src/lib/validations/disposal.ts")
  assert.equal(APPROVAL_INBOX_SELECTION_MAX, 200)
  assert.equal(MAX_DISPOSAL_BULK_DECISION_ITEMS, APPROVAL_INBOX_SELECTION_MAX)
})

test("selection: the bar's words are the spec's (§7.4)", () => {
  const th = JSON.parse(readFileSync("messages/th.json", "utf8")).approvalInboxPage
  assert.equal(th.selectionCount, "{count} เลือกแล้ว (จากทุกหน้า) · {kind}")
  assert.equal(th.clearSelection, "ล้างรายการเลือก")
  assert.equal(th.selectionNote, "อนุมัติแบบกลุ่มทำได้ทีละประเภท · คำขอตัดจำหน่ายปฏิเสธทีละรายการเพราะต้องระบุเหตุผล · เลือกได้สูงสุด 200 รายการต่อครั้ง")
  assert.equal(th.selectAllApprovable, "เลือกทั้งหมดที่อนุมัติได้ ({count})")
  assert.equal(th.reviewAndApprove, "ตรวจสอบและอนุมัติ {count} รายการ")
  assert.equal(th.selectionRestarted, "เลือกได้ทีละประเภท · เริ่มเลือกใหม่เป็น{kind}")
  assert.equal(th.bulkTitle, "อนุมัติ {count} รายการ")
  assert.equal(th.bulkNotOpened, "ยังไม่ได้เปิดดูรูป {count} รายการ")
  assert.equal(th.bulkNotOpenedMore, "และอีก {count} รายการ")
  assert.equal(th.bulkConfirm, "อนุมัติ {count} รายการ")
  assert.equal(th.bulkDone, "อนุมัติแล้ว {count} รายการ")
  assert.equal(th.bulkSkipped, "ข้ามไป {count} รายการ")
  assert.equal(th.bulkToPanel, "ต้องตัดสินในแผงด้านขวา {count} รายการ")
})
