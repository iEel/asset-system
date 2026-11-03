import assert from "node:assert/strict"
import test from "node:test"

import {
  createMaintenancePlanRecord,
  generateMaintenancePlanNo,
  getMaintenancePlanActiveState,
  getMaintenancePlanNextState,
  mutateMaintenancePlan,
  assertMaintenancePlanAssetNotWrittenOff,
} from "../src/lib/maintenance-plan-service.ts"
import { MaintenanceApiError } from "../src/lib/maintenance-api-errors.ts"

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

test("a PM plan is refused for a Disposed or Retired asset only (G5P1-R11)", () => {
  for (const status of ["Disposed", " retired "]) {
    assert.throws(() => assertMaintenancePlanAssetNotWrittenOff(status), (error: unknown) =>
      error instanceof MaintenanceApiError && error.code === "MAINTENANCE_PLAN_ASSET_WRITTEN_OFF" && error.status === 400
      && error.message === "This asset is disposed or retired; a PM plan cannot be set up")
  }
  for (const status of ["Ready", "Under Maintenance", "Pending Repair", "In Use"]) assertMaintenancePlanAssetNotWrittenOff(status)
})

// A UTC server at 00:30 on 3 Nov in Bangkok (Global Constraints, Review Focus 1).
const now = new Date("2026-11-02T17:30:00Z")

test("the PM plan number counts the plans of the Bangkok day (G5P1-R11)", async () => {
  let where: unknown
  const db = { maintenancePlan: { count: async (args: { where: unknown }) => { where = args.where; return 2 } } }
  assert.equal(await generateMaintenancePlanNo(db as never, now), "PM-20261103-0003")
  assert.deepEqual(where, { createdAt: { gte: new Date("2026-11-02T17:00:00.000Z"), lt: new Date("2026-11-03T17:00:00.000Z") } })
})

test("two PM plans created at once: the second meets a duplicate number, reads the count again and takes the next (Review Focus 3)", async () => {
  let counts = 0
  let creates = 0
  const planNos: string[] = []
  const db = {
    maintenancePlan: {
      count: async () => { counts += 1; return counts === 1 ? 0 : 1 },
      create: async (args: { data: { planNo: string }; include: unknown }) => {
        creates += 1
        planNos.push(args.data.planNo)
        if (creates === 1) throw Object.assign(new Error("Unique constraint failed"), { code: "P2002" })
        return { id: "plan-2", ...args.data }
      },
    },
  }
  const data = { assetId: "asset-1", title: "PM", frequency: "monthly", intervalDays: 30, nextDueDate: now, createdBy: "u", updatedBy: "u" }
  const plan = await createMaintenancePlanRecord(db as never, data, now, {})
  assert.equal(counts, 2, "the number is read inside each attempt")
  assert.deepEqual(planNos, ["PM-20261103-0001", "PM-20261103-0002"])
  assert.deepEqual(plan, { id: "plan-2", ...data, planNo: "PM-20261103-0002" })
})

function planDb(updateManyCount: number, planState = "active") {
  const calls: Array<[string, unknown]> = []
  const current = { id: "plan-1", assetId: "asset-1", vendorId: null, planState, isActive: planState === "active", updatedAt: new Date("2026-11-01T00:00:00Z") }
  const tx = {
    maintenancePlan: {
      findFirst: async () => current,
      findUniqueOrThrow: async (args: unknown) => { calls.push(["findUniqueOrThrow", args]); return { ...current, title: "New" } },
      update: async (args: unknown) => { calls.push(["update", args]); return { ...current, planState: "paused" } },
      updateMany: async (args: unknown) => { calls.push(["updateMany", args]); return { count: updateManyCount } },
    },
    asset: { findFirst: async () => ({ id: "asset-1" }) },
    supplier: { findFirst: async () => ({ id: "vendor-1" }) },
  }
  return { calls, db: { $transaction: async (fn: (t: typeof tx) => unknown) => fn(tx) } }
}

const updateInput = {
  action: "update" as const,
  title: "New",
  frequency: "monthly" as const,
  intervalDays: undefined,
  nextDueDate: new Date("2026-12-01T00:00:00Z"),
  vendorId: null,
  notes: null,
  expectedUpdatedAt: new Date("2026-11-01T00:00:00Z"),
}

test("a PM edit writes only when the plan is as the page saw it, then reads it back (G5P1-R12)", async () => {
  const { db, calls } = planDb(1)
  const result = await mutateMaintenancePlan(db as never, "plan-1", updateInput, "user-1")
  assert.equal(calls[0]?.[0], "updateMany")
  assert.deepEqual((calls[0]?.[1] as { where: unknown }).where, { id: "plan-1", updatedAt: new Date("2026-11-01T00:00:00Z") })
  assert.deepEqual(calls[1], ["findUniqueOrThrow", { where: { id: "plan-1" } }])
  assert.equal(result.plan.title, "New")
})

test("an open PM edit page after the plan moved is refused with 409 MAINTENANCE_PLAN_CONFLICT (Review Focus 4)", async () => {
  const { db } = planDb(0)
  await assert.rejects(mutateMaintenancePlan(db as never, "plan-1", updateInput, "user-1"), (error: unknown) => {
    assert.ok(error instanceof MaintenanceApiError)
    assert.equal(error.code, "MAINTENANCE_PLAN_CONFLICT")
    assert.equal(error.status, 409)
    assert.equal(error.message, "The PM plan changed just now; reload and edit again")
    return true
  })
})

test("pause, resume and end keep their own update path and need no expectedUpdatedAt", async () => {
  for (const [from, action, planState, isActive] of [["active", "pause", "paused", false], ["paused", "resume", "active", true], ["active", "end", "ended", false]] as const) {
    const { db, calls } = planDb(0, from)
    await mutateMaintenancePlan(db as never, "plan-1", { action }, "user-1")
    assert.deepEqual(calls, [["update", { where: { id: "plan-1" }, data: { planState, isActive, updatedBy: "user-1" } }]])
  }
})
