import { prisma } from "@/lib/db"
import type { SessionUser } from "@/lib/auth-utils"
import { getNotificationCenter } from "@/lib/notification-summary"
import {
  buildDailyDigestMessage,
  buildDailyDigestReferenceId,
  resolveDigestTone,
  type NotificationDigestLocale,
} from "@/lib/notification-digest-format"

export { buildDailyDigestMessage, buildDailyDigestReferenceId, resolveDigestTone, type NotificationDigestLocale }

export type NotificationDigestResult = {
  referenceId: string
  scannedUsers: number
  delivered: number
  skippedEmpty: number
  skippedDuplicate: number
  dryRun: boolean
}

type DigestUser = {
  id: string
  displayName: string
  email: string | null
  employeeId: string | null
  userRoles: Array<{
    role: {
      name: string
      isActive: boolean
      rolePermissions: Array<{
        permission: {
          module: string
          action: string
        }
      }>
    }
  }>
}

export async function deliverDailyNotificationDigest({
  locale = "th",
  dryRun = false,
  targetUserId,
  referenceDate = new Date(),
}: {
  locale?: NotificationDigestLocale
  dryRun?: boolean
  targetUserId?: string
  referenceDate?: Date
} = {}): Promise<NotificationDigestResult> {
  const referenceId = buildDailyDigestReferenceId(referenceDate)
  const users = await prisma.user.findMany({
    where: { isActive: true, ...(targetUserId ? { id: targetUserId } : {}) },
    select: {
      id: true,
      displayName: true,
      email: true,
      employeeId: true,
      userRoles: {
        include: {
          role: {
            include: {
              rolePermissions: { include: { permission: true } },
            },
          },
        },
      },
    },
    orderBy: { displayName: "asc" },
  })

  let delivered = 0
  let skippedEmpty = 0
  let skippedDuplicate = 0

  for (const dbUser of users) {
    const user = toSessionUser(dbUser)
    const center = await getNotificationCenter(user, locale)
    const activeItems = center.items.filter((item) => !item.isSuppressed)
    if (activeItems.length === 0) {
      skippedEmpty += 1
      continue
    }

    const existing = await prisma.notification.findFirst({
      where: {
        userId: user.id,
        module: "notification_digest",
        referenceId,
      },
      select: { id: true },
    })
    if (existing) {
      skippedDuplicate += 1
      continue
    }

    if (!dryRun) {
      await prisma.notification.create({
        data: {
          userId: user.id,
          title: locale === "th" ? "สรุปงานติดตามประจำวัน" : "Daily follow-up digest",
          message: buildDailyDigestMessage(locale, activeItems),
          type: resolveDigestTone(activeItems),
          module: "notification_digest",
          referenceId,
        },
      })
    }
    delivered += 1
  }

  return {
    referenceId,
    scannedUsers: users.length,
    delivered,
    skippedEmpty,
    skippedDuplicate,
    dryRun,
  }
}

function toSessionUser(user: DigestUser): SessionUser {
  const activeRoles = user.userRoles.map((userRole) => userRole.role).filter((role) => role.isActive)
  return {
    id: user.id,
    name: user.displayName,
    email: user.email,
    employeeId: user.employeeId,
    roles: activeRoles.map((role) => role.name),
    permissions: Array.from(
      new Set(
        activeRoles.flatMap((role) =>
          role.rolePermissions.map((rolePermission) => `${rolePermission.permission.module}:${rolePermission.permission.action}`)
        )
      )
    ),
  }
}
