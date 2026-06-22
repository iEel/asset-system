export const successfulAuditResults = new Set(["found", "confirmed_with_parent"])

export function isSuccessfulAuditResult(auditResult: string | null | undefined) {
  return Boolean(auditResult && successfulAuditResults.has(auditResult))
}

export function isVarianceAuditResult(auditResult: string | null | undefined) {
  return Boolean(auditResult && !isSuccessfulAuditResult(auditResult) && auditResult !== "not_found" && auditResult !== "out_of_scope")
}

export function countSuccessfulAuditResultRows(
  rows: Array<{ auditResult: string | null; _count: { _all: number } }>
) {
  return rows
    .filter((row) => isSuccessfulAuditResult(row.auditResult))
    .reduce((sum, row) => sum + row._count._all, 0)
}
