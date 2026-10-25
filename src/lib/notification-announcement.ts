import type { NotificationClientSummary } from "./notification-client-sync.ts"

export type NotificationIncreaseLabels = {
  increase: (key: string, count: number) => string
}

export const NOTIFICATION_ANNOUNCEMENT_CLEAR_MS = 10_000

// One polite sentence per unread row that grew against the last server summary (menu B shell task 3). Nothing on the
// first load, nothing unless the unread total rose, and nothing when it rose with no row growing (a snooze ending).
export function describeNotificationIncrease(
  previous: NotificationClientSummary | null,
  next: NotificationClientSummary,
  labels: NotificationIncreaseLabels,
): string | null {
  if (!previous || next.total <= previous.total) return null
  const before = new Map(previous.items.map((item) => [item.key, item.count]))
  const sentences = next.items
    .filter((item) => !item.isSuppressed)
    .map((item) => ({ key: item.key, increase: item.count - (before.get(item.key) ?? 0) }))
    .filter((item) => item.increase > 0)
    .map((item) => labels.increase(item.key, item.increase))
  return sentences.length > 0 ? sentences.join(" ") : null
}
