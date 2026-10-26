// The repair / PM tab's rules (group 1 spec §7.7): the strip's three numbers, a repair's Bangkok days, its period as one
// short range, the order of the asset's PM plans and who may set one up. Pure, so tests import it.
import { CLOSED_AUDIT_STATUS_NAMES } from "./audit-round-scope.ts"
import { maintenancePlanStateOrder } from "./preventive-maintenance.ts"
import { isOpenRepairStatus } from "./repair-record-policy.ts"
import { bangkokDayDiff } from "./waiting-work-rules.ts"

export type AssetRepairTicket = {
  id: string
  repairStatus: string
  maintenancePlanId: string | null
  reportedDate: Date
  returnDate: Date | null
  repairCost: number | null
}

export type AssetRepairRow = AssetRepairTicket & { repairNo: string; problem: string; resolution: string | null; repairer: string | null }

export type AssetPmPlanRow = {
  id: string
  planNo: string
  title: string
  frequency: string
  nextDueDate: Date
  planState: string
  vendor: { code: string; name: string } | null
}

// Bangkok days from the report to the return, or to today while the record is open. A cancelled record has none, and so
// has a closed one without a return date.
export function repairDays(ticket: Pick<AssetRepairTicket, "repairStatus" | "reportedDate" | "returnDate">, now: Date): number | null {
  if (ticket.repairStatus === "cancelled") return null
  if (isOpenRepairStatus(ticket.repairStatus)) return Math.max(0, bangkokDayDiff(ticket.reportedDate, now))
  return ticket.returnDate ? Math.max(0, bangkokDayDiff(ticket.reportedDate, ticket.returnDate)) : null
}

export type AssetRepairSummary = {
  repairCount: number
  excludedCount: number
  downtimeDays: number
  hasOpenRepair: boolean
  totalCost: number
  replacementWarning: boolean
}

// The strip counts repairs only: an active record that is neither cancelled nor a PM visit (R24). The tab count counts
// every active record, so excludedCount names the difference. The replacement notice keeps today's rule (3 repairs, or
// repair costs of half the purchase price) over these repairs.
export function summarizeAssetRepairs(tickets: readonly AssetRepairTicket[], purchasePrice: number | null, now: Date): AssetRepairSummary {
  const repairs = tickets.filter((ticket) => ticket.repairStatus !== "cancelled" && ticket.maintenancePlanId === null)
  const repairCount = repairs.length
  const downtimeDays = repairs.reduce((total, ticket) => total + (repairDays(ticket, now) ?? 0), 0)
  const totalCost = repairs.reduce((total, ticket) => total + (ticket.repairCost ?? 0), 0)
  return {
    repairCount,
    excludedCount: tickets.length - repairCount,
    downtimeDays,
    hasOpenRepair: repairs.some((ticket) => isOpenRepairStatus(ticket.repairStatus)),
    totalCost,
    replacementWarning: repairCount >= 3 || (purchasePrice != null && purchasePrice > 0 && totalCost >= purchasePrice * 0.5),
  }
}

type DayParts = { day: string; month: string; year: string }

function readDayParts(format: Intl.DateTimeFormat, date: Date): DayParts {
  const parts = format.formatToParts(date)
  const part = (type: Intl.DateTimeFormatPartTypes) => parts.find((entry) => entry.type === type)?.value ?? ""
  return { day: part("day"), month: part("month"), year: part("year") }
}

// One short range in Bangkok days: the month and the year written once when both ends share them, Buddhist years in
// Thai. Built from parts, not formatRange, whose spacing differs by locale and ICU version.
export function formatRepairPeriod(from: Date, to: Date | null, locale: string): string {
  const format = new Intl.DateTimeFormat(locale === "th" ? "th-TH-u-ca-buddhist" : "en-GB", {
    timeZone: "Asia/Bangkok",
    day: "numeric",
    month: "short",
    year: "numeric",
  })
  const start = readDayParts(format, from)
  const end = to ? readDayParts(format, to) : null
  if (!end || (end.day === start.day && end.month === start.month && end.year === start.year)) {
    return `${start.day} ${start.month} ${start.year}`
  }
  if (end.year === start.year && end.month === start.month) return `${start.day} – ${end.day} ${end.month} ${end.year}`
  if (end.year === start.year) return `${start.day} ${start.month} – ${end.day} ${end.month} ${end.year}`
  return `${start.day} ${start.month} ${start.year} – ${end.day} ${end.month} ${end.year}`
}

// The PM list's order: active, then paused, then ended (an unknown state last), each by next due date, then id.
export function orderAssetPmPlans<T extends { id: string; planState: string; nextDueDate: Date }>(plans: readonly T[]): T[] {
  const order: readonly string[] = maintenancePlanStateOrder
  const rank = (state: string) => (order.includes(state) ? order.indexOf(state) : order.length)
  return [...plans].sort(
    (left, right) =>
      rank(left.planState) - rank(right.planState) ||
      left.nextDueDate.getTime() - right.nextDueDate.getTime() ||
      (left.id < right.id ? -1 : left.id > right.id ? 1 : 0),
  )
}

// A written-off asset gets no new plan: the due-PM queue never lists its plans (buildDuePmPlanWhere).
export function canSetUpPm(statusName: string, canCreate: boolean): boolean {
  return canCreate && !(CLOSED_AUDIT_STATUS_NAMES as readonly string[]).includes(statusName)
}
