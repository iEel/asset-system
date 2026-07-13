import { Prisma } from "@prisma/client"
import { writeAuditLog } from "@/lib/audit-log"
import { prisma } from "@/lib/db"
import { deriveDisposalBatchStatus } from "@/lib/disposal-batch"
import { isDisposalBatchSchemaReady } from "@/lib/disposal-schema-readiness"
import {
  getDisposalBulkApprovalBlockCode,
  type DisposalBulkApprovalActor,
  type DisposalBulkApprovalCode,
  type DisposalBulkApprovalItem,
} from "@/lib/disposal-bulk-approval"

export type DisposalApprovalActor = DisposalBulkApprovalActor & {
  roles: string[]
  permissions: string[]
}

export type DisposalApprovalCommand = {
  requestId: string
  actor: DisposalApprovalActor
  segregationRequired: boolean
  approvalRemark?: string | null
  saleValue?: number | null
  salvageValue?: number | null
}

export class DisposalApprovalServiceError extends Error {
  constructor(
    public readonly code: DisposalBulkApprovalCode,
    public readonly item: { requestId: string; disposalNo: string; assetTag: string },
  ) {
    super(code)
    this.name = "DisposalApprovalServiceError"
  }
}

const approvalCandidateBaseSelect = {
  id: true,
  disposalNo: true,
  isActive: true,
  requestStatus: true,
  requestedById: true,
  createdBy: true,
  approverId: true,
  assetId: true,
  reason: true,
  saleValue: true,
  salvageValue: true,
  asset: {
    select: {
      assetTag: true,
      statusId: true,
      status: { select: { name: true, nameTh: true } },
    },
  },
} satisfies Prisma.DisposalRequestSelect

type DisposalApprovalCandidateBase = Prisma.DisposalRequestGetPayload<{
  select: typeof approvalCandidateBaseSelect
}>
type DisposalApprovalCandidate = DisposalApprovalCandidateBase & { batchId: string | null }

type DisposalApprovalReader = Pick<Prisma.TransactionClient, "disposalRequest">

async function loadApprovalCandidate(
  db: DisposalApprovalReader,
  requestId: string,
  batchSchemaReady: boolean,
): Promise<DisposalApprovalCandidate | null> {
  if (batchSchemaReady) {
    return db.disposalRequest.findUnique({
      where: { id: requestId },
      select: { ...approvalCandidateBaseSelect, batchId: true },
    })
  }
  const candidate = await db.disposalRequest.findUnique({
    where: { id: requestId },
    select: approvalCandidateBaseSelect,
  })
  return candidate ? { ...candidate, batchId: null } : null
}

async function loadApprovalCandidates(
  db: DisposalApprovalReader,
  requestIds: string[],
  batchSchemaReady: boolean,
): Promise<DisposalApprovalCandidate[]> {
  if (batchSchemaReady) {
    return db.disposalRequest.findMany({
      where: { id: { in: requestIds } },
      select: { ...approvalCandidateBaseSelect, batchId: true },
    })
  }
  const candidates = await db.disposalRequest.findMany({
    where: { id: { in: requestIds } },
    select: approvalCandidateBaseSelect,
  })
  return candidates.map((candidate) => ({ ...candidate, batchId: null }))
}

async function loadApprovedRequest(tx: Prisma.TransactionClient, requestId: string) {
  return tx.disposalRequest.findUniqueOrThrow({
    where: { id: requestId },
    omit: { batchId: true },
  })
}

export async function inspectDisposalApprovalRequests(input: {
  requestIds: string[]
  actor: DisposalBulkApprovalActor
  segregationRequired: boolean
}): Promise<DisposalBulkApprovalItem[]> {
  const batchSchemaReady = await isDisposalBatchSchemaReady()
  const candidates = await loadApprovalCandidates(prisma, input.requestIds, batchSchemaReady)
  const candidatesById = new Map(candidates.map((candidate) => [candidate.id, candidate]))

  return input.requestIds.map((requestId) => {
    const candidate = candidatesById.get(requestId)
    if (!candidate) {
      return {
        requestId,
        disposalNo: requestId,
        assetTag: "-",
        outcome: "blocked",
        code: "DISPOSAL_REQUEST_NOT_FOUND",
      }
    }

    const code = getDisposalBulkApprovalBlockCode(candidate, input.actor, input.segregationRequired)
    return {
      requestId: candidate.id,
      disposalNo: candidate.disposalNo,
      assetTag: candidate.asset.assetTag,
      outcome: code ? "blocked" : "eligible",
      code,
    }
  })
}

export async function approveDisposalRequest(command: DisposalApprovalCommand): Promise<{
  request: Awaited<ReturnType<typeof loadApprovedRequest>>
  batchId: string | null
  assetTag: string
}> {
  if (!hasDisposalApprovalPermission(command.actor)) {
    throw new DisposalApprovalServiceError("DISPOSAL_FORBIDDEN", missingApprovalItem(command.requestId))
  }

  const batchSchemaReady = await isDisposalBatchSchemaReady()
  const candidate = await loadApprovalCandidate(prisma, command.requestId, batchSchemaReady)
  if (!candidate) {
    throw new DisposalApprovalServiceError("DISPOSAL_REQUEST_NOT_FOUND", missingApprovalItem(command.requestId))
  }

  const blockCode = getDisposalBulkApprovalBlockCode(candidate, command.actor, command.segregationRequired)
  if (blockCode) throw new DisposalApprovalServiceError(blockCode, toApprovalItem(candidate))

  const approvedAt = new Date()
  const result = await prisma.$transaction(async (tx) => {
    const currentCandidate = await loadApprovalCandidate(tx, command.requestId, batchSchemaReady)
    if (!currentCandidate) {
      throw new DisposalApprovalServiceError("DISPOSAL_REQUEST_NOT_FOUND", missingApprovalItem(command.requestId))
    }

    const currentBlockCode = getDisposalBulkApprovalBlockCode(
      currentCandidate,
      command.actor,
      command.segregationRequired,
    )
    if (currentBlockCode) throw new DisposalApprovalServiceError(currentBlockCode, toApprovalItem(currentCandidate))

    const update = await tx.disposalRequest.updateMany({
      where: { id: currentCandidate.id, isActive: true, requestStatus: "pending" },
      data: {
        requestStatus: "approved",
        approvalRemark: command.approvalRemark ?? null,
        approverId: command.actor.employeeId ?? currentCandidate.approverId,
        approvedAt,
        updatedBy: command.actor.userId,
        ...(command.saleValue !== undefined ? { saleValue: command.saleValue } : {}),
        ...(command.salvageValue !== undefined ? { salvageValue: command.salvageValue } : {}),
      },
    })
    if (update.count !== 1) {
      throw new DisposalApprovalServiceError("DISPOSAL_CONCURRENT_UPDATE", toApprovalItem(currentCandidate))
    }

    await tx.assetMovement.create({
      data: {
        assetId: currentCandidate.assetId,
        movementType: "disposal_approve",
        fromValue: currentCandidate.asset.statusId,
        toValue: currentCandidate.asset.statusId,
        reason: command.approvalRemark ?? currentCandidate.reason,
        referenceType: "disposal",
        referenceId: currentCandidate.id,
        performedBy: command.actor.userId,
        remark: "approved",
      },
    })

    await writeAuditLog(tx, {
      userId: command.actor.userId,
      action: "approve",
      module: "disposal",
      recordId: currentCandidate.id,
      oldValue: {
        requestStatus: currentCandidate.requestStatus,
        saleValue: currentCandidate.saleValue,
        salvageValue: currentCandidate.salvageValue,
      },
      newValue: {
        requestStatus: "approved",
        saleValue: command.saleValue !== undefined ? command.saleValue : currentCandidate.saleValue,
        salvageValue: command.salvageValue !== undefined ? command.salvageValue : currentCandidate.salvageValue,
        approvalRemark: command.approvalRemark ?? null,
      },
    })

    if (currentCandidate.batchId) {
      const children = await tx.disposalRequest.findMany({
        where: { batchId: currentCandidate.batchId, isActive: true },
        select: { requestStatus: true },
      })
      await tx.disposalBatch.update({
        where: { id: currentCandidate.batchId },
        data: {
          batchStatus: deriveDisposalBatchStatus(children.map((child) => child.requestStatus)),
          updatedBy: command.actor.userId,
        },
      })
    }

    return {
      request: await loadApprovedRequest(tx, currentCandidate.id),
      batchId: currentCandidate.batchId,
      assetTag: currentCandidate.asset.assetTag,
    }
  }, {
    isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
  })

  return result
}

function hasDisposalApprovalPermission(actor: DisposalApprovalActor) {
  return actor.roles.includes("system_admin") || actor.permissions.includes("disposal:approve")
}

function missingApprovalItem(requestId: string) {
  return { requestId, disposalNo: requestId, assetTag: "-" }
}

function toApprovalItem(candidate: DisposalApprovalCandidate) {
  return {
    requestId: candidate.id,
    disposalNo: candidate.disposalNo,
    assetTag: candidate.asset.assetTag,
  }
}
