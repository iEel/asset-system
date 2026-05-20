import { NextRequest, NextResponse } from "next/server"
import { requireAuth, requirePermission } from "@/lib/auth-utils"
import { errorResponse } from "@/lib/api-response"
import { logAudit } from "@/lib/audit-log"
import { deliverDailyNotificationDigest, type NotificationDigestLocale } from "@/lib/notification-digest"

export async function POST(request: NextRequest) {
  try {
    const schedulerAuthorized = isSchedulerAuthorized(request)
    const user = schedulerAuthorized ? null : await requireAuth()
    if (user) {
      requirePermission(user, "setting", "edit")
    }

    const payload = await request.json().catch(() => ({})) as {
      dryRun?: boolean
      locale?: string
      targetUserId?: string
    }
    const locale: NotificationDigestLocale = payload.locale === "en" ? "en" : "th"
    const result = await deliverDailyNotificationDigest({
      locale,
      dryRun: payload.dryRun === true,
      targetUserId: typeof payload.targetUserId === "string" ? payload.targetUserId : undefined,
    })

    await logAudit({
      userId: user?.id,
      action: result.dryRun ? "preview_notification_digest" : "deliver_notification_digest",
      module: "notification",
      recordId: result.referenceId,
      newValue: result,
      remark: schedulerAuthorized ? "scheduler" : "manual",
    })

    return NextResponse.json(result)
  } catch (error) {
    return errorResponse(error, 400)
  }
}

function isSchedulerAuthorized(request: NextRequest) {
  const token = process.env.NOTIFICATION_DIGEST_TOKEN
  if (!token) return false

  const header = request.headers.get("authorization")
  return header === `Bearer ${token}`
}
