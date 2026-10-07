import assert from "node:assert/strict"
import test from "node:test"

import {
  canAttachToRepairRecord,
  getRepairRecordCancelEffect,
  getRepairRecordCompleteEffect,
  getRepairRecordCreateEffect,
  getRepairRecordStatusTone,
  isOpenRepairStatus,
  toRepairRecordStatus,
  type RepairAssetContext,
} from "../src/lib/repair-record-policy.ts"

function asset(overrides: Partial<RepairAssetContext>): RepairAssetContext {
  return { statusName: "Ready", ownershipType: "shared", custodianId: null, hasActiveCheckout: false, hasOpenRecord: false, ...overrides }
}

const done = { done: true, outcome: "usable" as const }
const beyondRepair = { done: true, outcome: "beyond_repair" as const }
const notDone = { done: false, outcome: "usable" as const }

test("legacy workflow statuses are treated as not finished", () => {
  for (const status of ["open", "reported", "accepted", "in_progress", "waiting_parts", "waiting_vendor", "completed"]) {
    assert.equal(isOpenRepairStatus(status), true, status)
    assert.equal(toRepairRecordStatus(status), "in_progress", status)
  }
  assert.equal(isOpenRepairStatus("closed"), false)
  assert.equal(isOpenRepairStatus("cancelled"), false)
  assert.equal(toRepairRecordStatus("closed"), "closed")
  assert.equal(toRepairRecordStatus("cancelled"), "cancelled")
})

test("a finished usable repair leaves an operational asset untouched", () => {
  assert.deepEqual(getRepairRecordCreateEffect(asset({ statusName: "Ready" }), done), { error: null, nextStatusName: null })
  assert.deepEqual(getRepairRecordCreateEffect(asset({ statusName: "Checked Out", hasActiveCheckout: true }), done), { error: null, nextStatusName: null })
})

test("a finished usable repair releases an asset stuck in a repair status", () => {
  assert.deepEqual(getRepairRecordCreateEffect(asset({ statusName: "Pending Repair" }), done), { error: null, nextStatusName: "Ready" })
  assert.deepEqual(
    getRepairRecordCreateEffect(asset({ statusName: "Under Maintenance", ownershipType: "personal", custodianId: "emp-1" }), done),
    { error: null, nextStatusName: "In Use" },
  )
})

test("an unfinished repair moves an operational asset to Under Maintenance", () => {
  for (const statusName of ["Ready", "In Use", "Pending Repair"]) {
    assert.deepEqual(getRepairRecordCreateEffect(asset({ statusName }), notDone), { error: null, nextStatusName: "Under Maintenance" }, statusName)
  }
})

test("a loaned asset must be returned before it is sent for repair", () => {
  assert.equal(getRepairRecordCreateEffect(asset({ statusName: "Checked Out", hasActiveCheckout: true }), notDone).error, "MAINTENANCE_ASSET_ON_LOAN")
})

test("other statuses cannot start an unfinished repair", () => {
  for (const statusName of ["Reserved", "In Transit", "Under Inspection", "Draft", "Pending Disposal", "Lost", "Missing"]) {
    assert.equal(getRepairRecordCreateEffect(asset({ statusName }), notDone).error, "MAINTENANCE_ASSET_INELIGIBLE", statusName)
  }
})

test("written-off assets cannot get repair records", () => {
  for (const statusName of ["Disposed", "Retired"]) {
    assert.equal(getRepairRecordCreateEffect(asset({ statusName }), done).error, "MAINTENANCE_ASSET_WRITTEN_OFF", statusName)
  }
})

test("only one unfinished record per asset", () => {
  assert.equal(getRepairRecordCreateEffect(asset({ hasOpenRecord: true }), done).error, "MAINTENANCE_OPEN_RECORD_EXISTS")
  assert.equal(getRepairRecordCreateEffect(asset({ hasOpenRecord: true }), notDone).error, "MAINTENANCE_OPEN_RECORD_EXISTS")
})

test("beyond repair proposes disposal unless the asset is on loan", () => {
  assert.deepEqual(getRepairRecordCreateEffect(asset({ statusName: "In Use" }), beyondRepair), { error: null, nextStatusName: "Pending Disposal" })
  assert.equal(getRepairRecordCreateEffect(asset({ statusName: "In Use", hasActiveCheckout: true }), beyondRepair).error, "MAINTENANCE_ASSET_ON_LOAN")
})

test("finishing a repair restores the custody-derived status", () => {
  assert.deepEqual(getRepairRecordCompleteEffect(asset({ statusName: "Under Maintenance" }), "usable"), { error: null, nextStatusName: "Ready" })
  assert.deepEqual(
    getRepairRecordCompleteEffect(asset({ statusName: "Under Maintenance", ownershipType: "personal", custodianId: "emp-1" }), "usable"),
    { error: null, nextStatusName: "In Use" },
  )
})

test("a permanently assigned asset returns to In Use after repair even when it is not personal property", () => {
  const assigned = asset({ statusName: "Under Maintenance", ownershipType: "shared", custodianId: "emp-1", hasActiveCheckout: true })
  assert.deepEqual(getRepairRecordCompleteEffect(assigned, "usable"), { error: null, nextStatusName: "In Use" })
  assert.equal(getRepairRecordCompleteEffect(assigned, "beyond_repair").error, "MAINTENANCE_ASSET_ON_LOAN")
})

test("cancelling an unfinished record releases only repair statuses", () => {
  assert.deepEqual(getRepairRecordCancelEffect(asset({ statusName: "Under Maintenance" })), { error: null, nextStatusName: "Ready" })
  assert.deepEqual(getRepairRecordCancelEffect(asset({ statusName: "In Use" })), { error: null, nextStatusName: null })
})

test("status tones follow the three record states", () => {
  assert.equal(getRepairRecordStatusTone("waiting_parts"), "warning")
  assert.equal(getRepairRecordStatusTone("closed"), "success")
  assert.equal(getRepairRecordStatusTone("cancelled"), "muted")
})

test("recorders can attach files to their own records; editors to any record", () => {
  const mine = { createdBy: "user-1" }
  const theirs = { createdBy: "user-2" }
  assert.equal(canAttachToRepairRecord({ userId: "user-1", canEdit: false, canCreate: true }, mine), true)
  assert.equal(canAttachToRepairRecord({ userId: "user-1", canEdit: false, canCreate: true }, theirs), false)
  assert.equal(canAttachToRepairRecord({ userId: "user-1", canEdit: true, canCreate: false }, theirs), true)
  assert.equal(canAttachToRepairRecord({ userId: "user-1", canEdit: false, canCreate: false }, mine), false)
})
