import assert from "node:assert/strict"
import test from "node:test"

import {
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
  getBranchDeleteBlockReason,
  getCompanyDeleteBlockReason,
  parseBranchListParams,
  parseCompanyListParams,
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
