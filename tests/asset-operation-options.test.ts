import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import test from "node:test"

import { filterLegacyReturnEligibleAssets } from "../src/lib/asset-lifecycle-policy.ts"

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
