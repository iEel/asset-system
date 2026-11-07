import assert from "node:assert/strict"
import test from "node:test"

import { NOTIFICATION_ANNOUNCEMENT_CLEAR_MS, describeNotificationIncrease } from "../src/lib/notification-announcement.ts"

const item = (key: string, count: number, read = false) => ({ key, count, href: `/th/${key}`, tone: "warning" as const, isRead: read, isSnoozed: false, isSuppressed: read })
const titles: Record<string, string> = { approvalInbox: "งานรออนุมัติ", duePm: "PM ครบกำหนดใน 7 วัน", openRepairs: "ซ่อมยังไม่เสร็จ" }
const labels = { increase: (key: string, count: number) => `${titles[key]} เพิ่ม ${count} รายการ` }
// total = the unread topics, as the server sends it (group 9 plan 1 task 6).
const summary = (...items: ReturnType<typeof item>[]) => ({ total: items.filter((i) => !i.isSuppressed && i.count > 0).length, generatedAt: "2026-10-21T08:00:00.000Z", items })
const announce = (previous: ReturnType<typeof summary> | null, next: ReturnType<typeof summary>) => describeNotificationIncrease(previous, next, labels)

test("names what grew when the unread-topic number rises (menu B shell task 3, group 9 plan 1 task 6)", () => {
  assert.equal(announce(summary(item("approvalInbox", 2)), summary(item("approvalInbox", 2), item("duePm", 2))), "PM ครบกำหนดใน 7 วัน เพิ่ม 2 รายการ")
  assert.equal(announce(summary(item("approvalInbox", 3, true)), summary(item("approvalInbox", 4))), "งานรออนุมัติ เพิ่ม 1 รายการ") // the growth, not the whole count
  assert.equal(announce(summary(item("approvalInbox", 1)), summary(item("approvalInbox", 2), item("duePm", 3))), "งานรออนุมัติ เพิ่ม 1 รายการ PM ครบกำหนดใน 7 วัน เพิ่ม 3 รายการ")
  assert.equal(announce(summary(item("approvalInbox", 3), item("duePm", 1, true)), summary(item("approvalInbox", 1), item("duePm", 4))), "PM ครบกำหนดใน 7 วัน เพิ่ม 3 รายการ")
})

test("says nothing on the first load, without a rise in topics, or when the badge rises with no new work (menu B shell task 3, group 9 plan 1 task 6)", () => {
  assert.equal(announce(null, summary(item("approvalInbox", 3))), null)
  assert.equal(announce(summary(item("approvalInbox", 3)), summary(item("approvalInbox", 3))), null)
  assert.equal(announce(summary(item("approvalInbox", 3)), summary(item("approvalInbox", 2))), null)
  // An unread queue that grows keeps the same number of topics: the badge does not move, so nothing is said.
  assert.equal(announce(summary(item("approvalInbox", 2)), summary(item("approvalInbox", 9))), null)
  // One topic read, another new: the number stays at 2.
  assert.equal(announce(summary(item("approvalInbox", 2), item("duePm", 1)), summary(item("approvalInbox", 2, true), item("duePm", 1), item("openRepairs", 1))), null)
  assert.equal(announce(summary(item("duePm", 2, true)), summary(item("duePm", 2))), null)
  assert.equal(NOTIFICATION_ANNOUNCEMENT_CLEAR_MS, 10_000)
})
