import assert from "node:assert/strict"
import test from "node:test"

import { buildApprovalInboxItems, summarizeApprovalInbox } from "../src/lib/approval-inbox.ts"

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
  assert.deepEqual(summarizeApprovalInbox(items), { total: 3, disposal: 1, audit: 2 })
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
