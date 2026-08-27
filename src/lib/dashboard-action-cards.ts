export type DashboardActionCardKey =
  | "approvalInbox"
  | "overdueMaintenance"
  | "pendingAuditFindings"
  | "pendingDisposals"
  | "approvedDisposals"

export type DashboardApprovalInboxCounts = {
  visible: boolean
  total: number
  disposal: number
  maintenance: number
  audit: number
}

export type DashboardActionCardCounts = {
  approvalInbox: DashboardApprovalInboxCounts
  overdueMaintenance: number
  pendingAuditFindings: number
  pendingDisposals: number
  approvedDisposals: number
}

export type DashboardAssetStatusRow = {
  id: string
  name: string
  count: number
}

export type DashboardAssetStatusMetric = {
  count: number
  href: string
}

export function buildDashboardActionCardKeys(
  counts: DashboardActionCardCounts,
): DashboardActionCardKey[] {
  const keys: DashboardActionCardKey[] = []
  const approvalInboxVisible = counts.approvalInbox.visible

  if (approvalInboxVisible) {
    keys.push("approvalInbox")
  }

  keys.push("overdueMaintenance")

  if (!approvalInboxVisible || counts.approvalInbox.audit === 0) {
    keys.push("pendingAuditFindings")
  }

  if (!approvalInboxVisible || counts.approvalInbox.disposal === 0) {
    keys.push("pendingDisposals")
  }

  keys.push("approvedDisposals")

  return keys
}

export function buildDashboardAssetStatusMetrics(
  locale: string,
  rows: DashboardAssetStatusRow[],
): { pendingRepair: DashboardAssetStatusMetric; underMaintenance: DashboardAssetStatusMetric } {
  return {
    pendingRepair: buildAssetStatusMetric(locale, rows.find((row) => row.name === "Pending Repair")),
    underMaintenance: buildAssetStatusMetric(locale, rows.find((row) => row.name === "Under Maintenance")),
  }
}

function buildAssetStatusMetric(locale: string, row?: DashboardAssetStatusRow): DashboardAssetStatusMetric {
  if (!row) return { count: 0, href: `/${locale}/assets` }
  const query = new URLSearchParams({ statusId: row.id })
  return { count: row.count, href: `/${locale}/assets?${query.toString()}` }
}
