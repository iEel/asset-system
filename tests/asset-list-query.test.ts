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
      { custodian: { fullNameTh: { contains: "printer" } } },
      { currentLocation: { code: { contains: "printer" } } },
    ],
  })
  assert.equal(
    buildAssetQueryString(filters, { page: 3 }),
    "search=printer&custodianId=employee-1&supplierId=supplier-1&sort=createdAt&direction=desc&page=3&pageSize=25"
  )
})
