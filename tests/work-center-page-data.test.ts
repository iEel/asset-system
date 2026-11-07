import assert from "node:assert/strict"
import { existsSync } from "node:fs"
import * as nodeModule from "node:module"
import { test } from "node:test"
import { pathToFileURL } from "node:url"

import { DEFAULT_WAITING_WORK_RULES, WAITING_WORK_KEYS, type WaitingWorkKey } from "../src/lib/waiting-work-rules.ts"

// src/lib/work-center-page-data.ts imports "@/…" and the database, which node --test cannot load, so a resolve hook
// serves stand-ins (as in tests/work-center-row-data.test.ts). Every reader is an injected fake.
const unused = (name: string) => `export async function ${name}() { throw new Error("${name} is injected in this test") }`
const mockedModuleSources = new Map<string, string>([
  ["@/lib/auth-utils", `
    export function hasPermission(user, module, action) {
      return user.roles.includes("system_admin") || user.permissions.includes(module + ":" + action)
    }
  `],
  ["@/lib/db", `
    export const prisma = new Proxy({}, { get() { throw new Error("no database in this test") } })
  `],
  ["@/lib/waiting-work", unused("getWaitingWork")],
  ["@/lib/notification-summary", unused("getNotificationSummary")],
  ["@/lib/work-center-data-issues", unused("countDataIssueAssets")],
  ["@/lib/approval-inbox-query", unused("getApprovalInboxSlaDays")],
  ["@/lib/work-center-row-data", unused("getWorkCenterRows")],
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

const loader = (await import(pathToFileURL("src/lib/work-center-page-data.ts").href)) as typeof import("../src/lib/work-center-page-data.ts")
type Deps = import("../src/lib/work-center-page-data.ts").WorkCenterPageDeps
type SessionUser = import("../src/lib/auth-utils.ts").SessionUser
type WaitingWork = import("../src/lib/waiting-work.ts").WaitingWork

// 2026-11-07 10:00 Bangkok
const now = new Date("2026-11-07T03:00:00.000Z")

const user = (permissions: string[], employeeId: string | null = "emp-1"): SessionUser => ({
  id: "user-1",
  name: "User",
  roles: [],
  permissions,
  employeeId,
})

const allPermissions = [
  "dashboard:view",
  "asset:view",
  "maintenance:view",
  "audit:view",
  "disposal:view",
  "disposal:approve",
  "audit:approve",
]

function work(counts: Partial<Record<WaitingWorkKey, number>>, visibleKeys: WaitingWorkKey[] = Object.keys(counts) as WaitingWorkKey[]): WaitingWork {
  const full = Object.fromEntries(WAITING_WORK_KEYS.map((key) => [key, counts[key] ?? 0])) as Record<WaitingWorkKey, number>
  const approvals = counts.approvalInbox ?? 0
  return {
    counts: full,
    visibleKeys,
    rules: DEFAULT_WAITING_WORK_RULES,
    approvalInbox: { total: approvals, disposal: approvals, audit: 0, findings: 0, rounds: 0 } as WaitingWork["approvalInbox"],
  }
}

type Calls = {
  recorded: Array<{ userId: string; counts: Record<string, number> }>
  previousReads: number
  mineCounted: string[]
  rows: Array<{ queue: unknown; show: number; scope: unknown }>
  assetsLoaded: number
  trackingScopes: unknown[]
}

function fakes(overrides: Partial<Deps> & { waiting?: WaitingWork } = {}): { deps: Partial<Deps>; calls: Calls } {
  const calls: Calls = { recorded: [], previousReads: 0, mineCounted: [], rows: [], assetsLoaded: 0, trackingScopes: [] }
  const deps: Partial<Deps> = {
    getWaitingWork: async () => overrides.waiting ?? work({}),
    readDepartmentId: async () => null,
    countMine: async (key) => {
      calls.mineCounted.push(key)
      return 1
    },
    getRows: async (_user, _work, options) => {
      calls.rows.push({ queue: options.queue, show: options.show, scope: options.scope })
      return { rows: [], total: 0 }
    },
    getSlaDays: async () => 3,
    countDataIssues: async () => 5,
    readTrackingRounds: async (scope) => {
      calls.trackingScopes.push(scope)
      return []
    },
    readUnreadTopics: async () => 2,
    recordDailyCounts: async (userId, counts) => {
      calls.recorded.push({ userId, counts: counts as Record<string, number> })
    },
    readPreviousDayCounts: async () => {
      calls.previousReads += 1
      return null
    },
    loadAssets: async () => {
      calls.assetsLoaded += 1
      return { counts: { missingResponsibility: 0, missingSerial: 0, missingPhoto: 0 }, fixGroups: [], assets: [] }
    },
    ...overrides,
  }
  return { deps, calls }
}

const input = (searchParams: Record<string, string> = {}) => ({ searchParams, locale: "th", now, returnTo: "/th/work-center" })

test("a user with no queue sees an empty page", async () => {
  const { deps } = fakes({ countDataIssues: async () => null })
  const data = await loader.getWorkCenterPageData(user(["dashboard:view"]), input(), deps)
  assert.deepEqual(data.summary.queues, [])
  assert.equal(data.summary.backlogTotal, 0)
  assert.equal(data.summary.today.total, 0)
  assert.equal(data.mineUnavailable, false)
  assert.deepEqual(data.table, { rows: [], total: 0, show: 8 })
  assert.equal(data.assets, null)
  assert.deepEqual(data.tracking, { round: null, dataIssues: null, advanceTotal: 0, canScan: false })
  assert.equal(data.unreadTopics, 2)
})

test("mine never records and never compares", async () => {
  const { deps, calls } = fakes({
    waiting: work({ approvalInbox: 4, openRepairs: 9, approvedDisposals: 7 }),
  })
  const data = await loader.getWorkCenterPageData(user(allPermissions, null), input({ view: "mine" }), deps)
  assert.equal(data.mineUnavailable, true)
  assert.equal(data.previous, null)
  assert.deepEqual(calls.recorded, [])
  assert.equal(calls.previousReads, 0)
  // The approval inbox stays the user's own; the other kinds are the scoped counts (1 each from the fake).
  assert.deepEqual(calls.mineCounted.sort(), ["approvedDisposals", "openRepairs"])
  assert.equal(data.summary.today.approvals, 4)
  assert.equal(data.summary.today.approvedDisposals, 1)
  assert.equal(data.summary.backlogTotal, 4 + 1 + 1)
  assert.deepEqual(calls.rows[0].scope, { enabled: false, employeeId: null, departmentId: null })
})

test("a failed recording does not break the page", async () => {
  const errors: unknown[][] = []
  const originalError = console.error
  console.error = (...args: unknown[]) => {
    errors.push(args)
  }
  try {
    const { deps } = fakes({
      waiting: work({ openRepairs: 3 }),
      recordDailyCounts: async () => {
        throw new Error("database down")
      },
    })
    const data = await loader.getWorkCenterPageData(user(allPermissions), input(), deps)
    assert.equal(data.summary.backlogTotal, 3)
    assert.deepEqual(errors, [["[work-center] recording daily counts failed"]])
  } finally {
    console.error = originalError
  }
})

test("view=all records every visible key and data issues", async () => {
  const { deps, calls } = fakes({ waiting: work({ openRepairs: 3, warrantyExpiringSoon: 2 }) })
  await loader.getWorkCenterPageData(user(allPermissions), input(), deps)
  assert.deepEqual(calls.recorded, [{ userId: "user-1", counts: { openRepairs: 3, warrantyExpiringSoon: 2, dataIssues: 5 } }])
})

test("tracking picks the round with most left", async () => {
  const { deps, calls } = fakes({
    readTrackingRounds: async (scope) => {
      calls.trackingScopes.push(scope)
      return [
        { id: "r1", auditNo: "AUD-2026-0001", name: "Round one", total: 100, pending: 10 },
        { id: "r2", auditNo: "AUD-2026-0002", name: "Round two", total: 50, pending: 30 },
      ]
    },
  })
  const data = await loader.getWorkCenterPageData(user(allPermissions), input(), deps)
  assert.deepEqual(data.tracking.round, { id: "r2", auditNo: "AUD-2026-0002", name: "Round two", checked: 20, total: 50, pending: 30 })
  assert.deepEqual(calls.trackingScopes, [null])

  const none = fakes({ readTrackingRounds: async () => [] })
  const empty = await loader.getWorkCenterPageData(user(allPermissions), input(), none.deps)
  assert.equal(empty.tracking.round, null)
  assert.equal(empty.tracking.dataIssues, 5)

  const noAudit = fakes({
    readTrackingRounds: async () => {
      throw new Error("must not read without audit:view")
    },
  })
  const hidden = await loader.getWorkCenterPageData(user(["dashboard:view", "asset:view"]), input(), noAudit.deps)
  assert.equal(hidden.tracking.round, null)
})

test("previous backlog sums yesterday's backlog keys only", async () => {
  const { deps } = fakes({
    waiting: work({ approvalInbox: 2, openRepairs: 5, duePm: 1, warrantyExpiringSoon: 9 }),
    readPreviousDayCounts: async () => ({
      day: new Date("2026-11-06T00:00:00.000Z"),
      isYesterday: true,
      // duePm is absent that day (counts 0); the advance key and dataIssues are not backlog.
      counts: { approvalInbox: 3, openRepairs: 2, warrantyExpiringSoon: 40, dataIssues: 7 },
    }),
  })
  const data = await loader.getWorkCenterPageData(user(allPermissions), input(), deps)
  assert.equal(data.summary.backlogTotal, 8)
  assert.deepEqual(data.previous, {
    dayLabelDate: new Date("2026-11-06T00:00:00.000Z"),
    isYesterday: true,
    backlogTotal: 5,
    backlogChange: { kind: "up", delta: 3 },
  })
  assert.equal(data.tracking.advanceTotal, 9)
})

test("show is parsed and passed to the rows", async () => {
  const { deps, calls } = fakes({ waiting: work({ openRepairs: 3 }) })
  const data = await loader.getWorkCenterPageData(user(allPermissions), input({ show: "20", panel: "maintenance" }), deps)
  assert.equal(data.params.show, 24)
  assert.deepEqual(calls.rows, [{ queue: "maintenance", show: 24, scope: null }])
  assert.equal(data.table?.show, 24)

  const overview = fakes()
  await loader.getWorkCenterPageData(user(allPermissions), input({ show: "junk" }), overview.deps)
  assert.deepEqual(overview.calls.rows, [{ queue: null, show: 8, scope: null }])
})

test("assets panel loads no table", async () => {
  const { deps, calls } = fakes()
  const data = await loader.getWorkCenterPageData(user(allPermissions), input({ panel: "assets" }), deps)
  assert.equal(data.table, null)
  assert.deepEqual(calls.rows, [])
  assert.equal(calls.assetsLoaded, 1)
  assert.notEqual(data.assets, null)

  const elsewhere = fakes()
  const overview = await loader.getWorkCenterPageData(user(allPermissions), input(), elsewhere.deps)
  assert.equal(overview.assets, null)
  assert.equal(elsewhere.calls.assetsLoaded, 0)
})

// Task 1 review ruling: a round with nothing left to check is waiting to close, not a walk to continue.
test("tracking ignores rounds with nothing left to check", () => {
  assert.equal(loader.pickTrackingRound([{ id: "r1", auditNo: "AUD-2026-0001", name: "Done", total: 86, pending: 0 }]), null)
  assert.deepEqual(
    loader.pickTrackingRound([
      { id: "r1", auditNo: "AUD-2026-0001", name: "Done", total: 86, pending: 0 },
      { id: "r2", auditNo: "AUD-2026-0002", name: "Open", total: 10, pending: 1 },
    ]),
    { id: "r2", auditNo: "AUD-2026-0002", name: "Open", checked: 9, total: 10, pending: 1 },
  )
})

test("the view's counts reach the page for the queue parts line", async () => {
  const { deps } = fakes({ waiting: work({ openRepairs: 3, duePm: 2 }) })
  const data = await loader.getWorkCenterPageData(user(allPermissions), input(), deps)
  assert.equal(data.counts.openRepairs, 3)
  assert.equal(data.counts.duePm, 2)

  const mine = fakes({ waiting: work({ openRepairs: 3 }) })
  const scoped = await loader.getWorkCenterPageData(user(allPermissions), input({ view: "mine" }), mine.deps)
  assert.equal(scoped.counts.openRepairs, 1, "งานของฉัน: the scoped count")
})

// Final review ruling 2: เดินตรวจต่อ needs the scan page's audit:edit; the panel itself needs audit:view.
test("tracking says whether the user may scan (audit:edit)", async () => {
  const viewer = await loader.getWorkCenterPageData(user(allPermissions), input(), fakes().deps)
  assert.equal(viewer.tracking.canScan, false)
  const scanner = await loader.getWorkCenterPageData(user([...allPermissions, "audit:edit"]), input(), fakes().deps)
  assert.equal(scanner.tracking.canScan, true)
})

// Final review ruling 4: a queue panel the user cannot see, or ข้อมูลไม่ครบ without asset:view, falls back to ภาพรวม
// before the rows, the return link or anything else uses it.
test("a forbidden panel falls back to the overview", async () => {
  const hiddenQueue = fakes({ waiting: work({ openRepairs: 3 }) })
  const queueData = await loader.getWorkCenterPageData(
    user(allPermissions),
    { ...input({ panel: "disposal", show: "16" }), returnTo: "/th/work-center?panel=disposal&show=16" },
    { ...hiddenQueue.deps, getRows: async (_user, _work, options) => {
      hiddenQueue.calls.rows.push({ queue: options.queue, show: options.show, scope: options.scope })
      assert.equal(options.returnTo, "/th/work-center?show=16")
      return { rows: [], total: 0 }
    } },
  )
  assert.equal(queueData.params.panel, "overview")
  assert.deepEqual(hiddenQueue.calls.rows, [{ queue: null, show: 16, scope: null }])

  const visibleQueue = fakes({ waiting: work({ openRepairs: 3 }) })
  const kept = await loader.getWorkCenterPageData(user(allPermissions), input({ panel: "maintenance" }), visibleQueue.deps)
  assert.equal(kept.params.panel, "maintenance")
  assert.deepEqual(visibleQueue.calls.rows, [{ queue: "maintenance", show: 8, scope: null }])

  const noAssetView = fakes({ countDataIssues: async () => null })
  const assets = await loader.getWorkCenterPageData(user(["dashboard:view", "maintenance:view"]), input({ panel: "assets" }), noAssetView.deps)
  assert.equal(assets.params.panel, "overview")
  assert.equal(assets.assets, null)
  assert.equal(noAssetView.calls.assetsLoaded, 0)
  assert.deepEqual(noAssetView.calls.rows, [{ queue: null, show: 8, scope: null }])
  assert.notEqual(assets.table, null)
})
