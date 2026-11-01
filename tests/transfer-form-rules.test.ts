import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import test from "node:test"
import {
  applyTransferReasonChip, buildTransferChecklist, buildTransferFooterLine, buildTransferLead, buildTransferReviewDetails,
  buildTransferSummaryRows, getTransferFormChange, pressedTransferReasonChip, transferComponentLines, transferDepartmentLockText,
  transferNowCells, transferWarningLines, TRANSFER_NOW_PENDING, TRANSFER_REASON_CHIPS,
  type TransferChipWords, type TransferFormChoice, type TransferFormDestinations, type TransferSummaryRow, type TransferWords,
} from "../src/lib/transfer-form-rules.ts"
import type { AssetOperationEmployeeDepartmentOption, AssetOperationLocationBranchOption, AssetOperationNamedOption } from "../src/lib/asset-operation-options.ts"
import type { AssetOperationChosenDetail, AssetOperationSearchRow } from "../src/lib/asset-operation-search-rules.ts"

// โอนย้าย's pure rules (group 3 plan 3 Task 5, spec §9.2-§9.4): one normalized change set behind the ตอนนี้ cells, the
// แผนก lock, the สรุปก่อนบันทึก rows and lead, the checklist, the footer, the warnings, the review and the reason chips.
const read = (file: string) => readFileSync(file, "utf8").replace(/\r\n/g, "\n")

const rooms: AssetOperationLocationBranchOption[] = [
  { id: "l1", label: "HQ-01 - คลัง IT", name: "คลัง IT", branchId: "b-hq", branchName: "สำนักงานใหญ่" },
  { id: "l2", label: "HQ-02 - ห้อง 2", name: "ห้อง 2", branchId: "b-hq", branchName: "สำนักงานใหญ่" },
  { id: "l3", label: "BN-01 - ชั้น 2 ฝ่ายขาย", name: "ชั้น 2 ฝ่ายขาย", branchId: "b-bn", branchName: "สาขาบางนา" },
  // Another company's head office: the same branch name, another branch id (Branch is unique per company and code).
  { id: "l4", label: "XC-01 - ห้องรับรอง", name: "ห้องรับรอง", branchId: "b-xc", branchName: "สำนักงานใหญ่" },
]
const employees: AssetOperationEmployeeDepartmentOption[] = [
  { id: "e1", label: "E001 - สมชาย ใจดี", departmentId: "d-acc", name: "สมชาย ใจดี", departmentName: "บัญชี" },
  { id: "e2", label: "E002 - สมหญิง ใจงาม", departmentId: "d-sales", name: "สมหญิง ใจงาม", departmentName: "ขาย" },
  // An active employee in an inactive department (spec §6 call 5): not in `departments`, named by the employee's own relation.
  { id: "e3", label: "E003 - วิชัย กล้าหาญ", departmentId: "d-closed", name: "วิชัย กล้าหาญ", departmentName: "ฝ่ายที่ปิดแล้ว" },
]
const departments: AssetOperationNamedOption[] = [
  { id: "d-acc", label: "ACC - บัญชี", name: "บัญชี" },
  { id: "d-sales", label: "SAL - ขาย", name: "ขาย" },
  { id: "d-it", label: "IT - Information Technology", name: "Information Technology" },
]
const adapter = { id: "k1", assetTag: "NB-0017-01", name: "Adapter 65W", travels: true, locationLabel: "HQ-01 - คลัง IT" }
const mouse = { id: "k2", assetTag: "NB-0017-02", name: "Mouse ไร้สาย", travels: true, locationLabel: "HQ-01 - คลัง IT" }
const dock = { id: "k3", assetTag: "NB-0017-03", name: "Dock", travels: false, locationLabel: "HQ-01 - คลัง IT" }
const keyboard = { assetTag: "NB-0017-04", name: "Keyboard", holderName: "สมศรี ทองดี", checkinNo: "RT-202610-0003" }

// A บุคคล asset in use, held by E001 of บัญชี, its stored department บัญชี too, in คลัง IT at the head office.
function row(o: Partial<AssetOperationSearchRow> = {}, d: Partial<AssetOperationChosenDetail> = {}): AssetOperationSearchRow {
  return {
    id: "a1", assetTag: "NB-0017", name: "Notebook", serialNumber: "SN-1", statusLabel: "ใช้งานอยู่", placeLabel: "E001 - สมชาย ใจดี",
    locationLabel: "HQ-01 - คลัง IT", currentLocationId: "l1", conditionId: "c-good", eligible: true, reasonKey: null, photo: null,
    detail: {
      ownership: "personal", statusName: "In Use",
      departmentId: "d-acc", departmentLabel: "ACC - บัญชี", departmentName: "บัญชี",
      holderId: "e1", holderActive: true, holderLabel: "E001 - สมชาย ใจดี", holderName: "สมชาย ใจดี",
      holderDepartmentId: "d-acc", holderDepartmentName: "บัญชี",
      ownerBranchId: "b-hq", ownerBranchLabel: "สำนักงานใหญ่", locationBranchLabel: "สำนักงานใหญ่",
      components: [], outstandingComponents: [], ...d,
    },
    ...o,
  }
}
// The same asset whose stored department is ขาย while its holder is in บัญชี (spec §6 call 4).
const mismatched = () => row({}, { departmentId: "d-sales", departmentLabel: "SAL - ขาย", departmentName: "ขาย" })
// A พร้อมใช้งาน asset with no holder, in IT.
const free = (d: Partial<AssetOperationChosenDetail> = {}) => row({ statusLabel: "พร้อมใช้งาน", placeLabel: "HQ-01 - คลัง IT" }, {
  statusName: "Ready", holderId: null, holderActive: null, holderLabel: null, holderName: null, holderDepartmentId: null, holderDepartmentName: null,
  departmentId: "d-it", departmentLabel: "IT - Information Technology", departmentName: "Information Technology", ...d,
})
const choose = (to: Partial<TransferFormDestinations> = {}, o: Partial<TransferFormChoice> = {}): TransferFormChoice => ({
  row: row(), detail: "ready", employees, departments, locations: rooms, ...o,
  destinations: { toLocationId: "", toCustodianId: "", toDepartmentId: "", ...to },
})
const words: TransferWords = {
  location: "ที่ตั้ง", holder: "ผู้ถือครอง", department: "แผนก", status: "สถานะ", components: "ส่วนควบ", none: "ไม่มี",
  kept: (value) => `${value} (คงเดิม)`, formerHolder: (name) => `${name} (พ้นสภาพ)`, followsHolder: (department) => `ตามผู้ถือครอง: ${department}`,
  departmentChooseAssetFirst: "เลือกทรัพย์สินก่อน", inUse: "ใช้งานอยู่", statusUnchanged: "คงสถานะเดิม", count: (count) => `${count} รายการ`,
  summaryComponentsMove: (count) => `ย้ายตาม ${count} รายการ`, summaryComponentsOutstanding: (count) => `ค้างคืน ${count} รายการ`,
  summaryLead: (count, list) => `เปลี่ยน ${count} อย่าง: ${list}`, summaryHolderDepartmentKept: "ผู้ถือครองและแผนกคงเดิม",
  summaryCrossBranch: (branch) => `ย้ายไปสาขาอื่น รหัสทรัพย์สินยังเป็นของ ${branch} ตามเดิม`,
  footerDescription: (tag, changes) => `โอนย้าย ${tag}: ${changes}`, footerIncomplete: "เลือกทรัพย์สินและสิ่งที่จะเปลี่ยน",
  checkAsset: "ทรัพย์สิน", checkChange: "เปลี่ยนอย่างน้อย 1 อย่าง", checkReason: "เหตุผล",
  toLocation: "ที่ตั้งปลายทาง", toCustodian: "ผู้ถือครองปลายทาง", toDepartment: "แผนกปลายทาง", nextStatus: "สถานะถัดไป",
  componentsMove: (count, list) => `ส่วนควบ ${count} รายการ (${list}) ย้ายตามไปด้วย`,
  componentsStaying: (list) => `ส่วนควบที่มีใบส่งมอบของตัวเองไม่ย้ายตาม: ${list}`,
  componentsOutstanding: (count, list) => `ส่วนควบค้างคืน ${count} รายการ ไม่ย้ายตาม: ${list}`,
  outstandingLine: { with: (holder) => `อยู่กับ ${holder}`, since: (documentNo) => `ตั้งแต่ ${documentNo}` },
}
const chipWords: TransferChipWords = { branch: "ย้ายสาขา", user: "เปลี่ยนผู้ถือครอง", restructure: "ปรับโครงสร้างแผนก" }
const INCOMPLETE = "เลือกทรัพย์สินและสิ่งที่จะเปลี่ยน"
const pick = (rows: TransferSummaryRow[]) => rows.map(({ key, now, next, changed }) => [key, now, next, changed])
const nothing = { location: false, holder: false, department: false }
const none = { toLocationId: null, toCustodianId: null, toDepartmentId: null }

test("a held asset moved only to another room takes its holder's department: the rows, the lead, the footer, the lock and the review all say so (Review Focus 1, spec §6 call 4, P3-R3, P3-R12)", () => {
  const choice = choose({ toLocationId: "l2" }, { row: mismatched() })
  assert.deepEqual(getTransferFormChange(choice), {
    ready: true, destinations: { toLocationId: "l2", toCustodianId: null, toDepartmentId: null },
    departmentSource: "currentHolder", departmentLocked: true, nextDepartmentId: "d-acc",
    changed: { location: true, holder: false, department: true }, changedCount: 2, crossBranch: false,
  })
  const rows = buildTransferSummaryRows(choice, words)
  assert.deepEqual(rows.map((r) => r.label), ["ที่ตั้ง", "ผู้ถือครอง", "แผนก", "สถานะ"])
  assert.deepEqual(pick(rows), [
    ["location", "คลัง IT", "ห้อง 2", true],
    ["holder", "สมชาย ใจดี", "สมชาย ใจดี (คงเดิม)", false],
    ["department", "ขาย", "บัญชี", true],
    ["status", "ใช้งานอยู่", "คงสถานะเดิม", false],
  ])
  assert.equal(buildTransferLead(choice, words), "เปลี่ยน 2 อย่าง: ที่ตั้ง, แผนก")
  assert.equal(buildTransferFooterLine(choice, words), "โอนย้าย NB-0017: ที่ตั้ง → ห้อง 2 · แผนก → บัญชี")
  assert.equal(transferDepartmentLockText(choice, words), "ตามผู้ถือครอง: บัญชี")
  assert.deepEqual(buildTransferReviewDetails(choice, words), [
    { key: "location", label: "ที่ตั้งปลายทาง", value: "HQ-02 - ห้อง 2" },
    { key: "department", label: "แผนกปลายทาง", value: "บัญชี" },
    { key: "status", label: "สถานะถัดไป", value: "คงสถานะเดิม" },
  ])
})

test("a room-only move that keeps the holder and the department: เปลี่ยน 1 อย่าง with ผู้ถือครองและแผนกคงเดิม; an inactive current room falls back to its code - name (spec §9.3, P3-R12)", () => {
  const choice = choose({ toLocationId: "l2" })
  assert.equal(buildTransferLead(choice, words), "เปลี่ยน 1 อย่าง: ที่ตั้ง · ผู้ถือครองและแผนกคงเดิม")
  assert.deepEqual(pick(buildTransferSummaryRows(choice, words))[2], ["department", "บัญชี", "บัญชี (คงเดิม)", false])
  assert.equal(buildTransferFooterLine(choice, words), "โอนย้าย NB-0017: ที่ตั้ง → ห้อง 2")
  assert.deepEqual(buildTransferReviewDetails(choice, words).map((detail) => detail.key), ["location", "status"])
  const closedRoom = choose({ toLocationId: "l2" }, { row: row({ currentLocationId: "l9", locationLabel: "OLD-9 - ห้องเก่า" }) })
  assert.deepEqual(pick(buildTransferSummaryRows(closedRoom, words))[0], ["location", "OLD-9 - ห้องเก่า", "ห้อง 2", true])
})

test("a new holder: the department follows them and cannot be picked, a picked department is not sent, and พร้อมใช้งาน goes to ใช้งานอยู่ (spec §6, §9.2, §9.3, P3-R5)", () => {
  const choice = choose({ toCustodianId: "e2", toDepartmentId: "d-acc" }, { row: free() })
  assert.deepEqual(getTransferFormChange(choice), {
    ready: true, destinations: { toLocationId: null, toCustodianId: "e2", toDepartmentId: null },
    departmentSource: "newHolder", departmentLocked: true, nextDepartmentId: "d-sales",
    changed: { location: false, holder: true, department: true }, changedCount: 2, crossBranch: false,
  })
  assert.deepEqual(pick(buildTransferSummaryRows(choice, words)), [
    ["location", "คลัง IT", "คลัง IT (คงเดิม)", false],
    ["holder", "ไม่มี", "สมหญิง ใจงาม", true],
    ["department", "Information Technology", "ขาย", true],
    ["status", "พร้อมใช้งาน", "ใช้งานอยู่", true],
  ])
  assert.equal(transferDepartmentLockText(choice, words), "ตามผู้ถือครอง: ขาย")
  assert.equal(buildTransferLead(choice, words), "เปลี่ยน 2 อย่าง: ผู้ถือครอง, แผนก")
  assert.equal(buildTransferFooterLine(choice, words), "โอนย้าย NB-0017: ผู้ถือครอง → สมหญิง ใจงาม · แผนก → ขาย")
  assert.deepEqual(buildTransferReviewDetails(choice, words), [
    { key: "holder", label: "ผู้ถือครองปลายทาง", value: "E002 - สมหญิง ใจงาม" },
    { key: "department", label: "แผนกปลายทาง", value: "ขาย" },
    { key: "status", label: "สถานะถัดไป", value: "ใช้งานอยู่" },
  ])
})

test("ใช้งานอยู่ stays ใช้งานอยู่ under a new holder; an inactive department of an active holder is named as it will be written; Stock follows the holder; three changes (spec §6 call 5, P3-R12)", () => {
  assert.deepEqual(pick(buildTransferSummaryRows(choose({ toCustodianId: "e2" }), words)).slice(1), [
    ["holder", "สมชาย ใจดี", "สมหญิง ใจงาม", true],
    ["department", "บัญชี", "ขาย", true],
    ["status", "ใช้งานอยู่", "คงสถานะเดิม", false],
  ])
  const closed = choose({ toCustodianId: "e3" })
  assert.equal(getTransferFormChange(closed).nextDepartmentId, "d-closed")
  assert.equal(transferDepartmentLockText(closed, words), "ตามผู้ถือครอง: ฝ่ายที่ปิดแล้ว")
  assert.deepEqual(pick(buildTransferSummaryRows(closed, words))[2], ["department", "บัญชี", "ฝ่ายที่ปิดแล้ว", true])
  assert.equal(getTransferFormChange(choose({ toCustodianId: "e2" }, { row: free({ ownership: "stock" }) })).departmentSource, "newHolder")
  const all = choose({ toLocationId: "l3", toCustodianId: "e2" })
  assert.equal(buildTransferLead(all, words), "เปลี่ยน 3 อย่าง: ที่ตั้ง, ผู้ถือครอง, แผนก")
  assert.equal(buildTransferFooterLine(all, words), "โอนย้าย NB-0017: ที่ตั้ง → ชั้น 2 ฝ่ายขาย · ผู้ถือครอง → สมหญิง ใจงาม · แผนก → ขาย")
})

test("a destination equal to the current value is not a change: not sent, not counted, and a re-picked holder keeps the status (Review Focus 2, spec §9.2 call 17, P3-R4)", () => {
  const same = choose({ toLocationId: "l1", toCustodianId: "e1" })
  assert.deepEqual([getTransferFormChange(same).destinations, getTransferFormChange(same).changed], [none, nothing])
  assert.equal(buildTransferLead(same, words), null)
  assert.equal(buildTransferFooterLine(same, words), INCOMPLETE)
  assert.equal(buildTransferChecklist(same, "เปลี่ยนผู้ถือครอง: ตามคำขอ", words)[1].done, false)
  assert.deepEqual(buildTransferReviewDetails(same, words), [{ key: "status", label: "สถานะถัดไป", value: "คงสถานะเดิม" }])
  // A พร้อมใช้งาน asset still carrying an old holder (ข้อมูลเก่า) re-picks that holder: no ใช้งานอยู่, and no assignCustodian for the picker.
  const legacy = choose({ toCustodianId: "e1" }, { row: row({ statusLabel: "พร้อมใช้งาน" }, { statusName: "Ready" }) })
  assert.equal(getTransferFormChange(legacy).destinations.toCustodianId, null)
  assert.deepEqual(pick(buildTransferSummaryRows(legacy, words))[3], ["status", "พร้อมใช้งาน", "คงสถานะเดิม", false])
  // A free asset's own department, picked again, is dropped too.
  assert.deepEqual(getTransferFormChange(choose({ toDepartmentId: "d-it" }, { row: free() })), {
    ready: true, destinations: none, departmentSource: "free", departmentLocked: false, nextDepartmentId: "d-it",
    changed: nothing, changedCount: 0, crossBranch: false,
  })
})

test("the department correction alone is not a change: the row previews it, but there is no lead, the footer asks for a change and the checklist waits (P3-R4, P3-R12)", () => {
  const choice = choose({}, { row: mismatched() })
  const change = getTransferFormChange(choice)
  assert.deepEqual([change.destinations, change.changed, change.changedCount], [none, { location: false, holder: false, department: true }, 1])
  assert.deepEqual(pick(buildTransferSummaryRows(choice, words))[2], ["department", "ขาย", "บัญชี", true])
  assert.equal(buildTransferLead(choice, words), null)
  assert.equal(buildTransferFooterLine(choice, words), INCOMPLETE)
  assert.equal(buildTransferChecklist(choice, "ย้ายสาขา: ไปบางนา", words)[1].done, false)
})

test("a holder chosen, then cleared with ×: the row unlocks, nothing is sent and the status returns to คงสถานะเดิม; the rule keeps no memory, so the form clears the department it locked (Review Focus 3, P3-R5)", () => {
  const chosen = choose({ toCustodianId: "e2" }, { row: free() })
  assert.equal(getTransferFormChange(chosen).departmentLocked, true)
  assert.deepEqual(pick(buildTransferSummaryRows(chosen, words))[3], ["status", "พร้อมใช้งาน", "ใช้งานอยู่", true])
  const cleared = choose({ toCustodianId: "" }, { row: free() })
  assert.deepEqual(getTransferFormChange(cleared), {
    ready: true, destinations: none, departmentSource: "free", departmentLocked: false, nextDepartmentId: "d-it",
    changed: nothing, changedCount: 0, crossBranch: false,
  })
  assert.equal(transferDepartmentLockText(cleared, words), null)
  assert.deepEqual(pick(buildTransferSummaryRows(cleared, words))[3], ["status", "พร้อมใช้งาน", "คงสถานะเดิม", false])
  // A department still in the form's state comes back once the holder goes: T6 clears it when a holder locks the row.
  assert.equal(getTransferFormChange(choose({ toDepartmentId: "d-acc" }, { row: free() })).destinations.toDepartmentId, "d-acc")
})

test("no detail to judge (a switched asset still loading, a failed read, no asset): the แผนก row is locked and nothing is promised (Review Focus 5, P3-R15, P3-R21)", () => {
  const picks = { toLocationId: "l2", toCustodianId: "e2", toDepartmentId: "d-acc" }
  const listed = row({ detail: undefined })
  for (const choice of [choose(picks, { row: listed, detail: "loading" }), choose(picks, { detail: "failed" }), choose(picks, { row: listed, detail: "failed" }), choose(picks, { row: listed }), choose(picks, { row: null })]) {
    assert.deepEqual(getTransferFormChange(choice), {
      ready: false, destinations: { toLocationId: "l2", toCustodianId: "e2", toDepartmentId: null },
      departmentSource: null, departmentLocked: true, nextDepartmentId: null, changed: nothing, changedCount: 0, crossBranch: false,
    })
    assert.deepEqual(buildTransferSummaryRows(choice, words), [])
    assert.deepEqual(transferNowCells(choice, words), { location: "…", holder: "…", department: "…" })
    assert.equal(transferDepartmentLockText(choice, words), choice.row === null ? "เลือกทรัพย์สินก่อน" : null)
    assert.equal(buildTransferLead(choice, words), null)
    assert.equal(buildTransferFooterLine(choice, words), INCOMPLETE)
    assert.deepEqual(transferWarningLines(choice, words), [])
    assert.deepEqual(buildTransferReviewDetails(choice, words), [])
    assert.deepEqual(transferComponentLines(choice, words), { travelling: null, staying: null, outstanding: null })
    assert.equal(buildTransferChecklist(choice, "ย้ายสาขา: ไปบางนา", words)[1].done, false)
  }
  assert.equal(TRANSFER_NOW_PENDING, "…")
  // The same asset read again (the submit's re-read, ลองอีกครั้ง) keeps its last answer while it loads: no flicker.
  assert.equal(getTransferFormChange(choose(picks, { detail: "loading" })).ready, true)
  assert.equal(buildTransferSummaryRows(choose(picks, { detail: "loading" }), words).length, 4)
})

test("no asset chosen: the locked แผนก row says เลือกทรัพย์สินก่อน; a chosen asset whose detail is loading or failed keeps ไม่เปลี่ยนแปลง (null), and a ready free asset unlocks the row (Y5, P3-R5, P3-R21)", () => {
  const noAsset = choose({ toDepartmentId: "d-acc" }, { row: null })
  assert.deepEqual([getTransferFormChange(noAsset).departmentLocked, getTransferFormChange(noAsset).destinations.toDepartmentId], [true, null])
  assert.equal(transferDepartmentLockText(noAsset, words), "เลือกทรัพย์สินก่อน")
  assert.equal(transferDepartmentLockText(choose({}, { row: row({ detail: undefined }), detail: "loading" }), words), null, "a switched asset still loading")
  assert.equal(transferDepartmentLockText(choose({}, { row: free(), detail: "failed" }), words), null, "a failed read")
  const ready = choose({ toDepartmentId: "d-acc" }, { row: free() })
  assert.deepEqual([getTransferFormChange(ready).departmentLocked, transferDepartmentLockText(ready, words)], [false, null])
})

test("ส่วนกลาง and a ส่วนควบ moved alone keep a free department, even with a holder, and a holder still makes them ใช้งานอยู่ (spec §6 Q1, P3-R2)", () => {
  for (const ownership of ["shared", "component"] as const) {
    const choice = choose({ toCustodianId: "e2", toDepartmentId: "d-acc" }, { row: free({ ownership }) })
    const change = getTransferFormChange(choice)
    assert.deepEqual([change.departmentSource, change.departmentLocked, change.destinations, change.nextDepartmentId],
      ["free", false, { toLocationId: null, toCustodianId: "e2", toDepartmentId: "d-acc" }, "d-acc"], ownership)
    assert.equal(transferDepartmentLockText(choice, words), null, ownership)
    assert.deepEqual(pick(buildTransferSummaryRows(choice, words)).slice(2), [
      ["department", "Information Technology", "บัญชี", true], ["status", "พร้อมใช้งาน", "ใช้งานอยู่", true]], ownership)
  }
  // A held ส่วนกลาง asset moved only to another room keeps its department: no correction to the holder's.
  const shared = choose({ toLocationId: "l2" }, { row: row({}, { ownership: "shared", departmentId: "d-it", departmentLabel: "IT - Information Technology", departmentName: "Information Technology" }) })
  assert.deepEqual(getTransferFormChange(shared).changed, { location: true, holder: false, department: false })
  assert.equal(buildTransferLead(shared, words), "เปลี่ยน 1 อย่าง: ที่ตั้ง · ผู้ถือครองและแผนกคงเดิม")
})

test("the ตอนนี้ cells read code - name: the room with its branch, the holder, the department; a former holder is marked and still decides the department (P3-R10, P3-R17)", () => {
  assert.deepEqual(transferNowCells(choose(), words), { location: "HQ-01 - คลัง IT · สำนักงานใหญ่", holder: "E001 - สมชาย ใจดี", department: "ACC - บัญชี" })
  assert.deepEqual(transferNowCells(choose({}, { row: free({ departmentId: null, departmentLabel: null, departmentName: null }) }), words),
    { location: "HQ-01 - คลัง IT · สำนักงานใหญ่", holder: "ไม่มี", department: "ไม่มี" })
  const former = choose({ toLocationId: "l2" }, { row: row({}, { holderActive: false, departmentId: "d-sales", departmentLabel: "SAL - ขาย", departmentName: "ขาย" }) })
  assert.equal(transferNowCells(former, words).holder, "E001 - สมชาย ใจดี (พ้นสภาพ)")
  assert.equal(transferDepartmentLockText(former, words), "ตามผู้ถือครอง: บัญชี")
  assert.deepEqual(pick(buildTransferSummaryRows(former, words)).slice(1, 3), [
    ["holder", "สมชาย ใจดี (พ้นสภาพ)", "สมชาย ใจดี (คงเดิม)", false], ["department", "ขาย", "บัญชี", true]])
})

test("the cross-branch line: a new room in another branch than the asset's own, compared by branch id and never by name, for a room only (P3-R13)", () => {
  const line = "ย้ายไปสาขาอื่น รหัสทรัพย์สินยังเป็นของ สำนักงานใหญ่ ตามเดิม"
  assert.deepEqual(transferWarningLines(choose({ toLocationId: "l3" }), words), [line])
  assert.equal(getTransferFormChange(choose({ toLocationId: "l3" })).crossBranch, true)
  assert.deepEqual(transferWarningLines(choose({ toLocationId: "l4" }), words), [line], "same branch name, another branch id")
  assert.deepEqual(transferWarningLines(choose({ toLocationId: "l2" }, { row: row({}, { ownerBranchLabel: "Head Office" }) }), words), [], "same branch id, another name")
  assert.deepEqual(transferWarningLines(choose({ toCustodianId: "e2" }), words), [], "a holder alone")
  // An asset owned by สาขาบางนา sitting at the head office: a move within the head office still names its owner's branch.
  const away = row({}, { ownerBranchId: "b-bn", ownerBranchLabel: "สาขาบางนา" })
  assert.deepEqual(transferWarningLines(choose({ toLocationId: "l2" }, { row: away }), words), ["ย้ายไปสาขาอื่น รหัสทรัพย์สินยังเป็นของ สาขาบางนา ตามเดิม"])
  assert.deepEqual(transferWarningLines(choose({ toLocationId: "l1" }, { row: away }), words), [], "its own room again is no move")
})

test("components: the line under the table lists what moves (the sync's filter), those with their own handover and the outstanding ones apart, and the card counts them (P3-R12, P3-R14)", () => {
  const withAll = choose({ toLocationId: "l2" }, { row: row({}, { components: [adapter, mouse, dock], outstandingComponents: [keyboard] }) })
  assert.deepEqual(transferComponentLines(withAll, words), {
    travelling: "ส่วนควบ 2 รายการ (Adapter 65W, Mouse ไร้สาย) ย้ายตามไปด้วย",
    staying: "ส่วนควบที่มีใบส่งมอบของตัวเองไม่ย้ายตาม: NB-0017-03",
    outstanding: "ส่วนควบค้างคืน 1 รายการ ไม่ย้ายตาม: NB-0017-04 Keyboard · อยู่กับ สมศรี ทองดี · ตั้งแต่ RT-202610-0003",
  })
  assert.deepEqual(pick(buildTransferSummaryRows(withAll, words))[4], ["components", "4 รายการ", "ย้ายตาม 2 รายการ · ค้างคืน 1 รายการ", true])
  assert.deepEqual(buildTransferReviewDetails(withAll, words).find((detail) => detail.key === "components"), { key: "components", label: "ส่วนควบ", value: "ย้ายตาม 2 รายการ" })
  const one = choose({ toLocationId: "l2" }, { row: row({}, { components: [adapter] }) })
  assert.deepEqual(pick(buildTransferSummaryRows(one, words))[4], ["components", "1 รายการ", "ย้ายตาม 1 รายการ", true])
  // Before any destination nothing moves yet, so the row is plain (look step).
  const nothingYet = choose({}, { row: row({}, { components: [adapter] }) })
  assert.deepEqual(pick(buildTransferSummaryRows(nothingYet, words))[4], ["components", "1 รายการ", "ย้ายตาม 1 รายการ", false])
  assert.deepEqual(transferComponentLines(one, words), { travelling: "ส่วนควบ 1 รายการ (Adapter 65W) ย้ายตามไปด้วย", staying: null, outstanding: null })
  const onlyOutstanding = choose({ toLocationId: "l2" }, { row: row({}, { outstandingComponents: [keyboard] }) })
  assert.deepEqual(pick(buildTransferSummaryRows(onlyOutstanding, words))[4], ["components", "1 รายการ", "ย้ายตาม 0 รายการ · ค้างคืน 1 รายการ", false])
  assert.equal(buildTransferReviewDetails(onlyOutstanding, words).some((detail) => detail.key === "components"), false)
  // Only a component with its own handover: nothing moves and none is outstanding, so there is no components row.
  assert.deepEqual(buildTransferSummaryRows(choose({ toLocationId: "l2" }, { row: row({}, { components: [dock] }) }), words).map((r) => r.key), ["location", "holder", "department", "status"])
  assert.deepEqual(transferComponentLines(choose(), words), { travelling: null, staying: null, outstanding: null })
})

test("the checklist: the asset can be moved, at least one real change, and the reason by validate()'s own rule (P3-R12, P3-R16)", () => {
  const choice = choose({ toLocationId: "l2" })
  assert.deepEqual(buildTransferChecklist(choice, "ย้ายสาขา: ไปบางนา", words), [
    { key: "asset", label: "ทรัพย์สิน", done: true },
    { key: "change", label: "เปลี่ยนอย่างน้อย 1 อย่าง", done: true },
    { key: "reason", label: "เหตุผล", done: true },
  ])
  const blocked = choose({ toLocationId: "l2" }, { row: row({ eligible: false, reasonKey: "asset.transactionReasonStatusNotTransferable" }) })
  assert.equal(buildTransferChecklist(blocked, "ย้ายสาขา: ไปบางนา", words)[0].done, false)
  assert.equal(buildTransferChecklist(choose({ toLocationId: "l2" }, { row: null }), "x", words)[0].done, false)
  assert.equal(buildTransferChecklist(choice, "   ", words)[2].done, false)
  assert.equal(buildTransferChecklist(choice, "ก".repeat(501), words)[2].done, false)
  assert.equal(buildTransferChecklist(choice, "ก".repeat(500), words)[2].done, true)
})

test("the lead and the footer share one condition, so the phone's footer line is the lead or footerIncomplete (P3-R12, spec §9.4)", () => {
  const choices = [choose(), choose({ toLocationId: "l2" }), choose({ toCustodianId: "e2" }, { row: free() }), choose({ toLocationId: "l2" }, { row: row({ detail: undefined }), detail: "loading" }), choose({}, { row: mismatched() }), choose({ toLocationId: "l1" })]
  for (const choice of choices) assert.equal(buildTransferLead(choice, words) === null, buildTransferFooterLine(choice, words) === INCOMPLETE)
})

test("the review lists real changes only, in order: the room and the employee by code - name, the department by name, the components and the next status (P3-R18)", () => {
  const choice = choose({ toLocationId: "l3", toCustodianId: "e2", toDepartmentId: "d-it" }, { row: row({}, { components: [adapter] }) })
  assert.deepEqual(buildTransferReviewDetails(choice, words), [
    { key: "location", label: "ที่ตั้งปลายทาง", value: "BN-01 - ชั้น 2 ฝ่ายขาย" },
    { key: "holder", label: "ผู้ถือครองปลายทาง", value: "E002 - สมหญิง ใจงาม" },
    { key: "department", label: "แผนกปลายทาง", value: "ขาย" },
    { key: "components", label: "ส่วนควบ", value: "ย้ายตาม 1 รายการ" },
    { key: "status", label: "สถานะถัดไป", value: "คงสถานะเดิม" },
  ])
  const department = choose({ toDepartmentId: "d-acc" }, { row: free() })
  assert.deepEqual(buildTransferReviewDetails(department, words), [
    { key: "department", label: "แผนกปลายทาง", value: "บัญชี" },
    { key: "status", label: "สถานะถัดไป", value: "คงสถานะเดิม" },
  ])
  assert.equal(buildTransferLead(department, words), "เปลี่ยน 1 อย่าง: แผนก")
  assert.equal(buildTransferFooterLine(department, words), "โอนย้าย NB-0017: แผนก → บัญชี")
})

test("a chip writes its full word and a colon at the start, replacing an earlier chip's and keeping the rest, never cut (spec §9.3 call 18, P3-R16)", () => {
  assert.deepEqual(TRANSFER_REASON_CHIPS, ["branch", "user", "restructure", "other"])
  assert.equal(applyTransferReasonChip("", "branch", chipWords), "ย้ายสาขา: ")
  assert.equal(applyTransferReasonChip("ไปสาขาบางนา", "branch", chipWords), "ย้ายสาขา: ไปสาขาบางนา")
  assert.equal(applyTransferReasonChip("ย้ายสาขา: ไปสาขาบางนา", "user", chipWords), "เปลี่ยนผู้ถือครอง: ไปสาขาบางนา")
  assert.equal(applyTransferReasonChip("เปลี่ยนผู้ถือครอง:ให้คุณสมหญิง", "restructure", chipWords), "ปรับโครงสร้างแผนก: ให้คุณสมหญิง")
  assert.equal(applyTransferReasonChip("ปรับโครงสร้างแผนก: รวมฝ่าย", "restructure", chipWords), "ปรับโครงสร้างแผนก: รวมฝ่าย")
  // Only a leading prefix is replaced, and the phone's short ปรับโครงสร้าง is a label, never a prefix.
  assert.equal(applyTransferReasonChip("ตามคำขอ ย้ายสาขา: ด่วน", "user", chipWords), "เปลี่ยนผู้ถือครอง: ตามคำขอ ย้ายสาขา: ด่วน")
  assert.equal(applyTransferReasonChip("ปรับโครงสร้าง: รวมฝ่าย", "branch", chipWords), "ย้ายสาขา: ปรับโครงสร้าง: รวมฝ่าย")
  const long = "ก".repeat(495)
  assert.equal(applyTransferReasonChip(long, "restructure", chipWords), `ปรับโครงสร้างแผนก: ${long}`)
})

test("the pressed chip is the one whose word and colon start the text; อื่น ๆ never writes and is never pressed (P3-R16)", () => {
  assert.equal(pressedTransferReasonChip("ย้ายสาขา: ไปบางนา", chipWords), "branch")
  assert.equal(pressedTransferReasonChip("เปลี่ยนผู้ถือครอง:", chipWords), "user")
  assert.equal(pressedTransferReasonChip("ปรับโครงสร้างแผนก: ", chipWords), "restructure")
  for (const text of ["", "ไปบางนา", "อื่น ๆ: ไปบางนา", " ย้ายสาขา: ไปบางนา", "ปรับโครงสร้าง: รวมฝ่าย", "ย้ายสาขา"]) assert.equal(pressedTransferReasonChip(text, chipWords), null, text)
  // @ts-expect-error อื่น ๆ only focuses the text (spec §9.3): the chip function does not take it.
  const writeOther = () => applyTransferReasonChip("x", "other", chipWords)
  assert.equal(typeof writeOther, "function")
})

test("one rule, one function: the rules read T1's department rule and normalizer and checkout's component filter, stay pure and take no device (plan 3 Global Constraints, P3-R16)", () => {
  const source = read("src/lib/transfer-form-rules.ts")
  assert.doesNotMatch(source, /from "@\/|@prisma\/client"|\bprisma\./)
  for (const [, path] of source.matchAll(/from "([^"]+)"/g)) assert.match(path, /^\.\/[\w-]+\.ts$/, path)
  for (const call of ["getTransferDepartmentSource(", "getTransferNextDepartmentId(", "normalizeTransferDestinations(", "hasTransferChange(",
    "getTransferTargetStatusName(", "checkoutComponents(", "checkoutOutstandingLines("]) assert.ok(source.includes(call), call)
  assert.doesNotMatch(source, /isDesktop|matchMedia|\bwindow\.\w|\bdocument\.\w/)
})
