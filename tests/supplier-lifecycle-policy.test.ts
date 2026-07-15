import assert from "node:assert/strict"
import test from "node:test"

import { shouldBlockSupplierLifecycleChange } from "../src/lib/supplier-lifecycle-policy.ts"

const linked = {
  assets: 1,
  maintenanceTickets: 1,
  maintenancePlans: 1,
  purchaseDocuments: 1,
}

test("allows profile updates when an active supplier has linked records", () => {
  assert.equal(
    shouldBlockSupplierLifecycleChange({
      currentIsActive: true,
      nextIsActive: true,
      operation: "update",
      counts: linked,
    }),
    false
  )
})

test("blocks deactivation and delete when protected links remain", () => {
  assert.equal(
    shouldBlockSupplierLifecycleChange({
      currentIsActive: true,
      nextIsActive: false,
      operation: "update",
      counts: linked,
    }),
    true
  )
  assert.equal(
    shouldBlockSupplierLifecycleChange({
      currentIsActive: true,
      nextIsActive: false,
      operation: "delete",
      counts: linked,
    }),
    true
  )
})

test("allows delete when no protected links remain", () => {
  assert.equal(
    shouldBlockSupplierLifecycleChange({
      currentIsActive: true,
      nextIsActive: false,
      operation: "delete",
      counts: {
        assets: 0,
        maintenanceTickets: 0,
        maintenancePlans: 0,
        purchaseDocuments: 0,
      },
    }),
    false
  )
})
