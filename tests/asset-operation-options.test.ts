import assert from "node:assert/strict"
import test from "node:test"

import {
  filterCheckoutEligibleAssets,
  filterPersonalTransferEligibleAssets,
} from "../src/lib/asset-lifecycle-policy.ts"

const assets = [
  { id: "ready", status: { name: "Ready" } },
  { id: "in-use", status: { name: "In Use" } },
  { id: "repair", status: { name: "Pending Repair" } },
  { id: "inspection", status: { name: "Under Inspection" } },
  { id: "missing", status: { name: "Missing" } },
]

test("checkout options contain only Ready assets", () => {
  assert.deepEqual(filterCheckoutEligibleAssets(assets).map((asset) => asset.id), ["ready"])
})

test("personal transfer options contain only Ready and In Use assets", () => {
  assert.deepEqual(filterPersonalTransferEligibleAssets(assets).map((asset) => asset.id), ["ready", "in-use"])
})
