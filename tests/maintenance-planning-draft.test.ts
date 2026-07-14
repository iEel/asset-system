import assert from "node:assert/strict"
import test from "node:test"
import {
  createMaintenancePlanningDraft,
  reconcileMaintenancePlanningDraft,
} from "../src/lib/maintenance-planning-draft.ts"

test("refreshed planning values become the next dialog draft when closed", () => {
  const stale = createMaintenancePlanningDraft("employee-old", "2026-07-14")
  const refreshed = reconcileMaintenancePlanningDraft(
    stale,
    { assignedToId: "employee-new", dueDate: "2026-07-21" },
    false,
  )

  assert.deepEqual(refreshed, {
    assignedToId: "employee-new",
    dueDate: "2026-07-21",
  })
})

test("refreshed planning values do not clobber an open edit", () => {
  const edited = createMaintenancePlanningDraft("employee-edit", "2026-07-18")
  const refreshed = reconcileMaintenancePlanningDraft(
    edited,
    { assignedToId: "employee-server", dueDate: "2026-07-21" },
    true,
  )

  assert.equal(refreshed, edited)
  assert.deepEqual(refreshed, {
    assignedToId: "employee-edit",
    dueDate: "2026-07-18",
  })
})
