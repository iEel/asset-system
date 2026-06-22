import assert from "node:assert/strict"
import test from "node:test"

import {
  buildComponentSyncUpdate,
  normalizeComponentSyncChanges,
  syncInstalledComponentsWithParent,
  type ComponentSyncSnapshot,
  type NormalizedComponentSyncChanges,
  type ParentComponentSyncInput,
} from "../src/lib/asset-component-sync.ts"

const snapshot: ComponentSyncSnapshot = {
  id: "component-1",
  branchId: "branch-old",
  currentLocationId: "loc-old",
  departmentId: null,
  custodianId: "emp-old",
}

type ComponentLink = {
  componentAssetId: string
  componentAsset: ComponentSyncSnapshot
}

type FakeTxCalls = {
  assetComponentFindMany: unknown[]
  assetCheckoutFindMany: unknown[]
  assetUpdates: unknown[]
  assetMovementCreateMany: unknown[]
}

function makeSyncInput(overrides: Partial<ParentComponentSyncInput> = {}): ParentComponentSyncInput {
  return {
    parentAssetId: "parent-1",
    changes: {
      currentLocationId: "loc-new",
    },
    movementType: "parent_sync",
    referenceType: "asset",
    referenceId: "parent-1",
    performedBy: "user-1",
    reason: "Parent asset changed",
    remark: "sync remark",
    ...overrides,
  }
}

function makeFakeTx(options: { links?: ComponentLink[]; checkouts?: Array<{ assetId: string }> } = {}) {
  const calls: FakeTxCalls = {
    assetComponentFindMany: [],
    assetCheckoutFindMany: [],
    assetUpdates: [],
    assetMovementCreateMany: [],
  }

  const tx = {
    assetComponent: {
      findMany: async (args: unknown) => {
        calls.assetComponentFindMany.push(args)
        return options.links ?? []
      },
    },
    assetCheckout: {
      findMany: async (args: unknown) => {
        calls.assetCheckoutFindMany.push(args)
        return options.checkouts ?? []
      },
    },
    asset: {
      update: async (args: unknown) => {
        calls.assetUpdates.push(args)
        return {}
      },
    },
    assetMovement: {
      createMany: async (args: unknown) => {
        calls.assetMovementCreateMany.push(args)
        const data = (args as { data?: unknown }).data
        return { count: Array.isArray(data) ? data.length : 0 }
      },
    },
  } as unknown as Parameters<typeof syncInstalledComponentsWithParent>[0]

  return { tx, calls }
}

test("normalizes component sync changes by removing undefined fields", () => {
  assert.deepEqual(
    normalizeComponentSyncChanges({
      branchId: "branch-new",
      currentLocationId: undefined,
      departmentId: null,
      custodianId: "emp-new",
    }),
    {
      branchId: "branch-new",
      departmentId: null,
      custodianId: "emp-new",
    }
  )
})

test("normalizes component sync changes by ignoring null required fields", () => {
  assert.deepEqual(
    normalizeComponentSyncChanges({
      branchId: null,
      currentLocationId: null,
      departmentId: null,
      custodianId: null,
    }),
    {
      departmentId: null,
      custodianId: null,
    }
  )
})

test("builds component sync update only for changed supported fields", () => {
  const update = buildComponentSyncUpdate(snapshot, {
    branchId: "branch-old",
    currentLocationId: "loc-new",
    departmentId: null,
    custodianId: "emp-new",
  })

  assert.deepEqual(update, {
    data: {
      currentLocationId: "loc-new",
      custodianId: "emp-new",
    },
    fromValue: {
      currentLocationId: "loc-old",
      custodianId: "emp-old",
    },
    toValue: {
      currentLocationId: "loc-new",
      custodianId: "emp-new",
    },
  })
})

test("does not emit null update data for required component sync fields", () => {
  const update = buildComponentSyncUpdate(snapshot, {
    branchId: null,
    currentLocationId: null,
    departmentId: "dept-new",
  } as unknown as NormalizedComponentSyncChanges)

  assert.deepEqual(update, {
    data: {
      departmentId: "dept-new",
    },
    fromValue: {
      departmentId: null,
    },
    toValue: {
      departmentId: "dept-new",
    },
  })
})

test("returns null when component sync fields are unchanged", () => {
  assert.equal(
    buildComponentSyncUpdate(snapshot, {
      branchId: "branch-old",
      currentLocationId: "loc-old",
      departmentId: null,
      custodianId: "emp-old",
    }),
    null
  )
})

test("syncInstalledComponentsWithParent returns without querying when there are no supported changes", async () => {
  const { tx, calls } = makeFakeTx({ links: [{ componentAssetId: "component-1", componentAsset: snapshot }] })

  const result = await syncInstalledComponentsWithParent(
    tx,
    makeSyncInput({ changes: { branchId: null, currentLocationId: undefined } })
  )

  assert.deepEqual(result, { updated: 0, skipped: 0, movements: 0 })
  assert.deepEqual(calls, {
    assetComponentFindMany: [],
    assetCheckoutFindMany: [],
    assetUpdates: [],
    assetMovementCreateMany: [],
  })
})

test("syncInstalledComponentsWithParent skips checked-out components", async () => {
  const { tx, calls } = makeFakeTx({
    links: [{ componentAssetId: "component-1", componentAsset: snapshot }],
    checkouts: [{ assetId: "component-1" }],
  })

  const result = await syncInstalledComponentsWithParent(tx, makeSyncInput())

  assert.deepEqual(result, { updated: 0, skipped: 1, movements: 0 })
  assert.equal(calls.assetUpdates.length, 0)
  assert.equal(calls.assetMovementCreateMany.length, 0)
})

test("syncInstalledComponentsWithParent ignores unchanged non-checked-out components", async () => {
  const { tx, calls } = makeFakeTx({
    links: [
      {
        componentAssetId: "component-1",
        componentAsset: { ...snapshot, currentLocationId: "loc-new" },
      },
    ],
  })

  const result = await syncInstalledComponentsWithParent(tx, makeSyncInput())

  assert.deepEqual(result, { updated: 0, skipped: 0, movements: 0 })
  assert.equal(calls.assetUpdates.length, 0)
  assert.equal(calls.assetMovementCreateMany.length, 0)
})

test("syncInstalledComponentsWithParent updates changed components and creates scoped movement rows", async () => {
  const { tx, calls } = makeFakeTx({
    links: [{ componentAssetId: "component-1", componentAsset: snapshot }],
  })

  const result = await syncInstalledComponentsWithParent(
    tx,
    makeSyncInput({ changes: { currentLocationId: "loc-new", custodianId: null } })
  )

  assert.deepEqual(result, { updated: 1, skipped: 0, movements: 1 })
  assert.deepEqual(calls.assetUpdates, [
    {
      where: { id: "component-1" },
      data: {
        currentLocationId: "loc-new",
        custodianId: null,
        updatedBy: "user-1",
      },
    },
  ])

  const movementCall = calls.assetMovementCreateMany[0] as { data: Array<Record<string, unknown>> }
  assert.equal(movementCall.data.length, 1)
  assert.deepEqual(movementCall.data[0], {
    assetId: "component-1",
    movementType: "parent_sync",
    fromValue: JSON.stringify({ currentLocationId: "loc-old", custodianId: "emp-old" }),
    toValue: JSON.stringify({ currentLocationId: "loc-new", custodianId: null }),
    reason: "Parent asset changed",
    referenceType: "asset",
    referenceId: "parent-1",
    performedBy: "user-1",
    remark: "sync remark",
  })
  assert.equal("updatedBy" in (JSON.parse(movementCall.data[0].toValue as string) as Record<string, unknown>), false)
})

test("syncInstalledComponentsWithParent dedupes restrictToAssetIds in the query filter", async () => {
  const { tx, calls } = makeFakeTx()

  await syncInstalledComponentsWithParent(
    tx,
    makeSyncInput({ restrictToAssetIds: ["component-1", "component-1", "component-2"] })
  )

  const findCall = calls.assetComponentFindMany[0] as { where: { componentAssetId?: { in: string[] } } }
  assert.deepEqual(findCall.where.componentAssetId, { in: ["component-1", "component-2"] })
})

test("syncInstalledComponentsWithParent processes duplicate installed links once", async () => {
  const { tx, calls } = makeFakeTx({
    links: [
      { componentAssetId: "component-1", componentAsset: snapshot },
      { componentAssetId: "component-1", componentAsset: snapshot },
    ],
  })

  const result = await syncInstalledComponentsWithParent(tx, makeSyncInput())

  assert.deepEqual(result, { updated: 1, skipped: 0, movements: 1 })
  assert.equal(calls.assetUpdates.length, 1)
  assert.equal(calls.assetMovementCreateMany.length, 1)

  const checkoutCall = calls.assetCheckoutFindMany[0] as { where: { assetId: { in: string[] } } }
  assert.deepEqual(checkoutCall.where.assetId.in, ["component-1"])
})
