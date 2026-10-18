import type { FieldErrors } from "./field-errors.ts"

export type DisposalExecutionEvidenceErrorCode =
  | "DISPOSAL_EVIDENCE_REQUIRED"
  | "DISPOSAL_EVIDENCE_EXCEPTION_FORBIDDEN"
  | "DISPOSAL_EVIDENCE_EXCEPTION_REASON_REQUIRED"
  | "DISPOSAL_EVIDENCE_EXCEPTION_ACK_REQUIRED"
  | "DISPOSAL_EVIDENCE_EXCEPTION_NOT_APPLICABLE"

export function canUseHistoricalDisposalEvidenceException(roles: string[]) {
  return roles.includes("system_admin")
}

export function getDisposalExecutionEvidenceError(input: {
  roles: string[]
  effectiveEvidenceCount: number
  useHistoricalEvidenceException: boolean
  evidenceExceptionReason?: string | null
  evidenceExceptionAcknowledged: boolean
}): DisposalExecutionEvidenceErrorCode | null {
  const reason = input.evidenceExceptionReason?.trim() ?? ""
  if (!input.useHistoricalEvidenceException) {
    if (reason || input.evidenceExceptionAcknowledged) return "DISPOSAL_EVIDENCE_EXCEPTION_NOT_APPLICABLE"
    return input.effectiveEvidenceCount > 0 ? null : "DISPOSAL_EVIDENCE_REQUIRED"
  }
  if (!canUseHistoricalDisposalEvidenceException(input.roles)) return "DISPOSAL_EVIDENCE_EXCEPTION_FORBIDDEN"
  if (input.effectiveEvidenceCount > 0) return "DISPOSAL_EVIDENCE_EXCEPTION_NOT_APPLICABLE"
  if (reason.length < 20 || reason.length > 2000) return "DISPOSAL_EVIDENCE_EXCEPTION_REASON_REQUIRED"
  if (!input.evidenceExceptionAcknowledged) return "DISPOSAL_EVIDENCE_EXCEPTION_ACK_REQUIRED"
  return null
}

// The two evidence refusals that are about one field of the execution form name it (V track spec §6.2): the reason says
// what is wrong with it (empty, under 20 or over 2000 characters, counted trimmed as above), the acknowledgement is
// required. Any other code (no evidence, not an admin, an exception that does not apply) is not about a field: undefined.
export function getDisposalEvidenceFieldErrors(
  code: string | null,
  input: { evidenceExceptionReason?: string | null },
): FieldErrors | undefined {
  if (code === "DISPOSAL_EVIDENCE_EXCEPTION_REASON_REQUIRED") {
    const length = input.evidenceExceptionReason?.trim().length ?? 0
    return { evidenceExceptionReason: length === 0 ? "required" : length < 20 ? "tooShort" : "tooLong" }
  }
  if (code === "DISPOSAL_EVIDENCE_EXCEPTION_ACK_REQUIRED") return { evidenceExceptionAcknowledged: "required" }
  return undefined
}
