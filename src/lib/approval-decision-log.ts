import type { Prisma } from "@prisma/client"
import {
  buildSystemLogPresentation,
  type SystemLogChange,
  type SystemLogPresenterInput,
  type SystemLogRecordLabels,
} from "./system-log-presenter.ts"
import { bangkokDayBounds, parseSystemLogFilters } from "./system-log-filters.ts"
import { appendListPage } from "./list-pagination.ts"

export type ApprovalDecisionModuleFilter = "all" | "disposal" | "maintenance" | "audit"
export type ApprovalDecisionFilter = "all" | "approve" | "reject" | "close" | "execute"
export type ApprovalDecision = Exclude<ApprovalDecisionFilter, "all">

export type ApprovalDecisionLogSource = SystemLogPresenterInput

export type ApprovalDecisionLogItem = {
  id: string
  // The log's record (a disposal request, a repair ticket, an audit finding or round): the page looks up its asset.
  recordId: string | null
  module: Exclude<ApprovalDecisionModuleFilter, "all">
  decision: ApprovalDecision
  createdAt: Date
  actorLabel: string
  moduleLabel: string
  actionLabel: string
  recordLabel: string
  summary: string
  changes: SystemLogChange[]
  href: string | null
  remark: string | null
}

// Board AD-ApprovalHistory order: ทั้งหมด · ตัดจำหน่าย · ตรวจนับ · ซ่อมบำรุง.
export const approvalDecisionModuleFilters: ApprovalDecisionModuleFilter[] = ["all", "disposal", "audit", "maintenance"]
export const approvalDecisionFilters: ApprovalDecisionFilter[] = ["all", "approve", "reject", "close", "execute"]

export function parseApprovalDecisionModuleFilter(value: string | string[] | undefined): ApprovalDecisionModuleFilter {
  const normalized = Array.isArray(value) ? value[0] : value
  return approvalDecisionModuleFilters.includes(normalized as ApprovalDecisionModuleFilter)
    ? (normalized as ApprovalDecisionModuleFilter)
    : "all"
}

export function parseApprovalDecisionFilter(value: string | string[] | undefined): ApprovalDecisionFilter {
  const normalized = Array.isArray(value) ? value[0] : value
  return approvalDecisionFilters.includes(normalized as ApprovalDecisionFilter)
    ? (normalized as ApprovalDecisionFilter)
    : "all"
}

export function buildApprovalDecisionLogItems(
  logs: ApprovalDecisionLogSource[],
  labels: SystemLogRecordLabels,
  locale: string,
  t: (key: string) => string
): ApprovalDecisionLogItem[] {
  return logs
    .map((log) => {
      const decision = getApprovalDecision(log)
      const decisionModule = getApprovalDecisionModule(log)
      if (!decision || !decisionModule) return null

      const presentation = buildSystemLogPresentation(log, labels, locale, t)
      return {
        id: log.id,
        recordId: log.recordId ?? null,
        module: decisionModule,
        decision,
        createdAt: log.createdAt,
        actorLabel: presentation.userLabel,
        moduleLabel: presentation.moduleLabel,
        actionLabel: presentation.actionLabel,
        recordLabel: presentation.recordLabel,
        summary: presentation.summary,
        changes: presentation.changes,
        href: presentation.href,
        remark: presentation.remark,
      }
    })
    .filter((item): item is ApprovalDecisionLogItem => Boolean(item))
    .sort((left, right) => right.createdAt.getTime() - left.createdAt.getTime())
}

export function summarizeApprovalDecisionLog(items: ApprovalDecisionLogItem[]) {
  return {
    total: items.length,
    disposal: items.filter((item) => item.module === "disposal").length,
    maintenance: items.filter((item) => item.module === "maintenance").length,
    audit: items.filter((item) => item.module === "audit").length,
    approve: items.filter((item) => item.decision === "approve").length,
    reject: items.filter((item) => item.decision === "reject").length,
    close: items.filter((item) => item.decision === "close").length,
    execute: items.filter((item) => item.decision === "execute").length,
  }
}

export function filterApprovalDecisionLogItems(
  items: ApprovalDecisionLogItem[],
  moduleFilter: ApprovalDecisionModuleFilter,
  decisionFilter: ApprovalDecisionFilter
) {
  return items.filter((item) => {
    const moduleMatches = moduleFilter === "all" || item.module === moduleFilter
    const decisionMatches = decisionFilter === "all" || item.decision === decisionFilter
    return moduleMatches && decisionMatches
  })
}

export type ApprovalDecisionAccess = { canApproveDisposal: boolean; canApproveAudit: boolean }

export type ApprovalDecisionCountRow = { module: string; action: string; _count: { _all: number } }

// The actions of each decision by module: the table getApprovalDecision reads, written once more as data so the
// database can page and count the decision history (spec 2B §5.9.2 row 2). The test checks the two agree.
const approvalDecisionActions: Record<ApprovalDecisionLogItem["module"], Partial<Record<ApprovalDecision, readonly string[]>>> = {
  disposal: { approve: ["approve"], reject: ["reject"], execute: ["execute", "execute_historical_without_evidence"] },
  maintenance: { close: ["close"] },
  audit: { approve: ["approve_finding"], reject: ["reject_finding"], close: ["close"] },
}

// The decisions a user may see, cut by the module and decision tabs, as one where clause: the rows it finds are the
// rows buildApprovalDecisionLogItems keeps, so the page and its counts come from the database, not from the newest
// 150 rows. Old repair-close decisions (their approval was retired in 2026-10) show to whoever can edit maintenance.
// An empty OR finds nothing, as the list showed nothing before.
// Group 12 plan 2 task 4: the actor and the Bangkok date range are ANDed beside the permission OR (top-level keys), so
// they only ever narrow it: an actor never shows a decision the viewer may not see.
export function buildApprovalDecisionLogWhere({
  access,
  canSeeRepairCloseHistory,
  module: moduleFilter,
  decision: decisionFilter,
  actorId = null,
  dateFrom = null,
  dateTo = null,
}: {
  access: ApprovalDecisionAccess
  canSeeRepairCloseHistory: boolean
  module: ApprovalDecisionModuleFilter
  decision: ApprovalDecisionFilter
  actorId?: string | null
  dateFrom?: string | null
  dateTo?: string | null
}): Prisma.SystemLogWhereInput {
  const allowed: Record<ApprovalDecisionLogItem["module"], boolean> = {
    disposal: access.canApproveDisposal,
    maintenance: canSeeRepairCloseHistory,
    audit: access.canApproveAudit,
  }
  const conditions: Prisma.SystemLogWhereInput[] = []
  for (const decisionModule of ["disposal", "maintenance", "audit"] as const) {
    if (!allowed[decisionModule] || (moduleFilter !== "all" && moduleFilter !== decisionModule)) continue
    const actions = Object.entries(approvalDecisionActions[decisionModule])
      .filter(([decision]) => decisionFilter === "all" || decision === decisionFilter)
      .flatMap(([, moduleActions]) => moduleActions ?? [])
    if (actions.length > 0) conditions.push({ module: decisionModule, action: { in: actions } })
  }
  const where: Prisma.SystemLogWhereInput = { OR: conditions }
  if (actorId) where.userId = actorId
  if (dateFrom || dateTo) where.createdAt = bangkokDayBounds(dateFrom, dateTo)
  return where
}

// The summary of summarizeApprovalDecisionLog, folded from a systemLog.groupBy by module and action over every
// decision the user may see, so the strip and the tab counts are full totals (spec 2B §5.9.3).
export function summarizeApprovalDecisionCounts(rows: readonly ApprovalDecisionCountRow[]) {
  const summary = { total: 0, disposal: 0, maintenance: 0, audit: 0, approve: 0, reject: 0, close: 0, execute: 0 }
  for (const row of rows) {
    const decision = getApprovalDecision(row)
    const decisionModule = getApprovalDecisionModule(row)
    if (!decision || !decisionModule) continue
    summary.total += row._count._all
    summary[decisionModule] += row._count._all
    summary[decision] += row._count._all
  }
  return summary
}

// Group 12 plan 2 task 4 (spec §5): the chip counts, from one groupBy over the decisions the viewer may see within the
// actor and date filters. Each chip group ignores its own selection and applies the other's, so a group's chips add up
// to the list the other group's choice shows.
export function summarizeApprovalDecisionChipCounts(
  rows: readonly ApprovalDecisionCountRow[],
  moduleFilter: ApprovalDecisionModuleFilter,
  decisionFilter: ApprovalDecisionFilter,
) {
  const moduleCounts: Record<ApprovalDecisionModuleFilter, number> = { all: 0, disposal: 0, audit: 0, maintenance: 0 }
  const decisionCounts: Record<ApprovalDecisionFilter, number> = { all: 0, approve: 0, reject: 0, close: 0, execute: 0 }
  for (const row of rows) {
    const decision = getApprovalDecision(row)
    const decisionModule = getApprovalDecisionModule(row)
    if (!decision || !decisionModule) continue
    const count = row._count._all
    if (decisionFilter === "all" || decisionFilter === decision) {
      moduleCounts.all += count
      moduleCounts[decisionModule] += count
    }
    if (moduleFilter === "all" || moduleFilter === decisionModule) {
      decisionCounts.all += count
      decisionCounts[decision] += count
    }
  }
  return { module: moduleCounts, decision: decisionCounts }
}

export type ApprovalHistoryFilters = {
  module: ApprovalDecisionModuleFilter
  decision: ApprovalDecisionFilter
  actorId: string | null
  /** yyyy-mm-dd, a Bangkok calendar day. */
  dateFrom: string | null
  /** yyyy-mm-dd, a Bangkok calendar day (inclusive). */
  dateTo: string | null
}

// The history's URL: module, decision (names and values unchanged, other pages link with them), actorId, dateFrom and
// dateTo (the system log's date params and rules: real days only, a reversed range swaps).
export function parseApprovalHistoryFilters(input: Record<string, string | string[] | undefined>): ApprovalHistoryFilters {
  const { dateFrom, dateTo } = parseSystemLogFilters({ dateFrom: input.dateFrom, dateTo: input.dateTo })
  const rawActor = Array.isArray(input.actorId) ? input.actorId[0] : input.actorId
  return {
    module: parseApprovalDecisionModuleFilter(input.module),
    decision: parseApprovalDecisionFilter(input.decision),
    actorId: String(rawActor ?? "").trim() || null,
    dateFrom,
    dateTo,
  }
}

/** The list query string: "all", empty filters, page 1 and page size 25 stay out of it. */
export function buildApprovalHistoryQuery(filters: ApprovalHistoryFilters, page: { page?: number; pageSize?: number }): string {
  const params = new URLSearchParams()
  if (filters.module !== "all") params.set("module", filters.module)
  if (filters.decision !== "all") params.set("decision", filters.decision)
  if (filters.actorId) params.set("actorId", filters.actorId)
  if (filters.dateFrom) params.set("dateFrom", filters.dateFrom)
  if (filters.dateTo) params.set("dateTo", filters.dateTo)
  return appendListPage(params, page).toString()
}

const BANGKOK_OFFSET_MS = 7 * 60 * 60 * 1000
const DAY_MS = 24 * 60 * 60 * 1000

function bangkokDayKey(instant: number) {
  return new Date(instant + BANGKOK_OFFSET_MS).toISOString().slice(0, 10)
}

/** The rows under day headings, in the rows' order: "today", "yesterday" (Bangkok days), else the day as yyyy-mm-dd. */
export function groupDecisionsByDay(
  items: ApprovalDecisionLogItem[],
  now: Date,
): { key: "today" | "yesterday" | string; items: ApprovalDecisionLogItem[] }[] {
  const today = bangkokDayKey(now.getTime())
  const yesterday = bangkokDayKey(now.getTime() - DAY_MS)
  const groups: { key: string; items: ApprovalDecisionLogItem[] }[] = []
  const byDay = new Map<string, { key: string; items: ApprovalDecisionLogItem[] }>()
  for (const item of items) {
    const day = bangkokDayKey(item.createdAt.getTime())
    let group = byDay.get(day)
    if (!group) {
      group = { key: day === today ? "today" : day === yesterday ? "yesterday" : day, items: [] }
      byDay.set(day, group)
      groups.push(group)
    }
    group.items.push(item)
  }
  return groups
}

export function isApprovalDecisionLog(log: Pick<ApprovalDecisionLogSource, "module" | "action">) {
  return Boolean(getApprovalDecision(log) && getApprovalDecisionModule(log))
}

function getApprovalDecision(log: Pick<ApprovalDecisionLogSource, "module" | "action">): ApprovalDecision | null {
  if (log.module === "disposal") {
    if (log.action === "approve") return "approve"
    if (log.action === "reject") return "reject"
    if (log.action === "execute" || log.action === "execute_historical_without_evidence") return "execute"
  }
  if (log.module === "maintenance" && log.action === "close") return "close"
  if (log.module === "audit") {
    if (log.action === "approve_finding") return "approve"
    if (log.action === "reject_finding") return "reject"
    if (log.action === "close") return "close"
  }
  return null
}

function getApprovalDecisionModule(
  log: Pick<ApprovalDecisionLogSource, "module" | "action">
): ApprovalDecisionLogItem["module"] | null {
  if (log.module === "disposal") return "disposal"
  if (log.module === "maintenance" && log.action === "close") return "maintenance"
  if (log.module === "audit" && (log.action === "approve_finding" || log.action === "reject_finding" || log.action === "close")) {
    return "audit"
  }
  return null
}
