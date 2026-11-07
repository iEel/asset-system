import type { NotificationSummaryItem } from "./notification-summary-items.ts"
import { countUnreadNotificationTopics } from "./notification-center.ts"

export const notificationSummaryChangedEvent = "asset-system:notification-summary-changed"

// Every listed row, read ones included, with its read state (menu B shell task 3); total is the number of unread
// topics, not the sum of their items (group 9 plan 1 task 6), and each row keeps its own count.
export type NotificationClientItem = NotificationSummaryItem & {
  isRead: boolean
  isSnoozed: boolean
  isSuppressed: boolean
}

export type NotificationClientSummary = {
  total: number
  items: NotificationClientItem[]
  generatedAt: string
}

export const NOTIFICATION_POLL_MS = 120_000

export function createLatestNotificationRequestGuard() {
  let latestRequestId = 0

  return {
    begin() {
      latestRequestId += 1
      return latestRequestId
    },
    isLatest(requestId: number) {
      return requestId === latestRequestId
    },
  }
}

type PrimaryClick = {
  button: number
  altKey: boolean
  ctrlKey: boolean
  metaKey: boolean
  shiftKey: boolean
}

type NotificationFetch = (input: string, init?: RequestInit) => Promise<{ ok: boolean }>

export type NotificationJsonFetch = (
  input: string,
  init?: RequestInit,
) => Promise<{ ok: boolean; json(): Promise<unknown> }>

// A read row stays listed and stops counting, so the badge drops by one topic; reading also clears its snooze.
export function markNotificationSummaryItemRead(
  summary: NotificationClientSummary,
  key: string,
): NotificationClientSummary {
  const current = summary.items.find((item) => item.key === key)
  if (!current || current.isRead) return summary

  const items = summary.items.map((item) => item.key === key
    ? { ...item, isRead: true, isSnoozed: false, isSuppressed: true }
    : item)

  return {
    total: countUnreadNotificationTopics(items),
    items,
    generatedAt: summary.generatedAt,
  }
}

export function isPlainPrimaryClick(event: PrimaryClick) {
  return event.button === 0
    && !event.altKey
    && !event.ctrlKey
    && !event.metaKey
    && !event.shiftKey
}

export async function markNotificationRead(
  item: Pick<NotificationSummaryItem, "key" | "count">,
  request: NotificationFetch = fetch,
) {
  try {
    const response = await request("/api/notifications", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        key: item.key,
        count: item.count,
        action: "read",
      }),
    })

    return response.ok
  } catch {
    return false
  }
}

export async function fetchNotificationSummary(
  locale: string,
  request: NotificationJsonFetch = fetch,
): Promise<NotificationClientSummary | null> {
  try {
    const response = await request(`/api/notifications?locale=${locale}`)
    if (!response.ok) return null
    return await response.json() as NotificationClientSummary
  } catch {
    return null
  }
}

// Read-all sends the action only: the server marks each row at its own count and answers the recomputed summary.
export async function markAllNotificationsRead(
  locale: string,
  request: NotificationJsonFetch = fetch,
): Promise<NotificationClientSummary | null> {
  try {
    const response = await request(`/api/notifications?locale=${locale}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "read_all" }),
    })
    if (!response.ok) return null
    const body = await response.json() as { summary?: NotificationClientSummary }
    return body.summary ?? null
  } catch {
    return null
  }
}

export function notifyNotificationSummaryChanged(target?: EventTarget) {
  const eventTarget = target ?? (typeof window !== "undefined" ? window : null)
  eventTarget?.dispatchEvent(new Event(notificationSummaryChangedEvent))
}
