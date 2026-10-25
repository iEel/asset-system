import assert from "node:assert/strict"
import test from "node:test"

import {
  addQueuedAuditScan,
  addQueuedAuditScanAsync,
  canSendQueuedAuditScan,
  createAuditOfflineQueueKey,
  loadQueuedAuditScans,
  loadQueuedAuditScansAsync,
  removeQueuedAuditScan,
  removeQueuedAuditScanAsync,
  summarizeHeldAuditScans,
  upsertQueuedAuditScanAsync,
} from "../src/lib/audit-offline-queue.ts"

class MemoryStorage {
  private values = new Map<string, string>()

  getItem(key: string) {
    return this.values.get(key) ?? null
  }

  setItem(key: string, value: string) {
    this.values.set(key, value)
  }

  removeItem(key: string) {
    this.values.delete(key)
  }
}

class AsyncMemoryQueueStorage {
  private values = new Map<string, unknown>()

  async getQueue(key: string) {
    return (this.values.get(key) as unknown[] | undefined) ?? []
  }

  async setQueue(key: string, value: unknown[]) {
    this.values.set(key, value)
  }

  async removeQueue(key: string) {
    this.values.delete(key)
  }
}

test("stores and removes queued audit scans by round", () => {
  const storage = new MemoryStorage()
  const roundId = "round-1"
  const queued = addQueuedAuditScan(
    storage,
    roundId,
    {
      assetId: "asset-1",
      actualLocationId: "loc-1",
      actualCustodianId: null,
      actualDepartmentId: null,
      actualConditionId: "cond-1",
      scanSource: "qr",
      applyCorrections: false,
      resultCorrection: false,
      remark: "offline",
    },
    new Date("2026-05-20T10:00:00.000Z")
  )

  assert.equal(createAuditOfflineQueueKey(roundId), "audit-offline-scan:round-1")
  assert.deepEqual(loadQueuedAuditScans(storage, roundId), [queued])
  removeQueuedAuditScan(storage, roundId, queued.id)
  assert.deepEqual(loadQueuedAuditScans(storage, roundId), [])
})

test("stores queued audit scans with photo evidence and sync status in async storage", async () => {
  const storage = new AsyncMemoryQueueStorage()
  const roundId = "round-2"
  const queued = await addQueuedAuditScanAsync(
    storage,
    roundId,
    {
      assetId: "asset-2",
      actualLocationId: "loc-2",
      actualCustodianId: "emp-1",
      actualDepartmentId: "dept-1",
      actualConditionId: "cond-2",
      scanSource: "manual",
      applyCorrections: true,
      resultCorrection: true,
      remark: "with photos",
    },
    {
      photos: [
        {
          id: "photo-1",
          label: "ด้านหน้า",
          fileName: "front.jpg",
          fileType: "image/jpeg",
          fileSize: 1234,
          blob: new Blob(["front"], { type: "image/jpeg" }),
        },
      ],
      now: new Date("2026-05-20T11:00:00.000Z"),
    }
  )

  assert.equal(queued.syncStatus, "pending")
  const queuedPhotos = queued.photos
  assert.ok(queuedPhotos)
  assert.equal(queuedPhotos.length, 1)
  assert.equal(queuedPhotos[0].fileName, "front.jpg")
  assert.deepEqual(await loadQueuedAuditScansAsync(storage, roundId), [queued])

  await removeQueuedAuditScanAsync(storage, roundId, queued.id)
  assert.deepEqual(await loadQueuedAuditScansAsync(storage, roundId), [])
})

const payload = (assetId: string) => ({ assetId, actualLocationId: null, actualCustodianId: null, actualDepartmentId: null, actualConditionId: null, scanSource: "manual" as const, applyCorrections: false, resultCorrection: false, remark: null })
const photo = (id: string) => ({ id, label: id, fileName: `${id}.jpg`, fileType: "image/jpeg", fileSize: 1, blob: new Blob([id]) })
const somchai = { id: "user-1", name: "สมชาย" }, somying = { id: "user-2", name: "สมหญิง" }
test("a queued check records who scanned it, and only that person's session sends it", async () => {
  const storage = new AsyncMemoryQueueStorage()
  const queued = await upsertQueuedAuditScanAsync(storage, "round-3", payload("asset-1"), { queuedBy: somchai, now: new Date("2026-10-21T01:00:00.000Z") })
  assert.equal(queued.userId, "user-1"); assert.equal(queued.userName, "สมชาย")
  assert.equal(canSendQueuedAuditScan(queued, "user-1"), true); assert.equal(canSendQueuedAuditScan(queued, "user-2"), false)
  assert.equal(canSendQueuedAuditScan({ userId: undefined }, "user-2"), true) // queued before the binding
  assert.equal(canSendQueuedAuditScan({ userId: null }, "user-2"), true)
})
test("a newer save replaces only the same person's entry for that asset", async () => {
  const storage = new AsyncMemoryQueueStorage(); const now = new Date("2026-10-21T01:00:00.000Z")
  await upsertQueuedAuditScanAsync(storage, "round-4", payload("asset-1"), { queuedBy: somchai, photos: [photo("p1")], now })
  await upsertQueuedAuditScanAsync(storage, "round-4", payload("asset-1"), { queuedBy: somying, photos: [photo("p2")], now })
  await upsertQueuedAuditScanAsync(storage, "round-4", payload("asset-1"), { queuedBy: somchai, photos: [photo("p3")], now })
  const queue = await loadQueuedAuditScansAsync(storage, "round-4")
  assert.deepEqual(queue.map((entry) => [entry.userId, entry.photos?.map((p) => p.id)]), [["user-2", ["p2"]], ["user-1", ["p1", "p3"]]])
  assert.equal(new Set(queue.map((entry) => entry.id)).size, 2)
})
test("held checks are counted per person who scanned them, in first-seen order", () => {
  const entry = (assetId: string, userId?: string, userName?: string) => ({ ...payload(assetId), id: assetId, queuedAt: "2026-10-21T01:00:00.000Z", userId, userName })
  const queue = [entry("a1", "user-1", "สมชาย"), entry("a2", "user-2", "สมหญิง"), entry("a3"), entry("a4", "user-3", "มานี"), entry("a5", "user-2", "สมหญิง")]
  assert.deepEqual(summarizeHeldAuditScans(queue, "user-1"), [{ userId: "user-2", name: "สมหญิง", count: 2 }, { userId: "user-3", name: "มานี", count: 1 }])
  assert.deepEqual(summarizeHeldAuditScans(queue, "user-2"), [{ userId: "user-1", name: "สมชาย", count: 1 }, { userId: "user-3", name: "มานี", count: 1 }])
  assert.deepEqual(summarizeHeldAuditScans([entry("a6", "user-9")], "user-1"), [{ userId: "user-9", name: "user-9", count: 1 }])
})
