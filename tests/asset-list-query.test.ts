import assert from "node:assert/strict"
import test from "node:test"

import {
  assetFiltersUseWaitingWorkRules,
  assetSearchConditions,
  buildAssetOrderBy,
  buildAssetQueryString,
  buildAssetSearchWhere,
  buildAssetWhere,
  parseAssetListParams,
} from "../src/lib/asset-list-query.ts"
import { assetCustodianAssignedWhere, assetNotClosedStatusWhere } from "../src/lib/asset-custodian-state-filter.ts"
import {
  DEFAULT_WAITING_WORK_RULES,
  licenseExpiringSoonWhere,
  returnsDueSoonAssetWhere,
  startOfBangkokDay,
  warrantyExpiringSoonWhere,
  type WaitingWorkRules,
} from "../src/lib/waiting-work-rules.ts"

test("parses asset custodian and supplier filters for master-data drilldowns", () => {
  const filters = parseAssetListParams({
    custodianId: "employee-1",
    supplierId: "supplier-1",
    brandId: "brand-1",
    modelId: "model-1",
    page: "2",
  })

  assert.equal(filters.custodianId, "employee-1")
  assert.equal(filters.supplierId, "supplier-1")
  assert.equal(filters.brandId, "brand-1")
  assert.equal(filters.modelId, "model-1")
  assert.equal(filters.page, 2)
})

test("builds exact asset filters and preserves them in query strings", () => {
  const filters = parseAssetListParams({
    search: "printer",
    custodianId: "employee-1",
    supplierId: "supplier-1",
    brandId: "brand-1",
    modelId: "model-1",
    crossScope: "custodian_company",
  })

  assert.equal(filters.crossScope, "custodian_company")
  assert.deepEqual(buildAssetWhere(filters), {
    isActive: true,
    custodianId: "employee-1",
    supplierId: "supplier-1",
    brandId: "brand-1",
    modelId: "model-1",
    OR: assetSearchConditions("printer"),
  })
  assert.equal(
    buildAssetQueryString(filters, { page: 3 }),
    "search=printer&brandId=brand-1&modelId=model-1&custodianId=employee-1&supplierId=supplier-1&crossScope=custodian_company&sort=createdAt&direction=desc&page=3&pageSize=25"
  )
})

test("rejects unknown cross-scope asset filters", () => {
  assert.equal(parseAssetListParams({ crossScope: "bad-filter" }).crossScope, "")
  assert.equal(parseAssetListParams({ crossScope: "location_branch" }).crossScope, "location_branch")
})

test("builds and serializes the idle activity scope without dropping data quality", () => {
  const filters = parseAssetListParams({ activity: "idle_180d", dataQuality: "serial" })
  const where = buildAssetWhere(filters)
  const rules = Array.isArray(where.AND) ? where.AND : []

  assert.equal(filters.activity, "idle_180d")
  assert.deepEqual(rules[0], { OR: [{ serialNumber: null }, { serialNumber: "" }] })
  assert.ok(rules[1] && "movements" in rules[1])
  assert.match(buildAssetQueryString(filters), /activity=idle_180d/)
})

test("rejects and omits unknown activity scopes", () => {
  const filters = parseAssetListParams({ activity: "unknown" })
  assert.equal(filters.activity, "")
  assert.doesNotMatch(buildAssetQueryString(filters), /activity=/)
})

test("searches assets by current custodian employee code", () => {
  const filters = parseAssetListParams({ search: "8044" })
  const where = buildAssetWhere(filters)

  assert.ok(Array.isArray(where.OR))
  assert.ok(where.OR.some((rule) => JSON.stringify(rule) === JSON.stringify({ custodian: { code: { contains: "8044" } } })))
  assert.equal(JSON.stringify(where).includes("reportedBy"), false)
  assert.equal(JSON.stringify(where).includes("assignedTo"), false)
})

test("builds data quality drilldown filters for department and purchase gaps", () => {
  const departmentFilters = parseAssetListParams({ dataQuality: "department" })
  assert.deepEqual(buildAssetWhere(departmentFilters), {
    isActive: true,
    AND: [{ departmentId: null }],
  })

  const purchaseFilters = parseAssetListParams({ dataQuality: "purchase" })
  assert.deepEqual(buildAssetWhere(purchaseFilters), {
    isActive: true,
    AND: [
      {
        OR: [
          { purchaseDate: null },
          { purchasePrice: null },
          { supplierId: null },
          { poNumber: null },
          { poNumber: "" },
          { invoiceNumber: null },
          { invoiceNumber: "" },
        ],
      },
    ],
  })
})

// 26 Oct 2026, 00:00 in Bangkok. The days are not today's defaults, so a filter that ignored them would fail.
const today = new Date("2026-10-25T17:00:00.000Z")
const waitingRules: WaitingWorkRules = { returnDueSoonDays: 5, auditActionDueSoonDays: 14, warrantyExpiryDays: 45, licenseExpiryDays: 60 }

test("the register's warranty, licence and return filters are the bell's own rules with the days they are given (group 1 spec §6.3)", () => {
  const where = (dataQuality: string) => buildAssetWhere(parseAssetListParams({ dataQuality }), { today, rules: waitingRules })
  const warranty = warrantyExpiringSoonWhere(today, waitingRules)
  const licence = licenseExpiringSoonWhere(today, waitingRules)
  const returns = returnsDueSoonAssetWhere(today, waitingRules)
  // Each rule holds isActive: true, so the register's { isActive: true, AND: [rule] } lists exactly the rule's assets.
  for (const rule of [warranty, licence, returns]) assert.equal(rule.isActive, true)
  assert.deepEqual(where("warranty"), { isActive: true, AND: [warranty] })
  assert.deepEqual(where("licenseExpiry"), { isActive: true, AND: [licence] })
  assert.deepEqual(where("returnDue"), { isActive: true, AND: [returns] })
  assert.deepEqual(where("serial"), buildAssetWhere(parseAssetListParams({ dataQuality: "serial" })), "a value without a window reads no rules")
  // Without options: the Bangkok day of the call and today's default days.
  assert.deepEqual(
    buildAssetWhere(parseAssetListParams({ dataQuality: "warranty" })),
    { isActive: true, AND: [warrantyExpiringSoonWhere(startOfBangkokDay(new Date()), DEFAULT_WAITING_WORK_RULES)] },
  )
})

test("only the three waiting-work values make the register read the notification rules", () => {
  for (const value of ["warranty", "licenseExpiry", "returnDue"]) {
    assert.equal(assetFiltersUseWaitingWorkRules(parseAssetListParams({ dataQuality: value })), true, value)
  }
  for (const value of ["", "serial", "photo", "responsibility", "department", "purchase"]) {
    assert.equal(assetFiltersUseWaitingWorkRules(parseAssetListParams({ dataQuality: value })), false, value)
  }
})

test("custodianState=assigned lists assets with a custodian that are not Disposed or Retired (group 1 spec §6.4)", () => {
  assert.deepEqual(assetNotClosedStatusWhere, { status: { name: { notIn: ["Disposed", "Retired"] } } })
  assert.deepEqual(assetCustodianAssignedWhere, { custodianId: { not: null }, status: { name: { notIn: ["Disposed", "Retired"] } } })
  assert.equal(parseAssetListParams({ custodianState: "nobody" }).custodianState, "")
  const filters = parseAssetListParams({ custodianState: "assigned", dataQuality: "serial", activity: "idle_180d" })
  assert.equal(filters.custodianState, "assigned")
  const parts = buildAssetWhere(filters).AND as object[]
  assert.deepEqual(parts.slice(0, 2), [{ OR: [{ serialNumber: null }, { serialNumber: "" }] }, assetCustodianAssignedWhere])
  assert.ok("movements" in parts[2], "the activity rule stays last")
  assert.match(buildAssetQueryString(filters), /custodianState=assigned/)
  assert.doesNotMatch(buildAssetQueryString(parseAssetListParams({})), /custodianState/)
})

test("the global search counts assets with the register's own search (menu B shell task 8)", () => {
  const where = buildAssetSearchWhere("  NB-01 ")
  assert.deepEqual(where, buildAssetWhere(parseAssetListParams({ search: "NB-01" })))
  assert.deepEqual(Object.keys(where).sort(), ["OR", "isActive"]); assert.equal((where.OR as unknown[]).length, 19)
})
test("the register finds brand, model, company, branch, custodian e-mail and location names (user decision 2026-10-25)", () => {
  const conditions = assetSearchConditions("Dell")
  assert.equal(conditions.length, 19)
  for (const expected of [
    { brand: { name: { contains: "Dell" } } }, { model: { name: { contains: "Dell" } } },
    { company: { nameTh: { contains: "Dell" } } }, { company: { nameEn: { contains: "Dell" } } },
    { branch: { name: { contains: "Dell" } } }, { custodian: { fullNameEn: { contains: "Dell" } } },
    { custodian: { email: { contains: "Dell" } } }, { currentLocation: { name: { contains: "Dell" } } },
  ]) assert.ok(conditions.some((condition) => JSON.stringify(condition) === JSON.stringify(expected)), JSON.stringify(expected))
  assert.deepEqual(buildAssetWhere(parseAssetListParams({ search: "Dell" })).OR, conditions)
})

test("the register sorts by its column, then by id in the same direction, so previous and next are stable (group 1 spec §7.2)", () => {
  assert.deepEqual(buildAssetOrderBy(parseAssetListParams({})), [{ createdAt: "desc" }, { id: "desc" }])
  assert.deepEqual(buildAssetOrderBy(parseAssetListParams({ sort: "assetTag", direction: "asc" })), [{ assetTag: "asc" }, { id: "asc" }])
  assert.deepEqual(buildAssetOrderBy(parseAssetListParams({ sort: "purchasePrice", direction: "desc" })), [{ purchasePrice: "desc" }, { id: "desc" }])
  assert.deepEqual(buildAssetOrderBy(parseAssetListParams({ sort: "id; DROP", direction: "up" })), [{ createdAt: "desc" }, { id: "desc" }])
})

test("locationId lists the assets at that location and keeps its place in the query string (group 1 spec §7.4, §9)", () => {
  const filters = parseAssetListParams({ locationId: " loc-1 ", custodianState: "assigned" })
  assert.equal(filters.locationId, "loc-1")
  assert.equal(buildAssetWhere(filters).currentLocationId, "loc-1")
  assert.equal("currentLocationId" in buildAssetWhere(parseAssetListParams({})), false)
  assert.equal(buildAssetQueryString(filters), "custodianState=assigned&locationId=loc-1&sort=createdAt&direction=desc&page=1&pageSize=25")
  assert.equal(parseAssetListParams(new URLSearchParams(buildAssetQueryString(filters))).locationId, "loc-1")
})
