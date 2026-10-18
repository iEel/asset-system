import { disposalApiErrorCodes, type DisposalApiErrorCode } from "./disposal-api-error-codes.ts"
import type { DisposalType } from "./disposal-type-policy.ts"
import { getDisposalEvidenceFieldErrors } from "./disposal-evidence-exception.ts"
import type { FieldErrors } from "./field-errors.ts"

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
  // The fields of the dialog that a blocked row names (getDisposalBulkExecutionFieldErrors); absent when none.
  fieldErrors?: FieldErrors
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

// The blocked rows whose code a field of the bulk execution dialog can fix name that field (V track spec §6.2): a
// missing recipient is the shared recipient, the evidence exception's reason and acknowledgement are their own fields.
// Every other row code is about the request itself (its document, sale value, remark, stage) and names none. The first
// row of each field wins; undefined when no row names a field.
export function getDisposalBulkExecutionFieldErrors(
  items: readonly Pick<DisposalBulkExecutionItem, "outcome" | "code">[],
  input: { evidenceExceptionReason?: string | null },
): FieldErrors | undefined {
  const fieldErrors: FieldErrors = {}
  for (const item of items) {
    if (item.outcome !== "blocked") continue
    const named = item.code === "DISPOSAL_RECIPIENT_REQUIRED"
      ? { sharedRecipientName: "recipientRequired" }
      : getDisposalEvidenceFieldErrors(item.code, input)
    for (const [key, code] of Object.entries(named ?? {})) {
      if (!(key in fieldErrors)) fieldErrors[key] = code
    }
  }
  return Object.keys(fieldErrors).length > 0 ? fieldErrors : undefined
}
