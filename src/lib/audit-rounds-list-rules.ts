// The rounds list's rules (group 2 spec §5, §6, §13 bugs 3-5): the status tabs and work views, the list URL, the
// Bangkok year, the scope and the search, each round's insight, close readiness, the next step and the dates line.
// Pure: relative .ts imports and type-only Prisma, so node tests import it.
import type { Prisma } from "@prisma/client"

import { emptyAuditRoundCounts, type AuditRoundCounts } from "./audit-round-counts-rules.ts"
import { isAuditRoundOperationalStatus } from "./audit-round-status.ts"
import { appendListPage } from "./list-pagination.ts"
import { appendOperationalReturnTo } from "./operational-return-navigation.ts"
import { bangkokDayDiff } from "./waiting-work-rules.ts"
import { getBangkokDateKey } from "./preventive-maintenance.ts"
import { openAuditFindingActionStatuses } from "./audit-finding-filters.ts"
import { auditPercent } from "./dashboard-overview-rules.ts"
import { isSameAuditActor } from "./audit-segregation.ts"

export const auditRoundTabs = ["open", "closed", "cancelled", "all"] as const
export type AuditRoundTab = (typeof auditRoundTabs)[number]
export const auditRoundWorkViews = ["pending", "review", "readyToClose"] as const
export type AuditRoundWorkView = (typeof auditRoundWorkViews)[number]
export type AuditRoundView = AuditRoundTab | AuditRoundWorkView

export const DEFAULT_AUDIT_ROUND_VIEW: AuditRoundTab = "open"

// An unknown value, an old ?view=mismatch included, opens the default tab (group 2 R7).
export function parseAuditRoundView(raw: string | string[] | undefined): AuditRoundView {
  const value = Array.isArray(raw) ? raw[0] : raw
  if ((auditRoundTabs as readonly string[]).includes(value ?? "")) return value as AuditRoundTab
  if ((auditRoundWorkViews as readonly string[]).includes(value ?? "")) return value as AuditRoundWorkView
  return DEFAULT_AUDIT_ROUND_VIEW
}

export function isAuditRoundWorkView(view: AuditRoundView): view is AuditRoundWorkView {
  return (auditRoundWorkViews as readonly string[]).includes(view)
}

// A work view narrows the กำลังดำเนินการ tab, so that tab stays current.
export function auditRoundTabOf(view: AuditRoundView): AuditRoundTab {
  return isAuditRoundWorkView(view) ? "open" : view
}

// The list URL. appendListPage writes page only above 1 and pageSize only when it is not 25 (spec 2B §5.9.1).
// The default tab (กำลังดำเนินการ) is the bare URL, so the dashboard's `?view=open` still opens it, and `?view=all` is
// written out (group 2 R7).
export function buildAuditRoundsHref(locale: string, view: AuditRoundView, searchText: string, listPage: { page?: number; pageSize?: number } = {}): string {
  const params = new URLSearchParams()
  if (searchText) params.set("search", searchText)
  if (view !== DEFAULT_AUDIT_ROUND_VIEW) params.set("view", view)
  const query = appendListPage(params, listPage).toString()
  return `/${locale}/audit/rounds${query ? `?${query}` : ""}`
}

export function bangkokYear(now: Date): number {
  return Number(getBangkokDateKey(now).slice(0, 4))
}

// The number, the name, and the code or name of each coded scope; names and the department, category and custodian
// are new (§13 bug 4). Status and condition are left out: their short names ("ดี") would match most rounds.
export function buildAuditRoundSearchWhere(searchText: string): Prisma.AuditRoundWhereInput {
  const contains = { contains: searchText }
  return {
    OR: [
      { auditNo: contains },
      { name: contains },
      { scopeCompany: { code: contains } },
      { scopeCompany: { nameTh: contains } },
      { scopeBranch: { code: contains } },
      { scopeBranch: { name: contains } },
      { scopeDepartment: { code: contains } },
      { scopeDepartment: { name: contains } },
      { scopeLocation: { code: contains } },
      { scopeLocation: { name: contains } },
      { scopeCategory: { code: contains } },
      { scopeCategory: { name: contains } },
      { scopeCustodian: { code: contains } },
      { scopeCustodian: { fullNameTh: contains } },
    ],
  }
}

export type AuditRoundScopeKey = "company" | "branch" | "department" | "location" | "category" | "custodian" | "status" | "condition"

export type AuditRoundScopeSource = {
  scopeCompany: { code: string; nameTh: string } | null
  scopeBranch: { code: string; name: string } | null
  scopeDepartment: { code: string; name: string } | null
  scopeLocation: { code: string; name: string } | null
  scopeCategory: { code: string; name: string } | null
  scopeCustodian: { code: string; fullNameTh: string } | null
  scopeStatus: { name: string; nameTh: string } | null
  scopeCondition: { name: string; nameTh: string } | null
}

export type AuditRoundScopePart = { key: AuditRoundScopeKey; code: string | null; name: string }

// Every scope condition the round has, in the create form's order, named like its options (audit-options.ts).
export function buildAuditRoundScopeParts(round: AuditRoundScopeSource): AuditRoundScopePart[] {
  const parts: AuditRoundScopePart[] = []
  if (round.scopeCompany) parts.push({ key: "company", code: round.scopeCompany.code, name: round.scopeCompany.nameTh })
  if (round.scopeBranch) parts.push({ key: "branch", code: round.scopeBranch.code, name: round.scopeBranch.name })
  if (round.scopeDepartment) parts.push({ key: "department", code: round.scopeDepartment.code, name: round.scopeDepartment.name })
  if (round.scopeLocation) parts.push({ key: "location", code: round.scopeLocation.code, name: round.scopeLocation.name })
  if (round.scopeCategory) parts.push({ key: "category", code: round.scopeCategory.code, name: round.scopeCategory.name })
  if (round.scopeCustodian) parts.push({ key: "custodian", code: round.scopeCustodian.code, name: round.scopeCustodian.fullNameTh })
  if (round.scopeStatus) parts.push({ key: "status", code: null, name: round.scopeStatus.nameTh || round.scopeStatus.name })
  if (round.scopeCondition) parts.push({ key: "condition", code: null, name: round.scopeCondition.nameTh || round.scopeCondition.name })
  return parts
}

export type AuditRoundFindingWorkRow = { auditRoundId: string; reviewStatus: string; actionStatus: string; count: number }
export type AuditRoundFindingWork = { pendingReview: number; openActions: number }

// Pending decisions and open action plans apart, each the way its own findings list counts it (group 2 R3).
export function foldAuditRoundFindingWork(rows: readonly AuditRoundFindingWorkRow[]): Map<string, AuditRoundFindingWork> {
  const work = new Map<string, AuditRoundFindingWork>()
  for (const row of rows) {
    const current = work.get(row.auditRoundId) ?? { pendingReview: 0, openActions: 0 }
    if (row.reviewStatus === "pending") current.pendingReview += row.count
    if ((openAuditFindingActionStatuses as readonly string[]).includes(row.actionStatus)) current.openActions += row.count
    work.set(row.auditRoundId, current)
  }
  return work
}

export type AuditRoundListInsight = {
  operational: boolean
  total: number
  pending: number
  checked: number
  pendingReview: number
  openActions: number
  outOfScope: number
  readyToClose: boolean
}

export const emptyAuditRoundListInsight: Readonly<AuditRoundListInsight> = Object.freeze({
  operational: false,
  total: 0,
  pending: 0,
  checked: 0,
  pendingReview: 0,
  openActions: 0,
  outOfScope: 0,
  readyToClose: false,
})

export function buildAuditRoundInsights(
  rounds: readonly { id: string; status: string }[],
  countsByRoundId: ReadonlyMap<string, AuditRoundCounts>,
  findingWork: ReadonlyMap<string, AuditRoundFindingWork>,
): Map<string, AuditRoundListInsight> {
  const insights = new Map<string, AuditRoundListInsight>()
  for (const { id, status } of rounds) {
    const counts = countsByRoundId.get(id) ?? emptyAuditRoundCounts
    const work = findingWork.get(id) ?? { pendingReview: 0, openActions: 0 }
    const operational = isAuditRoundOperationalStatus(status)
    insights.set(id, {
      operational,
      total: counts.total,
      pending: counts.pending,
      checked: counts.checked,
      pendingReview: work.pendingReview,
      openActions: work.openActions,
      // From the out-of-scope items, as the round page's list it opens (P2-R4).
      outOfScope: counts.outOfScope,
      // The close API's checklist (`src/lib/audit-round-close.ts` `getAuditRoundCloseChecklist`, R2); the opener rule is the
      // round page's (plan 2).
      readyToClose: operational && counts.pending === 0 && work.pendingReview === 0 && work.openActions === 0,
    })
  }
  return insights
}

export function filterRoundsByView<T extends { id: string; status: string }>(rounds: readonly T[], insights: ReadonlyMap<string, AuditRoundListInsight>, view: AuditRoundView): T[] {
  return rounds.filter((round) => {
    if (view === "all") return true
    if (view === "closed") return round.status === "closed"
    if (view === "cancelled") return round.status === "cancelled"
    // กำลังดำเนินการ and the work views: open rounds, a leftover draft included (spec §14).
    if (!isAuditRoundOperationalStatus(round.status)) return false
    const insight = insights.get(round.id) ?? emptyAuditRoundListInsight
    if (view === "pending") return insight.pending > 0
    if (view === "review") return insight.pendingReview > 0
    if (view === "readyToClose") return insight.readyToClose
    return true
  })
}

export function sumAuditRoundWork(insights: readonly AuditRoundListInsight[]): { pending: number; checked: number; pendingReview: number; openActions: number } {
  const sum = { pending: 0, checked: 0, pendingReview: 0, openActions: 0 }
  for (const insight of insights) {
    sum.pending += insight.pending
    sum.checked += insight.checked
    sum.pendingReview += insight.pendingReview
    sum.openActions += insight.openActions
  }
  return sum
}

// The computed "รอพิจารณา" badge: an open round fully walked, with decisions still pending.
export function isAuditRoundAwaitingDecision(insight: AuditRoundListInsight): boolean {
  return insight.operational && insight.pending === 0 && insight.pendingReview > 0
}

export type AuditRoundProgress = { started: boolean; value: number; percent: number }

export function buildAuditRoundProgress({ total, checked }: Pick<AuditRoundListInsight, "total" | "checked">): AuditRoundProgress {
  return { started: checked > 0, value: total > 0 ? checked / total : 0, percent: auditPercent(checked, total) }
}

export type AuditRoundDueLine = { kind: "left" | "overdue"; days: number } | null

// The end day itself still counts, so the last day reads เหลือ 1 วัน and the next day เลยกำหนด 1 วัน; display only,
// never a scan block (spec §6, R26).
export function buildAuditRoundDueLine(status: string, endDate: Date, today: Date): AuditRoundDueLine {
  if (!isAuditRoundOperationalStatus(status)) return null
  const diff = bangkokDayDiff(today, endDate)
  return diff >= 0 ? { kind: "left", days: diff + 1 } : { kind: "overdue", days: -diff }
}

export type AuditRoundStepKey = "walk" | "pendingList" | "review" | "actions" | "close" | "outOfScope"
export type AuditRoundStepLink = { key: AuditRoundStepKey; count: number | null; href: string }
export type AuditRoundNextStep = {
  main: AuditRoundStepLink | null
  second: { key: "review" | "actions"; count: number } | null
  outOfScope: AuditRoundStepLink | null
  more: AuditRoundStepLink[]
}

// The list offers "ปิดรอบตรวจ" only to someone who may close this round: audit:approve, and not its creator, as the
// close API refuses the creator (`api/audit-rounds/[id]/route.ts`, closeOwnRound).
export function canCloseAuditRoundFromList({ canApprove, userId, createdBy }: { canApprove: boolean; userId: string; createdBy: string | null }): boolean {
  return canApprove && !isSameAuditActor(userId, createdBy)
}

export function buildAuditRoundNextStep({ locale, roundId, insight, canScan, canClose, returnTo }: { locale: string; roundId: string; insight: AuditRoundListInsight; canScan: boolean; canClose: boolean; returnTo: string }): AuditRoundNextStep {
  if (!insight.operational) return { main: null, second: null, outOfScope: null, more: [] }
  const back = (href: string) => appendOperationalReturnTo(href, returnTo)
  const round = `/${locale}/audit/rounds/${roundId}`
  const pendingList: AuditRoundStepLink = { key: "pendingList", count: insight.pending, href: back(`${round}/pending`) }
  // The work in its order: the walk (the scan page needs audit:edit; anyone else gets the pending list), the
  // decisions, then the action plans (spec §6, R3). Each count is the rows its link opens.
  const tasks: AuditRoundStepLink[] = [
    ...(insight.pending > 0 ? [{ key: "walk" as const, count: insight.pending, href: canScan ? back(`${round}/scan`) : pendingList.href }] : []),
    ...(insight.pendingReview > 0 ? [{ key: "review" as const, count: insight.pendingReview, href: back(`/${locale}/audit/findings?status=pending&roundId=${roundId}`) }] : []),
    ...(insight.openActions > 0 ? [{ key: "actions" as const, count: insight.openActions, href: back(`/${locale}/audit/findings?status=action_open&roundId=${roundId}`) }] : []),
  ]
  const [first, ...rest] = tasks
  const second = rest[0]
  return {
    main: first ?? (insight.readyToClose && canClose ? { key: "close", count: null, href: back(round) } : null),
    second: second ? { key: second.key === "review" ? "review" : "actions", count: second.count ?? 0 } : null,
    outOfScope: insight.outOfScope > 0
      ? { key: "outOfScope", count: insight.outOfScope, href: `${round}?result=out_of_scope&returnTo=${encodeURIComponent(returnTo)}#audit-result-list` }
      : null,
    more: [...(canScan && insight.pending > 0 ? [pendingList] : []), ...rest],
  }
}
