import assert from "node:assert/strict"
import test from "node:test"

import {
  buildEmployeeDetailHrefs,
  buildEmployeeDetailSummary,
  buildEmployeePageHref,
  buildEmployeeFollowUpItems,
  dedupeEmployeeMaintenanceLinks,
  isFormerEmployee,
} from "../src/lib/employee-detail.ts"
import { normalizeAssetReturnTo } from "../src/lib/asset-return-navigation.ts"

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
      isActive: true,
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
      isActive: true,
      currentAssetCount: 0,
      openCheckoutCount: 0,
      openMaintenanceCount: 0,
      pendingAuditFindingCount: 0,
      pendingDisposalCount: 0,
    }),
    []
  )
})

// Group 7 plan 2 (G7P2-R1, carried from Task 2): an employee AD deactivated is former too, though HR still says active.
test("a record AD deactivated counts as former in the follow-up items, as G7P2-R1", () => {
  const counts = { currentAssetCount: 2, openCheckoutCount: 0, openMaintenanceCount: 0, pendingAuditFindingCount: 0, pendingDisposalCount: 0 }
  assert.deepEqual(buildEmployeeFollowUpItems({ employmentStatus: "active", isActive: false, ...counts }), ["former_employee_with_assets"])
  assert.deepEqual(buildEmployeeFollowUpItems({ employmentStatus: "active", isActive: true, ...counts }), [])
  assert.deepEqual(buildEmployeeFollowUpItems({ employmentStatus: "resigned", isActive: true, ...counts, currentAssetCount: 0 }), [])
  assert.equal(isFormerEmployee({ employmentStatus: "suspended", isActive: true }), true)
  assert.equal(isFormerEmployee({ employmentStatus: "active", isActive: true }), false)
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

test("the employee page's own address keeps a filtered list and a held page past the first", () => {
  const id = "0b6f5c2e-1d7a-4c1e-9a1b-2f3e4d5c6b7a"
  assert.equal(buildEmployeePageHref("th", id), `/th/master-data/employees/${id}`)
  assert.equal(buildEmployeePageHref("th", id, { returnTo: "/th/master-data/employees", heldPage: 1 }), `/th/master-data/employees/${id}`)
  assert.equal(
    buildEmployeePageHref("th", id, { returnTo: "/th/master-data/employees?former=withAssets", heldPage: 2 }),
    `/th/master-data/employees/${id}?returnTo=%2Fth%2Fmaster-data%2Femployees%3Fformer%3DwithAssets&heldPage=2`,
  )
})

test("the return and handover forms accept the employee page's address, its query included, as their way back", () => {
  const href = buildEmployeePageHref("th", "0b6f5c2e-1d7a-4c1e-9a1b-2f3e4d5c6b7a", { returnTo: "/th/master-data/employees?q=x", heldPage: 3 })
  assert.equal(normalizeAssetReturnTo("th", href), href)
})
