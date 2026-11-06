import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import test from "node:test"

import {
  batchCheckinBlockedReasonKey,
  batchCheckinCounts,
  batchCheckinDefaultCondition,
  batchCheckinFieldOrder,
  batchCheckinHolderHref,
  batchCheckinPageHref,
  batchCheckinRowLock,
  batchCheckinSingleHref,
  batchCheckinStatusOptions,
  batchCheckinStatusTally,
  buildBatchCheckinFields,
  buildBatchCheckinItems,
  changeBatchCheckinCondition,
  initialBatchCheckinDraft,
  initialBatchCheckinTicks,
  mapBatchCheckinServerErrors,
  readBatchCheckinCreated,
  removeBatchCheckinTicks,
  showBatchCheckinEntry,
  toggleBatchCheckinTick,
  validateBatchCheckin,
  type BatchCheckinRowFacts,
} from "../src/lib/batch-checkin-form-rules.ts"
import { normalizeAssetReturnTo } from "../src/lib/asset-return-navigation.ts"
import { MAX_BATCH_CHECKIN_ITEMS } from "../src/lib/validations/batch-checkin.ts"

// Group 7 plan 4 Task 4: the multi-return form's pure rules (default ticks, G7P4-R2 locks, counts, the payload) and
// source pins for the page, the form and the two entry points.

function row(id: string, patch: Partial<BatchCheckinRowFacts> = {}): BatchCheckinRowFacts {
  return {
    assetId: id,
    assetTag: `NB-${id}`,
    name: `Notebook ${id}`,
    handover: { id: `co-${id}`, documentNo: `HO-${id}` },
    legacy: false,
    returnBlock: null,
    outstandingComponent: false,
    openRepair: false,
    ...patch,
  }
}

const conditions = [
  { id: "c-new", label: "ใหม่", name: "New" },
  { id: "c-good", label: "ดี", name: "Good" },
  { id: "c-damaged", label: "เสียหาย", name: "Damaged" },
  { id: "c-salvage", label: "ซาก", name: "Salvage" },
]
const statuses = [
  { id: "s-ready", label: "พร้อมใช้งาน", name: "Ready" },
  { id: "s-repair", label: "ส่งซ่อม", name: "Under Maintenance" },
  { id: "s-disposal", label: "รอตัดจำหน่าย", name: "Pending Disposal" },
]

test("G7P4-R2: a return block, an outstanding component or an open repair locks the row with its reason", () => {
  assert.equal(batchCheckinRowLock(row("1")), null)
  assert.equal(batchCheckinRowLock(row("2", { legacy: true, handover: null })), null)
  assert.equal(batchCheckinRowLock(row("3", { returnBlock: { code: "pendingDisposal", reasonKey: "asset.transactionReasonStatusNotReturnable" } })), "asset.transactionReasonStatusNotReturnable")
  assert.equal(batchCheckinRowLock(row("4", { outstandingComponent: true })), "asset.transactionReasonComponentOutstanding")
  assert.equal(batchCheckinRowLock(row("5", { openRepair: true })), "asset.transactionReasonActiveMaintenance")
})

test("default ticks: every row that is not locked, in order, at most MAX_BATCH_CHECKIN_ITEMS", () => {
  const ticks = initialBatchCheckinTicks([row("1"), row("2", { openRepair: true }), row("3")])
  assert.deepEqual([...ticks], ["1", "3"])
  const many = Array.from({ length: MAX_BATCH_CHECKIN_ITEMS + 5 }, (_, index) => row(String(index)))
  assert.equal(initialBatchCheckinTicks(many).size, MAX_BATCH_CHECKIN_ITEMS)
})

test("a tick: a locked row never ticks; past the cap is refused; an untick always works; remove drops the named ids", () => {
  const locked = row("x", { openRepair: true })
  const start = new Set(["1"])
  assert.equal(toggleBatchCheckinTick(start, locked, true).ticks, start)
  assert.deepEqual([...toggleBatchCheckinTick(start, row("2"), true).ticks], ["1", "2"])
  assert.deepEqual([...toggleBatchCheckinTick(start, row("1"), false).ticks], [])
  const full = new Set(Array.from({ length: MAX_BATCH_CHECKIN_ITEMS }, (_, index) => String(index)))
  const capped = toggleBatchCheckinTick(full, row("new"), true)
  assert.equal(capped.capped, true)
  assert.equal(capped.ticks.size, MAX_BATCH_CHECKIN_ITEMS)
  assert.deepEqual([...removeBatchCheckinTicks(new Set(["1", "2", "3"]), ["2", "9"])], ["1", "3"])
})

test("counts: held, ticked and the rows that go through the single form", () => {
  const rows = [row("1"), row("2", { openRepair: true }), row("3")]
  assert.deepEqual(batchCheckinCounts(rows, new Set(["1"])), { held: 3, ticked: 1, needsSingle: 1 })
})

test("the employee page's button: asset:edit's rows with at least two returnable, the unread pages counted as possible", () => {
  assert.equal(showBatchCheckinEntry({ rows: [row("1"), row("2")], total: 2 }), true)
  assert.equal(showBatchCheckinEntry({ rows: [row("1"), row("2", { openRepair: true })], total: 2 }), false)
  assert.equal(showBatchCheckinEntry({ rows: [row("1")], total: 30 }), true)
  assert.equal(showBatchCheckinEntry({ rows: [], total: 0 }), false)
})

test("the defaults: the condition the form treats as normal (Good, ดี) and พร้อมใช้งาน; ส่งซ่อม is never offered (G7P4-R4)", () => {
  assert.equal(batchCheckinDefaultCondition(conditions), "c-good")
  assert.equal(batchCheckinDefaultCondition([{ id: "x", label: "x", name: "Fair" }]), "")
  assert.deepEqual(batchCheckinStatusOptions(statuses).map((status) => status.id), ["s-ready", "s-disposal"])
  assert.deepEqual(initialBatchCheckinDraft(conditions, statuses), { conditionAfter: "c-good", nextStatusId: "s-ready", statusTouched: false, nextLocationId: "", damageNote: "" })
})

test("a condition change: ซาก picks รอตัดจำหน่าย while the status was not chosen by hand; a chosen status stays", () => {
  const draft = initialBatchCheckinDraft(conditions, statuses)
  assert.equal(changeBatchCheckinCondition(draft, "c-salvage", conditions, statuses).nextStatusId, "s-disposal")
  assert.equal(changeBatchCheckinCondition(changeBatchCheckinCondition(draft, "c-salvage", conditions, statuses), "c-good", conditions, statuses).nextStatusId, "s-ready")
  const touched = { ...draft, nextStatusId: "s-ready", statusTouched: true }
  assert.equal(changeBatchCheckinCondition(touched, "c-salvage", conditions, statuses).nextStatusId, "s-ready")
})

test("validate: nothing ticked, each ticked row's condition and status, the people, the date, the room and both signatures", () => {
  const draft = initialBatchCheckinDraft(conditions, statuses)
  const base = {
    tickedIds: ["1"],
    drafts: { "1": draft },
    returnBy: "สมชาย",
    receiveBy: "สมหญิง",
    returnDate: "2026-11-07",
    todayDay: "2026-11-07",
    nextLocationId: "loc-1",
    returnSigned: true,
    receiveSigned: true,
  }
  assert.deepEqual(validateBatchCheckin(base), {})
  assert.deepEqual(validateBatchCheckin({ ...base, tickedIds: [] }), { rows: "batchCheckinNothingSelected" })
  assert.deepEqual(validateBatchCheckin({ ...base, drafts: { "1": { ...draft, conditionAfter: "", nextStatusId: "" } } }), { "condition:1": "required", "status:1": "required" })
  assert.deepEqual(
    validateBatchCheckin({ ...base, returnBy: "", receiveBy: "x".repeat(101), returnDate: "2026-11-08", nextLocationId: "", returnSigned: false, receiveSigned: false }),
    {
      returnBy: "required",
      receiveBy: "tooLong",
      returnDate: "checkinReturnDateInFuture",
      nextLocationId: "required",
      returnSignatureFile: "batchCheckinSignatureRequired",
      receiveSignatureFile: "batchCheckinSignatureRequired",
    },
  )
  assert.deepEqual(batchCheckinFieldOrder(["1", "2"]), [
    "rows", "condition:1", "status:1", "location:1", "condition:2", "status:2", "location:2",
    "returnBy", "receiveBy", "returnDate", "nextLocationId", "returnSignatureFile", "receiveSignatureFile",
  ])
})

test("the payload: ticked rows in row order with their handover (null for ข้อมูลเก่า), a room only when overridden, the fields of the route", () => {
  const draft = initialBatchCheckinDraft(conditions, statuses)
  const rows = [row("1"), row("2", { legacy: true, handover: null }), row("3")]
  const items = buildBatchCheckinItems(rows, new Set(["2", "1"]), {
    "1": { ...draft, damageNote: "  ฝาพับมีรอย  " },
    "2": { ...draft, nextLocationId: "loc-9" },
  })
  assert.deepEqual(items, [
    { assetId: "1", checkoutId: "co-1", conditionAfter: "c-good", nextStatusId: "s-ready", damageNote: "ฝาพับมีรอย" },
    { assetId: "2", checkoutId: null, conditionAfter: "c-good", nextStatusId: "s-ready", nextLocationId: "loc-9" },
  ])
  const fields = buildBatchCheckinFields({
    employeeId: "emp-1",
    returnDate: "2026-11-07",
    returnBy: "สมชาย",
    returnByEmployeeId: "emp-1",
    receiveBy: "สมหญิง",
    receiveByEmployeeId: "",
    nextLocationId: "loc-1",
    items,
  })
  assert.deepEqual(fields, {
    employeeId: "emp-1",
    returnDate: "2026-11-07",
    returnBy: "สมชาย",
    returnByEmployeeId: "emp-1",
    receiveBy: "สมหญิง",
    receiveByEmployeeId: "",
    nextLocationId: "loc-1",
    items: JSON.stringify(items),
  })
})

test("the server's field errors land on the form's keys: items.<i>.<field> names that row", () => {
  assert.deepEqual(
    mapBatchCheckinServerErrors({ returnDate: "checkinReturnDateInFuture", items: "tooBig", "items.1.conditionAfter": "required", "items.0.nextLocationId": "x", "photoAfterFiles[2]": "invalid" }, ["a", "b"]),
    { returnDate: "checkinReturnDateInFuture", rows: "tooBig", "condition:b": "required", "location:a": "x" },
  )
})

test("the 409's row codes read in the return picker's words; others fall back to the catalog", () => {
  assert.equal(batchCheckinBlockedReasonKey("ASSET_HANDOVER_MODE_MISSING"), "asset.transactionReasonHandoverModeMissing")
  assert.equal(batchCheckinBlockedReasonKey("ASSET_HANDOVER_STATUS_MISMATCH"), "asset.transactionReasonHandoverStatusMismatch")
  assert.equal(batchCheckinBlockedReasonKey("ASSET_COMPONENT_CHECKIN_NOT_ALLOWED"), "asset.transactionReasonComponentCheckin")
  assert.equal(batchCheckinBlockedReasonKey("ASSET_LICENSE_CHECKIN_NOT_ALLOWED"), "asset.transactionReasonLicenseCheckin")
  assert.equal(batchCheckinBlockedReasonKey("ASSET_STATUS_CHECKIN_NOT_ALLOWED"), "asset.transactionReasonStatusNotReturnable")
  assert.equal(batchCheckinBlockedReasonKey("BATCH_CHECKIN_NEEDS_SINGLE"), "apiErrors.batchCheckinNeedsSingle")
  assert.equal(batchCheckinBlockedReasonKey("ASSET_CHANGED_DURING_OPERATION"), null)
})

test("the 201: documentNo and firstCheckinId, else null", () => {
  assert.deepEqual(readBatchCheckinCreated({ documentNo: "RT-1", checkinIds: ["a", "b"], firstCheckinId: "a" }), { documentNo: "RT-1", firstCheckinId: "a", count: 2 })
  assert.equal(readBatchCheckinCreated({ documentNo: "RT-1" }), null)
  assert.equal(readBatchCheckinCreated(null), null)
})

test("the status tally of the ticked rows, in the options' order", () => {
  const draft = initialBatchCheckinDraft(conditions, statuses)
  const rows = [row("1"), row("2"), row("3")]
  assert.deepEqual(
    batchCheckinStatusTally(rows, new Set(["1", "2", "3"]), { "1": draft, "2": { ...draft, nextStatusId: "s-disposal" }, "3": draft }, statuses),
    [{ id: "s-ready", label: "พร้อมใช้งาน", count: 2 }, { id: "s-disposal", label: "รอตัดจำหน่าย", count: 1 }],
  )
})

test("the hrefs: the single form by checkoutId or assetId back to this page, the page itself, and a holder group of 2+ employees", () => {
  const here = batchCheckinPageHref("th", "emp-1", "/th/master-data/employees/emp-1")
  assert.equal(here, "/th/asset-management/checkin/batch?employeeId=emp-1&returnTo=%2Fth%2Fmaster-data%2Femployees%2Femp-1")
  assert.equal(batchCheckinPageHref("th", "emp-1"), "/th/asset-management/checkin/batch?employeeId=emp-1")
  assert.equal(batchCheckinSingleHref("th", row("1"), here), `/th/asset-management/checkin?checkoutId=co-1&returnTo=${encodeURIComponent(here)}`)
  assert.equal(batchCheckinSingleHref("th", row("2", { handover: null, legacy: true }), here), `/th/asset-management/checkin?assetId=2&returnTo=${encodeURIComponent(here)}`)
  assert.equal(batchCheckinHolderHref("th", { key: "employee:emp-1", count: 2 }, "/th/assets"), "/th/asset-management/checkin/batch?employeeId=emp-1&returnTo=%2Fth%2Fassets")
  assert.equal(batchCheckinHolderHref("th", { key: "employee:emp-1", count: 1 }), null)
  assert.equal(batchCheckinHolderHref("th", { key: "department:d-1", count: 4 }), null)
  assert.equal(batchCheckinHolderHref("th", { key: "none", count: 4 }), null)
})

test("returnTo: the multi-return page and the return page are ways back; the single form may come back to the multi-return", () => {
  const batch = "/th/asset-management/checkin/batch?employeeId=emp-1&returnTo=%2Fth%2Fassets"
  assert.equal(normalizeAssetReturnTo("th", batch), batch)
  assert.equal(normalizeAssetReturnTo("th", "/th/asset-management/checkin"), "/th/asset-management/checkin")
  assert.equal(normalizeAssetReturnTo("th", "/th/asset-management/checkin/batch/x"), "/th/assets")
})

// Source pins: whole-file reads, single-line patterns, so CRLF and LF read alike.
const read = (path: string) => readFileSync(path, "utf8").replace(/\r\n/g, "\n")

test("the page: asset:edit, the employee's held rows, the master options, the signed-in employee, the returnTo", () => {
  const page = read("src/app/[locale]/(dashboard)/asset-management/checkin/batch/page.tsx")
  assert.match(page, /requirePagePermission\(locale, "asset", "edit"\)/)
  assert.match(page, /readEmployeeReturnBatch\(prisma as unknown as EmployeePageDb, employeeId\)/)
  assert.match(page, /getAssetOperationMasterOptions\(\{ conditionsFor: "checkin" \}\)/)
  assert.match(page, /currentEmployeeId=\{user\.employeeId \?\? null\}/)
  assert.match(page, /normalizeAssetReturnTo\(locale, filters\.returnTo\)/)
  assert.match(page, /notFound\(\)/)
})

test("the form: the operation frame, the condition chips, two signature pads, the review, the POST and the RT- page", () => {
  const form = read("src/components/asset-operations/batch-checkin-form.tsx")
  assert.match(form, /<OperationFormFrame/)
  assert.match(form, /<AssetConditionChoice/)
  assert.equal(form.match(/<SignaturePad\b/g)?.length, 2)
  assert.match(form, /<OperationReviewDialog/)
  assert.match(form, /fetch\("\/api\/asset-checkins\/batch", \{ method: "POST", body \}\)/)
  assert.match(form, /body\.append\(batchCheckinPhotoField\(assetId\), photo\.file\)/)
  assert.match(form, /`\/\$\{locale\}\/asset-management\/checkins\/\$\{created\.firstCheckinId\}`/)
  assert.match(form, /readBulkMoveBlocked\(payload\)/)
  assert.match(form, /t\("removeBlocked"\)/)
  assert.match(form, /t\("needsSingle"\)/)
  assert.match(form, /data-batch-checkin-row=/)
  assert.doesNotMatch(form, /from "next\/link"/)
})

test("the entry points: the employee page's รับคืนหลายรายการ and the return page's holder group", () => {
  const employeePage = read("src/app/[locale]/(dashboard)/master-data/employees/[id]/page.tsx")
  assert.match(employeePage, /canEditAssets && showBatchCheckinEntry\(\{ rows: data\.held\.rows, total: data\.held\.total \}\)/)
  assert.match(employeePage, /batchCheckinPageHref\(locale, employee\.id, pageHref\)/)
  assert.match(employeePage, /tDetail\("returnMany"\)/)
  const checkin = read("src/components/asset-operations/checkin-form.tsx")
  assert.match(checkin, /groupAction=\{renderHolderGroupLink\}/)
  assert.match(checkin, /batchCheckinHolderHref\(locale, group, returnTo \?\? `\/\$\{locale\}\/asset-management\/checkin`\)/)
  const picker = read("src/components/ui/asset-operation-picker.tsx")
  assert.match(picker, /groupAction\?\.\(section\.group\)/)
  const th = JSON.parse(readFileSync("messages/th.json", "utf8"))
  assert.equal(th.employee.detail.returnMany, "รับคืนหลายรายการ")
  assert.equal(th.batchCheckin.title, "รับคืนหลายรายการ")
  assert.equal(th.batchCheckin.holderLine, "{holder} · ถือครอง {count} รายการ")
  assert.equal(th.batchCheckin.needsSingle, "รับคืนทีละรายการ")
  assert.equal(th.batchCheckin.nextLocationAll, "ที่ตั้งหลังรับคืน (ทุกรายการ)")
  assert.equal(th.batchCheckin.overrideLocation, "เปลี่ยนเฉพาะรายการนี้")
  assert.equal(th.batchCheckin.footer, "รับคืน {count} รายการ")
  assert.equal(th.batchCheckin.reviewTitle, "ตรวจสอบก่อนรับคืน {count} รายการ")
  assert.equal(th.batchCheckin.blockedTitle, "รับคืนไม่ได้ {count} รายการ")
  assert.equal(th.batchCheckin.removeBlocked, "นำรายการที่รับคืนไม่ได้ออก")
  assert.equal(th.batchCheckin.holderGroupLink, "รับคืนทั้งหมดของ {holder}")
  assert.equal(th.apiErrors.handoverModeMissing, th.asset.transactionReasonHandoverModeMissing)
  assert.equal(th.apiErrors.handoverStatusMismatch, th.asset.transactionReasonHandoverStatusMismatch)
})
