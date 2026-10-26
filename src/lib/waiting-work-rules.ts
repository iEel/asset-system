// The waiting work the bell, the work center and the dashboard all read (group 1 dashboard task 1).
// Client-safe: relative imports only, Prisma for types only, no database.
import type { Prisma } from "@prisma/client"

import { buildExactAssetRegisterHref } from "./asset-register-view-memory.ts"
import { auditRoundOperationalWhere } from "./audit-round-status.ts"
import { buildDuePmPlanWhere, getBangkokDateKey } from "./preventive-maintenance.ts"
import { openRepairRecordWhere } from "./repair-record-policy.ts"

// One order for every surface: approvals, the two repair kinds, then the bell's order.
export const WAITING_WORK_KEYS = [
  "approvalInbox",
  "openRepairs",
  "stuckRepairs",
  "duePm",
  "pendingAuditFindings",
  "openAuditActions",
  "auditActionsDueSoon",
  "pendingDisposals",
  "approvedDisposals",
  "returnsDueSoon",
  "warrantyExpiringSoon",
  "licenseExpiringSoon",
] as const

export type WaitingWorkKey = (typeof WAITING_WORK_KEYS)[number]
export type WaitingWorkCounts = Record<WaitingWorkKey, number>

export type WaitingWorkRules = {
  returnDueSoonDays: number
  auditActionDueSoonDays: number
  warrantyExpiryDays: number
  licenseExpiryDays: number
}

export const DEFAULT_WAITING_WORK_RULES: WaitingWorkRules = {
  returnDueSoonDays: 3,
  auditActionDueSoonDays: 7,
  warrantyExpiryDays: 30,
  licenseExpiryDays: 30,
}

const dayMs = 86_400_000

// The start of the Bangkok day that holds `now`, whatever the server's time zone.
export function startOfBangkokDay(now: Date): Date {
  return new Date(`${getBangkokDateKey(now)}T00:00:00.000+07:00`)
}

// Whole Bangkok days from `from` to `to`; negative when `to` is the earlier day.
export function bangkokDayDiff(from: Date, to: Date): number {
  return (Date.parse(getBangkokDateKey(to)) - Date.parse(getBangkokDateKey(from))) / dayMs
}

// Bangkok has no daylight saving, so a day is always 24 hours.
function addDays(date: Date, days: number) {
  return new Date(date.getTime() + days * dayMs)
}

export type WaitingWorkAccess = {
  approval: boolean
  maintenance: boolean
  audit: boolean
  disposal: boolean
  asset: boolean
}

// A kind is visible by its page's permission; the inbox hides the queues it already holds.
export function waitingWorkVisibleKeys(access: WaitingWorkAccess, inbox: { audit: number; disposal: number }): WaitingWorkKey[] {
  const visible: Record<WaitingWorkKey, boolean> = {
    approvalInbox: access.approval,
    openRepairs: access.maintenance,
    stuckRepairs: access.maintenance,
    duePm: access.maintenance,
    pendingAuditFindings: access.audit && inbox.audit === 0,
    openAuditActions: access.audit,
    auditActionsDueSoon: access.audit,
    pendingDisposals: access.disposal && inbox.disposal === 0,
    approvedDisposals: access.disposal,
    returnsDueSoon: access.asset,
    warrantyExpiringSoon: access.asset,
    licenseExpiringSoon: access.asset,
  }
  return WAITING_WORK_KEYS.filter((key) => visible[key])
}

// Repair records not yet closed or cancelled, as the maintenance list counts them.
export const openRepairsWhere: Prisma.MaintenanceTicketWhereInput = openRepairRecordWhere

// Assets in a repair status without an open repair record (spec §6.3).
export const stuckRepairsWhere: Prisma.AssetWhereInput = {
  isActive: true,
  status: { name: { in: ["Pending Repair", "Under Maintenance"] } },
  maintenanceTickets: { none: openRepairRecordWhere },
}

// Any instant of the Bangkok day gives the same where.
export function duePmWhere(day: Date): Prisma.MaintenancePlanWhereInput {
  return buildDuePmPlanWhere(day)
}

export const pendingAuditFindingsWhere: Prisma.AuditFindingWhereInput = {
  reviewStatus: "pending",
  auditRound: { isActive: true, status: auditRoundOperationalWhere },
}

const openAuditActionStatuses = ["planned", "in_progress"]

function openAuditActionBase(): Prisma.AuditFindingWhereInput {
  return {
    actionStatus: { in: openAuditActionStatuses },
    auditRound: { isActive: true, status: auditRoundOperationalWhere },
  }
}

// An open action with no due date, or due after the cut.
export function openAuditActionsWhere(today: Date, rules: WaitingWorkRules): Prisma.AuditFindingWhereInput {
  return {
    ...openAuditActionBase(),
    OR: [{ actionDueDate: null }, { actionDueDate: { gt: addDays(today, rules.auditActionDueSoonDays) } }],
  }
}

// An open action due on or before the cut.
export function auditActionsDueSoonWhere(today: Date, rules: WaitingWorkRules): Prisma.AuditFindingWhereInput {
  return {
    ...openAuditActionBase(),
    actionDueDate: { lte: addDays(today, rules.auditActionDueSoonDays) },
  }
}

export const pendingDisposalsWhere: Prisma.DisposalRequestWhereInput = { isActive: true, requestStatus: "pending" }
export const approvedDisposalsWhere: Prisma.DisposalRequestWhereInput = { isActive: true, requestStatus: "approved" }

// An open temporary loan due by the cut.
export function returnsDueSoonLoanWhere(today: Date, rules: WaitingWorkRules): Prisma.AssetCheckoutWhereInput {
  return {
    isReturned: false,
    transactionStatus: "active",
    handoverMode: "temporary_loan",
    expectedReturnDate: { lte: addDays(today, rules.returnDueSoonDays) },
  }
}

// Each active asset with such a loan, counted once.
export function returnsDueSoonAssetWhere(today: Date, rules: WaitingWorkRules): Prisma.AssetWhereInput {
  return { isActive: true, checkouts: { some: returnsDueSoonLoanWhere(today, rules) } }
}

export function warrantyExpiringSoonWhere(today: Date, rules: WaitingWorkRules): Prisma.AssetWhereInput {
  return {
    isActive: true,
    ownershipType: { not: "software_license" },
    warrantyEndDate: { gte: today, lte: addDays(today, rules.warrantyExpiryDays) },
  }
}

export function licenseExpiringSoonWhere(today: Date, rules: WaitingWorkRules): Prisma.AssetWhereInput {
  return {
    isActive: true,
    ownershipType: "software_license",
    warrantyEndDate: { gte: today, lte: addDays(today, rules.licenseExpiryDays) },
  }
}

const waitingWorkHrefs: Record<WaitingWorkKey, (locale: string) => string> = {
  approvalInbox: (locale) => `/${locale}/admin/approvals`,
  openRepairs: (locale) => `/${locale}/maintenance?status=in_progress`,
  stuckRepairs: (locale) => `/${locale}/maintenance#stuck`,
  duePm: (locale) => `/${locale}/maintenance#pm-due`,
  pendingAuditFindings: (locale) => `/${locale}/audit/findings?status=pending`,
  openAuditActions: (locale) => `/${locale}/audit/findings?status=all`,
  auditActionsDueSoon: (locale) => `/${locale}/audit/findings?status=all`,
  pendingDisposals: (locale) => `/${locale}/disposal?status=pending`,
  approvedDisposals: (locale) => `/${locale}/disposal?status=approved`,
  returnsDueSoon: (locale) => `/${locale}/asset-management/checkin`,
  warrantyExpiringSoon: (locale) => buildExactAssetRegisterHref(locale, { dataQuality: "warranty" }),
  licenseExpiringSoon: (locale) => `/${locale}/assets?ownershipType=software_license`,
}

export function buildWaitingWorkHref(locale: string, key: WaitingWorkKey): string {
  return waitingWorkHrefs[key](locale)
}
