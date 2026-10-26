import type { Prisma } from "@prisma/client"
import { prisma } from "@/lib/db"
import { hasPermission, type SessionUser } from "@/lib/auth-utils"
import { buildApprovalInboxCounts, buildApprovalInboxItems } from "@/lib/approval-inbox"
import {
  parseWorkflowApprovalPolicy,
  workflowApprovalDefaults,
  workflowApprovalSettingKeys,
  type WorkflowApprovalPolicy,
} from "@/lib/workflow-approval"
import { auditRoundOperationalWhere } from "@/lib/audit-round-status"
import { earliestDate } from "@/lib/waiting-work-rules"

export type ApprovalInboxAccess = {
  canApproveDisposal: boolean
  canApproveAudit: boolean
  canAnyApproval: boolean
}

export type ApprovalInboxCounts = {
  total: number
  disposal: number
  audit: number
}

// The queues the inbox holds: the snapshot list, the count and the oldest all read these.
const pendingDisposalApprovalWhere: Prisma.DisposalRequestWhereInput = { isActive: true, requestStatus: "pending" }

function pendingFindingApprovalWhere(userId: string): Prisma.AuditFindingWhereInput {
  return { reviewStatus: "pending", reportedBy: { not: userId }, auditRound: { isActive: true, status: auditRoundOperationalWhere } }
}

export async function getApprovalInboxSnapshot(user: SessionUser, locale: string) {
  const access = getApprovalInboxAccess(user)
  const policy = await getWorkflowApprovalPolicy()

  const [disposalRequests, auditFindings, auditRoundsReadyToClose, summary] = await Promise.all([
    access.canApproveDisposal && policy.disposalRequired
      ? prisma.disposalRequest.findMany({
          where: pendingDisposalApprovalWhere,
          omit: { batchId: true },
          include: {
            asset: { select: { assetTag: true, name: true } },
            requestedBy: { select: { code: true, fullNameTh: true } },
          },
          orderBy: { requestDate: "asc" },
          take: 50,
        })
      : Promise.resolve([]),
    access.canApproveAudit
      ? prisma.auditFinding.findMany({
          where: pendingFindingApprovalWhere(user.id),
          include: {
            auditRound: { select: { auditNo: true } },
            asset: { select: { assetTag: true } },
          },
          orderBy: { reportedAt: "asc" },
          take: 50,
        })
      : Promise.resolve([]),
    access.canApproveAudit && policy.auditCloseRequired
      ? getAuditRoundsReadyToClose(user.id)
      : Promise.resolve([]),
    countApprovalInbox(user, access, policy),
  ])

  const items = buildApprovalInboxItems({
    locale,
    policy,
    disposalRequests: disposalRequests.map((request) => ({
      id: request.id,
      disposalNo: request.disposalNo,
      assetTag: request.asset.assetTag,
      assetName: request.asset.name,
      requestedBy: `${request.requestedBy.code} - ${request.requestedBy.fullNameTh}`,
      requestDate: request.requestDate,
    })),
    auditFindings: auditFindings.map((finding) => ({
      id: finding.id,
      auditNo: finding.auditRound.auditNo,
      findingType: finding.findingType,
      assetTag: finding.asset?.assetTag ?? null,
      reportedBy: finding.reportedBy,
      reportedAt: finding.reportedAt,
    })),
    auditRoundsReadyToClose,
  })

  return {
    access,
    policy,
    items,
    summary,
  }
}

export async function getApprovalInboxCounts(user: SessionUser): Promise<ApprovalInboxCounts> {
  const access = getApprovalInboxAccess(user)
  if (!access.canAnyApproval) return { total: 0, disposal: 0, audit: 0 }

  const policy = await getWorkflowApprovalPolicy()
  return countApprovalInbox(user, access, policy)
}

// When the oldest request the inbox counts arrived, behind the same gates and wheres as the count (group 1 dashboard task 2).
export async function getApprovalInboxOldest(user: SessionUser): Promise<{ oldest: Date | null; slaDays: number }> {
  const access = getApprovalInboxAccess(user)
  if (!access.canAnyApproval) return { oldest: null, slaDays: workflowApprovalDefaults.slaDays }

  const policy = await getWorkflowApprovalPolicy()
  const [disposal, auditFindings, rounds] = await Promise.all([
    access.canApproveDisposal && policy.disposalRequired
      ? prisma.disposalRequest.aggregate({ where: pendingDisposalApprovalWhere, _min: { requestDate: true } })
      : Promise.resolve(null),
    access.canApproveAudit
      ? prisma.auditFinding.aggregate({ where: pendingFindingApprovalWhere(user.id), _min: { reportedAt: true } })
      : Promise.resolve(null),
    access.canApproveAudit && policy.auditCloseRequired
      ? getReadyAuditRoundsForClose(user.id)
      : Promise.resolve([]),
  ])

  return {
    oldest: earliestDate([disposal?._min.requestDate, auditFindings?._min.reportedAt, ...rounds.map((round) => round.updatedAt)]),
    slaDays: policy.slaDays,
  }
}

// The real database counts. The lists in the snapshot are capped (take: 50 / 100), so counting their rows stops at the cap.
async function countApprovalInbox(user: SessionUser, access: ApprovalInboxAccess, policy: WorkflowApprovalPolicy): Promise<ApprovalInboxCounts> {
  const [disposal, auditFindings, auditRoundsReady] = await Promise.all([
    access.canApproveDisposal && policy.disposalRequired
      ? prisma.disposalRequest.count({ where: pendingDisposalApprovalWhere })
      : Promise.resolve(0),
    access.canApproveAudit
      ? prisma.auditFinding.count({ where: pendingFindingApprovalWhere(user.id) })
      : Promise.resolve(0),
    access.canApproveAudit && policy.auditCloseRequired
      ? getReadyAuditRoundsForClose(user.id).then((rounds) => rounds.length)
      : Promise.resolve(0),
  ])

  return buildApprovalInboxCounts({ disposal, auditFindings, auditRoundsReady })
}

export function getApprovalInboxAccess(user: SessionUser): ApprovalInboxAccess {
  const canApproveDisposal = hasPermission(user, "disposal", "approve")
  const canApproveAudit = hasPermission(user, "audit", "approve")

  return {
    canApproveDisposal,
    canApproveAudit,
    canAnyApproval: canApproveDisposal || canApproveAudit,
  }
}

async function getWorkflowApprovalPolicy() {
  const savedSettings = await prisma.systemSetting.findMany({
    where: { key: { in: [...workflowApprovalSettingKeys] } },
    select: { key: true, value: true },
  })
  return parseWorkflowApprovalPolicy(savedSettings)
}

async function getAuditRoundsReadyToClose(currentUserId: string) {
  const rounds = await prisma.auditRound.findMany({
    where: { isActive: true, status: auditRoundOperationalWhere, createdBy: { not: currentUserId } },
    select: { id: true, auditNo: true, name: true, createdBy: true, updatedAt: true },
    orderBy: { updatedAt: "desc" },
    take: 100,
  })
  const readyRoundIds = await getReadyAuditRoundIds(rounds.map((round) => round.id))

  return rounds.filter((round) => readyRoundIds.has(round.id))
}

// Every round ready to close, uncapped, with the time it last changed.
async function getReadyAuditRoundsForClose(currentUserId: string): Promise<{ id: string; updatedAt: Date }[]> {
  const rounds = await prisma.auditRound.findMany({
    where: { isActive: true, status: auditRoundOperationalWhere, createdBy: { not: currentUserId } },
    select: { id: true, updatedAt: true },
  })
  const readyRoundIds = await getReadyAuditRoundIds(rounds.map((round) => round.id))
  return rounds.filter((round) => readyRoundIds.has(round.id))
}

async function getReadyAuditRoundIds(roundIds: string[]) {
  if (roundIds.length === 0) return new Set<string>()

  const [pendingItems, pendingFindings, openActions] = await Promise.all([
    prisma.auditItem.groupBy({
      by: ["auditRoundId"],
      where: { auditRoundId: { in: roundIds }, auditStatus: "pending" },
      _count: { _all: true },
    }),
    prisma.auditFinding.groupBy({
      by: ["auditRoundId"],
      where: { auditRoundId: { in: roundIds }, reviewStatus: "pending" },
      _count: { _all: true },
    }),
    prisma.auditFinding.groupBy({
      by: ["auditRoundId"],
      where: { auditRoundId: { in: roundIds }, actionStatus: { in: ["planned", "in_progress", "done"] } },
      _count: { _all: true },
    }),
  ])

  const blockedRoundIds = new Set<string>()
  for (const row of [...pendingItems, ...pendingFindings, ...openActions]) {
    if (row._count._all > 0) blockedRoundIds.add(row.auditRoundId)
  }

  return new Set(roundIds.filter((roundId) => !blockedRoundIds.has(roundId)))
}
