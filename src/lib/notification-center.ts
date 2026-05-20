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
    const sameCount = state?.lastCount === item.count
    const snoozedUntil = parseDate(state?.snoozedUntil)
    const isRead = Boolean(sameCount && state?.isRead)
    const isSnoozed = Boolean(sameCount && snoozedUntil && snoozedUntil > now)

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

export function buildActiveNotificationSummary(items: NotificationCenterItem[]) {
  const activeItems = items.filter((item) => !item.isSuppressed)
  return {
    total: activeItems.reduce((sum, item) => sum + item.count, 0),
    items: activeItems,
  }
}

export function buildNotificationStateUpdate(input: NotificationStateUpdateInput, now = new Date()) {
  const lastCount = Math.max(0, Math.trunc(input.count))
  if (input.action === "read") return { isRead: true, lastCount, snoozedUntil: null }
  if (input.action === "unread") return { isRead: false, lastCount, snoozedUntil: null }
  if (input.action === "snooze") {
    const snoozeHours = Math.min(168, Math.max(1, Math.trunc(input.snoozeHours ?? 24)))
    const snoozedUntil = new Date(now)
    snoozedUntil.setHours(snoozedUntil.getHours() + snoozeHours)
    return { isRead: false, lastCount, snoozedUntil }
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
