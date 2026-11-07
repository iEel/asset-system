// The notifications page's one server loader (group 9 plan 3 task 1, board NT, spec §5.2, §5.3 and §6): the topics with
// their state, section, detail line and change from the previous recorded day, the tab counts, the digest days and the
// legacy digest rows, and the day's counts recorded on every visit. Every reader can be injected (`deps`).
import { prisma } from "@/lib/db"
import { hasPermission, type SessionUser } from "@/lib/auth-utils"
import type { NotificationCenterItem } from "@/lib/notification-center"
import {
  compareWithPrevious,
  readDigestDays,
  readPreviousDayCounts,
  recordDailyCounts,
  type DailyCountComparison,
  type DailyCountCounts,
  type DigestDay,
} from "@/lib/notification-daily-counts"
import { getNotificationCenter } from "@/lib/notification-summary"
import { getWaitingWork, getWaitingWorkAges, type WaitingWork } from "@/lib/waiting-work"
import { startOfBangkokDay, type WaitingWorkAge, type WaitingWorkKey, type WaitingWorkRules } from "@/lib/waiting-work-rules"
import { buildWorkQueueSummary, isAdvanceWarningKey, type WorkQueueSummary } from "@/lib/work-queues"

export const NOTIFICATION_STATUS_TABS = ["unread", "read", "snoozed", "all"] as const
export type NotificationStatusTab = (typeof NOTIFICATION_STATUS_TABS)[number]

export type NotificationsParams = { status: NotificationStatusTab; assigned: boolean; digestAll: boolean }

type ParamValue = string | string[] | undefined

function firstValue(value: ParamValue): string | undefined {
  return Array.isArray(value) ? value[0] : value
}

// Default ยังไม่อ่าน; anything else that is not a tab, assigned=1 or digest=all keeps the default.
export function parseNotificationsParams(input: { status?: ParamValue; assigned?: ParamValue; digest?: ParamValue }): NotificationsParams {
  const status = firstValue(input.status)
  return {
    status: (NOTIFICATION_STATUS_TABS as readonly string[]).includes(status ?? "") ? (status as NotificationStatusTab) : "unread",
    assigned: firstValue(input.assigned) === "1",
    digestAll: firstValue(input.digest) === "all",
  }
}

export type NotificationTopicState = "unread" | "read" | "snoozed"

export type NotificationTopicRow = {
  key: WaitingWorkKey
  section: "backlog" | "advance"
  count: number
  href: string
  tone: string
  state: NotificationTopicState
  /** Only while the topic counts as read. */
  readAt: Date | null
  snoozedUntil: Date | null
  assigneeName: string | null
  /** A message key in the `notifications` namespace and its values; the page appends the assignee. */
  detail: { key: string; values: Record<string, string | number> }
  change: DailyCountComparison
}

export type NotificationLegacyDigest = { id: string; title: string; message: string; createdAt: Date }

export type NotificationsPageData = {
  params: NotificationsParams
  /** Topics per tab (over every topic), and the assigned ones. */
  counts: { unread: number; read: number; snoozed: number; all: number; assigned: number }
  /** queues and items match the work center's งานค้างทั้งหมด; previousItems is null when no earlier day is recorded. */
  backlog: { rows: NotificationTopicRow[]; queues: number; items: number; previousItems: number | null }
  advance: { rows: NotificationTopicRow[]; items: number; previousItems: number | null }
  digest: { days: DigestDay[]; totalDays: number; legacy: NotificationLegacyDigest[] }
  assignees: { id: string; label: string }[]
  canOpenWorkCenter: boolean
}

export type LegacyDigestQuery = {
  where: { userId: string; module: "notification_digest"; createdAt?: { lt: Date } }
  orderBy: { createdAt: "desc" }
  take: number
  select: { id: true; title: true; message: true; createdAt: true }
}

export type NotificationsPageDeps = {
  getWaitingWork(user: SessionUser, now: Date): Promise<WaitingWork>
  getNotificationCenter(user: SessionUser, locale: string, work: WaitingWork): Promise<{ items: NotificationCenterItem[] }>
  getWaitingWorkAges(
    user: SessionUser,
    keys: readonly WaitingWorkKey[],
    rules: WaitingWorkRules,
    now: Date,
  ): Promise<Partial<Record<WaitingWorkKey, WaitingWorkAge>>>
  recordDailyCounts(userId: string, counts: DailyCountCounts, now: Date): Promise<void>
  readPreviousDayCounts(userId: string, now: Date): ReturnType<typeof readPreviousDayCounts>
  readDigestDays(userId: string, options: { limit: number }): Promise<DigestDay[]>
  /** How many days have digest rows, and the first of them. */
  readDigestDayStats(userId: string): Promise<{ totalDays: number; firstDay: Date | null }>
  findLegacyDigests(query: LegacyDigestQuery): Promise<NotificationLegacyDigest[]>
  readAssignees(locale: string): Promise<{ id: string; label: string }[]>
}

const defaultDeps: NotificationsPageDeps = {
  getWaitingWork: (user, now) => getWaitingWork(user, now),
  getNotificationCenter: (user, locale, work) => getNotificationCenter(user, locale, { work }),
  getWaitingWorkAges: (user, keys, rules, now) => getWaitingWorkAges(user, keys, rules, now),
  recordDailyCounts: (userId, counts, now) => recordDailyCounts(userId, counts, now),
  readPreviousDayCounts: (userId, now) => readPreviousDayCounts(userId, now),
  readDigestDays: (userId, options) => readDigestDays(userId, options),
  readDigestDayStats: async (userId) => {
    const days = await prisma.notificationDailyCount.groupBy({
      by: ["day"],
      where: { userId, digestCount: { not: null } },
      orderBy: { day: "asc" },
    })
    return { totalDays: days.length, firstDay: days[0]?.day ?? null }
  },
  findLegacyDigests: (query) => prisma.notification.findMany(query),
  // Every active user, as the page listed them before.
  readAssignees: async (locale) => {
    const users = await prisma.user.findMany({
      where: { isActive: true },
      select: { id: true, username: true, displayName: true, employee: { select: { fullNameTh: true, fullNameEn: true } } },
      orderBy: { displayName: "asc" },
    })
    return users.map((assignee) => ({
      id: assignee.id,
      label: assignee.employee?.[locale === "th" ? "fullNameTh" : "fullNameEn"] || assignee.displayName || assignee.username,
    }))
  },
}

// The keys whose detail line reads an age: the oldest repair, the nearest PM and action due dates.
const AGE_DETAIL_KEYS = ["openRepairs", "duePm", "auditActionsDueSoon"] as const satisfies readonly WaitingWorkKey[]

const DIGEST_DAYS_SHOWN = 3
const DIGEST_DAYS_ALL = 30
const LEGACY_SHOWN = 10
const LEGACY_ALL = 30
const dayMs = 24 * 60 * 60 * 1000

function topicState(item: NotificationCenterItem): NotificationTopicState {
  if (item.isSnoozed) return "snoozed"
  if (item.isRead) return "read"
  return "unread"
}

function formatShortDate(date: Date, locale: string): string {
  return new Intl.DateTimeFormat(locale === "th" ? "th-TH-u-ca-buddhist" : "en-GB", {
    day: "numeric",
    month: "short",
    timeZone: "Asia/Bangkok",
  }).format(date)
}

function buildDetail(
  key: WaitingWorkKey,
  context: { ages: Partial<Record<WaitingWorkKey, WaitingWorkAge>>; summary: WorkQueueSummary; today: Date; locale: string },
): NotificationTopicRow["detail"] {
  const plain = { key: `${key}Detail`, values: {} }
  if (key === "approvalInbox") {
    const parts = context.summary.approvalParts
    return parts ? { key: "detail.approvalParts", values: { disposal: parts.disposal, mismatches: parts.audit, rounds: parts.round } } : plain
  }
  const age = context.ages[key]
  if (key === "openRepairs" && age?.kind === "age") return { key: "detail.openRepairsOldest", values: { days: age.days } }
  if ((key === "duePm" || key === "auditActionsDueSoon") && age?.kind === "due") {
    const due = new Date(context.today.getTime() + age.days * dayMs)
    return { key: "detail.nearestDue", values: { date: formatShortDate(due, context.locale) } }
  }
  return plain
}

export async function getNotificationsPageData(
  user: SessionUser,
  input: { searchParams: { status?: ParamValue; assigned?: ParamValue; digest?: ParamValue }; locale: string; now?: Date },
  deps: Partial<NotificationsPageDeps> = {},
): Promise<NotificationsPageData> {
  const d: NotificationsPageDeps = { ...defaultDeps, ...deps }
  const now = input.now ?? new Date()
  const today = startOfBangkokDay(now)
  const params = parseNotificationsParams(input.searchParams)

  const work = await d.getWaitingWork(user, now)
  const center = await d.getNotificationCenter(user, input.locale, work)
  // A topic is a listed key with work in it (the center lists count > 0 only).
  const topics = center.items.filter((item) => item.count > 0)
  const ageKeys = AGE_DETAIL_KEYS.filter((key) => topics.some((item) => item.key === key))

  const [ages, previous, , days, stats, assignees] = await Promise.all([
    ageKeys.length > 0 ? d.getWaitingWorkAges(user, ageKeys, work.rules, now) : Promise.resolve({}),
    readPreviousSafely(d, user.id, now),
    recordSafely(d, user.id, work, now),
    d.readDigestDays(user.id, { limit: params.digestAll ? DIGEST_DAYS_ALL : DIGEST_DAYS_SHOWN }),
    d.readDigestDayStats(user.id),
    d.readAssignees(input.locale),
  ])

  // Legacy digest rows: only the digest's own module, and only from before the first day with digest counts (its
  // Bangkok midnight), so a day is never listed twice.
  const legacyWhere: LegacyDigestQuery["where"] = { userId: user.id, module: "notification_digest" }
  if (stats.firstDay) legacyWhere.createdAt = { lt: startOfBangkokDay(stats.firstDay) }
  const legacy = await d.findLegacyDigests({
    where: legacyWhere,
    orderBy: { createdAt: "desc" },
    take: params.digestAll ? LEGACY_ALL : LEGACY_SHOWN,
    select: { id: true, title: true, message: true, createdAt: true },
  })

  const summary = buildWorkQueueSummary({ counts: work.counts, visibleKeys: work.visibleKeys, approvalInbox: work.approvalInbox })
  const assigneeNameById = new Map(assignees.map((assignee) => [assignee.id, assignee.label]))
  const hasPrevious = previous !== null

  const rows: NotificationTopicRow[] = topics.map((item) => {
    const key = item.key as WaitingWorkKey
    const state = topicState(item)
    return {
      key,
      section: isAdvanceWarningKey(key) ? "advance" : "backlog",
      count: item.count,
      href: item.href,
      tone: item.tone,
      state,
      readAt: state === "read" ? item.readAt : null,
      snoozedUntil: state === "snoozed" && item.snoozedUntil ? new Date(item.snoozedUntil) : null,
      assigneeName: item.assignedToUserId ? assigneeNameById.get(item.assignedToUserId) ?? item.assignedToUserId : null,
      detail: buildDetail(key, { ages, summary, today, locale: input.locale }),
      change: compareWithPrevious(item.count, previous?.counts[key], hasPrevious),
    }
  })

  const shown = rows.filter(
    (row) => (params.status === "all" || row.state === params.status) && (!params.assigned || row.assigneeName !== null),
  )
  const countState = (state: NotificationTopicState) => rows.filter((row) => row.state === state).length
  const sumPrevious = (keys: readonly WaitingWorkKey[]) =>
    previous ? keys.reduce((total, key) => total + (previous.counts[key] ?? 0), 0) : null

  return {
    params,
    counts: {
      unread: countState("unread"),
      read: countState("read"),
      snoozed: countState("snoozed"),
      all: rows.length,
      assigned: rows.filter((row) => row.assigneeName !== null).length,
    },
    backlog: {
      rows: shown.filter((row) => row.section === "backlog"),
      queues: summary.queues.length,
      items: summary.backlogTotal,
      previousItems: sumPrevious(summary.queues.flatMap((entry) => entry.keys)),
    },
    advance: {
      rows: shown.filter((row) => row.section === "advance"),
      items: summary.advance.total,
      previousItems: sumPrevious(summary.advance.keys),
    },
    digest: { days, totalDays: stats.totalDays, legacy },
    assignees,
    canOpenWorkCenter: hasPermission(user, "dashboard", "view"),
  }
}

// Every visible key's count today, zero included. A failure is logged without data; the page goes on.
async function recordSafely(d: NotificationsPageDeps, userId: string, work: WaitingWork, now: Date) {
  if (work.visibleKeys.length === 0) return
  const counts: DailyCountCounts = Object.fromEntries(work.visibleKeys.map((key) => [key, work.counts[key]]))
  try {
    await d.recordDailyCounts(userId, counts, now)
  } catch {
    console.error("[notifications] recording daily counts failed")
  }
}

async function readPreviousSafely(d: NotificationsPageDeps, userId: string, now: Date) {
  try {
    return await d.readPreviousDayCounts(userId, now)
  } catch {
    console.error("[notifications] reading previous day counts failed")
    return null
  }
}
