import assert from "node:assert/strict"
import { existsSync } from "node:fs"
import * as nodeModule from "node:module"
import { beforeEach, test } from "node:test"
import { pathToFileURL } from "node:url"

type MockAsset = {
  id: string
  statusName: string
  custodianId: string | null
  currentLocationId: string
  departmentId: string | null
}

type BulkCustodyState = {
  assets: MockAsset[]
  activeCheckoutAssetIds: string[]
  calls: Array<{ call: string; args: unknown }>
}

const state: BulkCustodyState = { assets: [], activeCheckoutAssetIds: [], calls: [] }
Object.assign(globalThis, { __bulkCustodyState: state })

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
  ["@/lib/asset-component-sync", `
    export async function syncInstalledComponentsWithParent() {
      return { updated: 0, skipped: 0, movements: 0, componentSnapshots: [] }
    }
  `],
  ["@/lib/db", `
    const state = () => globalThis.__bulkCustodyState
    const toRow = (asset) => ({
      id: asset.id,
      assetTag: asset.id.toUpperCase(),
      name: "Laptop",
      statusId: "status:" + asset.statusName,
      conditionId: "condition-good",
      custodianId: asset.custodianId,
      currentLocationId: asset.currentLocationId,
      departmentId: asset.departmentId,
      companyId: "company-1",
      branchId: "branch-1",
      status: { name: asset.statusName, nameTh: asset.statusName },
      condition: { name: "Good", nameTh: "ดี" },
    })
    function model(name) {
      return new Proxy({}, {
        get(_target, method) {
          return async (args) => {
            state().calls.push({ call: name + "." + String(method), args })
            if (name === "asset" && method === "findMany") {
              const ids = args?.where?.id?.in ?? []
              return state().assets.filter((asset) => ids.includes(asset.id)).map(toRow)
            }
            if (name === "asset" && method === "findFirst") {
              if (args?.where?.serialNumber) return null
              const asset = state().assets.find((item) => item.id === args?.where?.id)
              return asset ? toRow(asset) : null
            }
            if (name === "asset" && method === "updateMany") return { count: 1 }
            if (name === "asset" && method === "update") {
              const asset = state().assets.find((item) => item.id === args?.where?.id)
              return { ...toRow(asset), ...(args?.data ?? {}) }
            }
            if (name === "assetCheckout" && method === "findMany") {
              const ids = args?.where?.assetId?.in ?? []
              return state().activeCheckoutAssetIds.filter((id) => ids.includes(id)).map((assetId) => ({ id: "co-" + assetId, assetId }))
            }
            if (name === "assetCheckout" && (method === "findFirst" || method === "count")) {
              const active = state().activeCheckoutAssetIds.includes(args?.where?.assetId)
              return method === "count" ? (active ? 1 : 0) : active ? { id: "co-" + args.where.assetId } : null
            }
            if (name === "assetStatus") return { id: args?.where?.id, name: String(args?.where?.id ?? "").replace("status:", ""), isActive: true }
            if (name === "assetCondition") return { id: "condition-good", name: "Good", isActive: true }
            if (method === "findFirst" || method === "findUnique") return { id: args?.where?.id ?? "row-1" }
            if (method === "findMany") return []
            if (method === "count") return 0
            return { id: name + "-new", ...(args?.data ?? {}) }
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

const bulkUpdateRoute = await import(pathToFileURL("src/app/api/assets/bulk-update/route.ts").href) as {
  POST(request: Request): Promise<Response>
}
const bulkMoveRoute = await import(pathToFileURL("src/app/api/assets/bulk-move/route.ts").href) as {
  POST(request: Request): Promise<Response>
}
const assetRoute = await import(pathToFileURL("src/app/api/assets/[id]/route.ts").href) as {
  PUT(request: Request, context: { params: Promise<{ id: string }> }): Promise<Response>
}

function jsonRequest(method: string, body: unknown) {
  return new Request("http://localhost/api/assets/x", { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) })
}

const assetWrites = () => state.calls.filter(({ call }) => call === "asset.update" || call === "asset.updateMany")

beforeEach(() => {
  state.assets = [
    { id: "ready-1", statusName: "Ready", custodianId: null, currentLocationId: "loc-1", departmentId: "dept-1" },
    { id: "loaned-1", statusName: "Checked Out", custodianId: "emp-5", currentLocationId: "loc-1", departmentId: "dept-1" },
    { id: "disposed-1", statusName: "Disposed", custodianId: null, currentLocationId: "loc-yard", departmentId: "dept-1" },
  ]
  state.activeCheckoutAssetIds = ["loaned-1"]
  state.calls = []
})

test("bulk update refuses to reassign an asset that is out on loan", async () => {
  const response = await bulkUpdateRoute.POST(jsonRequest("POST", { assetIds: ["ready-1", "loaned-1"], toCustodianId: "emp-2", reason: "จัดสรรใหม่" }))

  assert.equal(response.status, 409)
  assert.deepEqual(assetWrites(), [])
})

test("bulk update refuses to give a disposed asset a custodian or location", async () => {
  const custodian = await bulkUpdateRoute.POST(jsonRequest("POST", { assetIds: ["disposed-1"], toCustodianId: "emp-2", reason: "แก้ข้อมูล" }))
  const location = await bulkUpdateRoute.POST(jsonRequest("POST", { assetIds: ["disposed-1"], toLocationId: "loc-2", reason: "แก้ข้อมูล" }))

  assert.equal(custodian.status, 409)
  assert.equal(location.status, 409)
  assert.deepEqual(assetWrites(), [])
})

test("bulk custodian assignment moves a Ready asset into In Use like a transfer", async () => {
  const response = await bulkUpdateRoute.POST(jsonRequest("POST", { assetIds: ["ready-1"], toCustodianId: "emp-2", reason: "มอบให้ผู้ใช้" }))

  assert.equal(response.status, 200)
  const write = assetWrites()[0]?.args as { data: Record<string, unknown> }
  assert.equal(write.data.custodianId, "emp-2")
  assert.equal(write.data.statusId, "status:In Use")
})

test("bulk move refuses written-off assets", async () => {
  const response = await bulkMoveRoute.POST(jsonRequest("POST", { assetIds: ["disposed-1"], toLocationId: "loc-2", reason: "ย้ายคลัง" }))

  assert.equal(response.status, 409)
  assert.deepEqual(assetWrites(), [])
})

function registerEdit(assetId: string, overrides: Record<string, unknown>) {
  return assetRoute.PUT(
    jsonRequest("PUT", {
      name: "Laptop",
      categoryId: "cat-1",
      companyId: "company-1",
      branchId: "branch-1",
      currentLocationId: "loc-1",
      departmentId: "dept-1",
      statusId: "status:Checked Out",
      conditionId: "condition-good",
      licenseTotalSeats: null,
      licenseUsedSeats: null,
      purchaseDate: null,
      purchasePrice: null,
      warrantyStartDate: null,
      warrantyEndDate: null,
      ...overrides,
    }),
    { params: Promise.resolve({ id: assetId }) },
  )
}

test("the register form cannot change custody of an asset that is out on loan", async () => {
  const response = await registerEdit("loaned-1", { custodianId: "emp-9" })

  assert.equal(response.status, 409)
  assert.deepEqual(assetWrites(), [])
})

test("the register form still saves non-custody edits of an asset that is out on loan", async () => {
  const response = await registerEdit("loaned-1", { custodianId: "emp-5", name: "Laptop (spare battery)" })

  assert.equal(response.status, 200)
  assert.equal(assetWrites().length, 1)
})
