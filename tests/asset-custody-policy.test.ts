import assert from "node:assert/strict"
import test from "node:test"

import { getAssetLifecycleTransitionError } from "../src/lib/asset-lifecycle-policy.ts"
import { getBulkCustodyChangeError, getRegisterCustodyChangeError } from "../src/lib/asset-custody-policy.ts"

test("written-off assets can no longer be moved to another location", () => {
  assert.equal(getAssetLifecycleTransitionError("move_scope", "Disposed"), "ASSET_STATUS_TRANSFER_NOT_ALLOWED")
  assert.equal(getAssetLifecycleTransitionError("move_scope", "Retired"), "ASSET_STATUS_TRANSFER_NOT_ALLOWED")
})

test("operational and pending assets can still be moved between locations", () => {
  for (const status of ["Ready", "In Use", "Pending Disposal", "Pending Repair", "Lost"]) {
    assert.equal(getAssetLifecycleTransitionError("move_scope", status), null, status)
  }
})

test("bulk changes skip the custody workflow only when no checkout is open", () => {
  assert.equal(
    getBulkCustodyChangeError({ statusName: "Checked Out", hasActiveCheckout: true, changesCustodian: false }),
    "ASSET_ACTIVE_CHECKOUT_EXISTS",
  )
  assert.equal(
    getBulkCustodyChangeError({ statusName: "In Use", hasActiveCheckout: true, changesCustodian: true }),
    "ASSET_ACTIVE_CHECKOUT_EXISTS",
  )
})

test("bulk custodian assignment follows the same status rules as a transfer", () => {
  assert.equal(getBulkCustodyChangeError({ statusName: "Ready", hasActiveCheckout: false, changesCustodian: true }), null)
  assert.equal(getBulkCustodyChangeError({ statusName: "In Use", hasActiveCheckout: false, changesCustodian: true }), null)
  assert.equal(
    getBulkCustodyChangeError({ statusName: "Disposed", hasActiveCheckout: false, changesCustodian: true }),
    "ASSET_STATUS_TRANSFER_NOT_ALLOWED",
  )
  assert.equal(
    getBulkCustodyChangeError({ statusName: "Pending Repair", hasActiveCheckout: false, changesCustodian: true }),
    "ASSET_STATUS_TRANSFER_NOT_ALLOWED",
  )
})

test("bulk location-only changes are refused for written-off assets", () => {
  assert.equal(
    getBulkCustodyChangeError({ statusName: "Disposed", hasActiveCheckout: false, changesCustodian: false }),
    "ASSET_STATUS_TRANSFER_NOT_ALLOWED",
  )
  assert.equal(getBulkCustodyChangeError({ statusName: "Pending Disposal", hasActiveCheckout: false, changesCustodian: false }), null)
})

const before = { custodianId: "emp-1", currentLocationId: "loc-1", departmentId: "dept-1" }

test("register edits cannot change custody while a checkout is open", () => {
  assert.equal(
    getRegisterCustodyChangeError({ statusName: "Checked Out", hasActiveCheckout: true, before, after: { ...before, custodianId: "emp-2" } }),
    "ASSET_CUSTODY_LOCKED_BY_CHECKOUT",
  )
  assert.equal(
    getRegisterCustodyChangeError({ statusName: "In Use", hasActiveCheckout: true, before, after: { ...before, currentLocationId: "loc-2" } }),
    "ASSET_CUSTODY_LOCKED_BY_CHECKOUT",
  )
})

test("register edits that leave custody untouched are allowed during a checkout", () => {
  assert.equal(getRegisterCustodyChangeError({ statusName: "Checked Out", hasActiveCheckout: true, before, after: { ...before } }), null)
})

test("register edits cannot move or reassign a written-off asset", () => {
  assert.equal(
    getRegisterCustodyChangeError({ statusName: "Disposed", hasActiveCheckout: false, before, after: { ...before, departmentId: "dept-2" } }),
    "ASSET_STATUS_TRANSFER_NOT_ALLOWED",
  )
  assert.equal(getRegisterCustodyChangeError({ statusName: "Ready", hasActiveCheckout: false, before, after: { ...before, custodianId: null } }), null)
})

test("fields the register form did not send are treated as unchanged", () => {
  assert.equal(
    getRegisterCustodyChangeError({ statusName: "Checked Out", hasActiveCheckout: true, before, after: { custodianId: undefined, currentLocationId: "loc-1", departmentId: undefined } }),
    null,
  )
})
