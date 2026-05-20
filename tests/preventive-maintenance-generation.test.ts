import assert from "node:assert/strict"
import test from "node:test"

import {
  buildPreventiveMaintenanceDuplicateTicketWhere,
  buildPreventiveMaintenanceTicketDraft,
  isPreventiveMaintenancePlanDue,
  buildPreventiveMaintenanceTicketProblem,
} from "../src/lib/preventive-maintenance.ts"

test("builds a PM ticket problem that keeps the plan reference visible", () => {
  assert.equal(
    buildPreventiveMaintenanceTicketProblem({
      planNo: "PM-20260520-0001",
      title: "Monthly UPS check",
      notes: "Check battery health",
    }),
    "[PM] PM-20260520-0001 - Monthly UPS check\n\nCheck battery health",
  )
})

test("builds an internal PM ticket draft and advances the next due date", () => {
  const draft = buildPreventiveMaintenanceTicketDraft(
    {
      planNo: "PM-20260520-0001",
      title: "Monthly UPS check",
      frequency: "monthly",
      intervalDays: 30,
      nextDueDate: new Date("2026-05-20T00:00:00.000Z"),
      assignedToId: "employee-1",
      vendorId: null,
      notes: null,
    },
    null,
  )

  assert.equal(draft.reportedById, "employee-1")
  assert.equal(draft.assignedToId, "employee-1")
  assert.equal(draft.repairType, "internal")
  assert.equal(draft.vendorId, null)
  assert.equal(draft.dueDate.toISOString().slice(0, 10), "2026-05-20")
  assert.equal(draft.nextDueDate.toISOString().slice(0, 10), "2026-06-20")
})

test("builds an external PM ticket draft using the current user as reporter", () => {
  const draft = buildPreventiveMaintenanceTicketDraft(
    {
      planNo: "PM-20260520-0002",
      title: "CCTV vendor inspection",
      frequency: "quarterly",
      intervalDays: 90,
      nextDueDate: "2026-05-20",
      assignedToId: null,
      vendorId: "vendor-1",
      notes: "",
    },
    "employee-2",
  )

  assert.equal(draft.reportedById, "employee-2")
  assert.equal(draft.assignedToId, null)
  assert.equal(draft.repairType, "vendor")
  assert.equal(draft.vendorId, "vendor-1")
})

test("detects plans that are due for automatic PM ticket generation", () => {
  const now = new Date("2026-05-20T12:00:00.000Z")

  assert.equal(isPreventiveMaintenancePlanDue({ isActive: true, nextDueDate: "2026-05-19" }, now), true)
  assert.equal(isPreventiveMaintenancePlanDue({ isActive: true, nextDueDate: "2026-05-20" }, now), true)
  assert.equal(isPreventiveMaintenancePlanDue({ isActive: true, nextDueDate: "2026-05-21" }, now), false)
  assert.equal(isPreventiveMaintenancePlanDue({ isActive: false, nextDueDate: "2026-05-19" }, now), false)
})

test("builds a duplicate guard for open PM tickets of the same plan", () => {
  assert.deepEqual(
    buildPreventiveMaintenanceDuplicateTicketWhere({
      planNo: "PM-20260520-0001",
      assetId: "asset-1",
    }),
    {
      assetId: "asset-1",
      isActive: true,
      repairStatus: { not: "closed" },
      problem: { startsWith: "[PM] PM-20260520-0001 -" },
    },
  )
})
