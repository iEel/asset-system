import assert from "node:assert/strict"
import { existsSync } from "node:fs"
import * as nodeModule from "node:module"
import { test } from "node:test"
import { pathToFileURL } from "node:url"

type BatchState = { calls: Array<{ call: string; args: Record<string, unknown> }> }
const state: BatchState = { calls: [] }
Object.assign(globalThis, { __batchPendingSourceState: state })

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
  ["@/lib/disposal-schema-readiness", `export async function isDisposalBatchSchemaReady() { return true }`],
  ["@/lib/asset-status-flow", `export async function getRequiredAssetStatusId(name) { return "status:" + name }`],
  ["@/lib/db", `
    const state = () => globalThis.__batchPendingSourceState
    const zeroCounts = { checkouts: 0, maintenanceTickets: 0, auditItems: 0, auditFindings: 0, parentComponents: 0, installedInLinks: 0, assignedLicenses: 0 }
    const assets = [
      { id: "asset-a", assetTag: "A-1", statusId: "status:Pending Disposal", custodianId: "emp-7", status: { name: "Pending Disposal", nameTh: "รอตัดจำหน่าย" } },
      { id: "asset-b", assetTag: "B-1", statusId: "status:Ready", custodianId: null, status: { name: "Ready", nameTh: "พร้อมใช้งาน" } },
    ].map((asset) => ({ ...asset, licenseAssignedAssetId: null, _count: zeroCounts }))
    function model(name) {
      return new Proxy({}, {
        get(_target, method) {
          return async (args) => {
            state().calls.push({ call: name + "." + String(method), args: args ?? {} })
            if (name === "asset" && method === "findMany") return assets
            if (name === "employee" && method === "findMany") return args.where.id.in.map((id) => ({ id }))
            if (name === "assetStatus" && method === "findFirst") return { id: "status:Pending Disposal" }
            if (name === "disposalRequest" && method === "findMany") return []
            if (method === "count") return 0
            if (name === "asset" && method === "updateMany") return { count: 1 }
            if (method === "create") return { id: name + "-" + state().calls.length, disposalNo: "DP", batchNo: "DPB", ...(args?.data ?? {}) }
            if (method === "findMany") return []
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

const route = await import(pathToFileURL("src/app/api/disposal-batches/route.ts").href) as {
  POST(request: Request): Promise<Response>
}

test("a disposal batch records operational restore statuses for assets already Pending Disposal", async () => {
  const response = await route.POST(new Request("http://localhost/api/disposal-batches", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      assetIds: ["asset-a", "asset-b"],
      disposalType: "dispose",
      reason: "ซ่อมไม่คุ้มค่า ประเมินแล้วควรจำหน่าย",
      requestedById: "emp-2",
      approverId: "emp-3",
    }),
  }))

  assert.equal(response.status, 201, await response.clone().text())
  const previousByAsset = Object.fromEntries(
    state.calls
      .filter(({ call }) => call === "disposalRequest.create")
      .map(({ args }) => {
        const data = args.data as Record<string, unknown>
        return [data.assetId, data.previousAssetStatusId]
      }),
  )
  assert.deepEqual(previousByAsset, { "asset-a": "status:In Use", "asset-b": "status:Ready" })
})
