import assert from "node:assert/strict"
import test from "node:test"

import { toAuditScanItemRow, type AuditScanItemRecord } from "../src/lib/audit-scan-rows.ts"

const record: AuditScanItemRecord = {
  id: "item-1",
  assetId: "asset-1",
  auditStatus: "scanned",
  auditResult: "wrong_location",
  expectedLocationId: "loc-2",
  expectedCustodianId: "emp-1",
  expectedDepartmentId: null,
  expectedConditionId: "cond-good",
  actualLocationId: "loc-1",
  actualCustodianId: "emp-1",
  actualDepartmentId: null,
  actualConditionId: "cond-good",
  lastScanAt: new Date("2026-10-07T03:42:00Z"),
  scannedBy: "user-7",
  asset: {
    assetTag: "SNI-EQU-21-0102",
    name: "โน้ตบุ๊ก HP",
    serialNumber: "5CD123ABC",
    fixedAssetCode: null,
    categoryId: "cat-1",
    ownershipType: "personal",
    currentLocationId: "loc-1",
    custodianId: "emp-1",
    departmentId: "dept-1",
  },
}

test("an audit item record becomes a scan row with names, counts and ISO times", () => {
  const row = toAuditScanItemRow(record, {
    userNames: new Map([["user-7", "วิไล"]]),
    componentCounts: new Map([["asset-1", 2]]),
  })

  assert.equal(row.itemId, "item-1")
  assert.equal(row.assetTag, "SNI-EQU-21-0102")
  assert.equal(row.lastScanAt, "2026-10-07T03:42:00.000Z")
  assert.equal(row.scannedByName, "วิไล")
  assert.equal(row.componentCount, 2)
  assert.equal(row.currentLocationId, "loc-1")
  assert.equal(row.currentDepartmentId, "dept-1")
})

test("missing names and counts fall back to null and zero", () => {
  const row = toAuditScanItemRow({ ...record, scannedBy: null, lastScanAt: null }, { userNames: new Map(), componentCounts: new Map() })

  assert.equal(row.scannedByName, null)
  assert.equal(row.lastScanAt, null)
  assert.equal(row.componentCount, 0)
})
