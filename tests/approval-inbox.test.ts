import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import test from "node:test"

import { buildApprovalInboxCounts, buildApprovalInboxItems } from "../src/lib/approval-inbox.ts"

test("builds approval inbox items from pending workflow records", () => {
  const items = buildApprovalInboxItems({
    locale: "th",
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
      ["disposal_review", "disposal-1", "/th/disposal/disposal-1"],
      ["audit_finding_review", "finding-1", "/th/audit/findings?status=pending"],
      ["audit_round_close", "round-1", "/th/audit/rounds/round-1"],
    ]
  )
  assert.equal(items[0].tone, "danger")
  assert.equal(items[1].module, "audit")
  assert.equal(items[2].tone, "primary")
})

test("respects approval policy toggles", () => {
  const items = buildApprovalInboxItems({
    locale: "th",
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

  assert.deepEqual(items.map((item) => item.kind), ["audit_finding_review"])
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
  assert.equal(src.match(/where: pendingDisposalApprovalWhere\b/g)?.length, 3, "the snapshot list, the count and the oldest")
  assert.equal(src.match(/where: pendingFindingApprovalWhere\(user\.id\)/g)?.length, 3, "the snapshot list, the count and the oldest")
  assert.equal(src.match(/getReadyAuditRoundsForClose\(user\.id\)/g)?.length, 2, "the count and the oldest")
  assert.equal(src.match(/access\.canApproveDisposal && policy\.disposalRequired/g)?.length, 3)
  assert.equal(src.match(/access\.canApproveAudit && policy\.auditCloseRequired/g)?.length, 3)
  assert.match(src, /_min: \{ requestDate: true \}/)
  assert.match(src, /_min: \{ reportedAt: true \}/)
  assert.doesNotMatch(src, /getReadyAuditRoundCloseCount/)
})

test("the approval inbox sentence names only the queues it counts (critique C3)", () => {
  for (const locale of ["th", "en"]) {
    const m = JSON.parse(readFileSync(`messages/${locale}.json`, "utf8"))
    assert.equal(m.notifications.approvalInboxDetail, m.workCenter.approvalInboxDetail)
    assert.doesNotMatch(m.notifications.approvalInboxDetail, /ซ่อม|maintenance/i)
  }
})
