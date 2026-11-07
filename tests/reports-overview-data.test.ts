import assert from "node:assert/strict"
import test from "node:test"

import {
  getReportsOverviewData,
  parseReportBreakdownDimension,
  parseReportPhoneGroup,
  type ReportsOverviewDb,
  type ReportsOverviewInput,
} from "../src/lib/reports-overview-data.ts"

// Group 10 plan 1 Task 2 (spec §4): the overview's reads through a fake db that groups its own asset rows, so the
// strip, the six tables, the full list and the preview are checked against the same data.

type Asset = {
  id: string
  statusId: string
  categoryId: string
  companyId: string
  branchId: string
  departmentId: string | null
  ownershipType: string | null
  purchasePrice: number | null
}

const statuses = [
  { id: "s-use", name: "In Use", nameTh: "ใช้งานอยู่" },
  { id: "s-ready", name: "Available", nameTh: "พร้อมใช้งาน" },
  { id: "s-pending", name: "Pending Disposal", nameTh: "รอตัดจำหน่าย" },
  { id: "s-disposed", name: "Disposed", nameTh: "ตัดจำหน่ายแล้ว" },
  { id: "s-retired", name: "Retired", nameTh: "ปลดระวาง" },
]
const departments = [
  { id: "d-acc", code: "ACC", name: "ฝ่ายบัญชี" },
  { id: "d-it", code: "IT", name: "ฝ่ายไอที" },
  { id: "d-sales", code: "SAL", name: "ฝ่ายขาย" },
]

function asset(id: string, statusId: string, departmentId: string | null, purchasePrice: number | null = 100): Asset {
  return { id, statusId, categoryId: "c-nb", companyId: "co-a", branchId: "b-hq", departmentId, ownershipType: "personal", purchasePrice }
}

function fakeDb(rows: Asset[]) {
  const calls: Array<{ by: string; where: unknown }> = []
  const byId = <T extends { id: string }>(records: T[]) => async (args: object) => {
    const where = (args as { where: { id?: { in: string[] }; name?: { in: string[] } } }).where
    if (where.name) return records.filter((record) => (record as unknown as { name: string }).name && where.name!.in.includes((record as unknown as { name: string }).name))
    return records.filter((record) => where.id!.in.includes(record.id))
  }
  const db: ReportsOverviewDb = {
    asset: {
      async groupBy(args: object) {
        const { by, where } = args as { by: Array<keyof Asset>; where: unknown }
        calls.push({ by: by[0], where })
        const counts = new Map<unknown, number>()
        for (const row of rows) counts.set(row[by[0]], (counts.get(row[by[0]]) ?? 0) + 1)
        return [...counts].map(([key, count]) => ({ [by[0]]: key, _count: { _all: count } }))
      },
      async aggregate() {
        const priced = rows.filter((row) => row.purchasePrice !== null)
        return { _sum: { purchasePrice: priced.length ? priced.reduce((sum, row) => sum + (row.purchasePrice ?? 0), 0) : null } }
      },
      async findMany(args: object) {
        const { take } = args as { take: number }
        return rows.slice(0, take).map((row) => {
          const status = statuses.find((item) => item.id === row.statusId)!
          const department = departments.find((item) => item.id === row.departmentId) ?? null
          return {
            id: row.id,
            assetTag: `TAG-${row.id}`,
            name: `Asset ${row.id}`,
            ownershipType: row.ownershipType,
            category: { code: "NB", name: "โน้ตบุ๊ก" },
            branch: { code: "HQ", name: "สำนักงานใหญ่" },
            department,
            custodian: null,
            status: { name: status.name, nameTh: status.nameTh },
          }
        })
      },
    },
    assetStatus: { findMany: byId(statuses) },
    assetCategory: { findMany: byId([{ id: "c-nb", code: "NB", name: "โน้ตบุ๊ก" }]) },
    company: { findMany: byId([{ id: "co-a", code: "A", nameTh: "บริษัท เอ" }]) },
    branch: { findMany: byId([{ id: "b-hq", code: "HQ", name: "สำนักงานใหญ่", company: { code: "A" } }]) },
    department: { findMany: byId(departments) },
  }
  return { db, calls }
}

function input(overrides: Partial<ReportsOverviewInput> = {}): ReportsOverviewInput {
  return {
    locale: "th",
    baseQuery: new URLSearchParams("companyId=co-a"),
    breakdown: null,
    bq: "",
    phoneGroup: "status",
    labels: { unassignedDepartment: "ยังไม่ระบุแผนก", ownership: (type) => `own:${type}` },
    ...overrides,
  }
}

const where = { isActive: true, companyId: "co-a" }

const sample = [
  asset("1", "s-use", "d-acc"),
  asset("2", "s-use", "d-acc"),
  asset("3", "s-use", "d-it"),
  asset("4", "s-ready", null),
  asset("5", "s-pending", "d-sales"),
  asset("6", "s-disposed", null),
  asset("7", "s-retired", "d-it", null),
]

test("department groupBy includes unassigned", async () => {
  const { db, calls } = fakeDb(sample)
  const data = await getReportsOverviewData(where, input(), db)
  const departmentCall = calls.find((call) => call.by === "departmentId")
  assert.equal(departmentCall?.where, where, "the department group-by reads the report's where as is: no departmentId filter")
  const table = data.tables.department
  assert.deepEqual(table.unassigned, { count: 2, percent: 28.6 })
  assert.equal(table.groupCount, 3)
  assert.equal(table.rows.reduce((sum, row) => sum + row.count, 0) + (table.unassigned?.count ?? 0), data.strip.total)
  assert.deepEqual(table.rows.map((row) => [row.name, row.code]), [["ฝ่ายบัญชี", "ACC"], ["ฝ่ายไอที", "IT"], ["ฝ่ายขาย", "SAL"]])
})

test("status parts split pending, disposed and retired", async () => {
  const { db } = fakeDb(sample)
  const { strip } = await getReportsOverviewData(where, input(), db)
  assert.equal(strip.total, 7)
  assert.equal(strip.pendingDisposal, 1)
  assert.equal(strip.writtenOff, 2, "Disposed + Retired")
  assert.equal(strip.retired, 1)
  assert.equal(strip.active, 4)
  assert.equal(strip.active + strip.pendingDisposal + strip.writtenOff, strip.total)
  assert.equal(strip.activeStatusCount, 2)
  assert.deepEqual(strip.activeExamples, ["ใช้งานอยู่", "พร้อมใช้งาน"])
  assert.deepEqual(strip.statusIds, { pendingDisposal: "s-pending", disposed: "s-disposed", retired: "s-retired" })
  assert.equal(strip.purchaseTotal, 600)
})

test("full list only with breakdown", async () => {
  const without = await getReportsOverviewData(where, input(), fakeDb(sample).db)
  assert.equal(without.full, null)
  const withDepartment = await getReportsOverviewData(where, input({ breakdown: "department" }), fakeDb(sample).db)
  assert.equal(withDepartment.full?.dimension, "department")
  assert.deepEqual(
    withDepartment.full?.groups.map((group) => [group.key, group.count]),
    [["d-acc", 2], ["d-it", 2], ["d-sales", 1], [null, 2]],
    "named groups by count (ties by name), the unassigned group last",
  )
})

test("the full list filters by bq", async () => {
  const byName = await getReportsOverviewData(where, input({ breakdown: "department", bq: "บัญชี" }), fakeDb(sample).db)
  assert.deepEqual(byName.full?.groups.map((group) => group.key), ["d-acc"])
  const byCode = await getReportsOverviewData(where, input({ breakdown: "department", bq: "it" }), fakeDb(sample).db)
  assert.deepEqual(byCode.full?.groups.map((group) => group.key), ["d-it"])
  // The six tables stay whole: bq filters the full list only.
  assert.equal(byName.tables.department.groupCount, 3)
})

test("an empty filter shows zeros everywhere", async () => {
  const data = await getReportsOverviewData(where, input({ breakdown: "category" }), fakeDb([]).db)
  assert.deepEqual(
    { ...data.strip, statusIds: undefined },
    { total: 0, active: 0, activeStatusCount: 0, activeExamples: [], pendingDisposal: 0, writtenOff: 0, retired: 0, purchaseTotal: 0, statusIds: undefined },
  )
  for (const table of Object.values(data.tables)) {
    assert.equal(table.total, 0)
    assert.deepEqual(table.rows, [])
    assert.equal(table.others, null)
    assert.equal(table.unassigned, null)
  }
  assert.deepEqual(data.full?.groups, [])
  assert.deepEqual(data.preview, [])
})

test("the preview is ten rows with names, holder and status", async () => {
  const many = Array.from({ length: 12 }, (_, index) => asset(String(index + 1), "s-use", index % 2 ? "d-acc" : null))
  const { preview } = await getReportsOverviewData(where, input(), fakeDb(many).db)
  assert.equal(preview.length, 10)
  assert.deepEqual(preview[0], {
    id: "1",
    assetTag: "TAG-1",
    name: "Asset 1",
    category: "โน้ตบุ๊ก",
    branch: "สำนักงานใหญ่",
    department: null,
    custodian: null,
    ownership: "own:personal",
    statusName: "In Use",
    statusLabel: "ใช้งานอยู่",
  })
})

test("breakdown and group params parse to a dimension with defaults", () => {
  assert.equal(parseReportBreakdownDimension("department"), "department")
  assert.equal(parseReportBreakdownDimension(["branch", "x"]), "branch")
  assert.equal(parseReportBreakdownDimension("nope"), null)
  assert.equal(parseReportBreakdownDimension(undefined), null)
  assert.equal(parseReportPhoneGroup(undefined), "status")
  assert.equal(parseReportPhoneGroup("ownership"), "ownership")
})
