import { NextRequest, NextResponse } from "next/server"
import { hasRole, requireAuth, requirePermission } from "@/lib/auth-utils"
import { isExposableError } from "@/lib/api-error-exposure"
import { errorResponse } from "@/lib/api-response"
import { prisma } from "@/lib/db"
import { applyLdapSync, LdapSyncChangedError, loadLdapSettings, previewLdapSync } from "@/lib/ldap-sync"
import { getScheduledJobDecision, schedulerTimezoneOffsetMinutes, type ScheduledJobDecision } from "@/lib/scheduled-job"
import { getSettingValue, mapSystemSettings, updateScheduledJobRunState } from "@/lib/scheduled-job-run-state"
import {
  ldapSyncLastErrorKey,
  ldapSyncLastRunAtKey,
  ldapSyncLastStatusKey,
  ldapSyncStatusSettingKeys,
} from "@/lib/system-setting-defaults"

const ldapSchedulerStatusKeys = {
  lastRunAtKey: ldapSyncLastRunAtKey,
  lastStatusKey: ldapSyncLastStatusKey,
  lastErrorKey: ldapSyncLastErrorKey,
}

export async function POST(request: NextRequest) {
  let isScheduledAction = false
  try {
    const schedulerAuthorized = isSchedulerAuthorized(request)
    const user = schedulerAuthorized ? null : await requireAuth()
    if (user) {
      requirePermission(user, "setting", "edit")
    }

    const payload = (await request.json().catch(() => ({}))) as { action?: string; expectedDeactivations?: unknown }
    const settings = await loadLdapSettings()
    const action = payload.action ?? "preview"
    isScheduledAction = action === "scheduled"
    if (isScheduledAction && !schedulerAuthorized) {
      return NextResponse.json({ error: "Scheduled LDAP sync requires scheduler token" }, { status: 403 })
    }

    if (isScheduledAction) {
      const now = new Date()
      const statusSettings = mapSystemSettings(
        await prisma.systemSetting.findMany({
          where: { key: { in: [...ldapSyncStatusSettingKeys] } },
          select: { key: true, value: true },
        })
      )
      const scheduledDecision: ScheduledJobDecision = getScheduledJobDecision({
        enabled: settings.ldap_sync_enabled === "true",
        mode: settings.ldap_sync_mode ?? "preview",
        schedule: settings.ldap_sync_schedule ?? "0 2 * * *",
        lastRunAt: getSettingValue(statusSettings, ldapSyncLastRunAtKey),
        now,
        timezoneOffsetMinutes: schedulerTimezoneOffsetMinutes,
      })
      if (!scheduledDecision.shouldRun) {
        return NextResponse.json({
          job: "ldap_sync",
          status: "skipped",
          reason: scheduledDecision.reason,
          dueRunAt: scheduledDecision.dueRunAt,
          nextRunAt: scheduledDecision.nextRunAt,
        })
      }

      const result = await applyLdapSync("system:ldap", settings, { source: "scheduled" })
      await updateScheduledJobRunState({
        keys: ldapSchedulerStatusKeys,
        status: "success",
        ranAt: now,
      })

      return NextResponse.json({
        job: "ldap_sync",
        status: "ran",
        reason: scheduledDecision.reason,
        dueRunAt: scheduledDecision.dueRunAt,
        nextRunAt: scheduledDecision.nextRunAt,
        result,
      })
    }

    if (action === "apply" && user && !hasRole(user, "system_admin")) {
      return NextResponse.json({ error: "Forbidden: only system_admin can apply LDAP sync" }, { status: 403 })
    }

    // A user apply carries the deactivation count of the preview they confirmed (group 12 spec §15 item 1).
    const expectedDeactivations = payload.expectedDeactivations
    const hasConfirmedCount =
      typeof expectedDeactivations === "number" && Number.isInteger(expectedDeactivations) && expectedDeactivations >= 0
    if (action === "apply" && user && !hasConfirmedCount) {
      return NextResponse.json({ error: "Preview required before apply" }, { status: 400 })
    }

    const result = action === "apply"
      ? user
        ? await applyLdapSync(user.id, settings, { expectedDeactivations: expectedDeactivations as number })
        : await applyLdapSync(undefined, settings)
      : await previewLdapSync(settings)

    return NextResponse.json(result)
  } catch (error) {
    if (error instanceof LdapSyncChangedError) {
      return NextResponse.json({ error: error.message }, { status: 409 })
    }
    if (isScheduledAction && isSchedulerAuthorized(request)) {
      await updateScheduledJobRunState({
        keys: ldapSchedulerStatusKeys,
        status: "failed",
        error: isExposableError(error) ? error.message : "LDAP sync failed",
      }).catch(() => undefined)
    }
    return errorResponse(error, 400)
  }
}

function isSchedulerAuthorized(request: NextRequest) {
  const token = process.env.LDAP_SYNC_TOKEN
  if (!token) return false

  const header = request.headers.get("authorization")
  return header === `Bearer ${token}`
}
