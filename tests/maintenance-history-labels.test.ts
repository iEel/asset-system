import assert from "node:assert/strict"
import test from "node:test"
import { getMaintenanceMovementLabel } from "../src/lib/movement-labels.ts"

const labels = {
  create: "Created",
  statusUpdate: "Status updated",
  close: "Closed",
  pmCreate: "PM work order created",
  fallback: "Other maintenance activity",
}

test("maintenance movement types have localized labels", () => {
  assert.equal(getMaintenanceMovementLabel("maintenance_create", labels), labels.create)
  assert.equal(getMaintenanceMovementLabel("maintenance_status_update", labels), labels.statusUpdate)
  assert.equal(getMaintenanceMovementLabel("maintenance_close", labels), labels.close)
  assert.equal(getMaintenanceMovementLabel("maintenance_pm_create", labels), labels.pmCreate)
  assert.equal(getMaintenanceMovementLabel("unknown", labels), labels.fallback)
})

