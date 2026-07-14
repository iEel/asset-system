import assert from "node:assert/strict"
import test from "node:test"

import { searchMaintenanceOptions } from "../src/lib/maintenance-options.ts"

test("maintenance option search returns no broad result below two characters", async () => {
  const db = fakeDb()
  assert.deepEqual(await searchMaintenanceOptions(db, { type: "asset", q: "a" }), [])
  assert.equal(db.calls, 0)
})

test("maintenance option search caps active results at fifty", async () => {
  const db = fakeDb()
  await searchMaintenanceOptions(db, { type: "employee", q: "สม" })
  assert.equal(db.lastTake, 50)
})

test("asset options explain lifecycle conflicts instead of hiding records", async () => {
  const db = fakeDb({ assetStatus: "Pending Repair" })
  const options = await searchMaintenanceOptions(db, { type: "asset", q: "UP" })
  assert.equal(options[0]?.disabled, true)
  assert.equal(options[0]?.reason, "MAINTENANCE_ASSET_INELIGIBLE")
})

function fakeDb(config: { assetStatus?: string } = {}) {
  const state = { calls: 0, lastTake: 0 }
  return {
    get calls() { return state.calls },
    get lastTake() { return state.lastTake },
    asset: {
      findMany: async ({ take }: { take: number }) => {
        state.calls += 1
        state.lastTake = take
        return [{ id: "asset-1", assetTag: "UPS-1", name: "UPS", status: { name: config.assetStatus ?? "Ready", nameTh: "พร้อมใช้งาน" } }]
      },
    },
    employee: {
      findMany: async ({ take }: { take: number }) => {
        state.calls += 1
        state.lastTake = take
        return [{ id: "employee-1", code: "E001", fullNameTh: "สมชาย" }]
      },
    },
    supplier: {
      findMany: async ({ take }: { take: number }) => {
        state.calls += 1
        state.lastTake = take
        return [{ id: "supplier-1", code: "S001", name: "Supplier" }]
      },
    },
    maintenanceTicket: { findMany: async () => [] },
  }
}
