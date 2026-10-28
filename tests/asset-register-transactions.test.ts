import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import test from "node:test"

import { filterLegacyReturnEligibleAssets, isLegacyReturnEligible } from "../src/lib/asset-lifecycle-policy.ts"
import * as operationPolicy from "../src/lib/asset-operation-policy.ts"

type TransactionPolicyModule = typeof operationPolicy & {
  buildAssetRegisterTransactionHref?: (
    locale: string,
    assetId: string,
    action: "checkout" | "checkin" | "transfer",
    returnTo: string,
    checkoutId?: string | null,
  ) => string
}

const policy = operationPolicy as TransactionPolicyModule

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

test("the asset page asks the shared action rule, and the register's old helper is gone (spec §7.1)", () => {
  const source = readFileSync("src/app/[locale]/(dashboard)/assets/[id]/page.tsx", "utf8").replace(/\r/g, "")

  assert.match(source, /getAssetActions\(actionInput\)/)
  assert.doesNotMatch(source, /getAssetRegisterTransactionActions|getOwnershipLifecycle|disabled: !activeCheckout/)
  assert.equal("getAssetRegisterTransactionActions" in operationPolicy, false)
})

test("the open handover's transfer reason lives in the shared rule and keeps its words (user decision 2026-10-21 Y2)", () => {
  const rule = readFileSync("src/lib/asset-operation-eligibility.ts", "utf8").replace(/\r/g, "")
  assert.match(rule, /"asset\.transactionReasonOpenCheckout"/)
  const th = JSON.parse(readFileSync("messages/th.json", "utf8")).asset
  const en = JSON.parse(readFileSync("messages/en.json", "utf8")).asset
  assert.equal(th.transactionReasonOpenCheckout, "มีการส่งมอบค้างอยู่ รับคืนก่อนจึงโอนย้ายได้")
  assert.equal(en.transactionReasonOpenCheckout, "A handover is open: return the asset before transferring it")
})

test("the register's rows ask the shared action rule, with the open repair and disposal of the rows shown (group 1 spec §7.1)", () => {
  const register = readFileSync("src/app/[locale]/(dashboard)/assets/page.tsx", "utf8").replace(/\r/g, "")
  assert.match(register, /const actions = getAssetActions\(\{/)
  assert.match(register, /returnTo: registerReturnHref,\n\s+can: actionPermissions,/)
  assert.match(register, /prisma\.maintenanceTicket\.findMany\(\{\s*where: \{ \.\.\.openRepairRecordWhere, assetId: \{ in: assetIds \} \},\s*select: \{ id: true, assetId: true \},\s*orderBy: \{ reportedDate: "desc" \},?\s*\}\)/)
  assert.match(register, /prisma\.disposalRequest\.findMany\(\{\s*where: \{ \.\.\.openDisposalRequestWhere, assetId: \{ in: assetIds \} \},\s*select: \{ id: true, assetId: true \},\s*orderBy: \{ requestDate: "desc" \},?\s*\}\)/)
  assert.match(register, /maintenanceView: hasPermission\(user, "maintenance", "view"\)/)
  assert.match(register, /disposalView: hasPermission\(user, "disposal", "view"\)/)
  assert.doesNotMatch(register, /getAssetRegisterTransactionActions|getRowNextAction|buildAssetRegisterTransactionHref/)
  const policy = readFileSync("src/lib/asset-operation-policy.ts", "utf8")
  assert.doesNotMatch(policy, /export function getRowNextAction/)
  const rule = readFileSync("src/lib/asset-actions.ts", "utf8")
  assert.doesNotMatch(rule, /from "@\/|from "@prisma\/client"|\bprisma\./, "the rule stays pure: relative imports, no database")
})
