import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import test from "node:test"

import type { AssetOperationFacts } from "../src/lib/asset-operation-eligibility.ts"
import { getAssetOperationSearchVerdict } from "../src/lib/asset-operation-search-rules.ts"
import { getHeldAssetReturnBlock, heldAssetReturnBlockCodes } from "../src/lib/held-asset-return-block.ts"

const th = JSON.parse(readFileSync("messages/th.json", "utf8")) as Record<string, unknown>
const en = JSON.parse(readFileSync("messages/en.json", "utf8")) as Record<string, unknown>
function message(messages: Record<string, unknown>, key: string): unknown {
  return key.split(".").reduce<unknown>((node, part) => (node && typeof node === "object" ? (node as Record<string, unknown>)[part] : undefined), messages)
}

const held: AssetOperationFacts = {
  statusName: "In Use",
  ownership: "personal",
  custodianId: "emp-1",
  openCheckout: null,
  hasOpenRepair: false,
  conditionName: "Good",
  outstanding: null,
}
const permanent = { id: "co-1", handoverMode: "permanent_assignment" }

test("a held asset the return form takes has no block, with or without its handover", () => {
  assert.equal(getHeldAssetReturnBlock(held), null)
  assert.equal(getHeldAssetReturnBlock({ ...held, openCheckout: permanent }), null)
  // An open repair does not refuse a permanent handover's return: it goes into ส่งซ่อม under that repair (S-R43, S-R48).
  assert.equal(getHeldAssetReturnBlock({ ...held, statusName: "Under Maintenance", openCheckout: permanent, hasOpenRepair: true }), null)
})

test("the block names under repair, pending disposal and a fitted component, with the return form's own words", () => {
  assert.deepEqual(getHeldAssetReturnBlock({ ...held, hasOpenRepair: true }), { code: "underRepair", reasonKey: "asset.transactionReasonActiveMaintenance" })
  assert.deepEqual(getHeldAssetReturnBlock({ ...held, statusName: "Pending Disposal" }), { code: "pendingDisposal", reasonKey: "asset.transactionReasonStatusNotReturnable" })
  assert.deepEqual(
    getHeldAssetReturnBlock({ ...held, statusName: "Pending Disposal", openCheckout: permanent }),
    { code: "pendingDisposal", reasonKey: "asset.transactionReasonHandoverStatusMismatch" },
  )
  assert.deepEqual(getHeldAssetReturnBlock({ ...held, ownership: "component" }), { code: "fittedComponent", reasonKey: "asset.transactionReasonComponentCheckin" })
  assert.deepEqual(getHeldAssetReturnBlock({ ...held, ownership: "software_license" }), { code: "license", reasonKey: "asset.transactionReasonLicenseCheckin" })
  assert.deepEqual(getHeldAssetReturnBlock({ ...held, statusName: "Lost" }), { code: "statusNotReturnable", reasonKey: "asset.transactionReasonStatusNotReturnable" })
  assert.deepEqual(
    getHeldAssetReturnBlock({ ...held, openCheckout: { id: "co-1", handoverMode: null } }),
    { code: "handoverModeMissing", reasonKey: "asset.transactionReasonHandoverModeMissing" },
  )
  assert.deepEqual(
    getHeldAssetReturnBlock({ ...held, statusName: "Ready", openCheckout: permanent }),
    { code: "handoverStatusMismatch", reasonKey: "asset.transactionReasonHandoverStatusMismatch" },
  )
  assert.deepEqual(getHeldAssetReturnBlock({ ...held, custodianId: null }), { code: "notHeld", reasonKey: "asset.transactionReasonNoReturnRecord" })
  const outstanding = { linkId: "link-1", checkinId: "rt-1" }
  assert.deepEqual(
    getHeldAssetReturnBlock({ ...held, outstanding, openCheckout: permanent }),
    { code: "componentOwnHandover", reasonKey: "asset.transactionReasonComponentOwnHandover" },
  )
  assert.deepEqual(getHeldAssetReturnBlock({ ...held, outstanding, hasOpenRepair: true }), { code: "underRepair", reasonKey: "asset.transactionReasonActiveMaintenance" })
})

test("the return search refuses exactly what the block names, with the same words (one rule for both)", () => {
  const statuses = ["Draft", "Ready", "In Use", "Reserved", "Checked Out", "In Transit", "Under Maintenance", "Pending Repair", "Under Inspection", "Lost", "Missing", "Pending Disposal", "Disposed", "Retired"]
  const ownerships = ["personal", "shared", "stock", "component", "software_license"] as const
  const checkouts = [null, permanent, { id: "co-2", handoverMode: "temporary_loan" }, { id: "co-3", handoverMode: null }]
  const outstandings = [null, { linkId: "l-1", checkinId: "rt-1" }, { linkId: "l-2", checkinId: null }]
  const input = { mode: "checkin" as const, q: "", id: null, assignCustodian: false }
  for (const statusName of statuses) for (const ownership of ownerships) for (const openCheckout of checkouts) for (const outstanding of outstandings)
    for (const hasOpenRepair of [false, true]) for (const custodianId of ["emp-1", null]) {
      const facts: AssetOperationFacts = { ...held, statusName, ownership, openCheckout, outstanding, hasOpenRepair, custodianId }
      const verdict = getAssetOperationSearchVerdict(input, facts)
      const block = getHeldAssetReturnBlock(facts)
      assert.equal(verdict.eligible, block === null, JSON.stringify(facts))
      assert.equal(verdict.reasonKey, block?.reasonKey ?? null, JSON.stringify(facts))
      if (block) assert.ok(heldAssetReturnBlockCodes.includes(block.code), block.code)
    }
  assert.match(readFileSync("src/lib/asset-operation-search-rules.ts", "utf8"), /getHeldAssetReturnBlock\(facts\)/, "the search reads the block")
})

test("every block's words exist in Thai and English", () => {
  const keys = [
    "asset.transactionReasonActiveMaintenance",
    "asset.transactionReasonStatusNotReturnable",
    "asset.transactionReasonHandoverStatusMismatch",
    "asset.transactionReasonHandoverModeMissing",
    "asset.transactionReasonComponentCheckin",
    "asset.transactionReasonLicenseCheckin",
    "asset.transactionReasonComponentOwnHandover",
    "asset.transactionReasonNoReturnRecord",
  ]
  for (const key of keys) {
    assert.equal(typeof message(th, key), "string", `th ${key}`)
    assert.equal(typeof message(en, key), "string", `en ${key}`)
  }
})
