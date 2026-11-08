import assert from "node:assert/strict"
import { existsSync } from "node:fs"
import * as nodeModule from "node:module"
import { beforeEach, test } from "node:test"
import { pathToFileURL } from "node:url"

type LdapSyncRouteState = {
  actor: { id: string; roles: string[]; permissions: string[]; employeeId: string | null }
  calls: string[]
  applyOptions: unknown[]
  applyThrowsChanged: boolean
  settings: Record<string, string>
}

const state: LdapSyncRouteState = { actor: { id: "", roles: [], permissions: [], employeeId: null }, calls: [], applyOptions: [], applyThrowsChanged: false, settings: {} }
Object.assign(globalThis, { __ldapSyncRouteState: state })

const mockedModuleSources = new Map<string, string>([
  ["next/server", `
    export class NextRequest extends Request {}
    export class NextResponse extends Response {
      static json(body, init) { return Response.json(body, init) }
    }
  `],
  ["@/lib/auth-utils", `
    const state = () => globalThis.__ldapSyncRouteState
    export async function requireAuth() { return state().actor }
    export function hasRole(user, role) { return user.roles.includes(role) }
    export function hasPermission(user, module, action) {
      return user.roles.includes("system_admin") || user.permissions.includes(module + ":" + action)
    }
    export function requirePermission(user, module, action) {
      if (!hasPermission(user, module, action)) throw new Error("Forbidden: insufficient permissions")
    }
  `],
  ["@/lib/ldap-sync", `
    const state = () => globalThis.__ldapSyncRouteState
    export class LdapSyncChangedError extends Error {
      constructor() { super("LDAP sync result changed"); this.name = "LdapSyncChangedError" }
    }
    export async function loadLdapSettings() { return { ...state().settings } }
    export async function previewLdapSync() { state().calls.push("preview"); return { mode: "preview" } }
    export async function applyLdapSync(userId, settings, options) {
      state().calls.push("apply")
      state().applyOptions.push(options)
      if (state().applyThrowsChanged) throw new LdapSyncChangedError()
      return { mode: "apply" }
    }
  `],
  ["@/lib/db", `export const prisma = { systemSetting: { findMany: async () => [], upsert: async () => ({}) }, $transaction: async (operations) => Promise.all(operations) }`],
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

const route = await import(pathToFileURL("src/app/api/admin/settings/ldap-sync/route.ts").href) as {
  POST(request: Request): Promise<Response>
}

function syncRequest(action: string, extra: Record<string, unknown> = {}, headers: Record<string, string> = {}) {
  return new Request("http://localhost/api/admin/settings/ldap-sync", {
    method: "POST",
    headers: { "Content-Type": "application/json", ...headers },
    body: JSON.stringify({ action, ...extra }),
  })
}

const systemAdmin = { id: "admin-1", roles: ["system_admin"], permissions: [], employeeId: null }

const settingsEditor = { id: "reviewer-1", roles: ["data_quality_reviewer"], permissions: ["setting:view", "setting:edit"], employeeId: null }

beforeEach(() => {
  state.actor = settingsEditor
  state.calls = []
  state.applyOptions = []
  state.applyThrowsChanged = false
  state.settings = {}
})

test("a settings editor can preview an LDAP sync", async () => {
  const response = await route.POST(syncRequest("preview"))

  assert.equal(response.status, 200)
  assert.deepEqual(state.calls, ["preview"])
})

test("only a system administrator can apply an LDAP sync from the web", async () => {
  const forbidden = await route.POST(syncRequest("apply"))
  assert.equal(forbidden.status, 403)
  assert.deepEqual(state.calls, [])

  state.actor = systemAdmin
  const allowed = await route.POST(syncRequest("apply", { expectedDeactivations: 0 }))
  assert.equal(allowed.status, 200)
  assert.deepEqual(state.calls, ["apply"])
})

// Group 12 plan 5 task 1 (spec §15 item 1): apply carries the deactivation count of the preview the user confirmed.
test("apply without a confirmed count is refused", async () => {
  state.actor = systemAdmin
  for (const extra of [{}, { expectedDeactivations: "2" }, { expectedDeactivations: null }, { expectedDeactivations: -1 }, { expectedDeactivations: 1.5 }]) {
    const response = await route.POST(syncRequest("apply", extra))
    assert.deepEqual([response.status, await response.json()], [400, { error: "Preview required before apply" }], JSON.stringify(extra))
  }
  assert.deepEqual(state.calls, [])
})

test("apply refuses a changed deactivation count", async () => {
  state.actor = systemAdmin
  state.applyThrowsChanged = true
  const response = await route.POST(syncRequest("apply", { expectedDeactivations: 3 }))
  assert.deepEqual([response.status, await response.json()], [409, { error: "LDAP sync result changed" }])
  assert.deepEqual(state.applyOptions, [{ expectedDeactivations: 3 }])
})

test("apply with the matching count runs", async () => {
  state.actor = systemAdmin
  const response = await route.POST(syncRequest("apply", { expectedDeactivations: 2 }))
  assert.deepEqual([response.status, await response.json()], [200, { mode: "apply" }])
  assert.deepEqual(state.applyOptions, [{ expectedDeactivations: 2 }])
})

test("scheduled apply is unchanged", async () => {
  const previousToken = process.env.LDAP_SYNC_TOKEN
  process.env.LDAP_SYNC_TOKEN = "scheduler-test-token"
  try {
    state.settings = { ldap_sync_enabled: "true", ldap_sync_mode: "scheduled", ldap_sync_schedule: "* * * * *" }
    const response = await route.POST(syncRequest("scheduled", {}, { authorization: "Bearer scheduler-test-token" }))
    const body = await response.json() as { status: string }
    assert.equal(response.status, 200)
    assert.equal(body.status, "ran")
    assert.deepEqual(state.applyOptions, [{ source: "scheduled" }])
  } finally {
    if (previousToken === undefined) delete process.env.LDAP_SYNC_TOKEN
    else process.env.LDAP_SYNC_TOKEN = previousToken
  }
})
