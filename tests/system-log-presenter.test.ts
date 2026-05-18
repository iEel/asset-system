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
    "module.setting": "ตั้งค่าระบบ",
    "module.asset": "ทรัพย์สิน",
    "record.system_settings": "การตั้งค่าระบบ",
    "field.ldap_enabled": "เปิดใช้งาน LDAP",
    "field.ldap_url": "LDAP URL",
    "field.returnBy": "ผู้ส่งคืน",
    "field.receiveBy": "ผู้รับคืน",
    "field.nextLocationId": "พื้นที่รับคืน",
    "value.true": "เปิด",
    "value.false": "ปิด",
    "summary.from": "จาก",
    "summary.to": "ไปยัง",
    "summary.changedTo": "เป็น",
  }
  return labels[key] ?? key
}

const labels: SystemLogRecordLabels = {
  asset: new Map([["asset-1", "Sonic-COM-05-0001 - Notebook Lenovo E14 Gen 7"]]),
  location: new Map([["loc-warehouse", "คลัง IT ชั้น 2"]]),
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
