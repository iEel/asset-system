import assert from "node:assert/strict"
import test from "node:test"

import {
  getRepairCreateOutlook,
  getRepairEligibility,
  toRepairAssetContext,
  type RepairAssetFacts,
} from "../src/lib/repair-record-outlook.ts"

// The pure "what will happen" helper of MT-New (group 5 spec §7.2, §7.3, §5 "Early refusal on a held asset").

function facts(overrides: Partial<RepairAssetFacts> = {}): RepairAssetFacts {
  return {
    id: "a-1",
    assetTag: "NB-001",
    name: "Notebook",
    statusName: "Ready",
    statusLabel: "พร้อมใช้งาน",
    conditionId: "condition-good",
    conditionLabel: "ดี",
    ownershipType: "shared",
    custodianId: null,
    holderName: null,
    departmentName: "IT",
    roomName: "ห้อง 101",
    branchName: "สำนักงานใหญ่",
    photo: null,
    openRecord: null,
    activeCheckout: null,
    ...overrides,
  }
}

const held = { id: "co-1", documentNo: "HO-1", holderName: "สมชาย" }
const inUsePersonal = (activeCheckout: RepairAssetFacts["activeCheckout"]) =>
  facts({ statusName: "In Use", statusLabel: "ใช้งานอยู่", ownershipType: "personal", custodianId: "emp-1", holderName: "สมชาย", activeCheckout })

test("toRepairAssetContext: the policy's context from the facts", () => {
  assert.deepEqual(toRepairAssetContext(inUsePersonal(held)), {
    statusName: "In Use",
    ownershipType: "personal",
    custodianId: "emp-1",
    hasActiveCheckout: true,
    hasOpenRecord: false,
  })
  assert.equal(toRepairAssetContext(facts({ openRecord: { id: "r-1", repairNo: "MT-1" } })).hasOpenRecord, true)
})

test("outlook on a Ready shared asset: unanswered, depends on the outcome, then the status the save writes", () => {
  const ready = facts()
  assert.deepEqual(getRepairCreateOutlook(ready, { done: null, outcome: null }), { kind: "unanswered" })
  assert.deepEqual(getRepairCreateOutlook(ready, { done: true, outcome: null }), { kind: "dependsOnOutcome" })
  assert.deepEqual(getRepairCreateOutlook(ready, { done: false, outcome: null }), { kind: "status", nextStatusName: "Under Maintenance", changes: true })
  assert.deepEqual(getRepairCreateOutlook(ready, { done: true, outcome: "usable" }), { kind: "status", nextStatusName: "Ready", changes: false })
})

test("outlook refuses ซ่อมไม่ได้ on a held asset early and names the handover (§5 early refusal)", () => {
  assert.deepEqual(getRepairCreateOutlook(inUsePersonal(held), { done: true, outcome: "beyond_repair" }), {
    kind: "refused",
    error: "MAINTENANCE_ASSET_ON_LOAN",
    held: { checkoutId: "co-1", documentNo: "HO-1", holderName: "สมชาย" },
  })
  // A backfilled handover has no document number; it stays null (Review Focus 4).
  assert.deepEqual(getRepairCreateOutlook(inUsePersonal({ ...held, documentNo: null }), { done: true, outcome: "beyond_repair" }), {
    kind: "refused",
    error: "MAINTENANCE_ASSET_ON_LOAN",
    held: { checkoutId: "co-1", documentNo: null, holderName: "สมชาย" },
  })
})

test("outlook: not done on Under Maintenance keeps the status (decision 11); on Under Inspection it is refused with no handover", () => {
  assert.deepEqual(
    getRepairCreateOutlook(facts({ statusName: "Under Maintenance" }), { done: false, outcome: null }),
    { kind: "status", nextStatusName: "Under Maintenance", changes: false },
  )
  assert.deepEqual(
    getRepairCreateOutlook(facts({ statusName: "Under Inspection", activeCheckout: held }), { done: false, outcome: null }),
    { kind: "refused", error: "MAINTENANCE_ASSET_INELIGIBLE", held: null },
  )
})

test("eligibility: an open record, a written-off asset, else ok", () => {
  assert.equal(getRepairEligibility(facts({ openRecord: { id: "r-1", repairNo: "MT-1" } })), "openRecord")
  assert.equal(getRepairEligibility(facts({ statusName: "Disposed" })), "writtenOff")
  assert.equal(getRepairEligibility(facts({ statusName: " retired " })), "writtenOff")
  assert.equal(getRepairEligibility(facts()), "ok")
  assert.equal(getRepairEligibility(inUsePersonal(held)), "ok")
})
