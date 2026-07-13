import type { PrismaClient } from "@prisma/client"
import {
  getDisposalBulkSelectionBlockCode,
  summarizeDisposalBulkExecution,
  type DisposalBulkExecutionCode,
  type DisposalBulkExecutionItem,
  type DisposalBulkExecutionResponse,
} from "./disposal-bulk-execution.ts"
import { getDisposalExecutionEvidenceError } from "./disposal-evidence-exception.ts"
import {
  buildDisposalExecutionInput,
  getDisposalExecutionCandidateType,
  hasDisposalExecutionPermission,
  loadDisposalExecutionCandidates,
  DisposalExecutionServiceError,
  executeDisposalRequest,
  type DisposalExecutionActor,
  type DisposalExecutionCandidate,
  type DisposalExecutionCommand,
  type DisposalExecutionDatabase,
  type DisposalExecutionDependencies,
} from "./disposal-execution-service.ts"
import {
  getDisposalApprovalAssetStatusError,
  getDisposalSegregationError,
  getDisposalStatusTargetError,
} from "./disposal-policy.ts"
import type { DisposalBatchSchemaReadiness } from "./disposal-schema-readiness.ts"
import { getDisposalExecutionFieldErrors } from "./disposal-type-policy.ts"
import type { DisposalBulkExecutionInput } from "./validations/disposal.ts"
import { parseWorkflowApprovalPolicy, workflowApprovalSettingKeys } from "./workflow-approval.ts"

export type DisposalBulkExecutionCommand = {
  actor: DisposalExecutionActor
  input: DisposalBulkExecutionInput
}

export type DisposalBulkExecutionDatabase = DisposalExecutionDatabase & {
  disposalRequest: Pick<PrismaClient["disposalRequest"], "findMany">
  attachment: Pick<PrismaClient["attachment"], "groupBy">
  systemSetting: Pick<PrismaClient["systemSetting"], "findMany">
  assetStatus: Pick<PrismaClient["assetStatus"], "findFirst">
  employee: Pick<PrismaClient["employee"], "findFirst">
}

type DisposalBulkExecutionExecutor = (
  command: DisposalExecutionCommand,
  dependencies: DisposalExecutionDependencies,
) => Promise<unknown>

export type DisposalBulkExecutionDependencies = {
  database: DisposalBulkExecutionDatabase
  batchSchemaReadiness: DisposalBatchSchemaReadiness
  now?: () => Date
  executeDisposalRequest?: DisposalBulkExecutionExecutor
  logger?: (message: string) => void
}

type CandidateEvaluation = {
  item: DisposalBulkExecutionItem
  command: DisposalExecutionCommand | null
}

type Inspection = {
  items: CandidateEvaluation[]
}

type SharedValidation = {
  blockCode: DisposalBulkExecutionCode | null
  segregationRequired: boolean
}

export async function inspectDisposalBulkExecution(
  command: DisposalBulkExecutionCommand,
  dependencies: DisposalBulkExecutionDependencies,
): Promise<DisposalBulkExecutionResponse> {
  const inspection = await inspect(command, dependencies)
  return buildResponse("preview", inspection.items.map(({ item }) => item))
}

export async function commitDisposalBulkExecution(
  command: DisposalBulkExecutionCommand,
  dependencies: DisposalBulkExecutionDependencies,
): Promise<DisposalBulkExecutionResponse> {
  const inspection = await inspect(command, dependencies)
  const items = inspection.items.map(({ item }) => item)
  const executor = dependencies.executeDisposalRequest ?? executeDisposalRequest

  for (let index = 0; index < inspection.items.length; index += 1) {
    if (inspection.items[index].item.outcome !== "eligible") continue

    const revalidation = await inspect(command, dependencies)
    const current = revalidation.items[index]
    if (!current || current.item.outcome !== "eligible" || !current.command) {
      items[index] = current?.item ?? blockedItem(command.input.requestIds[index], "DISPOSAL_REQUEST_NOT_FOUND")
      continue
    }

    try {
      await executor(current.command, {
        database: dependencies.database,
        batchSchemaReadiness: dependencies.batchSchemaReadiness,
        now: dependencies.now,
      })
      items[index] = { ...current.item, outcome: "executed" }
    } catch (error) {
      if (error instanceof DisposalExecutionServiceError) {
        items[index] = { ...current.item, outcome: "blocked", code: error.code }
        continue
      }
      ;(dependencies.logger ?? console.error)("Disposal bulk execution item failed")
      items[index] = { ...current.item, outcome: "failed", code: "DISPOSAL_BULK_EXECUTION_FAILED" }
    }
  }

  return buildResponse("commit", items)
}

async function inspect(
  command: DisposalBulkExecutionCommand,
  dependencies: DisposalBulkExecutionDependencies,
): Promise<Inspection> {
  if (dependencies.batchSchemaReadiness === "unknown") {
    return {
      items: command.input.requestIds.map((requestId) => ({
        item: blockedItem(requestId, "DISPOSAL_BATCH_SCHEMA_CHECK_FAILED"),
        command: null,
      })),
    }
  }
  if (!hasDisposalExecutionPermission(command.actor)) {
    return {
      items: command.input.requestIds.map((requestId) => ({
        item: blockedItem(requestId, "DISPOSAL_FORBIDDEN"),
        command: null,
      })),
    }
  }

  const candidates = await loadDisposalExecutionCandidates(
    dependencies.database,
    command.input.requestIds,
    dependencies.batchSchemaReadiness === "ready",
  )
  const candidatesById = new Map(candidates.map((candidate) => [candidate.id, candidate]))
  const selectedType = getDisposalExecutionCandidateType(candidatesById.get(command.input.requestIds[0]) ?? {})
  const [evidenceCounts, sharedValidation] = await Promise.all([
    loadEvidenceCounts(dependencies.database, candidates),
    loadSharedValidation(command.input, dependencies.database),
  ])

  return {
    items: command.input.requestIds.map((requestId) => {
      const candidate = candidatesById.get(requestId)
      if (!candidate) return { item: blockedItem(requestId, "DISPOSAL_REQUEST_NOT_FOUND"), command: null }

      const executionInput = buildDisposalExecutionInput(candidate, command.input)
      const code = getCandidateBlockCode({
        candidate,
        actor: command.actor,
        executionInput,
        selectedType,
        effectiveEvidenceCount: evidenceCounts.get(candidate.id) ?? 0,
        sharedValidation,
      })
      const item = toItem(candidate, code ? "blocked" : "eligible", code)
      return {
        item,
        command: code ? null : { requestId, actor: command.actor, input: executionInput },
      }
    }),
  }
}

async function loadEvidenceCounts(
  database: DisposalBulkExecutionDatabase,
  candidates: DisposalExecutionCandidate[],
) {
  const requestIds = candidates.map((candidate) => candidate.id)
  const batchIds = [...new Set(candidates.flatMap((candidate) => candidate.batchId ? [candidate.batchId] : []))]
  const [itemEvidence, batchEvidence] = await Promise.all([
    requestIds.length > 0
      ? database.attachment.groupBy({
          by: ["referenceId"],
          where: { module: "disposal", referenceId: { in: requestIds }, isActive: true },
          _count: { _all: true },
        })
      : Promise.resolve([]),
    batchIds.length > 0
      ? database.attachment.groupBy({
          by: ["referenceId"],
          where: { module: "disposal_batch", referenceId: { in: batchIds }, isActive: true },
          _count: { _all: true },
        })
      : Promise.resolve([]),
  ])
  const itemCounts = new Map(itemEvidence.map((row) => [row.referenceId, row._count._all]))
  const batchCounts = new Map(batchEvidence.map((row) => [row.referenceId, row._count._all]))

  return new Map(candidates.map((candidate) => [
    candidate.id,
    (itemCounts.get(candidate.id) ?? 0) + (batchCounts.get(candidate.batchId ?? "") ?? 0),
  ]))
}

async function loadSharedValidation(
  input: DisposalBulkExecutionInput,
  database: DisposalBulkExecutionDatabase,
): Promise<SharedValidation> {
  const [savedSettings, nextStatus, executor] = await Promise.all([
    database.systemSetting.findMany({
      where: { key: { in: [...workflowApprovalSettingKeys] } },
      select: { key: true, value: true },
    }),
    database.assetStatus.findFirst({
      where: { id: input.nextStatusId, isActive: true },
      select: { id: true, name: true, nameTh: true },
    }),
    database.employee.findFirst({
      where: { id: input.executedById, isActive: true },
      select: { id: true },
    }),
  ])
  const blockCode = !nextStatus
    ? "DISPOSAL_STATUS_NOT_FOUND"
    : getDisposalStatusTargetError("execute", nextStatus)
      ? "DISPOSAL_INVALID_STATUS_TARGET"
      : !executor
        ? "DISPOSAL_EMPLOYEE_NOT_FOUND"
        : null

  return {
    blockCode,
    segregationRequired: parseWorkflowApprovalPolicy(savedSettings).segregationRequired,
  }
}

function getCandidateBlockCode(input: {
  candidate: DisposalExecutionCandidate
  actor: DisposalExecutionActor
  executionInput: DisposalExecutionCommand["input"]
  selectedType: DisposalExecutionCommand["input"]["disposalType"] | null
  effectiveEvidenceCount: number
  sharedValidation: SharedValidation
}): DisposalBulkExecutionCode | null {
  const disposalType = getDisposalExecutionCandidateType(input.candidate)
  const selectionCode = getDisposalBulkSelectionBlockCode({ disposalType }, input.selectedType)
  if (selectionCode) return selectionCode
  if (!input.candidate.isActive) return "DISPOSAL_REQUEST_NOT_FOUND"
  if (input.candidate.requestStatus !== "approved" || input.candidate.completedAt) return "DISPOSAL_INVALID_STAGE"
  if (getDisposalApprovalAssetStatusError(input.candidate.asset.status)) return "DISPOSAL_ASSET_INELIGIBLE"
  if (getDisposalSegregationError({
    action: "execute",
    segregationRequired: input.sharedValidation.segregationRequired,
    actorEmployeeId: input.actor.employeeId,
    actorUserId: input.actor.userId,
    requestedById: input.candidate.requestedById,
    createdByUserId: input.candidate.createdBy,
    approverId: input.candidate.approverId,
    executedById: input.executionInput.executedById,
  })) return "DISPOSAL_SOD_CONFLICT"
  if (input.sharedValidation.blockCode) return input.sharedValidation.blockCode
  if (getDisposalExecutionFieldErrors(input.executionInput).length > 0) return "DISPOSAL_BULK_INVALID_SELECTION"

  return getDisposalExecutionEvidenceError({
    roles: input.actor.roles,
    effectiveEvidenceCount: input.effectiveEvidenceCount,
    useHistoricalEvidenceException: input.executionInput.useHistoricalEvidenceException,
    evidenceExceptionReason: input.executionInput.evidenceExceptionReason,
    evidenceExceptionAcknowledged: input.executionInput.evidenceExceptionAcknowledged,
  })
}

function buildResponse(
  mode: DisposalBulkExecutionResponse["mode"],
  items: DisposalBulkExecutionItem[],
): DisposalBulkExecutionResponse {
  const summary = summarizeDisposalBulkExecution(items)
  return {
    mode,
    selectedCount: summary.selected,
    eligibleCount: summary.eligible,
    blockedCount: summary.blocked,
    executedCount: summary.executed,
    failedCount: summary.failed,
    items,
  }
}

function toItem(
  candidate: DisposalExecutionCandidate,
  outcome: DisposalBulkExecutionItem["outcome"],
  code: DisposalBulkExecutionCode | null,
): DisposalBulkExecutionItem {
  return {
    requestId: candidate.id,
    disposalNo: candidate.disposalNo,
    assetLabel: candidate.asset.assetTag,
    disposalType: getDisposalExecutionCandidateType(candidate),
    outcome,
    code,
  }
}

function blockedItem(requestId: string, code: DisposalBulkExecutionCode): DisposalBulkExecutionItem {
  return {
    requestId,
    disposalNo: null,
    assetLabel: null,
    disposalType: null,
    outcome: "blocked",
    code,
  }
}
