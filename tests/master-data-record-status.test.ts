import assert from "node:assert/strict"
import { existsSync, readFileSync } from "node:fs"
import * as nodeModule from "node:module"
import test from "node:test"
import { pathToFileURL } from "node:url"

import {
  isDeactivation,
  parseRecordStatus,
  recordStatusFilters,
  recordStatusWhere,
  setRecordStatusParam,
} from "../src/lib/master-data-query.ts"

// Functional fix batch Task 9 (critique 2026-10-20 E1, ruling 11): "ไม่ใช้งาน" is a recycle bin. Every master-data list
// filters by status (ใช้งาน by default), the badge reads the real value, an inactive record opens and saves (ticking
// "ใช้งาน" brings it back), and unticking "ใช้งาน" is refused whenever "ลบ" would be. Sources are read with LF endings.
const read = (path: string) => readFileSync(path, "utf8").replace(/\r\n/g, "\n")
const D = "src/app/[locale]/(dashboard)/master-data/"

test("the record status filter: ใช้งาน by default, the first value wins, and the default stays out of the URL", () => {
  assert.deepEqual([...recordStatusFilters], ["active", "inactive", "all"])
  assert.equal(parseRecordStatus(undefined), "active")
  assert.equal(parseRecordStatus(null), "active")
  assert.equal(parseRecordStatus("x"), "active")
  assert.equal(parseRecordStatus(["inactive"]), "inactive")
  assert.equal(parseRecordStatus(["all", "inactive"]), "all")
  assert.equal(parseRecordStatus("all"), "all")
  assert.equal(parseRecordStatus(3), "active")

  assert.deepEqual(recordStatusWhere("active"), { isActive: true })
  assert.deepEqual(recordStatusWhere("inactive"), { isActive: false })
  assert.deepEqual(recordStatusWhere("all"), {})

  assert.equal(setRecordStatusParam(new URLSearchParams(), "active").toString(), "")
  assert.equal(setRecordStatusParam(new URLSearchParams(), "inactive").toString(), "status=inactive")
  assert.equal(setRecordStatusParam(new URLSearchParams("page=1"), "all").toString(), "page=1&status=all")

  assert.equal(isDeactivation(true, false), true)
  assert.equal(isDeactivation(false, true), false)
  assert.equal(isDeactivation(false, false), false)
  assert.equal(isDeactivation(true, true), false)

  assert.doesNotMatch(read("src/lib/master-data-query.ts"), /^import /m, "a plain module: tests and pages load it")
})

const LIST_PAGES = ["companies", "branches", "departments", "locations", "categories", "brands", "employees"]
const LOADERS = [
  "companies/[id]/edit",
  "branches/[id]/edit",
  "departments/[id]/edit",
  "locations/[id]/edit",
  "categories/[id]/edit",
  "brands/models/[id]/edit",
  "brands/[id]/edit",
  "employees/[id]",
  "employees/[id]/edit",
  "suppliers/[id]",
  "suppliers/[id]/edit",
]
const PUT_ROUTES = ["companies", "branches", "departments", "locations", "categories", "brands", "models", "employees", "suppliers"]
const GUARDED_PUT_ROUTES = ["companies", "branches", "locations", "employees", "categories"]
const putSource = (dir: string) => {
  const source = read(`src/app/api/${dir}/[id]/route.ts`)
  const start = source.indexOf("export async function PUT")
  assert.ok(start >= 0, `${dir}: no PUT`)
  const end = source.indexOf("export async function", start + 1)
  return source.slice(start, end < 0 ? undefined : end)
}

test("inactive master data is reachable: a status filter, the real badge, inactive rows open and save, and no ลบ on them", () => {
  const realBadge = /<StatusBadge label=\{(\w+)\.isActive \? tCommon\("active"\) : tCommon\("inactive"\)\} tone=\{\1\.isActive \? "success" : "muted"\} \/>/
  for (const page of LIST_PAGES) {
    const source = read(`${D}${page}/page.tsx`)
    assert.doesNotMatch(source, /<StatusBadge label=\{tCommon\("active"\)\} tone="success" \/>/, `${page}: the badge is fixed`)
    assert.match(source, realBadge, `${page}: the badge reads isActive`)
    assert.match(source, /name="status"/, `${page}: no status filter`)
    assert.match(source, /deleteAction=\{\w+\.isActive \? \{ endpoint: `\/api\/[\w/]+\$\{\w+\.id\}` \} : undefined\}/, `${page}: ลบ shows on inactive rows`)
    assert.doesNotMatch(source, /deleteAction=\{\{/, `${page}: an unconditional ลบ is left`)
  }
  const suppliers = read(`${D}suppliers/page.tsx`)
  assert.match(suppliers, /name="status"/, "suppliers: no status filter")
  const supplierList = read("src/components/master-data/supplier-list-view.tsx")
  assert.doesNotMatch(supplierList, /deleteAction=\{\{/, "suppliers: an unconditional ลบ is left")

  for (const loader of LOADERS) {
    assert.doesNotMatch(read(`${D}${loader}/page.tsx`), /where: \{ id, isActive: true \}/, `${loader}: an inactive record is not found`)
  }
  for (const dir of PUT_ROUTES) {
    assert.doesNotMatch(putSource(dir), /where: \{ id, isActive: true \}/, `${dir} PUT: an inactive record cannot be saved`)
  }
  for (const dir of GUARDED_PUT_ROUTES) {
    assert.match(putSource(dir), /isDeactivation\(existing\.isActive, input\.isActive\)/, `${dir} PUT: unticking ใช้งาน skips the delete guard`)
  }
})

// Route modules import next/server and "@/…", which node --test cannot load, so a resolve hook serves stand-ins (as in
// tests/v-track-s.test.ts). The prisma stand-in calls globalThis.__recordStatus[model][method]; a call with no handler throws.
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
      const handler = globalThis.__recordStatus?.[model]?.[method]
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
  ;(globalThis as unknown as { __recordStatus: unknown }).__recordStatus = models
}
const put = (body: unknown) => new Request("http://asset.local/api", { method: "PUT", headers: { "content-type": "application/json" }, body: JSON.stringify(body) })
const params = (id: string) => ({ params: Promise.resolve({ id }) })

test("a referenced record that is inactive comes back when ticked ใช้งาน; unticking an active one is refused like ลบ (Review Focus 3)", async () => {
  const { getLocationDeleteBlockReason } = await load<typeof import("../src/lib/location-list-query.ts")>("src/lib/location-list-query.ts")
  const org = await load<typeof import("../src/lib/organization-master-query.ts")>("src/lib/organization-master-query.ts")
  const cases = [
    {
      dir: "locations", model: "location",
      body: { code: "L1", name: "Store", branchId: "b1", parentId: "", locationType: "Room", description: "", isActive: true },
      counts: { currentAssets: 3, homeAssets: 1, children: 0, auditRounds: 0 },
      reason: getLocationDeleteBlockReason({ currentAssets: 3, homeAssets: 1, children: 0, auditRounds: 0 }),
      extra: {},
    },
    {
      dir: "companies", model: "company",
      body: { code: "C1", assetTagCode: "", nameTh: "บริษัท", nameEn: "", taxId: "", address: "", isActive: true },
      counts: { branches: 2, departments: 0, employees: 0, assets: 5, auditRounds: 0 },
      reason: org.getCompanyDeleteBlockReason({ branches: 2, departments: 0, employees: 0, assets: 5, auditRounds: 0 }),
      extra: {},
    },
    {
      dir: "branches", model: "branch",
      body: { code: "BKK", name: "Bangkok", companyId: "c1", address: "", contactPerson: "", isActive: true },
      counts: { locations: 1, employees: 0, assets: 4, auditRounds: 0 },
      reason: org.getBranchDeleteBlockReason({ locations: 1, employees: 0, assets: 4, auditRounds: 0 }),
      extra: {},
    },
    {
      dir: "employees", model: "employee",
      body: { code: "E1", fullNameTh: "สมชาย", fullNameEn: "", email: "", companyId: "c1", branchId: "b1", departmentId: "d1", position: "", employmentStatus: "active", managerId: "", isActive: true },
      counts: { custodianAssets: 2, subordinates: 0, auditRounds: 0 },
      reason: org.getEmployeeDeleteBlockReason({ custodianAssets: 2, subordinates: 0, userAccounts: 1, openCheckouts: 0, auditRounds: 0 }),
      // LDAP sync off: with it on, the sync owns an employee's ใช้งาน (tests/employee-active-ldap-lock.test.ts).
      extra: { user: { count: () => 1 }, assetCheckout: { count: () => 0 }, systemSetting: { findUnique: () => null } },
    },
  ]

  for (const item of cases) {
    assert.ok(item.reason, `${item.dir}: the stand-in counts block ลบ`)
    const { PUT } = await load<Update>(`src/app/api/${item.dir}/[id]/route.ts`)
    const run = async (stored: boolean, next: boolean) => {
      const lookups: unknown[] = []
      const updates: unknown[] = []
      stubDb({
        ...item.extra,
        [item.model]: {
          findFirst: (args: { where: Record<string, unknown> }) => {
            lookups.push(args.where)
            if (args.where.code) return null
            return { id: "row-1", isActive: stored, _count: item.counts }
          },
          update: (args: unknown) => { updates.push(args); return { id: "row-1" } },
        },
      })
      const response = await PUT(put({ ...item.body, isActive: next }), params("row-1"))
      return { response, lookups, updates }
    }

    // Inactive and still referenced, ticked ใช้งาน again: saved. Reactivation is never blocked.
    const back = await run(false, true)
    assert.equal(back.response.status, 200, `${item.dir}: reactivation is refused`)
    assert.deepEqual(back.lookups[0], { id: "row-1" }, `${item.dir}: the lookup finds inactive records`)
    assert.equal(back.updates.length, 1, `${item.dir}: not saved`)

    // Active and referenced, unticked: 409 with the DELETE route's reason, nothing written.
    const away = await run(true, false)
    assert.equal(away.response.status, 409, `${item.dir}: deactivation is not guarded`)
    assert.deepEqual(await away.response.json(), { error: item.reason }, item.dir)
    assert.equal(away.updates.length, 0, `${item.dir}: written despite the refusal`)

    // Active and staying active: no guard, saved.
    const stay = await run(true, true)
    assert.equal(stay.response.status, 200, `${item.dir}: an ordinary save is refused`)
  }
})

test("an inactive category that still has assets saves while it stays inactive; only unticking an active one is refused (user decision 2026-10-21 Y5)", async () => {
  const { getCategoryDeleteBlockReason } = await load<typeof import("../src/lib/category-delete-guard.ts")>("src/lib/category-delete-guard.ts")
  const counts = { assets: 3, models: 1 }
  const reason = getCategoryDeleteBlockReason(counts)
  assert.ok(reason, "the stand-in counts block ลบ")
  const { PUT } = await load<Update>("src/app/api/categories/[id]/route.ts")
  const body = { code: "IT", name: "IT", description: "", isActive: true, customFieldDefs: [], photoChecklist: [] }
  const run = async (stored: boolean, next: boolean) => {
    const updates: unknown[] = []
    stubDb({
      assetCategory: {
        findFirst: (args: { where: Record<string, unknown> }) => (args.where.code ? null : { id: "cat-1", isActive: stored, _count: counts }),
        update: (args: unknown) => { updates.push(args); return { id: "cat-1" } },
      },
      systemSetting: { upsert: () => ({}) },
    })
    const response = await PUT(put({ ...body, isActive: next }), params("cat-1"))
    return { response, updates }
  }

  const stayInactive = await run(false, false)
  assert.equal(stayInactive.response.status, 200, "an inactive category in use cannot be edited")
  assert.equal(stayInactive.updates.length, 1)

  const away = await run(true, false)
  assert.equal(away.response.status, 409, "deactivating a category in use is not guarded")
  assert.deepEqual(await away.response.json(), { error: reason })
  assert.equal(away.updates.length, 0)

  assert.equal((await run(false, true)).response.status, 200, "reactivation is refused")
  assert.equal((await run(true, true)).response.status, 200, "an ordinary save is refused")
})
