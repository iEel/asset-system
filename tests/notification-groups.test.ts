import assert from "node:assert/strict"
import test from "node:test"

import { DECIDE_NOTIFICATION_KEYS, countUnreadDecisions, groupNotificationItems } from "../src/lib/notification-groups.ts"

test("the decide group holds the approval inbox only; every other item follows in today's order (menu B shell task 2)", () => {
  assert.deepEqual([...DECIDE_NOTIFICATION_KEYS], ["approvalInbox"])
  const items = ["duePm", "approvalInbox", "pendingAuditFindings", "pendingDisposals", "returnsDueSoon"].map((key) => ({ key }))
  const groups = groupNotificationItems(items)
  assert.deepEqual(groups.decide.map((item) => item.key), ["approvalInbox"])
  assert.deepEqual(groups.follow.map((item) => item.key), ["duePm", "pendingAuditFindings", "pendingDisposals", "returnsDueSoon"])
  assert.equal(groups.decide[0], items[1]) // the same objects, not copies
  assert.deepEqual(groupNotificationItems([]), { decide: [], follow: [] })
})

test("unread decisions count the approval inbox while it is neither read nor snoozed (menu B shell task 2)", () => {
  assert.equal(countUnreadDecisions([{ key: "approvalInbox", count: 3 }, { key: "duePm", count: 5 }]), 3)
  assert.equal(countUnreadDecisions([{ key: "approvalInbox", count: 3, isRead: true }]), 0)
  assert.equal(countUnreadDecisions([{ key: "approvalInbox", count: 3, isRead: false, isSuppressed: true }]), 0)
  assert.equal(countUnreadDecisions([{ key: "pendingDisposals", count: 2 }, { key: "pendingAuditFindings", count: 1 }]), 0)
  assert.equal(countUnreadDecisions([]), 0)
})
