import assert from "node:assert/strict"
import { existsSync } from "node:fs"
import * as nodeModule from "node:module"
import { beforeEach, test } from "node:test"
import { pathToFileURL } from "node:url"

type Related = { id: string; assetId: string; auditStatus: string; auditResult: string | null }
type State = { asset: Record<string, unknown>; item: Record<string, unknown> | null; related: Related[]; itemSelects: unknown[] }

function notebook(): Record<string, unknown> {
  return {
    id: "asset-x1", assetTag: "GRL-COM-26-0099", name: "Notebook", serialNumber: "SN-0099", fixedAssetCode: null,
    currentLocationId: "loc-9", custodianId: null, departmentId: "dept-1", conditionId: "condition-good", ownershipType: "shared",
    category: { code: "NB", name: "Notebook" }, custodian: null, currentLocation: { code: "R9", name: "ห้อง 9" },
    status: { name: "active", nameTh: "ใช้งาน", colorCode: null },
    parentComponents: [], installedInLinks: [],
  }
}

const recordedFind = {
  id: "item-x1", assetId: "asset-x1", auditStatus: "reviewed", auditResult: "out_of_scope",
  expectedLocationId: "loc-1", expectedCustodianId: null, expectedDepartmentId: "dept-1", expectedConditionId: "condition-good",
  actualLocationId: "loc-2", actualCustodianId: null, actualDepartmentId: "dept-1", actualConditionId: "condition-good",
}

const state: State = { asset: notebook(), item: null, related: [], itemSelects: [] }
Object.assign(globalThis, { __lookupRecordedFindState: state })

const mockedModuleSources = new Map<string, string>([
  ["next/server", `
    export class NextRequest extends Request {}
    export class NextResponse extends Response {
      static json(body, init) { return Response.json(body, init) }
    }
  `],
  ["@/lib/auth-utils", `
    export async function requireAuth() { return { id: "user-1", roles: [], permissions: ["audit:edit"] } }
    export function requirePermission() {}
  `],
  ["@/lib/db", `
    const state = () => globalThis.__lookupRecordedFindState
    export const prisma = {
      auditRound: { findFirst: async () => ({ id: "round-1", status: "open" }) },
      asset: { findFirst: async () => state().asset, findMany: async () => [] },
      auditItem: {
        findUnique: async (args) => { state().itemSelects.push(args.select); return state().item },
        findMany: async () => state().related,
      },
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

const route = await import(pathToFileURL("src/app/api/audit-rounds/[id]/scan-lookup/route.ts").href) as {
  POST(request: Request, context: { params: Promise<{ id: string }> }): Promise<Response>
}

function lookup(rawValue: string) {
  return route.POST(
    new Request("http://localhost/api/audit-rounds/round-1/scan-lookup", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ rawValue }),
    }),
    { params: Promise.resolve({ id: "round-1" }) },
  )
}

type LookupPayload = {
  status: string
  item?: Record<string, unknown>
  asset: { components: Array<{ assetId: string; auditItem: { id: string } | null }>; installedIn: Array<{ parentAssetId: string; auditItem: { id: string } | null }> }
}

beforeEach(() => {
  state.asset = notebook()
  state.item = null
  state.related = []
  state.itemSelects = []
})

test("an asset with no item in the round is out of scope and carries no item", async () => {
  const payload = await (await lookup("GRL-COM-26-0099")).json() as LookupPayload
  assert.equal(payload.status, "out_of_scope")
  assert.equal("item" in payload, false)
})

test("a recorded out-of-scope find answers out_of_scope with its item: the snapshot it was compared with and what was found (P3-R3)", async () => {
  state.item = recordedFind
  const payload = await (await lookup("GRL-COM-26-0099")).json() as LookupPayload
  assert.equal(payload.status, "out_of_scope")
  assert.deepEqual(payload.item, recordedFind)
  assert.deepEqual(state.itemSelects[0], {
    id: true, assetId: true, auditStatus: true, auditResult: true,
    expectedLocationId: true, expectedCustodianId: true, expectedDepartmentId: true, expectedConditionId: true,
    actualLocationId: true, actualCustodianId: true, actualDepartmentId: true, actualConditionId: true,
  })
})

test("an own item of the round still answers in_round", async () => {
  state.item = { ...recordedFind, auditStatus: "scanned", auditResult: "found" }
  const payload = await (await lookup("GRL-COM-26-0099")).json() as LookupPayload
  assert.equal(payload.status, "in_round")
  assert.equal(payload.item?.id, "item-x1")
})

test("a component or parent that is an out-of-scope find reads as not in the round", async () => {
  state.asset = {
    ...notebook(),
    parentComponents: [
      { componentRole: "ram", slotNo: "1", componentAsset: { id: "asset-c1", assetTag: "GRL-COM-26-0101", name: "RAM" } },
      { componentRole: "ssd", slotNo: null, componentAsset: { id: "asset-c2", assetTag: "GRL-COM-26-0102", name: "SSD" } },
    ],
    installedInLinks: [{ componentRole: "dock", slotNo: null, parentAsset: { id: "asset-p1", assetTag: "GRL-COM-26-0100", name: "Desktop" } }],
  }
  state.item = { ...recordedFind, auditStatus: "pending", auditResult: null }
  state.related = [
    { id: "item-c1", assetId: "asset-c1", auditStatus: "pending", auditResult: null },
    { id: "item-c2", assetId: "asset-c2", auditStatus: "reviewed", auditResult: "out_of_scope" },
    { id: "item-p1", assetId: "asset-p1", auditStatus: "reviewed", auditResult: "out_of_scope" },
  ]
  const payload = await (await lookup("GRL-COM-26-0099")).json() as LookupPayload
  assert.deepEqual(payload.asset.components.map((component) => [component.assetId, component.auditItem?.id ?? null]), [["asset-c1", "item-c1"], ["asset-c2", null]])
  assert.deepEqual(payload.asset.installedIn.map((parent) => [parent.parentAssetId, parent.auditItem?.id ?? null]), [["asset-p1", null]])
})
