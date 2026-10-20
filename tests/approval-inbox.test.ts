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
