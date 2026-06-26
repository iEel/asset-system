import assert from "node:assert/strict"
import test from "node:test"

import {
  addQueuedAuditScan,
  addQueuedAuditScanAsync,
  createAuditOfflineQueueKey,
  loadQueuedAuditScans,
  loadQueuedAuditScansAsync,
  removeQueuedAuditScan,
  removeQueuedAuditScanAsync,
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
