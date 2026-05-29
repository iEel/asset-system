import assert from "node:assert/strict"
import test from "node:test"
import {
  buildMyAssetsWhere,
  summarizeMyAssets,
  type MyAssetSummaryItem,
} from "../src/lib/my-assets.ts"

test("builds an employee-only asset scope", () => {
  assert.deepEqual(buildMyAssetsWhere({ employeeId: "emp-001" }), {
    isActive: true,
    custodianId: "emp-001",
  })
})

test("uses an impossible scope when the session is not linked to an employee", () => {
  assert.deepEqual(buildMyAssetsWhere({ employeeId: null }), {
    id: "__my_assets_no_employee__",
  })
  assert.deepEqual(buildMyAssetsWhere({}), {
    id: "__my_assets_no_employee__",
  })
})

test("summarizes employee assets by status and attention state", () => {
  const items: MyAssetSummaryItem[] = [
    { statusName: "Ready", hasPhoto: true },
    { statusName: "Under Maintenance", hasPhoto: true },
    { statusName: "Pending Repair", hasPhoto: false },
  ]

  assert.deepEqual(summarizeMyAssets(items), {
    total: 3,
    ready: 1,
    needsAttention: 2,
    missingPhoto: 1,
  })
})
