import assert from "node:assert/strict"
import test from "node:test"
import type { Prisma, PrismaClient } from "@prisma/client"

import {
  chunkListIds,
  deactivatedAtLogModules,
  masterDataListIdChunkSize,
  parseNameDefaultSort,
  readDeactivatedAt,
  readRecordStatusCounts,
  recordStatusCountWheres,
  type DeactivatedAtReader,
  type RecordStatusCountModel,
} from "../src/lib/master-data-list-ui.ts"
import {
  buildCompanyWhere,
  employeeRecordStatusCountWheres,
  buildEmployeeWhere,
  parseCompanyListParams,
  parseEmployeeListParams,
} from "../src/lib/organization-master-query.ts"

// Type-level: the Prisma delegates fit the structural readers the pages pass (checked by tsc, not run).
export const prismaFitsReaders = (db: PrismaClient) => {
  const company: RecordStatusCountModel<Prisma.CompanyWhereInput> = db.company
  const branch: RecordStatusCountModel<Prisma.BranchWhereInput> = db.branch
  const department: RecordStatusCountModel<Prisma.DepartmentWhereInput> = db.department
  const category: RecordStatusCountModel<Prisma.AssetCategoryWhereInput> = db.assetCategory
  const supplier: RecordStatusCountModel<Prisma.SupplierWhereInput> = db.supplier
  const log: DeactivatedAtReader = db
  return [company, branch, department, category, supplier, log]
}

test("recordStatusCountWheres keeps every other filter and swaps only the record status", () => {
  const state = parseCompanyListParams({ search: "acme", status: "all", assetUsage: "withAssets" })
  const wheres = recordStatusCountWheres(state, buildCompanyWhere)
  assert.deepEqual(wheres.active, buildCompanyWhere({ ...state, status: "active" }))
  assert.deepEqual(wheres.inactive, buildCompanyWhere({ ...state, status: "inactive" }))
  assert.equal((wheres.active as { isActive?: boolean }).isActive, true)
  assert.equal((wheres.inactive as { isActive?: boolean }).isActive, false)
  assert.ok("OR" in wheres.active && "assets" in wheres.active, "search and usage filters kept")
})

test("the employee count wheres are the shared helper over buildEmployeeWhere (unchanged output)", () => {
  const state = parseEmployeeListParams({ search: "som", companyId: "c1", status: "inactive" })
  assert.deepEqual(employeeRecordStatusCountWheres(state), recordStatusCountWheres(state, buildEmployeeWhere))
})

test("readRecordStatusCounts counts active and inactive with the given wheres; ทั้งหมด is their sum", async () => {
  const seen: unknown[] = []
  const model: RecordStatusCountModel<{ isActive: boolean; tag: string }> = {
    count: async (args) => {
      seen.push(args.where)
      return args.where.isActive ? 7 : 3
    },
  }
  const counts = await readRecordStatusCounts(model, {
    active: { isActive: true, tag: "x" },
    inactive: { isActive: false, tag: "x" },
  })
  assert.deepEqual(counts, { active: 7, inactive: 3, all: 10 })
  assert.deepEqual(seen, [
    { isActive: true, tag: "x" },
    { isActive: false, tag: "x" },
  ])
})

test("chunkListIds splits by 2,000 (SQL Server's 2,100-parameter limit)", () => {
  assert.equal(masterDataListIdChunkSize, 2000)
  assert.deepEqual(chunkListIds([]), [])
  const ids = Array.from({ length: 4001 }, (_, index) => `id-${index}`)
  const chunks = chunkListIds(ids)
  assert.deepEqual(chunks.map((chunk) => chunk.length), [2000, 2000, 1])
  assert.deepEqual(chunks.flat(), ids)
  assert.deepEqual(chunkListIds(["a", "b", "c"], 2), [["a", "b"], ["c"]])
})

test("the deactivated-at modules are the names the routes log under", () => {
  assert.deepEqual(deactivatedAtLogModules, ["company", "branch", "department", "category", "supplier"])
})

test("readDeactivatedAt reads the newest delete entry per record of one module, chunked, one grouped query per chunk (G8P1-R2)", async () => {
  const calls: Array<Record<string, unknown>> = []
  const older = new Date("2026-10-01T03:00:00Z")
  const newer = new Date("2026-11-02T04:00:00Z")
  const db: DeactivatedAtReader = {
    systemLog: {
      groupBy: async (args: object) => {
        calls.push(args as Record<string, unknown>)
        const where = (args as { where: { recordId: { in: string[] } } }).where
        const rows = [
          { recordId: "a", _max: { createdAt: newer } },
          { recordId: "b", _max: { createdAt: older } },
          { recordId: "c", _max: { createdAt: null } },
          { recordId: null, _max: { createdAt: newer } },
        ]
        return rows.filter((row) => row.recordId === null || where.recordId.in.includes(row.recordId))
      },
    },
  }

  const none = await readDeactivatedAt(db, "company", [])
  assert.equal(none.size, 0)
  assert.equal(calls.length, 0, "no query without ids")

  const ids = ["a", "b", "c", ...Array.from({ length: 2000 }, (_, index) => `x-${index}`)]
  const result = await readDeactivatedAt(db, "branch", ids)
  assert.equal(calls.length, 2, "one query per 2,000 ids")
  assert.deepEqual(calls[0], {
    by: ["recordId"],
    where: { module: "branch", action: "delete", recordId: { in: ids.slice(0, 2000) } },
    _max: { createdAt: true },
  })
  assert.deepEqual((calls[1] as { where: { recordId: { in: string[] } } }).where.recordId.in, ids.slice(2000))
  assert.deepEqual([...result.entries()], [
    ["a", newer],
    ["b", older],
  ])
})

test("readDeactivatedAt keeps the newest date when a record appears in two rows", async () => {
  const first = new Date("2026-01-01T00:00:00Z")
  const second = new Date("2026-03-01T00:00:00Z")
  const db: DeactivatedAtReader = {
    systemLog: {
      groupBy: async () => [
        { recordId: "a", _max: { createdAt: second } },
        { recordId: "a", _max: { createdAt: first } },
      ],
    },
  }
  const result = await readDeactivatedAt(db, "supplier", ["a"])
  assert.equal(result.get("a")?.toISOString(), second.toISOString())
})

test("parseNameDefaultSort: the name sort ascending by default; every allowed sort and an explicit direction stay", () => {
  const sorts = ["createdAt", "code", "nameTh"] as const
  assert.deepEqual(parseNameDefaultSort({}, sorts, "nameTh"), { sort: "nameTh", direction: "asc" })
  assert.deepEqual(parseNameDefaultSort({ sort: "bogus", direction: "sideways" }, sorts, "nameTh"), { sort: "nameTh", direction: "asc" })
  assert.deepEqual(parseNameDefaultSort({ sort: "nameTh", direction: "desc" }, sorts, "nameTh"), { sort: "nameTh", direction: "desc" })
  assert.deepEqual(parseNameDefaultSort({ sort: "code", direction: "asc" }, sorts, "nameTh"), { sort: "code", direction: "asc" })
  // Another sort without a direction keeps today's default (newest/largest first).
  assert.deepEqual(parseNameDefaultSort({ sort: "createdAt" }, sorts, "nameTh"), { sort: "createdAt", direction: "desc" })
  assert.deepEqual(parseNameDefaultSort({ sort: ["code", "nameTh"], direction: ["asc"] }, sorts, "nameTh"), { sort: "code", direction: "asc" })
})

test("no master-data block reason says ไม่สามารถลบ any more: they read ปิดใช้งาน…ไม่ได้ (G8P1-R1)", async () => {
  const { readFileSync } = await import("node:fs")
  for (const path of ["src/lib/organization-master-query.ts", "src/lib/category-delete-guard.ts"]) {
    const source = readFileSync(path, "utf8").replace(/\r\n/g, "\n")
    assert.doesNotMatch(source, /ไม่สามารถลบ(บริษัท|สาขา|แผนก|พนักงาน|ผู้ขาย|หมวดหมู่)/, path)
  }
})
