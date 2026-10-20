import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import test from "node:test"

import {
  buildSystemLogPresentation,
  type SystemLogPresenterInput,
  type SystemLogRecordLabels,
} from "../src/lib/system-log-presenter.ts"
import { formatDate, formatDateTime } from "../src/lib/utils.ts"

const t = (key: string) => {
  const labels: Record<string, string> = {
    "action.update": "แก้ไข",
    "action.checkin": "รับคืน",
    "action.upload": "อัปโหลด",
    "action.batch_create": "สร้างแบบชุด",
    "action.deliver_notification_digest": "ส่งสรุปแจ้งเตือน",
    "action.asset_state_review_resolve": "แก้รายการรอตรวจสอบ",
    "module.setting": "ตั้งค่าระบบ",
    "module.asset": "ทรัพย์สิน",
    "module.brand": "ยี่ห้อ/รุ่น",
    "module.notification": "การแจ้งเตือน",
    "record.system_settings": "การตั้งค่าระบบ",
    "record.asset_batch_create": "สร้างทรัพย์สินแบบชุด",
    "record.notification_digest": "สรุปแจ้งเตือน",
    "field.ldap_enabled": "เปิดใช้งาน LDAP",
    "field.ldap_url": "LDAP URL",
    "field.returnBy": "ผู้ส่งคืน",
    "field.receiveBy": "ผู้รับคืน",
    "field.nextLocationId": "พื้นที่รับคืน",
    "field.originalName": "ชื่อไฟล์",
    "field.fileSize": "ขนาดไฟล์",
    "field.delivered": "ส่งในระบบ",
    "field.issueType": "ประเด็นตรวจสอบ",
    "field.resolutionReason": "เหตุผล",
    "value.true": "เปิด",
    "value.false": "ปิด",
    "value.items": "รายการ",
    "summary.from": "จาก",
    "summary.to": "ไปยัง",
    "summary.changedTo": "เป็น",
    "summary.skipped": "ข้าม",
    // Critique 2026-10-20 F2: the field names, codes and words the decision history needs.
    "action.approve": "อนุมัติ",
    "action.approve_finding": "อนุมัติรายการไม่ตรง",
    "action.execute": "ดำเนินการตัดจำหน่าย",
    "action.close": "ปิด",
    "module.disposal": "ตัดจำหน่าย",
    "module.audit": "ตรวจนับ",
    "field.remark": "หมายเหตุ",
    "field.reason": "เหตุผล",
    "field.status": "HTTP Status",
    "field.requestStatus": "สถานะคำขอ",
    "field.approvalRemark": "หมายเหตุการพิจารณา",
    "field.executionDate": "วันที่ดำเนินการ",
    "field.executedById": "ผู้ดำเนินการ",
    "field.evidenceExceptionGrantedAt": "เวลาที่อนุมัติข้อยกเว้นหลักฐาน",
    "field.reviewStatus": "สถานะการพิจารณา",
    "field.findingType": "ประเภทรายการไม่ตรง",
    "field.actualValue": "ค่าที่ตรวจพบ",
    "field.actionTaken": "ผลการพิจารณา",
    "field.auditRound.status": "สถานะรอบตรวจนับ",
    "field.note": "บันทึก",
    "value.requestStatus.pending": "รอพิจารณา",
    "value.requestStatus.approved": "อนุมัติแล้ว รอตัดจำหน่าย",
    "value.reviewStatus.pending": "รอพิจารณา",
    "value.reviewStatus.approved": "อนุมัติแล้ว",
    "value.findingType.out_of_scope": "ทรัพย์สินนอกขอบเขต",
    "value.actionTaken.out_of_scope_confirmed_no_master_update": "ยืนยันนอกขอบเขต ไม่แก้ข้อมูลทรัพย์สิน",
    "value.auditRound.status.open": "เปิดตรวจ",
    "value.auditRound.status.closed": "ปิดรอบ",
    "value.unresolvedReference": "รายการอ้างอิง",
    "value.empty": "ไม่ระบุ",
    "summary.setTo": "เป็น",
  }
  return labels[key] ?? key
}

const tEn = (key: string) => {
  const labels: Record<string, string> = {
    "action.checkin": "Return",
    "module.asset": "Asset",
    "field.returnBy": "Returned By",
    "field.nextLocationId": "Return Location",
    "summary.from": "from",
    "summary.to": "to",
    "summary.changedTo": "to",
  }
  return labels[key] ?? key
}

const labels: SystemLogRecordLabels = {
  asset: new Map([["asset-1", "Sonic-COM-05-0001 - Notebook Lenovo E14 Gen 7"]]),
  location: new Map([["loc-warehouse", "คลัง IT ชั้น 2"]]),
  model: new Map([["model-1", "Yealink - T31P"]]),
}

test("summarizes setting updates with changed fields and before/after values", () => {
  const log: SystemLogPresenterInput = {
    id: "log-1",
    action: "update",
    module: "setting",
    recordId: "system_settings",
    oldValue: JSON.stringify({ ldap_enabled: "false", ldap_url: "ldap://old.example" }),
    newValue: JSON.stringify({ ldap_enabled: "true", ldap_url: "ldap://new.example" }),
    remark: null,
    createdAt: new Date("2026-05-18T09:00:00.000Z"),
    user: { username: "admin", displayName: "System Administrator" },
  }

  const result = buildSystemLogPresentation(log, labels, "th", t)

  assert.equal(result.recordLabel, "การตั้งค่าระบบ")
  assert.equal(result.summary, "แก้ไข การตั้งค่าระบบ: เปิดใช้งาน LDAP จาก ปิด เป็น เปิด, LDAP URL จาก ldap://old.example เป็น ldap://new.example")
  assert.deepEqual(result.changes, [
    { field: "เปิดใช้งาน LDAP", before: "ปิด", after: "เปิด" },
    { field: "LDAP URL", before: "ldap://old.example", after: "ldap://new.example" },
  ])
})

test("summarizes asset state review resolution without raw metadata", () => {
  const result = buildSystemLogPresentation({
    id: "log-review",
    action: "asset_state_review_resolve",
    module: "asset",
    recordId: "asset-1",
    oldValue: JSON.stringify({ assetTag: "AST-001", issueType: "personal_ready_with_custodian", statusId: "status-ready" }),
    newValue: JSON.stringify({ assetTag: "AST-001", issueType: "personal_ready_with_custodian", statusId: "status-in-use", resolutionReason: "ยืนยันผู้ครอบครองจากเอกสารล่าสุด" }),
    remark: null,
    createdAt: new Date("2026-08-27T00:00:00.000Z"),
    user: { username: "admin", displayName: "System Administrator" },
  }, {
    ...labels,
    status: new Map([["status-ready", "พร้อมใช้งาน"], ["status-in-use", "ใช้งานอยู่"]]),
  }, "th", t)

  assert.match(result.summary, /พร้อมใช้งาน/)
  assert.match(result.summary, /ใช้งานอยู่/)
  assert.match(result.summary, /ยืนยันผู้ครอบครองจากเอกสารล่าสุด/)
  assert.equal(result.changes.some((change) => change.field === "เหตุผล"), true)
  assert.doesNotMatch(result.summary, /metadataJson/)
})

test("summarizes asset check-in with sender and destination labels", () => {
  const log: SystemLogPresenterInput = {
    id: "log-2",
    action: "checkin",
    module: "asset",
    recordId: "asset-1",
    oldValue: JSON.stringify({ currentLocationId: "loc-user" }),
    newValue: JSON.stringify({
      returnBy: "Veerapon Laoharotkul",
      receiveBy: "IT Admin",
      nextLocationId: "loc-warehouse",
    }),
    remark: null,
    createdAt: new Date("2026-05-18T10:00:00.000Z"),
    user: { username: "admin", displayName: "System Administrator" },
  }

  const result = buildSystemLogPresentation(log, labels, "th", t)

  assert.equal(result.recordLabel, "Sonic-COM-05-0001 - Notebook Lenovo E14 Gen 7")
  assert.equal(result.summary, "รับคืนทรัพย์สิน Sonic-COM-05-0001 - Notebook Lenovo E14 Gen 7 จาก Veerapon Laoharotkul ไปยัง คลัง IT ชั้น 2")
  assert.deepEqual(result.changes, [
    { field: "ผู้ส่งคืน", before: "-", after: "Veerapon Laoharotkul" },
    { field: "ผู้รับคืน", before: "-", after: "IT Admin" },
    { field: "พื้นที่รับคืน", before: "-", after: "คลัง IT ชั้น 2" },
  ])
})

test("uses model labels for legacy brand attachment upload records", () => {
  const attachmentId = "df011eeb-398a-44b3-a5db-78ecc18b6e82"
  const log: SystemLogPresenterInput = {
    id: "log-3",
    action: "upload",
    module: "brand",
    recordId: "model-1",
    oldValue: null,
    newValue: JSON.stringify({
      attachmentId,
      originalName: "front-view.jpg",
      fileSize: 128000,
    }),
    remark: null,
    createdAt: new Date("2026-05-19T16:33:08.000Z"),
    user: { username: "admin", displayName: "System Administrator" },
  }

  const result = buildSystemLogPresentation(log, labels, "th", t)

  assert.equal(result.moduleKey, "model")
  assert.equal(result.recordLabel, "Yealink - T31P")
  assert.match(result.summary, /Yealink - T31P/)
  assert.doesNotMatch(result.summary, new RegExp(attachmentId))
})

test("formats notification digest records without exposing raw reference ids", () => {
  const log: SystemLogPresenterInput = {
    id: "log-4",
    action: "deliver_notification_digest",
    module: "notification",
    recordId: "notification-digest:2026-05-21",
    oldValue: null,
    newValue: JSON.stringify({
      referenceId: "notification-digest:2026-05-21",
      delivered: 3,
      skippedEmpty: 1,
    }),
    remark: "scheduler",
    createdAt: new Date("2026-05-21T00:30:12.000Z"),
    user: null,
  }

  const result = buildSystemLogPresentation(log, labels, "th", t)

  assert.equal(result.recordLabel, "สรุปแจ้งเตือน 2026-05-21")
  assert.equal(result.summary, "ส่งในระบบ 3 รายการ, ข้าม 1 รายการ")
  assert.equal(result.remark, null)
  assert.deepEqual(result.changes, [])
  assert.doesNotMatch(result.summary, /notification-digest/)
})

test("treats asset batch create logs as synthetic records", () => {
  const log: SystemLogPresenterInput = {
    id: "log-5",
    action: "batch_create",
    module: "asset",
    recordId: "asset_batch_create",
    oldValue: null,
    newValue: JSON.stringify({
      created: 3,
      assetIds: [
        "11111111-1111-4111-8111-111111111111",
        "22222222-2222-4222-8222-222222222222",
        "33333333-3333-4333-8333-333333333333",
      ],
      assetTags: ["TAG-001", "TAG-002", "TAG-003"],
    }),
    remark: "Asset batch created",
    createdAt: new Date("2026-05-28T09:00:00.000Z"),
    user: { username: "admin", displayName: "System Administrator" },
  }

  const result = buildSystemLogPresentation(log, labels, "th", t)

  assert.equal(result.recordLabel, "สร้างทรัพย์สินแบบชุด")
  assert.equal(result.href, null)
  assert.doesNotMatch(result.summary, /asset_batch_create/)
})

function logOf(input: Partial<SystemLogPresenterInput> & { action: string; module: string; old?: unknown; next?: unknown }): SystemLogPresenterInput {
  return {
    id: "log-f2",
    recordId: input.recordId ?? null,
    oldValue: input.old === undefined ? null : JSON.stringify(input.old),
    newValue: input.next === undefined ? null : JSON.stringify(input.next),
    remark: null,
    createdAt: new Date("2026-10-19T09:00:00.000Z"),
    user: { username: "admin", displayName: "System Administrator" },
    action: input.action,
    module: input.module,
  }
}

test("puts a space between the action and the record, and names disposal fields and statuses in Thai (critique 2026-10-20 F2)", () => {
  const r = buildSystemLogPresentation(
    logOf({ action: "approve", module: "disposal", recordId: "dp-1", old: { requestStatus: "pending" }, next: { requestStatus: "approved", approvalRemark: "ok" } }),
    { disposal: new Map([["dp-1", "DP-20261019-0093"]]) },
    "th",
    t
  )
  assert.equal(r.summary, "อนุมัติ DP-20261019-0093: สถานะคำขอ จาก รอพิจารณา เป็น อนุมัติแล้ว รอตัดจำหน่าย, หมายเหตุการพิจารณา เป็น ok")
})

test("translates finding codes and leaves out context the new value does not carry (critique 2026-10-20 F2)", () => {
  const r = buildSystemLogPresentation(
    logOf({
      action: "approve_finding",
      module: "audit",
      recordId: "finding-1",
      old: { reviewStatus: "pending", findingType: "out_of_scope", actualValue: "x" },
      next: { reviewStatus: "approved", actionTaken: "out_of_scope_confirmed_no_master_update" },
    }),
    { auditFinding: new Map([["finding-1", "AUD-2026-001 / AST-001"]]) },
    "th",
    t
  )
  assert.deepEqual(r.changes.map((c) => c.field), ["สถานะการพิจารณา", "ผลการพิจารณา"])
  assert.deepEqual(r.changes.map((c) => c.after), ["อนุมัติแล้ว", "ยืนยันนอกขอบเขต ไม่แก้ข้อมูลทรัพย์สิน"])
  assert.doesNotMatch(r.summary, /pending|approved|out_of_scope|finding ?Type|review ?Status/)
})

test("formats ISO dates and names the executing employee (critique 2026-10-20 F2)", () => {
  const r = buildSystemLogPresentation(
    logOf({
      action: "execute",
      module: "disposal",
      recordId: "dp-1",
      next: { executionDate: "2026-10-19T00:00:00.000Z", evidenceExceptionGrantedAt: "2026-10-19T03:15:00.000Z", executedById: "emp-1" },
    }),
    { disposal: new Map([["dp-1", "DP-20261019-0093"]]), employee: new Map([["emp-1", "EMP001 สมชาย"]]) },
    "th",
    t
  )
  const afters = r.changes.map((c) => c.after)
  assert.ok(afters.includes(formatDate("2026-10-19T00:00:00.000Z")))
  assert.ok(afters.includes(formatDateTime("2026-10-19T03:15:00.000Z")))
  assert.ok(afters.includes("EMP001 สมชาย"))
  assert.doesNotMatch(r.summary, /T\d{2}:\d{2}|รายการอ้างอิง/)
})

test("a date-only or midnight value reads as a date, a real time as date and time, and text that starts with digits stays as typed (Review Focus 4)", () => {
  const afterOf = (note: string) =>
    buildSystemLogPresentation(logOf({ action: "update", module: "asset", recordId: "asset-1", old: { note: "a" }, next: { note } }), labels, "th", t).changes[0].after
  assert.equal(afterOf("2026-10-19"), formatDate("2026-10-19"))
  assert.equal(afterOf("2026-10-19T00:00:00.000Z"), formatDate("2026-10-19T00:00:00.000Z"))
  assert.equal(afterOf("2026-10-19T03:15:00.000Z"), formatDateTime("2026-10-19T03:15:00.000Z"))
  assert.equal(afterOf("2026 budget"), "2026 budget")
})

test("a value cleared reads ไม่ระบุ, and blank on both sides is no change (critique 2026-10-20 F2)", () => {
  const r = buildSystemLogPresentation(
    logOf({ action: "update", module: "asset", recordId: "asset-1", old: { remark: "x", reason: null }, next: { remark: null, reason: "" } }),
    labels,
    "th",
    t
  )
  assert.match(r.summary, /หมายเหตุ จาก x เป็น ไม่ระบุ/)
  assert.equal(r.changes.length, 1)
})

test("an audit round's status is not the HTTP status (critique 2026-10-20 F2)", () => {
  const r = buildSystemLogPresentation(
    logOf({ action: "close", module: "audit", recordId: "round-1", old: { status: "open" }, next: { status: "closed" } }),
    { auditRound: new Map([["round-1", "AUD-2026-001"]]) },
    "th",
    t
  )
  assert.deepEqual(r.changes[0], { field: "สถานะรอบตรวจนับ", before: "เปิดตรวจ", after: "ปิดรอบ" })
})

test("English joins the action and the module with a space (critique 2026-10-20 F2)", () => {
  const r = buildSystemLogPresentation(
    logOf({ action: "checkin", module: "asset", recordId: "asset-1", next: { returnBy: "Somchai", nextLocationId: "loc-warehouse" } }),
    labels,
    "en",
    tEn
  )
  assert.ok(r.summary.startsWith("Return Asset "), r.summary)
})

test("every field the main modules log has a label in th and en (critique 2026-10-20 F2)", () => {
  const fields = [
    // disposal
    "requestStatus", "assetStatusId", "saleValue", "salvageValue", "approvalRemark", "disposalType", "executionDate", "executedById",
    "recipientName", "documentNo", "actualSaleValue", "actualSalvageValue", "executionRemark", "reason", "assetId",
    // audit
    "reviewStatus", "findingType", "expectedValue", "actualValue", "actionTaken", "conflictConfirmed", "actionPlan", "actionOwnerId",
    "actionDueDate", "actionStatus", "closureRemark", "evidenceCount", "closedAt", "cancelledAt", "auditRound_status", "auditStatus",
    "auditResult", "reconcileStatus", "scanCount", "actualLocationId", "actualDepartmentId", "actualCustodianId",
    // repair
    "repairStatus", "outcome", "vendorId", "repairCost", "invoiceNo", "reportedDate", "problem",
    // asset
    "ownershipType", "purchaseDate", "purchasePrice", "warrantyStartDate", "warrantyEndDate", "fixedAssetCode", "poNumber",
    "invoiceNumber", "isActive", "licenseTotalSeats", "licenseUsedSeats",
  ]
  for (const locale of ["th", "en"]) {
    const m = JSON.parse(readFileSync(`messages/${locale}.json`, "utf8")).systemLogPage
    for (const key of fields) assert.equal(typeof m[`field_${key}`], "string", `${locale} field_${key}`)
    for (const key of ["summary_setTo", "value_empty", "value_requestStatus_pending", "value_requestStatus_approved", "value_requestStatus_rejected", "value_requestStatus_disposed", "value_auditRound_status_open", "value_auditRound_status_closed"]) {
      assert.equal(typeof m[key], "string", `${locale} ${key}`)
    }
  }
  const th = JSON.parse(readFileSync("messages/th.json", "utf8")).systemLogPage
  const disposal = JSON.parse(readFileSync("messages/th.json", "utf8")).disposalPage.statuses
  for (const code of ["pending", "approved", "rejected", "disposed"]) assert.equal(th[`value_requestStatus_${code}`], disposal[code], code)
})
