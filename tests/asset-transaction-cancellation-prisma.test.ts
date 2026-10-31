import assert from "node:assert/strict"
import test from "node:test"
import { createPrismaAssetTransactionCancellationRepository } from "../src/lib/asset-transaction-cancellation-prisma.ts"
import { cancelAssetTransaction } from "../src/lib/asset-transaction-cancellation-service.ts"
import {
  createAssetTransactionSnapshot,
  createComponentLinkTransactionSnapshot,
  serializeAssetTransactionSnapshot,
} from "../src/lib/asset-transaction-snapshot.ts"

// The RT- of group 3 spec §8.5 as the checkin route writes it: dock-1 came back (a sync entry), mouse-1 did not (its
// link outstanding, its holder moved to the manager who returned), bag-1 did not either and has two installed links
// under the laptop (GP X1: both turn outstanding, one snapshot entry).
const BEFORE = new Date("2026-10-20T03:00:00.000Z")
const SAVED = new Date("2026-10-25T03:00:00.500Z")
const LATER = new Date("2026-10-28T03:00:00.000Z")
const RT_CREATED = new Date("2026-10-25T03:00:00.000Z")
const RT_UPDATED = new Date("2026-10-25T03:00:01.000Z")

type LinkRow = {
  id: string; parentAssetId: string; componentAssetId: string; status: string; removedAt: Date | null
  referenceType: string | null; referenceId: string | null; updatedAt: Date; updatedBy?: string
}
type AssetRow = {
  id: string; updatedAt: Date; statusId: string; conditionId: string; branchId: string; currentLocationId: string
  custodianId: string | null; departmentId: string | null
}
type World = {
  assets: Record<string, AssetRow>
  links: LinkRow[]
  checkoutReturned: boolean
  rtStatus: string
  movements: Array<{ assetId: string; movementType: string; referenceType: string | null; referenceId: string | null; performedAt: Date }>
  calls: string[]
  linkWrites: Array<{ where: Record<string, unknown>; data: Record<string, unknown> }>
  failLinkRestore: boolean
  document: { beforeSnapshotJson: string; afterSnapshotJson: string }
}

const asset = (id: string, fields: Partial<AssetRow>): AssetRow => ({
  id, updatedAt: SAVED, statusId: "status-ready", conditionId: "cond-good", branchId: "branch-1", currentLocationId: "loc-it",
  custodianId: null, departmentId: "dept-it", ...fields,
})
const link = (id: string, componentAssetId: string, fields: Partial<LinkRow> = {}): LinkRow => ({
  id, parentAssetId: "laptop-1", componentAssetId, status: "outstanding", removedAt: null, referenceType: "checkin", referenceId: "rt-1",
  updatedAt: SAVED, ...fields,
})
const held = { currentLocationId: "loc-desk", custodianId: "emp-holder", departmentId: "dept-sales", updatedAt: BEFORE }

function savedWorld(options: { outstanding: boolean } = { outstanding: true }): World {
  const before = {
    laptop: asset("laptop-1", { ...held, statusId: "status-checked-out" }),
    dock: asset("dock-1", held),
    mouse: asset("mouse-1", held),
    bag: asset("bag-1", held),
  }
  const after = {
    laptop: asset("laptop-1", {}),
    dock: asset("dock-1", {}),
    mouse: asset("mouse-1", { currentLocationId: "loc-desk", custodianId: "emp-manager", departmentId: "dept-hr" }),
    bag: asset("bag-1", { currentLocationId: "loc-desk", custodianId: "emp-manager", departmentId: "dept-hr" }),
  }
  const dockLink = link("link-dock", "dock-1", { status: "installed", referenceType: null, referenceId: null, updatedAt: BEFORE })
  const installed = { status: "installed", updatedAt: BEFORE }
  const components = options.outstanding
    ? {
        before: [
          createComponentLinkTransactionSnapshot(dockLink, before.dock),
          createComponentLinkTransactionSnapshot(link("link-mouse", "mouse-1", installed), before.mouse, { referenceType: "purchase", referenceId: "PO-7" }),
          createComponentLinkTransactionSnapshot(link("link-bag-a", "bag-1", installed), before.bag, { referenceType: null, referenceId: null }),
        ],
        after: [
          createComponentLinkTransactionSnapshot(dockLink, after.dock),
          createComponentLinkTransactionSnapshot(link("link-mouse", "mouse-1"), after.mouse),
          createComponentLinkTransactionSnapshot(link("link-bag-a", "bag-1"), after.bag),
        ],
      }
    : { before: [createComponentLinkTransactionSnapshot(dockLink, before.dock)], after: [createComponentLinkTransactionSnapshot(dockLink, after.dock)] }
  return {
    assets: options.outstanding
      ? { "laptop-1": after.laptop, "dock-1": after.dock, "mouse-1": after.mouse, "bag-1": after.bag }
      : { "laptop-1": after.laptop, "dock-1": after.dock },
    links: options.outstanding
      ? [dockLink, link("link-mouse", "mouse-1"), link("link-bag-a", "bag-1"), link("link-bag-b", "bag-1")]
      : [dockLink],
    checkoutReturned: true,
    rtStatus: "active",
    movements: [],
    calls: [],
    linkWrites: [],
    failLinkRestore: false,
    document: {
      beforeSnapshotJson: serializeAssetTransactionSnapshot(createAssetTransactionSnapshot({
        asset: before.laptop, checkout: { id: "co-1", isReturned: false }, components: components.before,
      })),
      afterSnapshotJson: serializeAssetTransactionSnapshot(createAssetTransactionSnapshot({
        asset: after.laptop, checkout: { id: "co-1", isReturned: true }, components: components.after,
      })),
    },
  }
}

// Each where key is an equality, a Date, { in } or { not }.
function matches(row: Record<string, unknown>, where: Record<string, unknown>): boolean {
  return Object.entries(where).every(([key, condition]) => {
    const value = row[key]
    if (condition instanceof Date) return value instanceof Date && value.getTime() === condition.getTime()
    if (condition && typeof condition === "object") {
      if ("in" in condition) return (condition.in as unknown[]).includes(value)
      if ("not" in condition) return value !== condition.not
    }
    return value === condition
  })
}

// Only the calls the repository makes; anything else is undefined and throws, so a new query shows up here.
function fakeDb(world: World) {
  const later = (date: Date) => new Date(date.getTime() + 60_000)
  const db = {
    $transaction: async (work: (tx: unknown) => Promise<unknown>) => work(db),
    assetCheckin: {
      findUnique: async () => ({
        id: "rt-1", assetId: "laptop-1", transactionStatus: world.rtStatus, createdAt: RT_CREATED, updatedAt: RT_UPDATED,
        voidedAt: null, checkoutId: "co-1", ...world.document,
      }),
      count: async () => 0,
      updateMany: async () => {
        world.calls.push("assetCheckin.updateMany")
        world.rtStatus = "void"
        return { count: 1 }
      },
    },
    asset: {
      findUnique: async ({ where }: { where: { id: string } }) => world.assets[where.id] ?? null,
      updateMany: async ({ where, data }: { where: Record<string, unknown>; data: Record<string, unknown> }) => {
        world.calls.push("asset.updateMany")
        const row = world.assets[where.id as string]
        if (!row || !matches(row, where)) return { count: 0 }
        const fields = { ...data }
        delete fields.updatedBy
        Object.assign(row, fields, { updatedAt: later(row.updatedAt) })
        return { count: 1 }
      },
    },
    assetComponent: {
      findMany: async ({ where }: { where: Record<string, unknown> }) =>
        world.links.filter((row) => matches(row, where)).map((row) => ({ ...row, componentAsset: world.assets[row.componentAssetId] })),
      updateMany: async ({ where, data }: { where: Record<string, unknown>; data: Record<string, unknown> }) => {
        world.calls.push("assetComponent.updateMany")
        world.linkWrites.push({ where, data })
        if (world.failLinkRestore) return { count: 0 }
        const rows = world.links.filter((row) => matches(row, where))
        for (const row of rows) Object.assign(row, data, { updatedAt: later(row.updatedAt) })
        return { count: rows.length }
      },
    },
    assetCheckout: {
      findUnique: async () => ({ id: "co-1", isReturned: world.checkoutReturned }),
      count: async () => 0,
      updateMany: async () => {
        world.checkoutReturned = false
        return { count: 1 }
      },
    },
    assetTransfer: { count: async () => 0 },
    assetMovement: {
      findMany: async ({ where }: { where: { assetId: string; performedAt: { gt: Date }; NOT: { referenceType: string; referenceId: string } } }) =>
        world.movements.filter((row) => row.assetId === where.assetId && row.performedAt > where.performedAt.gt
          && !(row.referenceType === where.NOT.referenceType && row.referenceId === where.NOT.referenceId)),
      create: async () => ({ id: "movement-cancel" }),
    },
    systemLog: { create: async () => ({}) },
    assetStateReview: {
      findFirst: async () => null,
      create: async () => ({ id: "review-1" }),
    },
  }
  return db
}

const cancel = (world: World) => cancelAssetTransaction(
  { type: "checkin", transactionId: "rt-1", userId: "user-9", reason: "บันทึกผิดคน", expectedUpdatedAt: RT_UPDATED.toISOString() },
  createPrismaAssetTransactionCancellationRepository(fakeDb(world) as never),
)
const linkState = (world: World, id: string) => {
  const row = world.links.find((candidate) => candidate.id === id)!
  return { status: row.status, referenceType: row.referenceType, referenceId: row.referenceId, updatedBy: row.updatedBy ?? null }
}
const holder = (world: World, id: string) => {
  const row = world.assets[id]
  return [row.currentLocationId, row.custodianId, row.departmentId]
}

test("cancelling an RT- puts every outstanding link back to installed with its own reference, both duplicate links included, and the components back with their holder (group 3 spec §8.5, P2-R6, GP X1)", async () => {
  const world = savedWorld()
  const result = await cancel(world)

  assert.equal(result.status, "cancelled", JSON.stringify(result))
  const restored = { status: "installed", referenceType: "purchase", referenceId: "PO-7", updatedBy: "user-9" }
  assert.deepEqual(world.linkWrites.slice(0, 2), [
    { where: { id: "link-mouse", status: "outstanding", referenceType: "checkin", referenceId: "rt-1", removedAt: null, updatedAt: SAVED }, data: restored },
    { where: { id: { not: "link-mouse" }, parentAssetId: "laptop-1", componentAssetId: "mouse-1", status: "outstanding", referenceType: "checkin", referenceId: "rt-1", removedAt: null }, data: restored },
  ], "the snapshot link behind the after entry's updatedAt, then its duplicates")
  assert.deepEqual(linkState(world, "link-mouse"), { status: "installed", referenceType: "purchase", referenceId: "PO-7", updatedBy: "user-9" })
  assert.deepEqual(linkState(world, "link-bag-a"), { status: "installed", referenceType: null, referenceId: null, updatedBy: "user-9" })
  assert.deepEqual(linkState(world, "link-bag-b"), { status: "installed", referenceType: null, referenceId: null, updatedBy: "user-9" })
  assert.deepEqual(linkState(world, "link-dock"), { status: "installed", referenceType: null, referenceId: null, updatedBy: null }, "a returned component's link is not written")
  for (const id of ["dock-1", "mouse-1", "bag-1", "laptop-1"]) assert.deepEqual(holder(world, id), ["loc-desk", "emp-holder", "dept-sales"], id)
  assert.equal(world.checkoutReturned, false)
  assert.equal(world.rtStatus, "void")
})

test("an RT- whose components all came back cancels as before and writes no link", async () => {
  const world = savedWorld({ outstanding: false })
  assert.equal((await cancel(world)).status, "cancelled")
  assert.equal(world.calls.includes("assetComponent.updateMany"), false)
})

test("a link that changed after the check refuses the cancel as stale, before the RT- is voided (P2-R6)", async () => {
  const world = savedWorld()
  world.failLinkRestore = true
  await assert.rejects(cancel(world), { code: "TRANSACTION_STALE" })
  assert.equal(world.calls.includes("assetCheckin.updateMany"), false)
})

test("after a late return the RT- cannot be cancelled: its link changed (components_changed), and the late return's lines on the parent are not downstream work (GP X2)", async () => {
  // Stand alone (a fake of T5's route): the link ends, the component goes to IT stock, the parent gets component_remove referencing the RT-.
  const standalone = savedWorld()
  Object.assign(standalone.links.find((row) => row.id === "link-mouse")!, { status: "removed", removedAt: LATER, updatedAt: LATER })
  Object.assign(standalone.assets["mouse-1"], { currentLocationId: "loc-it", custodianId: null, departmentId: "dept-it", updatedAt: LATER })
  standalone.movements.push({ assetId: "laptop-1", movementType: "component_remove", referenceType: "checkin", referenceId: "rt-1", performedAt: LATER })
  assert.deepEqual(await cancel(standalone), { status: "blocked", reviewId: "review-1", reasons: ["components_changed"] })

  // Re-attached (a fake of T5's route): the link is installed again and the parent row was claimed.
  const reattached = savedWorld()
  Object.assign(reattached.links.find((row) => row.id === "link-mouse")!, { status: "installed", updatedAt: LATER })
  Object.assign(reattached.assets["mouse-1"], { currentLocationId: "loc-it", custodianId: null, departmentId: "dept-it", updatedAt: LATER })
  reattached.assets["laptop-1"].updatedAt = LATER
  reattached.movements.push({ assetId: "laptop-1", movementType: "component_install", referenceType: "checkin", referenceId: "rt-1", performedAt: LATER })
  const blocked = await cancel(reattached)
  assert.equal(blocked.status, "blocked")
  assert.ok("reasons" in blocked && blocked.reasons.includes("components_changed"))
  assert.ok("reasons" in blocked && !blocked.reasons.includes("downstream_work"))

  for (const world of [standalone, reattached]) {
    assert.equal(world.calls.includes("assetComponent.updateMany"), false)
    assert.equal(world.rtStatus, "active")
  }
})
