import assert from "node:assert/strict"
import test from "node:test"

import {
  auditScanListPageSize,
  buildRoomList,
  buildRoomOptions,
  getAuditItemBadge,
  isAuditSearchReady,
  searchAuditItems,
  splitSearchHighlight,
  summarizeProgress,
  type AuditScanItemRow,
} from "../src/lib/audit-scan-session.ts"

function row(overrides: Partial<AuditScanItemRow> = {}): AuditScanItemRow {
  return {
    itemId: "item-1",
    assetId: "asset-1",
    assetTag: "SNI-EQU-19-0271",
    name: "โน้ตบุ๊ก Dell Latitude 5420",
    serialNumber: "5CD123ABC",
    fixedAssetCode: "FA-0001",
    categoryId: "cat-1",
    ownershipType: "personal",
    expectedLocationId: "loc-1",
    expectedCustodianId: "emp-1",
    expectedDepartmentId: "dept-1",
    expectedConditionId: "cond-good",
    actualLocationId: null,
    actualCustodianId: null,
    actualDepartmentId: null,
    actualConditionId: null,
    auditStatus: "pending",
    auditResult: null,
    lastScanAt: null,
    scannedByName: null,
    currentLocationId: "loc-1",
    currentCustodianId: "emp-1",
    currentDepartmentId: "dept-1",
    componentCount: 0,
    ...overrides,
  }
}

const items: AuditScanItemRow[] = [
  row({ itemId: "i1", assetId: "a1", assetTag: "SNI-EQU-19-0271", expectedLocationId: "loc-1" }),
  row({ itemId: "i2", assetId: "a2", assetTag: "SNI-EQU-22-0310", name: "จอ Dell P2422H", serialNumber: "CN0X", expectedLocationId: "loc-1", auditStatus: "scanned", auditResult: "found", lastScanAt: "2026-10-07T03:00:00.000Z", scannedByName: "วิไล" }),
  row({ itemId: "i3", assetId: "a3", assetTag: "SNI-EQU-21-0102", name: "โน้ตบุ๊ก HP ProBook", serialNumber: "5CD1XYZ", expectedLocationId: "loc-2", expectedDepartmentId: "dept-2" }),
  row({ itemId: "i4", assetId: "a4", assetTag: "SNI-FUR-18-0084", name: "เก้าอี้", serialNumber: null, expectedLocationId: "loc-2", auditStatus: "scanned", auditResult: "wrong_location", lastScanAt: "2026-10-07T04:00:00.000Z" }),
  row({ itemId: "i5", assetId: "a5", assetTag: "SNI-EQU-26-0016", serialNumber: null, expectedLocationId: "loc-2", auditStatus: "reviewed", auditResult: "not_found" }),
]
const labels = new Map([["loc-1", "SNI_FL1 - ห้อง IT"], ["loc-2", "SNI_FL2 - บัญชี"]])

test("badges and progress follow the saved audit result", () => {
  assert.equal(getAuditItemBadge(items[0]), null)
  assert.equal(getAuditItemBadge(items[1]), "found")
  assert.equal(getAuditItemBadge(items[3]), "mismatch")
  assert.equal(getAuditItemBadge(items[4]), "not_found")
  assert.equal(getAuditItemBadge(row({ auditStatus: "reviewed", auditResult: "out_of_scope" })), "out_of_scope")
  assert.equal(getAuditItemBadge(row({ auditStatus: "scanned", auditResult: "confirmed_with_parent" })), "found")
  assert.deepEqual(summarizeProgress(items), { total: 5, checked: 3, mismatched: 1 })
})

test("the room list shows the selected room, splits pending and checked, and counts all three tabs", () => {
  const pending = buildRoomList({ items, room: { locationId: "loc-1", departmentId: "" }, tab: "pending", limit: 50, locationLabels: labels })
  assert.deepEqual(pending.rows.map((item) => item.itemId), ["i1"])
  assert.deepEqual(pending.counts, { pending: 1, checked: 1, all: 2 })

  const checked = buildRoomList({ items, room: { locationId: "loc-2", departmentId: "" }, tab: "checked", limit: 50, locationLabels: labels })
  assert.deepEqual(checked.rows.map((item) => item.itemId), ["i4", "i5"], "checked rows show the most recent first, unsaved times last")

  const department = buildRoomList({ items, room: { locationId: "loc-2", departmentId: "dept-2" }, tab: "all", limit: 50, locationLabels: labels })
  assert.deepEqual(department.rows.map((item) => item.itemId), ["i3"])
})

test("without a room the list covers the whole round ordered by place then tag, and respects the page limit", () => {
  const all = buildRoomList({ items, room: { locationId: "", departmentId: "" }, tab: "pending", limit: 50, locationLabels: labels })
  assert.deepEqual(all.rows.map((item) => item.itemId), ["i1", "i3"])

  const many = Array.from({ length: 120 }, (_, index) => row({ itemId: `m${index}`, assetTag: `TAG-${String(index).padStart(3, "0")}` }))
  const firstPage = buildRoomList({ items: many, room: { locationId: "", departmentId: "" }, tab: "pending", limit: auditScanListPageSize, locationLabels: labels })
  assert.equal(firstPage.rows.length, 50)
  assert.equal(firstPage.total, 120)
})

test("room options list only places that have items, with pending counts and their departments", () => {
  const options = buildRoomOptions(items, [{ id: "loc-1", label: "SNI_FL1 - ห้อง IT" }, { id: "loc-2", label: "SNI_FL2 - บัญชี" }, { id: "loc-9", label: "ว่าง" }], [{ id: "dept-1", label: "D01 - ไอที" }, { id: "dept-2", label: "D02 - บัญชี" }])

  assert.deepEqual(options.map((option) => [option.locationId, option.pending, option.total]), [["loc-1", 1, 2], ["loc-2", 1, 3]])
  assert.deepEqual(options[1].departments.map((department) => [department.departmentId, department.total]), [["dept-1", 2], ["dept-2", 1]])
})

test("search needs two characters and ranks exact codes, then prefixes, then contains, pending first", () => {
  const custodians = new Map([["emp-1", "E0412 - สมชาย ใจดี"]])
  assert.equal(isAuditSearchReady("5"), false)
  assert.equal(isAuditSearchReady("โน"), true)
  assert.deepEqual(searchAuditItems(items, "5", custodians), [])

  const serial = searchAuditItems(items, "5CD1", custodians)
  assert.deepEqual(serial.map((match) => [match.item.itemId, match.field, match.tier]), [["i1", "serialNumber", 1], ["i3", "serialNumber", 1]])

  const exact = searchAuditItems(items, "sni-equ-22-0310", custodians)
  assert.deepEqual(exact.map((match) => [match.item.itemId, match.tier]), [["i2", 0]])

  const byName = searchAuditItems(items, "สมชาย", custodians)
  assert.equal(byName[0].field, "custodian")

  const ranking = searchAuditItems(items, "SNI-EQU", custodians)
  assert.deepEqual(ranking.map((match) => match.item.itemId), ["i1", "i3", "i2", "i5"], "pending before checked within one tier")
})

test("search returns at most ten results", () => {
  const many = Array.from({ length: 30 }, (_, index) => row({ itemId: `m${index}`, assetTag: `ROOM-${index}` }))
  assert.equal(searchAuditItems(many, "ROOM", new Map()).length, 10)
})

test("highlight splits the first case-insensitive match", () => {
  assert.deepEqual(splitSearchHighlight("5CD123ABC", "cd1"), ["5", "CD1", "23ABC"])
  assert.equal(splitSearchHighlight("ABC", "zz"), null)
})
