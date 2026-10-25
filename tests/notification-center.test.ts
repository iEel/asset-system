import assert from "node:assert/strict"
import test from "node:test"

import {
  buildNotificationStateUpdate,
  buildActiveNotificationSummary,
  getNotificationCountDrops,
  mergeNotificationItemsWithStates,
} from "../src/lib/notification-center.ts"

const baseItems = [
  { key: "overdueMaintenance", count: 2, href: "/th/maintenance?overdue=yes", tone: "danger" as const },
  { key: "returnsDueSoon", count: 3, href: "/th/asset-management/checkin", tone: "primary" as const },
  { key: "pendingDisposals", count: 1, href: "/th/disposal?status=pending", tone: "warning" as const },
]

test("suppresses read and snoozed notifications only while the count has not risen", () => {
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

test("a read or snoozed row stays suppressed when its count drops and returns when it rises (menu B shell task 2)", () => {
  const now = new Date("2026-10-21T08:00:00.000Z")
  const later = "2026-10-22T08:00:00.000Z"
  const items = mergeNotificationItemsWithStates([
    { key: "approvalInbox", count: 2, href: "/th/admin/approvals", tone: "danger" },
    { key: "duePm", count: 4, href: "/th/maintenance#pm-due", tone: "warning" },
    { key: "returnsDueSoon", count: 1, href: "/th/asset-management/checkin", tone: "primary" },
    { key: "approvedDisposals", count: 6, href: "/th/disposal?status=approved", tone: "warning" },
  ], [
    { key: "approvalInbox", isRead: true, lastCount: 3, snoozedUntil: null, assignedToUserId: null },
    { key: "duePm", isRead: true, lastCount: 3, snoozedUntil: null, assignedToUserId: null },
    { key: "returnsDueSoon", isRead: false, lastCount: 2, snoozedUntil: later, assignedToUserId: null },
    { key: "approvedDisposals", isRead: false, lastCount: 5, snoozedUntil: later, assignedToUserId: null },
  ], now)
  assert.deepEqual(items.map((item) => [item.key, item.isRead, item.isSnoozed, item.isSuppressed]), [
    ["approvalInbox", true, false, true], ["duePm", false, false, false],
    ["returnsDueSoon", false, true, true], ["approvedDisposals", false, false, false],
  ])
  assert.equal(buildActiveNotificationSummary(items).total, 10)
})

test("a drop in a read or snoozed row's count is reported as the lower count to record (menu B shell task 2)", () => {
  const now = new Date("2026-10-21T08:00:00.000Z")
  const state = (key: string, isRead: boolean, lastCount: number, snoozedUntil: string | null = null) =>
    ({ key, isRead, lastCount, snoozedUntil, assignedToUserId: null })
  assert.deepEqual(getNotificationCountDrops([
    { key: "approvalInbox", count: 2 }, { key: "duePm", count: 0 }, { key: "returnsDueSoon", count: 1 },
    { key: "approvedDisposals", count: 1 }, { key: "warrantyExpiringSoon", count: 1 },
    { key: "licenseExpiringSoon", count: 2 }, { key: "openAuditActions", count: 3 },
  ], [
    state("approvalInbox", true, 3), state("duePm", true, 1),
    state("returnsDueSoon", false, 4, "2026-10-22T08:00:00.000Z"),
    state("approvedDisposals", false, 5), state("warrantyExpiringSoon", false, 5, "2026-10-20T08:00:00.000Z"),
    state("licenseExpiringSoon", true, 2), state("openAuditActions", true, 2), state("overdue:asset-1", true, 2),
  ], now), [{ key: "approvalInbox", count: 2 }, { key: "duePm", count: 0 }, { key: "returnsDueSoon", count: 1 }])
})
