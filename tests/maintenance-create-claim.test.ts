import assert from "node:assert/strict"
import test from "node:test"

import { MaintenanceApiError } from "../src/lib/maintenance-api-errors.ts"
import { createCorrectiveMaintenanceTicket } from "../src/lib/maintenance-ticket-service.ts"

type Call = { call: string; args: Record<string, unknown> }

function fakeDb(options: { statusName: string; statusId: string; claimedRows: number; activeCorrectiveTickets: number }) {
  const calls: Call[] = []
  const handlers: Record<string, (args: Record<string, unknown>) => unknown> = {
    "asset.findFirst": () => ({ id: "asset-1", statusId: options.statusId, status: { name: options.statusName } }),
    "asset.updateMany": () => ({ count: options.claimedRows }),
    "maintenanceTicket.count": (args) => ((args.where as Record<string, unknown>).createdAt ? 0 : options.activeCorrectiveTickets),
    "employee.findFirst": () => ({ id: "emp-1" }),
    "assetStatus.findFirst": () => ({ id: "status-pending-repair" }),
    "maintenanceTicket.create": () => ({ id: "ticket-1", repairNo: "MT-20261007-0001" }),
    "assetMovement.create": () => ({ id: "movement-1" }),
  }
  const tx = new Proxy({}, {
    get(_target, model: string) {
      return new Proxy({}, {
        get(_inner, method: string) {
          return async (args: Record<string, unknown>) => {
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

const input = {
  assetId: "asset-1",
  problem: "จอไม่ติด",
  reportedById: "emp-1",
  reportedDate: new Date("2026-10-07T02:00:00Z"),
  repairType: "internal",
}
const user = { id: "user-1", roles: ["system_admin"], permissions: [], employeeId: "emp-1" }

function create(db: unknown) {
  return createCorrectiveMaintenanceTicket(db as never, input as never, user as never)
}

test("opening a repair claims the asset while it still has the status that was checked", async () => {
  const { db, calls } = fakeDb({ statusName: "Ready", statusId: "status-ready", claimedRows: 1, activeCorrectiveTickets: 0 })

  await create(db)

  const claim = calls.find(({ call }) => call === "asset.updateMany")
  assert.deepEqual(claim?.args, {
    where: { id: "asset-1", isActive: true, statusId: "status-ready" },
    data: { statusId: "status-pending-repair", updatedBy: "user-1" },
  })
  const order = calls.map(({ call }) => call)
  assert.ok(order.indexOf("asset.updateMany") < order.indexOf("maintenanceTicket.create"))
})

test("the second of two concurrent repair requests is rejected without creating a ticket", async () => {
  const { db, calls } = fakeDb({ statusName: "Ready", statusId: "status-ready", claimedRows: 0, activeCorrectiveTickets: 0 })

  await assert.rejects(create(db), (error) => error instanceof MaintenanceApiError && error.status === 409)
  assert.equal(calls.some(({ call }) => call === "maintenanceTicket.create"), false)
})

test("the duplicate-ticket check runs after the claim so it sees a ticket committed by a concurrent request", async () => {
  const { db, calls } = fakeDb({ statusName: "Pending Repair", statusId: "status-pending-repair", claimedRows: 1, activeCorrectiveTickets: 1 })

  await assert.rejects(create(db), (error) => error instanceof MaintenanceApiError && error.code === "MAINTENANCE_ACTIVE_TICKET_EXISTS")
  const order = calls.map(({ call }) => call)
  assert.ok(order.includes("asset.updateMany"), "the asset must be claimed first")
  assert.ok(order.indexOf("asset.updateMany") < order.lastIndexOf("maintenanceTicket.count"))
  assert.equal(order.includes("maintenanceTicket.create"), false)
})

test("a Pending Repair asset without a ticket gets one and stays Pending Repair", async () => {
  const { db, calls } = fakeDb({ statusName: "Pending Repair", statusId: "status-pending-repair", claimedRows: 1, activeCorrectiveTickets: 0 })

  await create(db)

  assert.ok(calls.some(({ call }) => call === "maintenanceTicket.create"))
  const claim = calls.find(({ call }) => call === "asset.updateMany")
  assert.deepEqual((claim?.args.data as Record<string, unknown>).statusId, "status-pending-repair")
})
