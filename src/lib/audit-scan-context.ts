export type AuditScanContext = {
  locationId: string
  departmentId: string
}

type ContextAuditItem = {
  expectedLocationId: string
  expectedDepartmentId: string | null
  auditStatus: string
}

export const emptyAuditScanContext: AuditScanContext = Object.freeze({ locationId: "", departmentId: "" })

export function buildAuditScanContextStorageKey(roundId: string) {
  return `asset-system:audit-scan-context:${roundId}`
}

export function normalizeAuditScanContext(value: Partial<AuditScanContext> | null | undefined): AuditScanContext {
  return {
    locationId: value?.locationId?.trim() ?? "",
    departmentId: value?.departmentId?.trim() ?? "",
  }
}

export function filterAuditItemsByContext<T extends ContextAuditItem>(items: T[], context: AuditScanContext) {
  return items.filter((item) => {
    if (context.locationId && item.expectedLocationId !== context.locationId) return false
    if (context.departmentId && item.expectedDepartmentId !== context.departmentId) return false
    return true
  })
}

export function summarizeAuditScanContext(items: ContextAuditItem[]) {
  const pending = items.filter((item) => item.auditStatus === "pending").length
  return {
    total: items.length,
    pending,
    processed: items.length - pending,
  }
}
