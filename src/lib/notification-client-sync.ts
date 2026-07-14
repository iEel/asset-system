import type { NotificationSummaryItem } from "./notification-summary-items.ts"

export const notificationSummaryChangedEvent = "asset-system:notification-summary-changed"

export type NotificationClientSummary = {
  total: number
  items: NotificationSummaryItem[]
}

type PrimaryClick = {
  button: number
  altKey: boolean
  ctrlKey: boolean
  metaKey: boolean
  shiftKey: boolean
}

type NotificationFetch = (input: string, init?: RequestInit) => Promise<{ ok: boolean }>

export function removeNotificationSummaryItem(
  summary: NotificationClientSummary,
  key: string,
): NotificationClientSummary {
  const items = summary.items.filter((item) => item.key !== key)
  if (items.length === summary.items.length) return summary

  return {
    total: items.reduce((sum, item) => sum + item.count, 0),
    items,
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

export function notifyNotificationSummaryChanged(target: EventTarget = window) {
  target.dispatchEvent(new Event(notificationSummaryChangedEvent))
}
