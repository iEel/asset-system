import assert from "node:assert/strict"
import test from "node:test"

import { auditRoundOperationalWhere } from "../src/lib/audit-round-status.ts"
import {
  buildDepartmentDrilldownHrefs,
  buildDepartmentFilterChips,
  buildDepartmentOrderBy,
  buildDepartmentQueryString,
  buildDepartmentSummary,
  buildDepartmentWhere,
  departmentDeactivateCountSelect,
  departmentDeactivateCounts,
  departmentListHasFilters,
  departmentListHref,
  departmentOpenAuditRoundWhere,
  departmentSorts,
  departmentSummaryLineWheres,
  parseDepartmentListParams,
  readDepartmentOpenAuditRoundCounts,
} from "../src/lib/department-list-query.ts"
import { getDepartmentDeleteBlockReason } from "../src/lib/organization-master-query.ts"

// Group 8 plan 1 Task 4: the departments list on board MD-Departments (spec §3, §5) and the department guard (G8P1-R3).

test("parse: name A→Z by default; the old date-added order and every other sort stay reachable; bad values fall back", () => {
  const state = parseDepartmentListParams({})
  assert.deepEqual(state, {
    search: "",
    status: "active",
    page: 1,
    pageSize: 25,
    sort: "name",
    direction: "asc",
    companyId: "",
    employeeUsage: "all",
    assetUsage: "all",
  })
  assert.deepEqual([...departmentSorts], ["createdAt", "code", "name", "company", "employees", "assets"])
  const old = parseDepartmentListParams({ sort: "createdAt" })
  assert.deepEqual([old.sort, old.direction], ["createdAt", "desc"], "the old order: newest first")
  const parsed = parseDepartmentListParams({
    search: "  IT ",
    status: "all",
    page: "3",
    pageSize: "50",
    sort: "assets",
    direction: "asc",
    companyId: "c-1",
    employeeUsage: "withoutEmployees",
    assetUsage: "withAssets",
  })
  assert.deepEqual(parsed, {
    search: "IT",
    status: "all",
    page: 3,
    pageSize: 50,
    sort: "assets",
    direction: "asc",
    companyId: "c-1",
    employeeUsage: "withoutEmployees",
    assetUsage: "withAssets",
  })
  const bad = parseDepartmentListParams({ page: "-2", pageSize: "30", sort: "bogus", employeeUsage: "x", assetUsage: "y", status: "z" })
  assert.deepEqual([bad.page, bad.pageSize, bad.sort, bad.direction, bad.employeeUsage, bad.assetUsage, bad.status], [1, 25, "name", "asc", "all", "all", "active"])
})

test("where: today's search fields, the company (none = แผนกกลาง), employees and assets with or without, the record status", () => {
  assert.deepEqual(buildDepartmentWhere(parseDepartmentListParams({})), { isActive: true })
  assert.deepEqual(
    buildDepartmentWhere(parseDepartmentListParams({ search: "IT", status: "all", companyId: "c-1", employeeUsage: "withEmployees", assetUsage: "withoutAssets" })),
    {
      companyId: "c-1",
      OR: [
        { code: { contains: "IT" } },
        { name: { contains: "IT" } },
        { company: { code: { contains: "IT" } } },
        { company: { nameTh: { contains: "IT" } } },
      ],
      employees: { some: { isActive: true } },
      assets: { none: { isActive: true } },
    }
  )
  assert.deepEqual(
    buildDepartmentWhere(parseDepartmentListParams({ status: "inactive", companyId: "none", employeeUsage: "withoutEmployees", assetUsage: "withAssets" })),
    { isActive: false, companyId: null, employees: { none: { isActive: true } }, assets: { some: { isActive: true } } }
  )
})

test("order: each sort, with the id breaking ties so no row shows on two pages", () => {
  assert.deepEqual(buildDepartmentOrderBy({ sort: "name", direction: "asc" }), [{ name: "asc" }, { id: "asc" }])
  assert.deepEqual(buildDepartmentOrderBy({ sort: "createdAt", direction: "desc" }), [{ createdAt: "desc" }, { id: "asc" }])
  assert.deepEqual(buildDepartmentOrderBy({ sort: "code", direction: "asc" }), [{ code: "asc" }, { id: "asc" }])
  assert.deepEqual(buildDepartmentOrderBy({ sort: "company", direction: "desc" }), [{ company: { nameTh: "desc" } }, { id: "asc" }])
  assert.deepEqual(buildDepartmentOrderBy({ sort: "employees", direction: "desc" }), [{ employees: { _count: "desc" } }, { id: "asc" }])
  assert.deepEqual(buildDepartmentOrderBy({ sort: "assets", direction: "asc" }), [{ assets: { _count: "asc" } }, { id: "asc" }])
})

test("query string: the defaults stay out of the URL; every set value is kept", () => {
  const plain = parseDepartmentListParams({})
  assert.equal(buildDepartmentQueryString(plain), "")
  assert.equal(departmentListHref("/th/master-data/departments", plain), "/th/master-data/departments")
  assert.equal(departmentListHref("/th/master-data/departments", plain, { page: 2 }), "/th/master-data/departments?page=2")
  const state = parseDepartmentListParams({ search: "IT", status: "inactive", page: "2", pageSize: "100", sort: "code", direction: "desc", companyId: "c-1", employeeUsage: "withEmployees", assetUsage: "withoutAssets" })
  assert.equal(
    buildDepartmentQueryString(state),
    "search=IT&companyId=c-1&employeeUsage=withEmployees&assetUsage=withoutAssets&sort=code&direction=desc&status=inactive&page=2&pageSize=100"
  )
  assert.equal(buildDepartmentQueryString(plain, { direction: "desc" }), "sort=name&direction=desc", "name Z→A is not the default")
  assert.equal(departmentListHasFilters(plain), false)
  assert.equal(departmentListHasFilters({ ...plain, sort: "code", status: "all" }), false, "the sort and the record status are not form filters")
  assert.equal(departmentListHasFilters({ ...plain, assetUsage: "withAssets" }), true)
})

test("cards: active departments per company (most first) and แผนกกลาง, with and without employees, the employee total", () => {
  const company = (id: string, nameTh: string) => ({ id, nameTh })
  const summary = buildDepartmentSummary([
    { company: company("b", "บริษัท ข"), _count: { employees: 0 } },
    { company: company("a", "บริษัท ก"), _count: { employees: 4 } },
    { company: company("a", "บริษัท ก"), _count: { employees: 0 } },
    { company: null, _count: { employees: 3 } },
    { company: company("c", "บริษัท ค"), _count: { employees: 1 } },
  ])
  assert.deepEqual(summary, {
    total: 5,
    byCompany: [
      { id: "a", name: "บริษัท ก", count: 2 },
      { id: "b", name: "บริษัท ข", count: 1 },
      { id: "c", name: "บริษัท ค", count: 1 },
    ],
    shared: 1,
    withEmployees: 3,
    withoutEmployees: 2,
    employeeTotal: 8,
  })
})

test("summary line: the departments with active assets and the asset total over the filtered set", () => {
  const where = { isActive: true, companyId: "c-1" }
  assert.deepEqual(departmentSummaryLineWheres(where), {
    withAssets: { AND: [where, { assets: { some: { isActive: true } } }] },
    assets: { isActive: true, department: { is: where } },
  })
})

test("filter chips: one per form filter, each removing itself and going to page 1; แผนกกลาง and a raw id read", () => {
  const labels = {
    company: "บริษัท",
    sharedCompany: "แผนกกลาง / ไม่ระบุบริษัท",
    employees: "พนักงาน",
    assets: "ทรัพย์สิน",
    employeeUsage: { withEmployees: "มีพนักงาน", withoutEmployees: "ยังไม่มีพนักงาน" },
    assetUsage: { withAssets: "มีทรัพย์สิน", withoutAssets: "ยังไม่มีทรัพย์สิน" },
  }
  const basePath = "/th/master-data/departments"
  assert.deepEqual(buildDepartmentFilterChips({ basePath, state: parseDepartmentListParams({ search: "IT" }), companyName: undefined, labels }), [], "the search is no chip")
  const state = parseDepartmentListParams({ page: "3", companyId: "c-1", employeeUsage: "withoutEmployees", assetUsage: "withAssets" })
  assert.deepEqual(buildDepartmentFilterChips({ basePath, state, companyName: "บริษัท ก", labels }), [
    { key: "company", label: "บริษัท: บริษัท ก", href: `${basePath}?employeeUsage=withoutEmployees&assetUsage=withAssets` },
    { key: "employeeUsage", label: "พนักงาน: ยังไม่มีพนักงาน", href: `${basePath}?companyId=c-1&assetUsage=withAssets` },
    { key: "assetUsage", label: "ทรัพย์สิน: มีทรัพย์สิน", href: `${basePath}?companyId=c-1&employeeUsage=withoutEmployees` },
  ])
  assert.equal(buildDepartmentFilterChips({ basePath, state: parseDepartmentListParams({ companyId: "none" }), companyName: undefined, labels })[0].label, "บริษัท: แผนกกลาง / ไม่ระบุบริษัท")
  assert.equal(buildDepartmentFilterChips({ basePath, state: parseDepartmentListParams({ companyId: "c-404" }), companyName: undefined, labels })[0].label, "บริษัท: c-404")
})

test("G8P1-R3: an open round is the audit pages' operational status (active, not closed or cancelled); the route's counts", () => {
  assert.deepEqual(departmentOpenAuditRoundWhere, { isActive: true, status: auditRoundOperationalWhere })
  assert.deepEqual(auditRoundOperationalWhere, { notIn: ["closed", "cancelled"] })
  assert.deepEqual(departmentDeactivateCountSelect, {
    employees: { where: { isActive: true } },
    assets: { where: { isActive: true } },
    auditRounds: { where: departmentOpenAuditRoundWhere },
  })
  assert.deepEqual(departmentDeactivateCounts({ employees: 1, assets: 2, auditRounds: 3 }), { employees: 1, assets: 2, openAuditRounds: 3 })
  assert.equal(getDepartmentDeleteBlockReason(departmentDeactivateCounts({ employees: 0, assets: 0, auditRounds: 0 })), null)
})

test("the open rounds of the page's ids: one grouped query per 2,000 ids, summed by department", async () => {
  const calls: Array<{ by: string[]; where: { isActive: boolean; status: unknown; scopeDepartmentId: { in: string[] } } }> = []
  const db = {
    auditRound: {
      groupBy: async (args: object) => {
        const call = args as (typeof calls)[number]
        calls.push(call)
        return call.where.scopeDepartmentId.in.includes("d-1") ? [{ scopeDepartmentId: "d-1", _count: { _all: 2 } }, { scopeDepartmentId: null, _count: { _all: 9 } }] : []
      },
    },
  }
  assert.equal((await readDepartmentOpenAuditRoundCounts(db, [])).size, 0)
  assert.equal(calls.length, 0, "no query for no ids")
  const ids = ["d-1", ...Array.from({ length: 2500 }, (_, index) => `x-${index}`)]
  const counts = await readDepartmentOpenAuditRoundCounts(db, ids)
  assert.equal(calls.length, 2)
  assert.deepEqual(calls.map((call) => call.where.scopeDepartmentId.in.length), [2000, 501])
  assert.deepEqual(calls[0].by, ["scopeDepartmentId"])
  assert.equal(calls[0].where.isActive, true)
  assert.deepEqual(calls[0].where.status, auditRoundOperationalWhere)
  assert.deepEqual([...counts], [["d-1", 2]])
})

test("drilldowns: employees and the register by departmentId", () => {
  assert.deepEqual(buildDepartmentDrilldownHrefs({ locale: "th", departmentId: "d 1" }), {
    employees: "/th/master-data/employees?departmentId=d%201&page=1",
    assets: "/th/assets?departmentId=d%201&page=1",
  })
})
