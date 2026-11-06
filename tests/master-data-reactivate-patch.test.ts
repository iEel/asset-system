import assert from "node:assert/strict"
import { existsSync, readFileSync } from "node:fs"
import * as nodeModule from "node:module"
import test from "node:test"
import { pathToFileURL } from "node:url"

// Group 8 plan 1 final review: เปิดใช้งาน on the companies, branches and departments lists sends PATCH { isActive: true }
// to /api/{companies,branches,departments}/[id] (<module>:edit), which sets isActive and updatedBy only and logs an
// "update" entry with the old and new isActive, so a list rendered before someone else's edit cannot overwrite it. A
// branch or a department whose company is inactive is refused (409) with getReactivateBlockedByCompanyReason, by the
// PATCH and by the PUT that ticks ใช้งาน again; a department with no company is not. Route modules import next/server and
// "@/…", which node --test cannot load, so a resolve hook serves stand-ins (as in tests/master-data-deactivate-log.test.ts).
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
    export function requirePermission(_user, module, action) { (globalThis.__reactivatePermissions ??= []).push(module + ":" + action) }
  `],
  ["@/lib/audit-log", `export async function logAudit(params) { (globalThis.__reactivateLogs ??= []).push(params) }`],
  ["@/lib/db", `
    const call = (model, method) => (...args) => {
      const handler = globalThis.__reactivateDb?.[model]?.[method]
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

type Handler = (request: Request, context: { params: Promise<{ id: string }> }) => Promise<Response>
type Route = { PATCH: Handler; PUT: Handler }
type AuditEntry = { action: string; module: string; recordId: string; oldValue: unknown; newValue: unknown }
const globals = globalThis as unknown as { __reactivateDb: unknown; __reactivateLogs: AuditEntry[]; __reactivatePermissions: string[] }
const load = <T>(path: string) => import(pathToFileURL(path).href) as Promise<T>
const request = (method: string, body: unknown) =>
  new Request("http://asset.local/api", { method, headers: { "content-type": "application/json" }, body: JSON.stringify(body) })
const params = (id: string) => ({ params: Promise.resolve({ id }) })
const read = (path: string) => readFileSync(path, "utf8").replace(/\r\n/g, "\n")

const cases = [
  { dir: "companies", model: "company", module: "company", record: "company" as const },
  { dir: "branches", model: "branch", module: "branch", record: "branch" as const },
  { dir: "departments", model: "department", module: "department", record: "department" as const },
  // Group 8 plan 2 Task 1: เปิดใช้งาน on the categories list, as the others (a category has no company to check).
  { dir: "categories", model: "assetCategory", module: "category", record: "category" as const },
  // Group 8 plan 3 Task 1: เปิดใช้งาน on the suppliers list, as the categories (a supplier has no company to check).
  { dir: "suppliers", model: "supplier", module: "supplier", record: "supplier" as const },
]

// The stored record (inactive unless said), its company, and what the route writes.
function stub(model: string, stored: { isActive: boolean; company?: { nameTh: string; isActive: boolean } | null }) {
  const updates: Array<{ where: unknown; data: Record<string, unknown> }> = []
  globals.__reactivateLogs = []
  globals.__reactivatePermissions = []
  globals.__reactivateDb = {
    // The PUT reads the chosen company; the PATCH reads it through the record's include.
    company: { findFirst: () => stored.company ?? null },
    [model]: {
      findFirst: (args: { where: Record<string, unknown> }) =>
        args.where.code ? null : { id: "row-1", code: "OLD", isActive: stored.isActive, company: stored.company, _count: {} },
      update: (args: { where: unknown; data: Record<string, unknown> }) => {
        updates.push(args)
        return { id: "row-1", isActive: true }
      },
    },
  }
  return updates
}

test("PATCH { isActive: true } sets isActive (and updatedBy) only, with <module>:edit, and logs an update entry of isActive (final review)", async () => {
  const { getReactivateBlockedByCompanyReason } = await load<typeof import("../src/lib/organization-master-query.ts")>("src/lib/organization-master-query.ts")
  assert.ok(getReactivateBlockedByCompanyReason)
  for (const item of cases) {
    const { PATCH } = await load<Route>(`src/app/api/${item.dir}/[id]/route.ts`)
    const updates = stub(item.model, { isActive: false, company: { nameTh: "บริษัท ก", isActive: true } })
    const response = await PATCH(request("PATCH", { isActive: true }), params("row-1"))
    assert.equal(response.status, 200, item.dir)
    assert.deepEqual(globals.__reactivatePermissions, [`${item.module}:edit`], `${item.dir}: <module>:edit`)
    assert.deepEqual(updates, [{ where: { id: "row-1" }, data: { isActive: true, updatedBy: "actor-1" } }], `${item.dir}: nothing else written`)
    assert.deepEqual(
      globals.__reactivateLogs.map(({ action, module, recordId, oldValue, newValue }) => ({ action, module, recordId, oldValue, newValue })),
      [{ action: "update", module: item.module, recordId: "row-1", oldValue: { isActive: false }, newValue: { isActive: true } }],
      `${item.dir}: one update entry of isActive`
    )
  }
})

test("PATCH accepts only { isActive: true }: any other field or false is refused (400) and nothing is written (final review)", async () => {
  for (const item of cases) {
    const { PATCH } = await load<Route>(`src/app/api/${item.dir}/[id]/route.ts`)
    for (const body of [{ isActive: false }, { isActive: true, code: "NEW" }, {}]) {
      const updates = stub(item.model, { isActive: false, company: null })
      const response = await PATCH(request("PATCH", body), params("row-1"))
      assert.equal(response.status, 400, `${item.dir}: ${JSON.stringify(body)}`)
      assert.equal(updates.length, 0, `${item.dir}: ${JSON.stringify(body)} wrote`)
      assert.equal(globals.__reactivateLogs.length, 0)
    }
  }
})

test("PATCH: a missing record is 404; an active record is answered as it is, with nothing written (final review)", async () => {
  for (const item of cases) {
    const { PATCH } = await load<Route>(`src/app/api/${item.dir}/[id]/route.ts`)
    const updates = stub(item.model, { isActive: true, company: null })
    const response = await PATCH(request("PATCH", { isActive: true }), params("row-1"))
    assert.equal(response.status, 200, item.dir)
    assert.equal(updates.length, 0, `${item.dir}: an active record is not written again`)
    assert.equal(globals.__reactivateLogs.length, 0)

    globals.__reactivateDb = { [item.model]: { findFirst: () => null } }
    assert.equal((await PATCH(request("PATCH", { isActive: true }), params("row-1"))).status, 404, item.dir)
  }
})

test("a branch or a department whose company is inactive cannot come back, by PATCH or by the PUT that ticks ใช้งาน; a department with no company can (final review)", async () => {
  const { getReactivateBlockedByCompanyReason } = await load<typeof import("../src/lib/organization-master-query.ts")>("src/lib/organization-master-query.ts")
  const inactiveCompany = { nameTh: "บริษัท ก", isActive: false }
  const putBodies = {
    branch: { code: "BKK", name: "Bangkok", companyId: "c1", address: "", contactPerson: "", isActive: true },
    department: { code: "D1", name: "IT", companyId: "c1", isActive: true },
  }
  for (const item of cases.filter((entry) => entry.record === "branch" || entry.record === "department")) {
    const record = item.record as "branch" | "department"
    const reason = getReactivateBlockedByCompanyReason(record, inactiveCompany)
    assert.ok(reason)
    const route = await load<Route>(`src/app/api/${item.dir}/[id]/route.ts`)

    let updates = stub(item.model, { isActive: false, company: inactiveCompany })
    const patched = await route.PATCH(request("PATCH", { isActive: true }), params("row-1"))
    assert.equal(patched.status, 409, `${item.dir}: PATCH`)
    assert.deepEqual(await patched.json(), { error: reason })
    assert.equal(updates.length, 0)

    updates = stub(item.model, { isActive: false, company: inactiveCompany })
    const put = await route.PUT(request("PUT", putBodies[record]), params("row-1"))
    assert.equal(put.status, 409, `${item.dir}: PUT false → true`)
    assert.deepEqual(await put.json(), { error: reason })
    assert.equal(updates.length, 0)
  }

  // แผนกกลาง: no company, so it comes back.
  const { PATCH } = await load<Route>("src/app/api/departments/[id]/route.ts")
  const updates = stub("department", { isActive: false, company: null })
  assert.equal((await PATCH(request("PATCH", { isActive: true }), params("row-1"))).status, 200)
  assert.equal(updates.length, 1)
})

test("the categories PATCH reads no company: an inactive category comes back with category:edit (group 8 plan 2 Task 1)", () => {
  const source = read("src/app/api/categories/[id]/route.ts")
  const patch = source.slice(source.indexOf("export async function PATCH"), source.indexOf("export async function DELETE"))
  assert.match(patch, /requirePermission\(user, "category", "edit"\)/)
  assert.doesNotMatch(patch, /company/)
})

test("the PATCH handlers read the shared schema and the reason helper (final review)", () => {
  assert.match(read("src/lib/validations/master-data-reactivate.ts"), /export const masterDataReactivateSchema = z\.object\(\{ isActive: z\.literal\(true\) \}\)\.strict\(\)/)
  for (const item of cases) {
    const source = read(`src/app/api/${item.dir}/[id]/route.ts`)
    assert.match(source, /export async function PATCH\(request: NextRequest, context: \w+RouteContext\)/, item.dir)
    assert.match(source, /masterDataReactivateSchema\.parse\(await request\.json\(\)\)/, item.dir)
    if (item.record === "branch" || item.record === "department") {
      assert.match(source, new RegExp(`getReactivateBlockedByCompanyReason\\("${item.record}", existing\\.company\\)`), item.dir)
      assert.match(source, new RegExp(`getReactivateBlockedByCompanyReason\\("${item.record}", company\\)`), `${item.dir}: the PUT`)
    }
  }
})
