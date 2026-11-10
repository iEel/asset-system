import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import test from "node:test"

import { toAuditScanItemRow, type AuditScanItemRecord } from "../src/lib/audit-scan-rows.ts"
import { auditScanRowFromRecordedFind, normalizeAuditLookupComponents, normalizeAuditLookupInstalledIn } from "../src/components/audit/audit-scan-helpers.ts"
import type { AuditLookupAsset, AuditLookupRecordedFind } from "../src/components/audit/audit-scan-types.ts"

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
    modelId: "model-1",
  },
}

test("an audit item record becomes a scan row with names, counts and ISO times", () => {
  const row = toAuditScanItemRow(record, {
    userNames: new Map([["user-7", "วิไล"]]),
    componentCounts: new Map([["asset-1", 2]]),
    photos: new Map(),
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
  const row = toAuditScanItemRow({ ...record, scannedBy: null, lastScanAt: null }, { userNames: new Map(), componentCounts: new Map(), photos: new Map() })

  assert.equal(row.scannedByName, null)
  assert.equal(row.lastScanAt, null)
  assert.equal(row.componentCount, 0)
})

// Audit photos plan 1 task 4 (spec §3): every scan-page row, lookup asset, component and installed-in parent carries
// the asset's photo, read once per load, never per row.
test("toAuditScanItemRow sets photo from the photos map, null when absent", () => {
  const lookups = { userNames: new Map<string, string>(), componentCounts: new Map<string, number>() }
  const photo = { attachmentId: "att-1", fromModel: true }
  assert.deepEqual(toAuditScanItemRow(record, { ...lookups, photos: new Map([["asset-1", photo]]) }).photo, photo)
  assert.equal(toAuditScanItemRow(record, { ...lookups, photos: new Map() }).photo, null)
})

test("normalizeAuditLookupComponents and normalizeAuditLookupInstalledIn keep photo", () => {
  const photo = { attachmentId: "att-2", fromModel: false }
  const [component] = normalizeAuditLookupComponents([
    { assetId: "c-1", assetTag: "CMP-1", name: "RAM", componentRole: "memory", slotNo: null, auditItem: null, photo },
  ])
  assert.deepEqual(component.photo, photo)
  const [withoutPhoto] = normalizeAuditLookupComponents([
    { assetId: "c-2", assetTag: "CMP-2", name: "SSD", componentRole: "storage", slotNo: null, auditItem: null, photo: null },
  ])
  assert.equal(withoutPhoto.photo, null)
  const [parent] = normalizeAuditLookupInstalledIn([
    { parentAssetId: "p-1", assetTag: "PC-1", name: "PC", componentRole: "memory", slotNo: "A1", auditItem: null, photo },
  ])
  assert.deepEqual(parent.photo, photo)
})

test("auditScanRowFromRecordedFind takes the lookup asset's photo", () => {
  const item: AuditLookupRecordedFind = {
    id: "item-x1", assetId: "asset-x1", auditStatus: "scanned", auditResult: "out_of_scope",
    expectedLocationId: "loc-1", expectedCustodianId: null, expectedDepartmentId: null, expectedConditionId: null,
    actualLocationId: null, actualCustodianId: null, actualDepartmentId: null, actualConditionId: null,
  }
  const asset = {
    id: "asset-x1", assetTag: "T-1", title: "T-1", subtitle: "Notebook", serialNumber: null,
    currentLocationId: "loc-1", custodianId: null, departmentId: null, conditionId: null,
    meta: { location: "", custodian: null }, components: [], installedIn: [],
    photo: { attachmentId: "att-3", fromModel: true },
  } as AuditLookupAsset
  assert.deepEqual(auditScanRowFromRecordedFind(item, asset).photo, { attachmentId: "att-3", fromModel: true })
  assert.equal(auditScanRowFromRecordedFind(item, { ...asset, photo: null }).photo, null)
})

test("loadAuditScanRows and the lookup route read photos once each, never inside a .map(", () => {
  const read = (path: string) => readFileSync(path, "utf8").replace(/\r\n/g, "\n")
  for (const path of ["src/lib/audit-scan-data.ts", "src/app/api/audit-rounds/[id]/scan-lookup/route.ts"]) {
    const source = read(path)
    assert.equal(source.match(/readAuditScanPhotos\(/g)?.length, 1, `${path} calls readAuditScanPhotos once`)
    assert.doesNotMatch(source, /\.map\([^)]*=>[^\n]*readAuditScanPhotos\(/, `${path} never reads photos per row`)
    assert.doesNotMatch(source, /\.map\(\s*async/, `${path} never maps rows to reads`)
  }
  const data = read("src/lib/audit-scan-data.ts")
  assert.match(data, /export async function loadAuditScanRows\(roundId: string, options: \{ since\?: Date; photoAccess: AuditScanPhotoAccess \}\)/)
  assert.match(data, /asset: \{\n\s+select: \{[\s\S]*?modelId: true,/)
})
