import type { Prisma } from "@prisma/client"
import { auditRoundCoverageWhere, auditRoundOperationalWhere } from "./audit-round-status.ts"
import {
  DEFAULT_WAITING_WORK_RULES,
  auditActionsDueSoonWhere,
  openAuditActionsWhere,
  startOfBangkokDay,
  type WaitingWorkRules,
} from "./waiting-work-rules.ts"

export const auditFindingResolutionStatuses = [
  "pending",
  "action_open",
  "overdue",
  "closed",
  "approved",
  "rejected",
  "exception",
  "all",
] as const

// The bell's two action kinds (group 1 spec §6.3): reached by a link only, never a tab.
export const auditFindingWaitingStatuses = ["action_not_due", "action_due_soon"] as const

export type AuditFindingResolutionStatus =
  | (typeof auditFindingResolutionStatuses)[number]
  | (typeof auditFindingWaitingStatuses)[number]

export const openAuditFindingActionStatuses = ["planned", "in_progress", "done"] as const

const auditFindingReviewStatuses = ["pending", "approved", "rejected", "exception"] as const

export function isAuditFindingWaitingStatus(status: string): status is (typeof auditFindingWaitingStatuses)[number] {
  return auditFindingWaitingStatuses.includes(status as (typeof auditFindingWaitingStatuses)[number])
}

export function resolveAuditFindingStatus(status?: string | null): AuditFindingResolutionStatus {
  if (!status) return "pending"
  if (isAuditFindingWaitingStatus(status)) return status
  return auditFindingResolutionStatuses.includes(status as (typeof auditFindingResolutionStatuses)[number])
    ? (status as AuditFindingResolutionStatus)
    : "pending"
}

export function isOpenAuditFindingActionStatus(status: string | null | undefined) {
  return openAuditFindingActionStatuses.includes(status as (typeof openAuditFindingActionStatuses)[number])
}

function isOperationalAuditFindingStatus(status: AuditFindingResolutionStatus) {
  return status === "pending" || status === "action_open" || status === "overdue"
}

export function getAuditFindingToday(now = new Date()) {
  const today = new Date(now)
  today.setHours(0, 0, 0, 0)
  return today
}

function auditFindingSearchConditions(searchText: string): Prisma.AuditFindingWhereInput[] {
  return [
    { findingType: { contains: searchText } },
    { auditRound: { auditNo: { contains: searchText } } },
    { auditRound: { name: { contains: searchText } } },
    { asset: { assetTag: { contains: searchText } } },
    { asset: { name: { contains: searchText } } },
  ]
}

export function buildAuditFindingWhere({
  status,
  search,
  roundId,
  findingType,
  now = new Date(),
  rules = DEFAULT_WAITING_WORK_RULES,
}: {
  status?: string | null
  search?: string | null
  roundId?: string | null
  findingType?: string | null
  now?: Date
  rules?: WaitingWorkRules
}): Prisma.AuditFindingWhereInput {
  const resolvedStatus = resolveAuditFindingStatus(status)
  const searchText = search?.trim()

  // The bell's own where, narrowed under AND so a search never overwrites the OR the rule holds.
  if (isAuditFindingWaitingStatus(resolvedStatus)) {
    const today = startOfBangkokDay(now)
    const base = resolvedStatus === "action_not_due" ? openAuditActionsWhere(today, rules) : auditActionsDueSoonWhere(today, rules)
    const narrowing: Prisma.AuditFindingWhereInput[] = [
      ...(roundId ? [{ auditRoundId: roundId }] : []),
      ...(findingType ? [{ findingType }] : []),
      ...(searchText ? [{ OR: auditFindingSearchConditions(searchText) }] : []),
    ]
    return narrowing.length ? { AND: [base, ...narrowing] } : base
  }

  const where: Prisma.AuditFindingWhereInput = {}

  if (resolvedStatus === "action_open") {
    where.actionStatus = { in: [...openAuditFindingActionStatuses] }
  } else if (resolvedStatus === "overdue") {
    where.actionStatus = { in: [...openAuditFindingActionStatuses] }
    where.actionDueDate = { lt: getAuditFindingToday(now) }
  } else if (resolvedStatus === "closed") {
    where.actionStatus = "closed"
  } else if (auditFindingReviewStatuses.includes(resolvedStatus as (typeof auditFindingReviewStatuses)[number])) {
    where.reviewStatus = resolvedStatus
  }

  if (roundId) {
    where.auditRoundId = roundId
  } else if (isOperationalAuditFindingStatus(resolvedStatus)) {
    where.auditRound = { isActive: true, status: auditRoundOperationalWhere }
  } else {
    where.auditRound = { isActive: true, status: auditRoundCoverageWhere }
  }
  if (findingType) where.findingType = findingType

  if (searchText) {
    where.OR = auditFindingSearchConditions(searchText)
  }

  return where
}
