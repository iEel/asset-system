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

// Read wins over snoozed: a row the person has read shows "อ่านแล้ว" even while it is also snoozed (menu B shell task 7).
export function getNotificationRowState(item: { isRead?: boolean; isSnoozed?: boolean }): "unread" | "read" | "snoozed" {
  if (item.isRead) return "read"
  if (item.isSnoozed) return "snoozed"
  return "unread"
}

// The bell's accessible name: the unread count when there is one, "ไม่มีงานค้าง" for an empty box, else the plain title
// (rows that are all read, or a summary that has not loaded yet).
export function getNotificationBellNameKey(
  summary: { total: number; items: readonly unknown[] } | null,
): "bellLabel" | "bellEmpty" | "title" {
  if (!summary) return "title"
  if (summary.total > 0) return "bellLabel"
  return summary.items.length === 0 ? "bellEmpty" : "title"
}

// The box header's right side: "อ่านแล้วทั้งหมด" while something is unread, "อ่านครบแล้ว" when rows are listed and all
// read, nothing for an empty or unloaded box.
export function getNotificationHeaderAction(
  summary: { total: number; items: readonly unknown[] } | null,
): "markAllRead" | "allRead" | null {
  if (!summary) return null
  if (summary.total > 0) return "markAllRead"
  return summary.items.length > 0 ? "allRead" : null
}
