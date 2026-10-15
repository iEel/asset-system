import type { Prisma } from "@prisma/client"
import {
  buildSystemLogPresentation,
  type SystemLogChange,
  type SystemLogPresenterInput,
  type SystemLogRecordLabels,
} from "./system-log-presenter.ts"

export type ApprovalDecisionModuleFilter = "all" | "disposal" | "maintenance" | "audit"
export type ApprovalDecisionFilter = "all" | "approve" | "reject" | "close" | "execute"
export type ApprovalDecision = Exclude<ApprovalDecisionFilter, "all">

export type ApprovalDecisionLogSource = SystemLogPresenterInput

export type ApprovalDecisionLogItem = {
  id: string
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

export const approvalDecisionModuleFilters: ApprovalDecisionModuleFilter[] = ["all", "disposal", "maintenance", "audit"]
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
export function buildApprovalDecisionLogWhere({
  access,
  canSeeRepairCloseHistory,
  module: moduleFilter,
  decision: decisionFilter,
}: {
  access: ApprovalDecisionAccess
  canSeeRepairCloseHistory: boolean
  module: ApprovalDecisionModuleFilter
  decision: ApprovalDecisionFilter
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
  return { OR: conditions }
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
