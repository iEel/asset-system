import type { Prisma } from "@prisma/client"
import { getTranslations } from "next-intl/server"
import { prisma } from "@/lib/db"
import { hasPermission, type SessionUser } from "@/lib/auth-utils"
import {
  buildApprovalInboxCounts,
  buildApprovalInboxItems,
  buildApprovalInboxPage,
  buildApprovalInboxRows,
  type ApprovalInboxAccess,
  type ApprovalInboxCopy,
  type ApprovalInboxPage,
  type ApprovalInboxQuery,
} from "@/lib/approval-inbox"
import {
  parseWorkflowApprovalPolicy,
  workflowApprovalDefaults,
  workflowApprovalSettingKeys,
  type WorkflowApprovalPolicy,
} from "@/lib/workflow-approval"
import { auditRoundOperationalWhere } from "@/lib/audit-round-status"
import { auditFindingTypeShortLabelKeys, resolveAuditFindingType } from "@/lib/audit-finding-filters"
import { listDisposalPhotos } from "@/lib/disposal-photo"
import { isDisposalBatchSchemaReady } from "@/lib/disposal-schema-readiness"
import { earliestDate } from "@/lib/waiting-work-rules"

export type { ApprovalInboxAccess } from "@/lib/approval-inbox"

export type ApprovalInboxCounts = {
  total: number
  disposal: number
  audit: number
}

// The queues the inbox holds: the pending loader, the count and the oldest all read these. The disposal-approval
// setting no longer hides anything (group 6 spec §7.2): approval is always required in code. The viewer's own disposal requests
// are in (blocked, as the bell counts them); their own findings and rounds are not.
const pendingDisposalApprovalWhere: Prisma.DisposalRequestWhereInput = { isActive: true, requestStatus: "pending" }

function pendingFindingApprovalWhere(userId: string): Prisma.AuditFindingWhereInput {
  return { reviewStatus: "pending", reportedBy: { not: userId }, auditRound: { isActive: true, status: auditRoundOperationalWhere } }
}

// Every pending record of the three sources the user may see, uncapped, with the audit user ids resolved to names.
async function loadPendingApprovalRecords(user: SessionUser, access: ApprovalInboxAccess, policy: WorkflowApprovalPolicy) {
  const [disposalRequests, auditFindings, auditRounds] = await Promise.all([
    access.canApproveDisposal
      ? prisma.disposalRequest.findMany({
          where: pendingDisposalApprovalWhere,
          select: {
            id: true,
            disposalNo: true,
            disposalType: true,
            isActive: true,
            requestStatus: true,
            requestedById: true,
            createdBy: true,
            requestDate: true,
            asset: { select: { assetTag: true, name: true, status: { select: { name: true, nameTh: true, isActive: true } } } },
            requestedBy: { select: { code: true, fullNameTh: true } },
          },
          orderBy: { requestDate: "asc" },
        })
      : Promise.resolve([]),
    access.canApproveAudit
      ? prisma.auditFinding.findMany({
          where: pendingFindingApprovalWhere(user.id),
          include: {
            auditRound: { select: { auditNo: true } },
            asset: { select: { assetTag: true, name: true } },
          },
          orderBy: { reportedAt: "asc" },
        })
      : Promise.resolve([]),
    access.canApproveAudit && policy.auditCloseRequired
      ? getAuditRoundsReadyToClose(user.id)
      : Promise.resolve([]),
  ])

  const userIds = [...new Set([...auditFindings.map((finding) => finding.reportedBy), ...auditRounds.map((round) => round.createdBy)])]
  const users = userIds.length > 0
    ? await prisma.user.findMany({ where: { id: { in: userIds } }, select: { id: true, displayName: true } })
    : []
  const userNames = new Map(users.filter((row) => row.displayName).map((row) => [row.id, row.displayName]))

  return { disposalRequests, auditFindings, auditRounds, userNames }
}

/** Today's list for the work center and the approvals page; the copy comes from the caller's `approvalInboxPage` messages. */
export async function getApprovalInboxSnapshot(user: SessionUser, locale: string, copy: ApprovalInboxCopy) {
  const access = getApprovalInboxAccess(user)
  const policy = await getWorkflowApprovalPolicy()

  const [records, summary] = await Promise.all([
    loadPendingApprovalRecords(user, access, policy),
    countApprovalInbox(user, access, policy),
  ])
  const nameOf = (userId: string) => records.userNames.get(userId) || userId

  const items = buildApprovalInboxItems({
    locale,
    copy,
    policy,
    disposalRequests: records.disposalRequests.map((request) => ({
      id: request.id,
      disposalNo: request.disposalNo,
      assetTag: request.asset.assetTag,
      assetName: request.asset.name,
      requestedBy: `${request.requestedBy.code} - ${request.requestedBy.fullNameTh}`,
      requestDate: request.requestDate,
    })),
    auditFindings: records.auditFindings.map((finding) => ({
      id: finding.id,
      auditNo: finding.auditRound.auditNo,
      findingType: finding.findingType,
      assetTag: finding.asset?.assetTag ?? null,
      reportedBy: nameOf(finding.reportedBy),
      reportedAt: finding.reportedAt,
    })),
    auditRoundsReadyToClose: records.auditRounds.map((round) => ({ ...round, createdBy: nameOf(round.createdBy) })),
  })

  return {
    access,
    policy,
    items,
    summary,
  }
}

/**
 * The approvals page's read model (group 6 spec §7.2–7.3): every pending item the user may see, sorted, filtered and
 * paged in memory, with Bangkok ages, names, block reasons, and photo counts for the visible disposal rows.
 */
export async function getApprovalInboxPage(
  user: SessionUser,
  locale: string,
  query: ApprovalInboxQuery,
  now: Date = new Date(),
): Promise<ApprovalInboxPage> {
  const access = getApprovalInboxAccess(user)
  const policy = await getWorkflowApprovalPolicy()
  const [records, tRound] = await Promise.all([
    loadPendingApprovalRecords(user, access, policy),
    getTranslations({ locale: "th", namespace: "auditRound" }),
  ])

  const rows = buildApprovalInboxRows({
    locale,
    now,
    slaDays: policy.slaDays,
    viewer: { userId: user.id, employeeId: user.employeeId },
    segregationRequired: policy.segregationRequired,
    userNames: records.userNames,
    findingTypeLabel: (findingType) => {
      const type = resolveAuditFindingType(findingType)
      return type ? tRound(auditFindingTypeShortLabelKeys[type]) : findingType
    },
    disposalRequests: records.disposalRequests.map((request) => ({
      id: request.id,
      disposalNo: request.disposalNo,
      disposalType: request.disposalType,
      isActive: request.isActive,
      requestStatus: request.requestStatus,
      requestedById: request.requestedById,
      createdBy: request.createdBy,
      requestDate: request.requestDate,
      requesterName: request.requestedBy.fullNameTh || request.requestedBy.code,
      asset: { assetTag: request.asset.assetTag, name: request.asset.name, status: request.asset.status },
    })),
    auditFindings: records.auditFindings.map((finding) => ({
      id: finding.id,
      auditNo: finding.auditRound.auditNo,
      findingType: finding.findingType,
      assetTag: finding.asset?.assetTag ?? null,
      assetName: finding.asset?.name ?? null,
      reportedBy: finding.reportedBy,
      reportedAt: finding.reportedAt,
    })),
    auditRounds: records.auditRounds,
  })

  const page = buildApprovalInboxPage({ rows }, query, now)

  // Photo counts for the visible disposal rows only; batchId is read only where the column exists.
  const visibleDisposalIds = page.rows.filter((row) => row.key === "disposal").map((row) => row.id)
  if (visibleDisposalIds.length > 0) {
    const batchIds = (await isDisposalBatchSchemaReady())
      ? new Map(
          (await prisma.disposalRequest.findMany({ where: { id: { in: visibleDisposalIds } }, select: { id: true, batchId: true } }))
            .map((request) => [request.id, request.batchId]),
        )
      : new Map<string, string | null>()
    const photos = await listDisposalPhotos(prisma, visibleDisposalIds.map((id) => ({ id, batchId: batchIds.get(id) ?? null })))
    page.rows = page.rows.map((row) => (row.key === "disposal" ? { ...row, photoCount: photos.get(row.id)?.length ?? 0 } : row))
  }

  return { access, policy, ...page }
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
    access.canApproveDisposal
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

/**
 * The inbox's items as light records for the work center's rows (group 9 plan 1 task 4): the same gates and wheres as
 * the loader and the count, with each item's age date (the request, the report, the round's last change).
 */
export async function getApprovalInboxLightRecords(user: SessionUser): Promise<{
  disposal: { id: string; requestDate: Date; disposalNo: string }[]
  findings: { id: string; reportedAt: Date; auditNo: string }[]
  rounds: { id: string; updatedAt: Date; auditNo: string }[]
}> {
  const access = getApprovalInboxAccess(user)
  if (!access.canAnyApproval) return { disposal: [], findings: [], rounds: [] }

  const policy = await getWorkflowApprovalPolicy()
  const [disposal, findings, rounds] = await Promise.all([
    access.canApproveDisposal
      ? prisma.disposalRequest.findMany({
          where: pendingDisposalApprovalWhere,
          select: { id: true, requestDate: true, disposalNo: true },
        })
      : Promise.resolve([]),
    access.canApproveAudit
      ? prisma.auditFinding.findMany({
          where: pendingFindingApprovalWhere(user.id),
          select: { id: true, reportedAt: true, auditRound: { select: { auditNo: true } } },
        })
      : Promise.resolve([]),
    access.canApproveAudit && policy.auditCloseRequired
      ? getAuditRoundsReadyToClose(user.id)
      : Promise.resolve([]),
  ])

  return {
    disposal,
    findings: findings.map((finding) => ({ id: finding.id, reportedAt: finding.reportedAt, auditNo: finding.auditRound.auditNo })),
    rounds: rounds.map((round) => ({ id: round.id, updatedAt: round.updatedAt, auditNo: round.auditNo })),
  }
}

/** The approval SLA in days (`workflow_approval_sla_days`, default 3): the approval rows' deadline is since + this. */
export async function getApprovalInboxSlaDays(): Promise<number> {
  return (await getWorkflowApprovalPolicy()).slaDays
}

// The real database counts, the same queues as the read model's strip total (the viewer's own disposal requests in).
async function countApprovalInbox(user: SessionUser, access: ApprovalInboxAccess, policy: WorkflowApprovalPolicy): Promise<ApprovalInboxCounts> {
  const [disposal, auditFindings, auditRoundsReady] = await Promise.all([
    access.canApproveDisposal
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

// Every round ready to close, uncapped, with what the rows show.
async function getAuditRoundsReadyToClose(currentUserId: string) {
  const rounds = await prisma.auditRound.findMany({
    where: { isActive: true, status: auditRoundOperationalWhere, createdBy: { not: currentUserId } },
    select: { id: true, auditNo: true, name: true, createdBy: true, updatedAt: true },
    orderBy: { updatedAt: "desc" },
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
