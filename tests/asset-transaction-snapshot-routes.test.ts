import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import test from "node:test"

import {
  createAssetTransactionSnapshot,
  serializeAssetComponentTransactionSnapshots,
} from "../src/lib/asset-transaction-snapshot.ts"

test("normalizes database dates into a serializable transaction snapshot", () => {
  const snapshot = createAssetTransactionSnapshot({
    asset: {
      id: "asset-1",
      updatedAt: new Date("2026-08-27T09:00:00.000Z"),
      statusId: "status-ready",
      conditionId: "condition-good",
      branchId: "branch-1",
      currentLocationId: "location-1",
      custodianId: null,
      departmentId: null,
    },
    checkout: null,
    components: [],
  })

  assert.deepEqual(snapshot, {
    version: 1,
    assetId: "asset-1",
    assetUpdatedAt: "2026-08-27T09:00:00.000Z",
    statusId: "status-ready",
    conditionId: "condition-good",
    branchId: "branch-1",
    currentLocationId: "location-1",
    custodianId: null,
    departmentId: null,
    checkout: null,
    components: [],
  })
})

test("serializes component before and after snapshots as one versioned payload", () => {
  const component = {
    componentLinkId: "link-1",
    componentAssetId: "component-1",
    parentAssetId: "asset-1",
    relationshipStatus: "installed",
    relationshipUpdatedAt: "2026-08-27T08:00:00.000Z",
    assetUpdatedAt: "2026-08-27T09:00:00.000Z",
    statusId: "status-ready",
    conditionId: "condition-good",
    branchId: "branch-1",
    currentLocationId: "location-1",
    custodianId: null,
    departmentId: null,
  }

  assert.equal(
    serializeAssetComponentTransactionSnapshots([{ before: component, after: { ...component, currentLocationId: "location-2" } }]),
    JSON.stringify({ version: 1, changes: [{ before: component, after: { ...component, currentLocationId: "location-2" } }] })
  )
})

test("operation routes persist complete snapshots and transfer uses a real document", () => {
  const checkoutRoute = readFileSync("src/app/api/assets/[id]/checkout/route.ts", "utf8")
  const checkinRoute = readFileSync("src/app/api/assets/[id]/checkin/route.ts", "utf8")
  const transferRoute = readFileSync("src/app/api/assets/[id]/transfer/route.ts", "utf8")

  for (const [path, source] of [
    ["checkout", checkoutRoute],
    ["checkin", checkinRoute],
    ["transfer", transferRoute],
  ] as const) {
    assert.match(source, /beforeSnapshotJson/, `${path} must persist its before snapshot`)
    assert.match(source, /afterSnapshotJson/, `${path} must persist its after snapshot`)
    assert.match(source, /componentSnapshotJson/, `${path} must persist component snapshots`)
  }

  assert.match(transferRoute, /tx\.assetTransfer\.create/)
  assert.match(transferRoute, /generateTransferDocumentNo/)
  assert.match(transferRoute, /referenceId:\s*transferId/)
  assert.match(transferRoute, /NextResponse\.json\(transfer/)

  for (const [path, source] of [
    ["checkout", checkoutRoute],
    ["checkin", checkinRoute],
    ["transfer", transferRoute],
  ] as const) {
    assert.match(
      source,
      /isReturned:\s*false[\s\S]{0,120}transactionStatus:\s*"active"|transactionStatus:\s*"active"[\s\S]{0,120}isReturned:\s*false/,
      `${path} must ignore void checkout documents`
    )
  }
})
