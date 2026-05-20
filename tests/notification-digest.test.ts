import assert from "node:assert/strict"
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
    { key: "overdueMaintenance", count: 2, href: "/th/maintenance?due=overdue", tone: "danger" },
    { key: "returnsDueSoon", count: 3, href: "/th/asset-management/checkin", tone: "warning" },
  ])

  assert.match(message, /วันนี้มีงานที่ควรติดตาม 5 รายการ/)
  assert.match(message, /งานซ่อมเกินกำหนด: 2/)
  assert.match(message, /รายการส่งมอบใกล้ครบกำหนดคืน: 3/)
})

test("uses highest severity tone in digest", () => {
  assert.equal(resolveDigestTone([{ key: "returnsDueSoon", count: 1, href: "/th", tone: "warning" }]), "warning")
  assert.equal(
    resolveDigestTone([
      { key: "returnsDueSoon", count: 1, href: "/th", tone: "warning" },
      { key: "overdueMaintenance", count: 1, href: "/th", tone: "danger" },
    ]),
    "danger"
  )
})
