import type { Prisma } from "@prisma/client"

export const maintenancePlanFrequencies =["monthly", "quarterly", "yearly", "custom"] as const

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
  const from = new Date(fromDate)
  if (Number.isNaN(from.getTime())) return new Date(fromDate)

  if (frequency === "monthly") return addMonthsClamped(from, 1)
  if (frequency === "quarterly") return addMonthsClamped(from, 3)
  if (frequency === "yearly") return addMonthsClamped(from, 12)

  const next = new Date(from)
  next.setUTCDate(next.getUTCDate() + getMaintenancePlanIntervalDays(frequency, intervalDays))
  return next
}

// 31 Jan + 1 month must be 28/29 Feb, not 3 Mar; the plan then keeps its original day when possible.
function addMonthsClamped(from: Date, months: number) {
  const target = new Date(Date.UTC(from.getUTCFullYear(), from.getUTCMonth() + months, 1,
    from.getUTCHours(), from.getUTCMinutes(), from.getUTCSeconds(), from.getUTCMilliseconds()))
  const lastDay = new Date(Date.UTC(target.getUTCFullYear(), target.getUTCMonth() + 1, 0)).getUTCDate()
  target.setUTCDate(Math.min(from.getUTCDate(), lastDay))
  return target
}

export const pmReminderWindowDays = 7

const bangkokOffsetMs = 7 * 60 * 60 * 1000

export function getBangkokDateKey(date: Date) {
  return new Date(date.getTime() + bangkokOffsetMs).toISOString().slice(0, 10)
}

export function buildDuePmPlanWhere(now: Date): Prisma.MaintenancePlanWhereInput {
  const windowEnd = new Date(`${getBangkokDateKey(now)}T23:59:59.999+07:00`)
  windowEnd.setUTCDate(windowEnd.getUTCDate() + pmReminderWindowDays)
  return {
    isActive: true,
    planState: "active",
    nextDueDate: { lte: windowEnd },
    asset: { isActive: true, status: { name: { notIn: ["Disposed", "Retired"] } } },
  }
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
    repairStatus: { notIn: ["closed", "cancelled"] },
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
