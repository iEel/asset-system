import { NextRequest, NextResponse } from "next/server"
import { requireAuth, requirePermission } from "@/lib/auth-utils"
import { errorResponse } from "@/lib/api-response"
import { logAudit } from "@/lib/audit-log"
import { prisma } from "@/lib/db"
import { generateDuePreventiveMaintenanceTickets } from "@/lib/preventive-maintenance-ticket-generator"
import { getScheduledJobDecision, schedulerTimezoneOffsetMinutes, type ScheduledJobDecision } from "@/lib/scheduled-job"
import { getSettingValue, mapSystemSettings, updateScheduledJobRunState } from "@/lib/scheduled-job-run-state"
import {
  pmAutoGenerationEnabledKey,
  pmAutoGenerationLastErrorKey,
  pmAutoGenerationLastRunAtKey,
  pmAutoGenerationLastStatusKey,
  pmAutoGenerationModeKey,
  pmAutoGenerationScheduleKey,
  pmAutoGenerationSettingKeys,
  pmAutoGenerationStatusSettingKeys,
} from "@/lib/system-setting-defaults"

const systemPmUserId = "system:pm"
const pmSchedulerStatusKeys = {
  lastRunAtKey: pmAutoGenerationLastRunAtKey,
  lastStatusKey: pmAutoGenerationLastStatusKey,
  lastErrorKey: pmAutoGenerationLastErrorKey,
}

export async function POST(request: NextRequest) {
  let isScheduledAction = false
  try {
    const schedulerAuthorized = isSchedulerAuthorized(request)
    const user = schedulerAuthorized ? null : await requireAuth()
    if (user) {
      requirePermission(user, "maintenance", "create")
    }

    const payload = await request.json().catch(() => ({})) as { action?: "manual" | "scheduled"; dryRun?: boolean; limit?: number }
    isScheduledAction = payload.action === "scheduled"
    if (isScheduledAction && !schedulerAuthorized) {
      return NextResponse.json({ error: "Scheduled PM generation requires scheduler token" }, { status: 403 })
    }

    const now = new Date()
    const dryRun = payload.dryRun === true
    let scheduledDecision: ScheduledJobDecision | null = null
    if (isScheduledAction) {
      const settings = mapSystemSettings(
        await prisma.systemSetting.findMany({
          where: { key: { in: [...pmAutoGenerationSettingKeys, ...pmAutoGenerationStatusSettingKeys] } },
          select: { key: true, value: true },
        })
      )
      scheduledDecision = getScheduledJobDecision({
        enabled: getSettingValue(settings, pmAutoGenerationEnabledKey, "false") === "true",
        mode: getSettingValue(settings, pmAutoGenerationModeKey, "manual"),
        schedule: getSettingValue(settings, pmAutoGenerationScheduleKey, "5 6 * * *"),
        lastRunAt: getSettingValue(settings, pmAutoGenerationLastRunAtKey),
        now,
        timezoneOffsetMinutes: schedulerTimezoneOffsetMinutes,
      })

      if (!scheduledDecision.shouldRun) {
        return NextResponse.json({
          job: "pm_generate_due",
          status: "skipped",
          reason: scheduledDecision.reason,
          dueRunAt: scheduledDecision.dueRunAt,
          nextRunAt: scheduledDecision.nextRunAt,
        })
      }
    }

    const result = await generateDuePreventiveMaintenanceTickets({
      generatedByUserId: user?.id ?? systemPmUserId,
      fallbackReportedById: user?.employeeId ?? null,
      now,
      dryRun,
      limit: payload.limit,
    })

    if (isScheduledAction && !dryRun) {
      await updateScheduledJobRunState({
        keys: pmSchedulerStatusKeys,
        status: "success",
        ranAt: now,
      })
    }

    await logAudit({
      userId: user?.id,
      action: result.dryRun ? "preview_due_pm_tickets" : "auto_generate_pm_tickets",
      module: "maintenance",
      recordId: "maintenance_plans",
      newValue: {
        scanned: result.scanned,
        generated: result.generated,
        skippedDuplicate: result.skippedDuplicate,
        skippedMissingReporter: result.skippedMissingReporter,
        dryRun: result.dryRun,
        scheduledDecision,
      },
      remark: isScheduledAction ? "scheduled" : schedulerAuthorized ? "scheduler" : "manual",
    })

    return NextResponse.json(
      isScheduledAction
        ? {
            job: "pm_generate_due",
            status: "ran",
            reason: scheduledDecision?.reason ?? "due",
            dueRunAt: scheduledDecision?.dueRunAt ?? null,
            nextRunAt: scheduledDecision?.nextRunAt ?? null,
            result,
          }
        : result
    )
  } catch (error) {
    if (isScheduledAction && isSchedulerAuthorized(request)) {
      await updateScheduledJobRunState({
        keys: pmSchedulerStatusKeys,
        status: "failed",
        error: error instanceof Error ? error.message : "PM generation failed",
      }).catch(() => undefined)
    }
    return errorResponse(error, 400)
  }
}

function isSchedulerAuthorized(request: NextRequest) {
  const token = process.env.MAINTENANCE_PM_GENERATION_TOKEN
  if (!token) return false

  const header = request.headers.get("authorization")
  return header === `Bearer ${token}`
}
