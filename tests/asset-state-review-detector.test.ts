import assert from "node:assert/strict"
import test from "node:test"

import { detectAssetStateIssues } from "../src/lib/asset-state-review-detector.ts"
import type { AssetStateObservedSnapshot } from "../src/lib/asset-state-review-types.ts"

test("detects repair lifecycle without an active corrective ticket", () => {
  assert.deepEqual(issueTypes(snapshot({ statusName: "Pending Repair", conditionName: "Fair", activeCorrectiveTickets: 0 })), [
    "repair_status_without_active_ticket",
  ])
})

test("detects an active corrective ticket whose asset status is not in repair lifecycle", () => {
  assert.deepEqual(issueTypes(snapshot({ statusName: "Ready", activeCorrectiveTickets: 1, activeCorrectiveStatusNames: ["in_progress"] })), [
    "active_repair_ticket_status_mismatch",
  ])
})

test("detects checkout status and transaction mismatches in both directions", () => {
  assert.deepEqual(issueTypes(snapshot({ statusName: "Checked Out", openCheckouts: 0 })), [
    "checked_out_without_open_checkout",
  ])
  assert.deepEqual(issueTypes(snapshot({ statusName: "Ready", openCheckouts: 1 })), [
    "open_checkout_status_mismatch",
  ])
})

test("detects personal custody inconsistencies", () => {
  assert.deepEqual(issueTypes(snapshot({ statusName: "In Use", ownershipType: "personal", custodianId: null })), [
    "personal_in_use_without_custodian",
  ])
  assert.deepEqual(issueTypes(snapshot({ statusName: "Ready", ownershipType: "personal", custodianId: "employee-1" })), [
    "personal_ready_with_custodian",
  ])
})

test("detects incompatible status and physical condition without flagging disposed Good", () => {
  assert.deepEqual(issueTypes(snapshot({ statusName: "Ready", conditionName: "Damaged" })), [
    "incompatible_status_condition",
  ])
  assert.deepEqual(issueTypes(snapshot({ statusName: "Disposed", conditionName: "Good" })), [])
})

test("detects legacy condition and controlled lifecycle values", () => {
  assert.deepEqual(
    issueTypes(snapshot({ statusName: "Under Inspection", conditionName: "Excellent" })).sort(),
    ["controlled_legacy_status", "legacy_condition_value"],
  )
})

test("detects disposal records that cannot restore a prior status", () => {
  assert.deepEqual(issueTypes(snapshot({ openDisposalsMissingPreviousStatus: 1 })), [
    "legacy_disposal_missing_previous_status",
  ])
})

function issueTypes(value: AssetStateObservedSnapshot) {
  return detectAssetStateIssues(value).map((issue) => issue.issueType)
}

function snapshot(overrides: Partial<AssetStateObservedSnapshot> = {}): AssetStateObservedSnapshot {
  return {
    assetId: "asset-1",
    assetTag: "AST-001",
    assetName: "Notebook",
    companyId: "company-1",
    branchId: "branch-1",
    ownershipType: "shared",
    statusId: "status-ready",
    statusName: "Ready",
    conditionId: "condition-good",
    conditionName: "Good",
    custodianId: null,
    assetUpdatedAt: new Date("2026-08-01T00:00:00.000Z"),
    openCheckouts: 0,
    activeCorrectiveTickets: 0,
    activeCorrectiveStatusNames: [],
    openDisposalsMissingPreviousStatus: 0,
    ...overrides,
  }
}
