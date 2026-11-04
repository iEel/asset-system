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
