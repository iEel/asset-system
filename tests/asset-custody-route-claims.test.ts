import assert from "node:assert/strict"
import { existsSync } from "node:fs"
import * as nodeModule from "node:module"
import { beforeEach, test } from "node:test"
import { pathToFileURL } from "node:url"
import { createPrismaAssetTransactionCancellationRepository } from "../src/lib/asset-transaction-cancellation-prisma.ts"
import { cancelAssetTransaction, previewAssetTransactionCancellation } from "../src/lib/asset-transaction-cancellation-service.ts"

/** The asset's holder, department and room. */
type AssetFields = { custodianId: string | null; departmentId: string | null; currentLocationId: string }

type CustodyRouteState = {
  claimCount: number
  assetStatusName: string
  assetOwnershipType: string
  openCheckoutAssetIds: string[]
  calls: string[]
  /** `employee.findFirst` with `isActive: true` skips one marked `isActive: false`; `employee.findUnique` (the current holder, read without isActive) answers it. */
  employees: Record<string, { id: string; departmentId: string; isActive?: boolean }>
  employeeAnswers: Array<{ id: string; departmentId: string } | null>
  activeDepartmentIds: string[]
  activeLocationIds: string[]
  writes: Array<{ call: string; data: Record<string, unknown> }>
  syncChanges: Array<Record<string, unknown>>
  audits: Array<{ action: string; newValue: Record<string, unknown> }>
  /** The asset's recorded condition name; each asset read takes the next of conditionAnswers first, if any. */
  assetConditionName: string
  /** The asset's recorded condition id (the handover writes conditionBefore over it when they differ). */
  assetConditionId: string
  conditionAnswers: string[]
  /** The condition masters by id (conditionBefore); any other id reads Good. */
  conditionMasters: Record<string, { name: string; isActive: boolean }>
  /** Component asset ids with an outstanding link; each `assetComponent.findMany` takes the next of `outstandingAnswers` first, if any. */
  outstandingAssetIds: string[]
  outstandingAnswers: string[][]
  /** Each asset findFirst/findUnique merges the next of assetAnswers over assetFields first, if any. */
  assetFields: AssetFields
  assetAnswers: Array<Partial<AssetFields>>
}

const state: CustodyRouteState = defaultState()
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
    export async function generateTransferDocumentNo() { globalThis.__custodyRouteState.calls.push("generateTransferDocumentNo"); return "TR-202610-0001" }
  `],
  ["@/lib/asset-component-sync", `
    export async function syncInstalledComponentsWithParent(_tx, args) {
      globalThis.__custodyRouteState.calls.push("syncInstalledComponentsWithParent")
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
      conditionId: state().assetConditionId,
      branchId: "branch-1",
      ...state().assetFields,
      updatedAt: new Date("2026-10-01T00:00:00Z"),
      status: { name: state().assetStatusName, nameTh: state().assetStatusName },
      condition: { name: state().conditionAnswers.length > 0 ? state().conditionAnswers.shift() : state().assetConditionName },
    })
    function model(name) {
      return new Proxy({}, {
        get(_target, method) {
          return async (args) => {
            state().calls.push(name + "." + String(method))
            if (method === "create" || method === "update") state().writes.push({ call: name + "." + String(method), data: args?.data ?? {} })
            if (method === "updateMany") return { count: name === "asset" ? state().claimCount : 1 }
            if (name === "asset" && (method === "findFirst" || method === "findUnique")) return { ...asset(), ...(state().assetAnswers.length > 0 ? state().assetAnswers.shift() : {}) }
            if (name === "asset" && method === "update") return { ...asset(), ...(args?.data ?? {}), updatedAt: new Date("2026-10-07T03:00:00Z") }
            if (name === "assetCondition") return state().conditionMasters[args?.where?.id] ?? { name: "Good", isActive: true }
            if (name === "assetCheckout" && method === "findFirst") return state().openCheckoutAssetIds.includes(args?.where?.assetId) ? { id: "checkout-open", handoverMode: "temporary_loan" } : null
            if (name === "employee" && method === "findFirst") {
              if (state().employeeAnswers.length > 0) return state().employeeAnswers.shift()
              const employee = state().employees[args?.where?.id]
              return args?.where?.isActive === true && employee && employee.isActive !== false ? employee : null
            }
            // The current holder is read without isActive (group 3 spec §6, P3-R3): one who has left still answers.
            if (name === "employee" && method === "findUnique") return state().employees[args?.where?.id] ?? null
            if (name === "department" && method === "findFirst") return args?.where?.isActive === true && state().activeDepartmentIds.includes(args.where.id) ? { id: args.where.id } : null
            if (name === "location" && method === "findFirst") return args?.where?.isActive === true && state().activeLocationIds.includes(args.where.id) ? { id: args.where.id } : null
            if (name === "assetComponent" && method === "findMany") {
              const out = state().outstandingAnswers.length > 0 ? state().outstandingAnswers.shift() : state().outstandingAssetIds
              return out.filter((id) => (args?.where?.componentAssetId?.in ?? []).includes(id)).map((componentAssetId) => ({ componentAssetId, componentAsset: { assetTag: "GRL-COM-26-0036" } }))
            }
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

// Every test starts from these; a test that runs several cases calls resetState() between them.
function defaultState(): CustodyRouteState {
  return {
    claimCount: 1,
    assetStatusName: "Ready",
    assetOwnershipType: "personal",
    openCheckoutAssetIds: [],
    calls: [],
    // emp-9 holds the fake asset, in the asset's own department.
    employees: { "emp-2": { id: "emp-2", departmentId: "dept-2" }, "emp-9": { id: "emp-9", departmentId: "dept-1" } },
    employeeAnswers: [],
    activeDepartmentIds: ["dept-3"],
    activeLocationIds: ["location-2"],
    writes: [],
    syncChanges: [],
    audits: [],
    assetConditionName: "Good",
    assetConditionId: "condition-good",
    conditionAnswers: [],
    conditionMasters: {},
    outstandingAssetIds: [],
    outstandingAnswers: [],
    assetFields: { custodianId: "emp-9", departmentId: "dept-1", currentLocationId: "location-1" },
    assetAnswers: [],
  }
}

function resetState() {
  Object.assign(state, defaultState())
}

beforeEach(resetState)

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

  // emp-2 is an active employee, so the refusal is the lost claim, not the destination check (P3-R6).
  const response = await post(transferRoute, { toCustodianId: "emp-2", reason: "ย้ายแผนก" })

  assert.equal(response.status, 409)
  assert.equal((await response.json()).code, "ASSET_CHANGED_DURING_OPERATION")
  assert.equal(state.calls.some((call) => call.startsWith("assetTransfer.create")), false)
  assert.equal(state.calls.includes("asset.update"), false)
  assert.equal(state.calls.includes("generateTransferDocumentNo"), false)
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

const conditionBlocked = (key: string) => [409, { code: "ASSET_CHECKOUT_CONDITION_BLOCKED", error: "ASSET_CHECKOUT_CONDITION_BLOCKED", fieldErrors: { assetId: key } }]

test("a handover refuses an asset recorded เสียหาย, ใช้งานไม่ได้ or ซาก under the asset field, before any write (group 3 spec §19.2)", async () => {
  for (const [conditionName, key] of [["Damaged", "checkoutConditionDamaged"], ["Non-functional", "checkoutConditionNonFunctional"], ["Salvage", "checkoutConditionSalvage"]] as const) {
    state.assetConditionName = conditionName
    state.calls = []
    assert.deepEqual(await refusal(await post(checkoutRoute, checkoutBody)), conditionBlocked(key), conditionName)
    assert.equal(state.calls.includes("asset.updateMany"), false, conditionName)
    assert.equal(state.calls.includes("assetCheckout.create"), false, conditionName)
  }
  // A1-R2: the status and the open handover read their own refusals first.
  state.assetConditionName = "Damaged"
  state.assetStatusName = "In Use"
  assert.deepEqual(await refusal(await post(checkoutRoute, checkoutBody)), [409, { code: "ASSET_STATUS_CHECKOUT_NOT_ALLOWED", error: "ASSET_STATUS_CHECKOUT_NOT_ALLOWED" }])
  state.assetStatusName = "Ready"
  state.openCheckoutAssetIds = ["asset-1"]
  assert.equal((await post(checkoutRoute, checkoutBody)).status, 400, "the open handover first")
})

test("a ยังไม่ประเมิน asset is not refused (group 3 spec §19.2)", async () => {
  state.assetConditionName = "Not Assessed"
  assert.equal((await post(checkoutRoute, checkoutBody)).status, 201)
})

test("the handover assesses the asset: a ยังไม่ประเมิน asset handed over as ดี is left ดี, with one condition_change line and the log's two ids (group 3 spec §19.1, fix brief item 4)", async () => {
  state.assetConditionName = "Not Assessed"
  state.assetConditionId = "condition-unassessed"
  assert.equal((await post(checkoutRoute, checkoutBody)).status, 201)
  assert.equal(written("asset.update")[0].conditionId, "condition-good")
  assert.deepEqual(written("assetMovement.create").filter((row) => row.movementType === "condition_change"), [{
    assetId: "asset-1",
    movementType: "condition_change",
    fromValue: "condition-unassessed",
    toValue: "condition-good",
    reason: "Asset checkout",
    referenceType: "checkout",
    referenceId: "assetCheckout-new",
    performedBy: "user-1",
  }])
  const [audit] = state.audits.filter((entry) => entry.action === "checkout")
  assert.deepEqual([audit.newValue.conditionId, audit.newValue.previousConditionId], ["condition-good", "condition-unassessed"])
})

test("an asset already ดี handed over as ดี keeps its condition and writes no condition_change (fix brief item 4)", async () => {
  assert.equal((await post(checkoutRoute, checkoutBody)).status, 201)
  assert.equal("conditionId" in written("asset.update")[0], false, "the condition is not rewritten")
  assert.deepEqual(written("assetMovement.create").filter((row) => row.movementType === "condition_change"), [])
  const [audit] = state.audits.filter((entry) => entry.action === "checkout")
  assert.deepEqual([audit.newValue.conditionId, audit.newValue.previousConditionId], ["condition-good", "condition-good"])
})

test("a condition that turns ใช้งานไม่ได้ after the pre-check is refused by the re-read inside the transaction, and nothing is written (group 3 spec §19.2)", async () => {
  state.conditionAnswers = ["Good", "Non-functional"]
  assert.deepEqual(await refusal(await post(checkoutRoute, checkoutBody)), conditionBlocked("checkoutConditionNonFunctional"))
  assert.ok(state.calls.includes("asset.updateMany"), "the pre-check passed and the asset was claimed")
  assert.equal(state.calls.includes("assetCheckout.create"), false)
  assert.equal(state.calls.includes("asset.update"), false)
  assert.equal(state.calls.includes("assetMovement.create"), false)
  assert.equal(state.calls.includes("attachment.create"), false)
  assert.deepEqual(state.audits, [])
})

test("a handover recorded as เสียหาย or ยังไม่ประเมิน is refused under the condition field: ส่งมอบ takes ใหม่/ดี/พอใช้ only (group 3 spec §19.1)", async () => {
  state.conditionMasters = { "condition-damaged": { name: "Damaged", isActive: true }, "condition-unassessed": { name: "Not Assessed", isActive: true } }
  for (const conditionBefore of ["condition-damaged", "condition-unassessed"]) {
    state.calls = []
    assert.deepEqual(await refusal(await post(checkoutRoute, { ...checkoutBody, conditionBefore })), [400, { code: "ASSET_CONDITION_NOT_SELECTABLE", error: "Invalid asset condition for checkout", fieldErrors: { conditionBefore: "invalidCheckoutCondition" } }], conditionBefore)
    assert.equal(state.calls.includes("asset.updateMany"), false, conditionBefore)
  }
})

const outstandingAtAsset = [409, { code: "ASSET_COMPONENT_OUTSTANDING", error: "ASSET_COMPONENT_OUTSTANDING", fieldErrors: { assetId: "componentOutstanding" } }]

test("ส่งมอบ and โอนย้าย refuse an outstanding component under the asset field, before the ownership rule and any write (group 3 spec §8.5, P2-R17)", async () => {
  state.outstandingAssetIds = ["asset-1"]
  for (const [name, route, body] of [["checkout", checkoutRoute, checkoutBody], ["transfer", transferRoute, moveBody]] as const) {
    for (const ownership of ["personal", "component", "software_license"]) {
      state.assetOwnershipType = ownership
      state.calls = []
      assert.deepEqual(await refusal(await post(route, body)), outstandingAtAsset, `${name} ${ownership}`)
      assert.equal(state.calls.includes("asset.updateMany"), false, `${name} ${ownership}`)
    }
  }
})

test("the legacy backfill refuses an outstanding component before its ownership rule, with no field (group 3 spec §8.5, P2-R17)", async () => {
  state.assetStatusName = "In Use"
  state.outstandingAssetIds = ["asset-1"]
  for (const ownership of ["personal", "component"]) {
    state.assetOwnershipType = ownership
    state.calls = []
    assert.deepEqual(await refusal(await post(legacyCheckoutRoute, {})), [409, { code: "ASSET_COMPONENT_OUTSTANDING", error: "ASSET_COMPONENT_OUTSTANDING" }], ownership)
    assert.equal(state.calls.includes("assetCheckout.create"), false, ownership)
  }
})

test("a link turned outstanding while ส่งมอบ, โอนย้าย or the legacy backfill is saved is refused by the re-read after the claim, before any record (P2-R17)", async () => {
  for (const [name, route, body, statusName, record] of [
    ["checkout", checkoutRoute, checkoutBody, "Ready", "assetCheckout.create"],
    ["transfer", transferRoute, moveBody, "Ready", "assetTransfer.create"],
    ["legacy", legacyCheckoutRoute, {}, "In Use", "assetCheckout.create"],
  ] as const) {
    state.assetStatusName = statusName
    state.outstandingAnswers = [[], ["asset-1"]]
    state.calls = []
    const [status, answer] = await refusal(await post(route, body))
    assert.deepEqual([status, answer.code], [409, "ASSET_COMPONENT_OUTSTANDING"], name)
    const reads = state.calls.flatMap((call, index) => (call === "assetComponent.findMany" ? [index] : []))
    assert.equal(reads.length, 2, name)
    assert.ok(reads[1] > state.calls.indexOf("asset.updateMany"), `${name}: read again after the claim`)
    assert.equal(state.calls.includes(record), false, name)
  }
})

// Group 3 plan 3 Task 2: the transfer route (group 3 spec §6, §9.2, §9.3, §19; P3-R1, P3-R3 to P3-R7).
const wasCalled = (call: string) => state.calls.includes(call)
const positionsOf = (call: string) => state.calls.flatMap((name, index) => (name === call ? [index] : []))
const noHolder: AssetFields = { custodianId: null, departmentId: "dept-1", currentLocationId: "location-1" }
// emp-9 holds the fake asset; here in the department given.
const holderDepartment = (departmentId: string, isActive = true): CustodyRouteState["employees"] => ({
  "emp-2": { id: "emp-2", departmentId: "dept-2" },
  "emp-9": { id: "emp-9", departmentId, isActive },
})
const transferDepartmentLine = (toValue: string, transferId: string) => ({
  assetId: "asset-1", movementType: "department_change", fromValue: "dept-1", toValue, reason: "Asset transfer", referenceType: "transfer", referenceId: transferId, performedBy: "user-1",
})
const noDestination = [400, { error: "Invalid request data", code: "VALIDATION_FAILED", fieldErrors: { toLocationId: "transferDestinationRequired" } }]
const changedMeanwhile = { code: "ASSET_CHANGED_DURING_OPERATION", error: "Asset status changed while this request was being saved. Reload the asset and try again." }
const departmentLocked = { code: "ASSET_TRANSFER_DEPARTMENT_LOCKED", error: "ASSET_TRANSFER_DEPARTMENT_LOCKED" }
const transferInactive = (fieldErrors: Record<string, string>) => ({ code: "ASSET_TRANSFER_DESTINATION_INACTIVE", error: "ASSET_TRANSFER_DESTINATION_INACTIVE", fieldErrors })
const transferConditionRefusal = (key: string) => ({ code: "ASSET_TRANSFER_CONDITION_BLOCKED", error: "ASSET_TRANSFER_CONDITION_BLOCKED", fieldErrors: { assetId: key } })

// One transfer from the defaults plus the case's own state.
async function transferWith(setup: Partial<CustodyRouteState>, body: Record<string, unknown>) {
  resetState()
  Object.assign(state, setup)
  return post(transferRoute, { reason: "ย้ายห้อง", ...body })
}

test("a transfer writes the department of spec §6 to the asset, its transfer line and its components, with a department_change line only when it changes, and writes no other asset field (group 3 spec §6, §9.2; P3-R2, P3-R3, P3-R7; Review Focus 1)", async () => {
  const rows: Array<[string, Partial<CustodyRouteState>, Record<string, unknown>, string]> = [
    ["บุคคล to a new holder", {}, { toCustodianId: "emp-2" }, "dept-2"],
    ["Stock to a new holder", { assetOwnershipType: "stock" }, { toCustodianId: "emp-2" }, "dept-2"],
    ["บุคคล held, room only: the holder's department (call 4)", { employees: holderDepartment("dept-9") }, moveBody, "dept-9"],
    ["Stock held, room only", { assetOwnershipType: "stock", employees: holderDepartment("dept-9") }, moveBody, "dept-9"],
    ["an unknown ownership reads as บุคคล", { assetOwnershipType: "legacy", employees: holderDepartment("dept-9") }, moveBody, "dept-9"],
    // The stand-in answers a holder who has left only to a read without isActive.
    ["a holder who has left still decides", { employees: holderDepartment("dept-9", false) }, moveBody, "dept-9"],
    ["held, the holder already in the asset's department", {}, moveBody, "dept-1"],
    ["held, the holder's row missing: unchanged", { employees: { "emp-2": { id: "emp-2", departmentId: "dept-2" } } }, moveBody, "dept-1"],
    ["no holder: the chosen department", { assetFields: noHolder }, { toDepartmentId: "dept-3" }, "dept-3"],
    ["no holder, room only: unchanged", { assetFields: noHolder }, moveBody, "dept-1"],
    ["ส่วนกลาง held, room only: keeps its own", { assetOwnershipType: "shared", employees: holderDepartment("dept-9") }, moveBody, "dept-1"],
    ["ส่วนกลาง to a new holder: keeps its own", { assetOwnershipType: "shared" }, { toCustodianId: "emp-2" }, "dept-1"],
    ["ส่วนกลาง with a holder: the chosen department, the row stays free", { assetOwnershipType: "shared", employees: holderDepartment("dept-9") }, { toDepartmentId: "dept-3" }, "dept-3"],
    ["ส่วนควบ held, room only: keeps its own (P3-R2)", { assetOwnershipType: "component", employees: holderDepartment("dept-9") }, moveBody, "dept-1"],
    ["ส่วนควบ: the chosen department", { assetOwnershipType: "component" }, { toDepartmentId: "dept-3" }, "dept-3"],
  ]
  for (const [name, setup, body, departmentId] of rows) {
    const response = await transferWith(setup, body)
    assert.equal(response.status, 201, `${name}: ${await response.clone().text()}`)
    const [record] = written("assetTransfer.create")
    assert.equal(written("asset.update")[0].departmentId, departmentId, name)
    // The transfer never writes branchId or assetTag (Global Constraint): the asset update carries exactly these five fields.
    assert.deepEqual(Object.keys(written("asset.update")[0]).sort(), ["currentLocationId", "custodianId", "departmentId", "statusId", "updatedBy"], `${name}: the fields written`)
    assert.equal(JSON.parse(String(written("assetMovement.create")[0].toValue)).departmentId, departmentId, `${name}: the transfer line`)
    assert.equal(state.syncChanges[0].departmentId, departmentId, `${name}: the components`)
    assert.deepEqual(written("assetMovement.create").filter((row) => row.movementType === "department_change"),
      departmentId === "dept-1" ? [] : [transferDepartmentLine(departmentId, String(record.id))], name)
  }
})

test("the system log records the department the transfer wrote and the one it replaced (checkout M9 parity, P3-R7)", async () => {
  for (const [ownership, expected] of [["personal", ["dept-9", "dept-1"]], ["shared", ["dept-1", "dept-1"]]] as const) {
    assert.equal((await transferWith({ assetOwnershipType: ownership, employees: holderDepartment("dept-9") }, moveBody)).status, 201, ownership)
    const [audit] = state.audits.filter((entry) => entry.action === "transfer")
    assert.deepEqual([audit.newValue.departmentId, audit.newValue.previousDepartmentId], expected, ownership)
  }
})

test("inside the transaction the checks come after the claim and the outstanding re-read and before the TR- number; the department_change line follows the transfer line before the components move; nothing writes the asset after its update (spec §5; P3-R6, P3-R7)", async () => {
  assert.equal((await transferWith({ employees: holderDepartment("dept-9") }, moveBody)).status, 201)
  const at = (call: string, nth = 0) => positionsOf(call)[nth]
  const order = [at("asset.updateMany"), at("assetComponent.findMany", 1), at("asset.findUnique"), at("employee.findUnique", 1), at("location.findFirst", 1), at("generateTransferDocumentNo"), at("asset.update")]
  assert.ok(order.every((position) => position !== undefined), JSON.stringify(state.calls))
  assert.deepEqual([...order].sort((a, b) => a - b), order, JSON.stringify(state.calls))
  const [transferLine, departmentLine] = positionsOf("assetMovement.create")
  assert.deepEqual(written("assetMovement.create").map((row) => row.movementType), ["transfer", "department_change"])
  assert.ok(at("asset.update") < transferLine && transferLine < departmentLine, JSON.stringify(state.calls))
  assert.ok(departmentLine < at("syncInstalledComponentsWithParent") && at("syncInstalledComponentsWithParent") < at("assetTransfer.create"), JSON.stringify(state.calls))
  assert.equal(positionsOf("asset.update").length, 1)
  assert.ok(Math.max(...positionsOf("asset.updateMany")) < at("asset.update"), "the claim is the only other asset write, and it comes first")
})

test("a destination equal to the asset's current value is no change: all equal is the schema's own 400 under ที่ตั้งปลายทาง, before any other read; a re-picked holder is no assign and keeps the status (spec §9.2, call 17; P3-R4; Review Focus 2)", async () => {
  assert.deepEqual(await refusal(await post(transferRoute, { reason: "ย้ายห้อง" })), noDestination, "the schema's answer for no destination")
  for (const body of [
    { toLocationId: "location-1" },
    { toCustodianId: "emp-9" },
    { toDepartmentId: "dept-1" },
    { toLocationId: "location-1", toCustodianId: "emp-9", toDepartmentId: "dept-1" },
    { toLocationId: "location-1", toCustodianId: "", toDepartmentId: "" },
  ]) {
    assert.deepEqual(await refusal(await transferWith({}, body)), noDestination, JSON.stringify(body))
    assert.deepEqual(state.calls, ["asset.findFirst"], `${JSON.stringify(body)}: nothing read after the asset, nothing written`)
  }
  // A Pending Repair asset re-picking its own holder with a new room is a room move (move_scope), not an assign: it saves
  // and keeps its status and its holder.
  assert.equal((await transferWith({ assetStatusName: "Pending Repair" }, { ...moveBody, toCustodianId: "emp-9" })).status, 201)
  const [update] = written("asset.update")
  assert.deepEqual([update.statusId, update.custodianId, update.currentLocationId], ["status-current", "emp-9", "location-2"])
  // A department equal to the current one is dropped before any read.
  assert.equal((await transferWith({ assetFields: noHolder }, { ...moveBody, toDepartmentId: "dept-1" })).status, 201)
  assert.equal(wasCalled("department.findFirst"), false)
  assert.deepEqual(written("assetMovement.create").map((row) => row.movementType), ["transfer"])
})

test("โอนย้าย refuses a broken asset only when it goes to a new holder, under the asset field and after the outstanding, status and open-handover rules; a room-only move and its own holder re-picked still save (spec §19, P3-R1; Review Focus 4)", async () => {
  const toNewHolder = { toCustodianId: "emp-2", reason: "เปลี่ยนผู้ใช้งาน" }
  for (const [conditionName, key] of [["Damaged", "transferConditionDamaged"], ["Non-functional", "transferConditionNonFunctional"], ["Salvage", "transferConditionSalvage"]] as const) {
    assert.deepEqual(await refusal(await transferWith({ assetConditionName: conditionName }, toNewHolder)), [409, transferConditionRefusal(key)], conditionName)
    assert.equal(wasCalled("asset.updateMany"), false, conditionName)
    // A room-only move, e.g. to the IT store, saves.
    assert.equal((await transferWith({ assetConditionName: conditionName }, moveBody)).status, 201, `${conditionName}: room only`)
    // Its own holder is no new holder (P3-R4): it saves, and the status stays.
    assert.equal((await transferWith({ assetConditionName: conditionName }, { ...moveBody, toCustodianId: "emp-9" })).status, 201, `${conditionName}: same holder`)
    assert.equal(written("asset.update")[0].statusId, "status-current", conditionName)
  }
  // The earlier rules read their own refusals first (A1-R2's order).
  assert.deepEqual(await refusal(await transferWith({ assetConditionName: "Damaged", assetStatusName: "Pending Repair" }, toNewHolder)),
    [409, { code: "ASSET_STATUS_TRANSFER_NOT_ALLOWED", error: "ASSET_STATUS_TRANSFER_NOT_ALLOWED" }])
  assert.deepEqual(await refusal(await transferWith({ assetConditionName: "Damaged", openCheckoutAssetIds: ["asset-1"] }, toNewHolder)),
    [400, { error: "Asset already has an active checkout" }])
  assert.deepEqual(await refusal(await transferWith({ assetConditionName: "Damaged", outstandingAssetIds: ["asset-1"] }, toNewHolder)), outstandingAtAsset)
  assert.equal((await transferWith({ assetConditionName: "Not Assessed" }, toNewHolder)).status, 201, "ยังไม่ประเมิน is not refused")
})

test("a department sent while it follows the holder is refused 409 with no field, before the active check, unless it is the holder's own (spec §6, §9.2; P3-R5)", async () => {
  const refused: Array<[string, Partial<CustodyRouteState>, Record<string, unknown>]> = [
    ["held, a room and another department", { employees: holderDepartment("dept-9") }, { toLocationId: "location-2", toDepartmentId: "dept-3" }],
    ["held, a closed room too: the lock reads first", { employees: holderDepartment("dept-9") }, { toLocationId: "location-closed", toDepartmentId: "dept-3" }],
    ["a new holder and another department", {}, { toCustodianId: "emp-2", toDepartmentId: "dept-3" }],
  ]
  for (const [name, setup, body] of refused) {
    assert.deepEqual(await refusal(await transferWith(setup, body)), [409, departmentLocked], name)
    assert.equal(wasCalled("asset.updateMany"), false, name)
    assert.equal(wasCalled("department.findFirst"), false, `${name}: a locked department is not read`)
  }
  // The holder's own department is what the save writes, so it is accepted. dept-9 is not an active department, and a
  // locked department is not read.
  const accepted: Array<[string, Partial<CustodyRouteState>, Record<string, unknown>, string]> = [
    ["held, the holder's department", { employees: holderDepartment("dept-9") }, { ...moveBody, toDepartmentId: "dept-9" }, "dept-9"],
    ["a new holder's own department", {}, { toCustodianId: "emp-2", toDepartmentId: "dept-2" }, "dept-2"],
  ]
  for (const [name, setup, body, departmentId] of accepted) {
    assert.equal((await transferWith(setup, body)).status, 201, name)
    assert.equal(written("asset.update")[0].departmentId, departmentId, name)
    assert.equal(wasCalled("department.findFirst"), false, name)
  }
})

test("a missing or inactive room, new holder or free department is refused under every failing field at once, before the asset is claimed (spec §6, §9.3; P3-R6)", async () => {
  const staff: CustodyRouteState["employees"] = {
    "emp-2": { id: "emp-2", departmentId: "dept-2" },
    "emp-9": { id: "emp-9", departmentId: "dept-1" },
    "emp-gone": { id: "emp-gone", departmentId: "dept-2", isActive: false },
  }
  const cases: Array<[string, Partial<CustodyRouteState>, Record<string, unknown>, Record<string, string>]> = [
    ["a closed room", {}, { toLocationId: "location-closed" }, { toLocationId: "checkoutLocationInactive" }],
    ["an unknown employee", {}, { toCustodianId: "emp-unknown" }, { toCustodianId: "checkoutReceiverInactive" }],
    ["an employee who has left", {}, { toCustodianId: "emp-gone" }, { toCustodianId: "checkoutReceiverInactive" }],
    ["a closed department on an asset with no holder", { assetFields: noHolder }, { toDepartmentId: "dept-closed" }, { toDepartmentId: "checkoutDepartmentInactive" }],
    ["a closed room and an employee who has left", {}, { toLocationId: "location-closed", toCustodianId: "emp-gone" },
      { toLocationId: "checkoutLocationInactive", toCustodianId: "checkoutReceiverInactive" }],
    ["all three on a ส่วนกลาง asset, whose department stays free", { assetOwnershipType: "shared" }, { toLocationId: "location-closed", toCustodianId: "emp-gone", toDepartmentId: "dept-closed" },
      { toLocationId: "checkoutLocationInactive", toCustodianId: "checkoutReceiverInactive", toDepartmentId: "checkoutDepartmentInactive" }],
  ]
  for (const [name, setup, body, fieldErrors] of cases) {
    assert.deepEqual(await refusal(await transferWith({ employees: staff, ...setup }, body)), [409, transferInactive(fieldErrors)], name)
    assert.equal(wasCalled("asset.updateMany"), false, name)
    assert.equal(wasCalled("assetTransfer.create"), false, name)
  }
})

test("an active new holder whose department is closed still receives the asset, with that department, which is not read (spec §6, call 5)", async () => {
  assert.equal((await transferWith({ employees: { "emp-2": { id: "emp-2", departmentId: "dept-closed" } } }, { toCustodianId: "emp-2" })).status, 201)
  assert.equal(written("asset.update")[0].departmentId, "dept-closed")
  assert.equal(wasCalled("department.findFirst"), false)
})

test("every refusal inside the transaction comes after the claim and before the TR- number, and nothing is written (spec §5; P3-R1, P3-R4, P3-R5, P3-R6; Review Focus 2)", async () => {
  const cases: Array<[string, Partial<CustodyRouteState>, Record<string, unknown>, unknown]> = [
    ["the chosen holder became the holder", { assetStatusName: "In Use", assetAnswers: [{}, { custodianId: "emp-2" }] }, { toCustodianId: "emp-2" }, changedMeanwhile],
    ["the chosen room became the room", { assetAnswers: [{}, { currentLocationId: "location-2" }] }, moveBody, changedMeanwhile],
    ["the condition became ซาก", { conditionAnswers: ["Good", "Salvage"] }, { toCustodianId: "emp-2" }, transferConditionRefusal("transferConditionSalvage")],
    ["the asset gained a holder, so the chosen department is now locked",
      { assetFields: noHolder, assetAnswers: [{}, { custodianId: "emp-9" }], employees: holderDepartment("dept-9") }, { toDepartmentId: "dept-3" }, departmentLocked],
    ["the new holder was deactivated", { employeeAnswers: [{ id: "emp-2", departmentId: "dept-2" }, null] }, { toCustodianId: "emp-2" }, transferInactive({ toCustodianId: "checkoutReceiverInactive" })],
  ]
  for (const [name, setup, body, answer] of cases) {
    assert.deepEqual(await refusal(await transferWith(setup, body)), [409, answer], name)
    assert.ok(wasCalled("asset.updateMany"), `${name}: the pre-check passed and the asset was claimed`)
    for (const call of ["generateTransferDocumentNo", "asset.update", "assetMovement.create", "assetTransfer.create"]) assert.equal(wasCalled(call), false, `${name}: ${call}`)
    assert.deepEqual(state.audits, [], name)
  }
})

test("a TR- whose save corrected the department can be cancelled: its department_change line carries the transfer's reference, so it is no downstream work, and the cancel puts the old department back (spec §5, §6; P3-R7; Review Focus 1)", async () => {
  assert.equal((await transferWith({ employees: holderDepartment("dept-9") }, moveBody)).status, 201)
  const record = written("assetTransfer.create")[0]
  const transactionId = String(record.id)
  assert.deepEqual(written("assetMovement.create").filter((row) => row.movementType === "department_change"), [transferDepartmentLine("dept-9", transactionId)])
  const update = written("asset.update")[0]
  const createdAt = new Date("2026-10-07T03:00:01Z")
  // The asset as the save left it (the fake update's updatedAt). The save's lines are dated after the TR- row, so only
  // their reference keeps them out of the downstream check.
  const afterAsset = {
    id: "asset-1", updatedAt: new Date("2026-10-07T03:00:00Z"), statusId: update.statusId, conditionId: "condition-good", branchId: "branch-1",
    currentLocationId: update.currentLocationId, custodianId: update.custodianId, departmentId: update.departmentId,
  }
  const lines: Array<Record<string, unknown> & { performedAt: Date }> = written("assetMovement.create").map((row) => ({ ...row, performedAt: new Date(createdAt.getTime() + 1_000) }))
  const restored: Array<Record<string, unknown>> = []
  // Only the calls the cancellation repository makes for a TR- with no components.
  const repository = (movements: typeof lines) => {
    const db = {
      $transaction: async (work: (tx: unknown) => Promise<unknown>) => work(db),
      assetTransfer: {
        findUnique: async () => ({
          id: record.id, assetId: "asset-1", transactionStatus: "active", createdAt, updatedAt: createdAt,
          beforeSnapshotJson: record.beforeSnapshotJson, afterSnapshotJson: record.afterSnapshotJson, voidedAt: null,
        }),
        count: async () => 0,
        updateMany: async () => ({ count: 1 }),
      },
      assetCheckout: { count: async () => 0 },
      assetCheckin: { count: async () => 0 },
      asset: {
        findUnique: async () => afterAsset,
        updateMany: async ({ data }: { data: Record<string, unknown> }) => {
          restored.push(data)
          return { count: 1 }
        },
      },
      assetMovement: {
        findMany: async ({ where }: { where: { assetId: string; performedAt: { gt: Date }; NOT: { referenceType: string; referenceId: string } } }) =>
          movements.filter((row) => row.assetId === where.assetId && row.performedAt > where.performedAt.gt
            && !(row.referenceType === where.NOT.referenceType && row.referenceId === where.NOT.referenceId)).map((row) => ({ movementType: row.movementType })),
        create: async () => ({ id: "movement-cancel" }),
      },
      systemLog: { create: async () => ({}) },
    }
    return createPrismaAssetTransactionCancellationRepository(db as never)
  }
  assert.deepEqual(await previewAssetTransactionCancellation({ type: "transfer", transactionId }, repository(lines)), { eligible: true })
  // Without the transfer's reference the same line would be later work, and the TR- could not be cancelled.
  const unreferenced = lines.map((row) => (row.movementType === "department_change" ? { ...row, referenceId: "other-document" } : row))
  assert.deepEqual(await previewAssetTransactionCancellation({ type: "transfer", transactionId }, repository(unreferenced)), { eligible: false, reasons: ["downstream_work"] })
  const result = await cancelAssetTransaction(
    { type: "transfer", transactionId, userId: "user-9", reason: "บันทึกผิดห้อง", expectedUpdatedAt: createdAt.toISOString() },
    repository(lines),
  )
  assert.equal(result.status, "cancelled", JSON.stringify(result))
  assert.deepEqual([restored[0].departmentId, restored[0].currentLocationId, restored[0].custodianId], ["dept-1", "location-1", "emp-9"])
})
