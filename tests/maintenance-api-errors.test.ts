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

test("a date after Bangkok today has its own code, answered under its field (G5P1-R6)", () => {
  assert.equal(isMaintenanceErrorCode("MAINTENANCE_DATE_IN_FUTURE"), true)
  const error = new MaintenanceApiError("MAINTENANCE_DATE_IN_FUTURE", "The date cannot be after today", 400, { returnDate: "repairDateInFuture" })
  assert.deepEqual(getMaintenanceErrorPayload(error), {
    status: 400,
    body: { code: "MAINTENANCE_DATE_IN_FUTURE", error: "The date cannot be after today", fieldErrors: { returnDate: "repairDateInFuture" } },
  })
})
