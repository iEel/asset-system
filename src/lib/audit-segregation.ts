export const auditSegregationErrors = {
  closeOwnRound: "Audit round must be closed by a different approver than the creator",
  reviewOwnFinding: "Audit finding must be reviewed by a different user than the reporter",
}

export function isSameAuditActor(currentUserId: string, actorUserId?: string | null) {
  return Boolean(actorUserId && actorUserId === currentUserId)
}

// Correcting master data from a scan approves the scanner's own finding. That is allowed only
// for approvers, and only when the organization has switched segregation of duties off.
export function canApplyAuditScanCorrections(input: { canApprove: boolean; segregationRequired: boolean }) {
  return input.canApprove && !input.segregationRequired
}
