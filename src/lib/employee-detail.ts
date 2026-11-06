export type EmployeeDetailSummaryInput = {
  currentAssetCount: number
  openCheckoutCount: number
  openMaintenanceCount: number
  pendingAuditFindingCount: number
  pendingDisposalCount: number
}

export type EmployeeFollowUpKey =
  | "former_employee_with_assets"
  | "overdue_loans"
  | "open_maintenance"
  | "pending_audit_findings"
  | "pending_disposals"

export type EmployeeMaintenanceRole = "reported" | "assigned" | "inspected"

export function buildEmployeeDetailHrefs({ locale, employeeId }: { locale: string; employeeId: string }) {
  const basePath = `/${locale}/master-data/employees`
  return {
    list: basePath,
    edit: `${basePath}/${employeeId}/edit`,
    assets: `/${locale}/assets?custodianId=${employeeId}&page=1`,
  }
}

/**
 * The employee page's own address (group 7 plan 2): the way back from the return and handover forms, and the held
 * table's paging. The list it came from rides along only when it is not the plain list; a held page only past the first.
 */
export function buildEmployeePageHref(locale: string, employeeId: string, { returnTo, heldPage = 1 }: { returnTo?: string; heldPage?: number } = {}) {
  const params = new URLSearchParams()
  if (returnTo && returnTo !== `/${locale}/master-data/employees`) params.set("returnTo", returnTo)
  if (heldPage > 1) params.set("heldPage", String(heldPage))
  const query = params.toString()
  return `/${locale}/master-data/employees/${employeeId}${query ? `?${query}` : ""}`
}

export function buildEmployeeDetailSummary(input: EmployeeDetailSummaryInput) {
  const attentionCount =
    input.openCheckoutCount +
    input.openMaintenanceCount +
    input.pendingAuditFindingCount +
    input.pendingDisposalCount

  return {
    ...input,
    attentionCount,
  }
}

/** G7P2-R1: not active by employment status or by record (AD deactivated). */
export function isFormerEmployee(employee: { employmentStatus: string; isActive: boolean }): boolean {
  return employee.employmentStatus !== "active" || !employee.isActive
}

/**
 * G7P2-R4: an open regular-use handover or a loan not yet due is normal, not a follow-up; only an overdue loan is
 * (the open handover total stays in the summary counts).
 */
export function buildEmployeeFollowUpItems(
  input: EmployeeDetailSummaryInput & { employmentStatus: string; isActive: boolean; overdueLoanCount: number }
) {
  const items: EmployeeFollowUpKey[] = []
  if (isFormerEmployee(input) && input.currentAssetCount > 0) items.push("former_employee_with_assets")
  if (input.overdueLoanCount > 0) items.push("overdue_loans")
  if (input.openMaintenanceCount > 0) items.push("open_maintenance")
  if (input.pendingAuditFindingCount > 0) items.push("pending_audit_findings")
  if (input.pendingDisposalCount > 0) items.push("pending_disposals")
  return items
}

export function dedupeEmployeeMaintenanceLinks(records: Array<{ id: string; role: EmployeeMaintenanceRole }>) {
  const byId = new Map<string, { id: string; roles: EmployeeMaintenanceRole[] }>()

  for (const record of records) {
    const existing = byId.get(record.id)
    if (existing) {
      if (!existing.roles.includes(record.role)) existing.roles.push(record.role)
      continue
    }
    byId.set(record.id, { id: record.id, roles: [record.role] })
  }

  return Array.from(byId.values())
}
