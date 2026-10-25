// The notification box splits into two groups: items that ask the person to decide (the approval inbox) and items
// to follow up. The order inside each group stays as the summary lists it.
export const DECIDE_NOTIFICATION_KEYS = ["approvalInbox"] as const

const decideKeys = new Set<string>(DECIDE_NOTIFICATION_KEYS)

export function groupNotificationItems<T extends { key: string }>(items: T[]): { decide: T[]; follow: T[] } {
  const decide: T[] = []
  const follow: T[] = []
  for (const item of items) {
    if (decideKeys.has(item.key)) decide.push(item)
    else follow.push(item)
  }
  return { decide, follow }
}

export function countUnreadDecisions(
  items: { key: string; count: number; isRead?: boolean; isSuppressed?: boolean }[],
): number {
  return items.reduce(
    (sum, item) => (decideKeys.has(item.key) && !(item.isSuppressed ?? item.isRead ?? false) ? sum + item.count : sum),
    0,
  )
}
