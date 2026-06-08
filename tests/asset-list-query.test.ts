import assert from "node:assert/strict"
import test from "node:test"

import {
  buildAssetQueryString,
  buildAssetWhere,
  parseAssetListParams,
} from "../src/lib/asset-list-query.ts"

test("parses asset custodian and supplier filters for master-data drilldowns", () => {
  const filters = parseAssetListParams({
    custodianId: "employee-1",
    supplierId: "supplier-1",
    page: "2",
  })

  assert.equal(filters.custodianId, "employee-1")
  assert.equal(filters.supplierId, "supplier-1")
  assert.equal(filters.page, 2)
})

test("builds exact asset filters and preserves them in query strings", () => {
  const filters = parseAssetListParams({
    search: "printer",
    custodianId: "employee-1",
    supplierId: "supplier-1",
  })

  assert.deepEqual(buildAssetWhere(filters), {
    isActive: true,
    custodianId: "employee-1",
    supplierId: "supplier-1",
    OR: [
      { assetTag: { contains: "printer" } },
      { name: { contains: "printer" } },
      { serialNumber: { contains: "printer" } },
      { fixedAssetCode: { contains: "printer" } },
      { category: { code: { contains: "printer" } } },
      { category: { name: { contains: "printer" } } },
      { company: { code: { contains: "printer" } } },
      { branch: { code: { contains: "printer" } } },
      { custodian: { code: { contains: "printer" } } },
      { custodian: { fullNameTh: { contains: "printer" } } },
      { currentLocation: { code: { contains: "printer" } } },
    ],
  })
  assert.equal(
    buildAssetQueryString(filters, { page: 3 }),
    "search=printer&custodianId=employee-1&supplierId=supplier-1&sort=createdAt&direction=desc&page=3&pageSize=25"
  )
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

test("builds warranty data quality drilldown for assets expiring within 30 days", () => {
  const filters = parseAssetListParams({ dataQuality: "warranty" })
  const where = buildAssetWhere(filters)
  const [warrantyRule] = Array.isArray(where.AND) ? where.AND : []

  assert.equal(where.isActive, true)
  assert.ok(warrantyRule && "warrantyEndDate" in warrantyRule)

  const warrantyEndDate = warrantyRule.warrantyEndDate as { gte: Date; lte: Date }
  assert.ok(warrantyEndDate.gte instanceof Date)
  assert.ok(warrantyEndDate.lte instanceof Date)
  assert.ok(warrantyEndDate.lte.getTime() > warrantyEndDate.gte.getTime())
  assert.ok(warrantyEndDate.lte.getTime() - warrantyEndDate.gte.getTime() <= 31 * 24 * 60 * 60 * 1000)
})
