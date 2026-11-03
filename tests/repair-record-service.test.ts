import assert from "node:assert/strict"
import test from "node:test"

import { MaintenanceApiError } from "../src/lib/maintenance-api-errors.ts"
import {
  cancelRepairRecord,
  completeRepairRecord,
  createRepairRecord,
  updateRepairRecordDetails,
} from "../src/lib/repair-record-service.ts"

type Call = { call: string; args: Record<string, unknown> }

type FakeConfig = {
  statusName?: string
  ownershipType?: string
  custodianId?: string | null
  activeCheckouts?: number
  openRecords?: number
  claimRows?: number
  ticket?: Record<string, unknown> | null
  ticketUpdateRows?: number
  plan?: Record<string, unknown> | null
  conditionName?: string
  inactiveConditions?: string[]
  salvageName?: string
}

// The condition masters the fake knows, by id "condition:<name>" (prisma/seed.ts names).
const conditionNames = ["Not Assessed", "New", "Good", "Fair", "Damaged", "Non-functional", "Salvage"]

function fakeDb(config: FakeConfig = {}) {
  const calls: Call[] = []
  const asset = {
    id: "asset-1",
    statusId: `status:${config.statusName ?? "Ready"}`,
    ownershipType: config.ownershipType ?? "shared",
    custodianId: config.custodianId ?? null,
    conditionId: `condition:${config.conditionName ?? "Good"}`,
    status: { name: config.statusName ?? "Ready" },
  }
  const conditions = conditionNames.map((name) => ({
    id: `condition:${name}`,
    // A master may be stored with other spacing or case; the rules match it through normalizeAssetStateName (final review M8).
    name: name === "Salvage" && config.salvageName ? config.salvageName : name,
    isActive: !(config.inactiveConditions ?? []).includes(name),
  }))
  const handlers: Record<string, (args: Record<string, unknown>) => unknown> = {
    "asset.findFirst": () => asset,
    "asset.updateMany": () => ({ count: config.claimRows ?? 1 }),
    "asset.update": (args) => ({ id: "asset-1", ...(args.data as object) }),
    "assetCondition.findUnique": (args) => conditions.find((row) => row.id === (args.where as { id: string }).id) ?? null,
    "assetCondition.findMany": (args) => {
      const where = (args.where ?? {}) as { isActive?: boolean }
      return conditions.filter((row) => where.isActive === undefined || row.isActive === where.isActive)
    },
    "assetCondition.findFirst": (args) => {
      const where = args.where as { name: string; isActive?: boolean }
      return conditions.find((row) => row.name === where.name && (where.isActive === undefined || row.isActive === where.isActive)) ?? null
    },
    "assetCheckout.count": () => config.activeCheckouts ?? 0,
    "maintenanceTicket.count": (args) => ((args.where as Record<string, unknown>).createdAt ? 0 : config.openRecords ?? 0),
    "maintenanceTicket.create": (args) => ({ id: "ticket-1", ...(args.data as object) }),
    "maintenanceTicket.findFirst": () => config.ticket ?? null,
    "maintenanceTicket.updateMany": () => ({ count: config.ticketUpdateRows ?? 1 }),
    "maintenanceTicket.findUnique": () => ({ id: "ticket-1" }),
    "assetStatus.findFirst": (args) => ({ id: `status:${(args.where as { name: string }).name}` }),
    "employee.findFirst": () => ({ id: "emp-1" }),
    "supplier.findFirst": () => ({ id: "vendor-1" }),
    "assetMovement.create": () => ({ id: "movement-1" }),
    "maintenancePlan.findFirst": () => config.plan ?? null,
    "maintenancePlan.update": (args) => ({ id: "plan-1", ...(args.data as object) }),
  }
  const tx = new Proxy({}, {
    get(_target, model: string) {
      return new Proxy({}, {
        get(_inner, method: string) {
          return async (args: Record<string, unknown> = {}) => {
            const call = `${model}.${method}`
            calls.push({ call, args })
            const handler = handlers[call]
            if (!handler) throw new Error(`Unexpected call ${call}`)
            return handler(args)
          }
        },
      })
    },
  })
  return { calls, db: { $transaction: async (callback: (client: unknown) => Promise<unknown>) => callback(tx) } }
}

const user = { id: "user-1", employeeId: "emp-1" }
const baseInput = {
  assetId: "asset-1",
  maintenancePlanId: null,
  problem: "เปลี่ยนแบตเตอรี่",
  reportedDate: new Date("2026-10-07T00:00:00Z"),
  done: true,
  outcome: "usable" as const,
  conditionId: "condition:Good",
  reportedById: null,
  vendorId: null,
  repairCost: null,
  invoiceNo: null,
  remark: null,
}

const find = (calls: Call[], name: string) => calls.find(({ call }) => call === name)
const statusWrites = (calls: Call[]) =>
  calls.filter(({ call, args }) => call === "asset.updateMany" && (args.data as Record<string, unknown>).statusId !== undefined)

test("a finished repair is saved as closed without touching an operational asset", async () => {
  const { db, calls } = fakeDb()

  await createRepairRecord(db as never, baseInput, user)

  const data = find(calls, "maintenanceTicket.create")!.args.data as Record<string, unknown>
  assert.equal(data.repairStatus, "closed")
  assert.equal(data.outcome, "usable")
  assert.equal(data.reportedById, "emp-1")
  assert.equal(data.repairType, "internal")
  assert.deepEqual(statusWrites(calls), [])
})

test("a long problem is capped at the movement reason column but kept in full on the record", async () => {
  const { db, calls } = fakeDb()
  const problem = "ก".repeat(600)

  await createRepairRecord(db as never, { ...baseInput, problem }, user)

  const ticketData = find(calls, "maintenanceTicket.create")!.args.data as Record<string, unknown>
  const movementData = find(calls, "assetMovement.create")!.args.data as Record<string, unknown>
  assert.equal((ticketData.problem as string).length, 600)
  assert.equal((movementData.reason as string).length, 500)
})

test("an unfinished repair claims the asset and moves it to Under Maintenance", async () => {
  const { db, calls } = fakeDb()

  await createRepairRecord(db as never, { ...baseInput, done: false }, user)

  const data = find(calls, "maintenanceTicket.create")!.args.data as Record<string, unknown>
  assert.equal(data.repairStatus, "in_progress")
  assert.equal(data.outcome, null)
  assert.deepEqual(statusWrites(calls)[0].args, {
    where: { id: "asset-1", isActive: true, statusId: "status:Ready" },
    data: { statusId: "status:Under Maintenance", updatedBy: "user-1" },
  })
})

test("the open-record check runs after the asset row is claimed", async () => {
  const { db, calls } = fakeDb({ openRecords: 1 })

  await assert.rejects(
    createRepairRecord(db as never, baseInput, user),
    (error) => error instanceof MaintenanceApiError && error.code === "MAINTENANCE_OPEN_RECORD_EXISTS",
  )
  const order = calls.map(({ call }) => call)
  assert.ok(order.includes("asset.updateMany"))
  assert.ok(order.indexOf("asset.updateMany") < order.lastIndexOf("maintenanceTicket.count"))
  assert.equal(order.includes("maintenanceTicket.create"), false)
})

test("a concurrent change to the asset is reported as a conflict", async () => {
  const { db, calls } = fakeDb({ claimRows: 0 })

  await assert.rejects(
    createRepairRecord(db as never, baseInput, user),
    (error) => error instanceof MaintenanceApiError && error.code === "MAINTENANCE_CONFLICT" && error.status === 409,
  )
  assert.equal(calls.some(({ call }) => call === "maintenanceTicket.create"), false)
})

test("an account without an employee link must choose the reporter", async () => {
  const { db } = fakeDb()

  await assert.rejects(
    createRepairRecord(db as never, baseInput, { id: "admin" }),
    (error) => error instanceof MaintenanceApiError && error.code === "MAINTENANCE_REPORTER_REQUIRED",
  )
})

test("recording a PM moves the plan's next due date from the recorded date", async () => {
  const { db, calls } = fakeDb({
    plan: { id: "plan-1", assetId: "asset-1", frequency: "monthly", intervalDays: 30, planState: "active", nextDueDate: new Date("2026-09-30T00:00:00Z") },
  })

  await createRepairRecord(db as never, { ...baseInput, maintenancePlanId: "plan-1", reportedDate: new Date("2026-10-31T00:00:00Z") }, user)

  const update = find(calls, "maintenancePlan.update")!.args as { data: { nextDueDate: Date } }
  assert.equal(update.data.nextDueDate.toISOString().slice(0, 10), "2026-11-30")
})

test("finishing a permanently assigned asset's repair restores In Use", async () => {
  const ticket = {
    id: "ticket-1",
    repairStatus: "in_progress",
    updatedAt: new Date("2026-10-07T03:00:00Z"),
    assetId: "asset-1",
    asset: { id: "asset-1", statusId: "status:Under Maintenance", ownershipType: "shared", custodianId: "emp-9", status: { name: "Under Maintenance" } },
  }
  const { db, calls } = fakeDb({ ticket, activeCheckouts: 1 })

  await completeRepairRecord(db as never, "ticket-1", {
    action: "complete",
    expectedUpdatedAt: ticket.updatedAt,
    returnDate: new Date("2026-10-08T00:00:00Z"),
    outcome: "usable",
    conditionId: "condition:Good",
    vendorId: null,
    repairCost: 1200,
    invoiceNo: null,
    remark: null,
  }, user)

  assert.equal((statusWrites(calls)[0].args.data as Record<string, unknown>).statusId, "status:In Use")
  const ticketUpdate = find(calls, "maintenanceTicket.updateMany")!.args as { where: Record<string, unknown>; data: Record<string, unknown> }
  assert.deepEqual(ticketUpdate.where, { id: "ticket-1", isActive: true, updatedAt: ticket.updatedAt, repairStatus: "in_progress" })
  assert.equal(ticketUpdate.data.repairStatus, "closed")
  assert.equal(ticketUpdate.data.outcome, "usable")
})

test("legacy unfinished tickets can be finished", async () => {
  const ticket = {
    id: "ticket-1",
    repairStatus: "waiting_parts",
    updatedAt: new Date("2026-10-07T03:00:00Z"),
    assetId: "asset-1",
    asset: { id: "asset-1", statusId: "status:Under Maintenance", ownershipType: "shared", custodianId: null, status: { name: "Under Maintenance" } },
  }
  const { db, calls } = fakeDb({ ticket })

  await completeRepairRecord(db as never, "ticket-1", {
    action: "complete", expectedUpdatedAt: ticket.updatedAt, returnDate: new Date("2026-10-08T00:00:00Z"),
    outcome: "usable", conditionId: "condition:Good", vendorId: null, repairCost: null, invoiceNo: null, remark: null,
  }, user)

  assert.equal((find(calls, "maintenanceTicket.updateMany")!.args.where as Record<string, unknown>).repairStatus, "waiting_parts")
})

test("finished or cancelled records cannot be cancelled", async () => {
  const ticket = {
    id: "ticket-1", repairStatus: "closed", updatedAt: new Date("2026-10-07T03:00:00Z"), assetId: "asset-1",
    asset: { id: "asset-1", statusId: "status:Ready", ownershipType: "shared", custodianId: null, status: { name: "Ready" } },
  }
  const { db } = fakeDb({ ticket })

  await assert.rejects(
    cancelRepairRecord(db as never, "ticket-1", { action: "cancel", expectedUpdatedAt: ticket.updatedAt, reason: null }, user),
    (error) => error instanceof MaintenanceApiError && error.code === "MAINTENANCE_INVALID_TRANSITION",
  )
})

test("a stale edit is rejected as a conflict", async () => {
  const ticket = {
    id: "ticket-1", repairStatus: "in_progress", updatedAt: new Date("2026-10-07T03:00:00Z"), assetId: "asset-1",
    asset: { id: "asset-1", statusId: "status:Under Maintenance", ownershipType: "shared", custodianId: null, status: { name: "Under Maintenance" } },
  }
  const { db } = fakeDb({ ticket, ticketUpdateRows: 0 })

  await assert.rejects(
    cancelRepairRecord(db as never, "ticket-1", { action: "cancel", expectedUpdatedAt: new Date("2026-10-07T02:00:00Z"), reason: null }, user),
    (error) => error instanceof MaintenanceApiError && error.code === "MAINTENANCE_CONFLICT",
  )
})

// Closing a repair sets the asset's condition (group 3 spec §19.4, A1-R4, A1-R5).
const openTicket = (conditionName: string, statusName = "Under Maintenance") => ({
  id: "ticket-1",
  repairStatus: "in_progress",
  updatedAt: new Date("2026-10-07T03:00:00Z"),
  assetId: "asset-1",
  asset: {
    id: "asset-1",
    statusId: `status:${statusName}`,
    ownershipType: "shared",
    custodianId: null,
    conditionId: `condition:${conditionName}`,
    status: { name: statusName },
  },
})
const completeInput = (outcome: "usable" | "beyond_repair", conditionId: string | null) => ({
  action: "complete" as const,
  expectedUpdatedAt: new Date("2026-10-07T03:00:00Z"),
  returnDate: new Date("2026-10-08T00:00:00Z"),
  outcome,
  conditionId,
  vendorId: null,
  repairCost: null,
  invoiceNo: null,
  remark: null,
})
const conditionWrites = (calls: Call[]) =>
  calls.filter(({ call, args }) => call === "asset.update" && (args.data as Record<string, unknown>).conditionId !== undefined)
const movements = (calls: Call[], type: string) =>
  calls.filter(({ call, args }) => call === "assetMovement.create" && (args.data as Record<string, unknown>).movementType === type)
const writes = (calls: Call[]) =>
  calls.filter(({ call }) => /\.(create|createMany|update|updateMany|upsert|delete|deleteMany)$/.test(call)).map(({ call }) => call)

test("closing a repair on a เสียหาย asset as ใช้งานได้ + ดี sets ดี in the same transaction, with one condition_change movement", async () => {
  const { db, calls } = fakeDb({ ticket: openTicket("Damaged") })

  const result = await completeRepairRecord(db as never, "ticket-1", completeInput("usable", "condition:Good"), user)

  assert.deepEqual(conditionWrites(calls).map(({ args }) => args), [
    { where: { id: "asset-1" }, data: { conditionId: "condition:Good", updatedBy: "user-1" } },
  ])
  const changes = movements(calls, "condition_change")
  assert.equal(changes.length, 1)
  assert.deepEqual(changes[0].args.data, {
    assetId: "asset-1",
    movementType: "condition_change",
    fromValue: "condition:Damaged",
    toValue: "condition:Good",
    reason: null,
    referenceType: "maintenance",
    referenceId: "ticket-1",
    performedBy: "user-1",
  })
  assert.equal(movements(calls, "maintenance_close").length, 1)
  assert.equal(result.previousConditionId, "condition:Damaged")
  assert.equal(result.conditionId, "condition:Good")
})

test("a routine repair closed as ดี on an asset already ดี writes no condition change (Review Focus 3)", async () => {
  const { db, calls } = fakeDb({ ticket: openTicket("Good") })

  const result = await completeRepairRecord(db as never, "ticket-1", completeInput("usable", "condition:Good"), user)

  assert.deepEqual(conditionWrites(calls), [])
  assert.deepEqual(movements(calls, "condition_change"), [])
  assert.equal(result.previousConditionId, "condition:Good")
  assert.equal(result.conditionId, "condition:Good")
})

test("closing as ซ่อมไม่ได้ makes the condition ซาก and the status รอตัดจำหน่าย", async () => {
  const { db, calls } = fakeDb({ ticket: openTicket("Damaged") })

  const result = await completeRepairRecord(db as never, "ticket-1", completeInput("beyond_repair", null), user)

  assert.equal((statusWrites(calls)[0].args.data as Record<string, unknown>).statusId, "status:Pending Disposal")
  assert.equal((conditionWrites(calls)[0].args.data as Record<string, unknown>).conditionId, "condition:Salvage")
  assert.equal((movements(calls, "condition_change")[0].args.data as Record<string, unknown>).toValue, "condition:Salvage")
  assert.equal(result.conditionId, "condition:Salvage")
})

test("the ซาก master is found through normalizeAssetStateName, whatever its spacing or case (final review M8)", async () => {
  const { db, calls } = fakeDb({ ticket: openTicket("Damaged"), salvageName: "  salvage " })

  const result = await completeRepairRecord(db as never, "ticket-1", completeInput("beyond_repair", null), user)

  assert.equal(result.conditionId, "condition:Salvage")
  assert.equal(calls.some((call) => call.call === "assetCondition.findFirst"), false, "the active masters are read, not one by exact name")
})

test("closing as ซ่อมไม่ได้ without an active ซาก master is refused and writes nothing (A1-R5)", async () => {
  const { db, calls } = fakeDb({ ticket: openTicket("Damaged"), inactiveConditions: ["Salvage"] })

  await assert.rejects(
    completeRepairRecord(db as never, "ticket-1", completeInput("beyond_repair", null), user),
    (error) => error instanceof MaintenanceApiError && error.code === "ASSET_STATE_MASTER_NOT_FOUND" && error.status === 400,
  )
  assert.deepEqual(writes(calls), [])
})

test("closing as ใช้งานได้ with a condition other than ดี or พอใช้ is refused under the condition", async () => {
  for (const conditionId of ["condition:Damaged", "condition:New", "condition:missing"]) {
    const { db, calls } = fakeDb({ ticket: openTicket("Damaged") })

    await assert.rejects(
      completeRepairRecord(db as never, "ticket-1", completeInput("usable", conditionId), user),
      (error) => error instanceof MaintenanceApiError
        && error.status === 400
        && error.code === (conditionId === "condition:missing" ? "ASSET_STATE_MASTER_NOT_FOUND" : "ASSET_CONDITION_NOT_SELECTABLE")
        && JSON.stringify(error.fieldErrors) === JSON.stringify({ conditionId: "invalidConditionAfterRepair" }),
      conditionId,
    )
    assert.deepEqual(writes(calls), [], conditionId)
  }
})

test("recording a repair already done as ใช้งานได้ + พอใช้ writes what closing one does", async () => {
  const { db, calls } = fakeDb({ conditionName: "Damaged" })

  const result = await createRepairRecord(db as never, { ...baseInput, conditionId: "condition:Fair" }, user)

  assert.deepEqual(conditionWrites(calls).map(({ args }) => args), [
    { where: { id: "asset-1" }, data: { conditionId: "condition:Fair", updatedBy: "user-1" } },
  ])
  const changes = movements(calls, "condition_change")
  assert.equal(changes.length, 1)
  assert.deepEqual(changes[0].args.data, {
    assetId: "asset-1",
    movementType: "condition_change",
    fromValue: "condition:Damaged",
    toValue: "condition:Fair",
    reason: null,
    referenceType: "maintenance",
    referenceId: "ticket-1",
    performedBy: "user-1",
  })
  assert.equal(result.ticket.id, "ticket-1")
  assert.equal(result.previousConditionId, "condition:Damaged")
  assert.equal(result.conditionId, "condition:Fair")
})

test("recording an unfinished repair leaves the condition alone", async () => {
  const { db, calls } = fakeDb({ conditionName: "Damaged" })

  const result = await createRepairRecord(db as never, { ...baseInput, done: false, conditionId: null }, user)

  assert.deepEqual(conditionWrites(calls), [])
  assert.deepEqual(movements(calls, "condition_change"), [])
  assert.equal(result.conditionId, "condition:Damaged")
})

test("recording a repair already done as ใช้งานได้ with เสียหาย is refused before the record is written", async () => {
  const { db, calls } = fakeDb({ conditionName: "Damaged" })

  await assert.rejects(
    createRepairRecord(db as never, { ...baseInput, conditionId: "condition:Damaged" }, user),
    (error) => error instanceof MaintenanceApiError && error.code === "ASSET_CONDITION_NOT_SELECTABLE" && error.fieldErrors?.conditionId === "invalidConditionAfterRepair",
  )
  assert.equal(calls.some(({ call }) => call === "maintenanceTicket.create"), false)
})

// Group 5 plan 1, Task 3: the date rule, ยังซ่อมไม่เสร็จ on อยู่ระหว่างซ่อม and the plan moving only on a done visit.
// 00:30 on 3 Nov in Bangkok while a UTC server still reads 2 Nov (Review Focus 1).
const bangkokNow = new Date("2026-11-02T17:30:00Z")
const activePlan = { id: "plan-1", assetId: "asset-1", frequency: "monthly", intervalDays: 30, planState: "active", nextDueDate: new Date("2026-10-01T00:00:00Z") }
const futureDateRefusal = (field: string) => (error: unknown) => error instanceof MaintenanceApiError
  && error.code === "MAINTENANCE_DATE_IN_FUTURE"
  && error.status === 400
  && JSON.stringify(error.fieldErrors) === JSON.stringify({ [field]: "repairDateInFuture" })

test("a record dated Bangkok today is accepted at 00:30 Bangkok time; one dated tomorrow is refused before any write (G5P1-R6)", async () => {
  const today = fakeDb()
  await createRepairRecord(today.db as never, { ...baseInput, reportedDate: new Date("2026-11-03") }, user, bangkokNow)
  assert.ok(find(today.calls, "maintenanceTicket.create"))

  const tomorrow = fakeDb()
  await assert.rejects(
    createRepairRecord(tomorrow.db as never, { ...baseInput, reportedDate: new Date("2026-11-04") }, user, bangkokNow),
    futureDateRefusal("reportedDate"),
  )
  assert.deepEqual(tomorrow.calls, [])
})

test("a completion or an edit dated after Bangkok today is refused under its date (G5P1-R6)", async () => {
  const completion = fakeDb({ ticket: openTicket("Good") })
  await assert.rejects(
    completeRepairRecord(completion.db as never, "ticket-1", { ...completeInput("usable", "condition:Good"), returnDate: new Date("2026-11-04") }, user, bangkokNow),
    futureDateRefusal("returnDate"),
  )
  assert.deepEqual(writes(completion.calls), [])

  const edit = fakeDb({ ticket: openTicket("Good") })
  await assert.rejects(
    updateRepairRecordDetails(edit.db as never, "ticket-1", {
      action: "update", expectedUpdatedAt: new Date("2026-10-07T03:00:00Z"), reportedDate: new Date("2026-11-04"),
      problem: "เปลี่ยนแบตเตอรี่", vendorId: null, repairCost: null, invoiceNo: null, remark: null,
    }, user, bangkokNow),
    futureDateRefusal("reportedDate"),
  )
  assert.deepEqual(writes(edit.calls), [])
})

test("ยังซ่อมไม่เสร็จ on อยู่ระหว่างซ่อม changes no status and still writes its movement with from = to (G5P1-R10)", async () => {
  const { db, calls } = fakeDb({ statusName: "Under Maintenance" })

  await createRepairRecord(db as never, { ...baseInput, done: false, conditionId: null }, user)

  assert.deepEqual(statusWrites(calls), [])
  assert.equal((find(calls, "maintenanceTicket.create")!.args.data as Record<string, unknown>).repairStatus, "in_progress")
  const created = movements(calls, "maintenance_create")
  assert.equal(created.length, 1)
  const data = created[0].args.data as Record<string, unknown>
  assert.equal(data.fromValue, "status:Under Maintenance")
  assert.equal(data.toValue, "status:Under Maintenance")
})

test("a PM visit saved not done leaves its plan and stores no result (spec §5)", async () => {
  const { db, calls } = fakeDb({ plan: activePlan })

  await createRepairRecord(db as never, { ...baseInput, done: false, conditionId: null, maintenancePlanId: "plan-1" }, user)

  assert.ok(find(calls, "maintenancePlan.findFirst"), "the plan is still checked")
  assert.equal(find(calls, "maintenancePlan.update"), undefined)
  assert.equal((find(calls, "maintenanceTicket.create")!.args.data as Record<string, unknown>).outcome, null)
})

test("a PM visit on a paused plan is refused even when not done, before any record is written (G5P1-R8)", async () => {
  const { db, calls } = fakeDb({ plan: null })

  await assert.rejects(
    createRepairRecord(db as never, { ...baseInput, done: false, conditionId: null, maintenancePlanId: "plan-1" }, user),
    (error) => error instanceof MaintenanceApiError && error.code === "MAINTENANCE_PLAN_INVALID_TRANSITION" && error.status === 409,
  )
  const order = calls.map(({ call }) => call)
  assert.ok(order.indexOf("asset.updateMany") < order.indexOf("maintenancePlan.findFirst"), "checked after the claim")
  assert.equal(order.includes("maintenanceTicket.create"), false)
  assert.equal(order.includes("assetMovement.create"), false)
})

const pmTicket = () => ({ ...openTicket("Good"), maintenancePlanId: "plan-1" })

test("ซ่อมเสร็จ on a PM visit moves its active plan from the completion date (G5P1-R9)", async () => {
  const { db, calls } = fakeDb({ ticket: pmTicket(), plan: activePlan })

  await completeRepairRecord(db as never, "ticket-1", { ...completeInput("usable", "condition:Good"), returnDate: new Date("2026-10-08T00:00:00Z") }, user)

  const lookup = find(calls, "maintenancePlan.findFirst")!.args as { where: Record<string, unknown> }
  assert.deepEqual(lookup.where, { id: "plan-1", assetId: "asset-1", planState: "active", isActive: true })
  const update = find(calls, "maintenancePlan.update")!.args as { data: { nextDueDate: Date } }
  assert.equal(update.data.nextDueDate.toISOString().slice(0, 10), "2026-11-08")
})

test("ซ่อมเสร็จ on a PM visit whose plan was paused or ended closes the record and leaves the plan (Review Focus 2)", async () => {
  const { db, calls } = fakeDb({ ticket: pmTicket(), plan: null })

  await completeRepairRecord(db as never, "ticket-1", completeInput("usable", "condition:Good"), user)

  assert.equal((find(calls, "maintenanceTicket.updateMany")!.args.data as Record<string, unknown>).repairStatus, "closed")
  assert.equal(find(calls, "maintenancePlan.update"), undefined)
})

test("ซ่อมเสร็จ on a record without a plan reads no plan", async () => {
  const { db, calls } = fakeDb({ ticket: openTicket("Good") })

  await completeRepairRecord(db as never, "ticket-1", completeInput("usable", "condition:Good"), user)

  assert.equal(find(calls, "maintenancePlan.findFirst"), undefined)
})
