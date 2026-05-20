import assert from "node:assert/strict"
import test from "node:test"

import {
  buildNotificationStateUpdate,
  buildActiveNotificationSummary,
  mergeNotificationItemsWithStates,
} from "../src/lib/notification-center.ts"

const baseItems = [
  { key: "overdueMaintenance", count: 2, href: "/th/maintenance?overdue=yes", tone: "danger" as const },
  { key: "returnsDueSoon", count: 3, href: "/th/asset-management/checkin", tone: "primary" as const },
  { key: "pendingDisposals", count: 1, href: "/th/disposal?status=pending", tone: "warning" as const },
]

test("suppresses read and snoozed notifications only while the count is unchanged", () => {
  const now = new Date("2026-05-20T08:00:00.000Z")
  const items = mergeNotificationItemsWithStates(baseItems, [
    { key: "overdueMaintenance", isRead: true, lastCount: 2, snoozedUntil: null, assignedToUserId: null },
    { key: "returnsDueSoon", isRead: false, lastCount: 3, snoozedUntil: "2026-05-21T08:00:00.000Z", assignedToUserId: null },
    { key: "pendingDisposals", isRead: true, lastCount: 0, snoozedUntil: null, assignedToUserId: null },
  ], now)

  assert.equal(items.find((item) => item.key === "overdueMaintenance")?.isRead, true)
  assert.equal(items.find((item) => item.key === "returnsDueSoon")?.isSnoozed, true)
  assert.equal(items.find((item) => item.key === "pendingDisposals")?.isRead, false)

  const summary = buildActiveNotificationSummary(items)
  assert.equal(summary.total, 1)
  assert.deepEqual(summary.items.map((item) => item.key), ["pendingDisposals"])
})

test("keeps assignment metadata without suppressing the active notification", () => {
  const items = mergeNotificationItemsWithStates(baseItems, [
    { key: "overdueMaintenance", isRead: false, lastCount: 2, snoozedUntil: null, assignedToUserId: "user-2" },
  ], new Date("2026-05-20T08:00:00.000Z"))

  const assigned = items.find((item) => item.key === "overdueMaintenance")
  assert.equal(assigned?.assignedToUserId, "user-2")
  assert.equal(assigned?.isSuppressed, false)
  assert.equal(buildActiveNotificationSummary(items).total, 6)
})

test("builds state updates for read, snooze, and assignment actions", () => {
  const now = new Date("2026-05-20T08:00:00.000Z")

  assert.deepEqual(buildNotificationStateUpdate({ action: "read", count: 2 }, now), {
    isRead: true,
    lastCount: 2,
    snoozedUntil: null,
  })
  assert.deepEqual(buildNotificationStateUpdate({ action: "unread", count: 2 }, now), {
    isRead: false,
    lastCount: 2,
    snoozedUntil: null,
  })
  assert.deepEqual(buildNotificationStateUpdate({ action: "snooze", count: 2, snoozeHours: 24 }, now), {
    isRead: false,
    lastCount: 2,
    snoozedUntil: new Date("2026-05-21T08:00:00.000Z"),
  })
  assert.deepEqual(buildNotificationStateUpdate({ action: "assign", count: 2, assignedToUserId: "user-2" }, now), {
    lastCount: 2,
    assignedToUserId: "user-2",
  })
})
