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
