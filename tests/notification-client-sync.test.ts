import assert from "node:assert/strict"
import test from "node:test"

import {
  createLatestNotificationRequestGuard,
  isPlainPrimaryClick,
  markNotificationRead,
  notificationSummaryChangedEvent,
  notifyNotificationSummaryChanged,
  NOTIFICATION_POLL_MS,
  fetchNotificationSummary,
  markAllNotificationsRead,
  markNotificationSummaryItemRead,
} from "../src/lib/notification-client-sync.ts"

const item = (key: string, count: number, read = false) => ({ key, count, href: `/th/${key}`, tone: "warning" as const, isRead: read, isSnoozed: false, isSuppressed: read })
const summary = { total: 5, generatedAt: "2026-10-21T08:00:00.000Z", items: [item("approvalInbox", 2), item("duePm", 3), item("returnsDueSoon", 4, true)] }

test("polls every 2 minutes (menu B shell task 3)", () => assert.equal(NOTIFICATION_POLL_MS, 120_000))

test("marking one row read keeps it listed, marks it read and lowers the badge (menu B shell task 3)", () => {
  const next = markNotificationSummaryItemRead(summary, "approvalInbox")
  assert.equal(next.total, 3)
  assert.deepEqual(next.items.map((i) => [i.key, i.isRead, i.isSnoozed, i.isSuppressed]), [["approvalInbox", true, false, true], ["duePm", false, false, false], ["returnsDueSoon", true, false, true]])
  assert.equal(next.generatedAt, summary.generatedAt)
  assert.equal(markNotificationSummaryItemRead(summary, "returnsDueSoon"), summary)
  assert.equal(markNotificationSummaryItemRead(summary, "missing"), summary)
})

test("fetches the summary for the locale and answers null on any failure (menu B shell task 3)", async () => {
  let input = ""
  assert.deepEqual(await fetchNotificationSummary("en", async (url) => { input = url; return { ok: true, json: async () => summary } }), summary)
  assert.equal(input, "/api/notifications?locale=en")
  assert.equal(await fetchNotificationSummary("th", async () => ({ ok: false, json: async () => ({}) })), null)
  assert.equal(await fetchNotificationSummary("th", async () => { throw new Error("offline") }), null)
})

test("read-all sends the action only, never counts, and returns the server's summary (menu B shell task 3)", async () => {
  let request: { input: string; init?: RequestInit } | undefined
  assert.deepEqual(await markAllNotificationsRead("th", async (input, init) => { request = { input, init }; return { ok: true, json: async () => ({ ok: true, summary }) } }), summary)
  assert.equal(request?.input, "/api/notifications?locale=th")
  assert.equal(request?.init?.method, "PATCH")
  assert.deepEqual(JSON.parse(String(request?.init?.body)), { action: "read_all" })
  assert.equal(await markAllNotificationsRead("th", async () => ({ ok: false, json: async () => ({}) })), null)
  assert.equal(await markAllNotificationsRead("th", async () => { throw new Error("offline") }), null)
})

test("recognizes only unmodified primary-button navigation", () => {
  assert.equal(isPlainPrimaryClick({ button: 0, altKey: false, ctrlKey: false, metaKey: false, shiftKey: false }), true)
  assert.equal(isPlainPrimaryClick({ button: 0, altKey: false, ctrlKey: true, metaKey: false, shiftKey: false }), false)
  assert.equal(isPlainPrimaryClick({ button: 1, altKey: false, ctrlKey: false, metaKey: false, shiftKey: false }), false)
})

test("dispatches the shared notification summary change event", () => {
  const target = new EventTarget()
  let received = 0
  target.addEventListener(notificationSummaryChangedEvent, () => { received += 1 })

  notifyNotificationSummaryChanged(target)

  assert.equal(received, 1)
})

test("ignores an older notification summary response after a newer request begins", () => {
  const guard = createLatestNotificationRequestGuard()
  const olderRequest = guard.begin()
  const newerRequest = guard.begin()

  assert.equal(guard.isLatest(olderRequest), false)
  assert.equal(guard.isLatest(newerRequest), true)
})

test("notification change dispatch is safe when no browser target exists", () => {
  assert.doesNotThrow(() => notifyNotificationSummaryChanged())
})

test("persists a read action with the notification key and current count", async () => {
  let request: { input: string; init: RequestInit | undefined } | undefined
  const saved = await markNotificationRead(
    { key: "overdueMaintenance", count: 2 },
    async (input, init) => {
      request = { input, init }
      return { ok: true }
    },
  )

  assert.equal(saved, true)
  assert.equal(request?.input, "/api/notifications")
  assert.equal(request?.init?.method, "PATCH")
  assert.deepEqual(JSON.parse(String(request?.init?.body)), {
    key: "overdueMaintenance",
    count: 2,
    action: "read",
  })
})

test("reports a failed read without suppressing the client notification", async () => {
  const saved = await markNotificationRead(
    { key: "overdueMaintenance", count: 2 },
    async () => { throw new Error("offline") },
  )

  assert.equal(saved, false)
})
