import assert from "node:assert/strict"
import { existsSync } from "node:fs"
import * as nodeModule from "node:module"
import { beforeEach, test } from "node:test"
import { pathToFileURL } from "node:url"

const state: { permissions: string[]; round: { id: string; status: string } | null; calls: Array<{ call: string; args: Record<string, unknown> }> } = {
  permissions: ["audit:edit"],
  round: { id: "round-1", status: "open" },
  calls: [],
}
Object.assign(globalThis, { __scanStatusState: state })

const mockedModuleSources = new Map<string, string>([
  ["next/server", `
    export class NextRequest extends Request { get nextUrl() { return new URL(this.url) } }
    export class NextResponse extends Response {
      static json(body, init) { return Response.json(body, init) }
    }
  `],
  ["@/lib/auth-utils", `
    const state = () => globalThis.__scanStatusState
    export async function requireAuth() { return { id: "user-1", roles: [], permissions: state().permissions } }
    export function hasPermission(user, module, action) { return user.permissions.includes(module + ":" + action) }
    export function requirePermission(user, module, action) {
      if (!user.permissions.includes(module + ":" + action)) throw new Error("Forbidden: insufficient permissions")
    }
  `],
  ["@/lib/db", `
    const state = () => globalThis.__scanStatusState
    const record = {
      id: "item-1", assetId: "asset-1", auditStatus: "scanned", auditResult: "found",
      expectedLocationId: "loc-1", expectedCustodianId: null, expectedDepartmentId: null, expectedConditionId: null,
      actualLocationId: "loc-1", actualCustodianId: null, actualDepartmentId: null, actualConditionId: null,
      lastScanAt: new Date("2026-10-07T03:42:00Z"), scannedBy: "user-7",
      asset: { assetTag: "SNI-EQU-19-0271", name: "Laptop", serialNumber: null, fixedAssetCode: null, categoryId: "cat-1", ownershipType: "personal", currentLocationId: "loc-1", custodianId: null, departmentId: null },
    }
    function log(call, args) { state().calls.push({ call, args: args ?? {} }) }
    export const prisma = {
      auditRound: { findFirst: async (args) => { log("auditRound.findFirst", args); return state().round } },
      auditItem: { findMany: async (args) => { log("auditItem.findMany", args); return [record] } },
      user: { findMany: async (args) => { log("user.findMany", args); return [{ id: "user-7", displayName: "วิไล" }] } },
      assetComponent: { groupBy: async (args) => { log("assetComponent.groupBy", args); return [{ parentAssetId: "asset-1", _count: { _all: 3 } }] } },
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

type StatusRoute = { GET(request: Request, context: { params: Promise<{ id: string }> }): Promise<Response> }
const route = await import(pathToFileURL("src/app/api/audit-rounds/[id]/scan-status/route.ts").href) as StatusRoute

function get(query: string) {
  return route.GET(new Request(`http://localhost/api/audit-rounds/round-1/scan-status${query}`), { params: Promise.resolve({ id: "round-1" }) })
}

beforeEach(() => {
  state.permissions = ["audit:edit"]
  state.round = { id: "round-1", status: "open" }
  state.calls = []
})

test("a missing or broken since returns 400", async () => {
  assert.equal((await get("")).status, 400)
  assert.equal((await get("?since=yesterday")).status, 400)
})

test("people without audit edit rights get 403", async () => {
  state.permissions = ["audit:view"]
  assert.equal((await get("?since=2026-10-07T03:00:00.000Z")).status, 403)
})

test("an unknown round returns 404", async () => {
  state.round = null
  assert.equal((await get("?since=2026-10-07T03:00:00.000Z")).status, 404)
})

test("only items changed after since are returned, as scan rows, with the server time and round status", async () => {
  const before = Date.now()
  const response = await get("?since=2026-10-07T03:00:00.000Z")
  const payload = await response.json() as { serverTime: string; roundStatus: string; items: Array<Record<string, unknown>> }

  assert.equal(response.status, 200)
  assert.equal(payload.roundStatus, "open")
  assert.ok(Date.parse(payload.serverTime) >= before - 1000)
  assert.equal(payload.items.length, 1)
  assert.equal(payload.items[0].scannedByName, "วิไล")
  assert.equal(payload.items[0].componentCount, 3)

  const findMany = state.calls.find((entry) => entry.call === "auditItem.findMany")!.args as { where: { auditRoundId: string; updatedAt: { gt: Date } } }
  assert.equal(findMany.where.auditRoundId, "round-1")
  assert.equal(findMany.where.updatedAt.gt.toISOString(), "2026-10-07T02:59:50.000Z")

  const groupBy = state.calls.find((entry) => entry.call === "assetComponent.groupBy")!.args as {
    where: Record<string, unknown> & { parentAsset: { auditItems: { some: { auditRoundId: string; updatedAt: { gt: Date } } } } }
  }
  assert.equal("parentAssetId" in groupBy.where, false)
  assert.equal(groupBy.where.parentAsset.auditItems.some.auditRoundId, "round-1")
  assert.equal(groupBy.where.parentAsset.auditItems.some.updatedAt.gt.toISOString(), "2026-10-07T02:59:50.000Z")
})

test("a closed round still reports its status so the screen can stop saving", async () => {
  state.round = { id: "round-1", status: "closed" }
  const payload = await (await get("?since=2026-10-07T03:00:00.000Z")).json() as { roundStatus: string }
  assert.equal(payload.roundStatus, "closed")
})
