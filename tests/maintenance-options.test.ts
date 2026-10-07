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

test("asset options block only written-off assets and assets with an unfinished record", async () => {
  const disposed = await searchMaintenanceOptions(fakeDb({ assetStatus: "Disposed" }), { type: "asset", q: "UP" })
  assert.equal(disposed[0]?.reason, "MAINTENANCE_ASSET_WRITTEN_OFF")

  const loaned = await searchMaintenanceOptions(fakeDb({ assetStatus: "Checked Out" }), { type: "asset", q: "UP" })
  assert.equal(loaned[0]?.disabled, undefined)

  const open = await searchMaintenanceOptions(fakeDb({ openRecordAssetIds: ["asset-1"] }), { type: "asset", q: "UP" })
  assert.equal(open[0]?.reason, "MAINTENANCE_OPEN_RECORD_EXISTS")
})

function fakeDb(config: { assetStatus?: string; openRecordAssetIds?: string[] } = {}) {
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
    maintenanceTicket: { findMany: async () => (config.openRecordAssetIds ?? []).map((assetId) => ({ assetId })) },
  }
}
