import { NextRequest, NextResponse } from "next/server"
import { requireAuth, requirePermission } from "@/lib/auth-utils"
import { errorResponse } from "@/lib/api-response"
import { logAudit } from "@/lib/audit-log"
import { deliverDailyNotificationDigest, type NotificationDigestLocale } from "@/lib/notification-digest"
import { updateScheduledJobRunState } from "@/lib/scheduled-job-run-state"
import {
  notificationDigestLastErrorKey,
  notificationDigestLastRunAtKey,
  notificationDigestLastStatusKey,
} from "@/lib/system-setting-defaults"

const notificationDigestSchedulerStatusKeys = {
  lastRunAtKey: notificationDigestLastRunAtKey,
  lastStatusKey: notificationDigestLastStatusKey,
  lastErrorKey: notificationDigestLastErrorKey,
}

export async function POST(request: NextRequest) {
  let schedulerAuthorized = false
  let shouldRecordSchedulerState = false

  try {
    schedulerAuthorized = isSchedulerAuthorized(request)
    const user = schedulerAuthorized ? null : await requireAuth()
    if (user) {
      requirePermission(user, "setting", "edit")
    }

    const payload = await request.json().catch(() => ({})) as {
      dryRun?: boolean
      locale?: string
      targetUserId?: string
    }
    shouldRecordSchedulerState = schedulerAuthorized && payload.dryRun !== true
    const locale: NotificationDigestLocale = payload.locale === "en" ? "en" : "th"
    const result = await deliverDailyNotificationDigest({
      locale,
      dryRun: payload.dryRun === true,
      targetUserId: typeof payload.targetUserId === "string" ? payload.targetUserId : undefined,
    })

    if (shouldRecordSchedulerState) {
      await updateScheduledJobRunState({
        keys: notificationDigestSchedulerStatusKeys,
        status: "success",
      })
    }

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
    if (schedulerAuthorized && shouldRecordSchedulerState) {
      await updateScheduledJobRunState({
        keys: notificationDigestSchedulerStatusKeys,
        status: "failed",
        error: error instanceof Error ? error.message : "Notification digest failed",
      }).catch(() => undefined)
    }
    return errorResponse(error, 400)
  }
}

function isSchedulerAuthorized(request: NextRequest) {
  const token = process.env.NOTIFICATION_DIGEST_TOKEN
  if (!token) return false

  const header = request.headers.get("authorization")
  return header === `Bearer ${token}`
}
