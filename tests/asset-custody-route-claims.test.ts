import assert from "node:assert/strict"
import { existsSync } from "node:fs"
import * as nodeModule from "node:module"
import { beforeEach, test } from "node:test"
import { pathToFileURL } from "node:url"

type CustodyRouteState = {
  claimCount: number
  assetStatusName: string
  assetOwnershipType: string
  destinations: Record<string, { id: string; ownershipType: string; custodianId: string | null; status: { name: string } }>
  openCheckoutAssetIds: string[]
  calls: string[]
}

const state: CustodyRouteState = { claimCount: 1, assetStatusName: "Ready", assetOwnershipType: "personal", destinations: {}, openCheckoutAssetIds: [], calls: [] }
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
      ownershipType: state().assetOwnershipType,
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
            if (name === "asset" && method === "findFirst" && args?.where?.id && args.where.id !== "asset-1") return state().destinations[args.where.id] ?? null
            if (name === "asset" && (method === "findFirst" || method === "findUnique")) return asset()
            if (name === "asset" && method === "update") return { ...asset(), ...(args?.data ?? {}), updatedAt: new Date("2026-10-07T03:00:00Z") }
            if (name === "assetCondition") return { name: "Good", isActive: true }
            if (name === "assetCheckout" && method === "findFirst") return state().openCheckoutAssetIds.includes(args?.where?.assetId) ? { id: "checkout-open", handoverMode: "temporary_loan" } : null
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
  state.assetOwnershipType = "personal"
  state.destinations = {}
  state.openCheckoutAssetIds = []
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

const refusal = async (response: Response) => [response.status, await response.json()]
const moveBody = { toLocationId: "location-2", reason: "ย้ายห้อง" }

test("a handover refuses a ส่วนควบ and a License with the picker's words, before any write (server-search spec 6.5)", async () => {
  for (const [ownership, code] of [["component", "ASSET_COMPONENT_CHECKOUT_NOT_ALLOWED"], ["software_license", "ASSET_LICENSE_CHECKOUT_NOT_ALLOWED"]] as const) {
    state.assetOwnershipType = ownership
    state.calls = []
    assert.deepEqual(await refusal(await post(checkoutRoute, checkoutBody)), [409, { code, error: code }], ownership)
    assert.equal(state.calls.includes("asset.updateMany"), false, ownership)
    assert.equal(state.calls.includes("assetCheckout.create"), false, ownership)
  }
  // Ownership first, as the picker: a License that is not Ready reads the License word.
  state.assetStatusName = "In Use"
  assert.deepEqual(await refusal(await post(checkoutRoute, checkoutBody)), [409, { code: "ASSET_LICENSE_CHECKOUT_NOT_ALLOWED", error: "ASSET_LICENSE_CHECKOUT_NOT_ALLOWED" }])
})

test("a handover of a Ready บุคคล, ส่วนกลาง or Stock asset still saves", async () => {
  for (const ownership of ["personal", "shared", "stock"]) {
    state.assetOwnershipType = ownership
    assert.equal((await post(checkoutRoute, checkoutBody)).status, 201, ownership)
  }
})

const toAsset = (parentAssetId: string) => ({ ...checkoutBody, checkoutType: "asset", custodianId: undefined, parentAssetId })
const destination = (id: string, ownershipType: string, statusName: string) => ({ id, ownershipType, custodianId: null, status: { name: statusName } })
const destinationRefusal = [409, {
  code: "ASSET_CHECKOUT_DESTINATION_NOT_ALLOWED", error: "ASSET_CHECKOUT_DESTINATION_NOT_ALLOWED",
  fieldErrors: { parentAssetId: "checkoutDestinationNotAllowed" },
}]

test("a handover to ทรัพย์สินอื่น refuses a destination the picker would not offer, under its field and before any write (server-search spec 6.5, S-R39)", async () => {
  state.destinations = {
    "asset-license": destination("asset-license", "software_license", "Ready"),
    "asset-component": destination("asset-component", "component", "Ready"),
    "asset-repair": destination("asset-repair", "personal", "Under Maintenance"),
    "asset-loaned": destination("asset-loaned", "personal", "Ready"),
  }
  state.openCheckoutAssetIds = ["asset-loaned"]
  // itself, missing or inactive, a License, a ส่วนควบ, not Ready, under an open handover
  for (const parentAssetId of ["asset-1", "asset-missing", "asset-license", "asset-component", "asset-repair", "asset-loaned"]) {
    state.calls = []
    assert.deepEqual(await refusal(await post(checkoutRoute, toAsset(parentAssetId))), destinationRefusal, parentAssetId)
    assert.equal(state.calls.includes("asset.updateMany"), false, parentAssetId)
    assert.equal(state.calls.includes("assetCheckout.create"), false, parentAssetId)
  }
})

test("a handover to a Ready ทรัพย์สินอื่น with no open handover still saves", async () => {
  for (const ownership of ["personal", "shared", "stock"]) {
    state.destinations = { "asset-pc": destination("asset-pc", ownership, "Ready") }
    assert.equal((await post(checkoutRoute, toAsset("asset-pc"))).status, 201, ownership)
  }
})

test("a legacy return backfill refuses a ส่วนควบ and a License; a held บุคคล, ส่วนกลาง or Stock asset still backfills (server-search spec 6.5)", async () => {
  state.assetStatusName = "In Use"
  for (const [ownership, code] of [["component", "ASSET_COMPONENT_CHECKIN_NOT_ALLOWED"], ["software_license", "ASSET_LICENSE_CHECKIN_NOT_ALLOWED"]] as const) {
    state.assetOwnershipType = ownership
    state.calls = []
    assert.deepEqual(await refusal(await post(legacyCheckoutRoute, {})), [409, { code, error: code }], ownership)
    assert.equal(state.calls.includes("assetCheckout.create"), false, ownership)
  }
  for (const ownership of ["personal", "shared", "stock"]) {
    state.assetOwnershipType = ownership
    assert.equal((await post(legacyCheckoutRoute, {})).status, 201, ownership)
  }
})

test("a transfer refuses a License; a ส่วนควบ still moves (server-search spec 6.5)", async () => {
  state.assetOwnershipType = "software_license"
  assert.deepEqual(await refusal(await post(transferRoute, moveBody)), [409, { code: "ASSET_LICENSE_MOVE_NOT_ALLOWED", error: "ASSET_LICENSE_MOVE_NOT_ALLOWED" }])
  assert.equal(state.calls.includes("asset.updateMany"), false)
  state.assetOwnershipType = "component"
  assert.equal((await post(transferRoute, moveBody)).status, 201)
})
