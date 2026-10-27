// The dashboard's overview rules (group 1 spec §6). Pure: relative `.ts` imports only, so node --test and the
// page's client parts can import it. Every day comparison is the waiting work's Bangkok helper.
import { isAuditRoundOperationalStatus } from "./audit-round-status.ts"
import { auditRoundBranchFilterName } from "./audit-round-result-filters.ts"
import type { SessionUser } from "./auth-utils.ts"
import { bangkokDayDiff } from "./waiting-work-rules.ts"

export type DashboardProfile = "work" | "overview"

const workModules = ["asset", "maintenance", "audit", "disposal"] as const
const workActions = ["create", "edit"] as const

/** "work" for anyone who does or approves the work, else "overview" (spec §6.1). Reads permissions, never role names. */
export function getDashboardProfile(user: Pick<SessionUser, "permissions" | "roles">, canAnyApproval: boolean): DashboardProfile {
  if (user.roles.includes("system_admin")) return "work"
  if (canAnyApproval) return "work"
  for (const workModule of workModules) {
    for (const action of workActions) {
      if (user.permissions.includes(`${workModule}:${action}`)) return "work"
    }
  }
  return "overview"
}

export type DashboardKpiKey = "waiting" | "audit" | "total" | "custodian"

export const DASHBOARD_KPI_ORDER: Record<DashboardProfile, readonly DashboardKpiKey[]> = {
  work: ["waiting", "audit", "total", "custodian"],
  overview: ["total", "custodian", "audit", "waiting"],
}

export type DashboardSectionKey = "waiting" | "branches" | "status" | "recent"

export const DASHBOARD_SECTION_ORDER: Record<DashboardProfile, readonly DashboardSectionKey[]> = {
  work: ["waiting", "branches", "status", "recent"],
  overview: ["status", "branches", "waiting", "recent"],
}

export type DashboardRegisterCount = "total" | "idle180" | "custodianAssigned" | "responsibilityMissing" | "crossScope" | { statusId: string }

/** The one place a dashboard number's register filter is written: the server counts with it and the page links with it. */
export function dashboardRegisterParams(count: DashboardRegisterCount, companyId: string | null): Record<string, string> {
  const params: Record<string, string> = {}
  if (companyId !== null) params.companyId = companyId
  if (typeof count === "object") {
    params.statusId = count.statusId
    return params
  }
  switch (count) {
    case "total":
      break
    case "idle180":
      params.activity = "idle_180d"
      break
    case "custodianAssigned":
      params.custodianState = "assigned"
      break
    case "responsibilityMissing":
      params.dataQuality = "responsibility"
      break
    case "crossScope":
      params.crossScope = "all"
      break
  }
  return params
}

/** How far through its dates a round should be by `today`, from 0 to 1, in Bangkok days (spec §6.7). */
export function auditPace(start: Date, due: Date, today: Date): number {
  const span = bangkokDayDiff(start, due)
  const elapsed = bangkokDayDiff(start, today)
  if (span <= 0) return elapsed >= 0 ? 1 : 0
  return Math.min(1, Math.max(0, elapsed / span))
}

/** A whole percent, as the round page and the rounds list show it. */
export function auditPercent(processed: number, expected: number): number {
  return expected > 0 ? Math.round((processed / expected) * 100) : 0
}

/** Behind compares the two whole percents a person reads, never the raw fractions. */
export function isBehindPace(processed: number, expected: number, pace: number | null): boolean {
  return pace !== null && expected > 0 && auditPercent(processed, expected) < Math.round(pace * 100)
}

type PickableAuditRound = { status: string; auditNo: string; startDate: Date; endDate: Date }

function byLatestStartThenCode(a: PickableAuditRound, b: PickableAuditRound): number {
  const start = b.startDate.getTime() - a.startDate.getTime()
  if (start !== 0) return start
  return a.auditNo < b.auditNo ? -1 : a.auditNo > b.auditNo ? 1 : 0
}

/**
 * The current round (spec §6.4, R15): an operational round (open, or an old draft read as open, group 2 spec §14) in
 * its dates with the nearest due date, else the one past due most recently; ties go to the latest start, then the code.
 * `otherOpen` counts every other operational round.
 */
export function pickCurrentAuditRound<T extends PickableAuditRound>(
  rounds: T[],
  today: Date,
  eligible?: (round: T) => boolean,
): { current: T | null; otherOpen: number } {
  const candidates = rounds.filter((round) => isAuditRoundOperationalStatus(round.status) && (eligible ? eligible(round) : true))
  const inDates = candidates
    .filter((round) => bangkokDayDiff(round.startDate, today) >= 0 && bangkokDayDiff(today, round.endDate) >= 0)
    .sort((a, b) => a.endDate.getTime() - b.endDate.getTime() || byLatestStartThenCode(a, b))
  const pastDue = candidates
    .filter((round) => bangkokDayDiff(round.endDate, today) > 0)
    .sort((a, b) => b.endDate.getTime() - a.endDate.getTime() || byLatestStartThenCode(a, b))
  const current = inDates[0] ?? pastDue[0] ?? null
  const operational = rounds.filter((round) => isAuditRoundOperationalStatus(round.status)).length
  return { current, otherOpen: current ? operational - 1 : operational }
}

function processedShare(row: { processed: number; expected: number }): number {
  return row.expected > 0 ? row.processed / row.expected : 1
}

/** The most behind branch first: the lowest share done, then more items left, then the name. Returns a new array. */
export function sortBranchesByGap<T extends { name: string; processed: number; expected: number }>(branches: readonly T[]): T[] {
  return [...branches].sort(
    (a, b) =>
      processedShare(a) - processedShare(b) ||
      (b.expected - b.processed) - (a.expected - a.processed) ||
      a.name.localeCompare(b.name, "th"),
  )
}

export type DashboardAuditRoundRow = { id: string; auditNo: string; name: string; status: string; startDate: Date; endDate: Date }

export type DashboardAuditItemCount = { auditRoundId: string; expectedBranchId: string; auditStatus: string; count: number }

export type DashboardOverview = {
  total: number
  idle180: number
  custodianAssigned: number
  custodianShare: number | null
  responsibilityMissing: number
  statusRows: { statusId: string; name: string; nameTh: string; count: number }[]
  crossScopeTotal: number
  audit: {
    round: { id: string; code: string; name: string; startDate: Date; endDate: Date } | null
    otherOpen: number
    processed: number
    expected: number
    pace: number | null
    branches: { branchId: string; name: string; processed: number; expected: number; behind: boolean }[]
  }
}

/** The current round's progress, pace and branch rows from one count of items (spec §6.2, §6.4, §6.7). */
export function buildDashboardAudit(input: {
  rounds: DashboardAuditRoundRow[]
  itemCounts: DashboardAuditItemCount[]
  branches: ReadonlyMap<string, { name: string; companyCode: string }>
  today: Date
  narrowedToCompany: boolean
}): DashboardOverview["audit"] {
  const { rounds, itemCounts, branches, today, narrowedToCompany } = input
  const roundsWithItems = new Set(itemCounts.map((row) => row.auditRoundId))
  const { current, otherOpen } = pickCurrentAuditRound(
    rounds,
    today,
    narrowedToCompany ? (round) => roundsWithItems.has(round.id) : undefined,
  )
  if (!current) return { round: null, otherOpen, processed: 0, expected: 0, pace: null, branches: [] }

  const pace = auditPace(current.startDate, current.endDate, today)
  const byBranch = new Map<string, { processed: number; expected: number }>()
  let processed = 0
  let expected = 0
  for (const row of itemCounts) {
    if (row.auditRoundId !== current.id) continue
    const done = row.auditStatus !== "pending" ? row.count : 0
    expected += row.count
    processed += done
    const branch = byBranch.get(row.expectedBranchId) ?? { processed: 0, expected: 0 }
    branch.expected += row.count
    branch.processed += done
    byBranch.set(row.expectedBranchId, branch)
  }

  const branchRows = [...byBranch].map(([branchId, counts]) => {
    const branch = branches.get(branchId)
    return {
      branchId,
      name: branch ? auditRoundBranchFilterName(branch, narrowedToCompany) : branchId,
      processed: counts.processed,
      expected: counts.expected,
      behind: isBehindPace(counts.processed, counts.expected, pace),
    }
  })

  return {
    round: { id: current.id, code: current.auditNo, name: current.name, startDate: current.startDate, endDate: current.endDate },
    otherOpen,
    processed,
    expected,
    pace,
    branches: sortBranchesByGap(branchRows),
  }
}

/** One row per status that has assets, active or not, in the status order; none merged (spec §6.6). */
export function buildDashboardStatusRows(
  groups: { statusId: string; count: number }[],
  statuses: { id: string; name: string; nameTh: string; sortOrder: number }[],
): DashboardOverview["statusRows"] {
  const statusById = new Map(statuses.map((status) => [status.id, status]))
  return groups
    .flatMap((group) => {
      const status = statusById.get(group.statusId)
      if (!status || group.count <= 0) return []
      return [{ status, row: { statusId: group.statusId, name: status.name, nameTh: status.nameTh, count: group.count } }]
    })
    .sort((a, b) => a.status.sortOrder - b.status.sortOrder || a.status.name.localeCompare(b.status.name))
    .map(({ row }) => row)
}

/** "25 ต.ค. 2569 14:05" in Thai, "25 Oct 2026 14:05" in English: Bangkok's time (spec §6.2). */
export function formatAsOf(date: Date, locale: string): string {
  const parts = new Intl.DateTimeFormat(locale === "th" ? "th-TH-u-ca-buddhist" : "en-GB", {
    timeZone: "Asia/Bangkok",
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(date)
  const part = (type: Intl.DateTimeFormatPartTypes) => parts.find((p) => p.type === type)?.value ?? ""
  return `${part("day")} ${part("month")} ${part("year")} ${part("hour")}:${part("minute")}`
}
