import assert from "node:assert/strict"
import test from "node:test"

import {
  buildEmployeeDetailHrefs,
  buildEmployeeDetailSummary,
  buildEmployeeFollowUpItems,
  dedupeEmployeeMaintenanceLinks,
} from "../src/lib/employee-detail.ts"

test("builds employee detail links for existing master-data and asset pages", () => {
  assert.deepEqual(buildEmployeeDetailHrefs({ locale: "th", employeeId: "emp-1" }), {
    list: "/th/master-data/employees",
    edit: "/th/master-data/employees/emp-1/edit",
    assets: "/th/assets?custodianId=emp-1&page=1",
  })
})

test("summarizes the employee asset, handover, maintenance, audit, and disposal workload", () => {
  assert.deepEqual(
    buildEmployeeDetailSummary({
      currentAssetCount: 7,
      openCheckoutCount: 2,
      openMaintenanceCount: 3,
      pendingAuditFindingCount: 4,
      pendingDisposalCount: 1,
    }),
    {
      currentAssetCount: 7,
      openCheckoutCount: 2,
      openMaintenanceCount: 3,
      pendingAuditFindingCount: 4,
      pendingDisposalCount: 1,
      attentionCount: 10,
    }
  )
})

test("flags employee profile risks that need follow-up", () => {
  assert.deepEqual(
    buildEmployeeFollowUpItems({
      employmentStatus: "resigned",
      currentAssetCount: 2,
      openCheckoutCount: 1,
      openMaintenanceCount: 1,
      pendingAuditFindingCount: 1,
      pendingDisposalCount: 1,
    }),
    [
      "former_employee_with_assets",
      "open_checkout_returns",
      "open_maintenance",
      "pending_audit_findings",
      "pending_disposals",
    ]
  )

  assert.deepEqual(
    buildEmployeeFollowUpItems({
      employmentStatus: "active",
      currentAssetCount: 0,
      openCheckoutCount: 0,
      openMaintenanceCount: 0,
      pendingAuditFindingCount: 0,
      pendingDisposalCount: 0,
    }),
    []
  )
})

test("deduplicates employee maintenance records while preserving role labels", () => {
  const merged = dedupeEmployeeMaintenanceLinks([
    { id: "m-1", role: "reported" },
    { id: "m-1", role: "assigned" },
    { id: "m-2", role: "inspected" },
  ])

  assert.deepEqual(merged, [
    { id: "m-1", roles: ["reported", "assigned"] },
    { id: "m-2", roles: ["inspected"] },
  ])
})
