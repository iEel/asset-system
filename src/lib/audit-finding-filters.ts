import type { Prisma } from "@prisma/client"

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

export type AuditFindingResolutionStatus = (typeof auditFindingResolutionStatuses)[number]

export const openAuditFindingActionStatuses = ["planned", "in_progress", "done"] as const

const auditFindingReviewStatuses = ["pending", "approved", "rejected", "exception"] as const

export function resolveAuditFindingStatus(status?: string | null): AuditFindingResolutionStatus {
  return auditFindingResolutionStatuses.includes(status as AuditFindingResolutionStatus) ? (status as AuditFindingResolutionStatus) : "pending"
}

export function isOpenAuditFindingActionStatus(status: string | null | undefined) {
  return openAuditFindingActionStatuses.includes(status as (typeof openAuditFindingActionStatuses)[number])
}

export function getAuditFindingToday(now = new Date()) {
  const today = new Date(now)
  today.setHours(0, 0, 0, 0)
  return today
}

export function buildAuditFindingWhere({
  status,
  search,
  now = new Date(),
}: {
  status?: string | null
  search?: string | null
  now?: Date
}): Prisma.AuditFindingWhereInput {
  const resolvedStatus = resolveAuditFindingStatus(status)
  const searchText = search?.trim()
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

  if (searchText) {
    where.OR = [
      { findingType: { contains: searchText } },
      { auditRound: { auditNo: { contains: searchText } } },
      { auditRound: { name: { contains: searchText } } },
      { asset: { assetTag: { contains: searchText } } },
      { asset: { name: { contains: searchText } } },
    ]
  }

  return where
}
