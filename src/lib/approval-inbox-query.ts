import { prisma } from "@/lib/db"
import { hasPermission, type SessionUser } from "@/lib/auth-utils"
import { buildApprovalInboxItems, summarizeApprovalInbox } from "@/lib/approval-inbox"
import { parseWorkflowApprovalPolicy, workflowApprovalSettingKeys } from "@/lib/workflow-approval"
import { auditRoundOperationalWhere } from "@/lib/audit-round-status"

export type ApprovalInboxAccess = {
  canApproveDisposal: boolean
  canCloseMaintenance: boolean
  canApproveAudit: boolean
  canAnyApproval: boolean
}

export type ApprovalInboxCounts = {
  total: number
  disposal: number
  maintenance: number
  audit: number
}

export async function getApprovalInboxSnapshot(user: SessionUser, locale: string) {
  const access = getApprovalInboxAccess(user)
  const policy = await getWorkflowApprovalPolicy()

  const [disposalRequests, maintenanceTickets, auditFindings, auditRoundsReadyToClose] = await Promise.all([
    access.canApproveDisposal && policy.disposalRequired
      ? prisma.disposalRequest.findMany({
          where: { isActive: true, requestStatus: "pending" },
          omit: { batchId: true },
          include: {
            asset: { select: { assetTag: true, name: true } },
            requestedBy: { select: { code: true, fullNameTh: true } },
          },
          orderBy: { requestDate: "asc" },
          take: 50,
        })
      : Promise.resolve([]),
    access.canCloseMaintenance && policy.maintenanceCloseRequired
      ? prisma.maintenanceTicket.findMany({
          where: { isActive: true, repairStatus: "completed" },
          include: {
            asset: { select: { assetTag: true, name: true } },
            reportedBy: { select: { code: true, fullNameTh: true } },
          },
          orderBy: { updatedAt: "asc" },
          take: 50,
        })
      : Promise.resolve([]),
    access.canApproveAudit
      ? prisma.auditFinding.findMany({
          where: { reviewStatus: "pending", reportedBy: { not: user.id }, auditRound: { isActive: true, status: auditRoundOperationalWhere } },
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
    maintenanceTickets: maintenanceTickets.map((ticket) => ({
      id: ticket.id,
      repairNo: ticket.repairNo,
      assetTag: ticket.asset.assetTag,
      assetName: ticket.asset.name,
      reportedBy: `${ticket.reportedBy.code} - ${ticket.reportedBy.fullNameTh}`,
      updatedAt: ticket.updatedAt,
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
    summary: summarizeApprovalInbox(items),
  }
}

export async function getApprovalInboxCounts(user: SessionUser): Promise<ApprovalInboxCounts> {
  const access = getApprovalInboxAccess(user)
  if (!access.canAnyApproval) return { total: 0, disposal: 0, maintenance: 0, audit: 0 }

  const policy = await getWorkflowApprovalPolicy()
  const [disposal, maintenance, auditFindings, auditRoundsReady] = await Promise.all([
    access.canApproveDisposal && policy.disposalRequired
      ? prisma.disposalRequest.count({ where: { isActive: true, requestStatus: "pending" } })
      : Promise.resolve(0),
    access.canCloseMaintenance && policy.maintenanceCloseRequired
      ? prisma.maintenanceTicket.count({ where: { isActive: true, repairStatus: "completed" } })
      : Promise.resolve(0),
    access.canApproveAudit
      ? prisma.auditFinding.count({ where: { reviewStatus: "pending", reportedBy: { not: user.id }, auditRound: { isActive: true, status: auditRoundOperationalWhere } } })
      : Promise.resolve(0),
    access.canApproveAudit && policy.auditCloseRequired
      ? getReadyAuditRoundCloseCount(user.id)
      : Promise.resolve(0),
  ])
  const audit = auditFindings + auditRoundsReady

  return {
    total: disposal + maintenance + audit,
    disposal,
    maintenance,
    audit,
  }
}

export function getApprovalInboxAccess(user: SessionUser): ApprovalInboxAccess {
  const canApproveDisposal = hasPermission(user, "disposal", "approve")
  const canCloseMaintenance = hasPermission(user, "maintenance", "edit")
  const canApproveAudit = hasPermission(user, "audit", "approve")

  return {
    canApproveDisposal,
    canCloseMaintenance,
    canApproveAudit,
    canAnyApproval: canApproveDisposal || canCloseMaintenance || canApproveAudit,
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

async function getReadyAuditRoundCloseCount(currentUserId: string) {
  const rounds = await prisma.auditRound.findMany({
    where: { isActive: true, status: auditRoundOperationalWhere, createdBy: { not: currentUserId } },
    select: { id: true },
  })
  const readyRoundIds = await getReadyAuditRoundIds(rounds.map((round) => round.id))
  return readyRoundIds.size
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
