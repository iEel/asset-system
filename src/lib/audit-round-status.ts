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

export function getAuditRoundReadOnlyError(status: string | null | undefined) {
  if (status === "cancelled") return "Audit round is cancelled"
  if (status === "closed") return "Audit round is closed"
  return null
}
