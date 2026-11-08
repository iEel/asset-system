// Group 12 plan 5 task 1 (spec §11, §15 items 1–3): the server never clears the bind password, never sends the stored
// one to a new LDAP host, and an LDAP apply refuses when the deactivation count differs from the confirmed preview.
import assert from "node:assert/strict"
import { existsSync } from "node:fs"
import * as nodeModule from "node:module"
import { beforeEach, test } from "node:test"
import { pathToFileURL } from "node:url"

type GuardState = {
  profiles: Array<{ code: string; username: string; displayName: string; email: string | null; position: string | null }>
  employees: Array<{ id: string; code: string; fullNameTh: string; email: string | null; position: string | null; isActive: boolean; employmentStatus: string }>
  writes: string[]
}

const state: GuardState = { profiles: [], employees: [], writes: [] }
Object.assign(globalThis, { __settingsSecretGuardState: state })

const mockedModuleSources = new Map<string, string>([
  ["@/lib/ldap-auth", `
    export async function searchLdapSyncUsers() { return globalThis.__settingsSecretGuardState.profiles.map((p) => ({ ...p })) }
  `],
  ["@/lib/audit-log", `
    export async function logAudit() { globalThis.__settingsSecretGuardState.writes.push("audit") }
  `],
  ["@/lib/db", `
    const state = () => globalThis.__settingsSecretGuardState
    const write = (name) => async () => { state().writes.push(name); return { count: 0 } }
    export const prisma = {
      systemSetting: { findMany: async () => [] },
      company: { findMany: async () => [] },
      branch: { findMany: async () => [] },
      department: { findMany: async () => [] },
      employee: {
        findMany: async () => state().employees.map((e) => ({ ...e })),
        create: write("employee.create"),
        update: write("employee.update"),
      },
      asset: { findMany: async () => [] },
      user: { findMany: async () => [], updateMany: write("user.updateMany") },
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

const secrets = await import(pathToFileURL("src/lib/system-setting-secrets.ts").href) as typeof import("../src/lib/system-setting-secrets.ts")
const ldapSync = await import(pathToFileURL("src/lib/ldap-sync.ts").href) as typeof import("../src/lib/ldap-sync.ts")

const stored = {
  ldap_url: "ldap://10.0.0.2:389",
  ldap_bind_dn: "CN=svc-ldap,DC=corp,DC=local",
  ldap_bind_password: "Real-AD-Password",
}

const syncSettings = { ldap_sync_enabled: "true", ldap_sync_deactivate_missing: "true" }

function employee(code: string) {
  return { id: `emp-${code}`, code, fullNameTh: `Name ${code}`, email: null, position: null, isActive: true, employmentStatus: "active" }
}
function profile(code: string) {
  return { code, username: code.toLowerCase(), displayName: `Name ${code}`, email: null, position: null }
}

beforeEach(() => {
  // E1 stays in LDAP, E2 and E3 are missing: the fresh preview deactivates two.
  state.profiles = [profile("E1")]
  state.employees = [employee("E1"), employee("E2"), employee("E3")]
  state.writes = []
})

test("dropEmptySecretSettings removes an empty bind password and keeps everything else", () => {
  const submitted = [
    { key: "company_name", value: "" },
    { key: "ldap_bind_password", value: "" },
    { key: "ldap_url", value: "ldap://10.0.0.2:389" },
  ]
  assert.deepEqual(secrets.dropEmptySecretSettings(submitted), [
    { key: "company_name", value: "" },
    { key: "ldap_url", value: "ldap://10.0.0.2:389" },
  ])
  assert.deepEqual(secrets.dropEmptySecretSettings([{ key: "ldap_bind_password", value: "typed" }]), [
    { key: "ldap_bind_password", value: "typed" },
  ])
})

test("ldapEndpointChangeNeedsPassword asks for a password only when the URL or Bind DN changes without one", () => {
  const needs = (changed: Record<string, string>) => secrets.ldapEndpointChangeNeedsPassword({ changed, stored })
  assert.equal(needs({ ldap_url: "ldap://new.example:389", ldap_bind_password: "__STORED_SECRET__" }), true)
  assert.equal(needs({ ldap_url: "ldap://new.example:389" }), true)
  assert.equal(needs({ ldap_bind_dn: "CN=other,DC=corp,DC=local", ldap_bind_password: "__STORED_SECRET__" }), true)
  assert.equal(needs({ ldap_url: "ldap://new.example:389", ldap_bind_password: "New-Password" }), false)
  assert.equal(needs({ ldap_url: stored.ldap_url, ldap_bind_dn: stored.ldap_bind_dn, ldap_bind_password: "__STORED_SECRET__" }), false)
  assert.equal(needs({ company_name: "Sonic" }), false)
})

test("apply refuses a changed deactivation count, with no writes", async () => {
  await assert.rejects(
    ldapSync.applyLdapSync("admin-1", syncSettings, { expectedDeactivations: 1 }),
    (error: unknown) => error instanceof ldapSync.LdapSyncChangedError && error.message === "LDAP sync result changed",
  )
  assert.deepEqual(state.writes, [])
})

test("apply with the matching count runs", async () => {
  const result = await ldapSync.applyLdapSync("admin-1", syncSettings, { expectedDeactivations: 2 })
  assert.equal(result.applied.deactivated, 2)
  assert.ok(state.writes.includes("employee.update"))
  assert.ok(state.writes.includes("audit"))
})

test("apply without an expected count keeps today's behaviour (the scheduled path)", async () => {
  const result = await ldapSync.applyLdapSync("system:ldap", { ...syncSettings, ldap_sync_max_scheduled_deactivations: "10" }, { source: "scheduled" })
  assert.equal(result.applied.deactivated, 2)
})
