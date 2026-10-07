import assert from "node:assert/strict"
import test from "node:test"

import {
  applyScanResult,
  buildCheckDefaults,
  diffCheckValues,
  expectedCheckValues,
  getCheckMode,
  getLatestValueNotes,
  mergeStatusUpdates,
  requiresCheckPhoto,
  suggestDepartmentForCustodian,
  toScanPayloadValues,
  type AuditScanItemRow,
} from "../src/lib/audit-scan-session.ts"
import { loadQueuedAuditScansAsync, upsertQueuedAuditScanAsync, type AuditOfflineQueueStorage, type QueuedAuditScan } from "../src/lib/audit-offline-queue.ts"

function row(overrides: Partial<AuditScanItemRow> = {}): AuditScanItemRow {
  return {
    itemId: "item-1", assetId: "asset-1", assetTag: "SNI-EQU-21-0102", name: "โน้ตบุ๊ก HP", serialNumber: "5CD123ABC",
    fixedAssetCode: null, categoryId: "cat-1", ownershipType: "personal",
    expectedLocationId: "loc-2", expectedCustodianId: "emp-1", expectedDepartmentId: "dept-1", expectedConditionId: "cond-good",
    actualLocationId: null, actualCustodianId: null, actualDepartmentId: null, actualConditionId: null,
    auditStatus: "pending", auditResult: null, lastScanAt: null, scannedByName: null,
    currentLocationId: "loc-2", currentCustodianId: "emp-1", currentDepartmentId: "dept-1", componentCount: 0,
    ...overrides,
  }
}
const inRoomOne = { locationId: "loc-1", departmentId: "" }
const noRoom = { locationId: "", departmentId: "" }

test("pending and not-found items are new checks; anything already saved opens as an edit", () => {
  assert.equal(getCheckMode(row()), "scan")
  assert.equal(getCheckMode(row({ auditStatus: "reviewed", auditResult: "not_found" })), "scan")
  assert.equal(getCheckMode(row({ auditStatus: "scanned", auditResult: "found" })), "edit")
  assert.equal(getCheckMode(row({ auditStatus: "reviewed", auditResult: "out_of_scope" })), "edit")
})

test("a new check fills the current room as the location and nothing else", () => {
  assert.deepEqual(buildCheckDefaults({ mode: "scan", item: row(), room: inRoomOne }), { location: "loc-1", custodian: "emp-1", department: "dept-1", condition: "cond-good" })
  assert.deepEqual(buildCheckDefaults({ mode: "scan", item: row(), room: noRoom }), expectedCheckValues(row()))
})

test("editing a saved result keeps the saved values even when standing in another room", () => {
  const saved = row({ auditStatus: "scanned", auditResult: "wrong_location", actualLocationId: "loc-3", actualCustodianId: null, actualDepartmentId: "dept-1", actualConditionId: "cond-good" })
  assert.deepEqual(buildCheckDefaults({ mode: "edit", item: saved, room: inRoomOne }), { location: "loc-3", custodian: "", department: "dept-1", condition: "cond-good" })
})

test("out-of-scope checks start from the register values with the current room as location", () => {
  const master = { locationId: "loc-9", custodianId: null, departmentId: "dept-4", conditionId: "cond-fair" }
  assert.deepEqual(buildCheckDefaults({ mode: "out_of_scope", master, room: inRoomOne }), { location: "loc-1", custodian: "", department: "dept-4", condition: "cond-fair" })
  assert.deepEqual(buildCheckDefaults({ mode: "out_of_scope", master, room: noRoom }).location, "loc-9")
})

test("mismatches mirror the server rules for ownership types", () => {
  const expected = expectedCheckValues(row())
  const values = { location: "loc-1", custodian: "emp-2", department: "dept-2", condition: "cond-poor" }
  assert.deepEqual(diffCheckValues(values, expected, "personal"), ["location", "custodian", "department", "condition"])
  assert.deepEqual(diffCheckValues(values, expected, "shared"), ["location", "department", "condition"])
  assert.deepEqual(diffCheckValues(values, expected, "software_license"), ["department", "condition"])
  assert.deepEqual(diffCheckValues(expected, expected, "personal"), [])
})

test("photos are required for a condition change, and for any out-of-scope difference", () => {
  assert.equal(requiresCheckPhoto("scan", ["location", "custodian"]), false)
  assert.equal(requiresCheckPhoto("edit", ["condition"]), true)
  assert.equal(requiresCheckPhoto("out_of_scope", ["department"]), true)
  assert.equal(requiresCheckPhoto("out_of_scope", []), false)
})

test("picking a custodian suggests that employee's department", () => {
  const employees = [{ id: "emp-1", label: "E1", departmentId: "dept-1" }, { id: "emp-2", label: "E2", departmentId: null }]
  assert.equal(suggestDepartmentForCustodian(employees, "emp-1"), "dept-1")
  assert.equal(suggestDepartmentForCustodian(employees, "emp-2"), null)
  assert.equal(suggestDepartmentForCustodian(employees, ""), null)
})

test("latest register values that moved after the round started are noted", () => {
  assert.deepEqual(getLatestValueNotes(row()), {})
  assert.deepEqual(getLatestValueNotes(row({ currentLocationId: "loc-1", currentCustodianId: null })), { location: "loc-1", custodian: "" })
})

test("payload values send null for empty selections", () => {
  assert.deepEqual(toScanPayloadValues({ location: "loc-1", custodian: "", department: "dept-1", condition: "" }), {
    actualLocationId: "loc-1", actualCustodianId: null, actualDepartmentId: "dept-1", actualConditionId: null,
  })
})

test("a save result updates only its row, and status updates replace or add rows", () => {
  const items = [row(), row({ itemId: "item-2", assetId: "asset-2" })]
  const saved = applyScanResult(items, {
    item: { id: "item-1", auditStatus: "scanned", auditResult: "wrong_location", actualLocationId: "loc-1", actualCustodianId: "emp-1", actualDepartmentId: "dept-1", actualConditionId: "cond-good", lastScanAt: new Date("2026-10-07T05:00:00Z") },
    scannedByName: "สมชาย",
  })
  assert.equal(saved[0].auditStatus, "scanned")
  assert.equal(saved[0].lastScanAt, "2026-10-07T05:00:00.000Z")
  assert.equal(saved[0].scannedByName, "สมชาย")
  assert.equal(saved[1], items[1])

  const merged = mergeStatusUpdates(saved, [row({ itemId: "item-2", assetId: "asset-2", auditStatus: "scanned", auditResult: "found" }), row({ itemId: "item-9", assetId: "asset-9" })])
  assert.deepEqual(merged.map((item) => [item.itemId, item.auditStatus]), [["item-1", "scanned"], ["item-2", "scanned"], ["item-9", "pending"]])
})

function memoryQueueStorage(): AuditOfflineQueueStorage {
  const store = new Map<string, QueuedAuditScan[]>()
  return {
    getQueue: async (key) => store.get(key) ?? [],
    setQueue: async (key, value) => { store.set(key, value) },
    removeQueue: async (key) => { store.delete(key) },
  }
}
const queuePayload = { assetId: "asset-1", actualLocationId: "loc-1", actualCustodianId: null, actualDepartmentId: null, actualConditionId: null, scanSource: "manual" as const, applyCorrections: false, resultCorrection: false, remark: null }

test("the offline queue keeps one entry per asset, the newest", async () => {
  const storage = memoryQueueStorage()
  const payload = queuePayload

  await upsertQueuedAuditScanAsync(storage, "round-1", payload, { now: new Date("2026-10-07T01:00:00Z") })
  await upsertQueuedAuditScanAsync(storage, "round-1", { ...payload, actualLocationId: "loc-2" }, { now: new Date("2026-10-07T01:05:00Z") })
  await upsertQueuedAuditScanAsync(storage, "round-1", { ...payload, assetId: "asset-2" }, { now: new Date("2026-10-07T01:06:00Z") })

  const queue = await loadQueuedAuditScansAsync(storage, "round-1")
  assert.deepEqual(queue.map((entry) => [entry.assetId, entry.actualLocationId]), [["asset-1", "loc-2"], ["asset-2", "loc-1"]])
})

test("a newer offline save for the same asset keeps the photos already queued", async () => {
  const storage = memoryQueueStorage()
  const photo = (id: string) => ({ id, label: id, fileName: `${id}.jpg`, fileType: "image/jpeg", fileSize: 3, blob: new Blob(["abc"]) })

  await upsertQueuedAuditScanAsync(storage, "round-1", queuePayload, { photos: [photo("p1")], now: new Date("2026-10-07T01:00:00Z") })
  await upsertQueuedAuditScanAsync(storage, "round-1", { ...queuePayload, actualLocationId: "loc-2", actualConditionId: "cond-poor" }, { photos: [photo("p2")], now: new Date("2026-10-07T01:05:00Z") })

  const queue = await loadQueuedAuditScansAsync(storage, "round-1")
  assert.equal(queue.length, 1)
  assert.equal(queue[0].assetId, "asset-1")
  assert.deepEqual(queue[0].photos?.map((entry) => entry.id), ["p1", "p2"])
  assert.equal(queue[0].actualLocationId, "loc-2")
  assert.equal(queue[0].actualConditionId, "cond-poor")
  assert.equal(queue[0].queuedAt, "2026-10-07T01:05:00.000Z")
})
