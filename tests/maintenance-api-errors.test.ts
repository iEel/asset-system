import assert from "node:assert/strict"
import test from "node:test"

import {
  MaintenanceApiError,
  getMaintenanceErrorPayload,
  isMaintenanceErrorCode,
  maintenanceErrorCodes,
} from "../src/lib/maintenance-api-errors.ts"

test("recognizes every stable maintenance error code", () => {
  for (const code of maintenanceErrorCodes) assert.equal(isMaintenanceErrorCode(code), true)
  assert.equal(isMaintenanceErrorCode("UNKNOWN"), false)
})

test("exports a stable error code for waiting statuses without a remark", () => {
  assert.equal(maintenanceErrorCodes.includes("MAINTENANCE_WAITING_REMARK_REQUIRED"), true)
})

test("serializes typed maintenance conflicts with their HTTP status", () => {
  const error = new MaintenanceApiError("MAINTENANCE_CONFLICT", "Ticket changed", 409)
  assert.deepEqual(getMaintenanceErrorPayload(error), {
    status: 409,
    body: { code: "MAINTENANCE_CONFLICT", error: "Ticket changed" },
  })
})

test("returns null for errors outside the maintenance domain", () => {
  assert.equal(getMaintenanceErrorPayload(new Error("Database unavailable")), null)
})
