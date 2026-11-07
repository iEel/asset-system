import assert from "node:assert/strict"
import { existsSync, readFileSync } from "node:fs"
import * as nodeModule from "node:module"
import { test } from "node:test"
import { pathToFileURL } from "node:url"

import { DEFAULT_WAITING_WORK_RULES, WAITING_WORK_KEYS, type WaitingWorkKey } from "../src/lib/waiting-work-rules.ts"
import type { WorkRowLite } from "../src/lib/work-center-rows.ts"

// src/lib/work-center-row-data.ts imports "@/…" and the database, which node --test cannot load, so a resolve hook
// serves stand-ins (as in tests/waiting-work-source.test.ts). The readers and the loader are injected fakes.
const mockedModuleSources = new Map<string, string>([
  ["@/lib/auth-utils", `
    export function hasPermission(user, module, action) {
      return user.roles.includes("system_admin") || user.permissions.includes(module + ":" + action)
    }
  `],
  ["@/lib/approval-inbox-query", `
    export function getApprovalInboxAccess(user) {
      const can = (permission) => user.roles.includes("system_admin") || user.permissions.includes(permission)
      const canApproveDisposal = can("disposal:approve")
      const canApproveAudit = can("audit:approve")
      return { canApproveDisposal, canApproveAudit, canAnyApproval: canApproveDisposal || canApproveAudit }
    }
    export async function getApprovalInboxLightRecords() { throw new Error("not in this test") }
  `],
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

const data = (await import(pathToFileURL("src/lib/work-center-row-data.ts").href)) as typeof import("../src/lib/work-center-row-data.ts")
type Readers = import("../src/lib/work-center-row-data.ts").WorkRowReaders
type Source = import("../src/lib/work-center-row-data.ts").WorkRowSource

// 2026-11-07 10:00 Bangkok
const today = new Date("2026-11-07T03:00:00.000Z")
const bangkok = (day: string) => new Date(`${day}T09:00:00.000+07:00`)

const user = (permissions: string[], roles: string[] = []) => ({ id: "user-1", name: "ทดสอบ", roles, permissions, employeeId: "emp-1" })
const admin = user([], ["system_admin"])

const work = (visibleKeys: readonly WaitingWorkKey[] = WAITING_WORK_KEYS) => ({
  counts: Object.fromEntries(WAITING_WORK_KEYS.map((key) => [key, 0])) as Record<WaitingWorkKey, number>,
  visibleKeys: [...visibleKeys],
  rules: DEFAULT_WAITING_WORK_RULES,
  approvalInbox: { total: 0, disposal: 0, audit: 0, findings: 0, rounds: 0 },
})

const sourceKind: Record<Source, WorkRowLite["kind"]> = {
  approvalInbox: "disposalApproval",
  openRepairs: "openRepair",
  stuckRepairs: "stuckRepair",
  duePm: "duePm",
  pendingAuditFindings: "pendingFinding",
  openAuditActions: "auditAction",
  auditActionsDueSoon: "auditAction",
  pendingDisposals: "pendingDisposal",
  approvedDisposals: "approvedDisposal",
}

// Each fake reader returns one row per source and records the scope it was given.
function fakeReaders(calls: { source: Source; scope: unknown }[], rows?: Partial<Record<Source, WorkRowLite[]>>): Readers {
  return Object.fromEntries(
    data.WORK_ROW_SOURCES.map((source) => [
      source,
      async (context: { scope: unknown }) => {
        calls.push({ source, scope: context.scope })
        return rows?.[source] ?? [{ kind: sourceKind[source], id: `${source}-1`, since: bangkok("2026-11-01"), deadline: null, number: source }]
      },
    ]),
  ) as unknown as Readers
}

const options = { today, scope: null, queue: null, slaDays: 3 }

test("a hidden key reads nothing", async () => {
  const calls: { source: Source; scope: unknown }[] = []
  const rows = await data.readWorkRowLites(admin, work(["openRepairs", "duePm"]), options, fakeReaders(calls))
  assert.deepEqual(calls.map((call) => call.source), ["openRepairs", "duePm"])
  assert.deepEqual(rows.map((row) => row.kind), ["openRepair", "duePm"])
})

test("maintenance rows need maintenance:view even when the key is visible", async () => {
  const calls: { source: Source; scope: unknown }[] = []
  // A key visible through another rule never leaks rows: the module view permission decides too.
  const rows = await data.readWorkRowLites(user(["audit:view", "disposal:view"]), work(), options, fakeReaders(calls))
  assert.deepEqual(calls.map((call) => call.source), [
    "pendingAuditFindings", "openAuditActions", "auditActionsDueSoon", "pendingDisposals", "approvedDisposals",
  ])
  assert.equal(rows.some((row) => row.kind === "openRepair" || row.kind === "stuckRepair" || row.kind === "duePm"), false)

  calls.length = 0
  await data.readWorkRowLites(user(["maintenance:view"]), work(), options, fakeReaders(calls))
  assert.deepEqual(calls.map((call) => call.source), ["openRepairs", "stuckRepairs", "duePm"])

  calls.length = 0
  await data.readWorkRowLites(user(["audit:view"]), work(), options, fakeReaders(calls))
  assert.equal(calls.some((call) => call.source === "approvalInbox"), false, "approval rows need the inbox access")
  calls.length = 0
  await data.readWorkRowLites(user(["audit:approve"]), work(), options, fakeReaders(calls))
  assert.deepEqual(calls.map((call) => call.source), ["approvalInbox"])
})

test("scope applies to every kind but approvals", async () => {
  const calls: { source: Source; scope: unknown }[] = []
  const scope = { enabled: true, employeeId: "emp-1", departmentId: "dep-1" }
  await data.readWorkRowLites(admin, work(), { ...options, scope }, fakeReaders(calls))
  assert.equal(calls.length, data.WORK_ROW_SOURCES.length)
  for (const call of calls) {
    assert.equal(call.scope, call.source === "approvalInbox" ? null : scope, call.source)
  }
})

test("queue keeps only its kinds", async () => {
  const calls: { source: Source; scope: unknown }[] = []
  const rows = await data.readWorkRowLites(admin, work(), { ...options, queue: "audit" }, fakeReaders(calls))
  assert.deepEqual(calls.map((call) => call.source), ["pendingAuditFindings", "openAuditActions", "auditActionsDueSoon"])
  assert.deepEqual([...new Set(rows.map((row) => row.kind))], ["pendingFinding", "auditAction"])

  calls.length = 0
  await data.readWorkRowLites(admin, work(), { ...options, queue: "disposal" }, fakeReaders(calls))
  assert.deepEqual(calls.map((call) => call.source), ["pendingDisposals", "approvedDisposals"])
})

test("getWorkCenterRows hydrates only the first show rows in rank order", async () => {
  const lite = (kind: WorkRowLite["kind"], id: string, since: string, deadline: string | null, number: string): WorkRowLite => ({
    kind, id, since: bangkok(since), deadline: deadline ? bangkok(deadline) : null, number,
  })
  const rows: Partial<Record<Source, WorkRowLite[]>> = {
    openRepairs: [lite("openRepair", "r1", "2026-10-20", null, "MT-0001"), lite("openRepair", "r2", "2026-11-05", null, "MT-0002")],
    duePm: [lite("duePm", "p1", "2026-01-01", "2026-11-01", "PM-0001"), lite("duePm", "p2", "2026-01-01", "2026-12-30", "PM-0002")],
    approvedDisposals: [lite("approvedDisposal", "d1", "2026-10-25", null, "DP-0001")],
    pendingDisposals: [],
    stuckRepairs: [],
    pendingAuditFindings: [],
    openAuditActions: [lite("auditAction", "a1", "2026-11-02", "2026-11-03", "AUD-0001")],
    auditActionsDueSoon: [],
    approvalInbox: [],
  }
  const loaded: WorkRowLite[][] = []
  const result = await data.getWorkCenterRows(
    admin,
    work(),
    { ...options, show: 3, locale: "th", returnTo: "/th/work-center" },
    {
      readers: fakeReaders([], rows),
      load: async (_user, lites) => {
        loaded.push([...lites])
        return []
      },
    },
  )
  assert.equal(result.total, 6)
  assert.equal(loaded.length, 1)
  // Overdue first (PM-0001 six days, AUD-0001 four days), then the oldest since: PM-0002 (since Jan 1).
  assert.deepEqual(loaded[0].map((row) => row.id), ["p1", "a1", "p2"])
})

// Group 9 plan 2 Task 2: the page reads only getWorkCenterPageData, which holds the scoped counters now.
test("the work-center loader imports the scope functions from @/lib/work-center-scope and does not define them", () => {
  const page = readFileSync("src/lib/work-center-page-data.ts", "utf8")
  assert.match(page, /from "@\/lib\/work-center-scope"/)
  for (const name of [
    "applyAssetWorkCenterScope",
    "applyMaintenanceWorkCenterScope",
    "applyPlanWorkCenterScope",
    "applyAuditFindingWorkCenterScope",
    "applyAuditItemWorkCenterScope",
    "applyDisposalWorkCenterScope",
    "getScopedWhere",
    "applyWorkCenterScope",
  ]) {
    assert.doesNotMatch(page, new RegExp(`function ${name}\\b`), name)
  }
})
