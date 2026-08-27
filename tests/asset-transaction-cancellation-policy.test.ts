import assert from "node:assert/strict"
import test from "node:test"

import {
  parseAssetTransactionSnapshot,
  type AssetTransactionSnapshotV1,
} from "../src/lib/asset-transaction-snapshot.ts"
import {
  evaluateAssetTransactionCancellation,
  type AssetTransactionCancellationInput,
} from "../src/lib/asset-transaction-cancellation-policy.ts"

const supportedSnapshot: AssetTransactionSnapshotV1 = {
  version: 1,
  assetId: "asset-1",
  assetUpdatedAt: "2026-08-27T09:00:00.000Z",
  statusId: "status-checked-out",
  conditionId: "condition-good",
  branchId: "branch-1",
  currentLocationId: "location-2",
  custodianId: "employee-1",
  departmentId: "department-1",
  checkout: { id: "checkout-1", isReturned: false },
  components: [
    {
      componentLinkId: "link-1",
      componentAssetId: "component-1",
      parentAssetId: "asset-1",
      relationshipStatus: "installed",
      relationshipUpdatedAt: "2026-08-27T08:00:00.000Z",
      assetUpdatedAt: "2026-08-27T09:00:00.000Z",
      statusId: "status-ready",
      conditionId: "condition-good",
      branchId: "branch-1",
      currentLocationId: "location-2",
      custodianId: "employee-1",
      departmentId: "department-1",
    },
  ],
}

const eligibleInput: AssetTransactionCancellationInput = {
  snapshot: supportedSnapshot,
  transactionStatus: "active",
  isLatestTransaction: true,
  assetMatchesAfterSnapshot: true,
  componentsMatchAfterSnapshot: true,
  downstreamTypes: [],
}

test("parses a complete version 1 transaction snapshot", () => {
  assert.deepEqual(parseAssetTransactionSnapshot(JSON.stringify(supportedSnapshot)), supportedSnapshot)
})

test("rejects unsupported, incomplete, and unbounded transaction snapshots", () => {
  assert.equal(parseAssetTransactionSnapshot(JSON.stringify({ ...supportedSnapshot, version: 2 })), null)
  assert.equal(parseAssetTransactionSnapshot(JSON.stringify({ ...supportedSnapshot, statusId: undefined })), null)
  assert.equal(parseAssetTransactionSnapshot("not-json"), null)
  assert.equal(
    parseAssetTransactionSnapshot(JSON.stringify({
      ...supportedSnapshot,
      components: Array.from({ length: 501 }, () => supportedSnapshot.components[0]),
    })),
    null
  )
})

test("allows the latest active transaction when asset and components still match", () => {
  assert.deepEqual(evaluateAssetTransactionCancellation(eligibleInput), { eligible: true })
})

test("reports every cancellation blocker in stable order", () => {
  assert.deepEqual(
    evaluateAssetTransactionCancellation({
      ...eligibleInput,
      snapshot: null,
      transactionStatus: "void",
      isLatestTransaction: false,
      assetMatchesAfterSnapshot: false,
      componentsMatchAfterSnapshot: false,
      downstreamTypes: ["maintenance", "disposal"],
    }),
    {
      eligible: false,
      reasons: [
        "unsupported_snapshot",
        "not_active",
        "not_latest",
        "asset_changed",
        "components_changed",
        "downstream_work",
      ],
    }
  )
})

test("does not mutate the caller's blocker list", () => {
  const downstreamTypes = ["maintenance"]
  evaluateAssetTransactionCancellation({ ...eligibleInput, downstreamTypes })
  assert.deepEqual(downstreamTypes, ["maintenance"])
})
