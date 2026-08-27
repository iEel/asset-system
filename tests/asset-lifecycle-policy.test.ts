import assert from "node:assert/strict"
import test from "node:test"

import {
  getAssetCreateStatusNames,
  getAssetLifecycleTransitionError,
  getAssetRegisterStatusNames,
  getMaintenanceOperationalTarget,
  getSelectableConditionNames,
} from "../src/lib/asset-lifecycle-policy.ts"

test("checkout rejects every source status except Ready", () => {
  assert.equal(getAssetLifecycleTransitionError("checkout", "Ready"), null)

  for (const status of [
    "Draft",
    "In Use",
    "Checked Out",
    "Pending Repair",
    "Under Maintenance",
    "Pending Disposal",
    "Under Inspection",
    "Missing",
    "Lost",
    "Disposed",
    "Retired",
  ]) {
    assert.equal(
      getAssetLifecycleTransitionError("checkout", status),
      "ASSET_STATUS_CHECKOUT_NOT_ALLOWED",
      status
    )
  }
})

test("personal assignment rejects non-operational lifecycle states", () => {
  assert.equal(getAssetLifecycleTransitionError("assign_custodian", "Ready"), null)
  assert.equal(getAssetLifecycleTransitionError("assign_custodian", "In Use"), null)

  for (const status of [
    "Draft",
    "Checked Out",
    "Pending Repair",
    "Under Maintenance",
    "Pending Disposal",
    "Under Inspection",
    "Missing",
    "Lost",
    "Disposed",
    "Retired",
  ]) {
    assert.equal(
      getAssetLifecycleTransitionError("assign_custodian", status),
      "ASSET_STATUS_TRANSFER_NOT_ALLOWED",
      status
    )
  }
})

test("generic create and edit expose only workflow-safe values", () => {
  assert.deepEqual(getAssetCreateStatusNames(), ["Draft", "Ready"])
  assert.deepEqual(getAssetRegisterStatusNames("Draft"), ["Draft", "Ready"])
  assert.deepEqual(getAssetRegisterStatusNames("Ready"), ["Ready"])
  assert.deepEqual(getAssetRegisterStatusNames("In Use"), ["In Use"])
  assert.deepEqual(getSelectableConditionNames(), [
    "Not Assessed",
    "New",
    "Good",
    "Fair",
    "Damaged",
    "Non-functional",
    "Salvage",
  ])
})

test("generic edit rejects workflow-owned target statuses", () => {
  assert.equal(
    getAssetLifecycleTransitionError("register_edit", "Ready", "Checked Out"),
    "ASSET_STATUS_EDIT_NOT_ALLOWED"
  )
  assert.equal(
    getAssetLifecycleTransitionError("register_edit", "Ready", "Pending Repair"),
    "ASSET_STATUS_EDIT_NOT_ALLOWED"
  )
  assert.equal(getAssetLifecycleTransitionError("register_edit", "Draft", "Ready"), null)
  assert.equal(getAssetLifecycleTransitionError("register_edit", "In Use", "In Use"), null)
})

test("maintenance completion restores the operational status from custody", () => {
  assert.equal(
    getMaintenanceOperationalTarget({ ownershipType: "personal", custodianId: "employee-1" }),
    "In Use"
  )
  assert.equal(
    getMaintenanceOperationalTarget({ ownershipType: "personal", custodianId: null }),
    "Ready"
  )
  assert.equal(
    getMaintenanceOperationalTarget({ ownershipType: "shared", custodianId: null }),
    "Ready"
  )
})
