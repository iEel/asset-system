import { NextRequest, NextResponse } from "next/server"
import { requireAuth } from "@/lib/auth-utils"
import { errorResponse } from "@/lib/api-response"
import { fieldErrorResponse } from "@/lib/field-error-response"
import { getNotificationCenter, getNotificationSummary } from "@/lib/notification-summary"
import { prisma } from "@/lib/db"
import { buildNotificationStateUpdate, type NotificationStateAction } from "@/lib/notification-center"

export async function GET(request: NextRequest) {
  try {
    const user = await requireAuth()
    const locale = notificationLocale(request)
    const summary = await getNotificationSummary(user, locale)
    return NextResponse.json(summary)
  } catch (error) {
    return errorResponse(error)
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const user = await requireAuth()
    const body = await request.json().catch(() => null) as {
      key?: unknown
      action?: unknown
      count?: unknown
      snoozeHours?: unknown
      assignedToUserId?: unknown
    } | null

    if (body?.action === "read_all") {
      // The locale is read here only: the single-key actions never touch nextUrl.
      const locale = notificationLocale(request)
      // The server's own counts decide what is marked read; any key or count in the body is ignored.
      const center = await getNotificationCenter(user, locale)
      const unread = center.items.filter((item) => !item.isRead)
      if (unread.length > 0) {
        await prisma.$transaction(
          unread.map((item) => {
            const update = buildNotificationStateUpdate({ action: "read", count: item.count })
            return prisma.notificationUserState.upsert({
              where: { userId_key: { userId: user.id, key: item.key } },
              create: { userId: user.id, key: item.key, ...update },
              update,
            })
          })
        )
      }
      return NextResponse.json({ ok: true, summary: await getNotificationSummary(user, locale) })
    }

    const key = typeof body?.key === "string" ? body.key.trim() : ""
    const action = typeof body?.action === "string" ? body.action : ""
    const count = Number(body?.count ?? 0)

    if (!key || !isNotificationStateAction(action) || !Number.isFinite(count)) {
      return NextResponse.json({ error: "Invalid notification action" }, { status: 400 })
    }

    const assignedToUserId = typeof body?.assignedToUserId === "string" ? body.assignedToUserId.trim() : null
    if (action === "assign" && assignedToUserId) {
      const assignee = await prisma.user.findFirst({
        where: { id: assignedToUserId, isActive: true },
        select: { id: true },
      })
      if (!assignee) return fieldErrorResponse({ status: 400, error: "Invalid assignee", fieldErrors: { assignedToUserId: "invalidAssignee" } })
    }

    const update = buildNotificationStateUpdate({
      action,
      count,
      snoozeHours: Number(body?.snoozeHours ?? 24),
      assignedToUserId,
    })

    const state = await prisma.notificationUserState.upsert({
      where: { userId_key: { userId: user.id, key } },
      create: { userId: user.id, key, ...update },
      update,
    })

    return NextResponse.json({ ok: true, state })
  } catch (error) {
    return errorResponse(error)
  }
}

function notificationLocale(request: NextRequest) {
  return request.nextUrl.searchParams.get("locale") === "en" ? "en" : "th"
}

function isNotificationStateAction(value: string): value is NotificationStateAction {
  return value === "read" || value === "unread" || value === "snooze" || value === "assign"
}
