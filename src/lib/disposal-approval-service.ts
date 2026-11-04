import { Prisma } from "@prisma/client"
import { writeAuditLog, type AuditLogParams } from "./audit-log-writer.ts"
import { deriveDisposalBatchStatus } from "./disposal-batch.ts"
import {
  getDisposalApprovalBlock,
  getDisposalBulkApprovalBlockCode,
  type DisposalBulkApprovalActor,
  type DisposalBulkApprovalCode,
  type DisposalBulkApprovalItem,
} from "./disposal-bulk-approval.ts"
import {
  getDisposalApprovalSodReason,
  getDisposalRestoreStatusError,
  type DisposalRestoreStatusError,
  type DisposalSodReason,
} from "./disposal-policy.ts"

// The database client and the schema check load on first use, so the reject service can run
// against a test database without the app's connection setup.
async function getPrisma() {
  const { prisma } = await import("./db.ts")
  return prisma
}

async function isDisposalBatchSchemaReady() {
  const readiness = await import("./disposal-schema-readiness.ts")
  return readiness.isDisposalBatchSchemaReady()
}

async function logAudit(params: AuditLogParams) {
  const audit = await import("./audit-log.ts")
  return audit.logAudit(params)
}

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

export type DisposalRejectCommand = {
  requestId: string
  actor: DisposalApprovalActor
  segregationRequired: boolean
  approvalRemark: string | null | undefined
  saleValue?: number | null
  salvageValue?: number | null
}

export type DisposalRejectDependencies = {
  database?: {
    $transaction<T>(
      callback: (tx: Prisma.TransactionClient) => Promise<T>,
      options?: { isolationLevel?: Prisma.TransactionIsolationLevel },
    ): Promise<T>
  }
  batchSchemaReady?: boolean
  logAudit?: (params: AuditLogParams) => Promise<void>
}

export type DisposalApprovalServiceErrorCode = DisposalBulkApprovalCode | DisposalRestoreStatusError

export class DisposalApprovalServiceError extends Error {
  readonly code: DisposalApprovalServiceErrorCode
  readonly item: { requestId: string; disposalNo: string; assetTag: string }
  readonly sodReason: DisposalSodReason | null

  constructor(
    code: DisposalApprovalServiceErrorCode,
    item: { requestId: string; disposalNo: string; assetTag: string },
    sodReason: DisposalSodReason | null = null,
  ) {
    super(code)
    this.name = "DisposalApprovalServiceError"
    this.code = code
    this.item = item
    this.sodReason = sodReason
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
  const candidates = await loadApprovalCandidates(await getPrisma(), input.requestIds, batchSchemaReady)
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
        sodReason: null,
      }
    }

    const block = getDisposalApprovalBlock(candidate, input.actor, input.segregationRequired)
    return {
      requestId: candidate.id,
      disposalNo: candidate.disposalNo,
      assetTag: candidate.asset.assetTag,
      outcome: block ? "blocked" : "eligible",
      code: block?.code ?? null,
      sodReason: block?.sodReason ?? null,
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
  const prisma = await getPrisma()
  const candidate = await loadApprovalCandidate(prisma, command.requestId, batchSchemaReady)
  if (!candidate) {
    throw new DisposalApprovalServiceError("DISPOSAL_REQUEST_NOT_FOUND", missingApprovalItem(command.requestId))
  }

  const block = getDisposalApprovalBlock(candidate, command.actor, command.segregationRequired)
  if (block) throw new DisposalApprovalServiceError(block.code, toApprovalItem(candidate), block.sodReason)

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
    if (currentBlockCode) {
      const currentBlock = getDisposalApprovalBlock(currentCandidate, command.actor, command.segregationRequired)
      throw new DisposalApprovalServiceError(currentBlockCode, toApprovalItem(currentCandidate), currentBlock?.sodReason ?? null)
    }

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
  }).catch(rethrowWriteConflictAsConcurrentUpdate(toApprovalItem(candidate)))

  return result
}

// Two decisions on one request at the same moment: SQL Server ends one of the serializable transactions as a
// deadlock victim (Prisma P2034) before its guarded update runs, so it answers as the guard would.
function rethrowWriteConflictAsConcurrentUpdate(item: { requestId: string; disposalNo: string; assetTag: string }) {
  return (error: unknown): never => {
    if (error && typeof error === "object" && "code" in error && error.code === "P2034") {
      throw new DisposalApprovalServiceError("DISPOSAL_CONCURRENT_UPDATE", item)
    }
    throw error
  }
}

const rejectCandidateBaseSelect = {
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
      status: { select: { name: true, nameTh: true, isActive: true } },
    },
  },
  previousAssetStatus: { select: { id: true, name: true, nameTh: true, isActive: true } },
} satisfies Prisma.DisposalRequestSelect

type DisposalRejectCandidate = Prisma.DisposalRequestGetPayload<{
  select: typeof rejectCandidateBaseSelect
}> & { batchId: string | null }

async function loadRejectCandidate(
  tx: Prisma.TransactionClient,
  requestId: string,
  batchSchemaReady: boolean,
): Promise<DisposalRejectCandidate | null> {
  if (batchSchemaReady) {
    return tx.disposalRequest.findFirst({
      where: { id: requestId, isActive: true },
      select: { ...rejectCandidateBaseSelect, batchId: true },
    })
  }
  const candidate = await tx.disposalRequest.findFirst({
    where: { id: requestId, isActive: true },
    select: rejectCandidateBaseSelect,
  })
  return candidate ? { ...candidate, batchId: null } : null
}

// Stage, separation of duties, the restore check and every write run in one serializable
// transaction, and the request moves only from pending, so a reject that loses the race to
// another decision answers DISPOSAL_CONCURRENT_UPDATE and leaves the asset where it is.
export async function rejectDisposalRequest(
  command: DisposalRejectCommand,
  dependencies: DisposalRejectDependencies = {},
): Promise<{ request: Awaited<ReturnType<typeof loadApprovedRequest>> }> {
  const database = dependencies.database ?? await getPrisma()
  const batchSchemaReady = dependencies.batchSchemaReady ?? await isDisposalBatchSchemaReady()
  const writeAudit = dependencies.logAudit ?? logAudit
  const requestStatus = "rejected"

  const result = await database.$transaction(async (tx) => {
    const current = await loadRejectCandidate(tx, command.requestId, batchSchemaReady)
    if (!current) {
      throw new DisposalApprovalServiceError("DISPOSAL_REQUEST_NOT_FOUND", missingApprovalItem(command.requestId))
    }
    const item = toApprovalItem(current)
    if (current.requestStatus !== "pending") throw new DisposalApprovalServiceError("DISPOSAL_INVALID_STAGE", item)

    const sodReason = getDisposalApprovalSodReason({
      segregationRequired: command.segregationRequired,
      actorEmployeeId: command.actor.employeeId,
      actorUserId: command.actor.userId,
      requestedById: current.requestedById,
      createdByUserId: current.createdBy,
    })
    if (sodReason) throw new DisposalApprovalServiceError("DISPOSAL_SOD_CONFLICT", item, sodReason)

    const restoreError = getDisposalRestoreStatusError(current.asset.status, current.previousAssetStatus)
    if (restoreError) throw new DisposalApprovalServiceError(restoreError, item)
    const restoreStatus = current.previousAssetStatus!

    const update = await tx.disposalRequest.updateMany({
      where: { id: current.id, isActive: true, requestStatus: "pending" },
      data: {
        requestStatus,
        saleValue: command.saleValue,
        salvageValue: command.salvageValue,
        approvalRemark: command.approvalRemark,
        approverId: command.actor.employeeId ?? current.approverId,
        approvedAt: new Date(),
        updatedBy: command.actor.userId,
      },
    })
    if (update.count !== 1) throw new DisposalApprovalServiceError("DISPOSAL_CONCURRENT_UPDATE", item)

    await tx.asset.update({
      where: { id: current.assetId },
      data: { statusId: restoreStatus.id, updatedBy: command.actor.userId },
    })

    await tx.assetMovement.create({
      data: {
        assetId: current.assetId,
        movementType: "disposal_reject",
        fromValue: current.asset.statusId,
        toValue: restoreStatus.id,
        reason: command.approvalRemark ?? current.reason,
        referenceType: "disposal",
        referenceId: current.id,
        performedBy: command.actor.userId,
        remark: requestStatus,
      },
    })

    if (current.batchId) {
      const children = await tx.disposalRequest.findMany({
        where: { batchId: current.batchId, isActive: true },
        select: { requestStatus: true },
      })
      await tx.disposalBatch.update({
        where: { id: current.batchId },
        data: {
          batchStatus: deriveDisposalBatchStatus(children.map((child) => child.requestStatus)),
          updatedBy: command.actor.userId,
        },
      })
    }

    return {
      request: await loadApprovedRequest(tx, current.id),
      previous: current,
      restoreStatusId: restoreStatus.id,
    }
  }, {
    isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
  }).catch(rethrowWriteConflictAsConcurrentUpdate(missingApprovalItem(command.requestId)))

  await writeAudit({
    userId: command.actor.userId,
    action: "reject",
    module: "disposal",
    recordId: command.requestId,
    oldValue: {
      requestStatus: result.previous.requestStatus,
      assetStatusId: result.previous.asset.statusId,
      saleValue: result.previous.saleValue,
      salvageValue: result.previous.salvageValue,
    },
    newValue: {
      requestStatus,
      assetStatusId: result.restoreStatusId,
      saleValue: command.saleValue,
      salvageValue: command.salvageValue,
      approvalRemark: command.approvalRemark,
    },
  })

  return { request: result.request }
}

function hasDisposalApprovalPermission(actor: DisposalApprovalActor) {
  return actor.roles.includes("system_admin") || actor.permissions.includes("disposal:approve")
}

function missingApprovalItem(requestId: string) {
  return { requestId, disposalNo: requestId, assetTag: "-" }
}

function toApprovalItem(candidate: Pick<DisposalApprovalCandidate, "id" | "disposalNo" | "asset">) {
  return {
    requestId: candidate.id,
    disposalNo: candidate.disposalNo,
    assetTag: candidate.asset.assetTag,
  }
}
