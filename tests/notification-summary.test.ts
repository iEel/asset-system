import assert from "node:assert/strict"
import test from "node:test"
import { readFileSync } from "node:fs"

import { buildNotificationSummaryItems, type NotificationSummaryCounts } from "../src/lib/notification-summary-items.ts"

function emptyCounts(): NotificationSummaryCounts {
  return {
    approvalInbox: 0,
    duePm: 0,
    pendingAuditFindings: 0,
    openAuditActions: 0,
    auditActionsDueSoon: 0,
    pendingDisposals: 0,
    approvedDisposals: 0,
    returnsDueSoon: 0,
    warrantyExpiringSoon: 0,
    licenseExpiringSoon: 0,
  }
}

test("adds approval inbox notification when approval detail counts are already suppressed", () => {
  const items = buildNotificationSummaryItems("th", {
    approvalInbox: 4,
    duePm: 1,
    pendingAuditFindings: 0,
    openAuditActions: 0,
    auditActionsDueSoon: 0,
    pendingDisposals: 0,
    approvedDisposals: 0,
    returnsDueSoon: 0,
    warrantyExpiringSoon: 0,
    licenseExpiringSoon: 0,
  })

  assert.deepEqual(items.map((item) => item.key), ["approvalInbox", "duePm"])
  assert.equal(items[0].href, "/th/admin/approvals")
  assert.equal(items[0].tone, "danger")
})

test("keeps direct pending approval notifications when approval inbox has no actionable items", () => {
  const items = buildNotificationSummaryItems("en", {
    approvalInbox: 0,
    duePm: 0,
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

test("PM due within the reminder window links to the maintenance page", () => {
  const items = buildNotificationSummaryItems("th", { ...emptyCounts(), duePm: 2 })
  assert.deepEqual(items.map((item) => [item.key, item.href, item.tone]), [["duePm", "/th/maintenance#pm-due", "warning"]])
})

test("return reminders count temporary loans only", () => {
  const source = readFileSync("src/lib/notification-summary.ts", "utf8")
  assert.match(source, /handoverMode:\s*"temporary_loan"/)
})
