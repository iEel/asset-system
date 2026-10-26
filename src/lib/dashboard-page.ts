// The dashboard page's pure helpers (group 1 spec §6.2, §6.3, §6.6): the company in the URL, the dashboard and register
// links, งานที่รอคุณ's rows and ages, and ตามสถานะ's table. Relative `.ts` imports only, so node --test imports it.
import { buildExactAssetRegisterHref } from "./asset-register-view-memory.ts"
import { dashboardRegisterParams, type DashboardOverview, type DashboardRegisterCount } from "./dashboard-overview-rules.ts"
import { getAssetStateTone, type UiTone } from "./design-system.ts"
import { formatCount } from "./display-format.ts"
import type { WaitingWorkAge, WaitingWorkCounts, WaitingWorkKey } from "./waiting-work-rules.ts"

/** Up to this many companies the switcher is a row of links; past it, a select in a GET form. */
export const DASHBOARD_COMPANY_TAB_LIMIT = 4

/** The company in the URL, only when it is an active company; anything else means all companies, never zeros (R23). */
export function normalizeDashboardCompanyId(raw: string | string[] | undefined, companies: readonly { id: string }[]): string | null {
  const value = (Array.isArray(raw) ? raw[0] : raw)?.trim()
  if (!value) return null
  return companies.some((company) => company.id === value) ? value : null
}

export function buildDashboardHref(locale: string, companyId: string | null): string {
  return companyId ? `/${locale}/dashboard?${new URLSearchParams({ companyId })}` : `/${locale}/dashboard`
}

/** A register link with the very params the overview counts with (R21), opened exactly. */
export function buildDashboardRegisterHref(locale: string, count: DashboardRegisterCount, companyId: string | null): string {
  return buildExactAssetRegisterHref(locale, dashboardRegisterParams(count, companyId))
}

export type DashboardWaiting = {
  rows: { key: WaitingWorkKey; count: number; age: WaitingWorkAge | null }[]
  zeroKeys: WaitingWorkKey[]
  total: number
  oldest: { days: number; overdue: boolean } | null
}

/** The visible kinds with a count in the shared order, the kinds at zero, their sum and the oldest wait (spec §6.3). */
export function buildDashboardWaiting(
  work: { counts: WaitingWorkCounts; visibleKeys: readonly WaitingWorkKey[] },
  ages: Partial<Record<WaitingWorkKey, WaitingWorkAge>>,
): DashboardWaiting {
  const rows = work.visibleKeys
    .filter((key) => work.counts[key] > 0)
    .map((key) => ({ key, count: work.counts[key], age: ages[key] ?? null }))
  const zeroKeys = work.visibleKeys.filter((key) => work.counts[key] === 0)
  const total = rows.reduce((sum, row) => sum + row.count, 0)

  let days = 0
  let overdue = false
  for (const { age } of rows) {
    if (!age) continue
    // An age counts its days; a due date counts only the days past it; an expiry is never a wait.
    if (age.kind === "age") days = Math.max(days, age.days)
    if (age.kind === "due" && age.days < 0) days = Math.max(days, -age.days)
    if (age.kind !== "expires" && age.overdue) overdue = true
  }

  return { rows, zeroKeys, total, oldest: days > 0 ? { days, overdue } : null }
}

export type DashboardAgeKey = "waitingAgeDays" | "waitingAgeUnderDay" | "waitingOverdue" | "waitingDueToday" | "waitingDueIn" | "waitingExpires"

/** The message key and values that read a row's age, its due date or its expiry, in Bangkok days (spec §6.3). */
export function describeWaitingAge(age: WaitingWorkAge, locale: string, now: Date): { key: DashboardAgeKey; values: Record<string, string>; overdue: boolean } {
  if (age.kind === "age") {
    return age.days > 0
      ? { key: "waitingAgeDays", values: { days: formatCount(age.days) }, overdue: age.overdue }
      : { key: "waitingAgeUnderDay", values: {}, overdue: age.overdue }
  }
  if (age.kind === "due") {
    if (age.days < 0) return { key: "waitingOverdue", values: { days: formatCount(-age.days) }, overdue: age.overdue }
    if (age.days === 0) return { key: "waitingDueToday", values: {}, overdue: age.overdue }
    return { key: "waitingDueIn", values: { days: formatCount(age.days) }, overdue: age.overdue }
  }
  return { key: "waitingExpires", values: { date: formatDayMonth(age.date, locale, now) }, overdue: false }
}

/** "20 พ.ย." or "20 Nov" in Bangkok, with the year ("12 ม.ค. 2570") only when it is not this Bangkok year. */
export function formatDayMonth(date: Date, locale: string, now: Date): string {
  const calendar = locale === "th" ? "th-TH-u-ca-buddhist" : "en-GB"
  const yearOf = (value: Date) =>
    new Intl.DateTimeFormat(calendar, { timeZone: "Asia/Bangkok", year: "numeric" }).formatToParts(value).find((part) => part.type === "year")?.value
  const sameYear = yearOf(date) === yearOf(now)
  return new Intl.DateTimeFormat(calendar, {
    timeZone: "Asia/Bangkok",
    day: "numeric",
    month: "short",
    ...(sameYear ? {} : { year: "numeric" }),
  }).format(date)
}

export type DashboardStatusRow = { key: string; name: string; count: number; share: number; href: string; tone: UiTone }

/** ตามสถานะ's table and bar: every status with a count, in the overview's order, each opening its own status exactly. */
export function buildDashboardStatusTable(rows: DashboardOverview["statusRows"], locale: string, companyId: string | null): DashboardStatusRow[] {
  const kept = rows.filter((row) => row.count > 0)
  const total = kept.reduce((sum, row) => sum + row.count, 0)
  return kept.map((row) => ({
    key: row.statusId,
    name: locale === "th" ? row.nameTh : row.name,
    count: row.count,
    share: total > 0 ? row.count / total : 0,
    href: buildDashboardRegisterHref(locale, { statusId: row.statusId }, companyId),
    // The English name, as the register's badge reads it.
    tone: getAssetStateTone(row.name),
  }))
}
