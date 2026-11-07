import type { NotificationSummaryItem } from "./notification-summary-items"

export type NotificationStateRecord = {
  key: string
  isRead: boolean
  lastCount: number
  snoozedUntil: Date | string | null
  assignedToUserId: string | null
}

export type NotificationCenterItem = NotificationSummaryItem & {
  isRead: boolean
  isSnoozed: boolean
  isSuppressed: boolean
  snoozedUntil: string | null
  assignedToUserId: string | null
}

export type NotificationStateAction = "read" | "unread" | "snooze" | "assign"

export type NotificationStateUpdateInput = {
  action: NotificationStateAction
  count: number
  snoozeHours?: number
  assignedToUserId?: string | null
}

export function mergeNotificationItemsWithStates(
  items: NotificationSummaryItem[],
  states: NotificationStateRecord[],
  now = new Date(),
): NotificationCenterItem[] {
  const stateByKey = new Map(states.map((state) => [state.key, state]))

  return items.map((item) => {
    const state = stateByKey.get(item.key)
    const notRisen = state !== undefined && item.count <= state.lastCount
    const snoozedUntil = parseDate(state?.snoozedUntil)
    const isRead = Boolean(notRisen && state?.isRead)
    const isSnoozed = Boolean(notRisen && snoozedUntil && snoozedUntil > now)

    return {
      ...item,
      isRead,
      isSnoozed,
      isSuppressed: isRead || isSnoozed,
      snoozedUntil: snoozedUntil ? snoozedUntil.toISOString() : null,
      assignedToUserId: state?.assignedToUserId ?? null,
    }
  })
}

// A read or snoozed row stays suppressed while its count has not risen above lastCount. When the count drops, the
// lower count is recorded, so a later rise back to the old number counts as new work and returns the row.
export function getNotificationCountDrops(
  items: { key: string; count: number }[],
  states: NotificationStateRecord[],
  now = new Date(),
): { key: string; count: number }[] {
  const stateByKey = new Map(states.map((state) => [state.key, state]))
  const drops: { key: string; count: number }[] = []
  for (const item of items) {
    const state = stateByKey.get(item.key)
    if (!state || item.count >= state.lastCount) continue
    const snoozedUntil = parseDate(state.snoozedUntil)
    if (state.isRead || (snoozedUntil && snoozedUntil > now)) drops.push({ key: item.key, count: item.count })
  }
  return drops
}

// An unread topic is a listed key with work in it that is neither read nor snoozed; the bell shows how many there are
// (group 9 plan 1 task 6, spec §5.1), never the sum of their items.
export function countUnreadNotificationTopics(items: readonly { count: number; isSuppressed: boolean }[]): number {
  return items.filter((item) => !item.isSuppressed && item.count > 0).length
}

// total is the active items' sum, kept for callers that need it; topics is the bell's number.
export function buildActiveNotificationSummary(items: NotificationCenterItem[]) {
  const activeItems = items.filter((item) => !item.isSuppressed)
  return {
    total: activeItems.reduce((sum, item) => sum + item.count, 0),
    topics: countUnreadNotificationTopics(activeItems),
    items: activeItems,
  }
}

// readAt records when a row was marked read; unread and snooze clear it, assign leaves it as it is.
export function buildNotificationStateUpdate(input: NotificationStateUpdateInput, now = new Date()) {
  const lastCount = Math.max(0, Math.trunc(input.count))
  if (input.action === "read") return { isRead: true, lastCount, snoozedUntil: null, readAt: now }
  if (input.action === "unread") return { isRead: false, lastCount, snoozedUntil: null, readAt: null }
  if (input.action === "snooze") {
    const snoozeHours = Math.min(168, Math.max(1, Math.trunc(input.snoozeHours ?? 24)))
    const snoozedUntil = new Date(now)
    snoozedUntil.setHours(snoozedUntil.getHours() + snoozeHours)
    return { isRead: false, lastCount, snoozedUntil, readAt: null }
  }
  return {
    lastCount,
    assignedToUserId: input.assignedToUserId?.trim() || null,
  }
}

function parseDate(value: Date | string | null | undefined) {
  if (!value) return null
  const date = value instanceof Date ? value : new Date(value)
  return Number.isNaN(date.getTime()) ? null : date
}
