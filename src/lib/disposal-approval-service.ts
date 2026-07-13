import type { Prisma } from "@prisma/client"
import { writeAuditLog } from "@/lib/audit-log"
import { prisma } from "@/lib/db"
import { deriveDisposalBatchStatus } from "@/lib/disposal-batch"
import {
  getDisposalBulkApprovalBlockCode,
  type DisposalBulkApprovalActor,
  type DisposalBulkApprovalCode,
  type DisposalBulkApprovalItem,
} from "@/lib/disposal-bulk-approval"

export type DisposalApprovalCommand = {
  requestId: string
  actor: DisposalBulkApprovalActor
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

const approvalCandidateSelect = {
  id: true,
  disposalNo: true,
  isActive: true,
  requestStatus: true,
  requestedById: true,
  createdBy: true,
  approverId: true,
  assetId: true,
  batchId: true,
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

type DisposalApprovalCandidate = Prisma.DisposalRequestGetPayload<{
  select: typeof approvalCandidateSelect
}>

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
  const candidates = await prisma.disposalRequest.findMany({
    where: { id: { in: input.requestIds } },
    select: approvalCandidateSelect,
  })
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
  const candidate = await prisma.disposalRequest.findUnique({
    where: { id: command.requestId },
    select: approvalCandidateSelect,
  })
  if (!candidate) {
    throw new DisposalApprovalServiceError("DISPOSAL_REQUEST_NOT_FOUND", {
      requestId: command.requestId,
      disposalNo: command.requestId,
      assetTag: "-",
    })
  }

  const blockCode = getDisposalBulkApprovalBlockCode(candidate, command.actor, command.segregationRequired)
  if (blockCode) throw new DisposalApprovalServiceError(blockCode, toApprovalItem(candidate))

  const approvedAt = new Date()
  const request = await prisma.$transaction(async (tx) => {
    const update = await tx.disposalRequest.updateMany({
      where: { id: candidate.id, isActive: true, requestStatus: "pending" },
      data: {
        requestStatus: "approved",
        approvalRemark: command.approvalRemark ?? null,
        approverId: command.actor.employeeId ?? candidate.approverId,
        approvedAt,
        updatedBy: command.actor.userId,
        ...(command.saleValue !== undefined ? { saleValue: command.saleValue } : {}),
        ...(command.salvageValue !== undefined ? { salvageValue: command.salvageValue } : {}),
      },
    })
    if (update.count !== 1) {
      throw new DisposalApprovalServiceError("DISPOSAL_CONCURRENT_UPDATE", toApprovalItem(candidate))
    }

    await tx.assetMovement.create({
      data: {
        assetId: candidate.assetId,
        movementType: "disposal_approve",
        fromValue: candidate.asset.statusId,
        toValue: candidate.asset.statusId,
        reason: command.approvalRemark ?? candidate.reason,
        referenceType: "disposal",
        referenceId: candidate.id,
        performedBy: command.actor.userId,
        remark: "approved",
      },
    })

    await writeAuditLog(tx, {
      userId: command.actor.userId,
      action: "approve",
      module: "disposal",
      recordId: candidate.id,
      oldValue: {
        requestStatus: candidate.requestStatus,
        saleValue: candidate.saleValue,
        salvageValue: candidate.salvageValue,
      },
      newValue: {
        requestStatus: "approved",
        saleValue: command.saleValue !== undefined ? command.saleValue : candidate.saleValue,
        salvageValue: command.salvageValue !== undefined ? command.salvageValue : candidate.salvageValue,
        approvalRemark: command.approvalRemark ?? null,
      },
    })

    if (candidate.batchId) {
      const children = await tx.disposalRequest.findMany({
        where: { batchId: candidate.batchId, isActive: true },
        select: { requestStatus: true },
      })
      await tx.disposalBatch.update({
        where: { id: candidate.batchId },
        data: {
          batchStatus: deriveDisposalBatchStatus(children.map((child) => child.requestStatus)),
          updatedBy: command.actor.userId,
        },
      })
    }

    return loadApprovedRequest(tx, candidate.id)
  })

  return { request, batchId: candidate.batchId, assetTag: candidate.asset.assetTag }
}

function toApprovalItem(candidate: DisposalApprovalCandidate) {
  return {
    requestId: candidate.id,
    disposalNo: candidate.disposalNo,
    assetTag: candidate.asset.assetTag,
  }
}
