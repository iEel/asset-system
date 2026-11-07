// Per-user daily counts (group 9 spec §6): the last count of each visible topic per Bangkok day, the count the daily
// digest sent (never overwritten), the previous recorded day for the "เมื่อวาน" comparison, and the 35-day keep.
import { prisma } from "@/lib/db"
import { getBangkokDateKey } from "./preventive-maintenance.ts"
import { withPrismaUniqueRetry } from "./prisma-unique-retry.ts"
import type { WaitingWorkKey } from "./waiting-work-rules.ts"

export type DailyCountKey = WaitingWorkKey | "dataIssues"

export type DailyCountCounts = Partial<Record<DailyCountKey, number>>

// The history shows 30 days and yesterday needs one more; 35 leaves room.
export const DAILY_COUNT_KEEP_DAYS = 35

const dayMs = 24 * 60 * 60 * 1000

type DailyCountRow = { day: Date; key: string; count: number; digestCount: number | null }

// The Prisma calls this file makes, so tests can pass an in-memory stand-in.
export type DailyCountDb = {
  $transaction(operations: Promise<unknown>[]): Promise<unknown>
  notificationDailyCount: {
    upsert(args: {
      where: { userId_day_key: { userId: string; day: Date; key: string } }
      create: { userId: string; day: Date; key: string; count: number; digestCount?: number | null }
      update: { count?: number }
    }): Promise<unknown>
    updateMany(args: {
      where: { userId: string; day: Date; key: string; digestCount: null }
      data: { digestCount: number }
    }): Promise<{ count: number }>
    findFirst(args: {
      where: { userId: string; day: { lt: Date } }
      orderBy: { day: "desc" }
      select: { day: true }
    }): Promise<{ day: Date } | null>
    findMany(args: {
      where: { userId: string; day?: Date; digestCount?: { not: null } }
      orderBy?: Array<Record<string, "asc" | "desc">>
      select: { day: true; key: true; count: true; digestCount: true }
    }): Promise<DailyCountRow[]>
    deleteMany(args: { where: { day: { lt: Date } } }): Promise<{ count: number }>
  }
}

function defaultDb(): DailyCountDb {
  return prisma as unknown as DailyCountDb
}

// The Bangkok calendar date of `now` as UTC midnight of that date, which a SQL DATE column stores unchanged.
export function bangkokDayDate(now: Date = new Date()): Date {
  return new Date(`${getBangkokDateKey(now)}T00:00:00.000Z`)
}

// Two writers on the same (userId, day, key) can both take an upsert's insert path on SQL Server; the second fails with
// P2002. The batch is built again and run once more, and the retry takes the update path. Any other error is rethrown.
function runBatchRetryingInsertRace(db: DailyCountDb, build: () => Promise<unknown>[]): Promise<unknown> {
  return withPrismaUniqueRetry(() => db.$transaction(build()), 2)
}

function definedEntries(counts: DailyCountCounts): Array<[DailyCountKey, number]> {
  return (Object.entries(counts) as Array<[DailyCountKey, number | undefined]>).filter(
    (entry): entry is [DailyCountKey, number] => entry[1] !== undefined
  )
}

// Upserts today's row per given key with the current count; digestCount is never touched here.
export async function recordDailyCounts(
  userId: string,
  counts: DailyCountCounts,
  now: Date = new Date(),
  db: DailyCountDb = defaultDb()
): Promise<void> {
  const entries = definedEntries(counts)
  if (entries.length === 0) return
  const day = bangkokDayDate(now)
  await runBatchRetryingInsertRace(db, () =>
    entries.map(([key, count]) =>
      db.notificationDailyCount.upsert({
        where: { userId_day_key: { userId, day, key } },
        create: { userId, day, key, count },
        update: { count },
      })
    )
  )
}

// The latest recorded day before today (Bangkok) and its counts; null when nothing is recorded before today.
export async function readPreviousDayCounts(
  userId: string,
  now: Date = new Date(),
  db: DailyCountDb = defaultDb()
): Promise<{ day: Date; isYesterday: boolean; counts: DailyCountCounts } | null> {
  const today = bangkokDayDate(now)
  const latest = await db.notificationDailyCount.findFirst({
    where: { userId, day: { lt: today } },
    orderBy: { day: "desc" },
    select: { day: true },
  })
  if (!latest) return null
  const rows = await db.notificationDailyCount.findMany({
    where: { userId, day: latest.day },
    select: { day: true, key: true, count: true, digestCount: true },
  })
  const counts: DailyCountCounts = {}
  for (const row of rows) counts[row.key as DailyCountKey] = row.count
  return { day: latest.day, isYesterday: today.getTime() - latest.day.getTime() === dayMs, counts }
}

export type DailyCountComparison = { kind: "up" | "down" | "same" | "new" | "unknown"; delta: number }

export function compareWithPrevious(
  today: number,
  previous: number | undefined,
  hasPrevious: boolean
): DailyCountComparison {
  if (!hasPrevious) return { kind: "unknown", delta: 0 }
  if (previous === undefined) {
    return today > 0 ? { kind: "new", delta: today } : { kind: "same", delta: 0 }
  }
  const delta = today - previous
  if (delta > 0) return { kind: "up", delta }
  if (delta < 0) return { kind: "down", delta: -delta }
  return { kind: "same", delta: 0 }
}

// The counts the digest sent: today's row per key, digestCount set only where it is still null.
export async function markDigestCounts(
  userId: string,
  counts: DailyCountCounts,
  now: Date = new Date(),
  db: DailyCountDb = defaultDb()
): Promise<void> {
  const entries = definedEntries(counts)
  if (entries.length === 0) return
  const day = bangkokDayDate(now)
  await runBatchRetryingInsertRace(db, () =>
    entries.flatMap(([key, count]) => [
      db.notificationDailyCount.upsert({
        where: { userId_day_key: { userId, day, key } },
        create: { userId, day, key, count, digestCount: count },
        update: {},
      }),
      db.notificationDailyCount.updateMany({
        where: { userId, day, key, digestCount: null },
        data: { digestCount: count },
      }),
    ])
  )
}

export type DigestDay = { day: Date; topics: { key: DailyCountKey; count: number }[]; items: number }

// Days with any digestCount, newest first; topics are those rows, items the sum of their digestCount.
export async function readDigestDays(
  userId: string,
  options: { limit: number },
  db: DailyCountDb = defaultDb()
): Promise<DigestDay[]> {
  if (options.limit <= 0) return []
  const rows = await db.notificationDailyCount.findMany({
    where: { userId, digestCount: { not: null } },
    orderBy: [{ day: "desc" }, { key: "asc" }],
    select: { day: true, key: true, count: true, digestCount: true },
  })
  const days: DigestDay[] = []
  for (const row of rows) {
    if (row.digestCount === null) continue
    let current = days[days.length - 1]
    if (!current || current.day.getTime() !== row.day.getTime()) {
      if (days.length === options.limit) break
      current = { day: row.day, topics: [], items: 0 }
      days.push(current)
    }
    current.topics.push({ key: row.key as DailyCountKey, count: row.digestCount })
    current.items += row.digestCount
  }
  return days
}

// Deletes rows more than DAILY_COUNT_KEEP_DAYS Bangkok days old; the row exactly that many days old is kept.
export async function pruneDailyCounts(now: Date = new Date(), db: DailyCountDb = defaultDb()): Promise<number> {
  const cutoff = new Date(bangkokDayDate(now).getTime() - DAILY_COUNT_KEEP_DAYS * dayMs)
  const result = await db.notificationDailyCount.deleteMany({ where: { day: { lt: cutoff } } })
  return result.count
}
