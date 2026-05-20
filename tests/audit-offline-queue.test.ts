import assert from "node:assert/strict"
import test from "node:test"

import {
  addQueuedAuditScan,
  createAuditOfflineQueueKey,
  loadQueuedAuditScans,
  removeQueuedAuditScan,
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
      remark: "offline",
    },
    new Date("2026-05-20T10:00:00.000Z")
  )

  assert.equal(createAuditOfflineQueueKey(roundId), "audit-offline-scan:round-1")
  assert.deepEqual(loadQueuedAuditScans(storage, roundId), [queued])
  removeQueuedAuditScan(storage, roundId, queued.id)
  assert.deepEqual(loadQueuedAuditScans(storage, roundId), [])
})
