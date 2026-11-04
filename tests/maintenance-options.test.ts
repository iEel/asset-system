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

test("asset options carry the asset's condition, so the record form can pre-choose ดี or พอใช้ for a finished repair (final review M1)", async () => {
  let select: Record<string, unknown> = {}
  const db = fakeDb()
  const findMany = db.asset.findMany
  db.asset.findMany = async (args: { take: number; select?: object }) => {
    select = (args.select ?? {}) as Record<string, unknown>
    return findMany(args)
  }
  const [option] = await searchMaintenanceOptions(db, { type: "asset", q: "UP" })
  assert.equal(select.conditionId, true)
  assert.equal(option?.conditionId, "condition-good")
  const [employee] = await searchMaintenanceOptions(fakeDb(), { type: "employee", q: "สม" })
  assert.equal(employee && "conditionId" in employee, false, "only assets carry it")
})

function fakeDb(config: { assetStatus?: string; openRecordAssetIds?: string[] } = {}) {
  const state = { calls: 0, lastTake: 0 }
  return {
    get calls() { return state.calls },
    get lastTake() { return state.lastTake },
    asset: {
      findMany: async ({ take }: { take: number; select?: object }) => {
        state.calls += 1
        state.lastTake = take
        return [{ id: "asset-1", assetTag: "UPS-1", name: "UPS", conditionId: "condition-good", status: { name: config.assetStatus ?? "Ready", nameTh: "พร้อมใช้งาน" } }]
      },
      findFirst: async () => null,
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
    maintenanceTicket: {
      findMany: async () => (config.openRecordAssetIds ?? []).map((assetId) => ({ assetId })),
      findFirst: async () => null,
    },
    assetCheckout: { findFirst: async () => null },
    department: { findFirst: async () => null },
    location: { findFirst: async () => null },
    attachment: { findMany: async () => [] },
  }
}

test("the asset by-id read attaches the repair's asset facts; a search does not read them (G5P2-R1)", async () => {
  const factsReads: string[] = []
  const db = fakeDb()
  const withFacts = {
    ...db,
    asset: {
      ...db.asset,
      findFirst: async ({ where }: { where: { id?: string } }) => {
        factsReads.push(where.id ?? "")
        return {
          id: "asset-1", assetTag: "UPS-1", name: "UPS", ownershipType: "shared", custodianId: null, conditionId: "condition-good", modelId: null,
          status: { name: "Ready", nameTh: "พร้อมใช้งาน" }, condition: { nameTh: "ดี" }, custodian: null, department: null,
          currentLocation: { name: "ห้อง 101", branch: { name: "สำนักงานใหญ่" } },
        }
      },
    },
  }
  const byId = await searchMaintenanceOptions(withFacts, { type: "asset", id: "a-1" })
  assert.equal(byId.length, 1)
  assert.deepEqual(factsReads, ["asset-1"], "the facts of the asset found")
  assert.equal(byId[0]?.facts?.statusName, "Ready")
  assert.equal(byId[0]?.facts?.openRecord, null)

  const searched = await searchMaintenanceOptions(withFacts, { type: "asset", q: "ab" })
  assert.equal(searched.length, 1)
  assert.equal("facts" in (searched[0] ?? {}), false)
  assert.deepEqual(factsReads, ["asset-1"], "a search reads no facts")

  // The PM form's by-id read carries the same facts for its asset card (G5P4-R9); its search does not.
  const pm = await searchMaintenanceOptions(withFacts, { type: "pmAsset", id: "a-1" })
  assert.equal(pm[0]?.facts?.roomName, "ห้อง 101")
  assert.equal(pm[0]?.facts?.branchName, "สำนักงานใหญ่")
  assert.deepEqual(factsReads, ["asset-1", "asset-1"])
  const pmSearched = await searchMaintenanceOptions(withFacts, { type: "pmAsset", q: "ab" })
  assert.equal("facts" in (pmSearched[0] ?? {}), false)
  assert.deepEqual(factsReads, ["asset-1", "asset-1"], "a PM search reads no facts")
})

test("PM asset options disable only written-off assets: an asset under repair can get a plan (G5P1-R13, decision 10.4)", async () => {
  const open = await searchMaintenanceOptions(fakeDb({ openRecordAssetIds: ["asset-1"] }), { type: "pmAsset", q: "UP" })
  assert.equal(open[0]?.disabled, undefined)
  assert.equal(open[0]?.reason, undefined)
  for (const status of ["Disposed", "Retired"]) {
    const [option] = await searchMaintenanceOptions(fakeDb({ assetStatus: status }), { type: "pmAsset", q: "UP" })
    assert.equal(option?.disabled, true, status)
    assert.equal(option?.reason, "MAINTENANCE_PLAN_ASSET_WRITTEN_OFF", status)
  }
  const [repair] = await searchMaintenanceOptions(fakeDb({ openRecordAssetIds: ["asset-1"] }), { type: "asset", q: "UP" })
  assert.equal(repair?.reason, "MAINTENANCE_OPEN_RECORD_EXISTS", "the repair form's asset options are unchanged")
})
