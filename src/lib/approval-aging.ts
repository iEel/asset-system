import type { ApprovalInboxItem } from "@/lib/approval-inbox"

const millisecondsPerDay = 24 * 60 * 60 * 1000

export type ApprovalAgeStatus = {
  ageDays: number
  daysOverdue: number
  isOverdue: boolean
}

export function getApprovalAgeStatus(
  requestedAt: Date,
  now: Date = new Date(),
  slaDays: number,
): ApprovalAgeStatus {
  const requestedDay = startOfDay(requestedAt)
  const today = startOfDay(now)
  const ageDays = Math.max(0, Math.floor((today.getTime() - requestedDay.getTime()) / millisecondsPerDay))
  const daysOverdue = Math.max(0, ageDays - slaDays)

  return {
    ageDays,
    daysOverdue,
    isOverdue: daysOverdue > 0,
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

function startOfDay(value: Date) {
  return new Date(value.getFullYear(), value.getMonth(), value.getDate())
}

function approvalTonePriority(tone: ApprovalInboxItem["tone"]) {
  if (tone === "danger") return 3
  if (tone === "warning") return 2
  return 1
}
