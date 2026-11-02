import test from "node:test"
import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import { ASSET_MOVEMENT_LABELLED_TYPES } from "../src/lib/asset-movement-labels.ts"
import {
  ASSET_HISTORY_CATEGORIES,
  ASSET_HISTORY_DEFAULT_LIMIT,
  ASSET_HISTORY_EXCEL_COLUMNS,
  ASSET_HISTORY_EXPORT_LIMIT,
  ASSET_HISTORY_REASON_TYPES,
  assetHistoryActorLabel,
  assetHistoryCategory,
  assetHistoryExcelRow,
  assetHistoryLookupIds,
  assetHistoryMovementDetail,
  auditItemResultKey,
  auditItemsWithoutMovement,
  buildAssetHistoryExportFilename,
  countAssetHistory,
  formatAssetHistoryDateTime,
  movementChangeText,
  orderAssetHistory,
  type AssetHistoryCategory,
  type AssetHistoryEvent,
  type AssetHistoryLabels,
  type AssetHistoryMovementInput,
} from "../src/lib/asset-history-rules.ts"

const th = JSON.parse(readFileSync("messages/th.json", "utf8"))
const fill = (text: string, values: Record<string, string | number>) => text.replace(/\{(\w+)\}/g, (_, key: string) => String(values[key]))
const h = th.asset.history
const labels: AssetHistoryLabels = {
  fields: h.fields,
  none: h.none,
  unknownRecord: h.unknownRecord,
  ownershipTypes: { personal: th.asset.ownershipType_personal, stock: th.asset.ownershipType_stock },
  returnedFrom: (name) => fill(h.returnedFrom, { name }),
  repairDays: (days) => fill(h.repairDays, { days }),
  receivedBy: (name) => fill(h.receivedBy, { name }),
  lateReturnOutcomes: { reattached: h.lateReturnReattached, standalone: h.lateReturnStandalone },
}
const noLookup = new Map<string, string>()
const movement = (input: Partial<AssetHistoryMovementInput> & { movementType: string }): AssetHistoryMovementInput => ({
  fromValue: null, toValue: null, reason: null, checkout: null, checkin: null, repair: null, ...input,
})

test("the chips, and the chip of every movement type: a cancel and a component's copy count with their transaction (spec §7.6)", () => {
  assert.deepEqual(ASSET_HISTORY_CATEGORIES, ["checkout", "checkin", "transfer", "audit", "repair", "disposal", "component", "edit"])
  const expected: Record<AssetHistoryCategory, string[]> = {
    checkout: ["checkout", "checkout_cancel", "parent_checkout_sync"],
    checkin: ["checkin", "checkin_cancel", "parent_checkin_sync", "component_outstanding", "component_late_return"],
    transfer: ["transfer", "transfer_cancel", "parent_transfer_sync", "bulk_location_move", "parent_bulk_move_sync"],
    audit: ["audit_correction", "audit_location_correction", "audit_custodian_correction", "audit_department_correction", "audit_condition_correction", "parent_audit_finding_sync", "parent_audit_confirmation_sync"],
    repair: ["maintenance_create", "maintenance_close", "maintenance_cancel", "maintenance_status_update", "maintenance_pm_create"],
    disposal: ["disposal_request", "disposal_approve", "disposal_reject", "disposal_execute"],
    component: ["component_install", "component_remove", "installed_in_parent", "removed_from_parent"],
    edit: ["create", "import", "batch_create", "location_change", "custodian_change", "status_change", "condition_change", "department_change", "ownership_type_change", "license_total_seats_change", "license_used_seats_change", "license_assigned_asset_change", "bulk_location_update", "bulk_custodian_update", "register_location_correction", "register_custodian_correction", "register_department_correction", "register_field_correction", "asset_tag_change", "status_correction", "state_review_resolution", "parent_register_update_sync", "parent_bulk_update_sync"],
  }
  assert.deepEqual(Object.values(expected).flat().sort(), [...ASSET_MOVEMENT_LABELLED_TYPES].sort(), "every labelled type has exactly one chip")
  for (const [category, types] of Object.entries(expected)) {
    for (const type of types) assert.equal(assetHistoryCategory(type), category, type)
  }
  assert.equal(assetHistoryCategory("something_new"), "edit", "a type without a label still has a chip")
  assert.equal(assetHistoryCategory(""), "edit")
})

test("the register corrections count under แก้ไขข้อมูล, not โอนย้าย, and show the reason typed (group 4 spec §7.3, P1-R6)", () => {
  assert.equal(th.asset.history.types.edit, "แก้ไขข้อมูล")
  for (const type of ["register_location_correction", "register_custodian_correction", "register_department_correction"]) {
    assert.equal(assetHistoryCategory(type), "edit", type)
    assert.ok(ASSET_HISTORY_REASON_TYPES.has(type), type)
    assert.equal(assetHistoryMovementDetail(movement({ movementType: type, reason: "บันทึกผิด" }), noLookup, labels), "บันทึกผิด")
  }
  const { counts } = countAssetHistory(
    [
      { movementType: "register_location_correction", count: 2 },
      { movementType: "register_custodian_correction", count: 1 },
      { movementType: "register_department_correction", count: 1 },
    ],
    0,
  )
  assert.equal(counts.edit, 4)
  assert.equal(counts.transfer, 0)
})

test("the counts per chip add up to the total; the scans that wrote no movement count as ตรวจนับ", () => {
  const { total, counts } = countAssetHistory(
    [
      { movementType: "checkout", count: 3 },
      { movementType: "checkout_cancel", count: 1 },
      { movementType: "checkin", count: 2 },
      { movementType: "maintenance_create", count: 2 },
      { movementType: "maintenance_close", count: 1 },
      { movementType: "audit_location_correction", count: 1 },
      { movementType: "create", count: 1 },
      { movementType: "something_new", count: 1 },
    ],
    2,
  )
  assert.deepEqual(counts, { checkout: 4, checkin: 2, transfer: 0, audit: 3, repair: 3, disposal: 0, component: 0, edit: 2 })
  assert.equal(total, 14)
  assert.deepEqual(countAssetHistory([], 0), { total: 0, counts: { checkout: 0, checkin: 0, transfer: 0, audit: 0, repair: 0, disposal: 0, component: 0, edit: 0 } })
})

test("an audit item is an event only when its scan wrote no movement (spec §7.6)", () => {
  const at = (iso: string) => new Date(iso)
  const items = [
    { id: "i-corrected", lastScanAt: at("2026-10-12T10:05:00Z"), findingIds: ["f1"] },
    { id: "i-reviewed-later", lastScanAt: at("2026-10-12T11:00:00Z"), findingIds: ["f2"] },
    { id: "i-matched", lastScanAt: at("2026-10-12T12:00:00Z"), findingIds: [] },
    { id: "i-marked-not-found", lastScanAt: null, findingIds: ["f3"] },
    { id: "i-scan-reference", lastScanAt: at("2026-10-12T13:00:00Z"), findingIds: [] },
  ]
  const movements = [
    // The scan corrected the register itself: its movement carries the scan's own time.
    { referenceType: "audit_finding", referenceId: "f1", performedAt: at("2026-10-12T10:05:00Z") },
    // A finding approved days later is a second event; the scan stays one.
    { referenceType: "audit_finding", referenceId: "f2", performedAt: at("2026-10-15T09:00:00Z") },
    { referenceType: "audit_finding", referenceId: "f3", performedAt: at("2026-10-15T09:00:00Z") },
    { referenceType: "audit_scan", referenceId: "i-scan-reference", performedAt: at("2026-10-12T13:00:00Z") },
    // Another item's finding at the same time is not this item's.
    { referenceType: "audit_finding", referenceId: "f-other", performedAt: at("2026-10-12T12:00:00Z") },
  ]
  assert.deepEqual(auditItemsWithoutMovement(items, movements).map((item) => item.id), ["i-reviewed-later", "i-matched", "i-marked-not-found"])
  assert.equal(auditItemResultKey("scanned", "found"), "auditRound.found")
  assert.equal(auditItemResultKey("scanned", "confirmed_with_parent"), "auditRound.confirmedWithParent")
  assert.equal(auditItemResultKey("reviewed", "not_found"), "auditRound.notFound")
  assert.equal(auditItemResultKey("reviewed", "mismatch"), "auditRound.mismatch")
  assert.equal(auditItemResultKey("scanned", null), "auditRound.scanned")
  assert.equal(auditItemResultKey("reconciled", null), "auditFinding.itemStatus_reconciled")
  assert.equal(auditItemResultKey("odd", "strange"), null)
})

test("a repair's close details join its movements; the record is never a row of its own (spec §7.6)", () => {
  // Typed from the input, so a change below may set `resolution` or `returnDate` to null (tsc checks tests/).
  const record: NonNullable<AssetHistoryMovementInput["repair"]> = {
    problem: "จอกะพริบ",
    resolution: "เปลี่ยนสายแพจอ",
    reportedDate: new Date("2026-08-02T04:00:00Z"),
    returnDate: new Date("2026-08-15T07:30:00Z"),
    repairStatus: "closed",
    hasCloseMovement: true,
  }
  const lookup = new Map([["st-use", "ใช้งานอยู่"], ["st-repair", "อยู่ระหว่างซ่อม"]])
  const repair = (movementType: string, changes: Partial<typeof record> = {}, reason: string | null = null) =>
    assetHistoryMovementDetail(movement({ movementType, fromValue: "st-use", toValue: "st-repair", reason, repair: { ...record, ...changes } }), lookup, labels)
  assert.equal(repair("maintenance_create", {}, "จอกะพริบ"), "จอกะพริบ")
  assert.equal(repair("maintenance_close", {}, "เปลี่ยนสายแพจอ"), "เปลี่ยนสายแพจอ · ใช้เวลา 13 วัน")
  // Recorded as done in one save (208 of 878 records on dev): one movement, which carries the close details.
  assert.equal(repair("maintenance_create", { returnDate: record.reportedDate, hasCloseMovement: false }), "จอกะพริบ · เปลี่ยนสายแพจอ")
  assert.equal(repair("maintenance_create", { repairStatus: "in_progress", resolution: null, returnDate: null, hasCloseMovement: false }), "จอกะพริบ")
  assert.equal(repair("maintenance_cancel", {}, "บันทึกผิดเครื่อง"), "บันทึกผิดเครื่อง")
  // 23:30 on 2 Aug to 00:30 on 4 Aug in Bangkok is 2 days, whatever the UTC dates say.
  assert.equal(repair("maintenance_close", { reportedDate: new Date("2026-08-02T16:30:00Z"), returnDate: new Date("2026-08-03T17:30:00Z"), resolution: null }), "ใช้เวลา 2 วัน")
  // The record is gone (never on dev): the status change shows instead.
  assert.equal(assetHistoryMovementDetail(movement({ movementType: "maintenance_create", fromValue: "st-use", toValue: "st-repair" }), lookup, labels), "ใช้งานอยู่ → อยู่ระหว่างซ่อม")
})

test("a change reads as before → after in words, never a raw key or id (spec §4)", () => {
  const lookup = new Map([
    ["loc-a", "BN-01 - สาขาบางนา"],
    ["loc-b", "HQ-01 - สำนักงานใหญ่"],
    ["emp-1", "E001 - สมชาย ใจดี"],
    ["st-ready", "พร้อมใช้งาน"],
    ["st-use", "ใช้งานอยู่"],
  ])
  // A transfer's snapshots: the fields that changed, in a fixed order.
  assert.equal(
    movementChangeText(
      JSON.stringify({ locationId: "loc-a", custodianId: null, departmentId: null, statusId: "st-ready" }),
      JSON.stringify({ locationId: "loc-b", custodianId: "emp-1", departmentId: null, statusId: "st-ready" }),
      lookup,
      labels,
    ),
    "ที่ตั้ง: BN-01 - สาขาบางนา → HQ-01 - สำนักงานใหญ่ · ผู้ถือครอง: ไม่มี → E001 - สมชาย ใจดี",
  )
  // The keys of a cancel and a component sync read in Thai; a key the history does not know is left out.
  assert.equal(
    movementChangeText(JSON.stringify({ currentLocationId: "loc-b", internalFlag: "x" }), JSON.stringify({ currentLocationId: "loc-a", internalFlag: "y" }), lookup, labels),
    "ที่ตั้ง: HQ-01 - สำนักงานใหญ่ → BN-01 - สาขาบางนา",
  )
  // A component install has only its new side, and the id beside the tag is not shown.
  assert.equal(
    movementChangeText(null, JSON.stringify({ componentAssetId: "c-1", componentAssetTag: "GRL-RAM-26-0003", componentRole: "RAM", slotNo: null }), lookup, labels),
    "ส่วนควบ: GRL-RAM-26-0003 · บทบาท: RAM",
  )
  // Plain values: an id through the lookup, an ownership code through its label, a number as it is.
  assert.equal(movementChangeText("st-ready", "st-use", lookup, labels), "พร้อมใช้งาน → ใช้งานอยู่")
  assert.equal(movementChangeText("personal", "stock", lookup, labels), `${th.asset.ownershipType_personal} → ${th.asset.ownershipType_stock}`)
  assert.equal(movementChangeText("5", "6", lookup, labels), "5 → 6")
  assert.equal(movementChangeText(null, "loc-a", lookup, labels), "BN-01 - สาขาบางนา", "a registration names where it was put")
  // An id with no record left is never printed.
  assert.equal(movementChangeText("9B2F3C1E-0000-4000-8000-000000000001", null, lookup, labels), "ไม่พบรายการอ้างอิง")
  assert.equal(movementChangeText(null, null, lookup, labels), null)
  // The ids to look up, from plain values and snapshots alike, once each and in lower case.
  assert.deepEqual(
    assetHistoryLookupIds([JSON.stringify({ locationId: "9B2F3C1E-0000-4000-8000-000000000001", componentAssetTag: "GRL-RAM-26-0003" }), "9b2f3c1e-0000-4000-8000-000000000001", "e1c0ffee-0000-4000-8000-000000000002", null, "personal"]),
    ["9b2f3c1e-0000-4000-8000-000000000001", "e1c0ffee-0000-4000-8000-000000000002"],
  )
})

test("a handover names who received it and how, a return who gave it back, and only a person's own reason is shown", () => {
  const destination = "E001 - สมชาย ใจดี"
  assert.equal(
    assetHistoryMovementDetail(movement({ movementType: "checkout", reason: "Asset checkout", checkout: { destination, handoverMode: th.asset.handoverPermanentAssignment } }), noLookup, labels),
    "E001 - สมชาย ใจดี · มอบหมายใช้งานประจำ",
  )
  assert.equal(assetHistoryMovementDetail(movement({ movementType: "checkout", checkout: { destination, handoverMode: null } }), noLookup, labels), destination)
  assert.equal(assetHistoryMovementDetail(movement({ movementType: "checkin", reason: "Asset checkin", checkin: { returnBy: destination } }), noLookup, labels), "จาก E001 - สมชาย ใจดี")
  assert.equal(assetHistoryMovementDetail(movement({ movementType: "transfer_cancel", reason: "เลือกผู้รับผิด" }), noLookup, labels), "เลือกผู้รับผิด")
  assert.equal(assetHistoryMovementDetail(movement({ movementType: "create", reason: "Initial asset registration" }), noLookup, labels), null)
  assert.deepEqual([...ASSET_HISTORY_REASON_TYPES].sort(), [
    "bulk_custodian_update", "bulk_location_move", "bulk_location_update", "checkin_cancel", "checkout_cancel", "component_install",
    "component_remove", "disposal_approve", "disposal_execute", "disposal_reject", "disposal_request", "installed_in_parent",
    "maintenance_cancel", "register_custodian_correction", "register_department_correction", "register_location_correction",
    "removed_from_parent", "state_review_resolution", "status_correction", "transfer", "transfer_cancel",
  ])
  // The types whose reason the system writes in English ("Asset checkout", "Audit scan correction", "Parent asset register update", …).
  for (const type of ["create", "import", "batch_create", "checkout", "checkin", "location_change", "audit_correction", "audit_location_correction", "audit_department_correction", "parent_register_update_sync", "parent_audit_confirmation_sync", "maintenance_create", "maintenance_close"]) {
    assert.equal(ASSET_HISTORY_REASON_TYPES.has(type), false, type)
  }
  assert.equal(assetHistoryActorLabel({ username: "it01", displayName: "IT One", email: null, employee: { code: "E009", fullNameTh: "ช่าง ไอที" } }), "E009 - ช่าง ไอที")
  assert.equal(assetHistoryActorLabel({ username: "it01", displayName: "IT One", email: null, employee: null }), "IT One (it01)")
  assert.equal(assetHistoryActorLabel({ username: "it01", displayName: "", email: "it01@example.com", employee: null }), "it01@example.com")
})

test("newest first, a fixed order for events at the same instant, and the cap", () => {
  const event = (id: string, iso: string): AssetHistoryEvent => ({ id, at: new Date(iso), category: "edit", labelKey: "asset.movementTypes.create", detail: null, actor: null, document: null })
  const events = [event("a", "2026-10-01T00:00:00Z"), event("b", "2026-10-02T00:00:00Z"), event("c", "2026-10-02T00:00:00Z"), event("d", "2026-09-30T00:00:00Z")]
  assert.deepEqual(orderAssetHistory(events, 500).map((item) => item.id), ["c", "b", "a", "d"])
  assert.deepEqual(orderAssetHistory(events, 2).map((item) => item.id), ["c", "b"])
  assert.equal(events[0].id, "a", "the input is not reordered")
  assert.equal(ASSET_HISTORY_DEFAULT_LIMIT, 500)
  assert.equal(ASSET_HISTORY_EXPORT_LIMIT, 5000)
})

test("the Excel row: the Bangkok date and time, the chip word, the event, the detail, who recorded it and the document (spec §7.6)", () => {
  assert.equal(formatAssetHistoryDateTime(new Date("2026-10-25T07:05:00Z")), "2026-10-25 14:05")
  assert.equal(formatAssetHistoryDateTime(new Date("2026-12-31T17:30:00Z")), "2027-01-01 00:30")
  const t = (key: string) => key.split(".").reduce((value, part) => value[part], th) as unknown as string
  assert.deepEqual(ASSET_HISTORY_EXCEL_COLUMNS.map((column) => [column.key, t(column.headerKey)]), [
    ["at", "วันที่ เวลา"], ["type", "ประเภท"], ["event", "รายการ"], ["detail", "รายละเอียด"], ["actor", "ผู้บันทึก"], ["document", "เอกสาร"],
  ])
  assert.deepEqual(
    assetHistoryExcelRow({
      id: "m1",
      at: new Date("2026-08-15T07:30:00Z"),
      category: "repair",
      labelKey: "asset.movementTypes.maintenance_close",
      detail: "เปลี่ยนสายแพจอ · ใช้เวลา 13 วัน",
      actor: "E009 - ช่าง ไอที",
      document: { kind: "repair", code: "MT-20260802-0001", href: "/th/maintenance/t1" },
    }, t),
    { at: "2026-08-15 14:30", type: "ซ่อม", event: "ซ่อมเสร็จ", detail: "เปลี่ยนสายแพจอ · ใช้เวลา 13 วัน", actor: "E009 - ช่าง ไอที", document: "MT-20260802-0001" },
  )
  // No document, or one the downloader may not open (the route passes it as null, R52): an empty cell.
  assert.deepEqual(
    assetHistoryExcelRow({ id: "audit-i1", at: new Date("2026-10-12T10:05:00Z"), category: "audit", labelKey: "asset.history.auditScan", detail: "พบตรง", actor: null, document: null }, t),
    { at: "2026-10-12 17:05", type: "ตรวจนับ", event: "ตรวจนับ", detail: "พบตรง", actor: "", document: "" },
  )
  assert.equal(buildAssetHistoryExportFilename("GRL-COM-26-0017", new Date("2026-10-25T17:30:00Z")), "asset-history-GRL-COM-26-0017-2026-10-26.xlsx")
  assert.equal(buildAssetHistoryExportFilename("ทดสอบ/01", new Date("2026-10-25T03:00:00Z")), "asset-history-______01-2026-10-25.xlsx")
})

test("a component left out of a return and its late return read in words: who holds it, who received it and where it went (group 3 spec §8.5, §8.6, plan 2 Task 12)", () => {
  const lookup = new Map([["emp-1", "E001 - สมชาย ใจดี"], ["emp-2", "E002 - สมหญิง รักงาน"], ["dept-acc", "ACC - บัญชี"], ["dept-hr", "HR - บุคคล"]])
  const outstanding = (from: object, to: object) =>
    assetHistoryMovementDetail(movement({ movementType: "component_outstanding", fromValue: JSON.stringify(from), toValue: JSON.stringify(to), reason: "Not returned with its parent asset" }), lookup, labels)
  // ผู้คืน is someone else: the change, as today.
  assert.equal(outstanding({ custodianId: "emp-1", departmentId: "dept-acc" }, { custodianId: "emp-2", departmentId: "dept-hr" }), "ผู้ถือครอง: E001 - สมชาย ใจดี → E002 - สมหญิง รักงาน · แผนก: ACC - บัญชี → HR - บุคคล")
  // ผู้คืน already held it: nothing changed, so the line says who has it.
  const same = { custodianId: "emp-1", departmentId: "dept-acc" }
  assert.equal(outstanding(same, same), "ผู้ถือครอง: E001 - สมชาย ใจดี · แผนก: ACC - บัญชี")
  const late = (outcome: string, receivedByName: string | null = "E009 - ช่าง ไอที") =>
    assetHistoryMovementDetail(movement({ movementType: "component_late_return", toValue: JSON.stringify({ receivedByName, returnDate: "2026-10-25", outcome }), reason: "Component late return" }), noLookup, labels)
  assert.equal(late("reattached"), "รับโดย E009 - ช่าง ไอที · กลับเข้าเครื่องหลัก")
  assert.equal(late("standalone"), "รับโดย E009 - ช่าง ไอที · แยกเป็นทรัพย์สินเดี่ยว")
  assert.equal(late("later", null), "later", "a code without a word shows as stored")
  assert.equal(assetHistoryMovementDetail(movement({ movementType: "component_late_return", toValue: null }), noLookup, labels), null)
})

test("a field correction reads as <field>: old → new, an id by its name and an ownership code in words (group 4 spec §7.4, P2-R5)", () => {
  const withShared: AssetHistoryLabels = { ...labels, ownershipTypes: { ...labels.ownershipTypes, shared: th.asset.ownershipType_shared } }
  const lookup = new Map([["c1", "NB - โน้ตบุ๊ก"], ["c2", "PC - คอมพิวเตอร์"], ["b1", "Dell"], ["m1", "Latitude 5440"]])
  const correction = (from: Record<string, unknown>, to: Record<string, unknown>) =>
    assetHistoryMovementDetail(movement({ movementType: "register_field_correction", fromValue: JSON.stringify(from), toValue: JSON.stringify(to) }), lookup, withShared)
  assert.equal(correction({ serialNumber: "SN-1" }, { serialNumber: "SN-2" }), `${h.fields.serialNumber}: SN-1 → SN-2`)
  assert.equal(correction({ categoryId: "c1" }, { categoryId: "c2" }), `${h.fields.category}: NB - โน้ตบุ๊ก → PC - คอมพิวเตอร์`)
  assert.equal(correction({ brandId: null }, { brandId: "b1" }), `${h.fields.brand}: ${h.none} → Dell`)
  assert.equal(correction({ modelId: "m1" }, { modelId: null }), `${h.fields.model}: Latitude 5440 → ${h.none}`)
  assert.equal(correction({ ownershipType: "personal" }, { ownershipType: "shared" }), `${h.fields.ownershipType}: ${th.asset.ownershipType_personal} → ${th.asset.ownershipType_shared}`)
  // Dates as stored, a price as text, the branch with the label it already had.
  assert.equal(correction({ purchaseDate: null }, { purchaseDate: "2026-01-05" }), `${h.fields.purchaseDate}: ${h.none} → 2026-01-05`)
  assert.equal(correction({ purchasePrice: "1500" }, { purchasePrice: "1750.5" }), `${h.fields.purchasePrice}: 1500 → 1750.5`)
  assert.equal(correction({ branchId: "c1" }, { branchId: "c2" }), `${h.fields.branch}: NB - โน้ตบุ๊ก → PC - คอมพิวเตอร์`)
  // Every one of the 14 asset columns has a word, in Thai and English.
  const en = JSON.parse(readFileSync("messages/en.json", "utf8"))
  const columns = ["name", "serialNumber", "categoryId", "brandId", "modelId", "companyId", "branchId", "ownershipType", "purchaseDate", "purchasePrice", "warrantyStartDate", "warrantyEndDate", "poNumber", "invoiceNumber"]
  for (const column of columns) {
    const text = correction({ [column]: "old" }, { [column]: "new" })
    assert.ok(text && /^[^:]+: old → new$/.test(text), `${column} reads with a word: ${text}`)
    const field = text.slice(0, text.indexOf(":"))
    const key = Object.entries(h.fields).find(([, word]) => word === field)?.[0]
    assert.ok(key && typeof en.asset.history.fields[key] === "string", `${column} has an English word`)
  }
  assert.equal(new Set(columns.map((column) => correction({ [column]: "old" }, { [column]: "new" })?.split(":")[0])).size, 14, "one word each")
})
