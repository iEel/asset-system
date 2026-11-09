import type { Prisma } from "@prisma/client"
import { chunkAuditIds } from "./audit-round-counts-rules.ts"
import { writeAuditLog } from "./audit-log-writer.ts"
import type { DisposalApiErrorCode } from "./disposal-api-errors.ts"
import { canUseHistoricalDisposalEvidenceException } from "./disposal-evidence-exception.ts"
import {
  disposalExecutionCandidateSelect,
  DisposalExecutionServiceError,
  executeDisposalRequestInTransaction,
  hasDisposalExecutionPermission,
  isPrismaWriteConflict,
  type DisposalExecutionActor,
  type DisposalExecutionCandidate,
  type DisposalRoundExecution,
} from "./disposal-execution-service.ts"
import { getDisposalApprovalAssetStatusError, getDisposalSegregationError } from "./disposal-policy.ts"
import { formatDisposalRoundNumber, nextDisposalRoundSequence } from "./disposal-round-number.ts"
import { getBangkokDateKey } from "./preventive-maintenance.ts"
import { withPrismaUniqueRetry } from "./prisma-unique-retry.ts"
import type { DisposalRoundCommitInput, DisposalRoundInput } from "./validations/disposal-round.ts"
import { parseWorkflowApprovalPolicy, workflowApprovalSettingKeys } from "./workflow-approval.ts"

// A disposal round (group 6 spec §11.2): the one way to record an actual disposal. The preview names every machine
// that would be refused; the commit re-checks every machine inside one serializable transaction and saves all or none.

export type DisposalRoundActor = DisposalExecutionActor

export type DisposalRoundBlockCode =
  | "DISPOSAL_REQUEST_NOT_FOUND"
  | "DISPOSAL_INVALID_STAGE"
  | "DISPOSAL_ASSET_INELIGIBLE"
  | "DISPOSAL_SOD_CONFLICT"
  | "DISPOSAL_EVIDENCE_REQUIRED"
  // A lost request (an asset never found) is recorded only by a lost round: no other method may carry it out.
  | "DISPOSAL_ROUND_LOST_METHOD"

export type DisposalRoundItem = {
  requestId: string
  // null for an id that matches no request.
  disposalNo: string | null
  assetTag: string | null
  assetName: string | null
  // The method the request was asked under; the round's method replaces it on save.
  fromDisposalType: string | null
  // The approver's Thai name, else their code; null when no one approved it or the id matches no request (spec §11.2).
  approverName: string | null
  outcome: "eligible" | "blocked"
  code: DisposalRoundBlockCode | null
}

export type DisposalRoundPreview = {
  items: DisposalRoundItem[]
  executorOptions: Array<{ id: string; label: string }>
}

export class DisposalRoundServiceError extends Error {
  readonly code: DisposalApiErrorCode
  readonly items: DisposalRoundItem[]

  constructor(code: DisposalApiErrorCode, items: DisposalRoundItem[] = []) {
    super(code)
    this.name = "DisposalRoundServiceError"
    this.code = code
    this.items = items
  }
}

type DisposalRoundReader = Pick<
  Prisma.TransactionClient,
  "disposalRequest" | "attachment" | "systemSetting" | "employee" | "assetStatus"
>

export type DisposalRoundDatabase = DisposalRoundReader & {
  $transaction<T>(
    callback: (transaction: Prisma.TransactionClient) => Promise<T>,
    options?: { isolationLevel?: Prisma.TransactionIsolationLevel; timeout?: number; maxWait?: number },
  ): Promise<T>
}

// SQL Server takes at most 2,100 parameters per statement; an IN list stays under it.
const ID_CHUNK_SIZE = 2_000
const ROUND_TRANSACTION_OPTIONS = { isolationLevel: "Serializable", timeout: 120_000, maxWait: 10_000 } as const

type RoundCheckInput = {
  mode?: DisposalRoundInput["mode"]
  requestIds: readonly string[]
  // The round's method; unknown in a preview before it is chosen and on the queue's ticks.
  disposalType?: string | null
  executedById?: string | null
  useHistoricalEvidenceException?: boolean
}

type RoundInspection = {
  items: DisposalRoundItem[]
  executions: DisposalRoundExecution[]
  candidates: DisposalExecutionCandidate[]
  segregationRequired: boolean
}

// Today's execution checks read the candidate; the round's rows also name each request's approver.
const roundCandidateSelect = {
  ...disposalExecutionCandidateSelect,
  approver: { select: { code: true, fullNameTh: true } },
} satisfies Prisma.DisposalRequestSelect

type RoundCandidate = DisposalExecutionCandidate & { approver: { code: string; fullNameTh: string } | null }

function approverNameOf(candidate: RoundCandidate): string | null {
  if (!candidate.approver) return null
  return candidate.approver.fullNameTh?.trim() || candidate.approver.code
}

export async function previewDisposalRound(
  db: DisposalRoundDatabase,
  input: RoundCheckInput,
  actor: DisposalRoundActor,
): Promise<DisposalRoundPreview> {
  assertRoundAllowed(input, actor)
  const inspection = await inspectDisposalRound(db, input, actor)
  const approverIds = new Set(inspection.candidates.flatMap((candidate) => candidate.approverId ? [candidate.approverId] : []))
  const employees = await db.employee.findMany({
    where: { isActive: true },
    select: { id: true, code: true, fullNameTh: true },
    orderBy: { code: "asc" },
  })
  // Separation of duties: an approver of any machine in the round cannot be its executor.
  const executorOptions = employees
    .filter((employee) => !inspection.segregationRequired || !approverIds.has(employee.id))
    .map((employee) => ({ id: employee.id, label: `${employee.code} - ${employee.fullNameTh}` }))
  return { items: inspection.items, executorOptions }
}

/**
 * The queue's approved tab (spec §10.2): each request's block code for this viewer by the round's own checks, so a
 * disabled tick says what the preview would. A system admin may use the evidence exception on the round, so a request
 * without evidence stays tickable for them.
 */
export async function getDisposalRoundTickBlocks(
  db: Pick<DisposalRoundReader, "disposalRequest" | "attachment" | "systemSetting">,
  requestIds: readonly string[],
  actor: DisposalRoundActor,
): Promise<Map<string, DisposalRoundBlockCode | null>> {
  if (requestIds.length === 0) return new Map()
  const inspection = await inspectDisposalRound(
    db,
    { requestIds, useHistoricalEvidenceException: canUseHistoricalDisposalEvidenceException(actor.roles) },
    actor,
  )
  return new Map(inspection.items.map((item) => [item.requestId, item.code]))
}

export async function createDisposalRound(
  db: DisposalRoundDatabase,
  input: DisposalRoundCommitInput,
  actor: DisposalRoundActor,
  now: Date = new Date(),
): Promise<{ id: string; roundNo: string }> {
  assertRoundAllowed(input, actor)
  const documentNo = input.documentNo?.trim()
  if (!documentNo) throw new DisposalRoundServiceError("DISPOSAL_DOCUMENT_REQUIRED")
  const exception = input.useHistoricalEvidenceException && input.evidenceExceptionReason?.trim()
    ? { reason: input.evidenceExceptionReason.trim() }
    : null
  if (input.useHistoricalEvidenceException && !exception) {
    throw new DisposalRoundServiceError("DISPOSAL_EVIDENCE_EXCEPTION_REASON_REQUIRED")
  }

  const save = () => db.$transaction(async (tx) => {
    const inspection = await inspectDisposalRound(tx, input, actor)
    if (inspection.items.some((item) => item.outcome === "blocked")) {
      throw new DisposalRoundServiceError("DISPOSAL_ROUND_BLOCKED", inspection.items)
    }

    const [executor, disposedStatus] = await Promise.all([
      tx.employee.findFirst({ where: { id: input.executedById, isActive: true }, select: { id: true } }),
      tx.assetStatus.findFirst({
        where: { OR: [{ name: "Disposed" }, { nameTh: "ตัดจำหน่ายแล้ว" }] },
        select: { id: true },
      }),
    ])
    if (!executor) throw new DisposalRoundServiceError("DISPOSAL_EMPLOYEE_NOT_FOUND")
    if (!disposedStatus) throw new DisposalRoundServiceError("DISPOSAL_STATUS_NOT_FOUND")

    const bangkokDateKey = getBangkokDateKey(now)
    const roundNo = formatDisposalRoundNumber(bangkokDateKey, await nextDisposalRoundSequence(tx, bangkokDateKey))
    const fields = {
      disposalType: input.disposalType,
      executionDate: input.executionDate,
      executedById: input.executedById,
      recipientName: input.recipientName ?? null,
      documentNo,
      // The lump price belongs to a sale only.
      saleValue: input.disposalType === "sell" ? input.saleValue ?? null : null,
      remark: input.remark ?? null,
    }
    const round = await tx.disposalRound.create({
      data: { roundNo, ...fields, createdBy: actor.userId, updatedBy: actor.userId },
      select: { id: true, roundNo: true },
    })

    await writeAuditLog(tx, {
      userId: actor.userId,
      action: "create_round",
      module: "disposal_round",
      recordId: round.id,
      newValue: {
        roundNo,
        ...fields,
        requestIds: input.requestIds,
        useHistoricalEvidenceException: exception !== null,
      },
    })

    await executeDisposalRequestInTransaction(tx, inspection.executions, {
      id: round.id,
      roundNo,
      disposalType: fields.disposalType,
      executionDate: fields.executionDate,
      executedById: fields.executedById,
      recipientName: fields.recipientName,
      documentNo,
      remark: fields.remark,
      disposedStatusId: disposedStatus.id,
      evidenceException: exception,
    }, actor, now)

    return { id: round.id, roundNo }
  }, ROUND_TRANSACTION_OPTIONS)

  try {
    // Two rounds saved at once on the same Bangkok day: the later one's number collides and the whole save is retried.
    return await withPrismaUniqueRetry(save)
  } catch (error) {
    if (error instanceof DisposalRoundServiceError) throw error
    if (error instanceof DisposalExecutionServiceError) throw new DisposalRoundServiceError(error.code)
    if (isPrismaWriteConflict(error)) throw new DisposalRoundServiceError("DISPOSAL_CONCURRENT_UPDATE")
    throw error
  }
}

function assertRoundAllowed(input: { useHistoricalEvidenceException?: boolean }, actor: DisposalRoundActor) {
  if (!hasDisposalExecutionPermission(actor)) throw new DisposalRoundServiceError("DISPOSAL_FORBIDDEN")
  if (input.useHistoricalEvidenceException && !canUseHistoricalDisposalEvidenceException(actor.roles)) {
    throw new DisposalRoundServiceError("DISPOSAL_EVIDENCE_EXCEPTION_FORBIDDEN")
  }
}

// One read of every selected request and its evidence, then the per-machine checks of today's execution, in the order
// the ids were given. The round's method replaces each request's, except that a lost request keeps its method: only a
// lost round may record it (DISPOSAL_ROUND_LOST_METHOD).
async function inspectDisposalRound(
  db: Pick<DisposalRoundReader, "disposalRequest" | "attachment" | "systemSetting">,
  input: RoundCheckInput,
  actor: DisposalRoundActor,
): Promise<RoundInspection> {
  const requestIds = [...input.requestIds]
  const [candidateChunks, savedSettings] = await Promise.all([
    Promise.all(chunkAuditIds(requestIds, ID_CHUNK_SIZE).map((ids) => db.disposalRequest.findMany({
      where: { id: { in: ids } },
      select: roundCandidateSelect,
    }) as Promise<RoundCandidate[]>)),
    db.systemSetting.findMany({
      where: { key: { in: [...workflowApprovalSettingKeys] } },
      select: { key: true, value: true },
    }),
  ])
  const candidates = candidateChunks.flat()
  const segregationRequired = parseWorkflowApprovalPolicy(savedSettings).segregationRequired
  const evidenceCounts = await loadEvidenceCounts(db, candidates)
  const candidatesById = new Map(candidates.map((candidate) => [candidate.id, candidate]))
  const exceptionApplies = Boolean(input.useHistoricalEvidenceException) && canUseHistoricalDisposalEvidenceException(actor.roles)

  const items: DisposalRoundItem[] = []
  const executions: DisposalRoundExecution[] = []
  for (const requestId of requestIds) {
    const candidate = candidatesById.get(requestId)
    if (!candidate) {
      items.push({ requestId, disposalNo: null, assetTag: null, assetName: null, fromDisposalType: null, approverName: null, outcome: "blocked", code: "DISPOSAL_REQUEST_NOT_FOUND" })
      continue
    }
    const effectiveEvidenceCount = evidenceCounts.get(candidate.id) ?? 0
    const code = getRoundBlockCode(candidate, {
      actor,
      executedById: input.executedById ?? null,
      segregationRequired,
      hasEvidence: effectiveEvidenceCount > 0 || exceptionApplies,
      roundDisposalType: input.disposalType ?? null,
    })
    items.push({
      requestId: candidate.id,
      disposalNo: candidate.disposalNo,
      assetTag: candidate.asset.assetTag,
      assetName: candidate.asset.name,
      fromDisposalType: candidate.disposalType,
      approverName: approverNameOf(candidate),
      outcome: code ? "blocked" : "eligible",
      code,
    })
    if (!code) executions.push({ candidate, effectiveEvidenceCount })
  }
  return { items, executions, candidates, segregationRequired }
}

function getRoundBlockCode(
  candidate: DisposalExecutionCandidate,
  context: {
    actor: DisposalRoundActor
    executedById: string | null
    segregationRequired: boolean
    hasEvidence: boolean
    roundDisposalType: string | null
  },
): DisposalRoundBlockCode | null {
  if (!candidate.isActive) return "DISPOSAL_REQUEST_NOT_FOUND"
  if (candidate.requestStatus !== "approved" || candidate.completedAt) return "DISPOSAL_INVALID_STAGE"
  if (getDisposalApprovalAssetStatusError(candidate.asset.status)) return "DISPOSAL_ASSET_INELIGIBLE"
  if (candidate.disposalType === "lost" && context.roundDisposalType && context.roundDisposalType !== "lost") {
    return "DISPOSAL_ROUND_LOST_METHOD"
  }
  if (getDisposalSegregationError({
    action: "execute",
    segregationRequired: context.segregationRequired,
    actorEmployeeId: context.actor.employeeId,
    actorUserId: context.actor.userId,
    requestedById: candidate.requestedById,
    createdByUserId: candidate.createdBy,
    approverId: candidate.approverId,
    executedById: context.executedById,
  })) return "DISPOSAL_SOD_CONFLICT"
  if (!context.hasEvidence) return "DISPOSAL_EVIDENCE_REQUIRED"
  return null
}

// Active files on each request plus those on its request batch, as today's execution counts them.
async function loadEvidenceCounts(db: Pick<Prisma.TransactionClient, "attachment">, candidates: DisposalExecutionCandidate[]) {
  const requestIds = candidates.map((candidate) => candidate.id)
  const batchIds = [...new Set(candidates.flatMap((candidate) => candidate.batchId ? [candidate.batchId] : []))]
  const groupBy = (module: string, ids: string[]) => Promise.all(chunkAuditIds(ids, ID_CHUNK_SIZE).map((chunk) => db.attachment.groupBy({
    by: ["referenceId"],
    where: { module, referenceId: { in: chunk }, isActive: true },
    _count: { _all: true },
  })))
  const [itemEvidence, batchEvidence] = await Promise.all([groupBy("disposal", requestIds), groupBy("disposal_batch", batchIds)])
  const itemCounts = new Map(itemEvidence.flat().map((row) => [row.referenceId, row._count._all]))
  const batchCounts = new Map(batchEvidence.flat().map((row) => [row.referenceId, row._count._all]))
  return new Map(candidates.map((candidate) => [
    candidate.id,
    (itemCounts.get(candidate.id) ?? 0) + (candidate.batchId ? batchCounts.get(candidate.batchId) ?? 0 : 0),
  ]))
}
