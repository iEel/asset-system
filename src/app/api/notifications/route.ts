import { NextRequest, NextResponse } from "next/server"
import { requireAuth } from "@/lib/auth-utils"
import { errorResponse } from "@/lib/api-response"
import { getNotificationSummary } from "@/lib/notification-summary"
import { prisma } from "@/lib/db"
import { buildNotificationStateUpdate, type NotificationStateAction } from "@/lib/notification-center"

export async function GET(request: NextRequest) {
  try {
    const user = await requireAuth()
    const locale = request.nextUrl.searchParams.get("locale") === "en" ? "en" : "th"
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
      if (!assignee) return NextResponse.json({ error: "Invalid assignee" }, { status: 400 })
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

function isNotificationStateAction(value: string): value is NotificationStateAction {
  return value === "read" || value === "unread" || value === "snooze" || value === "assign"
}
