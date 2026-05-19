import test from "node:test"
import assert from "node:assert/strict"

import { buildDashboardActionCardKeys } from "../src/lib/dashboard-action-cards.ts"

test("dashboard approval inbox card suppresses approval duplicates", () => {
  const keys = buildDashboardActionCardKeys({
    approvalInbox: {
      visible: true,
      total: 4,
      disposal: 2,
      maintenance: 1,
      audit: 1,
    },
    overdueMaintenance: 3,
    pendingAuditFindings: 1,
    pendingDisposals: 2,
    approvedDisposals: 5,
  })

  assert.deepEqual(keys, ["approvalInbox", "overdueMaintenance", "approvedDisposals"])
})

test("dashboard keeps direct work cards when approval inbox is not visible", () => {
  const keys = buildDashboardActionCardKeys({
    approvalInbox: {
      visible: false,
      total: 0,
      disposal: 0,
      maintenance: 0,
      audit: 0,
    },
    overdueMaintenance: 3,
    pendingAuditFindings: 1,
    pendingDisposals: 2,
    approvedDisposals: 5,
  })

  assert.deepEqual(keys, [
    "overdueMaintenance",
    "pendingAuditFindings",
    "pendingDisposals",
    "approvedDisposals",
  ])
})
