import assert from "node:assert/strict"
import test from "node:test"

import { buildMaintenanceWhere, buildMaintenanceWhereWithoutStatus, parseMaintenanceListParams } from "../src/lib/maintenance-query.ts"
import { readRepairListPage, type RepairListPageDb } from "../src/lib/repair-list-page-data.ts"
import type { RepairListRecord } from "../src/lib/repair-list-view.ts"
import { buildDuePmPlanWhere } from "../src/lib/preventive-maintenance.ts"
import { openRepairRecordWhere } from "../src/lib/repair-record-policy.ts"
import { stuckRepairsWhere } from "../src/lib/waiting-work-rules.ts"

// Group 5 plan 5 Task 1 (G5P5-R1..R4, R6, R7; Review Focus 1, 5): one read for the repair list.
const now = new Date("2026-11-04T17:30:00Z")

function record(id: string, repairStatus: string): RepairListRecord {
  return {
    id,
    repairNo: `RP-${id}`,
    reportedDate: new Date("2026-10-31T02:00:00Z"),
    returnDate: null,
    repairStatus,
    outcome: null,
    problem: "เปิดไม่ติด",
    resolution: null,
    repairCost: null,
    createdBy: "admin",
    maintenancePlanId: null,
    asset: { name: `UPS ${id}`, assetTag: `AT-${id}` },
    reportedBy: { fullNameTh: "สมชาย" },
    vendor: null,
  }
}

type Calls = Record<"records" | "count" | "groupBy" | "aggregate" | "stuck" | "stuckCount" | "planAggregate" | "planCount" | "plans" | "movements", unknown[]>

function fakeDb(rows: RepairListRecord[], options: { cancelledCount?: number } = {}) {
  const calls: Calls = {
    records: [], count: [], groupBy: [], aggregate: [], stuck: [], stuckCount: [],
    planAggregate: [], planCount: [], plans: [], movements: [],
  }
  const db = {
    maintenanceTicket: {
      async findMany(args: unknown) {
        calls.records.push(args)
        return rows
      },
      async count(args: { where: unknown }) {
        calls.count.push(args)
        return JSON.stringify(args.where).includes(`{"repairStatus":"cancelled"}`) ? options.cancelledCount ?? 2 : 41
      },
      async groupBy(args: unknown) {
        calls.groupBy.push(args)
        return [
          { repairStatus: "in_progress", _count: { _all: 2 } },
          { repairStatus: "reported", _count: { _all: 1 } },
          { repairStatus: "closed", _count: { _all: 3 } },
          { repairStatus: "cancelled", _count: { _all: 1 } },
        ]
      },
      async aggregate(args: { _sum?: unknown; _min?: unknown }) {
        calls.aggregate.push(args)
        if (args._sum) return { _count: { _all: 6 }, _sum: { repairCost: { toString: () => "1500.25" } } }
        return { _count: { _all: 4 }, _min: { reportedDate: new Date("2026-10-01T02:00:00Z") } }
      },
    },
    asset: {
      async findMany(args: unknown) {
        calls.stuck.push(args)
        return [{ id: "a1", name: "Printer", assetTag: "AT-1", currentLocation: { name: "ห้อง 3" } }]
      },
      async count(args: unknown) {
        calls.stuckCount.push(args)
        return 5
      },
    },
    maintenancePlan: {
      async aggregate(args: { where: unknown }) {
        calls.planAggregate.push(args)
        const where = JSON.stringify(args.where)
        // overdue reads lt, week reads gte+lte; soon and later return 0 here.
        const count = where.includes('"lt"') ? 2 : where.includes('"gte"') && !where.includes('"gt"') ? 3 : 0
        return { _count: { _all: count }, _min: { nextDueDate: null } }
      },
      async count(args: unknown) {
        calls.planCount.push(args)
        return 0
      },
      async findMany(args: unknown) {
        calls.plans.push(args)
        return [
          {
            id: "p1",
            title: "ล้างแอร์",
            nextDueDate: new Date("2026-11-01T17:00:00Z"),
            asset: { name: "แอร์", assetTag: "AT-2", maintenanceTickets: [{ id: "rec-9", repairNo: "RP-9" }] },
          },
        ]
      },
    },
    assetMovement: {
      async findMany(args: unknown) {
        calls.movements.push(args)
        return [
          { referenceId: "c1", reason: "พิมพ์ผิด", performedAt: new Date("2026-11-01T00:00:00Z") },
          { referenceId: "c1", reason: "แจ้งซ้ำ", performedAt: new Date("2026-11-02T00:00:00Z") },
        ]
      },
    },
  } as unknown as RepairListPageDb
  return { db, calls }
}

test("the counts follow the filters: the cost leaves out cancelled rows, the tabs drop the status", async () => {
  const filters = parseMaintenanceListParams({ search: "UPS", status: "in_progress", page: "2", pageSize: "50" })
  const where = buildMaintenanceWhere(filters)
  const { db, calls } = fakeDb([record("r1", "in_progress")])
  const page = await readRepairListPage(db, filters, now)

  assert.equal(page.total, 41)
  assert.deepEqual(page.statusCounts, { all: 7, in_progress: 3, closed: 3, cancelled: 1 })
  assert.deepEqual(page.cost, { count: 6, sum: 1500.25, cancelled: 2 })

  const records = calls.records[0] as { where: unknown; skip: number; take: number; orderBy: unknown }
  assert.deepEqual(records.where, where)
  assert.equal(records.skip, 50)
  assert.equal(records.take, 50)
  assert.deepEqual(records.orderBy, [{ reportedDate: "desc" }, { createdAt: "desc" }])
  assert.deepEqual((calls.groupBy[0] as { where: unknown }).where, buildMaintenanceWhereWithoutStatus(filters))

  const costCall = calls.aggregate.find((args) => (args as { _sum?: unknown })._sum) as { where: unknown }
  assert.deepEqual(costCall.where, { AND: [where, { repairStatus: { not: "cancelled" } }] })
  assert.ok(calls.count.some((args) => JSON.stringify((args as { where: unknown }).where) === JSON.stringify({ AND: [where, { repairStatus: "cancelled" }] })))
  assert.ok(calls.count.some((args) => JSON.stringify((args as { where: unknown }).where) === JSON.stringify(where)))
  // No cancelled row on the page, so no movement read.
  assert.equal(calls.movements.length, 0)
})

test("a null cost sum is 0", async () => {
  const { db } = fakeDb([])
  const aggregate = db.maintenanceTicket.aggregate.bind(db.maintenanceTicket)
  ;(db.maintenanceTicket as unknown as { aggregate: unknown }).aggregate = async (args: { _sum?: unknown }) =>
    args._sum ? { _count: { _all: 0 }, _sum: { repairCost: null } } : aggregate(args as never)
  const page = await readRepairListPage(db, parseMaintenanceListParams({}), now)
  assert.deepEqual(page.cost, { count: 0, sum: 0, cancelled: 2 })
})

test("on the cancelled tab the cost is empty and the cancelled rows read their latest reason", async () => {
  const filters = parseMaintenanceListParams({ status: "cancelled" })
  const { db, calls } = fakeDb([record("c1", "cancelled"), record("c2", "cancelled")], { cancelledCount: 2 })
  const page = await readRepairListPage(db, filters, now)
  assert.deepEqual(page.cost, { count: 0, sum: 0, cancelled: 2 })
  assert.deepEqual(calls.movements[0], {
    where: { referenceType: "maintenance", referenceId: { in: ["c1", "c2"] }, movementType: "maintenance_cancel" },
    select: { referenceId: true, reason: true, performedAt: true },
    orderBy: { performedAt: "asc" },
  })
  assert.deepEqual(page.rows[0].line, { kind: "cancelReason", text: "แจ้งซ้ำ" })
  assert.equal(page.rows[1].line, null)
})

test("an inverted date range: the tab counts and the cost follow the same date-less where", async () => {
  const filters = parseMaintenanceListParams({ dateFrom: "2026-10-08", dateTo: "2026-10-01" })
  const { db, calls } = fakeDb([])
  await readRepairListPage(db, filters, now)
  const costCall = calls.aggregate.find((args) => (args as { _sum?: unknown })._sum) as { where: { AND: [object, object] } }
  assert.equal("reportedDate" in costCall.where.AND[0], false)
  assert.equal("reportedDate" in (calls.groupBy[0] as { where: object }).where, false)
})

test("the stuck card reads 3 rows, or every row with stuck=all", async () => {
  const short = fakeDb([])
  const page = await readRepairListPage(short.db, parseMaintenanceListParams({}), now)
  assert.deepEqual(short.calls.stuck[0], {
    where: stuckRepairsWhere,
    select: { id: true, name: true, assetTag: true, currentLocation: { select: { name: true } } },
    orderBy: { assetTag: "asc" },
    take: 3,
  })
  assert.deepEqual(short.calls.stuckCount[0], { where: stuckRepairsWhere })
  assert.deepEqual(page.stuck, { rows: [{ id: "a1", name: "Printer", assetTag: "AT-1", roomName: "ห้อง 3" }], total: 5 })

  const all = fakeDb([])
  await readRepairListPage(all.db, parseMaintenanceListParams({ stuck: "all" }), now)
  assert.equal("take" in (all.calls.stuck[0] as object), false)
})

test("the strip counts globally and its total is the four counts", async () => {
  const { db, calls } = fakeDb([])
  const page = await readRepairListPage(db, parseMaintenanceListParams({ search: "UPS" }), now)
  const openCall = calls.aggregate.find((args) => (args as { _min?: unknown })._min) as { where: unknown }
  assert.deepEqual(openCall.where, openRepairRecordWhere)
  assert.deepEqual(page.strip.open, { count: 4, earliest: new Date("2026-10-01T02:00:00Z") })
  assert.equal(page.strip.stuck, 5)
  assert.equal(page.strip.pmOverdue.count, 2)
  assert.equal(page.strip.pmWeek.count, 3)
  assert.equal(page.strip.total, 4 + 5 + 2 + 3)
})

test("the PM card reads 3 due plans with their asset's open record", async () => {
  const { db, calls } = fakeDb([])
  const page = await readRepairListPage(db, parseMaintenanceListParams({}), now)
  const plans = calls.plans[0] as { where: unknown; orderBy: unknown; take: number; select: { asset: { select: { maintenanceTickets: unknown } } } }
  assert.deepEqual(plans.where, buildDuePmPlanWhere(now))
  assert.deepEqual(plans.orderBy, { nextDueDate: "asc" })
  assert.equal(plans.take, 3)
  assert.deepEqual(plans.select.asset.select.maintenanceTickets, {
    where: openRepairRecordWhere,
    select: { id: true, repairNo: true },
    orderBy: [{ reportedDate: "desc" }, { createdAt: "desc" }],
    take: 1,
  })
  assert.equal(page.pm.overdue, 2)
  assert.equal(page.pm.week, 3)
  assert.deepEqual(page.pm.rows[0].badge, { kind: "overdue", days: 3 })
  assert.deepEqual(page.pm.rows[0].openRecord, { id: "rec-9", repairNo: "RP-9" })
})
