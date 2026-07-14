import assert from "node:assert/strict"
import test from "node:test"

import { getMaintenancePlanActiveState } from "../src/lib/maintenance-plan-service.ts"

test("pause, resume, and end actions produce explicit active states", () => {
  assert.equal(getMaintenancePlanActiveState("pause"), false)
  assert.equal(getMaintenancePlanActiveState("resume"), true)
  assert.equal(getMaintenancePlanActiveState("end"), false)
  assert.equal(getMaintenancePlanActiveState("update"), null)
})
