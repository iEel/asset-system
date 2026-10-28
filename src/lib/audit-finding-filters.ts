// The findings page's rules (group 2 spec §5, §10; plan 4 Task 2): its statuses, one where per status in one AND list,
// the type words of the search, the list's order, the review queue's where and the one link writer. Pure and
// client-safe: `import type` and relative .ts imports only, so node --test and client parts import it.
import type { Prisma } from "@prisma/client"
import { appendListPage, parseListPage, type ListPageState } from "./list-pagination.ts"
import { normalizeAuditFindingsReturnTo } from "./operational-return-navigation.ts"
import { auditRoundCoverageWhere, auditRoundOperationalWhere } from "./audit-round-status.ts"
import {
  DEFAULT_WAITING_WORK_RULES,
  auditActionsDueSoonWhere,
  openAuditActionsWhere,
  startOfBangkokDay,
  type WaitingWorkRules,
} from "./waiting-work-rules.ts"

// The page's eight quick filters until Task 3 draws the six tabs (plan 4 Task 3 removes this list).
export const auditFindingResolutionStatuses = [
  "pending",
  "action_open",
  "overdue",
  "closed",
  "approved",
  "rejected",
  "exception",
  "all",
] as const

// The bell's two action kinds (group 1 spec §6.3): reached by a link only, never a tab.
export const auditFindingWaitingStatuses = ["action_not_due", "action_due_soon"] as const

export type AuditFindingWaitingStatus = (typeof auditFindingWaitingStatuses)[number]

// The six tabs (spec §10). ต้องติดตาม is the union of today's open follow-ups; its sub-chips are ต้องแก้ไข, เกินกำหนด (part of
// ต้องแก้ไข) and ต้องตรวจสอบพิเศษ (P4-R3).
export const auditFindingTabs = ["pending", "approved", "rejected", "followUp", "closed", "all"] as const

export type AuditFindingTab = (typeof auditFindingTabs)[number]

export const auditFindingFollowUpChips = ["action_open", "overdue", "exception"] as const

export type AuditFindingFollowUpChip = (typeof auditFindingFollowUpChips)[number]

// What the page counts: each tab, then each sub-chip. A bell kind's list counts itself.
export const auditFindingCountedStatuses = ["pending", "approved", "rejected", "follow_up", "closed", "all", "action_open", "overdue", "exception"] as const

export type AuditFindingCountedStatus = (typeof auditFindingCountedStatuses)[number]

export type AuditFindingCounts = Readonly<Record<AuditFindingCountedStatus, number>>

// Every value a findings URL's status carries: a tab, a sub-chip or a bell kind. The old values are sub-chips or the
// closed tab, so the bell's, the round page's and the rounds list's links keep their where (P4-R3).
export type AuditFindingStatus = AuditFindingCountedStatus | AuditFindingWaitingStatus

export type AuditFindingResolutionStatus = AuditFindingStatus

export const auditFindingTabStatus: Readonly<Record<AuditFindingTab, AuditFindingCountedStatus>> = Object.freeze({
  pending: "pending",
  approved: "approved",
  rejected: "rejected",
  followUp: "follow_up",
  closed: "closed",
  all: "all",
})

export type AuditFindingStatusView = { tab: AuditFindingTab; chip: AuditFindingFollowUpChip | null; waiting: AuditFindingWaitingStatus | null }

const statusViews: Readonly<Record<AuditFindingStatus, AuditFindingStatusView>> = Object.freeze({
  pending: { tab: "pending", chip: null, waiting: null },
  approved: { tab: "approved", chip: null, waiting: null },
  rejected: { tab: "rejected", chip: null, waiting: null },
  follow_up: { tab: "followUp", chip: null, waiting: null },
  closed: { tab: "closed", chip: null, waiting: null },
  all: { tab: "all", chip: null, waiting: null },
  action_open: { tab: "followUp", chip: "action_open", waiting: null },
  overdue: { tab: "followUp", chip: "overdue", waiting: null },
  exception: { tab: "followUp", chip: "exception", waiting: null },
  action_not_due: { tab: "followUp", chip: null, waiting: "action_not_due" },
  action_due_soon: { tab: "followUp", chip: null, waiting: "action_due_soon" },
})

export function auditFindingStatusView(status: AuditFindingStatus): AuditFindingStatusView {
  return statusViews[status]
}

export const openAuditFindingActionStatuses = ["planned", "in_progress", "done"] as const

export function isAuditFindingWaitingStatus(status: string): status is AuditFindingWaitingStatus {
  return auditFindingWaitingStatuses.includes(status as AuditFindingWaitingStatus)
}

export function resolveAuditFindingStatus(status?: string | null): AuditFindingStatus {
  return status && Object.hasOwn(statusViews, status) ? (status as AuditFindingStatus) : "pending"
}

export function isOpenAuditFindingActionStatus(status: string | null | undefined) {
  return openAuditFindingActionStatuses.includes(status as (typeof openAuditFindingActionStatuses)[number])
}

export function getAuditFindingToday(now = new Date()) {
  const today = new Date(now)
  today.setHours(0, 0, 0, 0)
  return today
}

// The six finding types, in the เรื่อง column's order (spec §10), and the round page's short word of each (auditRound
// namespace): ผู้ถือครอง / ที่ตั้ง / แผนก / สภาพ / ไม่พบ / นอกขอบเขต.
export const auditFindingTypes = ["wrong_custodian", "wrong_location", "wrong_department", "wrong_condition", "not_found", "out_of_scope"] as const

export type AuditFindingType = (typeof auditFindingTypes)[number]

export const auditFindingTypeShortLabelKeys: Readonly<Record<AuditFindingType, string>> = Object.freeze({
  wrong_custodian: "differenceField_custodian",
  wrong_location: "differenceField_location",
  wrong_department: "differenceField_department",
  wrong_condition: "differenceField_condition",
  not_found: "notFound",
  out_of_scope: "outOfScope",
})

/** เรื่อง: a known type, else none: an unknown value never filters and never reaches the screen. */
export function resolveAuditFindingType(value?: string | null): AuditFindingType | null {
  const type = value?.trim()
  return type && (auditFindingTypes as readonly string[]).includes(type) ? (type as AuditFindingType) : null
}

export type AuditFindingTypeSearchLabels = Readonly<Partial<Record<AuditFindingType, readonly string[]>>>

export type AuditFindingTypeTranslators = { finding: (key: string) => string; round: (key: string) => string }

// Each type's words in every language given: its short word and its long label (auditFinding.type_*), once each.
export function buildAuditFindingTypeSearchLabels(translators: readonly AuditFindingTypeTranslators[]): AuditFindingTypeSearchLabels {
  return Object.fromEntries(
    auditFindingTypes.map((type) => [type, [...new Set(translators.flatMap((t) => [t.round(auditFindingTypeShortLabelKeys[type]), t.finding(`type_${type}`)]))]]),
  )
}

// Bug 19: a field's name finds its findings ("ที่ตั้ง" finds ที่ตั้งไม่ตรง); a code is not a word, so it finds none.
export function auditFindingTypesMatchingSearch(search: string, labels: AuditFindingTypeSearchLabels = {}): AuditFindingType[] {
  const text = search.trim().toLocaleLowerCase()
  if (!text) return []
  return auditFindingTypes.filter((type) => (labels[type] ?? []).some((label) => label.toLocaleLowerCase().includes(text)))
}

function auditFindingSearchConditions(searchText: string, typeSearchLabels?: AuditFindingTypeSearchLabels): Prisma.AuditFindingWhereInput[] {
  const types = auditFindingTypesMatchingSearch(searchText, typeSearchLabels)
  return [
    { asset: { assetTag: { contains: searchText } } },
    { asset: { name: { contains: searchText } } },
    { auditRound: { auditNo: { contains: searchText } } },
    { auditRound: { name: { contains: searchText } } },
    ...(types.length > 0 ? [{ findingType: { in: types } }] : []),
  ]
}

type AuditFindingSingleStatus = Exclude<AuditFindingCountedStatus, "follow_up">
type AuditFindingStatusPart = { where: Prisma.AuditFindingWhereInput; scope: "operational" | "coverage" }

// Each status's own condition and today's round scope (audit-finding-filters.ts:101-118 at 704f2b26): the work still to
// do counts open rounds only; what was decided or closed counts every round but a cancelled one.
function auditFindingStatusPart(status: AuditFindingSingleStatus, now: Date): AuditFindingStatusPart {
  switch (status) {
    case "pending":
      return { where: { reviewStatus: "pending" }, scope: "operational" }
    case "action_open":
      return { where: { actionStatus: { in: [...openAuditFindingActionStatuses] } }, scope: "operational" }
    case "overdue":
      return { where: { actionStatus: { in: [...openAuditFindingActionStatuses] }, actionDueDate: { lt: getAuditFindingToday(now) } }, scope: "operational" }
    case "closed":
      return { where: { actionStatus: "closed" }, scope: "coverage" }
    case "approved":
    case "rejected":
    case "exception":
      return { where: { reviewStatus: status }, scope: "coverage" }
    case "all":
      return { where: {}, scope: "coverage" }
  }
}

// A round drops the scope, as every status does today: the round's own findings, whatever its status.
function scopedAuditFindingWhere(part: AuditFindingStatusPart, roundId: string | null | undefined): Prisma.AuditFindingWhereInput {
  if (roundId) return { ...part.where }
  return { ...part.where, auditRound: { isActive: true, status: part.scope === "operational" ? auditRoundOperationalWhere : auditRoundCoverageWhere } }
}

export function buildAuditFindingWhere({
  status,
  search,
  roundId,
  findingType,
  now = new Date(),
  rules = DEFAULT_WAITING_WORK_RULES,
  typeSearchLabels,
}: {
  status?: string | null
  search?: string | null
  roundId?: string | null
  findingType?: string | null
  now?: Date
  rules?: WaitingWorkRules
  typeSearchLabels?: AuditFindingTypeSearchLabels
}): Prisma.AuditFindingWhereInput {
  const resolvedStatus = resolveAuditFindingStatus(status)
  const searchText = search?.trim()
  const type = resolveAuditFindingType(findingType)
  const searchGroups: Prisma.AuditFindingWhereInput[] = searchText ? [{ OR: auditFindingSearchConditions(searchText, typeSearchLabels) }] : []

  // The bell's own where, narrowed under AND so a search never overwrites the OR the rule holds.
  if (isAuditFindingWaitingStatus(resolvedStatus)) {
    const today = startOfBangkokDay(now)
    const base = resolvedStatus === "action_not_due" ? openAuditActionsWhere(today, rules) : auditActionsDueSoonWhere(today, rules)
    const narrowing: Prisma.AuditFindingWhereInput[] = [
      ...(roundId ? [{ auditRoundId: roundId }] : []),
      ...(type ? [{ findingType: type }] : []),
      ...searchGroups,
    ]
    return narrowing.length ? { AND: [base, ...narrowing] } : base
  }

  // Plain conditions are keys of their own; each OR (ต้องติดตาม's union, the search) is one entry of AND, so none
  // overwrites another (FP §1). With no OR the where has no AND, as the round page's and the bell's own wheres.
  const groups: Prisma.AuditFindingWhereInput[] = []
  let where: Prisma.AuditFindingWhereInput
  if (resolvedStatus === "follow_up") {
    groups.push({ OR: [scopedAuditFindingWhere(auditFindingStatusPart("action_open", now), roundId), scopedAuditFindingWhere(auditFindingStatusPart("exception", now), roundId)] })
    where = {}
  } else {
    where = scopedAuditFindingWhere(auditFindingStatusPart(resolvedStatus, now), roundId)
  }
  if (roundId) where.auditRoundId = roundId
  if (type) where.findingType = type
  groups.push(...searchGroups)
  return groups.length > 0 ? { ...where, AND: groups } : where
}

// The list's order: newest report first, the id breaking ties, so no finding shows on two pages.
export const auditFindingsListOrderBy: Prisma.AuditFindingOrderByWithRelationInput[] = [{ reportedAt: "desc" }, { id: "asc" }]

// The findings the viewer may decide: the review route's own refusals (route.ts:49-52, :114-119) as a where. The
// panel's "k จาก N" and its next finding count these within the list (P4-R18).
export function auditFindingReviewableWhere(userId: string): Prisma.AuditFindingWhereInput {
  return { reviewStatus: "pending", reportedBy: { not: userId }, auditRound: { status: auditRoundOperationalWhere } }
}

/** The rows before a finding in the list's order. */
export function auditFindingsBeforeWhere(finding: { id: string; reportedAt: Date }): Prisma.AuditFindingWhereInput {
  return { OR: [{ reportedAt: { gt: finding.reportedAt } }, { reportedAt: finding.reportedAt, id: { lt: finding.id } }] }
}

/** The rows after a finding in the list's order. */
export function auditFindingsAfterWhere(finding: { id: string; reportedAt: Date }): Prisma.AuditFindingWhereInput {
  return { OR: [{ reportedAt: { lt: finding.reportedAt } }, { reportedAt: finding.reportedAt, id: { gt: finding.id } }] }
}

// The next finding after a decision (P4-R18): the first the viewer may decide after the decided one in the list's
// order, else the first such one before it; none means the tab is done. skip holds what the same press decided too
// (the siblings of "อนุมัติทุกช่องของทรัพย์สินนี้").
export function pickAuditFindingNextReviewId(after: readonly string[], before: readonly string[], skip: ReadonlySet<string>): string | null {
  return after.find((id) => !skip.has(id)) ?? before.find((id) => !skip.has(id)) ?? null
}

export type AuditFindingsListFilters = {
  status: AuditFindingStatus
  search: string
  roundId: string | null
  findingType: AuditFindingType | null
  /** ?finding=: the finding the panel shows (spec §10). */
  findingId: string | null
  /** The way back, or null (P4-R12). */
  returnTo: string | null
  listPage: ListPageState
  /** Whether the link asked for a page: without one, a link with a finding opens the page that holds it (P4-R18). */
  pageGiven: boolean
}

export type AuditFindingsListParams = Readonly<Record<string, string | string[] | undefined>>

function firstValue(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value
}

export function parseAuditFindingsListFilters(locale: string, params: AuditFindingsListParams): AuditFindingsListFilters {
  const text = (key: string) => firstValue(params[key])?.trim() ?? ""
  return {
    status: resolveAuditFindingStatus(text("status")),
    search: text("search"),
    roundId: text("roundId") || null,
    findingType: resolveAuditFindingType(text("findingType")),
    findingId: text("finding") || null,
    returnTo: normalizeAuditFindingsReturnTo(locale, params.returnTo),
    listPage: parseListPage({ page: params.page, pageSize: params.pageSize }),
    pageGiven: firstValue(params.page) !== undefined,
  }
}

export function resolveAuditFindingsListPage(listPage: ListPageState, { pageGiven, findingIndex }: { pageGiven: boolean; findingIndex: number | null }): ListPageState {
  if (pageGiven || findingIndex === null) return listPage
  return { ...listPage, page: Math.floor(findingIndex / listPage.pageSize) + 1 }
}

export type AuditFindingsHrefFilters = Pick<AuditFindingsListFilters, "status" | "search" | "roundId" | "findingType" | "returnTo">

export type AuditFindingsHrefOverrides = Partial<Pick<AuditFindingsListFilters, "status" | "search" | "roundId" | "findingType">> & {
  page?: number
  pageSize?: number
  finding?: string | null
}

// The one writer of a findings link: the page's tabs, chips, filters, pager, rows and next finding (P4-R12, P4-R18).
// returnTo rides on every link; the finding only where a caller asks for it.
export function buildAuditFindingsHref(locale: string, filters: AuditFindingsHrefFilters, overrides: AuditFindingsHrefOverrides = {}): string {
  const status = overrides.status ?? filters.status
  const search = overrides.search !== undefined ? overrides.search : filters.search
  const roundId = overrides.roundId !== undefined ? overrides.roundId : filters.roundId
  const findingType = overrides.findingType !== undefined ? overrides.findingType : filters.findingType
  const params = new URLSearchParams()
  params.set("status", status)
  if (search) params.set("search", search)
  if (roundId) params.set("roundId", roundId)
  if (findingType) params.set("findingType", findingType)
  // page only above 1 and pageSize only when it is not 25, so every default link stays as it was (spec 2B B4).
  appendListPage(params, { page: overrides.page, pageSize: overrides.pageSize })
  if (overrides.finding) params.set("finding", overrides.finding)
  if (filters.returnTo) params.set("returnTo", filters.returnTo)
  return `/${locale}/audit/findings?${params.toString()}`
}

// The query of a findings link: the search form's hidden inputs read it, so the one writer decides every name.
export function auditFindingsHrefQuery(href: string): URLSearchParams {
  return new URLSearchParams(href.split("#")[0].split("?")[1] ?? "")
}

export type AuditFindingsBack = { href: string; target: "round" | "rounds" }

// The back link (P4-R12): where the user came from, else the round the list is narrowed to, else the rounds list. The
// target picks its words: "กลับไปหน้ารอบ" for a round page, "กลับไปรอบตรวจนับ" for the rounds list (Task 3).
export function auditFindingsBack(locale: string, filters: Pick<AuditFindingsListFilters, "returnTo" | "roundId">): AuditFindingsBack {
  const rounds = `/${locale}/audit/rounds`
  // normalizeAuditFindingsReturnTo accepted only the rounds list or one round's page.
  if (filters.returnTo) return { href: filters.returnTo, target: filters.returnTo.split(/[?#]/)[0] === rounds ? "rounds" : "round" }
  return filters.roundId ? { href: `${rounds}/${encodeURIComponent(filters.roundId)}`, target: "round" } : { href: rounds, target: "rounds" }
}

// The filter in use as message keys, in display order: the tab, then its sub-chip or the bell's chip. The findings
// PDF's title reads them (Task 6), so the file names the filter as the page does, never by its URL value.
const auditFindingTabLabelKeys: Readonly<Record<AuditFindingTab, string>> = Object.freeze({
  pending: "auditFinding.status_pending",
  approved: "auditFinding.status_approved",
  rejected: "auditFinding.status_rejected",
  followUp: "auditFinding.tabFollowUp",
  closed: "auditFinding.filterClosed",
  all: "auditFinding.status_all",
})
const auditFindingChipLabelKeys: Readonly<Record<AuditFindingFollowUpChip | AuditFindingWaitingStatus, string>> = Object.freeze({
  action_open: "auditFinding.filterActionOpen",
  overdue: "auditFinding.filterOverdue",
  exception: "auditFinding.status_exception",
  action_not_due: "notifications.openAuditActions",
  action_due_soon: "notifications.auditActionsDueSoon",
})

export function auditFindingFilterLabelKeys(status: AuditFindingStatus): string[] {
  const view = auditFindingStatusView(status)
  const chip = view.chip ?? view.waiting
  return [auditFindingTabLabelKeys[view.tab], ...(chip ? [auditFindingChipLabelKeys[chip]] : [])]
}
