import type { Prisma } from "@prisma/client"

export const maintenancePlanFrequencies = ["monthly", "quarterly", "yearly", "custom"] as const

export type MaintenancePlanFrequency = (typeof maintenancePlanFrequencies)[number]
export type MaintenancePlanDueState = "overdue" | "due_soon" | "upcoming"

export type MaintenancePlanSummaryInput = {
  isActive: boolean
  nextDueDate: Date | string
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

// The order of the PM plan list: active plans first, then paused, then ended, then any other state by name. The
// database allows only these three (the planState CHECK of 2026-07-14), so "any other" is a guard, not a case.
export const maintenancePlanStateOrder = ["active", "paused", "ended"] as const

export type MaintenancePlanStateCount = { planState: string; count: number }
export type MaintenancePlanStatePageSlice = { planState: string; skip: number; take: number }

// One page of the PM list (skip and take over the whole list in state order) as one findMany window per state, so
// every state is read with its own where and the list keeps its order across pages (spec 2B §5.9.2 row 6). States
// without plans give no slice, and a page past the end gives none at all. Pure, so tests import it.
export function planStatePageSlices(
  counts: readonly MaintenancePlanStateCount[],
  pageWindow: { skip: number; take: number },
): MaintenancePlanStatePageSlice[] {
  const order: readonly string[] = maintenancePlanStateOrder
  const rank = (state: string) => (order.includes(state) ? order.indexOf(state) : order.length)
  const byName = (left: string, right: string) => (left < right ? -1 : left > right ? 1 : 0)
  const states = counts
    .filter((row) => row.count > 0)
    .sort((left, right) => rank(left.planState) - rank(right.planState) || byName(left.planState, right.planState))
  const slices: MaintenancePlanStatePageSlice[] = []
  let skip = Math.max(0, pageWindow.skip)
  let take = Math.max(0, pageWindow.take)
  for (const { planState, count } of states) {
    if (take === 0) break
    if (skip >= count) {
      skip -= count
      continue
    }
    const rows = Math.min(count - skip, take)
    slices.push({ planState, skip, take: rows })
    take -= rows
    skip = 0
  }
  return slices
}

function startOfDay(value: Date | string) {
  const date = new Date(value)
  date.setHours(0, 0, 0, 0)
  return date
}
