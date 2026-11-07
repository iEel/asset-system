import assert from "node:assert/strict"
import { existsSync } from "node:fs"
import * as nodeModule from "node:module"
import { test } from "node:test"
import { pathToFileURL } from "node:url"

import { DEFAULT_WAITING_WORK_RULES, WAITING_WORK_KEYS, type WaitingWorkKey } from "../src/lib/waiting-work-rules.ts"
import { buildNotificationSummaryItems } from "../src/lib/notification-summary-items.ts"

// src/lib/notifications-page-data.ts imports "@/…" and the database, which node --test cannot load, so a resolve hook
// serves stand-ins (as in tests/work-center-page-data.test.ts). Every reader is an injected fake.
const unused = (...names: string[]) =>
  names.map((name) => `export async function ${name}() { throw new Error("${name} is injected in this test") }`).join("\n")
const mockedModuleSources = new Map<string, string>([
  ["@/lib/auth-utils", `
    export function hasPermission(user, module, action) {
      return user.roles.includes("system_admin") || user.permissions.includes(module + ":" + action)
    }
  `],
  ["@/lib/db", `
    export const prisma = new Proxy({}, { get() { throw new Error("no database in this test") } })
  `],
  ["@/lib/waiting-work", unused("getWaitingWork", "getWaitingWorkAges")],
  ["@/lib/notification-summary", unused("getNotificationCenter", "getNotificationSummary")],
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

const loader = (await import(pathToFileURL("src/lib/notifications-page-data.ts").href)) as typeof import("../src/lib/notifications-page-data.ts")
type Deps = import("../src/lib/notifications-page-data.ts").NotificationsPageDeps
type SessionUser = import("../src/lib/auth-utils.ts").SessionUser
type WaitingWork = import("../src/lib/waiting-work.ts").WaitingWork
type CenterItem = import("../src/lib/notification-center.ts").NotificationCenterItem

// 2026-11-07 10:00 Bangkok
const now = new Date("2026-11-07T03:00:00.000Z")
const readTime = new Date("2026-11-07T02:15:00.000Z")

const user: SessionUser = { id: "user-1", name: "User", roles: [], permissions: ["dashboard:view"], employeeId: "emp-1" }

function work(counts: Partial<Record<WaitingWorkKey, number>>, visibleKeys: WaitingWorkKey[] = Object.keys(counts) as WaitingWorkKey[]): WaitingWork {
  const full = Object.fromEntries(WAITING_WORK_KEYS.map((key) => [key, counts[key] ?? 0])) as Record<WaitingWorkKey, number>
  return {
    counts: full,
    visibleKeys,
    rules: DEFAULT_WAITING_WORK_RULES,
    approvalInbox: { total: counts.approvalInbox ?? 0, disposal: 4, audit: 15, findings: 14, rounds: 1 } as WaitingWork["approvalInbox"],
  }
}

type ItemState = Partial<Pick<CenterItem, "isRead" | "isSnoozed" | "snoozedUntil" | "assignedToUserId" | "readAt">>

// The center's items as getNotificationCenter returns them: count > 0 only, each with its state.
function centerItems(waiting: WaitingWork, states: Partial<Record<WaitingWorkKey, ItemState>> = {}): CenterItem[] {
  return buildNotificationSummaryItems("th", waiting.counts).map((item) => {
    const state = states[item.key as WaitingWorkKey] ?? {}
    const isRead = state.isRead ?? false
    const isSnoozed = state.isSnoozed ?? false
    return {
      ...item,
      isRead,
      isSnoozed,
      isSuppressed: isRead || isSnoozed,
      snoozedUntil: state.snoozedUntil ?? null,
      assignedToUserId: state.assignedToUserId ?? null,
      readAt: state.readAt ?? null,
    }
  })
}

type Calls = { recorded: Array<Record<string, number>>; legacyArgs: unknown[]; digestLimits: number[]; agesFor: WaitingWorkKey[][] }

function fakes(
  waiting: WaitingWork,
  states: Partial<Record<WaitingWorkKey, ItemState>> = {},
  overrides: Partial<Deps> = {},
): { deps: Partial<Deps>; calls: Calls } {
  const calls: Calls = { recorded: [], legacyArgs: [], digestLimits: [], agesFor: [] }
  const deps: Partial<Deps> = {
    getWaitingWork: async () => waiting,
    getNotificationCenter: async () => ({ items: centerItems(waiting, states) }),
    getWaitingWorkAges: async (_user, keys) => {
      calls.agesFor.push([...keys])
      return {
        openRepairs: { kind: "age", days: 18, overdue: false },
        duePm: { kind: "due", days: -2, overdue: true },
        auditActionsDueSoon: { kind: "due", days: 15, overdue: false },
      }
    },
    recordDailyCounts: async (_userId, counts) => {
      calls.recorded.push(counts as Record<string, number>)
    },
    readPreviousDayCounts: async () => null,
    readDigestDays: async (_userId, options) => {
      calls.digestLimits.push(options.limit)
      return []
    },
    readDigestDayStats: async () => ({ totalDays: 0, firstDay: null }),
    findLegacyDigests: async (args) => {
      calls.legacyArgs.push(args)
      return []
    },
    readAssignees: async () => [{ id: "user-2", label: "สมชาย" }],
    ...overrides,
  }
  return { deps, calls }
}

const input = (searchParams: Record<string, string> = {}) => ({ searchParams, locale: "th", now })

test("parseNotificationsParams defaults", () => {
  assert.deepEqual(loader.parseNotificationsParams({}), { status: "unread", assigned: false, digestAll: false })
  assert.deepEqual(loader.parseNotificationsParams({ status: "junk", assigned: "yes", digest: "some" }), {
    status: "unread",
    assigned: false,
    digestAll: false,
  })
  assert.deepEqual(loader.parseNotificationsParams({ status: ["snoozed", "read"], assigned: "1", digest: "all" }), {
    status: "snoozed",
    assigned: true,
    digestAll: true,
  })
  for (const status of ["unread", "read", "snoozed", "all"] as const) {
    assert.equal(loader.parseNotificationsParams({ status }).status, status)
  }
})

test("tabs count topics by state", async () => {
  const waiting = work({ approvalInbox: 3, openRepairs: 7, duePm: 2, returnsDueSoon: 1, warrantyExpiringSoon: 0 })
  const { deps } = fakes(waiting, {
    openRepairs: { isRead: true, readAt: readTime },
    returnsDueSoon: { isSnoozed: true, snoozedUntil: "2026-11-08T03:00:00.000Z" },
    duePm: { assignedToUserId: "user-2" },
  })
  const data = await loader.getNotificationsPageData(user, input(), deps)
  assert.deepEqual(data.counts, { unread: 2, read: 1, snoozed: 1, all: 4, assigned: 1 })
  assert.deepEqual(data.backlog.rows.map((row) => [row.key, row.state]), [["approvalInbox", "unread"], ["duePm", "unread"]])
  assert.deepEqual(data.advance.rows, [])

  const read = await loader.getNotificationsPageData(user, input({ status: "read" }), deps)
  assert.deepEqual(read.backlog.rows.map((row) => [row.key, row.state, row.readAt]), [["openRepairs", "read", readTime]])

  const snoozed = await loader.getNotificationsPageData(user, input({ status: "snoozed" }), deps)
  assert.deepEqual(snoozed.advance.rows.map((row) => [row.key, row.snoozedUntil?.toISOString()]), [
    ["returnsDueSoon", "2026-11-08T03:00:00.000Z"],
  ])

  const all = await loader.getNotificationsPageData(user, input({ status: "all" }), deps)
  assert.equal(all.backlog.rows.length + all.advance.rows.length, 4)
  assert.equal(all.canOpenWorkCenter, true)
  assert.equal(all.backlog.rows.find((row) => row.key === "duePm")?.assigneeName, "สมชาย")
})

test("a risen topic is unread again without its read time", async () => {
  // The center un-reads a risen topic (count above lastCount) and drops its readAt.
  const waiting = work({ openRepairs: 9 })
  const { deps } = fakes(waiting, { openRepairs: { isRead: false, readAt: null } })
  const data = await loader.getNotificationsPageData(user, input(), deps)
  assert.deepEqual(data.backlog.rows.map((row) => [row.key, row.state, row.readAt]), [["openRepairs", "unread", null]])
  assert.equal(data.counts.read, 0)
})

test("assigned filter keeps assigned topics", async () => {
  const waiting = work({ approvalInbox: 3, openRepairs: 7, licenseExpiringSoon: 2 })
  const { deps } = fakes(waiting, {
    openRepairs: { assignedToUserId: "user-2" },
    licenseExpiringSoon: { assignedToUserId: "user-9" },
  })
  const data = await loader.getNotificationsPageData(user, input({ assigned: "1" }), deps)
  assert.deepEqual(data.backlog.rows.map((row) => row.key), ["openRepairs"])
  assert.deepEqual(data.advance.rows.map((row) => [row.key, row.assigneeName]), [["licenseExpiringSoon", "user-9"]])
  assert.equal(data.counts.assigned, 2)
  assert.equal(data.params.assigned, true)
})

test("sections split advance warnings", async () => {
  const waiting = work({ approvalInbox: 3, approvedDisposals: 2, returnsDueSoon: 1, warrantyExpiringSoon: 4, licenseExpiringSoon: 2 })
  const { deps } = fakes(waiting, {}, {
    readPreviousDayCounts: async () => ({
      day: new Date("2026-11-06T00:00:00.000Z"),
      isYesterday: true,
      counts: { approvalInbox: 5, returnsDueSoon: 1, warrantyExpiringSoon: 2 },
    }),
  })
  const data = await loader.getNotificationsPageData(user, input(), deps)
  assert.deepEqual(data.backlog.rows.map((row) => [row.key, row.section]), [
    ["approvalInbox", "backlog"],
    ["approvedDisposals", "backlog"],
  ])
  assert.deepEqual(data.advance.rows.map((row) => [row.key, row.section]), [
    ["returnsDueSoon", "advance"],
    ["warrantyExpiringSoon", "advance"],
    ["licenseExpiringSoon", "advance"],
  ])
  assert.equal(data.backlog.queues, 2)
  assert.equal(data.backlog.items, 5)
  assert.equal(data.backlog.previousItems, 5)
  assert.equal(data.advance.items, 7)
  assert.equal(data.advance.previousItems, 3)
  assert.deepEqual(
    [...data.backlog.rows, ...data.advance.rows].map((row) => [row.key, row.change]),
    [
      ["approvalInbox", { kind: "down", delta: 2 }],
      ["approvedDisposals", { kind: "new", delta: 2 }],
      ["returnsDueSoon", { kind: "same", delta: 0 }],
      ["warrantyExpiringSoon", { kind: "up", delta: 2 }],
      ["licenseExpiringSoon", { kind: "new", delta: 2 }],
    ],
  )

  const unknown = await loader.getNotificationsPageData(user, input(), fakes(waiting).deps)
  assert.equal(unknown.backlog.previousItems, null)
  assert.equal(unknown.advance.previousItems, null)
  assert.deepEqual(unknown.backlog.rows[0].change, { kind: "unknown", delta: 0 })
})

test("detail lines per key", async () => {
  const waiting = work({ approvalInbox: 20, openRepairs: 7, duePm: 3, auditActionsDueSoon: 2, stuckRepairs: 1, returnsDueSoon: 1 })
  const { deps, calls } = fakes(waiting)
  const data = await loader.getNotificationsPageData(user, input(), deps)
  const detailOf = (key: WaitingWorkKey) => [...data.backlog.rows, ...data.advance.rows].find((row) => row.key === key)?.detail
  assert.deepEqual(detailOf("approvalInbox"), { key: "detail.approvalParts", values: { disposal: 4, mismatches: 14, rounds: 1 } })
  assert.deepEqual(detailOf("openRepairs"), { key: "detail.openRepairsOldest", values: { days: 18 } })
  // Today 7 Nov 2569 (Bangkok); PM two days overdue, the nearest action due in 15 days.
  assert.deepEqual(detailOf("duePm"), { key: "detail.nearestDue", values: { date: "5 พ.ย." } })
  assert.deepEqual(detailOf("auditActionsDueSoon"), { key: "detail.nearestDue", values: { date: "22 พ.ย." } })
  assert.deepEqual(detailOf("stuckRepairs"), { key: "stuckRepairsDetail", values: {} })
  assert.deepEqual(detailOf("returnsDueSoon"), { key: "returnsDueSoonDetail", values: {} })
  // Ages are read only for the keys whose line uses them.
  assert.deepEqual(calls.agesFor, [["openRepairs", "duePm", "auditActionsDueSoon"]])

  // Without an age the line falls back to today's detail message.
  const { deps: noAges } = fakes(waiting, {}, { getWaitingWorkAges: async () => ({}) })
  const plain = await loader.getNotificationsPageData(user, input(), noAges)
  assert.deepEqual(plain.backlog.rows.find((row) => row.key === "duePm")?.detail, { key: "duePmDetail", values: {} })
})

test("visible keys are recorded with their counts, zero included", async () => {
  const waiting = work({ approvalInbox: 3, openRepairs: 0 })
  const { deps, calls } = fakes(waiting)
  await loader.getNotificationsPageData(user, input(), deps)
  assert.deepEqual(calls.recorded, [{ approvalInbox: 3, openRepairs: 0 }])
})

test("nothing visible records nothing", async () => {
  const { deps, calls } = fakes(work({}, []))
  const data = await loader.getNotificationsPageData(user, input(), deps)
  assert.deepEqual(calls.recorded, [])
  assert.deepEqual(data.counts, { unread: 0, read: 0, snoozed: 0, all: 0, assigned: 0 })
  assert.deepEqual(calls.agesFor, [])
})

test("a failed recording does not break the page", async () => {
  const errors: unknown[][] = []
  const originalError = console.error
  console.error = (...args: unknown[]) => {
    errors.push(args)
  }
  try {
    const { deps } = fakes(work({ approvalInbox: 3 }), {}, {
      recordDailyCounts: async () => {
        throw new Error("secret row data")
      },
      readPreviousDayCounts: async () => {
        throw new Error("secret row data")
      },
    })
    const data = await loader.getNotificationsPageData(user, input(), deps)
    assert.equal(data.counts.unread, 1)
    assert.equal(data.backlog.previousItems, null)
  } finally {
    console.error = originalError
  }
  assert.equal(errors.length, 2)
  for (const args of errors) assert.ok(args.every((arg) => typeof arg === "string" && !arg.includes("secret")))
})

test("legacy digest rows are filtered by module", async () => {
  const firstDay = new Date("2026-11-03T00:00:00.000Z")
  const days = [{ day: new Date("2026-11-06T00:00:00.000Z"), topics: [{ key: "approvalInbox" as const, count: 3 }], items: 3 }]
  const legacy = [{ id: "n-1", title: "สรุป", message: "ข้อความ", createdAt: new Date("2026-11-01T00:30:00.000Z") }]
  const { deps, calls } = fakes(work({ approvalInbox: 3 }), {}, {
    readDigestDays: async (_userId, options) => {
      calls.digestLimits.push(options.limit)
      return days
    },
    readDigestDayStats: async () => ({ totalDays: 4, firstDay }),
    findLegacyDigests: async (args) => {
      calls.legacyArgs.push(args)
      return legacy
    },
  })
  const data = await loader.getNotificationsPageData(user, input(), deps)
  assert.deepEqual(data.digest, { days, totalDays: 4, legacy })
  assert.deepEqual(calls.legacyArgs, [
    {
      where: {
        userId: "user-1",
        module: "notification_digest",
        // Before the first digest day's Bangkok midnight.
        createdAt: { lt: new Date("2026-11-02T17:00:00.000Z") },
      },
      orderBy: { createdAt: "desc" },
      take: 10,
      select: { id: true, title: true, message: true, createdAt: true },
    },
  ])

  await loader.getNotificationsPageData(user, input({ digest: "all" }), deps)
  assert.deepEqual(calls.digestLimits, [3, 30])
  assert.equal((calls.legacyArgs[1] as { take: number }).take, 30)

  // No digest day yet: every legacy digest row may list.
  const none = fakes(work({ approvalInbox: 3 }))
  await loader.getNotificationsPageData(user, input(), none.deps)
  assert.deepEqual((none.calls.legacyArgs[0] as { where: unknown }).where, { userId: "user-1", module: "notification_digest" })
})
