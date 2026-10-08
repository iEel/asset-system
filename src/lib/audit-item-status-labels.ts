// Message keys (namespace auditFinding) for the status codes stored on AuditItem.
// Unknown codes return null so the caller can show the raw value instead of hiding it.

export const auditItemStatusValues = ["pending", "scanned", "reviewed", "reconciled", "out_of_scope"] as const
export type AuditItemStatus = (typeof auditItemStatusValues)[number]
export type AuditItemStatusLabelKey = `itemStatus_${AuditItemStatus}`

export const auditItemReconcileStatusValues = [
  "pending",
  "pending_investigation",
  "approved",
  "rejected",
  "exception",
  "reconciled",
  "reviewed",
] as const
export type AuditItemReconcileStatus = (typeof auditItemReconcileStatusValues)[number]
export type AuditItemReconcileStatusLabelKey = `reconcileStatus_${AuditItemReconcileStatus}`

export function getAuditItemStatusLabelKey(status: string | null | undefined): AuditItemStatusLabelKey | null {
  return status && (auditItemStatusValues as readonly string[]).includes(status)
    ? (`itemStatus_${status}` as AuditItemStatusLabelKey)
    : null
}

export function getAuditItemReconcileStatusLabelKey(
  status: string | null | undefined,
): AuditItemReconcileStatusLabelKey | null {
  return status && (auditItemReconcileStatusValues as readonly string[]).includes(status)
    ? (`reconcileStatus_${status}` as AuditItemReconcileStatusLabelKey)
    : null
}
