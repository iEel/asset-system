import assert from "node:assert/strict"
import test from "node:test"

import { assetExportColumns } from "../src/lib/asset-excel.ts"

test("asset register export includes owner, custodian, location, and cross-scope audit columns", () => {
  const keys = assetExportColumns.map((column) => column.key)

  assert.ok(keys.includes("custodianCompany"))
  assert.ok(keys.includes("custodianBranch"))
  assert.ok(keys.includes("homeLocation"))
  assert.ok(keys.includes("homeLocationBranch"))
  assert.ok(keys.includes("currentLocationBranch"))
  assert.ok(keys.includes("crossScopeFlags"))
})
