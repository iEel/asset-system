import assert from "node:assert/strict"
import test from "node:test"

import { DECIDE_NOTIFICATION_KEYS, countUnreadDecisions, groupNotificationItems } from "../src/lib/notification-groups.ts"
import { WAITING_WORK_KEYS } from "../src/lib/waiting-work-rules.ts"

test("the decide group holds the approval inbox only; the two repair kinds lead the follow group (menu B shell task 2, group 1 dashboard task 1)", () => {
  assert.deepEqual([...DECIDE_NOTIFICATION_KEYS], ["approvalInbox"])
  const items = WAITING_WORK_KEYS.map((key) => ({ key }))
  const groups = groupNotificationItems(items)
  assert.deepEqual(groups.decide.map((item) => item.key), ["approvalInbox"])
  assert.deepEqual(groups.follow.map((item) => item.key), [
    "openRepairs", "stuckRepairs", "duePm", "pendingAuditFindings", "openAuditActions", "auditActionsDueSoon",
    "pendingDisposals", "approvedDisposals", "returnsDueSoon", "warrantyExpiringSoon", "licenseExpiringSoon",
  ])
  assert.equal(groups.decide[0], items[0]) // the same objects, not copies
  assert.deepEqual(groupNotificationItems([]), { decide: [], follow: [] })
})

test("unread decisions count the approval inbox while it is neither read nor snoozed (menu B shell task 2)", () => {
  assert.equal(countUnreadDecisions([{ key: "approvalInbox", count: 3 }, { key: "duePm", count: 5 }]), 3)
  assert.equal(countUnreadDecisions([{ key: "approvalInbox", count: 3, isRead: true }]), 0)
  assert.equal(countUnreadDecisions([{ key: "approvalInbox", count: 3, isRead: false, isSuppressed: true }]), 0)
  assert.equal(countUnreadDecisions([{ key: "pendingDisposals", count: 2 }, { key: "pendingAuditFindings", count: 1 }]), 0)
  assert.equal(countUnreadDecisions([]), 0)
})
