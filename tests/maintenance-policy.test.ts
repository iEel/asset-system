import assert from "node:assert/strict"
import test from "node:test"

import {
  canDeleteMaintenanceEvidence,
  getAllowedMaintenanceTransitions,
  getCorrectiveAssetEligibilityError,
  getCorrectiveLifecycleTarget,
  isPreventiveMaintenanceTicket,
} from "../src/lib/maintenance-policy.ts"

test("classifies an explicitly linked ticket as PM without reading problem text", () => {
  assert.equal(isPreventiveMaintenanceTicket({ maintenancePlanId: "plan-1", problem: "Battery check" }), true)
})

test("uses the legacy PM prefix only when the explicit relation is absent", () => {
  assert.equal(isPreventiveMaintenanceTicket({ maintenancePlanId: null, problem: "[PM] PM-1 - UPS" }), true)
  assert.equal(isPreventiveMaintenanceTicket({ maintenancePlanId: null, problem: "UPS failure" }), false)
})

test("rejects terminal and conflicting corrective assets", () => {
  assert.equal(getCorrectiveAssetEligibilityError("Disposed", 0), "MAINTENANCE_ASSET_INELIGIBLE")
  assert.equal(getCorrectiveAssetEligibilityError("Ready", 1), "MAINTENANCE_ACTIVE_TICKET_EXISTS")
  assert.equal(getCorrectiveAssetEligibilityError("Ready", 0), null)
})

test("maps corrective in-progress to Under Maintenance without changing waiting states", () => {
  assert.equal(getCorrectiveLifecycleTarget("in_progress"), "Under Maintenance")
  assert.equal(getCorrectiveLifecycleTarget("waiting_parts"), null)
})

test("defines forward maintenance transitions", () => {
  assert.deepEqual(getAllowedMaintenanceTransitions("reported"), ["accepted"])
  assert.deepEqual(getAllowedMaintenanceTransitions("accepted"), ["in_progress"])
  assert.deepEqual(getAllowedMaintenanceTransitions("completed"), ["closed"])
  assert.deepEqual(getAllowedMaintenanceTransitions("closed"), [])
})

test("closed maintenance evidence cannot be deleted", () => {
  assert.equal(canDeleteMaintenanceEvidence("closed"), false)
  assert.equal(canDeleteMaintenanceEvidence("in_progress"), true)
})
