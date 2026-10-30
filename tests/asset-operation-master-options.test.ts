import assert from "node:assert/strict"
import { existsSync } from "node:fs"
import * as nodeModule from "node:module"
import { test } from "node:test"
import { pathToFileURL } from "node:url"

// The transaction pages' loader (server search Task 5): the master lists and the ?assetId= preselect, with the db and
// the search faked, so the test reads which reads the loader makes.
const state: { calls: string[]; args: Record<string, unknown>; searchCalls: { input: Record<string, unknown> }[]; rows: Record<string, unknown>[] } = { calls: [], args: {}, searchCalls: [], rows: [] }
const fixtures: Record<string, Record<string, unknown>[]> = {
  employee: [
    { id: "e1", code: "E001", fullNameTh: "สมชาย ใจดี", departmentId: "d2", department: { code: "ACC", name: "บัญชี" }, branch: { name: "สำนักงานใหญ่" } },
    { id: "e2", code: "E002", fullNameTh: "สมหญิง รักงาน", departmentId: "d1", department: { code: "IT", name: "ไอที" }, branch: { name: "สาขาระยอง" } },
  ],
  asset: [{ custodianId: "e1", _count: { _all: 2 } }],
  department: [{ id: "d1", code: "IT", name: "ไอที" }],
  location: [{ id: "l1", code: "HQ-01", name: "ห้อง 101" }],
  assetStatus: [{ id: "s1", name: "Ready", nameTh: "พร้อมใช้งาน" }],
  assetCondition: [{ id: "c1", name: "Good", nameTh: "ดี" }],
}
Object.assign(globalThis, { __masterState: state, __masterFixtures: fixtures })

const mockedModuleSources = new Map<string, string>([
  ["@/lib/db", `
    const state = () => globalThis.__masterState
    function model(name) {
      return new Proxy({}, {
        get(_target, method) {
          return async (args) => {
            state().calls.push(name + "." + String(method))
            state().args[name + "." + String(method)] = args
            return globalThis.__masterFixtures[name] ?? []
          }
        },
      })
    }
    export const prisma = new Proxy({}, { get(_target, key) { return model(String(key)) } })
  `],
  ["@/lib/asset-operation-search", `
    export async function searchAssetOperationOptions(db, input) {
      const state = globalThis.__masterState
      state.searchCalls.push({ input })
      return { mode: input.mode, total: state.rows.length, rows: state.rows }
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

const options = await import(pathToFileURL("src/lib/asset-operation-options.ts").href)

test("without employeeDetail (รับคืน, โอนย้าย, ย้ายหลายรายการ) the employees carry their department id only: no department or branch read, no held-count groupBy (final review M4)", async () => {
  state.calls = []
  state.args = {}
  const plain = await options.getAssetOperationMasterOptions()
  assert.deepEqual(plain.employees, [
    { id: "e1", label: "E001 - สมชาย ใจดี", departmentId: "d2" },
    { id: "e2", label: "E002 - สมหญิง รักงาน", departmentId: "d1" },
  ])
  assert.deepEqual(plain.departments, [{ id: "d1", label: "IT - ไอที", name: "ไอที" }])
  assert.equal(state.calls.includes("asset.groupBy"), false)
  assert.deepEqual((state.args["employee.findMany"] as { select: unknown }).select, { id: true, code: true, fullNameTh: true, departmentId: true })
})

test("with employeeDetail (ส่งมอบ) the master lists read no asset row, handover or repair: each employee carries its name, department, branch and held count from one groupBy that leaves out ส่วนควบ, both an asset owned as ส่วนควบ and any asset installed in another (group 3 plan 1 Task 4, spec §7.2, final review M4, look L1)", async () => {
  state.calls = []
  state.args = {}
  assert.deepEqual(await options.getAssetOperationMasterOptions({ employeeDetail: true }), {
    employees: [
      { id: "e1", label: "E001 - สมชาย ใจดี", name: "สมชาย ใจดี", departmentId: "d2", departmentLabel: "ACC - บัญชี", departmentName: "บัญชี", branchLabel: "สำนักงานใหญ่", heldCount: 2 },
      { id: "e2", label: "E002 - สมหญิง รักงาน", name: "สมหญิง รักงาน", departmentId: "d1", departmentLabel: "IT - ไอที", departmentName: "ไอที", branchLabel: "สาขาระยอง", heldCount: 0 },
    ],
    departments: [{ id: "d1", label: "IT - ไอที", name: "ไอที" }],
    locations: [{ id: "l1", label: "HQ-01 - ห้อง 101", name: "ห้อง 101" }],
    statuses: [{ id: "s1", label: "พร้อมใช้งาน", name: "Ready" }],
    conditions: [{ id: "c1", label: "ดี", name: "Good" }],
  })
  assert.deepEqual([...state.calls].sort(), ["asset.groupBy", "assetCondition.findMany", "assetStatus.findMany", "department.findMany", "employee.findMany", "location.findMany"])
  // An installed component carries its parent's holder through the sync, whatever its ownership, so it would count twice.
  assert.deepEqual(state.args["asset.groupBy"], {
    by: ["custodianId"],
    where: { isActive: true, custodianId: { not: null }, ownershipType: { not: "component" }, installedInLinks: { none: { status: "installed", removedAt: null } } },
    _count: { _all: true },
  })
  assert.deepEqual((state.args["employee.findMany"] as { select: unknown }).select,
    { id: true, code: true, fullNameTh: true, departmentId: true, department: { select: { code: true, name: true } }, branch: { select: { name: true } } })
})

test("?assetId= is one by-id answer under the page's rule, and no query without it (spec 6.4, S-R5)", async () => {
  const chosen = { id: "a1", assetTag: "NB-0228", name: "Notebook Dell", eligible: false, reasonKey: "asset.transactionReasonStatusNotReady" }
  state.searchCalls = []
  state.rows = [chosen]
  assert.equal(await options.getAssetOperationPreselect("checkout", undefined), null)
  assert.equal(state.searchCalls.length, 0)
  assert.deepEqual(await options.getAssetOperationPreselect("transfer", "a1"), chosen)
  assert.deepEqual(state.searchCalls, [{ input: { mode: "transfer", q: "", id: "a1", assignCustodian: false } }])
  assert.deepEqual(await options.getAssetOperationPreselect("checkout", ["a1", "a2"]), chosen, "a repeated ?assetId= takes the first, as Next hands it an array")
  assert.equal(state.searchCalls.length, 2)
  assert.deepEqual(state.searchCalls.at(-1), { input: { mode: "checkout", q: "", id: "a1", assignCustodian: false } })
  assert.deepEqual(await options.getAssetOperationPreselect("checkout", "a1", { detail: true }), chosen)
  assert.deepEqual(state.searchCalls.at(-1), { input: { mode: "checkout", q: "", id: "a1", assignCustodian: false, detail: true } })
  state.rows = []
  assert.equal(await options.getAssetOperationPreselect("checkout", "gone"), null)
})
