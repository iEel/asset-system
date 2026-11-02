import assert from "node:assert/strict"
import { existsSync, readFileSync } from "node:fs"
import * as nodeModule from "node:module"
import { beforeEach, test } from "node:test"
import { pathToFileURL } from "node:url"

import type { AssetScanSearchAnswer } from "../src/lib/asset-scan-search-rules.ts"

const state: { permissions: string[]; calls: string[] } = { permissions: ["asset:view"], calls: [] }
Object.assign(globalThis, { __assetScanSearchRouteState: state })

const mockedModuleSources = new Map<string, string>([
  ["next/server", `
    export class NextRequest extends Request {}
    export class NextResponse extends Response { static json(body, init) { return Response.json(body, init) } }
  `],
  ["@/lib/auth-utils", `
    const state = () => globalThis.__assetScanSearchRouteState
    export async function requireAuth() {
      if (state().permissions === null) throw new Error("Unauthorized")
      return { id: "user-1", roles: [], permissions: state().permissions }
    }
    export function hasPermission(user, module, action) { return user.permissions.includes(module + ":" + action) }
    export function requirePermission(user, module, action) {
      if (!user.permissions.includes(module + ":" + action)) throw new Error("Forbidden: insufficient permissions")
    }
  `],
  ["@/lib/db", `
    const state = () => globalThis.__assetScanSearchRouteState
    const ready = { id: "asset-1", assetTag: "GRL-COM-26-0007", name: "โน้ตบุ๊ก", serialNumber: "SN-77", ownershipType: "personal", custodianId: null,
      status: { name: "Ready", nameTh: "พร้อมใช้งาน" }, condition: { name: "Good", nameTh: "ดี" }, custodian: null,
      currentLocation: { code: "IT-2", name: "ห้อง IT ชั้น 2", branch: { name: "สำนักงานใหญ่" } }, model: null }
    const model = (name, rows) => ({
      findMany: async () => { state().calls.push(name + ".findMany"); return rows },
      count: async () => { state().calls.push(name + ".count"); return rows.length },
    })
    export const prisma = { asset: model("asset", [ready]), assetCheckout: model("assetCheckout", []), maintenanceTicket: model("maintenanceTicket", []),
      disposalRequest: model("disposalRequest", []), assetComponent: model("assetComponent", []) }
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

const routeFile = "src/app/api/assets/scan-search/route.ts"
const route = await import(pathToFileURL(routeFile).href) as { GET(request: Request): Promise<Response> }
const get = (query: string) => route.GET(new Request(`http://localhost/api/assets/scan-search${query}`))

beforeEach(() => {
  state.permissions = ["asset:view"]
  state.calls = []
})

test("no session is 401 and no asset:view is 403, before anything is read, with a good or a bad q", async () => {
  ;(state as { permissions: string[] | null }).permissions = null
  for (const query of ["?q=SN-77", "?q=S"]) assert.equal((await get(query)).status, 401, query)
  state.permissions = ["maintenance:view"]
  for (const query of ["?q=SN-77", "?q=S"]) assert.equal((await get(query)).status, 403, query)
  assert.deepEqual(state.calls, [])
})

test("a missing, 1-character or over-100 q is 400 'Invalid search', with nothing read", async () => {
  for (const query of ["", "?q=S", "?q=%20S%20", `?q=${"a".repeat(101)}`]) {
    const response = await get(query)
    assert.equal(response.status, 400, query)
    assert.deepEqual(await response.json(), { error: "Invalid search" })
  }
  assert.deepEqual(state.calls, [])
})

test("the viewer (asset:view) gets { data } with the total and the rows, its card holding only พิมพ์ป้าย", async () => {
  const response = await get("?q=SN-77&locale=en")
  assert.equal(response.status, 200)
  const { data } = await response.json() as { data: AssetScanSearchAnswer }
  assert.deepEqual(Object.keys(data).sort(), ["rows", "total"])
  assert.equal(data.total, 1)
  const [row] = data.rows
  assert.deepEqual(
    [row.id, row.href, row.status, row.match, row.exact, row.actions, row.recordRepair, row.printLabelHref],
    ["asset-1", "/en/assets/asset-1", { name: "Ready", label: "Ready" }, { field: "serial", text: "SN-77" }, true, { primary: null, transactions: [] }, null, "/en/assets/asset-1/label"],
  )
  assert.equal(state.calls.length, 9)
})

test("an editor's card is built with the user's permissions", async () => {
  state.permissions = ["asset:view", "asset:edit", "maintenance:create", "maintenance:view", "disposal:view"]
  const { data } = await (await get("?q=SN-77")).json() as { data: AssetScanSearchAnswer }
  assert.equal(data.rows[0].actions.primary?.key, "checkout")
  assert.equal(data.rows[0].actions.primary?.href, `/th/asset-management/checkout?assetId=asset-1&returnTo=${encodeURIComponent("/th/asset-management/scan")}`)
})

test("the permission comes before the parse, and the search's time can be measured", () => {
  const source = readFileSync(routeFile, "utf8")
  const gate = source.indexOf('requirePermission(user, "asset", "view")')
  assert.ok(gate > 0)
  assert.ok(gate < source.indexOf("parseAssetScanSearch("))
  assert.match(source, /withPerformanceTiming\(\s*"asset-scan-search"/)
})
