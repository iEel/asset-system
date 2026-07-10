import assert from "node:assert/strict"
import { existsSync, readFileSync } from "node:fs"
import test from "node:test"
import { buildMyAssetDetailWhere } from "../src/lib/my-assets.ts"

test("builds a detail query scoped to the signed-in employee custodian", () => {
  assert.deepEqual(buildMyAssetDetailWhere({ employeeId: "emp-001", assetId: "asset-001" }), {
    id: "asset-001",
    isActive: true,
    custodianId: "emp-001",
  })
})

test("uses an impossible detail query without both employee and asset identity", () => {
  assert.deepEqual(buildMyAssetDetailWhere({ employeeId: null, assetId: "asset-001" }), {
    id: "__my_assets_no_employee__",
  })
  assert.deepEqual(buildMyAssetDetailWhere({ employeeId: "emp-001", assetId: "" }), {
    id: "__my_assets_no_employee__",
  })
})

test("my asset detail stays read-only and scoped without Asset Register permission", () => {
  const pagePath = "src/app/[locale]/(dashboard)/my-assets/[id]/page.tsx"
  assert.ok(existsSync(pagePath), "employee-scoped detail route should exist")
  const source = readFileSync(pagePath, "utf8")

  assert.match(source, /buildMyAssetDetailWhere\(\{ employeeId: user\.employeeId, assetId: id \}\)/)
  assert.doesNotMatch(source, /requirePagePermission\(locale,\s*"asset",\s*"view"\)/)
  assert.doesNotMatch(source, /purchasePrice|supplier|fixedAssetCode/)
})
