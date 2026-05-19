import assert from "node:assert/strict"
import test from "node:test"

import { getApprovalAgeStatus, sortApprovalInboxItemsByAge } from "../src/lib/approval-aging.ts"
import type { ApprovalInboxItem } from "../src/lib/approval-inbox.ts"

const now = new Date("2026-05-19T12:00:00.000Z")

test("calculates approval age and SLA overdue state by calendar day", () => {
  const status = getApprovalAgeStatus(new Date("2026-05-15T08:30:00.000Z"), now, 3)

  assert.deepEqual(status, {
    ageDays: 4,
    daysOverdue: 1,
    isOverdue: true,
  })
})

test("sorts overdue and older approval items first", () => {
  const items: ApprovalInboxItem[] = [
    makeItem("fresh", "2026-05-19T08:00:00.000Z", "danger"),
    makeItem("old-warning", "2026-05-14T08:00:00.000Z", "warning"),
    makeItem("old-danger", "2026-05-15T08:00:00.000Z", "danger"),
  ]

  assert.deepEqual(sortApprovalInboxItemsByAge(items, 3, now).map((item) => item.id), [
    "old-warning",
    "old-danger",
    "fresh",
  ])
})

function makeItem(id: string, requestedAt: string, tone: ApprovalInboxItem["tone"]): ApprovalInboxItem {
  return {
    id,
    kind: "disposal_review",
    module: "disposal",
    recordId: id,
    title: id,
    description: id,
    requestedBy: "User",
    requestedAt: new Date(requestedAt),
    actionLabel: "Open",
    href: "/th/disposal",
    tone,
  }
}
