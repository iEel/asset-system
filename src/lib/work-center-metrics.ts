import type { WaitingWorkKey } from "./waiting-work-rules.ts"

// The nine waiting-work kinds the work center shares with the bell, in the source's order (spec §6.3, R12): their count,
// title, sentence, link and gate come from the waiting-work source. Returns, warranty and licence expiry stay off it.
export const WORK_CENTER_SHARED_KEYS = [
  "approvalInbox",
  "openRepairs",
  "stuckRepairs",
  "duePm",
  "pendingAuditFindings",
  "openAuditActions",
  "auditActionsDueSoon",
  "pendingDisposals",
  "approvedDisposals",
] as const satisfies readonly WaitingWorkKey[]

export type WorkCenterSharedKey = (typeof WORK_CENTER_SHARED_KEYS)[number]

// The work center's own kinds: data quality and the open rounds' unchecked items.
export const WORK_CENTER_OWN_KEYS = ["missingCustodian", "missingSerial", "missingPhoto", "pendingAuditItems"] as const

export type WorkCenterMetricKey = WorkCenterSharedKey | (typeof WORK_CENTER_OWN_KEYS)[number]

const sharedKeySet: ReadonlySet<string> = new Set(WORK_CENTER_SHARED_KEYS)

export function isWorkCenterSharedKey(key: WorkCenterMetricKey): key is WorkCenterSharedKey {
  return sharedKeySet.has(key)
}

// The cells' fixed order: the shared kinds keep the source's order, the own kinds keep their places.
const WORK_CENTER_METRIC_ORDER: readonly WorkCenterMetricKey[] = [
  "approvalInbox",
  "missingCustodian",
  "missingSerial",
  "missingPhoto",
  "openRepairs",
  "stuckRepairs",
  "duePm",
  "pendingAuditFindings",
  "openAuditActions",
  "auditActionsDueSoon",
  "pendingAuditItems",
  "pendingDisposals",
  "approvedDisposals",
]

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

// A shared kind gets its cell when the source shows it; the source already leaves out a queue the person's approval
// inbox holds (R8), so the work center adds nothing back. The own kinds always show.
export function buildWorkCenterMetricKeys(selection: { visibleKeys: readonly WaitingWorkKey[] }): WorkCenterMetricKey[] {
  const visible = new Set<string>(selection.visibleKeys)
  return WORK_CENTER_METRIC_ORDER.filter((key) => !isWorkCenterSharedKey(key) || visible.has(key))
}

export function calculateWorkCenterUrgentCount(input: WorkCenterUrgentCountInput) {
  const approvalCount = input.approvalInbox.visible ? input.approvalInbox.total : 0
  const auditCount = input.approvalInbox.visible && input.approvalInbox.audit > 0 ? 0 : input.pendingAuditFindings
  const disposalCount = input.approvalInbox.visible && input.approvalInbox.disposal > 0 ? 0 : input.pendingDisposals

  return approvalCount + auditCount + disposalCount + input.approvedDisposals
}
