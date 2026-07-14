import assert from "node:assert/strict"
import test from "node:test"

import { MaintenanceApiError } from "../src/lib/maintenance-api-errors.ts"
import {
  closeMaintenanceTicket,
  createCorrectiveMaintenanceTicket,
  transitionMaintenanceTicket,
  type MaintenanceServiceDb,
} from "../src/lib/maintenance-ticket-service.ts"

const expectedUpdatedAt = new Date("2026-07-14T03:00:00.000Z")

test("corrective creation rejects a second active corrective ticket", async () => {
  const db = fakeDb({ activeCorrectiveCount: 1 })

  await assert.rejects(
    () => createCorrectiveMaintenanceTicket(db, createInput, { id: "user-1" }),
    hasMaintenanceCode("MAINTENANCE_ACTIVE_TICKET_EXISTS"),
  )
})

test("corrective in-progress updates ticket, asset, and movement atomically", async () => {
  const db = fakeDb({ ticketStatus: "accepted", assetStatus: "Pending Repair" })

  await transitionMaintenanceTicket(
    db,
    "ticket-1",
    { repairStatus: "in_progress", expectedUpdatedAt },
    { id: "user-1" },
  )

  assert.deepEqual(db.events, [
    "ticket:in_progress",
    "asset:Under Maintenance",
    "movement:maintenance_status_update",
  ])
})

test("stale transition returns a typed conflict", async () => {
  const db = fakeDb({ ticketStatus: "accepted", conditionalUpdateCount: 0 })

  await assert.rejects(
    () => transitionMaintenanceTicket(
      db,
      "ticket-1",
      { repairStatus: "in_progress", expectedUpdatedAt },
      { id: "user-1" },
    ),
    hasMaintenanceCode("MAINTENANCE_CONFLICT"),
  )
})

test("corrective close updates ticket, asset, and movement atomically", async () => {
  const db = fakeDb({ ticketStatus: "completed", nextAssetStatus: "Ready" })

  await closeMaintenanceTicket(db, "ticket-1", closeInput, { id: "user-1" })

  assert.deepEqual(db.events, ["ticket:closed", "asset:Ready", "movement:maintenance_close"])
})

test("close requires maintenance evidence", async () => {
  const db = fakeDb({ ticketStatus: "completed", attachmentCount: 0 })

  await assert.rejects(
    () => closeMaintenanceTicket(db, "ticket-1", closeInput, { id: "user-1" }),
    hasMaintenanceCode("MAINTENANCE_EVIDENCE_REQUIRED"),
  )
})

test("closing a PM ticket never writes an asset lifecycle update", async () => {
  const db = fakeDb({ ticketStatus: "completed", ticketKind: "pm" })

  await closeMaintenanceTicket(db, "ticket-1", pmCloseInput, { id: "user-1" })

  assert.equal(db.events.some((event) => event.startsWith("asset:")), false)
})

function hasMaintenanceCode(code: string) {
  return (error: unknown) => error instanceof MaintenanceApiError && error.code === code
}

const createInput = {
  assetId: "asset-1",
  problem: "UPS does not start",
  reportedById: "employee-1",
  reportedDate: new Date("2026-07-14T02:00:00.000Z"),
  repairType: "internal" as const,
  warrantyClaim: false,
}

const closeInput = {
  expectedUpdatedAt,
  warrantyClaim: false,
  rootCause: "Battery failure",
  resolution: "Replaced battery",
  returnDate: new Date("2026-07-14T05:00:00.000Z"),
  inspectedById: "employee-1",
  nextStatusId: "status-ready",
}

const pmCloseInput = {
  expectedUpdatedAt,
  warrantyClaim: false,
  rootCause: "Inspection complete",
  resolution: "No fault found",
  returnDate: new Date("2026-07-14T05:00:00.000Z"),
  inspectedById: "employee-1",
}

function fakeDb(config: {
  activeCorrectiveCount?: number
  ticketStatus?: string
  assetStatus?: string
  conditionalUpdateCount?: number
  nextAssetStatus?: string
  attachmentCount?: number
  ticketKind?: "corrective" | "pm"
} = {}) {
  const events: string[] = []
  const ticket = {
    id: "ticket-1",
    assetId: "asset-1",
    maintenancePlanId: config.ticketKind === "pm" ? "plan-1" : null,
    problem: "UPS does not start",
    repairStatus: config.ticketStatus ?? "reported",
    assignedToId: null,
    dueDate: null,
    updatedAt: expectedUpdatedAt,
    asset: {
      id: "asset-1",
      statusId: "status-current",
      status: { id: "status-current", name: config.assetStatus ?? "Available", nameTh: "พร้อมใช้งาน" },
    },
  }
  const tx = {
    asset: {
      findFirst: async () => ticket.asset,
      update: async ({ data }: { data: { statusId: string } }) => {
        const status = data.statusId === "status-maintenance"
          ? "Under Maintenance"
          : data.statusId === "status-ready" ? "Ready" : data.statusId
        events.push(`asset:${status}`)
        return ticket.asset
      },
    },
    assetStatus: {
      findFirst: async ({ where }: { where: { id?: string } }) => where.id
        ? { id: "status-ready", name: config.nextAssetStatus ?? "Ready", nameTh: "พร้อมใช้งาน" }
        : { id: "status-maintenance", name: "Under Maintenance", nameTh: "กำลังซ่อม" },
    },
    employee: { findFirst: async () => ({ id: "employee-1" }) },
    supplier: { findFirst: async () => ({ id: "vendor-1" }) },
    attachment: { count: async () => config.attachmentCount ?? 1 },
    maintenanceTicket: {
      count: async ({ where }: { where: { isActive?: boolean } }) =>
        where.isActive ? config.activeCorrectiveCount ?? 0 : 0,
      findFirst: async () => ticket,
      findUnique: async () => ticket,
      create: async () => ticket,
      updateMany: async ({ data }: { data: { repairStatus: string } }) => {
        events.push(`ticket:${data.repairStatus}`)
        ticket.repairStatus = data.repairStatus
        return { count: config.conditionalUpdateCount ?? 1 }
      },
    },
    assetMovement: {
      create: async ({ data }: { data: { movementType: string } }) => {
        events.push(`movement:${data.movementType}`)
        return { id: "movement-1" }
      },
    },
  }
  return {
    events,
    $transaction: async <T>(operation: (client: typeof tx) => Promise<T>) => operation(tx),
  } as unknown as MaintenanceServiceDb & { events: string[] }
}
