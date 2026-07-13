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
  if (reason.length < 20) return "DISPOSAL_EVIDENCE_EXCEPTION_REASON_REQUIRED"
  if (!input.evidenceExceptionAcknowledged) return "DISPOSAL_EVIDENCE_EXCEPTION_ACK_REQUIRED"
  return null
}
