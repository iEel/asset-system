// client-safe: `import type` and relative .ts imports only, so node --test loads it.
import type { WorkflowApprovalPolicy } from "@/lib/workflow-approval"
import { getApprovalAgeStatus, type ApprovalAgeStatus } from "./approval-aging.ts"
import {
  getDisposalApprovalBlock,
  type DisposalApprovalBlock,
  type DisposalBulkApprovalCandidate,
} from "./disposal-bulk-approval.ts"

export type ApprovalInboxKind =
  | "disposal_review"
  | "audit_finding_review"
  | "audit_round_close"

export type ApprovalInboxItem = {
  id: string
  kind: ApprovalInboxKind
  module: "disposal" | "audit"
  recordId: string
  title: string
  description: string
  requestedBy: string
  requestedAt: Date
  actionLabel: string
  href: string
  tone: "danger" | "warning" | "primary"
}

export type ApprovalInboxAccess = {
  canApproveDisposal: boolean
  canApproveAudit: boolean
  canAnyApproval: boolean
}

/** The inbox's words, built by the caller from the `approvalInboxPage` messages (getTranslations). */
export type ApprovalInboxCopy = {
  kindDisposal: string
  kindAudit: string
  actionDisposal: string
  actionFinding: string
  actionRound: string
  roundReady: string
  findingReview: string
  disposalReady: (assetName: string) => string
}

type ApprovalInboxTranslate = (key: string, values?: Record<string, string>) => string

/** The copy from an `approvalInboxPage` translator: `getTranslations({ locale, namespace: "approvalInboxPage" })`. */
export function buildApprovalInboxCopy(t: ApprovalInboxTranslate): ApprovalInboxCopy {
  return {
    kindDisposal: t("kindDisposal"),
    kindAudit: t("kindAudit"),
    actionDisposal: t("actionDisposal"),
    actionFinding: t("actionFinding"),
    actionRound: t("actionRound"),
    roundReady: t("roundReady"),
    findingReview: t("findingReview"),
    disposalReady: (assetName: string) => t("disposalReady", { assetName }),
  }
}

// ?item=<key>:<id> on the approvals page (group 6 spec §7.3, §7.5).
export const approvalInboxItemKeys = ["disposal", "finding", "round"] as const
export type ApprovalInboxItemKey = (typeof approvalInboxItemKeys)[number]

export function approvalInboxItemHref(locale: string, key: ApprovalInboxItemKey, id: string): string {
  return `/${locale}/admin/approvals?item=${key}:${id}`
}

const approvalInboxItemIdPattern = /^[A-Za-z0-9-]{1,100}$/

/** A known key and an id of letters, digits and dashes (up to 100); anything else, an array included, is null. */
export function parseApprovalInboxItemParam(value: string | string[] | undefined): { key: ApprovalInboxItemKey; id: string } | null {
  if (typeof value !== "string") return null
  const separator = value.indexOf(":")
  if (separator < 0) return null
  const key = value.slice(0, separator)
  const id = value.slice(separator + 1)
  if (!(approvalInboxItemKeys as readonly string[]).includes(key)) return null
  if (!approvalInboxItemIdPattern.test(id)) return null
  return { key: key as ApprovalInboxItemKey, id }
}

export type ApprovalInboxSource = {
  locale: string
  copy: ApprovalInboxCopy
  policy: WorkflowApprovalPolicy
  disposalRequests: Array<{
    id: string
    disposalNo: string
    assetTag: string
    assetName: string
    requestedBy: string
    requestDate: Date
  }>
  auditFindings: Array<{
    id: string
    auditNo: string
    findingType: string
    assetTag: string | null
    reportedBy: string
    reportedAt: Date
  }>
  auditRoundsReadyToClose: Array<{
    id: string
    auditNo: string
    name: string
    createdBy: string
    updatedAt: Date
  }>
}

// The work center's list and today's approvals page. Disposal items no longer hang on policy.disposalRequired: approval
// is always required in code (group 6 spec §7.2).
export function buildApprovalInboxItems(source: ApprovalInboxSource): ApprovalInboxItem[] {
  const items: ApprovalInboxItem[] = []
  const { copy } = source

  if (source.policy.auditCloseRequired) {
    for (const round of source.auditRoundsReadyToClose) {
      items.push({
        id: `audit-round-close:${round.id}`,
        kind: "audit_round_close",
        module: "audit",
        recordId: round.id,
        title: `${round.auditNo} - ${round.name}`,
        description: copy.roundReady,
        requestedBy: round.createdBy,
        requestedAt: round.updatedAt,
        actionLabel: copy.actionRound,
        href: approvalInboxItemHref(source.locale, "round", round.id),
        tone: "primary",
      })
    }
  }

  for (const finding of source.auditFindings) {
    items.push({
      id: `audit-finding-review:${finding.id}`,
      kind: "audit_finding_review",
      module: "audit",
      recordId: finding.id,
      title: `${finding.auditNo} - ${finding.assetTag ?? finding.findingType}`,
      description: `${copy.findingReview}: ${humanizeApprovalKey(finding.findingType)}`,
      requestedBy: finding.reportedBy,
      requestedAt: finding.reportedAt,
      actionLabel: copy.actionFinding,
      href: approvalInboxItemHref(source.locale, "finding", finding.id),
      tone: "warning",
    })
  }

  for (const request of source.disposalRequests) {
    items.push({
      id: `disposal-review:${request.id}`,
      kind: "disposal_review",
      module: "disposal",
      recordId: request.id,
      title: `${request.disposalNo} - ${request.assetTag}`,
      description: copy.disposalReady(request.assetName),
      requestedBy: request.requestedBy,
      requestedAt: request.requestDate,
      actionLabel: copy.actionDisposal,
      href: approvalInboxItemHref(source.locale, "disposal", request.id),
      tone: "danger",
    })
  }

  return items.sort((a, b) => {
    const toneOrder = tonePriority(b.tone) - tonePriority(a.tone)
    if (toneOrder !== 0) return toneOrder
    return b.requestedAt.getTime() - a.requestedAt.getTime()
  })
}

export type ApprovalInboxCountParts = { disposal: number; auditFindings: number; auditRoundsReady: number }

export function buildApprovalInboxCounts(parts: ApprovalInboxCountParts): { total: number; disposal: number; audit: number } {
  const audit = parts.auditFindings + parts.auditRoundsReady
  return { total: parts.disposal + audit, disposal: parts.disposal, audit }
}

function tonePriority(tone: ApprovalInboxItem["tone"]) {
  if (tone === "danger") return 3
  if (tone === "warning") return 2
  return 1
}

function humanizeApprovalKey(value: string) {
  return value.replaceAll("_", " ")
}

// ---------------------------------------------------------------------------------------------------------------------
// The read model of the approvals page (group 6 spec §7.2–7.3): every pending item, sorted, filtered and paged in memory.

export type ApprovalInboxTab = "all" | "disposal" | "audit"
export const approvalInboxTabs = ["all", "disposal", "audit"] as const satisfies readonly ApprovalInboxTab[]
export const approvalInboxPageSizes = [25, 50, 100] as const
export type ApprovalInboxPageSize = (typeof approvalInboxPageSizes)[number]

export type ApprovalInboxQuery = {
  tab: ApprovalInboxTab
  search: string
  overdue: boolean
  page: number
  pageSize: ApprovalInboxPageSize
}

const approvalInboxSearchMax = 100

function firstParam(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value
}

export function parseApprovalInboxQuery(searchParams: Record<string, string | string[] | undefined>): ApprovalInboxQuery {
  const tab = firstParam(searchParams.tab)
  const page = Number.parseInt(firstParam(searchParams.page) ?? "", 10)
  const pageSize = Number(firstParam(searchParams.pageSize))
  return {
    tab: tab && (approvalInboxTabs as readonly string[]).includes(tab) ? (tab as ApprovalInboxTab) : "all",
    search: (firstParam(searchParams.search) ?? "").trim().slice(0, approvalInboxSearchMax),
    overdue: firstParam(searchParams.overdue) === "1",
    page: Number.isFinite(page) && page >= 1 ? page : 1,
    pageSize: (approvalInboxPageSizes as readonly number[]).includes(pageSize) ? (pageSize as ApprovalInboxPageSize) : 25,
  }
}

/**
 * The approvals page's one link writer (group 6 plan 2 Task 2): the query with a patch applied. It always writes the
 * tab, and writes the search, the overdue filter, a page above 1, a page size other than 25 and an item only when set.
 * The caller passes `page: 1` when a filter changes; `item: null` (or no item) drops the open item.
 */
export function buildApprovalInboxHref(
  locale: string,
  query: ApprovalInboxQuery,
  patch: Partial<ApprovalInboxQuery> & { item?: string | null },
): string {
  const next = { ...query, ...patch }
  const params = new URLSearchParams()
  params.set("tab", next.tab)
  const search = next.search.trim()
  if (search) params.set("search", search)
  if (next.overdue) params.set("overdue", "1")
  if (next.page > 1) params.set("page", String(next.page))
  if (next.pageSize !== 25) params.set("pageSize", String(next.pageSize))
  if (patch.item) params.set("item", patch.item)
  return `/${locale}/admin/approvals?${params.toString()}`
}

/** "12 ต.ค." or, with the year, "12 ต.ค. 2569": the Bangkok day, Buddhist years in Thai. */
export function formatApprovalInboxDay(date: Date, locale: string, withYear: boolean): string {
  const format = new Intl.DateTimeFormat(locale === "th" ? "th-TH-u-ca-buddhist" : "en-GB", {
    timeZone: "Asia/Bangkok",
    day: "numeric",
    month: "short",
    ...(withYear ? { year: "numeric" as const } : {}),
  })
  const parts = format.formatToParts(date)
  const part = (type: Intl.DateTimeFormatPartTypes) => parts.find((entry) => entry.type === type)?.value ?? ""
  return [part("day"), part("month"), withYear ? part("year") : ""].filter(Boolean).join(" ")
}

export type ApprovalInboxRow = {
  key: ApprovalInboxItemKey
  id: string
  href: string
  kind: ApprovalInboxKind
  subtype: { kind: "method"; disposalType: string } | { kind: "finding"; findingType: string } | { kind: "close" }
  /** The asset's name, or the round's name. */
  title: string
  /** "tag · DP-/AUD- no", or the round's AUD- no. */
  codes: string
  /** Lowercased once: what the search matches. */
  searchText: string
  requesterName: string
  isOwn: boolean
  requestedAt: Date
  age: ApprovalAgeStatus
  /** Disposal only: why the viewer may not approve it. */
  block: DisposalApprovalBlock | null
  /** Disposal only, filled for the visible rows; null for the other kinds. */
  photoCount: number | null
  /** False for close rows and for blocked rows. */
  tickable: boolean
}

export type ApprovalInboxStrip = {
  overdue: { total: number; disposal: number; audit: number }
  oldest: { key: ApprovalInboxItemKey; id: string; title: string; ageDays: number; requestedAt: Date } | null
  total: { total: number; overdue: number; within: number }
}

export type ApprovalInboxTabCounts = { all: number; disposal: number; audit: number; findings: number; rounds: number }

export type ApprovalInboxPage = {
  access: ApprovalInboxAccess
  policy: WorkflowApprovalPolicy
  /** Every pending item the viewer may see; it does not follow the tab, the search or the overdue filter. */
  strip: ApprovalInboxStrip
  /** Follows the search and the overdue filter. */
  tabs: ApprovalInboxTabCounts
  /** The current page. */
  rows: ApprovalInboxRow[]
  filteredTotal: number
  page: number
  pageSize: ApprovalInboxPageSize
  /** Every row of the filtered list in the current tab, in inbox order, all pages: the panel's next item. */
  order: ApprovalInboxRef[]
  /** The tickable rows of the same list, in inbox order, all pages, uncapped (select-all caps at 200 on the client). */
  tickable: { disposal: ApprovalInboxTickable[]; finding: ApprovalInboxTickable[] }
  /** Keyed "<key>:<id>", for every row in `order`: the confirm's not-opened list. */
  titles: Record<string, { title: string; codes: string }>
}

export type ApprovalInboxRef = { key: ApprovalInboxItemKey; id: string }
export type ApprovalInboxTickable = { id: string; title: string; codes: string }

/** Every pending row already loaded: unsorted and before photo counts. */
export type ApprovalInboxPageSource = { rows: ApprovalInboxRow[] }

const rowKeyOrder: Record<ApprovalInboxItemKey, number> = { disposal: 0, finding: 1, round: 2 }

// Overdue first, then the oldest, then the kind (spec §7.3).
function compareApprovalInboxRows(a: ApprovalInboxRow, b: ApprovalInboxRow) {
  if (a.age.isOverdue !== b.age.isOverdue) return a.age.isOverdue ? -1 : 1
  if (a.age.ageDays !== b.age.ageDays) return b.age.ageDays - a.age.ageDays
  const time = a.requestedAt.getTime() - b.requestedAt.getTime()
  if (time !== 0) return time
  const kind = rowKeyOrder[a.key] - rowKeyOrder[b.key]
  if (kind !== 0) return kind
  return a.id < b.id ? -1 : a.id > b.id ? 1 : 0
}

function isAuditRow(row: ApprovalInboxRow) {
  return row.key === "finding" || row.key === "round"
}

/**
 * The page from every pending row: the strip counts everything, the tab counts follow the search and the overdue
 * filter, and the rows are the current tab's page (clamped to the last page). The ages are already on the rows, taken
 * at `now`.
 */
export function buildApprovalInboxPage(
  source: ApprovalInboxPageSource,
  query: ApprovalInboxQuery,
  now: Date,
): Omit<ApprovalInboxPage, "access" | "policy"> {
  void now
  const all = [...source.rows].sort(compareApprovalInboxRows)

  const overdueRows = all.filter((row) => row.age.isOverdue)
  const oldestRow = all.reduce<ApprovalInboxRow | null>(
    (oldest, row) => (!oldest || row.requestedAt.getTime() < oldest.requestedAt.getTime() ? row : oldest),
    null,
  )
  const strip: ApprovalInboxStrip = {
    overdue: {
      total: overdueRows.length,
      disposal: overdueRows.filter((row) => row.key === "disposal").length,
      audit: overdueRows.filter(isAuditRow).length,
    },
    oldest: oldestRow
      ? { key: oldestRow.key, id: oldestRow.id, title: oldestRow.title, ageDays: oldestRow.age.ageDays, requestedAt: oldestRow.requestedAt }
      : null,
    total: { total: all.length, overdue: overdueRows.length, within: all.length - overdueRows.length },
  }

  const search = query.search.trim().toLocaleLowerCase()
  const filtered = all.filter((row) => (!query.overdue || row.age.isOverdue) && (!search || row.searchText.includes(search)))
  const findings = filtered.filter((row) => row.key === "finding").length
  const rounds = filtered.filter((row) => row.key === "round").length
  const disposal = filtered.filter((row) => row.key === "disposal").length
  const tabs: ApprovalInboxTabCounts = { all: filtered.length, disposal, audit: findings + rounds, findings, rounds }

  const inTab = query.tab === "disposal"
    ? filtered.filter((row) => row.key === "disposal")
    : query.tab === "audit"
      ? filtered.filter(isAuditRow)
      : filtered
  const lastPage = Math.max(1, Math.ceil(inTab.length / query.pageSize))
  const page = Math.min(Math.max(1, Math.floor(query.page) || 1), lastPage)
  const rows = inTab.slice((page - 1) * query.pageSize, page * query.pageSize)

  const order: ApprovalInboxRef[] = inTab.map((row) => ({ key: row.key, id: row.id }))
  const tickableOf = (key: "disposal" | "finding") =>
    inTab.filter((row) => row.key === key && row.tickable).map((row) => ({ id: row.id, title: row.title, codes: row.codes }))
  const tickable = { disposal: tickableOf("disposal"), finding: tickableOf("finding") }
  const titles: Record<string, { title: string; codes: string }> = {}
  for (const row of inTab) titles[`${row.key}:${row.id}`] = { title: row.title, codes: row.codes }

  return { strip, tabs, rows, filteredTotal: inTab.length, page, pageSize: query.pageSize, order, tickable, titles }
}

/**
 * The current item's place in the inbox order (1-based, null when it is not there) and the next item: the first after
 * it not in `skip` ("<key>:<id>"), else the first from the start not in `skip` and not the current one, else null.
 */
export function approvalInboxNeighbours(
  order: ApprovalInboxPage["order"],
  current: ApprovalInboxRef,
  skip: ReadonlySet<string> = new Set(),
): { position: number | null; total: number; next: ApprovalInboxRef | null } {
  const isCurrent = (entry: ApprovalInboxRef) => entry.key === current.key && entry.id === current.id
  const open = (entry: ApprovalInboxRef) => !isCurrent(entry) && !skip.has(`${entry.key}:${entry.id}`)
  const index = order.findIndex(isCurrent)
  const next = (index >= 0 ? order.slice(index + 1).find(open) : undefined) ?? order.find(open) ?? null
  return { position: index >= 0 ? index + 1 : null, total: order.length, next }
}

/**
 * The page (1-based) that holds `target` once the `removed` items ("<key>:<id>": the decided item, and the siblings an
 * approve-all decides with it) have left the order: the next item's link opens the page it will stand on. An item not
 * in the order opens page 1.
 */
export function approvalInboxNextPage(
  order: ApprovalInboxPage["order"],
  target: ApprovalInboxRef,
  removed: ReadonlySet<string>,
  pageSize: number,
): number {
  const index = order.findIndex((entry) => entry.key === target.key && entry.id === target.id)
  if (index < 0) return 1
  const gone = order.slice(0, index).filter((entry) => removed.has(`${entry.key}:${entry.id}`)).length
  return Math.floor((index - gone) / Math.max(1, pageSize)) + 1
}

export type ApprovalInboxDisposalRecord = DisposalBulkApprovalCandidate & {
  disposalType: string
  requestDate: Date
  requesterName: string
  asset: DisposalBulkApprovalCandidate["asset"] & { name: string }
}

export type ApprovalInboxRowsInput = {
  locale: string
  now: Date
  slaDays: number
  viewer: { userId: string; employeeId?: string | null }
  segregationRequired: boolean
  /** User id → User.displayName; an id with no row (a removed account) shows as the raw id. */
  userNames: ReadonlyMap<string, string>
  /** The Thai short word of a finding type, for the search. */
  findingTypeLabel: (findingType: string) => string
  disposalRequests: ApprovalInboxDisposalRecord[]
  auditFindings: Array<{
    id: string
    auditNo: string
    findingType: string
    assetTag: string | null
    assetName: string | null
    reportedBy: string
    reportedAt: Date
  }>
  auditRounds: Array<{ id: string; auditNo: string; name: string; createdBy: string; updatedAt: Date }>
}

function searchTextOf(parts: Array<string | null | undefined>) {
  return parts.filter((part): part is string => Boolean(part)).join(" ").toLocaleLowerCase()
}

function codesOf(parts: Array<string | null | undefined>) {
  return parts.filter((part): part is string => Boolean(part)).join(" · ")
}

/** The page's rows from the loaded records: names, codes, search text, ages and block reasons; photo counts come later. */
export function buildApprovalInboxRows(input: ApprovalInboxRowsInput): ApprovalInboxRow[] {
  const { locale, now, slaDays, viewer } = input
  const nameOf = (userId: string) => input.userNames.get(userId) || userId
  const rows: ApprovalInboxRow[] = []

  for (const request of input.disposalRequests) {
    const block = getDisposalApprovalBlock(request, { userId: viewer.userId, employeeId: viewer.employeeId }, input.segregationRequired)
    const isOwn = Boolean(viewer.employeeId && request.requestedById === viewer.employeeId) || request.createdBy === viewer.userId
    rows.push({
      key: "disposal",
      id: request.id,
      href: approvalInboxItemHref(locale, "disposal", request.id),
      kind: "disposal_review",
      subtype: { kind: "method", disposalType: request.disposalType },
      title: request.asset.name,
      codes: codesOf([request.asset.assetTag, request.disposalNo]),
      searchText: searchTextOf([request.asset.name, request.asset.assetTag, request.disposalNo]),
      requesterName: request.requesterName,
      isOwn,
      requestedAt: request.requestDate,
      age: getApprovalAgeStatus(request.requestDate, now, slaDays),
      block,
      photoCount: null,
      tickable: block === null,
    })
  }

  for (const finding of input.auditFindings) {
    const typeLabel = input.findingTypeLabel(finding.findingType)
    rows.push({
      key: "finding",
      id: finding.id,
      href: approvalInboxItemHref(locale, "finding", finding.id),
      kind: "audit_finding_review",
      subtype: { kind: "finding", findingType: finding.findingType },
      title: finding.assetName || finding.assetTag || typeLabel,
      codes: codesOf([finding.assetTag, finding.auditNo]),
      searchText: searchTextOf([finding.assetName, finding.assetTag, finding.auditNo, typeLabel]),
      requesterName: nameOf(finding.reportedBy),
      isOwn: finding.reportedBy === viewer.userId,
      requestedAt: finding.reportedAt,
      age: getApprovalAgeStatus(finding.reportedAt, now, slaDays),
      block: null,
      photoCount: null,
      tickable: true,
    })
  }

  // A round's "sent" time is when it last changed (approximate, spec §7.3).
  for (const round of input.auditRounds) {
    rows.push({
      key: "round",
      id: round.id,
      href: approvalInboxItemHref(locale, "round", round.id),
      kind: "audit_round_close",
      subtype: { kind: "close" },
      title: round.name,
      codes: round.auditNo,
      searchText: searchTextOf([round.name, round.auditNo]),
      requesterName: nameOf(round.createdBy),
      isOwn: round.createdBy === viewer.userId,
      requestedAt: round.updatedAt,
      age: getApprovalAgeStatus(round.updatedAt, now, slaDays),
      block: null,
      photoCount: null,
      tickable: false,
    })
  }

  return rows
}
