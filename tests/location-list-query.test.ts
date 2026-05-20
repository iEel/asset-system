import assert from "node:assert/strict"
import test from "node:test"

import {
  buildLocationDrilldownHrefs,
  buildLocationOrderBy,
  buildLocationPathMap,
  buildLocationQueryString,
  buildLocationSummary,
  buildLocationWhere,
  getLocationDeleteBlockReason,
  parseLocationListParams,
  wouldCreateLocationCycle,
} from "../src/lib/location-list-query.ts"

test("parses location filters with safe defaults", () => {
  const state = parseLocationListParams({
    search: " rack ",
    page: "-4",
    pageSize: "500",
    sort: "currentAssets",
    direction: "desc",
    branchId: "branch-1",
    locationType: "Rack",
    assetUsage: "withAssets",
    hierarchy: "leaf",
  })

  assert.equal(state.search, "rack")
  assert.equal(state.page, 1)
  assert.equal(state.pageSize, 100)
  assert.equal(state.sort, "currentAssets")
  assert.equal(state.direction, "desc")
  assert.equal(state.branchId, "branch-1")
  assert.equal(state.locationType, "Rack")
  assert.equal(state.assetUsage, "withAssets")
  assert.equal(state.hierarchy, "leaf")
})

test("builds location where clauses from search, branch, type, usage, and hierarchy filters", () => {
  const state = parseLocationListParams({
    search: "it",
    branchId: "branch-1",
    locationType: "Room",
    assetUsage: "withoutAssets",
    hierarchy: "root",
  })

  assert.deepEqual(buildLocationWhere(state), {
    isActive: true,
    branchId: "branch-1",
    locationType: "Room",
    parentId: null,
    OR: [
      { code: { contains: "it" } },
      { name: { contains: "it" } },
      { locationType: { contains: "it" } },
      { description: { contains: "it" } },
      { branch: { code: { contains: "it" } } },
      { branch: { name: { contains: "it" } } },
      { branch: { company: { code: { contains: "it" } } } },
      { branch: { company: { nameTh: { contains: "it" } } } },
    ],
    currentAssets: { none: { isActive: true } },
  })
})

test("builds location order by including relation-count columns", () => {
  assert.deepEqual(buildLocationOrderBy({ sort: "currentAssets", direction: "desc" }), {
    currentAssets: { _count: "desc" },
  })
  assert.deepEqual(buildLocationOrderBy({ sort: "children", direction: "asc" }), {
    children: { _count: "asc" },
  })
  assert.deepEqual(buildLocationOrderBy({ sort: "branch", direction: "asc" }), { branch: { code: "asc" } })
})

test("builds stable full paths from a flat location hierarchy", () => {
  const paths = buildLocationPathMap([
    { id: "site", code: "SNI", name: "Sonic", parentId: null },
    { id: "building", code: "HQ", name: "Head Office", parentId: "site" },
    { id: "room", code: "IT", name: "IT Room", parentId: "building" },
    { id: "orphan", code: "OFF", name: "Offsite", parentId: "missing" },
  ])

  assert.equal(paths.get("room"), "SNI / HQ / IT")
  assert.equal(paths.get("orphan"), "OFF")
})

test("detects parent changes that would create a location cycle", () => {
  const locations = [
    { id: "root", parentId: null },
    { id: "floor", parentId: "root" },
    { id: "room", parentId: "floor" },
  ]

  assert.equal(wouldCreateLocationCycle({ locationId: "root", nextParentId: "room", locations }), true)
  assert.equal(wouldCreateLocationCycle({ locationId: "room", nextParentId: "root", locations }), false)
  assert.equal(wouldCreateLocationCycle({ locationId: "room", nextParentId: "room", locations }), true)
})

test("blocks deleting locations that are still referenced", () => {
  assert.equal(getLocationDeleteBlockReason({ currentAssets: 0, homeAssets: 0, children: 0, auditRounds: 0 }), null)
  assert.equal(
    getLocationDeleteBlockReason({ currentAssets: 3, homeAssets: 1, children: 2, auditRounds: 1 }),
    "ไม่สามารถลบพื้นที่นี้ได้ เพราะยังมีทรัพย์สินปัจจุบัน 3 รายการ, ทรัพย์สินที่ตั้งประจำ 1 รายการ, พื้นที่ย่อย 2 รายการ และรอบตรวจนับ 1 รายการใช้งานอยู่"
  )
})

test("builds location summary and drilldown links", () => {
  const summary = buildLocationSummary([
    { parentId: null, locationType: "Site", _count: { currentAssets: 10, children: 2 } },
    { parentId: "site", locationType: "Room", _count: { currentAssets: 0, children: 0 } },
    { parentId: "site", locationType: "Storage", _count: { currentAssets: 3, children: 0 } },
  ])

  assert.deepEqual(summary, {
    total: 3,
    withAssets: 2,
    withoutAssets: 1,
    rootLocations: 1,
    leafLocations: 2,
  })
  assert.deepEqual(buildLocationDrilldownHrefs({ locale: "th", locationCode: "IT-RACK-A" }), {
    assets: "/th/assets?search=IT-RACK-A&page=1",
  })
})

test("builds location query strings while preserving filters", () => {
  const current = parseLocationListParams({
    search: "rack",
    page: "2",
    pageSize: "50",
    sort: "code",
    direction: "asc",
    branchId: "branch-1",
    assetUsage: "withAssets",
  })

  assert.equal(
    buildLocationQueryString(current, { locationType: "Rack", page: 1 }),
    "search=rack&page=1&pageSize=50&sort=code&direction=asc&branchId=branch-1&locationType=Rack&assetUsage=withAssets&hierarchy=all"
  )
})
