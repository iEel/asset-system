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
export const pmDueSoonWindowDays = 14

const bangkokOffsetMs = 7 * 60 * 60 * 1000
const dayMs = 86_400_000

export function getBangkokDateKey(date: Date) {
  return new Date(date.getTime() + bangkokOffsetMs).toISOString().slice(0, 10)
}

// The start of the Bangkok day that holds `now`, whatever the server's time zone.
export function startOfBangkokDay(now: Date): Date {
  return new Date(`${getBangkokDateKey(now)}T00:00:00.000+07:00`)
}

// 23:59:59.999 Bangkok of the day `offsetDays` after the Bangkok day that holds `now`. Bangkok has no daylight
// saving, so a day is always 24 hours.
export function endOfBangkokDay(now: Date, offsetDays = 0): Date {
  return new Date(new Date(`${getBangkokDateKey(now)}T23:59:59.999+07:00`).getTime() + offsetDays * dayMs)
}

// Whole Bangkok days from `from` to `to`; negative when `to` is the earlier day.
export function bangkokDayDiff(from: Date, to: Date): number {
  return (Date.parse(getBangkokDateKey(to)) - Date.parse(getBangkokDateKey(from))) / dayMs
}

// The plans every PM due count reads: active plans of assets still in use (group 5 spec §5, one scope).
export const pmDueScopeWhere: Prisma.MaintenancePlanWhereInput = {
  isActive: true,
  planState: "active",
  asset: { isActive: true, status: { name: { notIn: ["Disposed", "Retired"] } } },
}

export type PmDueBucket = "overdue" | "week" | "soon" | "later"

// One bucket's plans: the stored nextDueDate instant against Bangkok day edges (G5P1-R2). week and soon overlap:
// week is the first seven days of soon.
export function buildPmDueBucketWhere(bucket: PmDueBucket, now: Date): Prisma.MaintenancePlanWhereInput {
  const today = startOfBangkokDay(now)
  const soonEnd = endOfBangkokDay(now, pmDueSoonWindowDays)
  if (bucket === "overdue") return { ...pmDueScopeWhere, nextDueDate: { lt: today } }
  if (bucket === "week") {
    return { ...pmDueScopeWhere, nextDueDate: { gte: today, lte: endOfBangkokDay(now, pmReminderWindowDays) } }
  }
  if (bucket === "soon") return { ...pmDueScopeWhere, nextDueDate: { gte: today, lte: soonEnd } }
  return { ...pmDueScopeWhere, nextDueDate: { gt: soonEnd } }
}

// The reminder (bell, work center, list box): the scope, due within seven Bangkok days, overdue included.
export function buildDuePmPlanWhere(now: Date): Prisma.MaintenancePlanWhereInput {
  return { ...pmDueScopeWhere, nextDueDate: { lte: endOfBangkokDay(now, pmReminderWindowDays) } }
}

export function getMaintenancePlanDueState(nextDueDate: Date | string, now = new Date()): MaintenancePlanDueState {
  const days = bangkokDayDiff(now, new Date(nextDueDate))
  if (days < 0) return "overdue"
  return days <= pmDueSoonWindowDays ? "due_soon" : "upcoming"
}

export type PmDueBadge = {
  key: "overdue" | "today" | "soon" | "later"
  days: number
  tone: "danger" | "warning" | "primary"
}

// The due badge of one plan, in Bangkok days. `days` is never negative: the days late, 0 for today, else the days left.
export function getPmDueBadge(nextDueDate: Date | string, now: Date): PmDueBadge {
  const days = bangkokDayDiff(now, new Date(nextDueDate))
  if (days < 0) return { key: "overdue", days: -days, tone: "danger" }
  if (days === 0) return { key: "today", days: 0, tone: "warning" }
  if (days <= pmDueSoonWindowDays) return { key: "soon", days, tone: "warning" }
  return { key: "later", days, tone: "primary" }
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
