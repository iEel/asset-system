import { prisma } from "@/lib/db"
import type { SessionUser } from "@/lib/auth-utils"
import { buildNotificationSummaryItems } from "@/lib/notification-summary-items"
import type { NotificationClientSummary } from "@/lib/notification-client-sync"
import {
  buildActiveNotificationSummary,
  getNotificationCountDrops,
  mergeNotificationItemsWithStates,
} from "@/lib/notification-center"
import { getWaitingWork } from "@/lib/waiting-work"
import { WAITING_WORK_KEYS } from "@/lib/waiting-work-rules"

// Every listed row with its read state (menu B shell task 3); snoozedUntil and assignedToUserId stay on the server.
export async function getNotificationSummary(user: SessionUser, locale: string): Promise<NotificationClientSummary> {
  const center = await getNotificationCenter(user, locale)
  return {
    total: center.activeTotal,
    items: center.items.map(({ key, count, href, tone, isRead, isSnoozed, isSuppressed }) => ({ key, count, href, tone, isRead, isSnoozed, isSuppressed })),
    generatedAt: center.generatedAt,
  }
}

export async function getNotificationCenter(
  user: SessionUser,
  locale: string,
  options?: { recordCountDrops?: boolean },
) {
  const { counts } = await getWaitingWork(user)
  const items = buildNotificationSummaryItems(locale, counts)
  // Every counted key's state is read, even when nothing is listed: a read row whose count fell to 0 records the drop.
  const states = await prisma.notificationUserState.findMany({
    where: {
      userId: user.id,
      key: { in: [...WAITING_WORK_KEYS] },
    },
    select: {
      key: true,
      isRead: true,
      lastCount: true,
      snoozedUntil: true,
      assignedToUserId: true,
    },
  })
  if (options?.recordCountDrops !== false) {
    const drops = getNotificationCountDrops(
      WAITING_WORK_KEYS.map((key) => ({ key, count: counts[key] })),
      states,
    )
    if (drops.length > 0) {
      // Guarded by lastCount > count, so two summaries computed at once write each drop only once.
      await prisma.$transaction(
        drops.map((drop) =>
          prisma.notificationUserState.updateMany({
            where: { userId: user.id, key: drop.key, lastCount: { gt: drop.count } },
            data: { lastCount: drop.count },
          })
        )
      )
    }
  }
  const centerItems = mergeNotificationItemsWithStates(items, states)

  return {
    total: centerItems.reduce((sum, item) => sum + item.count, 0),
    activeTotal: buildActiveNotificationSummary(centerItems).total,
    items: centerItems,
    generatedAt: new Date().toISOString(),
  }
}
