import assert from "node:assert/strict"
import test from "node:test"

import {
  buildEmployeeDrilldownHrefs,
  buildEmployeeOrderBy,
  buildEmployeeQueryString,
  buildEmployeeSummary,
  buildEmployeeWhere,
  buildBranchDrilldownHrefs,
  buildBranchOrderBy,
  buildBranchQueryString,
  buildBranchSummary,
  buildBranchWhere,
  buildCompanyDrilldownHrefs,
  buildCompanyOrderBy,
  buildCompanyQueryString,
  buildCompanySummary,
  buildCompanyWhere,
  buildSupplierDrilldownHrefs,
  buildSupplierOrderBy,
  buildSupplierQueryString,
  buildSupplierSummary,
  buildSupplierWhere,
  getBranchDeleteBlockReason,
  getCompanyDeleteBlockReason,
  getEmployeeDeleteBlockReason,
  getSupplierDeleteBlockReason,
  parseBranchListParams,
  parseCompanyListParams,
  parseEmployeeListParams,
  parseSupplierListParams,
  employeeSummaryWheres,
  employeeListHasFieldFilters,
  formerEmployeeWithAssetsWhere,
} from "../src/lib/organization-master-query.ts"
import { isFormerEmployee } from "../src/lib/employee-detail.ts"

test("parses company list params with safe defaults and filters", () => {
  const state = parseCompanyListParams({
    search: " sonic ",
    page: "-4",
    pageSize: "500",
    sort: "assets",
    direction: "asc",
    assetUsage: "withAssets",
    branchUsage: "withoutBranches",
  })

  assert.equal(state.search, "sonic")
  assert.equal(state.page, 1)
  assert.equal(state.pageSize, 100)
  assert.equal(state.sort, "assets")
  assert.equal(state.direction, "asc")
  assert.equal(state.assetUsage, "withAssets")
  assert.equal(state.branchUsage, "withoutBranches")
})

test("builds company where clauses from search and health filters", () => {
  const state = parseCompanyListParams({
    search: "sni",
    assetUsage: "withoutAssets",
    branchUsage: "withBranches",
  })

  assert.deepEqual(buildCompanyWhere(state), {
    isActive: true,
    OR: [
      { code: { contains: "sni" } },
      { assetTagCode: { contains: "sni" } },
      { nameTh: { contains: "sni" } },
      { nameEn: { contains: "sni" } },
      { taxId: { contains: "sni" } },
      { address: { contains: "sni" } },
    ],
    assets: { none: { isActive: true } },
    branches: { some: { isActive: true } },
  })
})

test("builds company count order and drilldown links", () => {
  assert.deepEqual(buildCompanyOrderBy({ sort: "branches", direction: "desc" }), { branches: { _count: "desc" } })
  assert.deepEqual(buildCompanyOrderBy({ sort: "employees", direction: "asc" }), { employees: { _count: "asc" } })
  assert.deepEqual(buildCompanyOrderBy({ sort: "code", direction: "asc" }), { code: "asc" })
  assert.deepEqual(buildCompanyDrilldownHrefs({ locale: "th", companyId: "company-1" }), {
    assets: "/th/assets?companyId=company-1&page=1",
    branches: "/th/master-data/branches?companyId=company-1&page=1",
  })
})

test("summarizes company health and blocks deleting referenced companies", () => {
  const summary = buildCompanySummary([
    { _count: { branches: 2, assets: 4 } },
    { _count: { branches: 0, assets: 0 } },
  ])

  assert.deepEqual(summary, {
    total: 2,
    withBranches: 1,
    withoutBranches: 1,
    withAssets: 1,
    withoutAssets: 1,
  })
  assert.equal(getCompanyDeleteBlockReason({ branches: 0, departments: 0, employees: 0, assets: 0, auditRounds: 0 }), null)
  assert.equal(
    getCompanyDeleteBlockReason({ branches: 2, departments: 1, employees: 3, assets: 4, auditRounds: 1 }),
    "ไม่สามารถลบบริษัทนี้ได้ เพราะยังมีสาขา 2 รายการ, แผนก 1 รายการ, พนักงาน 3 รายการ, ทรัพย์สิน 4 รายการ และรอบตรวจนับ 1 รายการใช้งานอยู่"
  )
})

test("parses branch list params with company and usage filters", () => {
  const state = parseBranchListParams({
    search: " rama ",
    page: "2",
    pageSize: "50",
    sort: "locations",
    direction: "desc",
    companyId: "company-1",
    assetUsage: "withoutAssets",
    locationUsage: "withLocations",
  })

  assert.equal(state.search, "rama")
  assert.equal(state.page, 2)
  assert.equal(state.pageSize, 50)
  assert.equal(state.sort, "locations")
  assert.equal(state.direction, "desc")
  assert.equal(state.companyId, "company-1")
  assert.equal(state.assetUsage, "withoutAssets")
  assert.equal(state.locationUsage, "withLocations")
})

test("builds branch where clauses from search, company, and usage filters", () => {
  const state = parseBranchListParams({
    search: "rama",
    companyId: "company-1",
    assetUsage: "withAssets",
    locationUsage: "withoutLocations",
  })

  assert.deepEqual(buildBranchWhere(state), {
    isActive: true,
    companyId: "company-1",
    OR: [
      { code: { contains: "rama" } },
      { name: { contains: "rama" } },
      { address: { contains: "rama" } },
      { contactPerson: { contains: "rama" } },
      { company: { code: { contains: "rama" } } },
      { company: { nameTh: { contains: "rama" } } },
    ],
    assets: { some: { isActive: true } },
    locations: { none: { isActive: true } },
  })
})

test("builds branch count order, summary, drilldown, and delete guards", () => {
  assert.deepEqual(buildBranchOrderBy({ sort: "locations", direction: "desc" }), { locations: { _count: "desc" } })
  assert.deepEqual(buildBranchOrderBy({ sort: "company", direction: "asc" }), { company: { code: "asc" } })

  assert.deepEqual(
    buildBranchSummary([
      { _count: { locations: 3, assets: 0 } },
      { _count: { locations: 0, assets: 2 } },
    ]),
    {
      total: 2,
      withLocations: 1,
      withoutLocations: 1,
      withAssets: 1,
      withoutAssets: 1,
    }
  )
  assert.deepEqual(buildBranchDrilldownHrefs({ locale: "th", branchId: "branch-1" }), {
    assets: "/th/assets?branchId=branch-1&page=1",
    locations: "/th/master-data/locations?branchId=branch-1&page=1",
  })
  assert.equal(getBranchDeleteBlockReason({ locations: 0, employees: 0, assets: 0, auditRounds: 0 }), null)
  assert.equal(
    getBranchDeleteBlockReason({ locations: 2, employees: 3, assets: 4, auditRounds: 1 }),
    "ไม่สามารถลบสาขานี้ได้ เพราะยังมีที่ตั้ง 2 รายการ, พนักงาน 3 รายการ, ทรัพย์สิน 4 รายการ และรอบตรวจนับ 1 รายการใช้งานอยู่"
  )
})

test("builds organization query strings while preserving active filters", () => {
  const company = parseCompanyListParams({ search: "sni", assetUsage: "withAssets", page: "2" })
  const branch = parseBranchListParams({ search: "rama", companyId: "company-1", locationUsage: "withLocations" })

  assert.equal(
    buildCompanyQueryString(company, { branchUsage: "withoutBranches", page: 1 }),
    "search=sni&page=1&pageSize=25&sort=createdAt&direction=desc&assetUsage=withAssets&branchUsage=withoutBranches"
  )
  assert.equal(
    buildBranchQueryString(branch, { assetUsage: "withoutAssets", page: 1 }),
    "search=rama&page=1&pageSize=25&sort=createdAt&direction=desc&companyId=company-1&assetUsage=withoutAssets&locationUsage=withLocations"
  )
})

test("parses employee list params with organization and custody filters", () => {
  const state = parseEmployeeListParams({
    search: " somchai ",
    page: "3",
    pageSize: "50",
    sort: "assets",
    direction: "asc",
    companyId: "company-1",
    branchId: "branch-1",
    departmentId: "dept-1",
    employmentStatus: "resigned",
    custodyUsage: "withAssets",
  })

  assert.equal(state.search, "somchai")
  assert.equal(state.page, 3)
  assert.equal(state.pageSize, 50)
  assert.equal(state.sort, "assets")
  assert.equal(state.direction, "asc")
  assert.equal(state.companyId, "company-1")
  assert.equal(state.branchId, "branch-1")
  assert.equal(state.departmentId, "dept-1")
  assert.equal(state.employmentStatus, "resigned")
  assert.equal(state.custodyUsage, "withAssets")
})

test("builds employee where, summary, drilldown, query string, and delete guard", () => {
  const state = parseEmployeeListParams({
    search: "somchai",
    companyId: "company-1",
    employmentStatus: "suspended",
    custodyUsage: "withoutAssets",
  })

  assert.deepEqual(buildEmployeeWhere(state), {
    isActive: true,
    companyId: "company-1",
    employmentStatus: "suspended",
    OR: [
      { code: { contains: "somchai" } },
      { fullNameTh: { contains: "somchai" } },
      { fullNameEn: { contains: "somchai" } },
      { email: { contains: "somchai" } },
      { position: { contains: "somchai" } },
      { company: { code: { contains: "somchai" } } },
      { company: { nameTh: { contains: "somchai" } } },
      { branch: { code: { contains: "somchai" } } },
      { branch: { name: { contains: "somchai" } } },
      { department: { code: { contains: "somchai" } } },
      { department: { name: { contains: "somchai" } } },
      { manager: { is: { code: { contains: "somchai" } } } },
      { manager: { is: { fullNameTh: { contains: "somchai" } } } },
    ],
    custodianAssets: { none: { isActive: true } },
  })
  assert.deepEqual(buildEmployeeOrderBy({ sort: "assets", direction: "desc" }), { custodianAssets: { _count: "desc" } })
  assert.deepEqual(buildEmployeeOrderBy({ sort: "company", direction: "asc" }), { company: { code: "asc" } })
  assert.deepEqual(
    buildEmployeeSummary({
      total: 3,
      withAssets: 2,
      formerWithAssets: 1,
      statusCounts: [
        { employmentStatus: "active", _count: { _all: 1 } },
        { employmentStatus: "resigned", _count: { _all: 1 } },
        { employmentStatus: "suspended", _count: { _all: 1 } },
      ],
    }),
    {
      total: 3,
      active: 1,
      resigned: 1,
      suspended: 1,
      withAssets: 2,
      withoutAssets: 1,
      formerWithAssets: 1,
    }
  )
  assert.deepEqual(buildEmployeeSummary({ total: 2, withAssets: 0, formerWithAssets: 0, statusCounts: [{ employmentStatus: "active", _count: { _all: 2 } }] }), {
    total: 2,
    active: 2,
    resigned: 0,
    suspended: 0,
    withAssets: 0,
    withoutAssets: 2,
    formerWithAssets: 0,
  })
  assert.deepEqual(buildEmployeeDrilldownHrefs({ locale: "th", employeeId: "employee-1" }), {
    assets: "/th/assets?custodianId=employee-1&page=1",
  })
  assert.equal(
    buildEmployeeQueryString(state, { custodyUsage: "withAssets", page: 1 }),
    "search=somchai&page=1&pageSize=25&sort=createdAt&direction=desc&companyId=company-1&employmentStatus=suspended&custodyUsage=withAssets"
  )
  assert.equal(getEmployeeDeleteBlockReason({ custodianAssets: 0, subordinates: 0, userAccounts: 0, openCheckouts: 0, auditRounds: 0 }), null)
  assert.equal(
    getEmployeeDeleteBlockReason({ custodianAssets: 2, subordinates: 1, userAccounts: 1, openCheckouts: 3, auditRounds: 1 }),
    "ไม่สามารถลบพนักงานนี้ได้ เพราะยังมีทรัพย์สินที่ถือครอง 2 รายการ, ผู้ใต้บังคับบัญชา 1 รายการ, บัญชีผู้ใช้ 1 รายการ, รายการส่งมอบค้างคืน 3 รายการ และรอบตรวจนับ 1 รายการใช้งานอยู่"
  )
})

test("builds supplier filters, summary, drilldown, query string, and delete guard", () => {
  const state = parseSupplierListParams({
    search: "epson",
    assetUsage: "withAssets",
    purchaseDocumentUsage: "withoutPurchaseDocuments",
    sort: "assets",
    direction: "asc",
  })

  assert.deepEqual(buildSupplierWhere(state), {
    isActive: true,
    OR: [
      { code: { contains: "epson" } },
      { name: { contains: "epson" } },
      { contactPerson: { contains: "epson" } },
      { phone: { contains: "epson" } },
      { email: { contains: "epson" } },
      { address: { contains: "epson" } },
    ],
    assets: { some: { isActive: true } },
    purchaseDocuments: { none: { isActive: true } },
  })
  assert.deepEqual(buildSupplierOrderBy({ sort: "assets", direction: "desc" }), { assets: { _count: "desc" } })
  assert.deepEqual(
    buildSupplierSummary([
      { _count: { assets: 2, purchaseDocuments: 1 } },
      { _count: { assets: 0, purchaseDocuments: 0 } },
    ]),
    {
      total: 2,
      withAssets: 1,
      withoutAssets: 1,
      withPurchaseDocuments: 1,
      withoutPurchaseDocuments: 1,
    }
  )
  assert.deepEqual(buildSupplierDrilldownHrefs({ locale: "th", supplierId: "supplier-1" }), {
    assets: "/th/assets?supplierId=supplier-1&page=1",
  })
  assert.equal(
    buildSupplierQueryString(state, { purchaseDocumentUsage: "withPurchaseDocuments", page: 1 }),
    "search=epson&page=1&pageSize=25&sort=assets&direction=asc&assetUsage=withAssets&purchaseDocumentUsage=withPurchaseDocuments"
  )
  assert.equal(getSupplierDeleteBlockReason({ assets: 0, maintenanceTickets: 0, purchaseDocuments: 0 }), null)
  assert.equal(
    getSupplierDeleteBlockReason({ assets: 2, maintenanceTickets: 1, purchaseDocuments: 3 }),
    "ไม่สามารถลบผู้ขายนี้ได้ เพราะยังมีทรัพย์สิน 2 รายการ, งานซ่อม 1 รายการ และเอกสารจัดซื้อ 3 รายการใช้งานอยู่"
  )
  assert.equal(
    getSupplierDeleteBlockReason({ assets: 0, maintenanceTickets: 0, maintenancePlans: 2, purchaseDocuments: 0 }),
    "ไม่สามารถลบผู้ขายนี้ได้ เพราะยังมีแผน PM 2 รายการใช้งานอยู่"
  )
})

test("company, branch, employee and supplier lists filter by record status, ใช้งาน by default (critique 2026-10-20 E1)", () => {
  const lists = [
    { parse: parseCompanyListParams, where: buildCompanyWhere, query: buildCompanyQueryString },
    { parse: parseBranchListParams, where: buildBranchWhere, query: buildBranchQueryString },
    { parse: parseEmployeeListParams, where: buildEmployeeWhere, query: buildEmployeeQueryString },
    { parse: parseSupplierListParams, where: buildSupplierWhere, query: buildSupplierQueryString },
  ] as const
  for (const { parse, where, query } of lists) {
    const build = where as (state: ReturnType<typeof parse>) => Record<string, unknown>
    const toQuery = query as (current: ReturnType<typeof parse>, next: object) => string
    assert.equal(parse({}).status, "active")
    assert.equal(build(parse({})).isActive, true)
    assert.equal(build(parse({ status: "inactive" })).isActive, false)
    assert.equal("isActive" in build(parse({ status: "all" })), false)
    assert.match(toQuery(parse({ status: "inactive" }), {}), /(^|&)status=inactive(&|$)/)
    assert.doesNotMatch(toQuery(parse({}), {}), /status=/)
  }
})

// G7P2-R1 (spec §5.1, Review Focus 1): "พ้นสภาพแต่ยังถือครอง" = (employmentStatus not active OR record not active) AND
// holds an active asset as custodian. AD sync deactivates a leaver (isActive false, resigned), so the card and its list
// must reach records the default list (active records only) leaves out.
test("the former-holder card counts an AD-deactivated holder, and ?former=withAssets lists them whatever the record status (G7P2-R1)", () => {
  const formerWhere = {
    AND: [
      { OR: [{ employmentStatus: { not: "active" } }, { isActive: false }] },
      { custodianAssets: { some: { isActive: true } } },
    ],
  }
  assert.deepEqual(formerEmployeeWithAssetsWhere(), formerWhere)

  const state = parseEmployeeListParams({ former: "withAssets" })
  assert.equal(state.former, "withAssets")
  assert.equal(state.status, "active")
  assert.deepEqual(buildEmployeeWhere(state), formerWhere, "no isActive: the record-status filter is ignored")
  assert.deepEqual(buildEmployeeWhere(parseEmployeeListParams({ former: "withAssets", status: "inactive" })), formerWhere)
  assert.deepEqual(buildEmployeeWhere(parseEmployeeListParams({ former: "withAssets", companyId: "company-1" })), { companyId: "company-1", ...formerWhere })
  assert.equal(parseEmployeeListParams({}).former, "all")
  assert.equal(parseEmployeeListParams({ former: "x" }).former, "all")
  assert.equal(buildEmployeeWhere(parseEmployeeListParams({})).isActive, true)

  assert.match(buildEmployeeQueryString(state, { page: 2 }), /(^|&)former=withAssets(&|$)/, "paging, sorting and returnTo keep it")
  assert.doesNotMatch(buildEmployeeQueryString(state, { former: "all" }), /former=/)
  assert.doesNotMatch(buildEmployeeQueryString(parseEmployeeListParams({}), {}), /former=/, "links built before keep their query strings")
})

// Fix round 1: the cards are count queries. The former card's where is the ?former=withAssets list's own where (one
// builder), so the count is what the card opens; the other cards count active records only.
test("the summary cards count with where clauses, the former card with the ?former=withAssets list's where (G7P2-R1)", () => {
  const wheres = employeeSummaryWheres()
  assert.deepEqual(wheres.records, { isActive: true })
  assert.deepEqual(wheres.withAssets, { isActive: true, custodianAssets: { some: { isActive: true } } })
  assert.deepEqual(wheres.formerWithAssets, formerEmployeeWithAssetsWhere())
  assert.deepEqual(wheres.formerWithAssets, buildEmployeeWhere(parseEmployeeListParams({ former: "withAssets" })), "the card's count is the list it opens")

  // The rule over rows: an AD-deactivated holder (isActive false, resigned) is counted; a holder still active is not;
  // a former employee holding nothing is not.
  type Row = { isActive: boolean; employmentStatus: string; activeAssets: number }
  const matchesFormer = (row: Row) => (row.employmentStatus !== "active" || row.isActive === false) && row.activeAssets > 0
  const [statusOr, holding] = (wheres.formerWithAssets.AND as Array<Record<string, unknown>>)
  assert.deepEqual(statusOr, { OR: [{ employmentStatus: { not: "active" } }, { isActive: false }] })
  assert.deepEqual(holding, { custodianAssets: { some: { isActive: true } } })
  const rows: Row[] = [
    { isActive: false, employmentStatus: "resigned", activeAssets: 2 },
    { isActive: false, employmentStatus: "active", activeAssets: 1 },
    { isActive: true, employmentStatus: "suspended", activeAssets: 1 },
    { isActive: true, employmentStatus: "active", activeAssets: 3 },
    { isActive: false, employmentStatus: "resigned", activeAssets: 0 },
  ]
  assert.equal(rows.filter(matchesFormer).length, 3)
  for (const row of rows) assert.equal(matchesFormer(row), isFormerEmployee(row) && row.activeAssets > 0, "the same rule as the employee page")
})

// Final review fix 4: the phone filters disclosure is closed on the bare list and on the former-holder card's
// ?former=withAssets (a chip, not a form field); it opens when a field of the filter form is set (the suppliers rule).
test("the employee list's phone filters open only when a form field is set, not for ?former=withAssets", () => {
  assert.equal(employeeListHasFieldFilters(parseEmployeeListParams({})), false)
  assert.equal(employeeListHasFieldFilters(parseEmployeeListParams({ former: "withAssets" })), false)
  assert.equal(employeeListHasFieldFilters(parseEmployeeListParams({ sort: "code", direction: "asc", page: "3", pageSize: "50" })), false)
  for (const params of [
    { search: "สมชาย" },
    { status: "inactive" },
    { companyId: "c-1" },
    { branchId: "b-1" },
    { departmentId: "d-1" },
    { employmentStatus: "resigned" },
    { custodyUsage: "withAssets" },
  ]) {
    assert.equal(employeeListHasFieldFilters(parseEmployeeListParams(params)), true, JSON.stringify(params))
  }
})
