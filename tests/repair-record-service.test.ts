import assert from "node:assert/strict"
import test from "node:test"

import { MaintenanceApiError } from "../src/lib/maintenance-api-errors.ts"
import {
  cancelRepairRecord,
  completeRepairRecord,
  createRepairRecord,
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
}

function fakeDb(config: FakeConfig = {}) {
  const calls: Call[] = []
  const asset = {
    id: "asset-1",
    statusId: `status:${config.statusName ?? "Ready"}`,
    ownershipType: config.ownershipType ?? "shared",
    custodianId: config.custodianId ?? null,
    status: { name: config.statusName ?? "Ready" },
  }
  const handlers: Record<string, (args: Record<string, unknown>) => unknown> = {
    "asset.findFirst": () => asset,
    "asset.updateMany": () => ({ count: config.claimRows ?? 1 }),
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
    outcome: "usable", vendorId: null, repairCost: null, invoiceNo: null, remark: null,
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
