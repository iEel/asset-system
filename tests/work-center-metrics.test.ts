import test from "node:test"
import assert from "node:assert/strict"

import { buildWorkCenterMetricKeys, calculateWorkCenterUrgentCount } from "../src/lib/work-center-metrics.ts"

test("work center approval inbox metric suppresses duplicated approval metrics", () => {
  const keys = buildWorkCenterMetricKeys({
    approvalInbox: {
      visible: true,
      total: 7,
      disposal: 2,
      maintenance: 1,
      audit: 4,
    },
  })

  assert.deepEqual(keys, [
    "approvalInbox",
    "missingCustodian",
    "missingSerial",
    "missingPhoto",
    "overdueMaintenance",
    "waitingMaintenance",
    "openAuditActions",
    "pendingAuditItems",
    "approvedDisposals",
  ])
})

test("work center keeps direct approval metrics when approval inbox is hidden", () => {
  const keys = buildWorkCenterMetricKeys({
    approvalInbox: {
      visible: false,
      total: 0,
      disposal: 0,
      maintenance: 0,
      audit: 0,
    },
  })

  assert.deepEqual(keys, [
    "missingCustodian",
    "missingSerial",
    "missingPhoto",
    "overdueMaintenance",
    "waitingMaintenance",
    "completedMaintenance",
    "pendingAuditFindings",
    "openAuditActions",
    "pendingAuditItems",
    "pendingDisposals",
    "approvedDisposals",
  ])
})

test("work center urgent count uses approval inbox instead of covered detail counts", () => {
  const count = calculateWorkCenterUrgentCount({
    approvalInbox: {
      visible: true,
      total: 7,
      disposal: 2,
      maintenance: 1,
      audit: 4,
    },
    overdueMaintenance: 3,
    pendingAuditFindings: 4,
    pendingDisposals: 2,
    approvedDisposals: 5,
  })

  assert.equal(count, 15)
})
