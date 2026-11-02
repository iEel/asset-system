import assert from "node:assert/strict"
import { existsSync, readFileSync } from "node:fs"
import * as nodeModule from "node:module"
import { beforeEach, test } from "node:test"
import { pathToFileURL } from "node:url"

import type { PurchaseDocumentSearchAnswer } from "../src/lib/purchase-document-search-rules.ts"

const state: { permissions: string[]; calls: string[] } = { permissions: ["asset:create"], calls: [] }
Object.assign(globalThis, { __purchaseDocumentSearchRouteState: state })

const mockedModuleSources = new Map<string, string>([
  ["next/server", `
    export class NextRequest extends Request {}
    export class NextResponse extends Response { static json(body, init) { return Response.json(body, init) } }
  `],
  ["@/lib/auth-utils", `
    const state = () => globalThis.__purchaseDocumentSearchRouteState
    export async function requireAuth() { return { id: "user-1", roles: [], permissions: state().permissions } }
    export function hasPermission(user, module, action) { return user.permissions.includes(module + ":" + action) }
    export function requirePermission(user, module, action) {
      if (!user.permissions.includes(module + ":" + action)) throw new Error("Forbidden: insufficient permissions")
    }
  `],
  ["@/lib/db", `
    const state = () => globalThis.__purchaseDocumentSearchRouteState
    const po = { id: "doc-1", documentType: "purchase_order", documentNo: "PO-2569-0031", poNumber: "PO-2569-0031", invoiceNumber: null,
      documentDate: new Date("2026-10-01T00:00:00.000Z"), totalAmount: null, isActive: true, supplier: null,
      _count: { assetLinks: 1 }, assetLinks: [{ asset: { name: "โน้ตบุ๊ก" } }] }
    export const prisma = { purchaseDocument: {
      findMany: async () => { state().calls.push("purchaseDocument.findMany"); return [po] },
      count: async () => { state().calls.push("purchaseDocument.count"); return 1 },
    } }
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

const routeFile = "src/app/api/purchase-documents/search/route.ts"
const route = await import(pathToFileURL(routeFile).href) as { GET(request: Request): Promise<Response> }
const get = (query: string) => route.GET(new Request(`http://localhost/api/purchase-documents/search${query}`))

beforeEach(() => {
  state.permissions = ["asset:create"]
  state.calls = []
})

test("the viewer (asset:view) gets 403 before anything is read, with or without q (P3-R2)", async () => {
  state.permissions = ["asset:view"]
  for (const query of ["", "?q=P", "?q=PO-2569"]) {
    assert.equal((await get(query)).status, 403, query)
  }
  assert.deepEqual(state.calls, [])
})

test("asset:create alone or asset:edit alone may search (P3-R2)", async () => {
  for (const permissions of [["asset:create"], ["asset:edit"]]) {
    state.permissions = permissions
    assert.equal((await get("?q=PO-2569")).status, 200, permissions.join())
  }
})

test("a 1-character or over-100 q is 400 'Invalid search', with nothing read", async () => {
  for (const query of ["?q=P", "?q=%20P%20", `?q=${"a".repeat(101)}`]) {
    const response = await get(query)
    assert.equal(response.status, 400, query)
    assert.deepEqual(await response.json(), { error: "Invalid search" })
  }
  assert.deepEqual(state.calls, [])
})

test("an answer is { data } with the total, the active total and the rows", async () => {
  const response = await get("?q=PO-2569")
  assert.equal(response.status, 200)
  const { data } = await response.json() as { data: PurchaseDocumentSearchAnswer }
  assert.deepEqual(Object.keys(data).sort(), ["activeTotal", "rows", "total"])
  assert.deepEqual([data.total, data.activeTotal], [1, 1])
  assert.deepEqual(data.rows.map((row) => [row.id, row.documentNo, row.documentDate, row.linkedAssetCount, row.linkedAssetNames]), [
    ["doc-1", "PO-2569-0031", "2026-10-01T00:00:00.000Z", 1, ["โน้ตบุ๊ก"]],
  ])

  const empty = await get("")
  assert.equal(empty.status, 200)
  assert.deepEqual(((await empty.json()) as { data: PurchaseDocumentSearchAnswer }).data.total, 1)
})

test("the permission comes before the parse, and the search's time can be measured (P3-R2)", () => {
  const source = readFileSync(routeFile, "utf8")
  const gate = source.indexOf('if (!hasPermission(user, "asset", "create")) requirePermission(user, "asset", "edit")')
  assert.ok(gate > 0)
  assert.ok(gate < source.indexOf("parsePurchaseDocumentSearch("))
  assert.match(source, /withPerformanceTiming\(\s*"purchase-document-search"/)
})
