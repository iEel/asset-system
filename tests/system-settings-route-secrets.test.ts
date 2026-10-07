import assert from "node:assert/strict"
import { existsSync } from "node:fs"
import * as nodeModule from "node:module"
import { beforeEach, test } from "node:test"
import { pathToFileURL } from "node:url"

type SettingsRouteState = {
  actor: { id: string; roles: string[]; permissions: string[]; employeeId: string | null }
  stored: Array<{ id: string; key: string; value: string; description: string | null; updatedAt: Date; updatedBy: string | null }>
  upserts: Array<{ key: string; value: string }>
  auditLogs: Array<{ oldValue?: Record<string, unknown>; newValue?: Record<string, unknown> }>
  ldapTestCalls: Array<Record<string, string>>
}

const state: SettingsRouteState = createState()

function createState(): SettingsRouteState {
  return {
    actor: { id: "admin-1", roles: ["system_admin"], permissions: [], employeeId: null },
    stored: [],
    upserts: [],
    auditLogs: [],
    ldapTestCalls: [],
  }
}

Object.assign(globalThis, { __settingsRouteState: state })

const mockedModuleSources = new Map<string, string>([
  ["next/server", `
    export class NextRequest extends Request {}
    export class NextResponse extends Response {
      static json(body, init) { return Response.json(body, init) }
    }
  `],
  ["@/lib/auth-utils", `
    const state = () => globalThis.__settingsRouteState
    export async function requireAuth() { return state().actor }
    export function hasRole(user, role) { return user.roles.includes(role) }
    export function hasPermission(user, module, action) {
      return user.roles.includes("system_admin") || user.permissions.includes(module + ":" + action)
    }
    export function requirePermission(user, module, action) {
      if (!hasPermission(user, module, action)) throw new Error("Forbidden: insufficient permissions")
    }
  `],
  ["@/lib/audit-log", `
    export async function logAudit(params) { globalThis.__settingsRouteState.auditLogs.push(params) }
  `],
  ["@/lib/ldap-auth", `
    export async function testLdapConnection(settings) {
      globalThis.__settingsRouteState.ldapTestCalls.push(settings)
      return { ok: true, message: "ok" }
    }
  `],
  ["@/lib/db", `
    const state = () => globalThis.__settingsRouteState
    export const prisma = {
      systemSetting: {
        findMany: async (args) => {
          const keys = args?.where?.key?.in
          return state().stored.filter((row) => !keys || keys.includes(row.key)).map((row) => ({ ...row }))
        },
        upsert: (args) => {
          state().upserts.push({ key: args.where.key, value: args.update.value })
          return Promise.resolve({})
        },
      },
      $transaction: async (operations) => Promise.all(operations),
    }
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

const settingsRoute = await import(pathToFileURL("src/app/api/admin/settings/route.ts").href) as {
  GET(): Promise<Response>
  PUT(request: Request): Promise<Response>
}
const ldapTestRoute = await import(pathToFileURL("src/app/api/admin/settings/ldap-test/route.ts").href) as {
  POST(request: Request): Promise<Response>
}

function storedSetting(key: string, value: string) {
  return { id: key, key, value, description: null, updatedAt: new Date("2026-10-01T00:00:00Z"), updatedBy: null }
}

function jsonRequest(url: string, method: string, body: unknown) {
  return new Request(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) })
}

beforeEach(() => {
  Object.assign(state, createState())
  state.stored = [
    storedSetting("company_name", "Sonic"),
    storedSetting("ldap_bind_dn", "CN=svc-ldap,DC=corp,DC=local"),
    storedSetting("ldap_bind_password", "Real-AD-Password"),
    storedSetting("ldap_url", "ldap://10.0.0.2:389"),
  ]
})

test("settings API never returns the stored LDAP bind password", async () => {
  const response = await settingsRoute.GET()
  const settings = await response.json() as Array<{ key: string; value: string }>

  assert.equal(response.status, 200)
  const bindPassword = settings.find((setting) => setting.key === "ldap_bind_password")
  assert.equal(bindPassword?.value, "__STORED_SECRET__")
  assert.equal(JSON.stringify(settings).includes("Real-AD-Password"), false)
})

test("saving the form with the placeholder keeps the stored bind password untouched", async () => {
  const response = await settingsRoute.PUT(jsonRequest("http://localhost/api/admin/settings", "PUT", {
    settings: [
      { key: "company_name", value: "Sonic Logistics" },
      { key: "ldap_bind_password", value: "__STORED_SECRET__" },
    ],
  }))

  assert.equal(response.status, 200)
  assert.deepEqual(state.upserts, [{ key: "company_name", value: "Sonic Logistics" }])
})

test("changing the bind password stores it but writes only a redacted value to the system log", async () => {
  const response = await settingsRoute.PUT(jsonRequest("http://localhost/api/admin/settings", "PUT", {
    settings: [{ key: "ldap_bind_password", value: "New-AD-Password" }],
  }))

  assert.equal(response.status, 200)
  assert.deepEqual(state.upserts, [{ key: "ldap_bind_password", value: "New-AD-Password" }])
  assert.equal(JSON.stringify(state.auditLogs).includes("New-AD-Password"), false)
  assert.equal(JSON.stringify(state.auditLogs).includes("Real-AD-Password"), false)
})

test("a non-admin with setting:edit cannot repoint LDAP", async () => {
  state.actor = { id: "reviewer-1", roles: ["data_quality_reviewer"], permissions: ["setting:view", "setting:edit"], employeeId: null }

  const response = await settingsRoute.PUT(jsonRequest("http://localhost/api/admin/settings", "PUT", {
    settings: [{ key: "ldap_url", value: "ldap://attacker.example:389" }],
  }))

  assert.equal(response.status, 403)
  assert.deepEqual(state.upserts, [])
})

test("a non-admin with setting:edit can still save non-LDAP settings while LDAP values are echoed back unchanged", async () => {
  state.actor = { id: "reviewer-1", roles: ["data_quality_reviewer"], permissions: ["setting:view", "setting:edit"], employeeId: null }

  const response = await settingsRoute.PUT(jsonRequest("http://localhost/api/admin/settings", "PUT", {
    settings: [
      { key: "company_name", value: "Sonic Logistics" },
      { key: "ldap_url", value: "ldap://10.0.0.2:389" },
      { key: "ldap_bind_password", value: "__STORED_SECRET__" },
    ],
  }))

  assert.equal(response.status, 200)
  assert.deepEqual(state.upserts, [{ key: "company_name", value: "Sonic Logistics" }])
})

test("LDAP connection test is restricted to system administrators", async () => {
  state.actor = { id: "reviewer-1", roles: ["data_quality_reviewer"], permissions: ["setting:view", "setting:edit"], employeeId: null }

  const response = await ldapTestRoute.POST(jsonRequest("http://localhost/api/admin/settings/ldap-test", "POST", {
    settings: [{ key: "ldap_url", value: "ldap://attacker.example:389" }],
  }))

  assert.equal(response.status, 403)
  assert.deepEqual(state.ldapTestCalls, [])
})

test("LDAP connection test never sends the stored password to a different server", async () => {
  const response = await ldapTestRoute.POST(jsonRequest("http://localhost/api/admin/settings/ldap-test", "POST", {
    settings: [
      { key: "ldap_url", value: "ldap://attacker.example:389" },
      { key: "ldap_bind_dn", value: "CN=svc-ldap,DC=corp,DC=local" },
      { key: "ldap_bind_password", value: "__STORED_SECRET__" },
    ],
  }))

  assert.equal(response.status, 400)
  assert.deepEqual(state.ldapTestCalls, [])
})

test("LDAP connection test uses the stored password for the stored server", async () => {
  const response = await ldapTestRoute.POST(jsonRequest("http://localhost/api/admin/settings/ldap-test", "POST", {
    settings: [
      { key: "ldap_url", value: "ldap://10.0.0.2:389" },
      { key: "ldap_bind_dn", value: "CN=svc-ldap,DC=corp,DC=local" },
      { key: "ldap_bind_password", value: "__STORED_SECRET__" },
    ],
  }))

  assert.equal(response.status, 200)
  assert.equal(state.ldapTestCalls.length, 1)
  assert.equal(state.ldapTestCalls[0].ldap_bind_password, "Real-AD-Password")
})
