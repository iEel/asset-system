import assert from "node:assert/strict"
import { existsSync, readFileSync } from "node:fs"
import * as nodeModule from "node:module"
import { beforeEach, test } from "node:test"
import { pathToFileURL } from "node:url"

// The notifications route and summary import next/server and "@/…", which node --test cannot load, so a resolve hook
// serves stand-ins (as in tests/disposal-pending-source-route.test.ts). The database is a stub: nothing is written anywhere.
const state = { inbox: { total: 2, audit: 0, disposal: 0 }, counts: {} as Record<string, number>, states: [] as Array<Record<string, unknown>>, calls: [] as Array<{ call: string; args: Record<string, unknown> }> }
Object.assign(globalThis, { __notificationRoute: state })

const mockedModuleSources = new Map<string, string>([
  ["next/server", `
    export class NextRequest extends Request { get nextUrl() { return new URL(this.url) } }
    export class NextResponse extends Response {
      static json(body, init) { return Response.json(body, init) }
    }
  `],
  ["@/lib/auth-utils", `
    export async function requireAuth() { return { id: "user-1", roles: [], permissions: [], employeeId: null } }
    export function hasRole() { return false }
    export function hasPermission() { return true }
    export function requirePermission() {}
  `],
  ["@/lib/approval-inbox-query", `
    export async function getApprovalInboxCounts() { return globalThis.__notificationRoute.inbox }
    export function getApprovalInboxAccess() { return { canApproveDisposal: true, canApproveAudit: true, canAnyApproval: true } }
  `],
  ["@/lib/db", `
    const state = () => globalThis.__notificationRoute
    function model(name) {
      return new Proxy({}, {
        get(_target, method) {
          return async (args) => {
            state().calls.push({ call: name + "." + String(method), args })
            if (method === "count") return name === "asset" && args?.where?.checkouts ? state().counts.assetReturns ?? 0 : state().counts[name] ?? 0
            if (name === "systemSetting" && method === "findMany") return []
            if (name === "notificationUserState" && method === "findMany") {
              const keys = args?.where?.key?.in ?? []
              return state().states.filter((row) => keys.includes(row.key))
            }
            if (name === "notificationUserState" && method === "updateMany") return { count: 1 }
            if (name === "notificationUserState" && method === "upsert") {
              const key = args.where.userId_key.key
              const row = { key, assignedToUserId: null, ...args.update }
              const index = state().states.findIndex((existing) => existing.key === key)
              if (index >= 0) state().states[index] = row
              else state().states.push(row)
              return row
            }
            if (method === "findFirst" || method === "findUnique") return null
            return {}
          }
        },
      })
    }
    const client = new Proxy({}, {
      get(_target, key) {
        if (key === "$transaction") return async (operations) => Promise.all(operations)
        return model(String(key))
      },
    })
    export const prisma = client
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

const load = <T>(path: string) => import(pathToFileURL(path).href) as Promise<T>
const read = (path: string) => readFileSync(path, "utf8").replace(/\r/g, "")

type Handler = (request: Request) => Promise<Response>
const route = await load<{ GET: Handler; PATCH: Handler }>("src/app/api/notifications/route.ts")
const summaryModule = await load<{
  getNotificationCenter(user: unknown, locale: string, options?: { recordCountDrops?: boolean }): Promise<unknown>
}>("src/lib/notification-summary.ts")
const { NextRequest } = await import("next/server") as unknown as { NextRequest: typeof Request }

const calls = (name: string) => state.calls.filter((c) => c.call === name).map((c) => c.args)
const WAITING_KEYS = ["approvalInbox", "openRepairs", "stuckRepairs", "duePm", "pendingAuditFindings", "openAuditActions", "auditActionsDueSoon", "pendingDisposals", "approvedDisposals", "returnsDueSoon", "warrantyExpiringSoon", "licenseExpiringSoon"]
const stateRow = (key: string, isRead: boolean, lastCount: number, snoozedUntil: string | null = null) =>
  ({ key, isRead, lastCount, snoozedUntil, assignedToUserId: null })
const getSummary = () => route.GET(new NextRequest("http://localhost/api/notifications?locale=th"))

beforeEach(() => {
  state.inbox = { total: 2, audit: 0, disposal: 0 }
  state.counts = {}
  state.states = []
  state.calls = []
})

test("the summary reads every counted key's state and records each drop once, guarded (menu B shell task 2)", async () => {
  state.states = [stateRow("approvalInbox", true, 3), stateRow("duePm", true, 1), stateRow("licenseExpiringSoon", true, 0)]
  const response = await getSummary()
  assert.equal(response.status, 200)
  const body = await response.json()
  assert.equal(body.total, 0)
  assert.deepEqual(body.items, [{ key: "approvalInbox", count: 2, href: "/th/admin/approvals", tone: "danger", isRead: true, isSnoozed: false, isSuppressed: true }])
  assert.equal(typeof body.generatedAt, "string")
  assert.deepEqual(calls("notificationUserState.findMany")[0].where, { userId: "user-1", key: { in: WAITING_KEYS } })
  assert.deepEqual(calls("notificationUserState.updateMany"), [
    { where: { userId: "user-1", key: "approvalInbox", lastCount: { gt: 2 } }, data: { lastCount: 2 } },
    { where: { userId: "user-1", key: "duePm", lastCount: { gt: 0 } }, data: { lastCount: 0 } },
  ])

  state.calls = []
  state.states = [stateRow("approvalInbox", true, 2)]
  await getSummary()
  assert.deepEqual(calls("notificationUserState.updateMany"), [])

  state.calls = []
  state.states = []
  state.inbox = { total: 0, audit: 0, disposal: 0 }
  await getSummary()
  assert.equal(calls("notificationUserState.findMany").length, 1)
})

test("getNotificationCenter records no drop when asked not to, and the digest's dry run asks (menu B shell task 2)", async () => {
  state.states = [stateRow("approvalInbox", true, 3)]
  await summaryModule.getNotificationCenter({ id: "user-1", roles: [], permissions: [], employeeId: null }, "th", { recordCountDrops: false })
  assert.deepEqual(calls("notificationUserState.updateMany"), [])
  assert.match(read("src/lib/notification-digest.ts"), /getNotificationCenter\(user, locale, \{ recordCountDrops: !dryRun \}\)/)
})

test("read_all marks every row not yet read at the server's own count and answers the recomputed summary (menu B shell task 2)", async () => {
  state.counts = { maintenancePlan: 1, assetReturns: 1 }
  state.states = [stateRow("duePm", true, 1), stateRow("returnsDueSoon", false, 1, "2099-01-01T00:00:00.000Z")]
  const patch = () => route.PATCH(new NextRequest("http://localhost/api/notifications?locale=th", {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action: "read_all", key: "approvalInbox", count: 99 }),
  }))
  const response = await patch()
  assert.equal(response.status, 200)
  assert.deepEqual(calls("notificationUserState.upsert"), [
    {
      where: { userId_key: { userId: "user-1", key: "approvalInbox" } },
      create: { userId: "user-1", key: "approvalInbox", isRead: true, lastCount: 2, snoozedUntil: null },
      update: { isRead: true, lastCount: 2, snoozedUntil: null },
    },
    {
      where: { userId_key: { userId: "user-1", key: "returnsDueSoon" } },
      create: { userId: "user-1", key: "returnsDueSoon", isRead: true, lastCount: 1, snoozedUntil: null },
      update: { isRead: true, lastCount: 1, snoozedUntil: null },
    },
  ])
  const body = await response.json()
  assert.equal(body.ok, true)
  assert.equal(body.summary.total, 0)
  assert.ok(body.summary.items.every((item: { isRead: boolean }) => item.isRead))

  state.calls = []
  const again = await patch()
  assert.equal(again.status, 200)
  assert.deepEqual(calls("notificationUserState.upsert"), [])
  assert.equal((await again.json()).ok, true)
})
