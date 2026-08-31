import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import test from "node:test"

import {
  filterCheckoutEligibleAssets,
  filterLegacyReturnEligibleAssets,
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

test("legacy return accepts Ready or In Use custodians without open checkout or maintenance", () => {
  const candidates = [
    { id: "ready", status: { name: "Ready" }, custodianId: "employee-1", hasOpenCheckout: false, hasActiveMaintenance: false },
    { id: "in-use", status: { name: "In Use" }, custodianId: "employee-1", hasOpenCheckout: false, hasActiveMaintenance: false },
    { id: "repair", status: { name: "Pending Repair" }, custodianId: "employee-1", hasOpenCheckout: false, hasActiveMaintenance: true },
    { id: "no-holder", status: { name: "Ready" }, custodianId: null, hasOpenCheckout: false, hasActiveMaintenance: false },
    { id: "already-out", status: { name: "Ready" }, custodianId: "employee-1", hasOpenCheckout: true, hasActiveMaintenance: false },
  ]

  assert.deepEqual(filterLegacyReturnEligibleAssets(candidates).map((asset) => asset.id), ["ready", "in-use"])
})

test("active checkout options expose mode and disable unknown custody", () => {
  const source = readFileSync("src/lib/asset-operation-options.ts", "utf8")
  assert.match(source, /handoverMode:\s*true/)
  assert.match(source, /documentNo:\s*true/)
  assert.match(source, /disabled:\s*!isAssetHandoverMode\(checkout\.handoverMode\)/)
  assert.match(source, /disabledReason:\s*"ASSET_HANDOVER_MODE_MISSING"/)
})
