// The PM list's rules (group 5 spec §9, plan 4 G5P4-R1..R5): the query, the wheres, the order, the links and the row
// view. Pure and client-safe: Prisma types only, so tests and client parts import it.
import type { Prisma } from "@prisma/client"

import { appendListPage, parseListPage } from "./list-pagination.ts"
import { buildPmDueBucketWhere, getPmDueBadge, type PmDueBadge } from "./preventive-maintenance.ts"

export const pmPlanTabs = ["active", "paused", "ended"] as const
export type PmPlanTab = (typeof pmPlanTabs)[number]

export const pmDueFilters = ["overdue", "soon", "later", "week"] as const
export type PmDueFilter = (typeof pmDueFilters)[number]

export type PmPlanQuery = { tab: PmPlanTab; q: string; due: PmDueFilter | null; page: number; pageSize: number }

export const pmPlanSearchMaxLength = 100

type RawParams = URLSearchParams | Record<string, string | string[] | undefined>

function readParam(params: RawParams, key: string): string | undefined {
  if (params instanceof URLSearchParams) return params.get(key) ?? undefined
  const value = params[key]
  return Array.isArray(value) ? value[0] : value
}

function oneOf<T extends string>(value: string | undefined, options: readonly T[]): T | null {
  return options.find((option) => option === value) ?? null
}

// ?state= picks the tab (active when missing or unknown), ?q= the search, ?due= a due bucket on the active tab only.
export function parsePmPlanQuery(params: RawParams): PmPlanQuery {
  const tab = oneOf(readParam(params, "state"), pmPlanTabs) ?? "active"
  const q = (readParam(params, "q") ?? "").trim().slice(0, pmPlanSearchMaxLength)
  const due = tab === "active" ? oneOf(readParam(params, "due"), pmDueFilters) : null
  const { page, pageSize } = parseListPage({ page: readParam(params, "page"), pageSize: readParam(params, "pageSize") })
  return { tab, q, due, page, pageSize }
}

export function buildPmPlanSearchWhere(q: string): Prisma.MaintenancePlanWhereInput {
  if (!q) return {}
  return {
    OR: [
      { title: { contains: q } },
      { planNo: { contains: q } },
      { asset: { name: { contains: q } } },
      { asset: { assetTag: { contains: q } } },
    ],
  }
}

// The list's where: the tab's state, the search and, on the active tab, the due bucket (G5P4-R2). The active tab
// keeps plans of written-off or inactive assets; only a due bucket leaves them out (G5P4-R3).
export function buildPmPlanListWhere(query: PmPlanQuery, now: Date): Prisma.MaintenancePlanWhereInput {
  const parts: Prisma.MaintenancePlanWhereInput[] = [{ planState: query.tab }]
  if (query.q) parts.push(buildPmPlanSearchWhere(query.q))
  if (query.tab === "active" && query.due) parts.push(buildPmDueBucketWhere(query.due, now))
  return { AND: parts }
}

// G5P4-R4: active and paused by next due date, ended newest ended first; id breaks ties so pages never overlap.
export function pmPlanListOrder(tab: PmPlanTab): Prisma.MaintenancePlanOrderByWithRelationInput[] {
  if (tab === "ended") return [{ updatedAt: "desc" }, { id: "asc" }]
  return [{ nextDueDate: "asc" }, { id: "asc" }]
}

// A link of the PM list. Every change but a page change goes back to page 1; q and the page size stay. A new tab
// drops due, and a due cell already in use links back to the list without it (G5P4-R2).
export function buildPmPlanHref(locale: string, query: PmPlanQuery, change: Partial<PmPlanQuery>): string {
  const tab = change.tab ?? query.tab
  const q = change.q ?? query.q
  let due = "due" in change ? change.due ?? null : query.due
  if (change.due && change.due === query.due) due = null
  if (tab !== query.tab || tab !== "active") due = null
  const params = new URLSearchParams()
  if (tab !== "active") params.set("state", tab)
  if (q) params.set("q", q)
  if (due) params.set("due", due)
  appendListPage(params, { page: change.page, pageSize: change.pageSize ?? query.pageSize })
  const search = params.toString()
  return search ? `/${locale}/maintenance/pm?${search}` : `/${locale}/maintenance/pm`
}

// The fields of one plan the list reads (pm-plan-page-data.ts selects exactly these).
export type PmPlanRecord = {
  id: string
  planNo: string
  title: string
  frequency: string
  intervalDays: number
  nextDueDate: Date
  planState: string
  isActive: boolean
  updatedAt: Date
  asset: { id: string; name: string; assetTag: string; isActive: boolean; status: { name: string; nameTh: string } }
  vendor: { code: string; name: string } | null
}

export type PmPlanOpenRecord = { id: string; repairNo: string }

export type PmPlanRowDue =
  | { kind: "badge"; badge: PmDueBadge }
  | { kind: "assetStatus"; statusName: string; statusLabel: string }
  | { kind: "dateOnly" }
  | { kind: "endedAt"; at: Date }

export type PmPlanRowView = {
  id: string
  planNo: string
  title: string
  assetId: string
  assetName: string
  assetTag: string
  frequency: string
  intervalDays: number
  nextDueDate: Date
  planState: PmPlanTab
  updatedAt: Date
  vendor: { code: string; name: string } | null
  due: PmPlanRowDue
  openRecord: PmPlanOpenRecord | null
}

const writtenOffStatusNames: readonly string[] = ["Disposed", "Retired"]

// The database allows only the three states (CHECK of 2026-07-14); anything else reads as the service does.
function toTab(plan: Pick<PmPlanRecord, "planState" | "isActive">): PmPlanTab {
  return oneOf(plan.planState, pmPlanTabs) ?? (plan.isActive ? "active" : "paused")
}

// One row. An active plan of a written-off or inactive asset shows the asset's status, as the due counts leave it out
// (G5P4-R3). An open record names the record but leaves the due badge: the plan still counts by its date (G5P4-R5).
export function toPmPlanRowView(
  plan: PmPlanRecord,
  openRecordByAsset: Map<string, PmPlanOpenRecord>,
  now: Date,
): PmPlanRowView {
  const planState = toTab(plan)
  const assetOut = !plan.asset.isActive || writtenOffStatusNames.includes(plan.asset.status.name)
  let due: PmPlanRowDue
  if (planState === "ended") due = { kind: "endedAt", at: plan.updatedAt }
  else if (planState === "paused") due = { kind: "dateOnly" }
  else if (assetOut) due = { kind: "assetStatus", statusName: plan.asset.status.name, statusLabel: plan.asset.status.nameTh }
  else if (!plan.isActive) due = { kind: "dateOnly" }
  else due = { kind: "badge", badge: getPmDueBadge(plan.nextDueDate, now) }
  return {
    id: plan.id,
    planNo: plan.planNo,
    title: plan.title,
    assetId: plan.asset.id,
    assetName: plan.asset.name,
    assetTag: plan.asset.assetTag,
    frequency: plan.frequency,
    intervalDays: plan.intervalDays,
    nextDueDate: plan.nextDueDate,
    planState,
    updatedAt: plan.updatedAt,
    vendor: plan.vendor ? { code: plan.vendor.code, name: plan.vendor.name } : null,
    due,
    openRecord: openRecordByAsset.get(plan.asset.id) ?? null,
  }
}
