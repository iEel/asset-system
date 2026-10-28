import assert from "node:assert/strict"
import { existsSync, readFileSync } from "node:fs"
import * as nodeModule from "node:module"
import { beforeEach, test } from "node:test"
import { pathToFileURL } from "node:url"

import type { AssetOperationSearchAnswer } from "../src/lib/asset-operation-search-rules.ts"

const state: { permissions: string[]; calls: string[] } = { permissions: ["asset:edit"], calls: [] }
Object.assign(globalThis, { __assetOperationSearchRouteState: state })

const mockedModuleSources = new Map<string, string>([
  ["next/server", `
    export class NextRequest extends Request {}
    export class NextResponse extends Response { static json(body, init) { return Response.json(body, init) } }
  `],
  ["@/lib/auth-utils", `
    const state = () => globalThis.__assetOperationSearchRouteState
    export async function requireAuth() { return { id: "user-1", roles: [], permissions: state().permissions } }
    export function hasPermission(user, module, action) { return user.permissions.includes(module + ":" + action) }
    export function requirePermission(user, module, action) {
      if (!user.permissions.includes(module + ":" + action)) throw new Error("Forbidden: insufficient permissions")
    }
  `],
  ["@/lib/db", `
    const state = () => globalThis.__assetOperationSearchRouteState
    const ready = { id: "asset-1", assetTag: "SNI-EQU-25-0228", name: "โน้ตบุ๊ก", serialNumber: null, ownershipType: "personal", custodianId: null,
      currentLocationId: "loc-1", conditionId: "cond-1", status: { name: "Ready", nameTh: "พร้อมใช้งาน" },
      currentLocation: { code: "IT-2", name: "ห้อง IT ชั้น 2" }, custodian: null }
    const model = (name, rows) => ({
      findMany: async () => { state().calls.push(name + ".findMany"); return rows },
      count: async () => { state().calls.push(name + ".count"); return rows.length },
    })
    export const prisma = { asset: model("asset", [ready]), assetCheckout: model("assetCheckout", []), maintenanceTicket: model("maintenanceTicket", []),
      department: model("department", []), location: model("location", []) }
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

const route = await import(pathToFileURL("src/app/api/asset-operations/search/route.ts").href) as { GET(request: Request): Promise<Response> }
const get = (query: string) => route.GET(new Request(`http://localhost/api/asset-operations/search${query}`))

beforeEach(() => {
  state.permissions = ["asset:edit"]
  state.calls = []
})

test("the viewer (asset:view) gets 403 before anything is read (spec 6.2, §7)", async () => {
  state.permissions = ["asset:view"]
  assert.equal((await get("?mode=checkout&q=0228")).status, 403)
  assert.deepEqual(state.calls, [])
})

test("a bad mode or a text under 2 characters is 400 'Invalid search', with nothing read (spec 6.2)", async () => {
  for (const query of ["?mode=audit&q=0228", "?q=0228", "?mode=checkout&q=0", "?mode=checkout&q=%20%200%20"]) {
    const response = await get(query)
    assert.equal(response.status, 400, query)
    assert.deepEqual(await response.json(), { error: "Invalid search" })
  }
  assert.deepEqual(state.calls, [])
})

test("an answer is { data } with the mode, the true total and the rows with their verdicts (spec 6.2)", async () => {
  const response = await get("?mode=checkout&q=0228")
  assert.equal(response.status, 200)
  const { data } = await response.json() as { data: AssetOperationSearchAnswer }
  assert.deepEqual([data.mode, data.total, data.rows.map((row) => [row.assetTag, row.eligible, row.reasonKey])], ["checkout", 1, [["SNI-EQU-25-0228", true, null]]])
})

test("the search's time can be measured on Production (spec §4: revisit over 1 s)", () => {
  assert.match(readFileSync("src/app/api/asset-operations/search/route.ts", "utf8"), /withPerformanceTiming\(\s*"asset-operation-search"/)
})
