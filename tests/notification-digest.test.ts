import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import test from "node:test"

import {
  buildDailyDigestMessage,
  buildDailyDigestReferenceId,
  resolveDigestTone,
} from "../src/lib/notification-digest-format.ts"

test("builds stable daily digest reference id", () => {
  assert.equal(buildDailyDigestReferenceId(new Date("2026-05-20T11:30:00.000Z")), "notification-digest:2026-05-20")
})

test("builds localized digest message from notification items", () => {
  const message = buildDailyDigestMessage("th", [
    { key: "duePm", count: 2, href: "/th/maintenance#pm-due", tone: "warning" },
    { key: "returnsDueSoon", count: 3, href: "/th/asset-management/checkin", tone: "warning" },
  ])

  assert.match(message, /วันนี้มีงานที่ควรติดตาม 5 รายการ/)
  assert.match(message, /PM ถึงกำหนด: 2/)
  assert.match(message, /รายการยืมใช้ชั่วคราวใกล้ครบกำหนดคืน: 3/)
})

test("uses highest severity tone in digest", () => {
  assert.equal(resolveDigestTone([{ key: "returnsDueSoon", count: 1, href: "/th", tone: "warning" }]), "warning")
  assert.equal(
    resolveDigestTone([
      { key: "returnsDueSoon", count: 1, href: "/th", tone: "warning" },
      { key: "approvalInbox", count: 1, href: "/th", tone: "danger" },
    ]),
    "danger"
  )
})

test("notification digest route records scheduler run state", () => {
  const source = readFileSync("src/app/api/notifications/digest/route.ts", "utf8")

  assert.match(source, /updateScheduledJobRunState/)
  assert.match(source, /notificationDigestLastRunAtKey/)
  assert.match(source, /notificationDigestLastStatusKey/)
  assert.match(source, /notificationDigestLastErrorKey/)
  assert.match(source, /status:\s*"success"/)
  assert.match(source, /status:\s*"failed"/)
})
