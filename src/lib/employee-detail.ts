export type EmployeeDetailSummaryInput = {
  currentAssetCount: number
  openCheckoutCount: number
  openMaintenanceCount: number
  pendingAuditFindingCount: number
  pendingDisposalCount: number
}

export type EmployeeFollowUpKey =
  | "former_employee_with_assets"
  | "open_checkout_returns"
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

export function buildEmployeeFollowUpItems(input: EmployeeDetailSummaryInput & { employmentStatus: string }) {
  const items: EmployeeFollowUpKey[] = []
  if (input.employmentStatus !== "active" && input.currentAssetCount > 0) items.push("former_employee_with_assets")
  if (input.openCheckoutCount > 0) items.push("open_checkout_returns")
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
