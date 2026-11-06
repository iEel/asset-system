import assert from "node:assert/strict"
import { existsSync } from "node:fs"
import * as nodeModule from "node:module"
import test from "node:test"
import { pathToFileURL } from "node:url"

// Group 8 plan 1 Task 2 (controller ruling): "ปิดใช้งานเมื่อ {date}" reads the newest "delete" system-log entry of a record
// (G8P1-R2, readDeactivatedAt). A deactivation saved from the edit form (PUT with isActive false) writes that entry too,
// beside its "update" entry, in the five group 8 PUT routes; an ordinary save or a reactivation writes "update" only.
// Route modules import next/server and "@/…", which node --test cannot load, so a resolve hook serves stand-ins (as in
// tests/master-data-record-status.test.ts); the logAudit stand-in records its calls.
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
  ["@/lib/audit-log", `export async function logAudit(params) { (globalThis.__auditLogs ??= []).push(params) }`],
  ["@/lib/db", `
    const call = (model, method) => (...args) => {
      const handler = globalThis.__deactivateLog?.[model]?.[method]
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
type AuditEntry = { action: string; module: string; recordId: string }
const globals = globalThis as unknown as { __deactivateLog: unknown; __auditLogs: AuditEntry[] }
const load = <T>(path: string) => import(pathToFileURL(path).href) as Promise<T>
const put = (body: unknown) => new Request("http://asset.local/api", { method: "PUT", headers: { "content-type": "application/json" }, body: JSON.stringify(body) })
const params = (id: string) => ({ params: Promise.resolve({ id }) })

// Counts of nothing in use, so no guard refuses the deactivation.
const cases = [
  {
    dir: "companies", model: "company", module: "company",
    body: { code: "C1", assetTagCode: "", nameTh: "บริษัท", nameEn: "", taxId: "", address: "" },
    counts: { branches: 0, departments: 0, employees: 0, assets: 0, auditRounds: 0 },
  },
  {
    dir: "branches", model: "branch", module: "branch",
    body: { code: "BKK", name: "Bangkok", companyId: "c1", address: "", contactPerson: "" },
    counts: { locations: 0, employees: 0, assets: 0, auditRounds: 0 },
  },
  {
    dir: "departments", model: "department", module: "department",
    body: { code: "D1", name: "IT", companyId: "" },
    counts: { employees: 0, assets: 0, auditRounds: 0 },
  },
  {
    dir: "categories", model: "assetCategory", module: "category",
    body: { code: "IT", name: "IT", description: "", customFieldDefs: [], photoChecklist: [] },
    counts: { assets: 0, models: 0 },
  },
  {
    dir: "suppliers", model: "supplier", module: "supplier",
    body: { code: "SUP-1", name: "Vendor", contactPerson: "", phone: "", email: "", address: "" },
    counts: { assets: 0, maintenanceTickets: 0, maintenancePlans: 0, purchaseDocuments: 0 },
  },
] as const

test("a deactivation saved from the edit form logs a delete entry beside the update; other saves log update only (group 8 plan 1 Task 2)", async () => {
  for (const item of cases) {
    const { PUT } = await load<Update>(`src/app/api/${item.dir}/[id]/route.ts`)
    const run = async (stored: boolean, next: boolean) => {
      globals.__auditLogs = []
      globals.__deactivateLog = {
        [item.model]: {
          findFirst: (args: { where: Record<string, unknown> }) =>
            args.where.code ? null : { id: "row-1", isActive: stored, _count: item.counts },
          count: () => 0,
          update: () => ({ id: "row-1", isActive: next }),
        },
        systemSetting: { upsert: () => ({}) },
      }
      const response = await PUT(put({ ...item.body, isActive: next }), params("row-1"))
      assert.equal(response.status, 200, `${item.dir}: the save is refused (${stored} → ${next})`)
      return globals.__auditLogs.map(({ action, module, recordId }) => ({ action, module, recordId }))
    }

    assert.deepEqual(
      await run(true, false),
      [
        { action: "update", module: item.module, recordId: "row-1" },
        { action: "delete", module: item.module, recordId: "row-1" },
      ],
      `${item.dir}: unticking ใช้งาน logs the deactivation`
    )
    assert.deepEqual(await run(true, true), [{ action: "update", module: item.module, recordId: "row-1" }], `${item.dir}: an ordinary save`)
    assert.deepEqual(await run(false, true), [{ action: "update", module: item.module, recordId: "row-1" }], `${item.dir}: a reactivation`)
    assert.deepEqual(await run(false, false), [{ action: "update", module: item.module, recordId: "row-1" }], `${item.dir}: an inactive record saved inactive`)
  }
})
