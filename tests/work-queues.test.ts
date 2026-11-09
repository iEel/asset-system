import test from "node:test"
import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import {
  ADVANCE_WARNING_KEYS,
  buildWorkQueueSummary,
  queueKeysFor,
  WORK_QUEUES,
} from "../src/lib/work-queues.ts"
import { WAITING_WORK_KEYS, type WaitingWorkCounts, type WaitingWorkKey } from "../src/lib/waiting-work-rules.ts"

const read = (path: string) => readFileSync(path, "utf8").replace(/\r\n/g, "\n")

const zeroCounts = (): WaitingWorkCounts => Object.fromEntries(WAITING_WORK_KEYS.map((key) => [key, 0])) as WaitingWorkCounts

test("the queues and the advance warnings cover every waiting key once (spec §3)", () => {
  assert.deepEqual([...WORK_QUEUES], ["approvals", "maintenance", "audit", "disposal"])
  assert.deepEqual([...ADVANCE_WARNING_KEYS], ["returnsDueSoon", "warrantyExpiringSoon", "licenseExpiringSoon", "consumablesLow"])
  assert.deepEqual([...queueKeysFor("approvals")], ["approvalInbox"])
  assert.deepEqual([...queueKeysFor("maintenance")], ["openRepairs", "stuckRepairs", "duePm"])
  assert.deepEqual([...queueKeysFor("audit")], ["openAuditActions", "auditActionsDueSoon", "pendingAuditFindings"])
  assert.deepEqual([...queueKeysFor("disposal")], ["approvedDisposals", "pendingDisposals"])
  const all = [...WORK_QUEUES.flatMap((queue) => [...queueKeysFor(queue)]), ...ADVANCE_WARNING_KEYS]
  assert.deepEqual([...all].sort(), [...WAITING_WORK_KEYS].sort())
})

test("queues group the keys and sum the backlog", () => {
  const counts = {
    ...zeroCounts(),
    approvalInbox: 19, openRepairs: 7, duePm: 3, openAuditActions: 4, auditActionsDueSoon: 2, approvedDisposals: 3,
    returnsDueSoon: 2, warrantyExpiringSoon: 5, licenseExpiringSoon: 1, consumablesLow: 4,
  }
  // An approver: the inbox holds the findings and the disposals, so their own rows are hidden.
  const visibleKeys: WaitingWorkKey[] = WAITING_WORK_KEYS.filter((key) => key !== "pendingAuditFindings" && key !== "pendingDisposals")
  const summary = buildWorkQueueSummary({ counts, visibleKeys, approvalInbox: { total: 19, disposal: 4, audit: 15, findings: 14, rounds: 1 } })
  assert.deepEqual(summary.queues, [
    { queue: "approvals", count: 19, keys: ["approvalInbox"] },
    { queue: "maintenance", count: 10, keys: ["openRepairs", "stuckRepairs", "duePm"] },
    { queue: "audit", count: 6, keys: ["openAuditActions", "auditActionsDueSoon"] },
    { queue: "disposal", count: 3, keys: ["approvedDisposals"] },
  ])
  assert.equal(summary.backlogTotal, 38, "19 + 10 + 6 + 3, the advance warnings (low consumables included) never count")
  assert.deepEqual(summary.today, { total: 22, approvals: 19, approvedDisposals: 3 })
  // total = disposal + findings + rounds; รายการไม่ตรงทะเบียน is the findings only, ปิดรอบตรวจนับ the rounds (final review F1).
  assert.deepEqual(summary.approvalParts, { disposal: 4, audit: 14, round: 1 })
  assert.deepEqual(summary.advance, { total: 12, keys: ["returnsDueSoon", "warrantyExpiringSoon", "licenseExpiringSoon", "consumablesLow"] })
})

test("queues move pending items when the inbox is hidden", () => {
  const counts = { ...zeroCounts(), pendingAuditFindings: 5, pendingDisposals: 2, openAuditActions: 1, approvedDisposals: 3 }
  const visibleKeys: WaitingWorkKey[] = ["pendingAuditFindings", "openAuditActions", "auditActionsDueSoon", "pendingDisposals", "approvedDisposals"]
  const summary = buildWorkQueueSummary({ counts, visibleKeys, approvalInbox: { total: 0, disposal: 0, audit: 0, findings: 0, rounds: 0 } })
  assert.deepEqual(summary.queues, [
    { queue: "audit", count: 6, keys: ["openAuditActions", "auditActionsDueSoon", "pendingAuditFindings"] },
    { queue: "disposal", count: 5, keys: ["approvedDisposals", "pendingDisposals"] },
  ])
  assert.equal(summary.backlogTotal, 11, "each pending item counted once")
  assert.deepEqual(summary.today, { total: 3, approvals: 0, approvedDisposals: 3 })
  assert.equal(summary.approvalParts, null)
  assert.deepEqual(summary.advance, { total: 0, keys: [] })
})

test("a queue with no visible key is absent", () => {
  const counts = { ...zeroCounts(), openRepairs: 0, warrantyExpiringSoon: 4 }
  const summary = buildWorkQueueSummary({
    counts,
    visibleKeys: ["openRepairs", "stuckRepairs", "duePm", "warrantyExpiringSoon"],
    approvalInbox: { total: 0, disposal: 0, audit: 0, findings: 0, rounds: 0 },
  })
  assert.deepEqual(summary.queues, [{ queue: "maintenance", count: 0, keys: ["openRepairs", "stuckRepairs", "duePm"] }], "a visible queue at 0 stays")
  assert.equal(summary.backlogTotal, 0)
  assert.deepEqual(summary.advance, { total: 4, keys: ["warrantyExpiringSoon"] })
  const none = buildWorkQueueSummary({ counts, visibleKeys: [], approvalInbox: { total: 0, disposal: 0, audit: 0, findings: 0, rounds: 0 } })
  assert.deepEqual(none.queues, [])
  assert.equal(none.approvalParts, null)
})

test("countDataIssueAssets: asset:view, one count, the register's three data-quality wheres in one OR (spec §3)", () => {
  const source = read("src/lib/work-center-data-issues.ts")
  assert.match(source, /export async function countDataIssueAssets\(user: SessionUser\): Promise<number \| null>/)
  assert.match(source, /if \(!hasPermission\(user, "asset", "view"\)\) return null/)
  assert.match(source, /buildAssetDataQualityWhere\("responsibility"/)
  assert.match(source, /buildAssetDataQualityWhere\("serial"/)
  assert.match(source, /buildAssetDataQualityWhere\("photo"/)
  assert.equal(source.match(/prisma\.asset\.count\(/g)?.length, 1)
  assert.match(source, /isActive: true, OR: /)
})
