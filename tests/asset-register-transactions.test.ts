import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import test from "node:test"

import { filterLegacyReturnEligibleAssets, isLegacyReturnEligible } from "../src/lib/asset-lifecycle-policy.ts"
import * as operationPolicy from "../src/lib/asset-operation-policy.ts"

type TransactionPolicyModule = typeof operationPolicy & {
  getAssetRegisterTransactionActions?: (input: {
    statusName: string
    custodianId: string | null
    openCheckoutId: string | null
    openCheckoutHandoverMode: string | null
    hasActiveMaintenance: boolean
    canEdit: boolean
  }) => Array<{
    action: "checkout" | "checkin" | "transfer"
    enabled: boolean
    mode?: "open_checkout" | "legacy_return"
    reason?: string
  }>
  buildAssetRegisterTransactionHref?: (
    locale: string,
    assetId: string,
    action: "checkout" | "checkin" | "transfer",
    returnTo: string,
    checkoutId?: string | null,
  ) => string
}

const policy = operationPolicy as TransactionPolicyModule

test("register transactions expose the approved contextual actions and reasons", () => {
  assert.equal(typeof policy.getAssetRegisterTransactionActions, "function")
  const getActions = policy.getAssetRegisterTransactionActions!

  assert.deepEqual(getActions({
    statusName: "Ready",
    custodianId: null,
    openCheckoutId: null,
    openCheckoutHandoverMode: null,
    hasActiveMaintenance: false,
    canEdit: true,
  }), [
    { action: "checkout", enabled: true },
    { action: "checkin", enabled: false, reason: "no_return_record" },
    { action: "transfer", enabled: true },
  ])

  assert.deepEqual(getActions({
    statusName: "In Use",
    custodianId: "employee-1",
    openCheckoutId: null,
    openCheckoutHandoverMode: null,
    hasActiveMaintenance: false,
    canEdit: true,
  }), [
    { action: "checkout", enabled: false, reason: "status_not_ready" },
    { action: "checkin", enabled: true, mode: "legacy_return" },
    { action: "transfer", enabled: true },
  ])

  assert.deepEqual(getActions({
    statusName: "Checked Out",
    custodianId: "employee-1",
    openCheckoutId: "checkout-1",
    openCheckoutHandoverMode: "temporary_loan",
    hasActiveMaintenance: false,
    canEdit: true,
  }), [
    { action: "checkout", enabled: false, reason: "status_not_ready" },
    { action: "checkin", enabled: true, mode: "open_checkout" },
    { action: "transfer", enabled: false, reason: "status_not_transferable" },
  ])

  assert.deepEqual(getActions({
    statusName: "Pending Repair",
    custodianId: "employee-1",
    openCheckoutId: null,
    openCheckoutHandoverMode: null,
    hasActiveMaintenance: true,
    canEdit: true,
  }), [
    { action: "checkout", enabled: false, reason: "status_not_ready" },
    { action: "checkin", enabled: false, reason: "active_maintenance" },
    { action: "transfer", enabled: false, reason: "status_not_transferable" },
  ])

  assert.deepEqual(getActions({
    statusName: "Pending Repair",
    custodianId: "employee-1",
    openCheckoutId: "stale-checkout",
    openCheckoutHandoverMode: "temporary_loan",
    hasActiveMaintenance: true,
    canEdit: true,
  })[1], { action: "checkin", enabled: false, reason: "active_maintenance" })
})

test("register transactions are visible but disabled without edit permission", () => {
  assert.equal(typeof policy.getAssetRegisterTransactionActions, "function")
  const actions = policy.getAssetRegisterTransactionActions!({
    statusName: "Ready",
    custodianId: "employee-1",
    openCheckoutId: null,
    openCheckoutHandoverMode: null,
    hasActiveMaintenance: false,
    canEdit: false,
  })

  assert.deepEqual(actions, [
    { action: "checkout", enabled: false, reason: "permission_required" },
    { action: "checkin", enabled: false, reason: "permission_required" },
    { action: "transfer", enabled: false, reason: "permission_required" },
  ])
})

test("register transaction links preselect the asset or checkout and preserve returnTo", () => {
  assert.equal(typeof policy.buildAssetRegisterTransactionHref, "function")
  const buildHref = policy.buildAssetRegisterTransactionHref!
  const returnTo = "/th/assets?statusId=ready&page=2"

  assert.equal(
    buildHref("th", "asset-1", "checkout", returnTo),
    "/th/asset-management/checkout?assetId=asset-1&returnTo=%2Fth%2Fassets%3FstatusId%3Dready%26page%3D2",
  )
  assert.equal(
    buildHref("th", "asset-1", "checkin", returnTo, "checkout-1"),
    "/th/asset-management/checkin?checkoutId=checkout-1&returnTo=%2Fth%2Fassets%3FstatusId%3Dready%26page%3D2",
  )
  assert.equal(
    buildHref("th", "asset-1", "checkin", returnTo),
    "/th/asset-management/checkin?assetId=asset-1&returnTo=%2Fth%2Fassets%3FstatusId%3Dready%26page%3D2",
  )
  assert.equal(
    buildHref("th", "asset-1", "transfer", returnTo),
    "/th/asset-management/transfer?assetId=asset-1&returnTo=%2Fth%2Fassets%3FstatusId%3Dready%26page%3D2",
  )
})

test("In Use with a permanent handover offers รับคืน against it", () => {
  const getActions = policy.getAssetRegisterTransactionActions!
  const input = {
    statusName: "In Use",
    custodianId: "e1",
    openCheckoutId: "c1",
    openCheckoutHandoverMode: "permanent_assignment",
    hasActiveMaintenance: false,
    canEdit: true,
  }

  assert.deepEqual(getActions(input)[1], { action: "checkin", enabled: true, mode: "open_checkout" })
  assert.equal(getActions({ ...input, openCheckoutHandoverMode: "temporary_loan" })[1].enabled, false)
})

test("isLegacyReturnEligible agrees with the check-in picker", () => {
  const candidates = [
    { id: "ready", status: { name: "Ready" }, custodianId: "employee-1", hasOpenCheckout: false, hasActiveMaintenance: false },
    { id: "in-use", status: { name: "In Use" }, custodianId: "employee-1", hasOpenCheckout: false, hasActiveMaintenance: false },
    { id: "repair", status: { name: "Pending Repair" }, custodianId: "employee-1", hasOpenCheckout: false, hasActiveMaintenance: true },
    { id: "no-holder", status: { name: "Ready" }, custodianId: null, hasOpenCheckout: false, hasActiveMaintenance: false },
    { id: "already-out", status: { name: "Ready" }, custodianId: "employee-1", hasOpenCheckout: true, hasActiveMaintenance: false },
  ]
  const eligible = new Set(filterLegacyReturnEligibleAssets(candidates).map((candidate) => candidate.id))

  for (const candidate of candidates) {
    assert.equal(
      isLegacyReturnEligible({
        statusName: candidate.status.name,
        custodianId: candidate.custodianId,
        hasOpenCheckout: candidate.hasOpenCheckout,
        hasActiveMaintenance: candidate.hasActiveMaintenance,
      }),
      eligible.has(candidate.id),
      candidate.id,
    )
  }
})

test("the asset page asks the register's rule", () => {
  const source = readFileSync("src/app/[locale]/(dashboard)/assets/[id]/page.tsx", "utf8").replace(/\r/g, "")

  assert.match(source, /getAssetRegisterTransactionActions\(/)
  assert.doesNotMatch(source, /disabled: !activeCheckout/)
})
