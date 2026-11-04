import type { Prisma } from "@prisma/client"
import { writeAuditLogs, type AuditLogParams } from "./audit-log-writer.ts"
import { deriveDisposalBatchStatus } from "./disposal-batch.ts"
import type { DisposalApiErrorCode } from "./disposal-api-errors.ts"

// Recording an actual disposal happens only through a disposal round (group 6 spec §9.4): the single-request and bulk
// execution paths are retired, and the round (src/lib/disposal-round-service.ts) calls the in-transaction helper below.

export type DisposalExecutionActor = {
  userId: string
  employeeId?: string | null
  roles: string[]
  permissions: string[]
}

export class DisposalExecutionServiceError extends Error {
  readonly code: DisposalApiErrorCode

  constructor(code: DisposalApiErrorCode) {
    super(code)
    this.code = code
    this.name = "DisposalExecutionServiceError"
  }
}

export const disposalExecutionCandidateSelect = {
  id: true,
  disposalNo: true,
  disposalType: true,
  isActive: true,
  requestStatus: true,
  requestedById: true,
  createdBy: true,
  approverId: true,
  assetId: true,
  batchId: true,
  reason: true,
  completedAt: true,
  asset: {
    select: {
      assetTag: true,
      name: true,
      statusId: true,
      status: { select: { name: true, nameTh: true } },
    },
  },
} satisfies Prisma.DisposalRequestSelect

export type DisposalExecutionCandidate = Prisma.DisposalRequestGetPayload<{
  select: typeof disposalExecutionCandidateSelect
}>

export type DisposalRoundExecution = {
  candidate: DisposalExecutionCandidate
  // Active files on the request and on its request batch; 0 means the round's evidence exception applies to it.
  effectiveEvidenceCount: number
}

export type DisposalRoundExecutionTarget = {
  id: string
  roundNo: string
  disposalType: string
  executionDate: Date
  executedById: string
  recipientName: string | null
  documentNo: string
  remark: string | null
  disposedStatusId: string
  // The system admin's record-back exception: given, it covers every request of the round that has no evidence.
  evidenceException?: { reason: string } | null
}

type DisposalExecutionWriter = Pick<
  Prisma.TransactionClient,
  "disposalRequest" | "asset" | "assetMovement" | "maintenancePlan" | "disposalBatch" | "systemLog"
>

// Executes the checked requests of one round inside the caller's transaction, set-based so 200 machines cost a fixed
// number of statements: the requests (one update, two when some use the evidence exception), the assets, the movements,
// the PM plans, the request batches' statuses and the audit rows. A guarded update that matches fewer rows than were
// checked means another session changed one of them: DISPOSAL_CONCURRENT_UPDATE, and the caller's transaction rolls back.
export async function executeDisposalRequestInTransaction(
  tx: DisposalExecutionWriter,
  executions: readonly DisposalRoundExecution[],
  round: DisposalRoundExecutionTarget,
  actor: DisposalExecutionActor,
  now: Date,
) {
  if (executions.length === 0) return { count: 0 }
  const exception = round.evidenceException ?? null
  const usesException = (execution: DisposalRoundExecution) => exception !== null && execution.effectiveEvidenceCount === 0
  const historicalIds = executions.filter(usesException).map((execution) => execution.candidate.id)
  const regularIds = executions.filter((execution) => !usesException(execution)).map((execution) => execution.candidate.id)

  const requestData = {
    requestStatus: "disposed",
    disposalType: round.disposalType,
    roundId: round.id,
    executionDate: round.executionDate,
    executedById: round.executedById,
    recipientName: round.recipientName,
    documentNo: round.documentNo,
    // The round's lump price is the only price (user 2026-11-04): no per-request sale value.
    actualSaleValue: null,
    executionRemark: round.remark,
    completedAt: now,
    updatedBy: actor.userId,
  }
  let updated = 0
  if (regularIds.length > 0) {
    const result = await tx.disposalRequest.updateMany({
      where: { id: { in: regularIds }, requestStatus: "approved", isActive: true },
      data: { ...requestData, evidenceExceptionReason: null, evidenceExceptionGrantedBy: null, evidenceExceptionGrantedAt: null },
    })
    updated += result.count
  }
  if (exception && historicalIds.length > 0) {
    const result = await tx.disposalRequest.updateMany({
      where: { id: { in: historicalIds }, requestStatus: "approved", isActive: true },
      data: {
        ...requestData,
        evidenceExceptionReason: exception.reason,
        evidenceExceptionGrantedBy: actor.userId,
        evidenceExceptionGrantedAt: now,
      },
    })
    updated += result.count
  }
  if (updated !== executions.length) throw new DisposalExecutionServiceError("DISPOSAL_CONCURRENT_UPDATE")

  const assetIds = executions.map((execution) => execution.candidate.assetId)
  const fromStatusIds = [...new Set(executions.map((execution) => execution.candidate.asset.statusId))]
  const assetUpdate = await tx.asset.updateMany({
    where: { id: { in: assetIds }, isActive: true, statusId: { in: fromStatusIds } },
    data: { statusId: round.disposedStatusId, updatedBy: actor.userId },
  })
  if (assetUpdate.count !== new Set(assetIds).size || assetUpdate.count !== executions.length) {
    throw new DisposalExecutionServiceError("DISPOSAL_CONCURRENT_UPDATE")
  }

  await tx.assetMovement.createMany({
    data: executions.map(({ candidate }) => ({
      assetId: candidate.assetId,
      movementType: "disposal_execute",
      fromValue: candidate.asset.statusId,
      toValue: round.disposedStatusId,
      // asset_movements.reason is NVARCHAR(500); a long request reason must not fail the whole round.
      reason: (round.remark ?? candidate.reason).slice(0, 500),
      referenceType: "disposal",
      referenceId: candidate.id,
      performedBy: actor.userId,
      performedAt: round.executionDate,
      remark: `round=${round.roundNo}`,
    })),
  })

  // A disposed asset needs no more PM reminders.
  await tx.maintenancePlan.updateMany({
    where: { assetId: { in: assetIds }, planState: { not: "ended" } },
    data: { planState: "ended", isActive: false, updatedBy: actor.userId },
  })

  const batchIds = [...new Set(executions.flatMap(({ candidate }) => candidate.batchId ? [candidate.batchId] : []))]
  if (batchIds.length > 0) {
    const children = await tx.disposalRequest.findMany({
      where: { batchId: { in: batchIds }, isActive: true },
      select: { batchId: true, requestStatus: true },
    })
    for (const batchId of batchIds) {
      await tx.disposalBatch.update({
        where: { id: batchId },
        data: {
          batchStatus: deriveDisposalBatchStatus(children.filter((child) => child.batchId === batchId).map((child) => child.requestStatus)),
          updatedBy: actor.userId,
        },
      })
    }
  }

  const audits: AuditLogParams[] = executions.map((execution) => {
    const { candidate, effectiveEvidenceCount } = execution
    const historical = usesException(execution)
    return {
      userId: actor.userId,
      action: historical ? "execute_historical_without_evidence" : "execute",
      module: "disposal",
      recordId: candidate.id,
      oldValue: {
        requestStatus: candidate.requestStatus,
        assetStatusId: candidate.asset.statusId,
        disposalType: candidate.disposalType,
      },
      newValue: {
        requestStatus: "disposed",
        roundId: round.id,
        roundNo: round.roundNo,
        disposalType: round.disposalType,
        fromDisposalType: candidate.disposalType,
        executionDate: round.executionDate,
        executedById: round.executedById,
        recipientName: round.recipientName,
        documentNo: round.documentNo,
        executionRemark: round.remark,
        assetStatusId: round.disposedStatusId,
        effectiveEvidenceCount,
        evidenceExceptionReason: historical ? exception?.reason ?? null : null,
        evidenceExceptionGrantedBy: historical ? actor.userId : null,
        evidenceExceptionGrantedAt: historical ? now : null,
      },
    }
  })
  await writeAuditLogs(tx, audits)

  return { count: executions.length }
}

export function hasDisposalExecutionPermission(actor: DisposalExecutionActor) {
  return actor.roles.includes("system_admin") || actor.permissions.includes("disposal:edit")
}

// Two sessions on the same rows at once: SQL Server ends one serializable transaction as a deadlock victim (Prisma P2034).
export function isPrismaWriteConflict(error: unknown) {
  return Boolean(error && typeof error === "object" && "code" in error && error.code === "P2034")
}
