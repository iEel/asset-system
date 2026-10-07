import assert from "node:assert/strict"
import { existsSync } from "node:fs"
import * as nodeModule from "node:module"
import { beforeEach, test } from "node:test"
import { pathToFileURL } from "node:url"

type PendingSourceState = {
  statusName: string
  custodianId: string | null
  openRequest: boolean
  calls: Array<{ call: string; args: Record<string, unknown> }>
}

const state: PendingSourceState = { statusName: "Pending Disposal", custodianId: "emp-7", openRequest: false, calls: [] }
Object.assign(globalThis, { __pendingSourceState: state })

const mockedModuleSources = new Map<string, string>([
  ["next/server", `
    export class NextRequest extends Request {}
    export class NextResponse extends Response {
      static json(body, init) { return Response.json(body, init) }
    }
  `],
  ["@/lib/auth-utils", `
    export async function requireAuth() { return { id: "user-1", roles: [], permissions: ["disposal:create"], employeeId: "emp-1" } }
    export function hasRole(user, role) { return user.roles.includes(role) }
    export function hasPermission() { return true }
    export function requirePermission() {}
  `],
  ["@/lib/audit-log", `export async function logAudit() {}`],
  ["@/lib/asset-status-flow", `export async function getRequiredAssetStatusId(name) { return "status:" + name }`],
  ["@/lib/db", `
    const state = () => globalThis.__pendingSourceState
    const zeroCounts = { checkouts: 0, maintenanceTickets: 0, auditItems: 0, auditFindings: 0, parentComponents: 0, installedInLinks: 0, assignedLicenses: 0 }
    function model(name) {
      return new Proxy({}, {
        get(_target, method) {
          return async (args) => {
            state().calls.push({ call: name + "." + String(method), args: args ?? {} })
            if (name === "asset" && method === "findFirst") {
              return {
                id: "asset-1",
                statusId: "status:" + state().statusName,
                custodianId: state().custodianId,
                licenseAssignedAssetId: null,
                status: { name: state().statusName, nameTh: state().statusName },
                _count: zeroCounts,
              }
            }
            if (name === "employee" && method === "count") return args.where.id.in.length
            if (name === "disposalRequest" && method === "findFirst") return state().openRequest ? { disposalNo: "DP-20261001-0001" } : null
            if (name === "disposalRequest" && method === "count") return 0
            if (name === "assetStatus" && method === "findFirst") return { id: "status:Pending Disposal" }
            if (name === "asset" && method === "updateMany") return { count: 1 }
            if (method === "create") return { id: name + "-new", ...(args?.data ?? {}) }
            if (method === "findFirst" || method === "findUnique") return null
            return {}
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

const route = await import(pathToFileURL("src/app/api/disposal-requests/route.ts").href) as {
  POST(request: Request): Promise<Response>
}

function requestDisposal() {
  return route.POST(new Request("http://localhost/api/disposal-requests", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      assetId: "asset-1",
      disposalType: "dispose",
      reason: "ซ่อมไม่คุ้มค่า ประเมินแล้วควรจำหน่าย",
      requestedById: "emp-2",
      approverId: "emp-3",
      saleValue: null,
      salvageValue: null,
    }),
  }))
}

const createdRequest = () =>
  state.calls.find(({ call }) => call === "disposalRequest.create")?.args.data as Record<string, unknown> | undefined

beforeEach(() => {
  state.statusName = "Pending Disposal"
  state.custodianId = "emp-7"
  state.openRequest = false
  state.calls = []
})

test("an asset a repair closed to Pending Disposal gets its disposal request", async () => {
  const response = await requestDisposal()

  assert.equal(response.status, 201)
  assert.equal(createdRequest()?.previousAssetStatusId, "status:In Use", "rejection must restore an operational status, not Pending Disposal")
})

test("an unassigned Pending Disposal asset restores to Ready if the request is rejected", async () => {
  state.custodianId = null

  await requestDisposal()

  assert.equal(createdRequest()?.previousAssetStatusId, "status:Ready")
})

test("a second request for an asset that already has one open is still refused", async () => {
  state.openRequest = true

  const response = await requestDisposal()

  assert.notEqual(response.status, 201)
  assert.equal(createdRequest(), undefined)
})

test("requests from operational statuses still record the actual previous status", async () => {
  state.statusName = "In Use"

  await requestDisposal()

  assert.equal(createdRequest()?.previousAssetStatusId, "status:In Use")
})
