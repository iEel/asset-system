import assert from "node:assert/strict"
import { existsSync } from "node:fs"
import * as nodeModule from "node:module"
import { beforeEach, test } from "node:test"
import { pathToFileURL } from "node:url"

type CustodyRouteState = {
  claimCount: number
  assetStatusName: string
  assetOwnershipType: string
  openCheckoutAssetIds: string[]
  calls: string[]
  employees: Record<string, { id: string; departmentId: string }>
  employeeAnswers: Array<{ id: string; departmentId: string } | null>
  activeDepartmentIds: string[]
  activeLocationIds: string[]
  writes: Array<{ call: string; data: Record<string, unknown> }>
  syncChanges: Array<Record<string, unknown>>
  audits: Array<{ action: string; newValue: Record<string, unknown> }>
}

const state: CustodyRouteState = {
  claimCount: 1,
  assetStatusName: "Ready",
  assetOwnershipType: "personal",
  openCheckoutAssetIds: [],
  calls: [],
  employees: { "emp-2": { id: "emp-2", departmentId: "dept-2" } },
  employeeAnswers: [],
  activeDepartmentIds: ["dept-3"],
  activeLocationIds: ["location-2"],
  writes: [],
  syncChanges: [],
  audits: [],
}
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
  ["@/lib/audit-log", `export async function logAudit(entry) { globalThis.__custodyRouteState.audits.push(entry) }`],
  ["@/lib/asset-status-flow", `export async function getRequiredAssetStatusId(name) { return "status:" + name }`],
  ["@/lib/operation-document-number", `
    export async function generateCheckoutDocumentNo() { return "HO-202610-0001" }
    export async function generateTransferDocumentNo() { return "TR-202610-0001" }
  `],
  ["@/lib/asset-component-sync", `
    export async function syncInstalledComponentsWithParent(_tx, args) {
      globalThis.__custodyRouteState.syncChanges.push(args.changes)
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
            if (method === "create" || method === "update") state().writes.push({ call: name + "." + String(method), data: args?.data ?? {} })
            if (method === "updateMany") return { count: name === "asset" ? state().claimCount : 1 }
            if (name === "asset" && (method === "findFirst" || method === "findUnique")) return asset()
            if (name === "asset" && method === "update") return { ...asset(), ...(args?.data ?? {}), updatedAt: new Date("2026-10-07T03:00:00Z") }
            if (name === "assetCondition") return { name: "Good", isActive: true }
            if (name === "assetCheckout" && method === "findFirst") return state().openCheckoutAssetIds.includes(args?.where?.assetId) ? { id: "checkout-open", handoverMode: "temporary_loan" } : null
            if (name === "employee" && method === "findFirst") {
              if (state().employeeAnswers.length > 0) return state().employeeAnswers.shift()
              return args?.where?.isActive === true ? (state().employees[args.where.id] ?? null) : null
            }
            if (name === "department" && method === "findFirst") return args?.where?.isActive === true && state().activeDepartmentIds.includes(args.where.id) ? { id: args.where.id } : null
            if (name === "location" && method === "findFirst") return args?.where?.isActive === true && state().activeLocationIds.includes(args.where.id) ? { id: args.where.id } : null
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
  state.openCheckoutAssetIds = []
  state.calls = []
  state.employees = { "emp-2": { id: "emp-2", departmentId: "dept-2" } }
  state.employeeAnswers = []
  state.activeDepartmentIds = ["dept-3"]
  state.activeLocationIds = ["location-2"]
  state.writes = []
  state.syncChanges = []
  state.audits = []
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

test("a handover to ทรัพย์สินอื่น is refused by the schema before any read or write (group 3 spec §7.3)", async () => {
  const response = await post(checkoutRoute, { ...checkoutBody, checkoutType: "asset", custodianId: undefined, parentAssetId: "asset-pc" })
  assert.equal(response.status, 400)
  assert.equal((await response.json()).code, "VALIDATION_FAILED")
  assert.deepEqual(state.calls, [])
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

const written = (call: string) => state.writes.filter((write) => write.call === call).map((write) => write.data)
const toDepartment = (departmentId: string) => ({ ...checkoutBody, checkoutType: "department", custodianId: undefined, departmentId })
const toRoom = (locationId: string) => ({ ...checkoutBody, checkoutType: "location", custodianId: undefined, locationId })
const departmentLine = (toValue: string) => ({ assetId: "asset-1", movementType: "department_change", fromValue: "dept-1", toValue, reason: "Asset checkout", referenceType: "checkout", referenceId: "assetCheckout-new", performedBy: "user-1" })
// Each field reads its own refusal (final review M10); the code stays one.
const inactiveKeys: Record<string, string> = { custodianId: "checkoutReceiverInactive", departmentId: "checkoutDepartmentInactive", locationId: "checkoutLocationInactive" }
const inactive = (field: string) => [409, { code: "ASSET_CHECKOUT_DESTINATION_INACTIVE", error: "ASSET_CHECKOUT_DESTINATION_INACTIVE", fieldErrors: { [field]: inactiveKeys[field] } }]

test("the system log records the department the handover wrote and the one it replaced (final review M9)", async () => {
  assert.equal((await post(checkoutRoute, checkoutBody)).status, 201)
  const checkout = state.audits.filter((entry) => entry.action === "checkout")
  assert.equal(checkout.length, 1)
  assert.deepEqual([checkout[0].newValue.departmentId, checkout[0].newValue.previousDepartmentId], ["dept-2", "dept-1"])
  state.assetOwnershipType = "shared"; state.audits = []
  await post(checkoutRoute, checkoutBody)
  assert.deepEqual([state.audits[0].newValue.departmentId, state.audits[0].newValue.previousDepartmentId], ["dept-1", "dept-1"], "a ส่วนกลาง asset keeps its own")
})

test("a handover gives a บุคคล or Stock asset and its components the employee's or the chosen department, with a department_change line (group 3 spec §6)", async () => {
  for (const [ownership, body, departmentId] of [["personal", checkoutBody, "dept-2"], ["stock", checkoutBody, "dept-2"], ["personal", toDepartment("dept-3"), "dept-3"], ["stock", toDepartment("dept-3"), "dept-3"]] as const) {
    state.assetOwnershipType = ownership; state.writes = []; state.syncChanges = []
    assert.equal((await post(checkoutRoute, body)).status, 201, `${ownership} ${body.checkoutType}`)
    assert.equal(written("asset.update")[0].departmentId, departmentId)
    assert.equal(state.syncChanges[0].departmentId, departmentId)
    assert.deepEqual(written("assetMovement.create").filter((row) => row.movementType === "department_change"), [departmentLine(departmentId)])
  }
})

test("a ส่วนกลาง asset keeps its department, a room or the same department changes nothing, and no department_change is written (spec §6, P1-R2)", async () => {
  state.employees["emp-same"] = { id: "emp-same", departmentId: "dept-1" }
  for (const [ownership, body] of [["shared", checkoutBody], ["shared", toDepartment("dept-3")], ["personal", toRoom("location-2")], ["stock", toRoom("location-2")], ["personal", { ...checkoutBody, custodianId: "emp-same" }]] as const) {
    state.assetOwnershipType = ownership; state.writes = []; state.syncChanges = []
    assert.equal((await post(checkoutRoute, body)).status, 201, `${ownership} ${body.checkoutType}`)
    assert.equal(written("asset.update")[0].departmentId, "dept-1")
    assert.equal(state.syncChanges[0].departmentId, "dept-1")
    assert.deepEqual(written("assetMovement.create").map((row) => row.movementType), ["checkout"])
  }
  state.assetOwnershipType = "shared"; state.writes = []
  await post(checkoutRoute, toDepartment("dept-3"))
  assert.equal(written("assetCheckout.create")[0].departmentId, "dept-3", "the HO- still names the department it went to")
})

test("an unknown or inactive employee, department or room is refused under its field, before any write (spec §6, §7.2)", async () => {
  for (const [body, field] of [[{ ...checkoutBody, custodianId: "emp-left" }, "custodianId"], [toDepartment("dept-closed"), "departmentId"], [toRoom("location-closed"), "locationId"]] as const) {
    state.calls = []
    assert.deepEqual(await refusal(await post(checkoutRoute, body)), inactive(field), field)
    assert.equal(state.calls.includes("asset.updateMany"), false, field)
    assert.equal(state.calls.includes("assetCheckout.create"), false, field)
  }
})

test("an employee deactivated while the handover is saved is refused inside the transaction, before the HO- record (spec §6)", async () => {
  state.employeeAnswers = [{ id: "emp-2", departmentId: "dept-2" }, null]
  assert.deepEqual(await refusal(await post(checkoutRoute, checkoutBody)), inactive("custodianId"))
  const reads = state.calls.flatMap((call, index) => (call === "employee.findFirst" ? [index] : []))
  assert.equal(reads.length, 2)
  assert.ok(reads[1] > state.calls.indexOf("asset.updateMany"), "read again after the claim")
  assert.equal(state.calls.includes("assetCheckout.create"), false)
})

test("an active employee whose department is closed still receives the asset, with that department (spec §6, call 5)", async () => {
  state.employees["emp-2"] = { id: "emp-2", departmentId: "dept-closed" }
  assert.equal((await post(checkoutRoute, checkoutBody)).status, 201)
  assert.equal(written("asset.update")[0].departmentId, "dept-closed")
  assert.equal(state.calls.includes("department.findFirst"), false, "the employee's department is not checked")
})
