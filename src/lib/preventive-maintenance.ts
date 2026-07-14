export const maintenancePlanFrequencies = ["monthly", "quarterly", "yearly", "custom"] as const

export type MaintenancePlanFrequency = (typeof maintenancePlanFrequencies)[number]
export type MaintenancePlanDueState = "overdue" | "due_soon" | "upcoming"
export type PreventiveMaintenanceTicketPlan = {
  planNo: string
  title: string
  frequency: MaintenancePlanFrequency | string
  intervalDays?: number | null
  nextDueDate: Date | string
  assignedToId?: string | null
  vendorId?: string | null
  notes?: string | null
}

export type MaintenancePlanSummaryInput = {
  isActive: boolean
  nextDueDate: Date | string
}

export type PreventiveMaintenanceGenerationPlanInput = {
  isActive: boolean
  nextDueDate: Date | string
}

export type PreventiveMaintenanceDuplicatePlanInput = {
  id: string
  planNo: string
  assetId: string
}

export function getMaintenancePlanIntervalDays(frequency: MaintenancePlanFrequency, intervalDays?: number | null) {
  if (frequency === "monthly") return 30
  if (frequency === "quarterly") return 90
  if (frequency === "yearly") return 365
  return intervalDays && intervalDays > 0 ? Math.floor(intervalDays) : 30
}

export function calculateNextMaintenanceDueDate(
  fromDate: Date | string,
  frequency: MaintenancePlanFrequency,
  intervalDays?: number | null
) {
  const next = new Date(fromDate)
  if (Number.isNaN(next.getTime())) return new Date(fromDate)

  if (frequency === "monthly") next.setMonth(next.getMonth() + 1)
  else if (frequency === "quarterly") next.setMonth(next.getMonth() + 3)
  else if (frequency === "yearly") next.setFullYear(next.getFullYear() + 1)
  else next.setDate(next.getDate() + getMaintenancePlanIntervalDays(frequency, intervalDays))

  return next
}

export function getMaintenancePlanDueState(nextDueDate: Date | string, now = new Date()): MaintenancePlanDueState {
  const due = startOfDay(nextDueDate)
  const today = startOfDay(now)
  if (due.getTime() < today.getTime()) return "overdue"

  const dueSoonCutoff = new Date(today)
  dueSoonCutoff.setDate(dueSoonCutoff.getDate() + 14)
  return due.getTime() <= dueSoonCutoff.getTime() ? "due_soon" : "upcoming"
}

export function summarizeMaintenancePlans(plans: MaintenancePlanSummaryInput[], now = new Date()) {
  const summary = {
    total: 0,
    overdue: 0,
    dueSoon: 0,
    upcoming: 0,
  }

  for (const plan of plans) {
    if (!plan.isActive) continue
    summary.total += 1
    const state = getMaintenancePlanDueState(plan.nextDueDate, now)
    if (state === "overdue") summary.overdue += 1
    else if (state === "due_soon") summary.dueSoon += 1
    else summary.upcoming += 1
  }

  return summary
}

export function isPreventiveMaintenancePlanDue(plan: PreventiveMaintenanceGenerationPlanInput, now = new Date()) {
  if (!plan.isActive) return false
  return startOfDay(plan.nextDueDate).getTime() <= startOfDay(now).getTime()
}

export function buildPreventiveMaintenanceTicketPrefix(planNo: string) {
  return `[PM] ${planNo} -`
}

export function buildPreventiveMaintenanceDuplicateTicketWhere(plan: PreventiveMaintenanceDuplicatePlanInput) {
  return {
    isActive: true,
    repairStatus: { not: "closed" },
    OR: [
      { maintenancePlanId: plan.id },
      {
        assetId: plan.assetId,
        maintenancePlanId: null,
        problem: { startsWith: buildPreventiveMaintenanceTicketPrefix(plan.planNo) },
      },
    ],
  }
}

export function buildPreventiveMaintenanceTicketProblem(plan: Pick<PreventiveMaintenanceTicketPlan, "planNo" | "title" | "notes">) {
  const title = `${buildPreventiveMaintenanceTicketPrefix(plan.planNo)} ${plan.title}`
  const notes = plan.notes?.trim()
  return notes ? `${title}\n\n${notes}` : title
}

export function buildPreventiveMaintenanceTicketDraft(
  plan: PreventiveMaintenanceTicketPlan,
  fallbackReportedById?: string | null
) {
  const frequency = normalizeMaintenancePlanFrequency(plan.frequency)
  const assignedToId = plan.assignedToId ?? null
  const vendorId = plan.vendorId ?? null
  const reportedById = assignedToId ?? fallbackReportedById ?? null

  return {
    problem: buildPreventiveMaintenanceTicketProblem(plan),
    reportedById,
    assignedToId,
    dueDate: new Date(plan.nextDueDate),
    repairType: vendorId ? "vendor" as const : "internal" as const,
    vendorId,
    nextDueDate: calculateNextMaintenanceDueDate(plan.nextDueDate, frequency, plan.intervalDays),
  }
}

function normalizeMaintenancePlanFrequency(frequency: string): MaintenancePlanFrequency {
  return maintenancePlanFrequencies.includes(frequency as MaintenancePlanFrequency)
    ? frequency as MaintenancePlanFrequency
    : "custom"
}

function startOfDay(value: Date | string) {
  const date = new Date(value)
  date.setHours(0, 0, 0, 0)
  return date
}
