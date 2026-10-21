import assert from "node:assert/strict"
import { existsSync, readFileSync } from "node:fs"
import * as nodeModule from "node:module"
import test from "node:test"
import { pathToFileURL } from "node:url"

// User decision 2026-10-21 (Y4): while LDAP sync is on, the sync owns every employee's "ใช้งาน" (it reactivates employees
// still in AD and, with "deactivate missing", turns off the rest). The edit form locks the box and says so; the PUT route
// refuses a change to it. With sync off, today's behaviour stays. Sources are read with LF endings.
const read = (path: string) => readFileSync(path, "utf8").replace(/\r\n/g, "\n")
const D = "src/app/[locale]/(dashboard)/master-data/employees/"

test("the employee edit form locks ใช้งาน while LDAP sync is on and says the status comes from AD; the create form does not", () => {
  const form = read("src/components/master-data/employee-form.tsx")
  assert.match(form, /activeLockedBySync = false,/, "the prop defaults to unlocked")
  assert.match(form, /activeLockedBySync\?: boolean/)
  assert.match(form, /<input\n\s+type="checkbox"\n\s+checked=\{values\.isActive\}\n\s+disabled=\{activeLockedBySync\}\n\s+aria-describedby=\{activeLockedBySync \? "employee-active-hint" : undefined\}/)
  assert.match(form, /\{activeLockedBySync \? <FieldHint id="employee-active-hint">\{t\("activeLockedBySyncHint"\)\}<\/FieldHint> : null\}/)
  assert.match(form, /import \{ Field, FieldHint \} from "@\/components\/ui\/field"/)

  const edit = read(`${D}[id]/edit/page.tsx`)
  assert.match(edit, /import \{ isLdapSyncEnabled \} from "@\/lib\/ldap-sync-enabled"/)
  assert.match(edit, /activeLockedBySync=\{activeLockedBySync\}/)
  assert.doesNotMatch(read(`${D}new/page.tsx`), /activeLockedBySync/, "a new employee starts active and stays editable")

  const th = JSON.parse(read("messages/th.json"))
  const en = JSON.parse(read("messages/en.json"))
  assert.equal(th.employee.activeLockedBySyncHint, "สถานะนี้มาจาก AD: ปิดหรือเปิดบัญชีใน AD แล้วรอซิงก์")
  assert.equal(en.employee.activeLockedBySyncHint, "This status comes from AD: disable or enable the account in AD, then wait for the sync")
  assert.equal(th.apiErrors.employeeActiveFromAd, th.employee.activeLockedBySyncHint)
  assert.equal(en.apiErrors.employeeActiveFromAd, en.employee.activeLockedBySyncHint)
})

// Route modules import next/server and "@/…", which node --test cannot load, so a resolve hook serves stand-ins (as in
// tests/master-data-record-status.test.ts). The prisma stand-in calls globalThis.__ldapLock[model][method]; a call with no
// handler throws, so a test names every query its route makes.
const stubs = new Map<string, string>([
  ["next/server", `
    export class NextRequest extends Request {}
    export class NextResponse extends Response {
      static json(body, init) { return Response.json(body, init) }
    }
  `],
  ["@/lib/auth-utils", `
    export async function requireAuth() { return { id: "actor-1", roles: ["system_admin"], permissions: [], employeeId: null } }
    export function hasRole() { return true }
    export function hasPermission() { return true }
    export function requirePermission() {}
  `],
  ["@/lib/audit-log", `export async function logAudit() {}`],
  ["@/lib/db", `
    const call = (model, method) => (...args) => {
      const handler = globalThis.__ldapLock?.[model]?.[method]
      if (!handler) throw new Error("no stand-in for prisma." + model + "." + method)
      return handler(...args)
    }
    export const prisma = new Proxy({}, {
      get: (_, model) => model === "$transaction"
        ? async (work) => (typeof work === "function" ? work(prisma) : Promise.all(work))
        : new Proxy({}, { get: (_, method) => call(model, method) }),
    })
  `],
])
;(nodeModule as unknown as { registerHooks(hooks: { resolve(specifier: string, context: unknown, next: (specifier: string, context: unknown) => unknown): unknown }): void }).registerHooks({
  resolve(specifier, context, next) {
    const stub = stubs.get(specifier)
    if (stub !== undefined) return { url: `data:text/javascript;charset=utf-8,${encodeURIComponent(stub)}`, shortCircuit: true }
    if (specifier.startsWith("@/")) {
      const base = `src/${specifier.slice(2)}`
      const file = [`${base}.ts`, `${base}.tsx`, `${base}/index.ts`].find((candidate) => existsSync(candidate))
      if (file) return { url: pathToFileURL(file).href, shortCircuit: true }
    }
    return next(specifier, context)
  },
})
type Update = { PUT(request: Request, context: { params: Promise<{ id: string }> }): Promise<Response> }
const load = <T>(path: string) => import(pathToFileURL(path).href) as Promise<T>
const stubDb = (models: Record<string, unknown>) => {
  ;(globalThis as unknown as { __ldapLock: unknown }).__ldapLock = models
}
const put = (body: unknown) => new Request("http://asset.local/api", { method: "PUT", headers: { "content-type": "application/json" }, body: JSON.stringify(body) })
const params = (id: string) => ({ params: Promise.resolve({ id }) })

test("isLdapSyncEnabled reads the ldap_sync_enabled setting the sync job checks", async () => {
  const { isLdapSyncEnabled } = await load<typeof import("../src/lib/ldap-sync-enabled.ts")>("src/lib/ldap-sync-enabled.ts")
  const keys: unknown[] = []
  const withValue = (value: string | null) => stubDb({
    systemSetting: { findUnique: (args: { where: { key: string } }) => { keys.push(args.where.key); return value === null ? null : { value } } },
  })
  withValue("true")
  assert.equal(await isLdapSyncEnabled(), true)
  withValue("false")
  assert.equal(await isLdapSyncEnabled(), false)
  withValue(null)
  assert.equal(await isLdapSyncEnabled(), false)
  assert.deepEqual(keys, ["ldap_sync_enabled", "ldap_sync_enabled", "ldap_sync_enabled"])
})

test("the employee PUT refuses a change to ใช้งาน while LDAP sync is on, under the field; other edits and sync off save as today", async () => {
  const { PUT } = await load<Update>("src/app/api/employees/[id]/route.ts")
  const body = { code: "E1", fullNameTh: "สมชาย", fullNameEn: "", email: "", companyId: "c1", branchId: "b1", departmentId: "d1", position: "", employmentStatus: "active", managerId: "", isActive: true }
  const run = async (sync: boolean, stored: boolean, next: boolean, change: Record<string, unknown> = {}) => {
    const updates: unknown[] = []
    stubDb({
      employee: {
        findFirst: (args: { where: Record<string, unknown> }) => (args.where.code ? null : { id: "emp-1", isActive: stored, _count: { custodianAssets: 0, subordinates: 0, auditRounds: 0 } }),
        update: (args: unknown) => { updates.push(args); return { id: "emp-1" } },
      },
      user: { count: () => 0 },
      assetCheckout: { count: () => 0 },
      systemSetting: { findUnique: () => ({ value: sync ? "true" : "false" }) },
    })
    const response = await PUT(put({ ...body, ...change, isActive: next }), params("emp-1"))
    return { response, updates }
  }

  const refusal = { error: "Employee active status comes from AD while LDAP sync is on", fieldErrors: { isActive: "employeeActiveFromAd" } }
  for (const [stored, next] of [[true, false], [false, true]] as const) {
    const changed = await run(true, stored, next)
    assert.equal(changed.response.status, 400, `sync on, ${stored} -> ${next}: not refused`)
    assert.deepEqual(await changed.response.json(), refusal)
    assert.equal(changed.updates.length, 0, "written despite the refusal")
  }

  const other = await run(true, true, true, { position: "Engineer" })
  assert.equal(other.response.status, 200, "sync on: an edit that keeps ใช้งาน is refused")
  assert.equal(other.updates.length, 1)
  const inactiveOther = await run(true, false, false, { position: "Engineer" })
  assert.equal(inactiveOther.response.status, 200, "sync on: an inactive employee's other edits are refused")

  for (const [stored, next] of [[true, false], [false, true], [true, true]] as const) {
    const off = await run(false, stored, next)
    assert.equal(off.response.status, 200, `sync off, ${stored} -> ${next}: today's save is refused`)
    assert.equal(off.updates.length, 1)
  }

  const catalog = read("src/lib/api-error-catalog.ts")
  assert.match(catalog, /"Employee active status comes from AD while LDAP sync is on": "employeeActiveFromAd",/)
  const route = read("src/app/api/employees/[id]/route.ts")
  assert.ok(route.indexOf("isLdapSyncEnabled()") < route.indexOf("isDeactivation(existing.isActive"), "the sync check runs before the deactivation guard")
})
