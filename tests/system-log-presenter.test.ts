import assert from "node:assert/strict"
import test from "node:test"

import {
  buildSystemLogPresentation,
  type SystemLogPresenterInput,
  type SystemLogRecordLabels,
} from "../src/lib/system-log-presenter.ts"

const t = (key: string) => {
  const labels: Record<string, string> = {
    "action.update": "แก้ไข",
    "action.checkin": "รับคืน",
    "action.upload": "อัปโหลด",
    "action.batch_create": "สร้างแบบชุด",
    "action.deliver_notification_digest": "ส่งสรุปแจ้งเตือน",
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
    "value.true": "เปิด",
    "value.false": "ปิด",
    "value.items": "รายการ",
    "summary.from": "จาก",
    "summary.to": "ไปยัง",
    "summary.changedTo": "เป็น",
    "summary.skipped": "ข้าม",
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
  assert.equal(result.summary, "แก้ไขการตั้งค่าระบบ: เปิดใช้งาน LDAP จาก ปิด เป็น เปิด, LDAP URL จาก ldap://old.example เป็น ldap://new.example")
  assert.deepEqual(result.changes, [
    { field: "เปิดใช้งาน LDAP", before: "ปิด", after: "เปิด" },
    { field: "LDAP URL", before: "ldap://old.example", after: "ldap://new.example" },
  ])
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
