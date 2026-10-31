import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import test from "node:test"

import {
  createAssetTransactionSnapshot,
  createComponentLinkTransactionSnapshot,
  parseAssetTransactionSnapshot,
  serializeAssetComponentTransactionSnapshots,
  serializeAssetTransactionSnapshot,
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

const componentLink = { id: "link-1", componentAssetId: "component-1", parentAssetId: "asset-1", status: "installed", updatedAt: new Date("2026-10-20T03:00:00.000Z") }
const componentAsset = {
  updatedAt: "2026-10-20T04:00:00.000Z", statusId: "status-ready", conditionId: "condition-good", branchId: "branch-1",
  currentLocationId: "location-1", custodianId: "employee-1", departmentId: null,
}
// asset-component-sync.ts:186-213 and asset-transaction-cancellation-prisma.ts:122-135 build exactly these, in this order.
const syncKeys = [
  "componentLinkId", "componentAssetId", "parentAssetId", "relationshipStatus", "relationshipUpdatedAt", "assetUpdatedAt",
  "statusId", "conditionId", "branchId", "currentLocationId", "custodianId", "departmentId",
]

test("a link's component snapshot has the sync's keys in the sync's order; a before entry adds the link's own reference last (group 3 spec §8.5, P2-R6)", () => {
  const after = createComponentLinkTransactionSnapshot(componentLink, componentAsset)
  assert.deepEqual(Object.keys(after), syncKeys)
  assert.deepEqual([after.relationshipUpdatedAt, after.assetUpdatedAt], ["2026-10-20T03:00:00.000Z", "2026-10-20T04:00:00.000Z"])
  const before = createComponentLinkTransactionSnapshot(componentLink, componentAsset, { referenceType: "purchase", referenceId: "PO-7" })
  assert.deepEqual(Object.keys(before), [...syncKeys, "relationshipReferenceType", "relationshipReferenceId"])
  assert.deepEqual([before.relationshipReferenceType, before.relationshipReferenceId], ["purchase", "PO-7"])
})

test("a before entry's link reference survives the round trip, null included; an empty or non-text one is refused; old snapshots still parse", () => {
  const asset = { id: "asset-1", updatedAt: "2026-10-20T04:00:00.000Z", statusId: "s", conditionId: "c", branchId: "b", currentLocationId: "l", custodianId: null, departmentId: null }
  const withReference = (reference: { referenceType: string | null; referenceId: string | null }) =>
    createAssetTransactionSnapshot({ asset, components: [createComponentLinkTransactionSnapshot(componentLink, componentAsset, reference)] })
  for (const reference of [{ referenceType: "purchase", referenceId: "PO-7" }, { referenceType: null, referenceId: null }]) {
    const json = serializeAssetTransactionSnapshot(withReference(reference))
    assert.equal(parseAssetTransactionSnapshot(json)?.components[0].relationshipReferenceId, reference.referenceId)
  }
  const old = JSON.stringify(createAssetTransactionSnapshot({ asset, components: [createComponentLinkTransactionSnapshot(componentLink, componentAsset)] }))
  assert.equal(parseAssetTransactionSnapshot(old)?.components.length, 1)
  for (const bad of ["", 7]) {
    const json = JSON.stringify({ ...JSON.parse(old), components: [{ ...JSON.parse(old).components[0], relationshipReferenceType: bad }] })
    assert.equal(parseAssetTransactionSnapshot(json), null, String(bad))
  }
})

const returnedAsset = {
  id: "asset-1",
  updatedAt: new Date("2026-10-31T03:00:00.000Z"),
  statusId: "status-under-maintenance",
  conditionId: "condition-damaged",
  branchId: "branch-1",
  currentLocationId: "location-1",
  custodianId: null,
  departmentId: "department-it",
}

test("an RT- after snapshot carries the repair record the return opened or joined, copied as { id, repairNo, joined }, and leaves the key out when there is none (group 3 spec §8.7, P2-R5)", () => {
  const repair = { id: "mt-1", repairNo: "MT-20261031-0001", joined: false }
  const snapshot = createAssetTransactionSnapshot({ asset: returnedAsset, checkout: { id: "checkout-1", isReturned: true }, components: [], repair })
  assert.deepEqual(snapshot.repair, repair)
  assert.deepEqual(parseAssetTransactionSnapshot(serializeAssetTransactionSnapshot(snapshot)), snapshot)
  const copied = createAssetTransactionSnapshot({ asset: returnedAsset, components: [], repair: { ...repair, joined: true, note: "extra" } as never })
  assert.deepEqual(copied.repair, { id: "mt-1", repairNo: "MT-20261031-0001", joined: true })
  for (const none of [undefined, null]) {
    assert.equal("repair" in createAssetTransactionSnapshot({ asset: returnedAsset, checkout: null, components: [], repair: none }), false, String(none))
  }
})

test("a repair link that is not { id, repairNo, joined } makes the snapshot unreadable, so cancel reports it instead of guessing (P2-R5)", () => {
  const base = createAssetTransactionSnapshot({ asset: returnedAsset, checkout: null, components: [] })
  for (const repair of [null, {}, { id: "mt-1", repairNo: "MT-20261031-0001" }, { id: "", repairNo: "MT-20261031-0001", joined: true }, { id: "mt-1", repairNo: "MT-20261031-0001", joined: "yes" }]) {
    assert.equal(parseAssetTransactionSnapshot(JSON.stringify({ ...base, repair })), null, JSON.stringify(repair))
    assert.throws(() => serializeAssetTransactionSnapshot({ ...base, repair } as never), /Invalid asset transaction snapshot/, JSON.stringify(repair))
  }
})
