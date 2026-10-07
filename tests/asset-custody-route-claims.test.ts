import assert from "node:assert/strict"
import { existsSync } from "node:fs"
import * as nodeModule from "node:module"
import { beforeEach, test } from "node:test"
import { pathToFileURL } from "node:url"

type CustodyRouteState = {
  claimCount: number
  assetStatusName: string
  calls: string[]
}

const state: CustodyRouteState = { claimCount: 1, assetStatusName: "Ready", calls: [] }
Object.assign(globalThis, { __custodyRouteState: state })

const mockedModuleSources = new Map<string, string>([
  ["next/server", `
    export class NextRequest extends Request {}
    export class NextResponse extends Response {
      static json(body, init) { return Response.json(body, init) }
    }
  `],
  ["@/lib/auth-utils", `
    export async function requireAuth() { return { id: "user-1", roles: ["system_admin"], permissions: [], employeeId: "emp-1" } }
    export function hasRole(user, role) { return user.roles.includes(role) }
    export function hasPermission() { return true }
    export function requirePermission() {}
  `],
  ["@/lib/audit-log", `export async function logAudit() {}`],
  ["@/lib/asset-status-flow", `export async function getRequiredAssetStatusId(name) { return "status:" + name }`],
  ["@/lib/operation-document-number", `
    export async function generateCheckoutDocumentNo() { return "HO-202610-0001" }
    export async function generateTransferDocumentNo() { return "TR-202610-0001" }
  `],
  ["@/lib/asset-component-sync", `
    export async function syncInstalledComponentsWithParent() {
      return { updated: 0, skipped: 0, movements: 0, componentSnapshots: [] }
    }
  `],
  ["@/lib/asset-operation-evidence", `
    export function optionalFormFile() { return null }
    export function optionalFormText() { return null }
    export function requiredFormText() { return "" }
    export async function saveOperationEvidenceFile() { return null }
  `],
  ["@/lib/db", `
    const state = () => globalThis.__custodyRouteState
    const asset = () => ({
      id: "asset-1",
      assetTag: "GRL-COM-26-0036",
      statusId: "status-current",
      conditionId: "condition-good",
      branchId: "branch-1",
      currentLocationId: "location-1",
      custodianId: "emp-9",
      departmentId: "dept-1",
      updatedAt: new Date("2026-10-01T00:00:00Z"),
      status: { name: state().assetStatusName, nameTh: state().assetStatusName },
    })
    function model(name) {
      return new Proxy({}, {
        get(_target, method) {
          return async (args) => {
            state().calls.push(name + "." + String(method))
            if (method === "updateMany") return { count: name === "asset" ? state().claimCount : 1 }
            if (name === "asset" && (method === "findFirst" || method === "findUnique")) return asset()
            if (name === "asset" && method === "update") return { ...asset(), ...(args?.data ?? {}), updatedAt: new Date("2026-10-07T03:00:00Z") }
            if (name === "assetCondition") return { name: "Good", isActive: true }
            if (method === "findFirst" || method === "findUnique") return null
            if (method === "findMany") return []
            if (method === "count") return 0
            return { id: name + "-new", createdAt: new Date(), ...(args?.data ?? {}) }
          }
        },
      })
    }
    const client = new Proxy({}, {
      get(_target, key) {
        if (key === "$transaction") return async (callback) => callback(client)
        return model(String(key))
      },
    })
    export const prisma = client
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

type RouteModule = { POST(request: Request, context: { params: Promise<{ id: string }> }): Promise<Response> }

const checkoutRoute = await import(pathToFileURL("src/app/api/assets/[id]/checkout/route.ts").href) as RouteModule
const transferRoute = await import(pathToFileURL("src/app/api/assets/[id]/transfer/route.ts").href) as RouteModule
const legacyCheckoutRoute = await import(pathToFileURL("src/app/api/assets/[id]/legacy-checkout/route.ts").href) as RouteModule

function post(route: RouteModule, body: unknown) {
  return route.POST(
    new Request("http://localhost/api/assets/asset-1/x", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    }),
    { params: Promise.resolve({ id: "asset-1" }) },
  )
}

const checkoutBody = {
  handoverMode: "temporary_loan",
  checkoutType: "user",
  custodianId: "emp-2",
  checkoutDate: "2026-10-07",
  expectedReturnDate: "2026-10-14",
  conditionBefore: "condition-good",
}

beforeEach(() => {
  state.claimCount = 1
  state.assetStatusName = "Ready"
  state.calls = []
})

test("a handover that loses the race for the asset returns 409 and records nothing", async () => {
  state.claimCount = 0

  const response = await post(checkoutRoute, checkoutBody)

  assert.equal(response.status, 409)
  assert.equal(state.calls.includes("assetCheckout.create"), false)
  assert.equal(state.calls.includes("asset.update"), false)
})

test("a handover claims the asset before writing the checkout", async () => {
  const response = await post(checkoutRoute, checkoutBody)

  assert.equal(response.status, 201)
  const claimIndex = state.calls.indexOf("asset.updateMany")
  assert.ok(claimIndex >= 0, "the asset must be claimed")
  assert.ok(claimIndex < state.calls.indexOf("assetCheckout.create"))
})

test("a transfer that loses the race for the asset returns 409 and records nothing", async () => {
  state.assetStatusName = "In Use"
  state.claimCount = 0

  const response = await post(transferRoute, { toCustodianId: "emp-3", reason: "ย้ายแผนก" })

  assert.equal(response.status, 409)
  assert.equal(state.calls.some((call) => call.startsWith("assetTransfer.create")), false)
  assert.equal(state.calls.includes("asset.update"), false)
})

test("a legacy return backfill that loses the race for the asset returns 409 and records nothing", async () => {
  state.assetStatusName = "In Use"
  state.claimCount = 0

  const response = await post(legacyCheckoutRoute, {})

  assert.equal(response.status, 409)
  assert.equal(state.calls.includes("assetCheckout.create"), false)
})
