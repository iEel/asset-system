import assert from "node:assert/strict"
import { existsSync } from "node:fs"
import * as nodeModule from "node:module"
import { test } from "node:test"
import { pathToFileURL } from "node:url"

// The transaction pages' loader (server search Task 5): the master lists and the ?assetId= preselect, with the db and
// the search faked, so the test reads which reads the loader makes.
const state: { calls: string[]; searchCalls: { input: Record<string, unknown> }[]; rows: Record<string, unknown>[] } = { calls: [], searchCalls: [], rows: [] }
const fixtures: Record<string, Record<string, unknown>[]> = {
  employee: [{ id: "e1", code: "E001", fullNameTh: "สมชาย ใจดี" }],
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
          return async () => {
            state().calls.push(name + "." + String(method))
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

test("the transaction pages' master lists read no asset, handover or repair (server search Task 5, spec §3 goal 1)", async () => {
  state.calls = []
  assert.deepEqual(await options.getAssetOperationMasterOptions(), {
    employees: [{ id: "e1", label: "E001 - สมชาย ใจดี" }],
    departments: [{ id: "d1", label: "IT - ไอที" }],
    locations: [{ id: "l1", label: "HQ-01 - ห้อง 101" }],
    statuses: [{ id: "s1", label: "พร้อมใช้งาน", name: "Ready" }],
    conditions: [{ id: "c1", label: "ดี", name: "Good" }],
  })
  assert.deepEqual([...state.calls].sort(), ["assetCondition.findMany", "assetStatus.findMany", "department.findMany", "employee.findMany", "location.findMany"])
})

test("?assetId= is one by-id answer under the page's rule, and no query without it (spec 6.4, S-R5)", async () => {
  const chosen = { id: "a1", assetTag: "NB-0228", name: "Notebook Dell", eligible: false, reasonKey: "asset.transactionReasonStatusNotReady" }
  state.searchCalls = []
  state.rows = [chosen]
  assert.equal(await options.getAssetOperationPreselect("checkout", undefined), null)
  assert.equal(state.searchCalls.length, 0)
  assert.deepEqual(await options.getAssetOperationPreselect("transfer", "a1"), chosen)
  assert.deepEqual(state.searchCalls, [{ input: { mode: "transfer", q: "", id: "a1", assignCustodian: false, handedOverAssetId: null } }])
  assert.deepEqual(await options.getAssetOperationPreselect("checkout", ["a1", "a2"]), chosen, "a repeated ?assetId= takes the first, as Next hands it an array")
  assert.equal(state.searchCalls.length, 2)
  assert.deepEqual(state.searchCalls.at(-1), { input: { mode: "checkout", q: "", id: "a1", assignCustodian: false, handedOverAssetId: null } })
  state.rows = []
  assert.equal(await options.getAssetOperationPreselect("checkout", "gone"), null)
})
