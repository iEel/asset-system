import { NextRequest, NextResponse } from "next/server"
import { requireAuth, requirePermission } from "@/lib/auth-utils"
import { errorResponse } from "@/lib/api-response"
import { logAudit } from "@/lib/audit-log"
import { generateDuePreventiveMaintenanceTickets } from "@/lib/preventive-maintenance-ticket-generator"

const systemPmUserId = "system:pm"

export async function POST(request: NextRequest) {
  try {
    const schedulerAuthorized = isSchedulerAuthorized(request)
    const user = schedulerAuthorized ? null : await requireAuth()
    if (user) {
      requirePermission(user, "maintenance", "create")
    }

    const payload = await request.json().catch(() => ({})) as { dryRun?: boolean; limit?: number }
    const result = await generateDuePreventiveMaintenanceTickets({
      generatedByUserId: user?.id ?? systemPmUserId,
      fallbackReportedById: user?.employeeId ?? null,
      dryRun: payload.dryRun === true,
      limit: payload.limit,
    })

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
      },
      remark: schedulerAuthorized ? "scheduler" : "manual",
    })

    return NextResponse.json(result)
  } catch (error) {
    return errorResponse(error, 400)
  }
}

function isSchedulerAuthorized(request: NextRequest) {
  const token = process.env.MAINTENANCE_PM_GENERATION_TOKEN
  if (!token) return false

  const header = request.headers.get("authorization")
  return header === `Bearer ${token}`
}
