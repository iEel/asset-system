export type WorkCenterMetricKey =
  | "approvalInbox"
  | "missingCustodian"
  | "missingSerial"
  | "missingPhoto"
  | "openRepairs"
  | "duePm"
  | "pendingAuditFindings"
  | "openAuditActions"
  | "pendingAuditItems"
  | "pendingDisposals"
  | "approvedDisposals"

export type WorkCenterApprovalInboxCounts = {
  visible: boolean
  total: number
  disposal: number
  audit: number
}

export type WorkCenterMetricSelection = {
  approvalInbox: WorkCenterApprovalInboxCounts
}

export type WorkCenterUrgentCountInput = WorkCenterMetricSelection & {
  pendingAuditFindings: number
  pendingDisposals: number
  approvedDisposals: number
}

export function buildWorkCenterMetricKeys(
  selection: WorkCenterMetricSelection,
): WorkCenterMetricKey[] {
  const { approvalInbox } = selection
  const keys: WorkCenterMetricKey[] = []

  if (approvalInbox.visible) {
    keys.push("approvalInbox")
  }

  keys.push(
    "missingCustodian",
    "missingSerial",
    "missingPhoto",
    "openRepairs",
    "duePm",
  )

  if (!approvalInbox.visible || approvalInbox.audit === 0) {
    keys.push("pendingAuditFindings")
  }

  keys.push("openAuditActions", "pendingAuditItems")

  if (!approvalInbox.visible || approvalInbox.disposal === 0) {
    keys.push("pendingDisposals")
  }

  keys.push("approvedDisposals")

  return keys
}

export function calculateWorkCenterUrgentCount(input: WorkCenterUrgentCountInput) {
  const approvalCount = input.approvalInbox.visible ? input.approvalInbox.total : 0
  const auditCount = input.approvalInbox.visible && input.approvalInbox.audit > 0 ? 0 : input.pendingAuditFindings
  const disposalCount = input.approvalInbox.visible && input.approvalInbox.disposal > 0 ? 0 : input.pendingDisposals

  return approvalCount + auditCount + disposalCount + input.approvedDisposals
}
