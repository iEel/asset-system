import assert from "node:assert/strict"
import test from "node:test"

import { getMaintenancePlanActiveState, getMaintenancePlanNextState } from "../src/lib/maintenance-plan-service.ts"

test("pause, resume, and end actions produce explicit active states", () => {
  assert.equal(getMaintenancePlanActiveState("pause"), false)
  assert.equal(getMaintenancePlanActiveState("resume"), true)
  assert.equal(getMaintenancePlanActiveState("end"), false)
  assert.equal(getMaintenancePlanActiveState("update"), null)
})

test("PM plan state keeps pause reversible and end terminal", () => {
  assert.equal(getMaintenancePlanNextState("active", "pause"), "paused")
  assert.equal(getMaintenancePlanNextState("paused", "resume"), "active")
  assert.equal(getMaintenancePlanNextState("active", "end"), "ended")
  assert.equal(getMaintenancePlanNextState("paused", "end"), "ended")
  assert.throws(() => getMaintenancePlanNextState("ended", "resume"), /cannot/i)
  assert.throws(() => getMaintenancePlanNextState("paused", "pause"), /cannot/i)
})
