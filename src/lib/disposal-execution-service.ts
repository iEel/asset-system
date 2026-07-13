import type { Prisma } from "@prisma/client"
import { writeAuditLog } from "./audit-log-writer.ts"
import { deriveDisposalBatchStatus } from "./disposal-batch.ts"
import { getDisposalExecutionEvidenceError } from "./disposal-evidence-exception.ts"
import {
  getDisposalApprovalAssetStatusError,
  getDisposalSegregationError,
  getDisposalStatusTargetError,
} from "./disposal-policy.ts"
import type { DisposalBatchSchemaReadiness } from "./disposal-schema-readiness.ts"
import type { DisposalApiErrorCode } from "./disposal-api-errors.ts"
import { disposalTypeValues, type DisposalType } from "./disposal-type-policy.ts"
import type { DisposalExecutionInput } from "./validations/disposal.ts"
import { parseWorkflowApprovalPolicy, workflowApprovalSettingKeys } from "./workflow-approval.ts"

export type DisposalExecutionActor = {
  userId: string
  employeeId?: string | null
  roles: string[]
  permissions: string[]
}

export type DisposalExecutionCommand = {
  requestId: string
  actor: DisposalExecutionActor
  input: DisposalExecutionInput
}

export type DisposalExecutionDatabase = {
  $transaction<T>(
    callback: (transaction: Prisma.TransactionClient) => Promise<T>,
    options?: { isolationLevel?: Prisma.TransactionIsolationLevel },
  ): Promise<T>
}

export type DisposalExecutionDependencies = {
  database: DisposalExecutionDatabase
  batchSchemaReadiness: DisposalBatchSchemaReadiness
  now?: () => Date
}

export class DisposalExecutionServiceError extends Error {
  readonly code: DisposalApiErrorCode

  constructor(code: DisposalApiErrorCode) {
    super(code)
    this.code = code
    this.name = "DisposalExecutionServiceError"
  }
}

export type DisposalExecutionSharedInput = Pick<
  DisposalExecutionInput,
  | "executionDate"
  | "executedById"
  | "nextStatusId"
  | "useHistoricalEvidenceException"
  | "evidenceExceptionReason"
  | "evidenceExceptionAcknowledged"
> & {
  sharedRecipientName?: string | null
}

export const disposalExecutionCandidateBaseSelect = {
  id: true,
  disposalNo: true,
  disposalType: true,
  isActive: true,
  requestStatus: true,
  requestedById: true,
  createdBy: true,
  approverId: true,
  assetId: true,
  reason: true,
  recipientName: true,
  documentNo: true,
  saleValue: true,
  salvageValue: true,
  executionRemark: true,
  completedAt: true,
  asset: {
    select: {
      assetTag: true,
      statusId: true,
      status: { select: { name: true, nameTh: true } },
    },
  },
} satisfies Prisma.DisposalRequestSelect

export type DisposalExecutionCandidateBase = Prisma.DisposalRequestGetPayload<{
  select: typeof disposalExecutionCandidateBaseSelect
}>
export type DisposalExecutionCandidate = DisposalExecutionCandidateBase & { batchId: string | null }
export type DisposalExecutionInputCandidate = Omit<
  Pick<
    DisposalExecutionCandidate,
    | "disposalType"
    | "recipientName"
    | "documentNo"
    | "saleValue"
    | "salvageValue"
    | "executionRemark"
  >,
  "saleValue" | "salvageValue"
> & {
  saleValue: number | { toString(): string } | null
  salvageValue: number | { toString(): string } | null
}

export async function executeDisposalRequest(
  command: DisposalExecutionCommand,
  dependencies: DisposalExecutionDependencies,
) {
  if (!hasDisposalExecutionPermission(command.actor)) {
    throw new DisposalExecutionServiceError("DISPOSAL_FORBIDDEN")
  }
  if (dependencies.batchSchemaReadiness === "unknown") {
    throw new DisposalExecutionServiceError("DISPOSAL_BATCH_SCHEMA_CHECK_FAILED")
  }

  try {
    return await dependencies.database.$transaction(async (transaction) => {
      const candidate = await loadExecutionCandidate(
        transaction,
        command.requestId,
        dependencies.batchSchemaReadiness === "ready",
      )
      if (!candidate || !candidate.isActive) {
        throw new DisposalExecutionServiceError("DISPOSAL_REQUEST_NOT_FOUND")
      }
      if (candidate.requestStatus !== "approved") {
        throw new DisposalExecutionServiceError("DISPOSAL_INVALID_STAGE")
      }
      if (candidate.disposalType !== command.input.disposalType) {
        throw new DisposalExecutionServiceError("DISPOSAL_CONCURRENT_UPDATE")
      }
      if (getDisposalApprovalAssetStatusError(candidate.asset.status)) {
        throw new DisposalExecutionServiceError("DISPOSAL_ASSET_INELIGIBLE")
      }

      const savedSettings = await transaction.systemSetting.findMany({
        where: { key: { in: [...workflowApprovalSettingKeys] } },
        select: { key: true, value: true },
      })
      const workflowPolicy = parseWorkflowApprovalPolicy(savedSettings)
      const segregationError = getDisposalSegregationError({
        action: "execute",
        segregationRequired: workflowPolicy.segregationRequired,
        actorEmployeeId: command.actor.employeeId,
        actorUserId: command.actor.userId,
        requestedById: candidate.requestedById,
        createdByUserId: candidate.createdBy,
        approverId: candidate.approverId,
        executedById: command.input.executedById,
      })
      if (segregationError) throw new DisposalExecutionServiceError("DISPOSAL_SOD_CONFLICT")

      const [nextStatus, executor, itemEvidenceCount, batchEvidenceCount] = await Promise.all([
        transaction.assetStatus.findFirst({
          where: { id: command.input.nextStatusId, isActive: true },
          select: { id: true, name: true, nameTh: true },
        }),
        transaction.employee.findFirst({
          where: { id: command.input.executedById, isActive: true },
          select: { id: true },
        }),
        transaction.attachment.count({
          where: { module: "disposal", referenceId: candidate.id, isActive: true },
        }),
        candidate.batchId
          ? transaction.attachment.count({
              where: { module: "disposal_batch", referenceId: candidate.batchId, isActive: true },
            })
          : Promise.resolve(0),
      ])

      if (!nextStatus) throw new DisposalExecutionServiceError("DISPOSAL_STATUS_NOT_FOUND")
      if (getDisposalStatusTargetError("execute", nextStatus)) {
        throw new DisposalExecutionServiceError("DISPOSAL_INVALID_STATUS_TARGET")
      }
      if (!executor) throw new DisposalExecutionServiceError("DISPOSAL_EMPLOYEE_NOT_FOUND")

      const effectiveEvidenceCount = itemEvidenceCount + batchEvidenceCount
      const evidenceError = getDisposalExecutionEvidenceError({
        roles: command.actor.roles,
        effectiveEvidenceCount,
        useHistoricalEvidenceException: command.input.useHistoricalEvidenceException,
        evidenceExceptionReason: command.input.evidenceExceptionReason,
        evidenceExceptionAcknowledged: command.input.evidenceExceptionAcknowledged,
      })
      if (evidenceError) throw new DisposalExecutionServiceError(evidenceError)

      const completedAt = dependencies.now?.() ?? new Date()
      const requestUpdate = await transaction.disposalRequest.updateMany({
        where: {
          id: candidate.id,
          isActive: true,
          requestStatus: "approved",
          completedAt: null,
        },
        data: {
          requestStatus: "disposed",
          executionDate: command.input.executionDate,
          executedById: command.input.executedById,
          recipientName: command.input.recipientName,
          documentNo: command.input.documentNo,
          actualSaleValue: command.input.actualSaleValue,
          actualSalvageValue: command.input.actualSalvageValue,
          executionRemark: command.input.executionRemark,
          evidenceExceptionReason: command.input.useHistoricalEvidenceException
            ? command.input.evidenceExceptionReason
            : null,
          evidenceExceptionGrantedBy: command.input.useHistoricalEvidenceException
            ? command.actor.userId
            : null,
          evidenceExceptionGrantedAt: command.input.useHistoricalEvidenceException ? completedAt : null,
          completedAt,
          updatedBy: command.actor.userId,
        },
      })
      if (requestUpdate.count !== 1) {
        throw new DisposalExecutionServiceError("DISPOSAL_CONCURRENT_UPDATE")
      }

      const assetUpdate = await transaction.asset.updateMany({
        where: {
          id: candidate.assetId,
          isActive: true,
          statusId: candidate.asset.statusId,
        },
        data: { statusId: command.input.nextStatusId, updatedBy: command.actor.userId },
      })
      if (assetUpdate.count !== 1) {
        throw new DisposalExecutionServiceError("DISPOSAL_CONCURRENT_UPDATE")
      }

      await transaction.assetMovement.create({
        data: {
          assetId: candidate.assetId,
          movementType: "disposal_execute",
          fromValue: candidate.asset.statusId,
          toValue: command.input.nextStatusId,
          reason: command.input.executionRemark ?? candidate.reason,
          referenceType: "disposal",
          referenceId: candidate.id,
          performedBy: command.actor.userId,
          performedAt: command.input.executionDate,
          remark: command.input.documentNo,
        },
      })

      if (candidate.batchId) {
        const children = await transaction.disposalRequest.findMany({
          where: { batchId: candidate.batchId, isActive: true },
          select: { requestStatus: true },
        })
        await transaction.disposalBatch.update({
          where: { id: candidate.batchId },
          data: {
            batchStatus: deriveDisposalBatchStatus(children.map((child) => child.requestStatus)),
            updatedBy: command.actor.userId,
          },
        })
      }

      await writeAuditLog(transaction, {
        userId: command.actor.userId,
        action: command.input.useHistoricalEvidenceException
          ? "execute_historical_without_evidence"
          : "execute",
        module: "disposal",
        recordId: candidate.id,
        oldValue: {
          requestStatus: candidate.requestStatus,
          assetStatusId: candidate.asset.statusId,
        },
        newValue: {
          ...command.input,
          requestStatus: "disposed",
          effectiveEvidenceCount,
          evidenceExceptionGrantedBy: command.input.useHistoricalEvidenceException
            ? command.actor.userId
            : null,
          evidenceExceptionGrantedAt: command.input.useHistoricalEvidenceException ? completedAt : null,
        },
      })

      return {
        request: await transaction.disposalRequest.findUniqueOrThrow({
          where: { id: candidate.id },
          omit: { batchId: true },
        }),
        batchId: candidate.batchId,
        assetTag: candidate.asset.assetTag,
      }
    }, { isolationLevel: "Serializable" })
  } catch (error) {
    if (error instanceof DisposalExecutionServiceError) throw error
    if (isPrismaWriteConflict(error)) {
      throw new DisposalExecutionServiceError("DISPOSAL_CONCURRENT_UPDATE")
    }
    throw error
  }
}

async function loadExecutionCandidate(
  transaction: Prisma.TransactionClient,
  requestId: string,
  batchSchemaReady: boolean,
): Promise<DisposalExecutionCandidate | null> {
  if (batchSchemaReady) {
    return transaction.disposalRequest.findUnique({
      where: { id: requestId },
      select: { ...disposalExecutionCandidateBaseSelect, batchId: true },
    })
  }
  const candidate = await transaction.disposalRequest.findUnique({
    where: { id: requestId },
    select: disposalExecutionCandidateBaseSelect,
  })
  return candidate ? { ...candidate, batchId: null } : null
}

export async function loadDisposalExecutionCandidates(
  database: {
    disposalRequest: Pick<Prisma.TransactionClient["disposalRequest"], "findMany">
  },
  requestIds: string[],
  batchSchemaReady: boolean,
): Promise<DisposalExecutionCandidate[]> {
  if (batchSchemaReady) {
    return database.disposalRequest.findMany({
      where: { id: { in: requestIds } },
      select: { ...disposalExecutionCandidateBaseSelect, batchId: true },
    })
  }
  const candidates = await database.disposalRequest.findMany({
    where: { id: { in: requestIds } },
    select: disposalExecutionCandidateBaseSelect,
  })
  return candidates.map((candidate) => ({ ...candidate, batchId: null }))
}

export function getDisposalExecutionCandidateType(candidate: { disposalType?: string | null }) {
  return disposalTypeValues.includes(candidate.disposalType as DisposalType)
    ? candidate.disposalType as DisposalType
    : null
}

export function resolveDisposalExecutionRecipient(
  requestRecipient: string | null | undefined,
  sharedRecipient: string | null | undefined,
) {
  const requestValue = requestRecipient?.trim() || null
  if (requestValue) return { recipientName: requestValue, source: "request" as const }

  const sharedValue = sharedRecipient?.trim() || null
  return {
    recipientName: sharedValue,
    source: sharedValue ? "shared" as const : null,
  }
}

export function buildDisposalExecutionInput(
  candidate: DisposalExecutionInputCandidate,
  shared: DisposalExecutionSharedInput,
): DisposalExecutionInput {
  return {
    disposalType: getDisposalExecutionCandidateType(candidate) as DisposalType,
    executionDate: shared.executionDate,
    executedById: shared.executedById,
    nextStatusId: shared.nextStatusId,
    recipientName: resolveDisposalExecutionRecipient(
      candidate.recipientName,
      shared.sharedRecipientName,
    ).recipientName,
    documentNo: candidate.documentNo,
    actualSaleValue: candidate.saleValue == null ? null : Number(candidate.saleValue),
    actualSalvageValue: candidate.salvageValue == null ? null : Number(candidate.salvageValue),
    executionRemark: candidate.executionRemark,
    useHistoricalEvidenceException: shared.useHistoricalEvidenceException,
    evidenceExceptionReason: shared.evidenceExceptionReason,
    evidenceExceptionAcknowledged: shared.evidenceExceptionAcknowledged,
  }
}

export function hasDisposalExecutionPermission(actor: DisposalExecutionActor) {
  return actor.roles.includes("system_admin") || actor.permissions.includes("disposal:edit")
}

function isPrismaWriteConflict(error: unknown) {
  return Boolean(error && typeof error === "object" && "code" in error && error.code === "P2034")
}
