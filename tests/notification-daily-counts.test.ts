import assert from "node:assert/strict"
import { existsSync } from "node:fs"
import * as nodeModule from "node:module"
import { test } from "node:test"
import { pathToFileURL } from "node:url"

// src/lib/notification-daily-counts.ts imports the database, which node --test cannot load, so a resolve hook serves a
// stand-in (as in tests/work-center-row-data.test.ts). Every call gets an in-memory fake of the Prisma calls instead.
const mockedModuleSources = new Map<string, string>([
  ["@/lib/db", `
    export const prisma = new Proxy({}, { get() { throw new Error("no database in this test") } })
  `],
])

const registerHooks = (nodeModule as unknown as {
  registerHooks(options: {
    resolve(specifier: string, context: unknown, nextResolve: (specifier: string, context: unknown) => unknown): unknown
  }): void
}).registerHooks

registerHooks({
  resolve(specifier, context, nextResolve) {
    const source = mockedModuleSources.get(specifier)
    if (source !== undefined) {
      return { url: `data:text/javascript;charset=utf-8,${encodeURIComponent(source)}`, shortCircuit: true }
    }
    if (specifier.startsWith("@/")) {
      const base = `src/${specifier.slice(2)}`
      const file = [`${base}.ts`, `${base}.tsx`, `${base}/index.ts`].find((candidate) => existsSync(candidate))
      if (file) return { url: pathToFileURL(file).href, shortCircuit: true }
    }
    return nextResolve(specifier, context)
  },
})

const daily = (await import(pathToFileURL("src/lib/notification-daily-counts.ts").href)) as typeof import("../src/lib/notification-daily-counts.ts")
type DailyCountDb = import("../src/lib/notification-daily-counts.ts").DailyCountDb

type Row = { userId: string; day: Date; key: string; count: number; digestCount: number | null }

function fakeDb(initial: Row[] = []) {
  const rows: Row[] = initial.map((row) => ({ ...row }))
  const sameDay = (left: Date, right: Date) => left.getTime() === right.getTime()
  const db: DailyCountDb = {
    async $transaction(operations) {
      return Promise.all(operations)
    },
    notificationDailyCount: {
      async upsert({ where, create, update }) {
        const { userId, day, key } = where.userId_day_key
        const existing = rows.find((row) => row.userId === userId && sameDay(row.day, day) && row.key === key)
        if (existing) {
          Object.assign(existing, update)
          return existing
        }
        const row = { digestCount: null, ...create }
        rows.push(row)
        return row
      },
      async updateMany({ where, data }) {
        const matched = rows.filter(
          (row) => row.userId === where.userId && sameDay(row.day, where.day) && row.key === where.key && row.digestCount === null
        )
        for (const row of matched) Object.assign(row, data)
        return { count: matched.length }
      },
      async findFirst({ where }) {
        const found = rows
          .filter((row) => row.userId === where.userId && row.day.getTime() < where.day.lt.getTime())
          .sort((left, right) => right.day.getTime() - left.day.getTime())[0]
        return found ? { day: found.day } : null
      },
      async findMany({ where }) {
        return rows
          .filter((row) => row.userId === where.userId)
          .filter((row) => (where.day ? sameDay(row.day, where.day) : true))
          .filter((row) => (where.digestCount ? row.digestCount !== null : true))
          .sort((left, right) => right.day.getTime() - left.day.getTime() || left.key.localeCompare(right.key))
          .map(({ day, key, count, digestCount }) => ({ day, key, count, digestCount }))
      },
      async deleteMany({ where }) {
        const before = rows.length
        for (let index = rows.length - 1; index >= 0; index -= 1) {
          if (rows[index].day.getTime() < where.day.lt.getTime()) rows.splice(index, 1)
        }
        return { count: before - rows.length }
      },
    },
  }
  return { db, rows }
}

const day = (value: string) => new Date(`${value}T00:00:00.000Z`)
const row = (value: string, key: string, count: number, digestCount: number | null = null): Row => ({
  userId: "user-1",
  day: day(value),
  key,
  count,
  digestCount,
})

test("the Bangkok day is stored as UTC midnight of that date, near midnight Bangkok", () => {
  assert.deepEqual(daily.bangkokDayDate(new Date("2026-11-06T17:30:00.000Z")), day("2026-11-07"))
  assert.deepEqual(daily.bangkokDayDate(new Date("2026-11-06T16:59:59.999Z")), day("2026-11-06"))
  assert.equal(daily.DAILY_COUNT_KEEP_DAYS, 35)
})

test("a later visit never overwrites digestCount", async () => {
  const { db, rows } = fakeDb()
  const morning = new Date("2026-11-07T07:30:00.000+07:00")
  await daily.recordDailyCounts("user-1", { duePm: 46 }, morning, db)
  await daily.markDigestCounts("user-1", { duePm: 46 }, morning, db)
  await daily.recordDailyCounts("user-1", { duePm: 50 }, new Date("2026-11-07T16:00:00.000+07:00"), db)
  await daily.markDigestCounts("user-1", { duePm: 51 }, new Date("2026-11-07T18:00:00.000+07:00"), db)
  assert.deepEqual(rows, [{ userId: "user-1", day: day("2026-11-07"), key: "duePm", count: 50, digestCount: 46 }])
})

test("recording skips undefined keys and writes nothing without keys", async () => {
  const { db, rows } = fakeDb()
  const now = new Date("2026-11-07T03:00:00.000Z")
  await daily.recordDailyCounts("user-1", {}, now, db)
  assert.equal(rows.length, 0)
  await daily.recordDailyCounts("user-1", { duePm: 2, openRepairs: undefined, dataIssues: 0 }, now, db)
  assert.deepEqual(rows.map((entry) => [entry.key, entry.count, entry.digestCount]), [["duePm", 2, null], ["dataIssues", 0, null]])
})

test("the digest's mark creates a row with both counts when none was recorded", async () => {
  const { db, rows } = fakeDb()
  await daily.markDigestCounts("user-1", { approvalInbox: 3 }, new Date("2026-11-07T03:00:00.000Z"), db)
  assert.deepEqual(rows, [{ userId: "user-1", day: day("2026-11-07"), key: "approvalInbox", count: 3, digestCount: 3 }])
})

// Two writers on the same (userId, day, key) can both take the insert path on SQL Server; the loser gets P2002 and its
// batch is built again once, which then takes the update path (final review F3).
function failingOnce(db: DailyCountDb, error: unknown) {
  let transactions = 0
  let upserts = 0
  const upsert = db.notificationDailyCount.upsert.bind(db.notificationDailyCount)
  const wrapped: DailyCountDb = {
    async $transaction(operations) {
      transactions += 1
      if (transactions === 1) {
        await Promise.allSettled(operations)
        throw error
      }
      return db.$transaction(operations)
    },
    notificationDailyCount: {
      ...db.notificationDailyCount,
      upsert(args) {
        upserts += 1
        return upsert(args)
      },
    },
  }
  return { db: wrapped, calls: () => ({ transactions, upserts }) }
}

const uniqueError = () => Object.assign(new Error("Unique constraint failed on the constraint: `notification_daily_counts_user_day_key`"), { code: "P2002" })

test("a concurrent insert (P2002) retries the record batch once, rebuilt, and resolves", async () => {
  const base = fakeDb([row("2026-11-07", "duePm", 40)])
  const { db, calls } = failingOnce(base.db, uniqueError())
  await daily.recordDailyCounts("user-1", { duePm: 46, openRepairs: 2 }, new Date("2026-11-07T03:00:00.000Z"), db)
  assert.deepEqual(calls(), { transactions: 2, upserts: 4 }, "one retry, the operations built again")
  assert.deepEqual(base.rows.map((entry) => [entry.key, entry.count, entry.digestCount]), [["duePm", 46, null], ["openRepairs", 2, null]])
})

test("a concurrent insert (P2002) retries the digest mark once and resolves", async () => {
  const base = fakeDb()
  const { db, calls } = failingOnce(base.db, uniqueError())
  await daily.markDigestCounts("user-1", { duePm: 4 }, new Date("2026-11-07T03:00:00.000Z"), db)
  assert.deepEqual(calls(), { transactions: 2, upserts: 2 })
  assert.deepEqual(base.rows, [{ userId: "user-1", day: day("2026-11-07"), key: "duePm", count: 4, digestCount: 4 }])
})

test("any other error is rethrown without a retry, and a second P2002 is rethrown", async () => {
  const other = Object.assign(new Error("deadlock"), { code: "P2034" })
  const first = failingOnce(fakeDb().db, other)
  await assert.rejects(daily.recordDailyCounts("user-1", { duePm: 1 }, new Date("2026-11-07T03:00:00.000Z"), first.db), other)
  assert.equal(first.calls().transactions, 1)
  const second = failingOnce(fakeDb().db, other)
  await assert.rejects(daily.markDigestCounts("user-1", { duePm: 1 }, new Date("2026-11-07T03:00:00.000Z"), second.db), other)
  assert.equal(second.calls().transactions, 1)

  let attempts = 0
  const always: DailyCountDb = {
    ...fakeDb().db,
    async $transaction(operations) {
      attempts += 1
      await Promise.allSettled(operations)
      throw uniqueError()
    },
  }
  await assert.rejects(daily.recordDailyCounts("user-1", { duePm: 1 }, new Date("2026-11-07T03:00:00.000Z"), always), /Unique constraint/)
  assert.equal(attempts, 2, "retried once only")
})

test("no earlier day means no comparison", async () => {
  const { db } = fakeDb([row("2026-11-07", "duePm", 4)])
  const previous = await daily.readPreviousDayCounts("user-1", new Date("2026-11-07T03:00:00.000Z"), db)
  assert.equal(previous, null)
  assert.deepEqual(daily.compareWithPrevious(4, undefined, previous !== null), { kind: "unknown", delta: 0 })
})

test("previous day not yesterday is flagged", async () => {
  const { db } = fakeDb([row("2026-11-03", "duePm", 1), row("2026-11-05", "duePm", 4), row("2026-11-05", "openRepairs", 2), row("2026-11-07", "duePm", 9)])
  const previous = await daily.readPreviousDayCounts("user-1", new Date("2026-11-07T03:00:00.000Z"), db)
  assert.deepEqual(previous, { day: day("2026-11-05"), isYesterday: false, counts: { duePm: 4, openRepairs: 2 } })

  const yesterday = await daily.readPreviousDayCounts("user-1", new Date("2026-11-05T17:30:00.000Z"), db)
  assert.equal(yesterday?.isYesterday, true)
  assert.deepEqual(yesterday?.day, day("2026-11-05"))
})

test("compare up/down/same/new", () => {
  assert.deepEqual(daily.compareWithPrevious(7, 4, true), { kind: "up", delta: 3 })
  assert.deepEqual(daily.compareWithPrevious(2, 5, true), { kind: "down", delta: 3 })
  assert.deepEqual(daily.compareWithPrevious(5, 5, true), { kind: "same", delta: 0 })
  assert.deepEqual(daily.compareWithPrevious(3, undefined, true), { kind: "new", delta: 3 })
  assert.deepEqual(daily.compareWithPrevious(0, undefined, true), { kind: "same", delta: 0 })
  assert.deepEqual(daily.compareWithPrevious(3, 1, false), { kind: "unknown", delta: 0 })
})

test("prune keeps 35 days", async () => {
  const { db, rows } = fakeDb([row("2026-10-02", "duePm", 1), row("2026-10-03", "duePm", 2), row("2026-11-07", "duePm", 3)])
  // 2026-11-07 Bangkok: 2026-10-03 is 35 days before (kept), 2026-10-02 is 36 (deleted).
  const deleted = await daily.pruneDailyCounts(new Date("2026-11-06T17:30:00.000Z"), db)
  assert.equal(deleted, 1)
  assert.deepEqual(rows.map((entry) => entry.day), [day("2026-10-03"), day("2026-11-07")])
})

test("digest days list what was sent, newest first, up to the limit", async () => {
  const { db } = fakeDb([
    row("2026-11-05", "duePm", 9, 8),
    row("2026-11-05", "approvalInbox", 2, 2),
    row("2026-11-06", "duePm", 4, null),
    row("2026-11-07", "openRepairs", 5, 3),
    row("2026-11-04", "duePm", 1, 1),
  ])
  const days = await daily.readDigestDays("user-1", { limit: 2 }, db)
  assert.deepEqual(days, [
    { day: day("2026-11-07"), topics: [{ key: "openRepairs", count: 3 }], items: 3 },
    { day: day("2026-11-05"), topics: [{ key: "approvalInbox", count: 2 }, { key: "duePm", count: 8 }], items: 10 },
  ])
  assert.deepEqual(await daily.readDigestDays("user-1", { limit: 0 }, db), [])
})
