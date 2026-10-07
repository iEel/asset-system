import assert from "node:assert/strict"
import { existsSync } from "node:fs"
import * as nodeModule from "node:module"
import { beforeEach, test } from "node:test"
import { pathToFileURL } from "node:url"

type LdapSyncRouteState = {
  actor: { id: string; roles: string[]; permissions: string[]; employeeId: string | null }
  calls: string[]
}

const state: LdapSyncRouteState = { actor: { id: "", roles: [], permissions: [], employeeId: null }, calls: [] }
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
    export async function loadLdapSettings() { return {} }
    export async function previewLdapSync() { state().calls.push("preview"); return { mode: "preview" } }
    export async function applyLdapSync() { state().calls.push("apply"); return { mode: "apply" } }
  `],
  ["@/lib/db", `export const prisma = { systemSetting: { findMany: async () => [], upsert: async () => ({}) } }`],
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

function syncRequest(action: string) {
  return new Request("http://localhost/api/admin/settings/ldap-sync", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action }),
  })
}

const settingsEditor = { id: "reviewer-1", roles: ["data_quality_reviewer"], permissions: ["setting:view", "setting:edit"], employeeId: null }

beforeEach(() => {
  state.actor = settingsEditor
  state.calls = []
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

  state.actor = { id: "admin-1", roles: ["system_admin"], permissions: [], employeeId: null }
  const allowed = await route.POST(syncRequest("apply"))
  assert.equal(allowed.status, 200)
  assert.deepEqual(state.calls, ["apply"])
})
