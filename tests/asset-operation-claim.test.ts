import assert from "node:assert/strict"
import test from "node:test"

import { outstandingLinkWhere } from "../src/lib/asset-component-outstanding.ts"
import {
  AssetComponentOutstandingError, AssetOperationConflictError, assertNoOutstandingComponentLinks, claimAssetForCustodyChange,
  readOutstandingComponentLinks,
} from "../src/lib/asset-operation-claim.ts"

type Call = { model: string; method: string; args: unknown }

function fakeTx(options: { claimedRows: number; activeCheckoutId: string | null }) {
  const calls: Call[] = []
  return {
    calls,
    tx: {
      asset: {
        updateMany: async (args: unknown) => {
          calls.push({ model: "asset", method: "updateMany", args })
          return { count: options.claimedRows }
        },
      },
      assetCheckout: {
        findFirst: async (args: unknown) => {
          calls.push({ model: "assetCheckout", method: "findFirst", args })
          return options.activeCheckoutId ? { id: options.activeCheckoutId } : null
        },
      },
    },
  }
}

test("claims the asset only while it still has the status the request was validated against", async () => {
  const { tx, calls } = fakeTx({ claimedRows: 1, activeCheckoutId: null })

  await claimAssetForCustodyChange(tx, { assetId: "asset-1", expectedStatusId: "status-ready", updatedBy: "user-1" })

  assert.deepEqual(calls[0], {
    model: "asset",
    method: "updateMany",
    args: { where: { id: "asset-1", isActive: true, statusId: "status-ready" }, data: { updatedBy: "user-1" } },
  })
})

test("rejects the second of two concurrent handovers once the first changed the status", async () => {
  const { tx, calls } = fakeTx({ claimedRows: 0, activeCheckoutId: null })

  await assert.rejects(
    claimAssetForCustodyChange(tx, { assetId: "asset-1", expectedStatusId: "status-ready", updatedBy: "user-2" }),
    (error) => error instanceof AssetOperationConflictError && error.code === "ASSET_CHANGED_DURING_OPERATION",
  )
  assert.equal(calls.length, 1, "no further work happens after a failed claim")
})

test("re-checks for an active checkout inside the transaction after claiming", async () => {
  const { tx, calls } = fakeTx({ claimedRows: 1, activeCheckoutId: "checkout-9" })

  await assert.rejects(
    claimAssetForCustodyChange(tx, { assetId: "asset-1", expectedStatusId: "status-in-use", updatedBy: "user-1" }),
    (error) => error instanceof AssetOperationConflictError && error.code === "ASSET_ACTIVE_CHECKOUT_EXISTS",
  )
  assert.deepEqual(calls[1], {
    model: "assetCheckout",
    method: "findFirst",
    args: { where: { assetId: "asset-1", isReturned: false, transactionStatus: "active" }, select: { id: true } },
  })
})

test("an outstanding component refuses a custody save: one read of the given ids' outstanding links, each named once in the order given (group 3 spec §8.5, P2-R17)", async () => {
  const calls: unknown[] = []
  const db = { assetComponent: { findMany: async (args: unknown) => {
    calls.push(args)
    return [{ componentAssetId: "a-2", componentAsset: { assetTag: "TAG-2" } }, { componentAssetId: "a-2", componentAsset: { assetTag: "TAG-2" } }, { componentAssetId: "a-1", componentAsset: { assetTag: "TAG-1" } }]
  } } }
  await assert.rejects(assertNoOutstandingComponentLinks(db, ["a-1", "a-2", "a-3"]), (error) =>
    error instanceof AssetComponentOutstandingError && error.code === "ASSET_COMPONENT_OUTSTANDING" && error.message === "ASSET_COMPONENT_OUTSTANDING"
    && JSON.stringify(error.blocked) === JSON.stringify([{ assetId: "a-1", assetTag: "TAG-1" }, { assetId: "a-2", assetTag: "TAG-2" }]))
  assert.deepEqual(calls, [{ where: { componentAssetId: { in: ["a-1", "a-2", "a-3"] }, ...outstandingLinkWhere }, select: { componentAssetId: true, componentAsset: { select: { assetTag: true } } } }])
  await assertNoOutstandingComponentLinks({ assetComponent: { findMany: async () => [] } }, ["a-1"])
})

test("the outstanding links of the given ids are read once without a throw, each asset named once in the order given (group 3 spec §10.3; P4-R4)", async () => {
  const calls: unknown[] = []
  const rows = [{ componentAssetId: "a-2", componentAsset: { assetTag: "TAG-2" } }, { componentAssetId: "a-2", componentAsset: { assetTag: "TAG-2" } }, { componentAssetId: "a-1", componentAsset: { assetTag: "TAG-1" } }]
  const db = { assetComponent: { findMany: async (args: unknown) => { calls.push(args); return rows } } }
  assert.deepEqual(await readOutstandingComponentLinks(db, ["a-1", "a-2", "a-3"]), [{ assetId: "a-1", assetTag: "TAG-1" }, { assetId: "a-2", assetTag: "TAG-2" }])
  assert.deepEqual(calls, [{ where: { componentAssetId: { in: ["a-1", "a-2", "a-3"] }, ...outstandingLinkWhere }, select: { componentAssetId: true, componentAsset: { select: { assetTag: true } } } }])
  assert.deepEqual(await readOutstandingComponentLinks({ assetComponent: { findMany: async () => [] } }, ["a-1"]), [])
})
