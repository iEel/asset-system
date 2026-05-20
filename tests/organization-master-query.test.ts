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
} from "../src/lib/organization-master-query.ts"

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
    "ไม่สามารถลบสาขานี้ได้ เพราะยังมีพื้นที่ 2 รายการ, พนักงาน 3 รายการ, ทรัพย์สิน 4 รายการ และรอบตรวจนับ 1 รายการใช้งานอยู่"
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
    buildEmployeeSummary([
      { employmentStatus: "active", _count: { custodianAssets: 2 } },
      { employmentStatus: "resigned", _count: { custodianAssets: 1 } },
      { employmentStatus: "suspended", _count: { custodianAssets: 0 } },
    ]),
    {
      total: 3,
      active: 1,
      inactive: 2,
      withAssets: 2,
      withoutAssets: 1,
      formerWithAssets: 1,
    }
  )
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
})
