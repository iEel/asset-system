// Ages are Bangkok days whatever the machine's zone; Node reads TZ when it changes, so this applies to every Date below.
process.env.TZ = "UTC"

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
    isDueToday: false,
  })
})

const bangkokLateNow = new Date("2026-11-04T16:59:00Z") // 04 Nov 23:59 Bangkok

test("ages count Bangkok days: 02 Nov 00:30 Bangkok is 2 days old at 04 Nov 23:59", () => {
  const status = getApprovalAgeStatus(new Date("2026-11-01T17:30:00Z"), bangkokLateNow, 3)
  assert.equal(status.ageDays, 2)
  assert.equal(status.isOverdue, false)
  assert.equal(status.isDueToday, false)
})

test("an approval whose Bangkok age equals the SLA is due today, not overdue", () => {
  const status = getApprovalAgeStatus(new Date("2026-11-01T16:30:00Z"), bangkokLateNow, 3) // 01 Nov 23:30 Bangkok
  assert.equal(status.ageDays, 3)
  assert.equal(status.isDueToday, true)
  assert.equal(status.isOverdue, false)
})

test("one Bangkok day past the SLA is overdue by one day", () => {
  const status = getApprovalAgeStatus(new Date("2026-10-31T16:30:00Z"), bangkokLateNow, 3)
  assert.equal(status.ageDays, 4)
  assert.equal(status.daysOverdue, 1)
  assert.equal(status.isOverdue, true)
  assert.equal(status.isDueToday, false)
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
