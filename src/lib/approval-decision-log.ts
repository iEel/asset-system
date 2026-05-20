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

export function isApprovalDecisionLog(log: Pick<ApprovalDecisionLogSource, "module" | "action">) {
  return Boolean(getApprovalDecision(log) && getApprovalDecisionModule(log))
}

function getApprovalDecision(log: Pick<ApprovalDecisionLogSource, "module" | "action">): ApprovalDecision | null {
  if (log.module === "disposal") {
    if (log.action === "approve") return "approve"
    if (log.action === "reject") return "reject"
    if (log.action === "execute") return "execute"
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
