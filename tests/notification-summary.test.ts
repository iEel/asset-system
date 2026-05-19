import assert from "node:assert/strict"
import test from "node:test"

import { buildNotificationSummaryItems } from "../src/lib/notification-summary-items.ts"

test("adds approval inbox notification when approval detail counts are already suppressed", () => {
  const items = buildNotificationSummaryItems("th", {
    approvalInbox: 4,
    overdueMaintenance: 1,
    pendingAuditFindings: 0,
    openAuditActions: 0,
    auditActionsDueSoon: 0,
    pendingDisposals: 0,
    approvedDisposals: 0,
    returnsDueSoon: 0,
    warrantyExpiringSoon: 0,
    licenseExpiringSoon: 0,
  })

  assert.deepEqual(items.map((item) => item.key), ["approvalInbox", "overdueMaintenance"])
  assert.equal(items[0].href, "/th/admin/approvals")
  assert.equal(items[0].tone, "danger")
})

test("keeps direct pending approval notifications when approval inbox has no actionable items", () => {
  const items = buildNotificationSummaryItems("en", {
    approvalInbox: 0,
    overdueMaintenance: 0,
    pendingAuditFindings: 1,
    openAuditActions: 0,
    auditActionsDueSoon: 0,
    pendingDisposals: 2,
    approvedDisposals: 0,
    returnsDueSoon: 0,
    warrantyExpiringSoon: 0,
    licenseExpiringSoon: 0,
  })

  assert.deepEqual(items.map((item) => [item.key, item.href]), [
    ["pendingAuditFindings", "/en/audit/findings?status=pending"],
    ["pendingDisposals", "/en/disposal?status=pending"],
  ])
})
