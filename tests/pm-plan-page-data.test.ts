import assert from "node:assert/strict"
import test from "node:test"

import { readPmPlanPage, type PmPlanPageDb } from "../src/lib/pm-plan-page-data.ts"
import { buildPmPlanSearchWhere, type PmPlanRecord } from "../src/lib/pm-plan-list.ts"

// Group 5 plan 4 Task 1 (G5P4-R1, R4, R5; Review Focus 1): one read for the PM page, with counts that follow the search.
const now = new Date("2026-11-02T17:30:00Z")

function record(id: string, assetId: string, nextDueDate: string): PmPlanRecord {
  return {
    id,
    planNo: `PM-${id}`,
    title: `UPS ${id}`,
    frequency: "monthly",
    intervalDays: 30,
    nextDueDate: new Date(nextDueDate),
    planState: "active",
    isActive: true,
    updatedAt: new Date("2026-10-01T00:00:00Z"),
    asset: { id: assetId, name: `UPS ${assetId}`, assetTag: `AT-${assetId}`, isActive: true, status: { name: "In Use", nameTh: "ใช้งาน" } },
    vendor: null,
  }
}

function fakeDb(rows: PmPlanRecord[]) {
  const calls = { groupBy: [] as unknown[], aggregate: [] as unknown[], count: [] as unknown[], findMany: [] as unknown[], tickets: [] as unknown[] }
  const db: PmPlanPageDb = {
    maintenancePlan: {
      async groupBy(args) {
        calls.groupBy.push(args)
        return [
          { planState: "active", _count: { _all: 2 } },
          { planState: "ended", _count: { _all: 1 } },
        ]
      },
      async aggregate(args) {
        calls.aggregate.push(args)
        const where = JSON.stringify(args.where)
        const count = where.includes('"lt"') ? 1 : where.includes('"gt"') ? 0 : 1
        return { _count: { _all: count }, _min: { nextDueDate: null } }
      },
      async count(args) {
        calls.count.push(args)
        return JSON.stringify(args.where).includes(`"in":["Disposed"`) ? 0 : 9
      },
      async findMany(args) {
        calls.findMany.push(args)
        return rows
      },
    },
    maintenanceTicket: {
      async findMany(args) {
        calls.tickets.push(args)
        return [
          { id: "rec-new", repairNo: "RP-2", assetId: "a1" },
          { id: "rec-old", repairNo: "RP-1", assetId: "a1" },
        ]
      },
    },
  }
  return { db, calls }
}

test("readPmPlanPage: the tab counts and every due count carry the search (Review Focus 1)", async () => {
  const { db, calls } = fakeDb([record("1", "a1", "2026-10-20T00:00:00Z"), record("2", "a2", "2026-11-04T00:00:00Z")])
  const query = { tab: "active" as const, q: "UPS", due: null, page: 1, pageSize: 25 }
  const page = await readPmPlanPage(db, query, now)
  const search = buildPmPlanSearchWhere("UPS")

  assert.deepEqual(calls.groupBy, [{ by: ["planState"], where: search, _count: { _all: true } }])
  assert.equal(calls.aggregate.length, 4)
  for (const args of calls.aggregate) {
    const and = (args as { where: { AND?: unknown[] } }).where.AND
    assert.ok(Array.isArray(and) && and.some((part) => JSON.stringify(part) === JSON.stringify(search)), "each bucket carries the search")
  }
  assert.deepEqual(page.tabCounts, { active: 2, paused: 0, ended: 1 })
  assert.equal(page.total, 2)
  assert.equal(page.allPlansCount, 9, "with a search, all plans are counted without it")
  assert.ok(page.due)
  assert.equal(page.due.overdue.count, 1)
  assert.equal(page.due.later.count, 0)
})

test("readPmPlanPage: the open records of the page's assets come from one read, the newest per asset (G5P4-R5)", async () => {
  const { db, calls } = fakeDb([record("1", "a1", "2026-10-20T00:00:00Z"), record("2", "a2", "2026-11-04T00:00:00Z")])
  const page = await readPmPlanPage(db, { tab: "active", q: "", due: null, page: 1, pageSize: 25 }, now)

  assert.equal(calls.tickets.length, 1)
  const args = calls.tickets[0] as { where: { assetId: { in: string[] }; isActive: boolean; repairStatus: unknown } }
  assert.deepEqual(args.where.assetId, { in: ["a1", "a2"] })
  assert.equal(args.where.isActive, true)
  assert.deepEqual(args.where.repairStatus, { notIn: ["closed", "cancelled"] })
  assert.deepEqual(page.rows[0].openRecord, { id: "rec-new", repairNo: "RP-2" })
  assert.equal(page.rows[0].due.kind, "badge", "the plan still counts by its due date")
  assert.equal(page.rows[1].openRecord, null)
  assert.equal(page.allPlansCount, 3, "without a search, all plans are the tab counts' sum")
  assert.deepEqual(calls.count.map((args) => JSON.stringify(args).includes(`"in":["Disposed"`)), [true], "only the out-of-scope count")
})

test("readPmPlanPage: the window and the due filter's total, and the ended tab orders newest first", async () => {
  const { db, calls } = fakeDb([])
  const filtered = await readPmPlanPage(db, { tab: "active", q: "", due: "overdue", page: 2, pageSize: 50 }, now)
  const findArgs = calls.findMany[0] as { skip: number; take: number; orderBy: unknown }
  assert.equal(findArgs.skip, 50)
  assert.equal(findArgs.take, 50)
  assert.equal(filtered.total, 9, "with a due filter the total is counted on the list's where")
  assert.equal(calls.tickets.length, 0, "no rows, no record read")

  const ended = fakeDb([])
  const page = await readPmPlanPage(ended.db, { tab: "ended", q: "", due: null, page: 1, pageSize: 25 }, now)
  assert.deepEqual((ended.calls.findMany[0] as { orderBy: unknown }).orderBy, [{ updatedAt: "desc" }, { id: "asc" }])
  assert.deepEqual((ended.calls.findMany[0] as { where: unknown }).where, { AND: [{ planState: "ended" }] })
  assert.equal(page.due, null, "the due counts are read on the active tab only")
  assert.equal(ended.calls.aggregate.length, 0)
  assert.equal(page.total, 1)
})
