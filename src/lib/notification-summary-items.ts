import { buildWaitingWorkHref, WAITING_WORK_KEYS, type WaitingWorkCounts, type WaitingWorkKey } from "./waiting-work-rules.ts"

export type NotificationSummaryItem = {
  key: string
  count: number
  href: string
  tone: "danger" | "warning" | "primary"
}

export type NotificationSummaryCounts = WaitingWorkCounts

const notificationTones: Record<WaitingWorkKey, NotificationSummaryItem["tone"]> = {
  approvalInbox: "danger",
  openRepairs: "warning",
  stuckRepairs: "warning",
  duePm: "warning",
  pendingAuditFindings: "warning",
  openAuditActions: "warning",
  auditActionsDueSoon: "danger",
  pendingDisposals: "danger",
  approvedDisposals: "warning",
  returnsDueSoon: "primary",
  warrantyExpiringSoon: "warning",
  licenseExpiringSoon: "warning",
}

export function buildNotificationSummaryItems(locale: string, counts: WaitingWorkCounts): NotificationSummaryItem[] {
  return WAITING_WORK_KEYS.map((key) => ({
    key,
    count: counts[key],
    href: buildWaitingWorkHref(locale, key),
    tone: notificationTones[key],
  })).filter((item) => item.count > 0)
}
