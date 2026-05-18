export const auditSegregationErrors = {
  closeOwnRound: "Audit round must be closed by a different approver than the creator",
  reviewOwnFinding: "Audit finding must be reviewed by a different user than the reporter",
}

export function isSameAuditActor(currentUserId: string, actorUserId?: string | null) {
  return Boolean(actorUserId && actorUserId === currentUserId)
}
