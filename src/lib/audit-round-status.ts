export const auditRoundReadOnlyStatuses = ["closed", "cancelled"] as const
export type AuditRoundReadOnlyStatus = (typeof auditRoundReadOnlyStatuses)[number]

export const auditRoundOperationalWhere = { notIn: [...auditRoundReadOnlyStatuses] }
export const auditRoundCoverageWhere = { not: "cancelled" }

export function isAuditRoundReadOnlyStatus(status: string | null | undefined) {
  return auditRoundReadOnlyStatuses.includes(status as AuditRoundReadOnlyStatus)
}

export function isAuditRoundOperationalStatus(status: string | null | undefined) {
  return !isAuditRoundReadOnlyStatus(status)
}

// An old draft round is an open round (group 2 spec §14): the draft step is gone, and the enum value stays in the
// schema. Its badge, its tone and the dashboard read it as open. Nothing writes "draft" any more.
export function effectiveAuditRoundStatus(status: string): string {
  return status === "draft" ? "open" : status
}

const auditRoundStatusLabelKeys = { open: "statusOpen", closed: "statusClosed", cancelled: "statusCancelled" } as const
export type AuditRoundStatusLabelKey = (typeof auditRoundStatusLabelKeys)[keyof typeof auditRoundStatusLabelKeys]

/** The auditRound message key of a round's status word, or null for an unknown value; never the code itself. */
export function auditRoundStatusLabelKey(status: string): AuditRoundStatusLabelKey | null {
  const effective = effectiveAuditRoundStatus(status)
  return Object.hasOwn(auditRoundStatusLabelKeys, effective)
    ? auditRoundStatusLabelKeys[effective as keyof typeof auditRoundStatusLabelKeys]
    : null
}

export function getAuditRoundReadOnlyError(status: string | null | undefined) {
  if (status === "cancelled") return "Audit round is cancelled"
  if (status === "closed") return "Audit round is closed"
  return null
}
