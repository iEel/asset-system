import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import test from "node:test"

import { getApprovalAgeStatus } from "../src/lib/approval-aging.ts"
import { auditRoundOperationalWhere } from "../src/lib/audit-round-status.ts"
import { buildDuePmPlanWhere } from "../src/lib/preventive-maintenance.ts"
import { openRepairRecordWhere } from "../src/lib/repair-record-policy.ts"
import {
  approvedDisposalsWhere,
  auditActionsDueSoonWhere,
  bangkokDayDiff,
  DEFAULT_WAITING_WORK_RULES,
  duePmWhere,
  earliestDate,
  licenseExpiringSoonWhere,
  openAuditActionsWhere,
  openRepairsWhere,
  pendingAuditFindingsWhere,
  pendingDisposalsWhere,
  returnsDueSoonAssetWhere,
  returnsDueSoonLoanWhere,
  startOfBangkokDay,
  stuckRepairsOldestSince,
  stuckRepairsWhere,
  WAITING_WORK_KEYS,
  waitingWorkAgeFrom,
  waitingWorkVisibleKeys,
  warrantyExpiringSoonWhere,
  type WaitingWorkAccess,
} from "../src/lib/waiting-work-rules.ts"

const at = (iso: string) => new Date(iso)
const now = at("2026-10-26T05:00:00Z") // 12:00 on 26 Oct in Bangkok
const today = startOfBangkokDay(now)

test("one order for every surface: approvals, the two repair kinds, then the bell's order; today's default days (group 1 dashboard task 1)", () => {
  assert.deepEqual([...WAITING_WORK_KEYS], [
    "approvalInbox", "openRepairs", "stuckRepairs", "duePm", "pendingAuditFindings", "openAuditActions",
    "auditActionsDueSoon", "pendingDisposals", "approvedDisposals", "returnsDueSoon", "warrantyExpiringSoon", "licenseExpiringSoon",
  ])
  assert.deepEqual(DEFAULT_WAITING_WORK_RULES, { returnDueSoonDays: 3, auditActionDueSoonDays: 7, warrantyExpiryDays: 30, licenseExpiryDays: 30 })
})

test("today is the start of the Bangkok day, whatever the hour, and days are counted between Bangkok days (group 1 dashboard task 1)", () => {
  assert.equal(today.toISOString(), "2026-10-25T17:00:00.000Z")
  assert.equal(startOfBangkokDay(at("2026-10-25T17:30:00Z")).toISOString(), "2026-10-25T17:00:00.000Z") // 00:30 on 26 Oct
  assert.equal(startOfBangkokDay(at("2026-10-25T16:59:00Z")).toISOString(), "2026-10-24T17:00:00.000Z") // 23:59 on 25 Oct
  assert.equal(bangkokDayDiff(at("2026-10-25T16:30:00Z"), now), 1) // 23:30 on 25 Oct to noon on 26 Oct
  assert.equal(bangkokDayDiff(at("2026-10-25T17:30:00Z"), now), 0) // 00:30 to noon on the same day
  assert.equal(bangkokDayDiff(now, at("2026-10-23T00:00:00Z")), -3)
  assert.equal(bangkokDayDiff(today, at("2026-11-12T00:00:00Z")), 17)
})

test("the rules module is client-safe: relative imports, Prisma for types only, no database (group 1 dashboard task 1)", () => {
  const seen = new Set<string>()
  const visit = (path: string) => {
    if (seen.has(path)) return
    seen.add(path)
    const source = readFileSync(path, "utf8")
    assert.doesNotMatch(source, /from "@\//, `${path} imports through "@/"`)
    assert.doesNotMatch(source, /^import (?!type\b)[^\n]*from "@prisma\/client"/m, `${path} imports Prisma values`)
    assert.doesNotMatch(source, /\bprisma\./, `${path} reads the database`)
    for (const [, relative] of source.matchAll(/from "\.\/([^"]+\.ts)"/g)) visit(`src/lib/${relative}`)
  }
  visit("src/lib/waiting-work-rules.ts")
  assert.ok(seen.has("src/lib/preventive-maintenance.ts") && seen.has("src/lib/repair-record-policy.ts"), "the walk follows the relative imports")
})

test("the two repair kinds: open records as the maintenance list counts them, and repair statuses without an open record (spec §6.3)", () => {
  assert.equal(openRepairsWhere, openRepairRecordWhere)
  assert.deepEqual(stuckRepairsWhere, {
    isActive: true,
    status: { name: { in: ["Pending Repair", "Under Maintenance"] } },
    maintenanceTickets: { none: openRepairRecordWhere },
  })
})

test("the bell's ten kinds keep today's rules, cut at Bangkok midnight with the settings' days; returns count active assets with such a loan (group 1 dashboard task 1)", () => {
  const rules = DEFAULT_WAITING_WORK_RULES
  const openAction = { actionStatus: { in: ["planned", "in_progress"] }, auditRound: { isActive: true, status: auditRoundOperationalWhere } }
  assert.deepEqual(duePmWhere(today), buildDuePmPlanWhere(now))
  assert.deepEqual(duePmWhere(now), buildDuePmPlanWhere(now))
  assert.deepEqual(pendingAuditFindingsWhere, { reviewStatus: "pending", auditRound: { isActive: true, status: auditRoundOperationalWhere } })
  assert.deepEqual(openAuditActionsWhere(today, rules), {
    ...openAction,
    OR: [{ actionDueDate: null }, { actionDueDate: { gt: at("2026-11-01T17:00:00.000Z") } }],
  })
  assert.deepEqual(auditActionsDueSoonWhere(today, rules), { ...openAction, actionDueDate: { lte: at("2026-11-01T17:00:00.000Z") } })
  assert.deepEqual(pendingDisposalsWhere, { isActive: true, requestStatus: "pending" })
  assert.deepEqual(approvedDisposalsWhere, { isActive: true, requestStatus: "approved" })
  const dueLoan = {
    isReturned: false,
    transactionStatus: "active",
    handoverMode: "temporary_loan",
    expectedReturnDate: { lte: at("2026-10-28T17:00:00.000Z") },
  }
  assert.deepEqual(returnsDueSoonLoanWhere(today, rules), dueLoan)
  assert.deepEqual(returnsDueSoonAssetWhere(today, rules), { isActive: true, checkouts: { some: dueLoan } })
  assert.deepEqual(warrantyExpiringSoonWhere(today, rules), {
    isActive: true,
    ownershipType: { not: "software_license" },
    warrantyEndDate: { gte: today, lte: at("2026-11-24T17:00:00.000Z") },
  })
  assert.deepEqual(licenseExpiringSoonWhere(today, { ...rules, licenseExpiryDays: 60 }), {
    isActive: true,
    ownershipType: "software_license",
    warrantyEndDate: { gte: today, lte: at("2026-12-24T17:00:00.000Z") },
  })
})

test("a kind is visible by its page's permission, and the inbox hides the queues it already holds (group 1 dashboard task 1)", () => {
  const none: WaitingWorkAccess = { approval: false, maintenance: false, audit: false, disposal: false, asset: false }
  const all: WaitingWorkAccess = { approval: true, maintenance: true, audit: true, disposal: true, asset: true }
  const emptyInbox = { audit: 0, disposal: 0 }
  assert.deepEqual(waitingWorkVisibleKeys(all, emptyInbox), [...WAITING_WORK_KEYS])
  assert.deepEqual(waitingWorkVisibleKeys(none, emptyInbox), [])
  assert.deepEqual(waitingWorkVisibleKeys({ ...none, maintenance: true }, emptyInbox), ["openRepairs", "stuckRepairs", "duePm"])
  assert.deepEqual(waitingWorkVisibleKeys({ ...none, audit: true }, emptyInbox), ["pendingAuditFindings", "openAuditActions", "auditActionsDueSoon"])
  assert.deepEqual(
    waitingWorkVisibleKeys({ ...none, approval: true, audit: true, disposal: true }, { audit: 2, disposal: 1 }),
    ["approvalInbox", "openAuditActions", "auditActionsDueSoon", "approvedDisposals"],
  )
  // Returns count assets and link to the register, so asset:view gates them like warranty and licence.
  assert.deepEqual(waitingWorkVisibleKeys({ ...none, asset: true }, emptyInbox), ["returnsDueSoon", "warrantyExpiringSoon", "licenseExpiringSoon"])
})

test("each kind's age: days since its oldest record, days to its earliest due date, or its earliest expiry (spec §6.3)", () => {
  const kinds = Object.fromEntries(WAITING_WORK_KEYS.map((key) => [key, waitingWorkAgeFrom(key, at("2026-10-20T05:00:00Z"), today, 3)?.kind]))
  assert.deepEqual(kinds, {
    approvalInbox: "age", openRepairs: "age", stuckRepairs: "age", duePm: "due",
    pendingAuditFindings: "age", openAuditActions: "due", auditActionsDueSoon: "due",
    pendingDisposals: "age", approvedDisposals: "age", returnsDueSoon: "due",
    warrantyExpiringSoon: "expires", licenseExpiringSoon: "expires",
  })
  assert.equal(waitingWorkAgeFrom("duePm", null, today, 3), null)
  // Bangkok days: 23:30 on 25 Oct is one day old today, 00:30 on 26 Oct is none.
  assert.deepEqual(waitingWorkAgeFrom("openRepairs", at("2026-10-25T16:30:00Z"), today, 3), { kind: "age", days: 1, overdue: false })
  assert.deepEqual(waitingWorkAgeFrom("openRepairs", at("2026-10-25T17:30:00Z"), today, 3), { kind: "age", days: 0, overdue: false })
  // Only approvals carry the SLA: a pending disposal 12 days old is old, not overdue.
  assert.deepEqual(waitingWorkAgeFrom("pendingDisposals", at("2026-10-14T05:00:00Z"), today, 3), { kind: "age", days: 12, overdue: false })
  assert.deepEqual(waitingWorkAgeFrom("duePm", at("2026-10-23T00:00:00Z"), today, 3), { kind: "due", days: -3, overdue: true })
  assert.deepEqual(waitingWorkAgeFrom("auditActionsDueSoon", at("2026-10-26T10:00:00Z"), today, 3), { kind: "due", days: 0, overdue: false })
  assert.deepEqual(waitingWorkAgeFrom("returnsDueSoon", at("2026-10-28T03:00:00Z"), today, 3), { kind: "due", days: 2, overdue: false })
  assert.deepEqual(waitingWorkAgeFrom("licenseExpiringSoon", at("2026-11-12T00:00:00Z"), today, 3), { kind: "expires", date: at("2026-11-12T00:00:00Z"), days: 17 })
})

// Counted on Bangkok days directly; at Bangkok noon getApprovalAgeStatus (server-local days) gives the same answer.
test("approvals are overdue once their Bangkok age passes the SLA, as getApprovalAgeStatus says at Bangkok noon (spec §6.3)", () => {
  for (const [requested, days, overdue] of [["2026-10-14T05:00:00Z", 12, true], ["2026-10-23T05:00:00Z", 3, false], ["2026-10-22T05:00:00Z", 4, true]] as const) {
    assert.deepEqual(waitingWorkAgeFrom("approvalInbox", at(requested), today, 3), { kind: "age", days, overdue })
    assert.equal(getApprovalAgeStatus(at(requested), now, 3).isOverdue, overdue, requested)
  }
})

test("the earliest of several dates, and a stuck asset dates from its move into its current status (spec §6.3)", () => {
  assert.equal(earliestDate([]), null)
  assert.deepEqual(earliestDate([null, at("2026-10-20T00:00:00Z"), undefined, at("2026-10-18T00:00:00Z")]), at("2026-10-18T00:00:00Z"))
  const assets = [
    { id: "a1", statusId: "s-pending", updatedAt: at("2026-10-20T05:00:00Z") },
    { id: "a2", statusId: "s-under", updatedAt: at("2026-10-24T05:00:00Z") },
  ]
  // a2 once moved into s-pending, but it sits in s-under now with no movement into it, so its last edit counts.
  const movements = [
    { assetId: "a1", toValue: "s-pending", _max: { performedAt: at("2026-10-16T05:00:00Z") } },
    { assetId: "a2", toValue: "s-pending", _max: { performedAt: at("2026-10-10T05:00:00Z") } },
  ]
  assert.deepEqual(stuckRepairsOldestSince(assets, movements), at("2026-10-16T05:00:00Z"))
  assert.deepEqual(stuckRepairsOldestSince([assets[1]], movements), at("2026-10-24T05:00:00Z"))
  assert.equal(stuckRepairsOldestSince([], movements), null)
})
