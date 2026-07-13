import { disposalApiErrorCodes, type DisposalApiErrorCode } from "./disposal-api-error-codes.ts"
import type { DisposalType } from "./disposal-type-policy.ts"

export const MAX_DISPOSAL_BULK_EXECUTION_ITEMS = 20

export const disposalBulkExecutionCodes = [
  "DISPOSAL_BULK_INVALID_SELECTION",
  "DISPOSAL_BULK_MIXED_TYPES",
  "DISPOSAL_BULK_EXECUTION_FAILED",
] as const

export const disposalBulkExecutionErrorCodes = disposalApiErrorCodes

export type DisposalBulkExecutionCode =
  | (typeof disposalBulkExecutionCodes)[number]
  | DisposalApiErrorCode

export type DisposalBulkExecutionOutcome = "eligible" | "executed" | "blocked" | "failed"

export type DisposalBulkExecutionItem = {
  requestId: string
  disposalNo: string | null
  assetLabel: string | null
  disposalType: DisposalType | null
  recipientName: string | null
  recipientSource: "request" | "shared" | null
  outcome: DisposalBulkExecutionOutcome
  code: DisposalBulkExecutionCode | null
}

export type DisposalBulkExecutionSummary = {
  selected: number
  eligible: number
  blocked: number
  executed: number
  failed: number
}

export type DisposalBulkExecutionResponse = {
  mode: "preview" | "commit"
  selectedCount: number
  eligibleCount: number
  blockedCount: number
  executedCount: number
  failedCount: number
  items: DisposalBulkExecutionItem[]
}

export function normalizeDisposalBulkExecutionIds(ids: string[]) {
  return [...new Set(ids.map((id) => id.trim()).filter(Boolean))]
}

export function getDisposalBulkSelectionBlockCode(
  candidate: { disposalType?: DisposalType | null },
  selectedType: DisposalType | null | undefined,
): DisposalBulkExecutionCode | null {
  if (!candidate.disposalType || !selectedType) return "DISPOSAL_BULK_INVALID_SELECTION"
  if (candidate.disposalType !== selectedType) return "DISPOSAL_BULK_MIXED_TYPES"
  return null
}

export function summarizeDisposalBulkExecution(items: DisposalBulkExecutionItem[]): DisposalBulkExecutionSummary {
  return items.reduce((summary, item) => {
    summary.selected += 1
    summary[item.outcome] += 1
    return summary
  }, { selected: 0, eligible: 0, blocked: 0, executed: 0, failed: 0 })
}
