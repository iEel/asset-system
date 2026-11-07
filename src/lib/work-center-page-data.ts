// The work center page's one server loader (group 9 plan 2 task 1, boards WC and WC-Phone, spec §4 and §6.1): the
// view-scoped queue summary, the previous recorded day, the unread topics, the ติดตามแยก panel, the ranked rows with
// `show`, the ข้อมูลไม่ครบ tab's data, and the day's counts recorded on view=all. Every reader can be injected (`deps`).
import type { Prisma } from "@prisma/client"

import { prisma } from "@/lib/db"
import { hasPermission, type SessionUser } from "@/lib/auth-utils"
import { getApprovalInboxSlaDays } from "@/lib/approval-inbox-query"
import { assetMissingResponsibilityWhere } from "@/lib/asset-ownership"
import { installedOrOutstandingLinkWhere } from "@/lib/asset-component-outstanding"
import { auditRoundOperationalWhere } from "@/lib/audit-round-status"
import {
  compareWithPrevious,
  readPreviousDayCounts,
  recordDailyCounts,
  type DailyCountComparison,
  type DailyCountCounts,
} from "@/lib/notification-daily-counts"
import { getNotificationSummary } from "@/lib/notification-summary"
import { getWaitingWork, type WaitingWork } from "@/lib/waiting-work"
import {
  approvedDisposalsWhere,
  auditActionsDueSoonWhere,
  duePmWhere,
  openAuditActionsWhere,
  openRepairsWhere,
  pendingAuditFindingsWhere,
  pendingDisposalsWhere,
  startOfBangkokDay,
  stuckRepairsWhere,
  type WaitingWorkCounts,
  type WaitingWorkKey,
  type WaitingWorkRules,
} from "@/lib/waiting-work-rules"
import { countDataIssueAssets } from "@/lib/work-center-data-issues"
import { getWorkCenterRows, type WorkRow } from "@/lib/work-center-row-data"
import {
  applyAssetWorkCenterScope,
  applyAuditFindingWorkCenterScope,
  applyAuditItemWorkCenterScope,
  applyDisposalWorkCenterScope,
  applyMaintenanceWorkCenterScope,
  applyPlanWorkCenterScope,
  type WorkCenterUserScope,
} from "@/lib/work-center-scope"
import {
  buildDataQualityFixGroups,
  buildWorkCenterHref,
  buildWorkCenterUserScope,
  parseWorkCenterParams,
  type WorkCenterParamInput,
  type WorkCenterParams,
} from "@/lib/work-center-view"
import { WORK_QUEUES, buildWorkQueueSummary, type WorkQueue, type WorkQueueSummary } from "@/lib/work-queues"

/** งานของฉัน narrows these kinds to the user's employee or department; the approval inbox is always the user's own. */
export const MINE_SCOPED_KEYS = [
  "openRepairs",
  "stuckRepairs",
  "duePm",
  "pendingAuditFindings",
  "openAuditActions",
  "auditActionsDueSoon",
  "pendingDisposals",
  "approvedDisposals",
] as const satisfies readonly WaitingWorkKey[]

export type MineScopedKey = (typeof MINE_SCOPED_KEYS)[number]

export type TrackingRoundCandidate = { id: string; auditNo: string; name: string; total: number; pending: number }

export type WorkCenterAssetIssue = {
  id: string
  assetTag: string
  name: string
  serialNumber: string | null
  ownershipType: string
  custodianId: string | null
  departmentId: string | null
  installedInLinks: { id: string }[]
  attachments: { id: string }[]
}

/** The ข้อมูลไม่ครบ tab: the three fix-card counts, the cards with their `dataQuality=` links, and the asset list. */
export type WorkCenterAssetsData = {
  counts: { missingResponsibility: number; missingSerial: number; missingPhoto: number }
  fixGroups: ReturnType<typeof buildDataQualityFixGroups>
  assets: WorkCenterAssetIssue[]
}

export type WorkCenterPageData = {
  params: WorkCenterParams
  mineUnavailable: boolean
  /** Counts of the current view (งานของฉัน scoped except the approval inbox). */
  summary: WorkQueueSummary
  /** Each key's count in the current view (the queue tab's parts line). */
  counts: WaitingWorkCounts
  /** null under งานของฉัน or when nothing is recorded before today. */
  previous: { dayLabelDate: Date; isYesterday: boolean; backlogTotal: number; backlogChange: DailyCountComparison } | null
  unreadTopics: number
  tracking: {
    round: { id: string; auditNo: string; name: string; checked: number; total: number; pending: number } | null
    dataIssues: number | null
    advanceTotal: number
    /** audit:edit, the scan page's permission: เดินตรวจต่อ, else the round's page. */
    canScan: boolean
  }
  /** null on panel=assets. */
  table: { rows: WorkRow[]; total: number; show: number } | null
  /** Only on panel=assets (with asset:view). */
  assets: WorkCenterAssetsData | null
}

export type WorkCenterPageDeps = {
  getWaitingWork(user: SessionUser, now: Date): Promise<WaitingWork>
  readDepartmentId(employeeId: string): Promise<string | null>
  countMine(key: MineScopedKey, context: { today: Date; rules: WaitingWorkRules; scope: WorkCenterUserScope }): Promise<number>
  getRows: typeof getWorkCenterRows
  getSlaDays(): Promise<number>
  countDataIssues(user: SessionUser): Promise<number | null>
  /** The operational rounds with their item totals and pending items, the scope applied when given. */
  readTrackingRounds(scope: WorkCenterUserScope | null): Promise<TrackingRoundCandidate[]>
  readUnreadTopics(user: SessionUser, locale: string): Promise<number>
  recordDailyCounts(userId: string, counts: DailyCountCounts, now: Date): Promise<void>
  readPreviousDayCounts(userId: string, now: Date): ReturnType<typeof readPreviousDayCounts>
  loadAssets(input: { locale: string; params: WorkCenterParams; scope: WorkCenterUserScope | null }): Promise<WorkCenterAssetsData>
}

// The scoped wheres moved unchanged from the page's "ของฉัน" counters.
const mineCounters: Record<
  MineScopedKey,
  (context: { today: Date; rules: WaitingWorkRules; scope: WorkCenterUserScope }) => Promise<number>
> = {
  openRepairs: ({ scope }) =>
    prisma.maintenanceTicket.count({ where: applyMaintenanceWorkCenterScope({ ...openRepairsWhere }, true, scope) }),
  stuckRepairs: ({ scope }) => prisma.asset.count({ where: applyAssetWorkCenterScope(stuckRepairsWhere, true, scope) }),
  duePm: ({ today, scope }) => prisma.maintenancePlan.count({ where: applyPlanWorkCenterScope(duePmWhere(today), true, scope) }),
  pendingAuditFindings: ({ scope }) =>
    prisma.auditFinding.count({ where: applyAuditFindingWorkCenterScope(pendingAuditFindingsWhere, true, scope) }),
  openAuditActions: ({ today, rules, scope }) =>
    prisma.auditFinding.count({ where: applyAuditFindingWorkCenterScope(openAuditActionsWhere(today, rules), true, scope) }),
  auditActionsDueSoon: ({ today, rules, scope }) =>
    prisma.auditFinding.count({ where: applyAuditFindingWorkCenterScope(auditActionsDueSoonWhere(today, rules), true, scope) }),
  pendingDisposals: ({ scope }) =>
    prisma.disposalRequest.count({ where: applyDisposalWorkCenterScope(pendingDisposalsWhere, true, scope) }),
  approvedDisposals: ({ scope }) =>
    prisma.disposalRequest.count({ where: applyDisposalWorkCenterScope(approvedDisposalsWhere, true, scope) }),
}

// The same rounds as the page's pendingAuditItems count (auditRoundOperationalWhere), per round.
async function readTrackingRoundsFromDb(scope: WorkCenterUserScope | null): Promise<TrackingRoundCandidate[]> {
  const roundItems: Prisma.AuditItemWhereInput = { auditRound: { isActive: true, status: auditRoundOperationalWhere } }
  const itemWhere = scope ? applyAuditItemWorkCenterScope(roundItems, true, scope) : roundItems
  const [totals, pendings] = await Promise.all([
    prisma.auditItem.groupBy({ by: ["auditRoundId"], where: itemWhere, _count: { _all: true } }),
    prisma.auditItem.groupBy({
      by: ["auditRoundId"],
      where: { AND: [itemWhere, { auditStatus: "pending" }] },
      _count: { _all: true },
    }),
  ])
  if (totals.length === 0) return []
  const pendingByRound = new Map(pendings.map((group) => [group.auditRoundId, group._count._all]))
  const rounds = await prisma.auditRound.findMany({
    where: { id: { in: totals.map((group) => group.auditRoundId) } },
    select: { id: true, auditNo: true, name: true },
  })
  const totalByRound = new Map(totals.map((group) => [group.auditRoundId, group._count._all]))
  return rounds.map((round) => ({
    ...round,
    total: totalByRound.get(round.id) ?? 0,
    pending: pendingByRound.get(round.id) ?? 0,
  }))
}

export const WORK_CENTER_ASSET_LIMIT = 24

// The assets panel's data, moved unchanged from the page: the three counts, the fix cards and 24 assets.
async function loadAssetsFromDb(input: {
  locale: string
  params: WorkCenterParams
  scope: WorkCenterUserScope | null
}): Promise<WorkCenterAssetsData> {
  const active = input.scope !== null
  const scope = input.scope ?? buildWorkCenterUserScope({})
  const missingPhotoAttachments: Prisma.AssetWhereInput = {
    attachments: { none: { module: "asset", fileType: { startsWith: "image/" }, isActive: true } },
  }
  const missingResponsibilityWhere = applyAssetWorkCenterScope({ AND: [{ isActive: true }, assetMissingResponsibilityWhere] }, active, scope)
  const missingSerialWhere = applyAssetWorkCenterScope({ isActive: true, OR: [{ serialNumber: null }, { serialNumber: "" }] }, active, scope)
  const missingPhotoWhere = applyAssetWorkCenterScope(
    { isActive: true, ownershipType: { not: "software_license" }, ...missingPhotoAttachments },
    active,
    scope,
  )
  const assetIssueWhere = applyAssetWorkCenterScope(
    {
      isActive: true,
      OR: [
        assetMissingResponsibilityWhere,
        { serialNumber: null },
        { serialNumber: "" },
        { AND: [{ ownershipType: { not: "software_license" } }, missingPhotoAttachments] },
      ],
    },
    active,
    scope,
  )
  const [missingResponsibility, missingSerial, missingPhoto, assets] = await Promise.all([
    prisma.asset.count({ where: missingResponsibilityWhere }),
    prisma.asset.count({ where: missingSerialWhere }),
    prisma.asset.count({ where: missingPhotoWhere }),
    prisma.asset.findMany({
      where: assetIssueWhere,
      select: {
        id: true,
        assetTag: true,
        name: true,
        serialNumber: true,
        ownershipType: true,
        custodianId: true,
        departmentId: true,
        installedInLinks: { where: installedOrOutstandingLinkWhere, select: { id: true }, take: 1 },
        attachments: {
          where: { module: "asset", fileType: { startsWith: "image/" }, isActive: true },
          select: { id: true },
          take: 1,
        },
      },
      orderBy: { updatedAt: "desc" },
      take: WORK_CENTER_ASSET_LIMIT,
    }),
  ])
  const counts = { missingResponsibility, missingSerial, missingPhoto }
  return { counts, fixGroups: buildDataQualityFixGroups(input.locale, input.params, counts), assets }
}

const defaultDeps: WorkCenterPageDeps = {
  getWaitingWork: (user, now) => getWaitingWork(user, now),
  readDepartmentId: async (employeeId) =>
    (await prisma.employee.findUnique({ where: { id: employeeId }, select: { departmentId: true } }))?.departmentId ?? null,
  countMine: (key, context) => mineCounters[key](context),
  getRows: getWorkCenterRows,
  getSlaDays: getApprovalInboxSlaDays,
  countDataIssues: countDataIssueAssets,
  readTrackingRounds: readTrackingRoundsFromDb,
  readUnreadTopics: async (user, locale) => (await getNotificationSummary(user, locale)).total,
  recordDailyCounts: (userId, counts, now) => recordDailyCounts(userId, counts, now),
  readPreviousDayCounts: (userId, now) => readPreviousDayCounts(userId, now),
  loadAssets: loadAssetsFromDb,
}

/**
 * The open round with the most items left (ties: the lower AUD- number); checked = total − pending. A round with
 * nothing left to check is waiting to close (the approvals queue), so it is never picked.
 */
export function pickTrackingRound(rounds: readonly TrackingRoundCandidate[]): WorkCenterPageData["tracking"]["round"] {
  const [best] = rounds.filter((round) => round.pending > 0).sort((a, b) => b.pending - a.pending || (a.auditNo < b.auditNo ? -1 : a.auditNo > b.auditNo ? 1 : 0))
  if (!best) return null
  return { id: best.id, auditNo: best.auditNo, name: best.name, checked: best.total - best.pending, total: best.total, pending: best.pending }
}

function isWorkQueue(panel: string): panel is WorkQueue {
  return (WORK_QUEUES as readonly string[]).includes(panel)
}

export async function getWorkCenterPageData(
  user: SessionUser,
  input: { searchParams: WorkCenterParamInput; locale: string; now?: Date; returnTo: string },
  deps: Partial<WorkCenterPageDeps> = {},
): Promise<WorkCenterPageData> {
  const d: WorkCenterPageDeps = { ...defaultDeps, ...deps }
  const now = input.now ?? new Date()
  const today = startOfBangkokDay(now)
  const parsed = parseWorkCenterParams(input.searchParams)
  const isMine = parsed.view === "mine"

  const [work, departmentId, slaDays, unreadTopics, dataIssues] = await Promise.all([
    d.getWaitingWork(user, now),
    user.employeeId ? d.readDepartmentId(user.employeeId) : Promise.resolve(null),
    d.getSlaDays(),
    d.readUnreadTopics(user, input.locale),
    d.countDataIssues(user),
  ])
  const userScope = buildWorkCenterUserScope({ employeeId: user.employeeId, departmentId })
  const scope = isMine ? userScope : null

  // งานของฉัน: every visible scoped kind is counted again with the user's scope; the approval inbox and the advance
  // warnings keep the waiting work's numbers.
  let counts: WaitingWorkCounts = work.counts
  if (isMine) {
    const visible = new Set(work.visibleKeys)
    const keys = MINE_SCOPED_KEYS.filter((key) => visible.has(key))
    const values = await Promise.all(keys.map((key) => d.countMine(key, { today, rules: work.rules, scope: userScope })))
    counts = { ...work.counts, ...Object.fromEntries(keys.map((key, index) => [key, values[index]])) }
  }
  const summary = buildWorkQueueSummary({ counts, visibleKeys: work.visibleKeys, approvalInbox: work.approvalInbox })

  // A queue the user cannot see, or ข้อมูลไม่ครบ without asset:view, falls back to ภาพรวม before anything uses the
  // panel: the rows, the return link, the tabs' aria-current and the empty words follow the visible tabs.
  const canViewAssets = hasPermission(user, "asset", "view")
  const panelAllowed = isWorkQueue(parsed.panel)
    ? summary.queues.some((entry) => entry.queue === parsed.panel)
    : parsed.panel !== "assets" || canViewAssets
  const params: WorkCenterParams = panelAllowed ? parsed : { ...parsed, panel: "overview" }
  const returnTo = panelAllowed ? input.returnTo : buildWorkCenterHref(input.locale, params)

  const queue = isWorkQueue(params.panel) ? params.panel : null
  const showTable = params.panel !== "assets"
  const showAssets = params.panel === "assets"

  const [previousDay, , rounds, rowResult, assets] = await Promise.all([
    isMine ? Promise.resolve(null) : readPreviousSafely(d, user.id, now),
    isMine ? Promise.resolve() : recordSafely(d, user.id, work, dataIssues, now),
    hasPermission(user, "audit", "view") ? d.readTrackingRounds(scope) : Promise.resolve([]),
    showTable
      ? d.getRows(user, work, { today, scope, queue, show: params.show, locale: input.locale, returnTo, slaDays })
      : Promise.resolve(null),
    showAssets ? d.loadAssets({ locale: input.locale, params, scope }) : Promise.resolve(null),
  ])

  let previous: WorkCenterPageData["previous"] = null
  if (previousDay) {
    const backlogKeys = summary.queues.flatMap((entry) => entry.keys)
    const previousBacklog = backlogKeys.reduce((total, key) => total + (previousDay.counts[key] ?? 0), 0)
    previous = {
      dayLabelDate: previousDay.day,
      isYesterday: previousDay.isYesterday,
      backlogTotal: previousBacklog,
      backlogChange: compareWithPrevious(summary.backlogTotal, previousBacklog, true),
    }
  }

  return {
    params,
    mineUnavailable: isMine && !userScope.enabled,
    summary,
    counts,
    previous,
    unreadTopics,
    tracking: { round: pickTrackingRound(rounds), dataIssues, advanceTotal: summary.advance.total, canScan: hasPermission(user, "audit", "edit") },
    table: rowResult ? { rows: rowResult.rows, total: rowResult.total, show: params.show } : null,
    assets,
  }
}

// view=all only: today's count of every visible key plus ข้อมูลไม่ครบ. A failure is logged without data; the page goes on.
async function recordSafely(d: WorkCenterPageDeps, userId: string, work: WaitingWork, dataIssues: number | null, now: Date) {
  const counts: DailyCountCounts = Object.fromEntries(work.visibleKeys.map((key) => [key, work.counts[key]]))
  if (dataIssues !== null) counts.dataIssues = dataIssues
  try {
    await d.recordDailyCounts(userId, counts, now)
  } catch {
    console.error("[work-center] recording daily counts failed")
  }
}

async function readPreviousSafely(d: WorkCenterPageDeps, userId: string, now: Date) {
  try {
    return await d.readPreviousDayCounts(userId, now)
  } catch {
    console.error("[work-center] reading previous day counts failed")
    return null
  }
}
