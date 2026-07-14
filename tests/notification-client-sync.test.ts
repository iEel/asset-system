import assert from "node:assert/strict"
import test from "node:test"

import {
  createLatestNotificationRequestGuard,
  isPlainPrimaryClick,
  markNotificationRead,
  notificationSummaryChangedEvent,
  notifyNotificationSummaryChanged,
  removeNotificationSummaryItem,
} from "../src/lib/notification-client-sync.ts"

test("removes a read item and recalculates the active notification total", () => {
  const summary = removeNotificationSummaryItem({
    total: 5,
    items: [
      { key: "overdueMaintenance", count: 2, href: "/th/maintenance", tone: "danger" },
      { key: "returnsDueSoon", count: 3, href: "/th/checkin", tone: "warning" },
    ],
  }, "overdueMaintenance")

  assert.equal(summary.total, 3)
  assert.deepEqual(summary.items.map((item) => item.key), ["returnsDueSoon"])
})

test("leaves the summary unchanged when the item is no longer active", () => {
  const current = {
    total: 1,
    items: [{ key: "overdueMaintenance", count: 1, href: "/th/maintenance", tone: "danger" as const }],
  }

  assert.equal(removeNotificationSummaryItem(current, "missing"), current)
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
