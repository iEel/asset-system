import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import test from "node:test"

import { approvalInboxItemHref, buildApprovalInboxCounts, buildApprovalInboxItems, type ApprovalInboxCopy } from "../src/lib/approval-inbox.ts"

// The copy comes from the caller (approvalInboxPage messages via getTranslations), not from the lib (group 6 plan 1 Task 4).
const copy: ApprovalInboxCopy = {
  kindDisposal: "ตัดจำหน่าย",
  kindAudit: "ตรวจนับ",
  actionDisposal: "พิจารณาตัดจำหน่าย",
  actionFinding: "พิจารณารายการไม่ตรง",
  actionRound: "เปิดรอบตรวจนับ",
  roundReady: "รอบตรวจนับพร้อมปิด ไม่มีรายการค้าง",
  findingReview: "รายการไม่ตรงรอพิจารณา",
  disposalReady: (assetName) => `คำขอตัดจำหน่าย ${assetName} รอพิจารณา`,
}

test("builds approval inbox items from pending workflow records", () => {
  const items = buildApprovalInboxItems({
    locale: "th",
    copy,
    policy: {
      disposalRequired: true,
      auditCloseRequired: true,
      minApprovers: 1,
      segregationRequired: true,
      slaDays: 3,
    },
    disposalRequests: [
      {
        id: "disposal-1",
        disposalNo: "DP-202605-0001",
        assetTag: "AMS-NB-0001",
        assetName: "Notebook",
        requestedBy: "Somchai",
        requestDate: new Date("2026-05-18T03:00:00.000Z"),
      },
    ],
    auditFindings: [
      {
        id: "finding-1",
        auditNo: "AUD-2026-001",
        findingType: "wrong_location",
        assetTag: "AMS-CAM-0003",
        reportedBy: "Narin",
        reportedAt: new Date("2026-05-18T05:00:00.000Z"),
      },
    ],
    auditRoundsReadyToClose: [
      {
        id: "round-1",
        auditNo: "AUD-2026-002",
        name: "HQ Annual Count",
        createdBy: "admin",
        updatedAt: new Date("2026-05-18T06:00:00.000Z"),
      },
    ],
  })

  assert.deepEqual(
    items.map((item) => [item.kind, item.recordId, item.href]),
    [
      ["disposal_review", "disposal-1", "/th/admin/approvals?item=disposal:disposal-1"],
      ["audit_finding_review", "finding-1", "/th/admin/approvals?item=finding:finding-1"],
      ["audit_round_close", "round-1", "/th/admin/approvals?item=round:round-1"],
    ]
  )
  assert.equal(items[0].description, "คำขอตัดจำหน่าย Notebook รอพิจารณา")
  assert.equal(items[0].actionLabel, "พิจารณาตัดจำหน่าย")
  assert.equal(items[1].actionLabel, "พิจารณารายการไม่ตรง")
  assert.equal(items[2].description, "รอบตรวจนับพร้อมปิด ไม่มีรายการค้าง")
  assert.equal(items[2].actionLabel, "เปิดรอบตรวจนับ")
  assert.equal(items[0].tone, "danger")
  assert.equal(items[1].module, "audit")
  assert.equal(items[2].tone, "primary")
})

test("approvalInboxItemHref opens the item on the approvals page", () => {
  assert.equal(approvalInboxItemHref("th", "disposal", "abc-1"), "/th/admin/approvals?item=disposal:abc-1")
  assert.equal(approvalInboxItemHref("en", "round", "r-9"), "/en/admin/approvals?item=round:r-9")
})

// The inbox ignores policy.disposalRequired (group 6 spec §7.2): approval is always required in code.
test("disposal items are built whatever disposalRequired says; round closure still follows auditCloseRequired", () => {
  const items = buildApprovalInboxItems({
    locale: "th",
    copy,
    policy: {
      disposalRequired: false,
      auditCloseRequired: false,
      minApprovers: 1,
      segregationRequired: true,
      slaDays: 3,
    },
    disposalRequests: [
      {
        id: "disposal-1",
        disposalNo: "DP-202605-0001",
        assetTag: "AMS-NB-0001",
        assetName: "Notebook",
        requestedBy: "Somchai",
        requestDate: new Date("2026-05-18T03:00:00.000Z"),
      },
    ],
    auditFindings: [
      {
        id: "finding-1",
        auditNo: "AUD-2026-001",
        findingType: "wrong_location",
        assetTag: "AMS-CAM-0003",
        reportedBy: "Narin",
        reportedAt: new Date("2026-05-18T05:00:00.000Z"),
      },
    ],
    auditRoundsReadyToClose: [
      {
        id: "round-1",
        auditNo: "AUD-2026-002",
        name: "HQ Annual Count",
        createdBy: "admin",
        updatedAt: new Date("2026-05-18T06:00:00.000Z"),
      },
    ],
  })

  assert.deepEqual(items.map((item) => item.kind), ["disposal_review", "audit_finding_review"])
})

test("approval inbox counts are the full counts, not the capped rows (critique C1)", () => {
  assert.deepEqual(buildApprovalInboxCounts({ disposal: 60, auditFindings: 12, auditRoundsReady: 1 }), { total: 73, disposal: 60, audit: 13 })
  assert.deepEqual(buildApprovalInboxCounts({ disposal: 0, auditFindings: 0, auditRoundsReady: 0 }), { total: 0, disposal: 0, audit: 0 })
})

test("the snapshot's summary and the counts share one database count (critique C1)", () => {
  const src = readFileSync("src/lib/approval-inbox-query.ts", "utf8").replace(/\r/g, "")
  assert.doesNotMatch(src, /summarizeApprovalInbox|items\.length/)
  assert.equal(src.match(/countApprovalInbox\(user, access, policy\)/g)?.length, 2)
  assert.match(src, /return buildApprovalInboxCounts\(\{ disposal, auditFindings, auditRoundsReady \}\)/)
})

test("the inbox's oldest request reads the same queues, gates and wheres as its count (group 1 dashboard task 2)", () => {
  const src = readFileSync("src/lib/approval-inbox-query.ts", "utf8").replace(/\r/g, "")
  assert.match(src, /export async function getApprovalInboxOldest\(user: SessionUser\): Promise<\{ oldest: Date \| null; slaDays: number \}>/)
  assert.equal(src.match(/where: pendingDisposalApprovalWhere\b/g)?.length, 3, "the pending loader, the count and the oldest")
  assert.equal(src.match(/where: pendingFindingApprovalWhere\(user\.id\)/g)?.length, 3, "the pending loader, the count and the oldest")
  assert.equal(src.match(/getReadyAuditRoundsForClose\(user\.id\)/g)?.length, 2, "the count and the oldest")
  assert.doesNotMatch(src, /disposalRequired/)
  assert.equal(src.match(/access\.canApproveDisposal\s*\?/g)?.length, 3, "the pending loader, the count and the oldest")
  assert.equal(src.match(/access\.canApproveAudit && policy\.auditCloseRequired/g)?.length, 3)
  assert.match(src, /_min: \{ requestDate: true \}/)
  assert.match(src, /_min: \{ reportedAt: true \}/)
  assert.doesNotMatch(src, /getReadyAuditRoundCloseCount/)
})

test("the approval inbox sentence names only the queues it counts (critique C3)", () => {
  for (const locale of ["th", "en"]) {
    const m = JSON.parse(readFileSync(`messages/${locale}.json`, "utf8"))
    assert.equal(m.workCenter.approvalInboxDetail, undefined, "the work center reads notifications.approvalInboxDetail (group 1 dashboard task 4)")
    assert.doesNotMatch(m.notifications.approvalInboxDetail, /ซ่อม|maintenance/i)
  }
})
