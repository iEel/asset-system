import type { ApprovalInboxItem } from "@/lib/approval-inbox"
import { bangkokDayDiff } from "./preventive-maintenance.ts"

export type ApprovalAgeStatus = {
  ageDays: number
  daysOverdue: number
  isOverdue: boolean
  /** The age equals the SLA: the last day before it turns overdue ("ครบ SLA วันนี้"). */
  isDueToday: boolean
}

export function getApprovalAgeStatus(
  requestedAt: Date,
  now: Date = new Date(),
  slaDays: number,
): ApprovalAgeStatus {
  // Whole Bangkok days, whatever the server's time zone (group 6 spec §5).
  const ageDays = Math.max(0, bangkokDayDiff(requestedAt, now))
  const daysOverdue = Math.max(0, ageDays - slaDays)

  return {
    ageDays,
    daysOverdue,
    isOverdue: daysOverdue > 0,
    isDueToday: ageDays === slaDays,
  }
}

export function sortApprovalInboxItemsByAge(
  items: ApprovalInboxItem[],
  slaDays: number,
  now: Date = new Date(),
) {
  return [...items].sort((left, right) => {
    const leftStatus = getApprovalAgeStatus(left.requestedAt, now, slaDays)
    const rightStatus = getApprovalAgeStatus(right.requestedAt, now, slaDays)

    if (leftStatus.isOverdue !== rightStatus.isOverdue) {
      return leftStatus.isOverdue ? -1 : 1
    }

    if (leftStatus.ageDays !== rightStatus.ageDays) {
      return rightStatus.ageDays - leftStatus.ageDays
    }

    const toneOrder = approvalTonePriority(right.tone) - approvalTonePriority(left.tone)
    if (toneOrder !== 0) return toneOrder

    return left.requestedAt.getTime() - right.requestedAt.getTime()
  })
}

function approvalTonePriority(tone: ApprovalInboxItem["tone"]) {
  if (tone === "danger") return 3
  if (tone === "warning") return 2
  return 1
}
