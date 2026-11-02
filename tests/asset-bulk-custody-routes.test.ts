import assert from "node:assert/strict"
import { existsSync, readFileSync } from "node:fs"
import * as nodeModule from "node:module"
import { beforeEach, test } from "node:test"
import { pathToFileURL } from "node:url"

type MockAsset = {
  id: string
  statusName: string
  custodianId: string | null
  currentLocationId: string
  departmentId: string | null
  ownershipType?: string
  /** False for a deactivated or deleted asset; the active-asset read leaves it out (plan 4 final review server-3). */
  isActive?: boolean
}

type MockEmployee = { id: string; departmentId: string | null; isActive: boolean }

type BulkCustodyState = {
  assets: MockAsset[]
  /** The employees an `employee.findFirst` / `findUnique` reads; an active read leaves out an inactive one. */
  employees: MockEmployee[]
  activeCheckoutAssetIds: string[]
  calls: Array<{ call: string; args: unknown }>
  /** Component asset ids with an outstanding link; each `assetComponent.findMany` takes the next of `outstandingAnswers` first, if any. */
  outstandingAssetIds: string[]
  outstandingAnswers: string[][]
  /** Rooms that are inactive; each `location.findFirst` takes the next of `locationAnswers` first (true = active), if any. */
  inactiveLocationIds: string[]
  locationAnswers: boolean[]
  /** Each component sync takes the next answer, else zeros. */
  syncAnswers: Array<{ updated: number; skipped: number; movements: number }>
  /** Each `assetCheckout.findMany` takes the next of `checkoutAnswers` first (the asset ids with an open handover), if any. */
  checkoutAnswers: string[][]
  /** Runs when a transaction starts: another request's write that lands after the reads before it. */
  onTransaction: (() => void) | null
  /** Each `$transaction` throws the next of these first, if any (a deadlock victim). */
  transactionErrors: unknown[]
}

const state: BulkCustodyState = { assets: [], employees: [], activeCheckoutAssetIds: [], calls: [], outstandingAssetIds: [], outstandingAnswers: [], inactiveLocationIds: [], locationAnswers: [], syncAnswers: [], checkoutAnswers: [], onTransaction: null, transactionErrors: [] }
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
    export async function syncInstalledComponentsWithParent(_tx, input) {
      const state = globalThis.__bulkCustodyState
      state.calls.push({ call: "sync", args: input })
      const answer = state.syncAnswers.length > 0 ? state.syncAnswers.shift() : { updated: 0, skipped: 0, movements: 0 }
      return { ...answer, componentSnapshots: [] }
    }
  `],
  ["@/lib/db", `
    const state = () => globalThis.__bulkCustodyState
    const toRow = (asset) => ({
      id: asset.id,
      assetTag: asset.id.toUpperCase(),
      name: "Laptop",
      ...(asset.ownershipType ? { ownershipType: asset.ownershipType } : {}),
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
              const where = args?.where ?? {}
              const ids = where.id?.in ?? []
              return state().assets
                .filter((asset) => ids.includes(asset.id))
                .filter((asset) => where.isActive === undefined || (asset.isActive ?? true) === where.isActive)
                .filter((asset) => where.currentLocationId === undefined || asset.currentLocationId === where.currentLocationId)
                .map(toRow)
            }
            if (name === "asset" && method === "findFirst") {
              if (args?.where?.serialNumber) return null
              const asset = state().assets.find((item) => item.id === args?.where?.id)
              return asset ? toRow(asset) : null
            }
            if (name === "asset" && method === "updateMany") {
              const asset = state().assets.find((item) => item.id === args?.where?.id)
              if (asset && args?.where?.currentLocationId !== undefined && asset.currentLocationId !== args.where.currentLocationId) return { count: 0 }
              return { count: 1 }
            }
            if (name === "asset" && method === "update") {
              const asset = state().assets.find((item) => item.id === args?.where?.id)
              return { ...toRow(asset), ...(args?.data ?? {}) }
            }
            if (name === "assetCheckout" && method === "findMany") {
              const ids = args?.where?.assetId?.in ?? []
              const open = state().checkoutAnswers.length > 0 ? state().checkoutAnswers.shift() : state().activeCheckoutAssetIds
              return open.filter((id) => ids.includes(id)).map((assetId) => ({ id: "co-" + assetId, assetId }))
            }
            if (name === "assetCheckout" && (method === "findFirst" || method === "count")) {
              const active = state().activeCheckoutAssetIds.includes(args?.where?.assetId)
              return method === "count" ? (active ? 1 : 0) : active ? { id: "co-" + args.where.assetId } : null
            }
            if (name === "assetComponent" && method === "findMany") {
              const out = state().outstandingAnswers.length > 0 ? state().outstandingAnswers.shift() : state().outstandingAssetIds
              return out.filter((id) => (args?.where?.componentAssetId?.in ?? []).includes(id)).map((componentAssetId) => ({ componentAssetId, componentAsset: { assetTag: componentAssetId.toUpperCase() } }))
            }
            if (name === "assetStatus") return { id: args?.where?.id, name: String(args?.where?.id ?? "").replace("status:", ""), isActive: true }
            if (name === "assetCondition") return { id: "condition-good", name: "Good", isActive: true }
            if (name === "employee" && (method === "findFirst" || method === "findUnique")) {
              const employee = state().employees.find((item) => item.id === args?.where?.id)
              if (!employee || (args?.where?.isActive === true && !employee.isActive)) return null
              return { id: employee.id, departmentId: employee.departmentId, isActive: employee.isActive }
            }
            if (name === "location" && method === "findFirst") {
              const active = state().locationAnswers.length > 0 ? state().locationAnswers.shift() : !state().inactiveLocationIds.includes(args?.where?.id)
              return active ? { id: args?.where?.id ?? "row-1" } : null
            }
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
        if (key === "$transaction") return async (callback, options) => {
          state().calls.push({ call: "$transaction", args: options })
          if (state().transactionErrors.length > 0) throw state().transactionErrors.shift()
          state().onTransaction?.()
          return callback(client)
        }
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
const callNames = () => state.calls.map(({ call }) => call)
const callsOf = (name: string) => state.calls.filter(({ call }) => call === name).map(({ args }) => args)
const moveBulk = (assetIds: string[], toLocationId = "loc-2") => bulkMoveRoute.POST(jsonRequest("POST", { assetIds, toLocationId, reason: "ย้ายคลัง" }))
const blockedEntry = (assetId: string, code: string) => ({ assetId, assetTag: assetId.toUpperCase(), code })
const inactiveRoom = { code: "ASSET_TRANSFER_DESTINATION_INACTIVE", error: "ASSET_TRANSFER_DESTINATION_INACTIVE", fieldErrors: { toLocationId: "checkoutLocationInactive" } }

beforeEach(() => {
  state.assets = [
    { id: "ready-1", statusName: "Ready", custodianId: null, currentLocationId: "loc-1", departmentId: "dept-1" },
    { id: "loaned-1", statusName: "Checked Out", custodianId: "emp-5", currentLocationId: "loc-1", departmentId: "dept-1" },
    { id: "disposed-1", statusName: "Disposed", custodianId: null, currentLocationId: "loc-yard", departmentId: "dept-1" },
    { id: "license-1", statusName: "Ready", custodianId: null, currentLocationId: "loc-1", departmentId: "dept-1", ownershipType: "software_license" },
    { id: "component-1", statusName: "Ready", custodianId: null, currentLocationId: "loc-1", departmentId: "dept-1", ownershipType: "component" },
  ]
  state.employees = [
    { id: "emp-2", departmentId: "dept-2", isActive: true },
    { id: "emp-5", departmentId: "dept-5", isActive: true },
    { id: "emp-9", departmentId: "dept-9", isActive: true },
    { id: "emp-gone", departmentId: "dept-9", isActive: false },
  ]
  state.activeCheckoutAssetIds = ["loaned-1"]
  state.calls = []
  state.outstandingAssetIds = []
  state.outstandingAnswers = []
  state.inactiveLocationIds = []
  state.locationAnswers = []
  state.syncAnswers = []
  state.checkoutAnswers = []
  state.onTransaction = null
  state.transactionErrors = []
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

test("bulk move refuses written-off assets, the code as its error (group 3 spec §10.3; P4-R4)", async () => {
  const response = await bulkMoveRoute.POST(jsonRequest("POST", { assetIds: ["disposed-1"], toLocationId: "loc-2", reason: "ย้ายคลัง" }))

  assert.equal(response.status, 409)
  assert.deepEqual(await response.json(), { code: "ASSET_STATUS_TRANSFER_NOT_ALLOWED", error: "ASSET_STATUS_TRANSFER_NOT_ALLOWED", blocked: [blockedEntry("disposed-1", "ASSET_STATUS_TRANSFER_NOT_ALLOWED")] })
  assert.deepEqual(assetWrites(), [])
})

test("bulk move refuses a License, named per asset as a written-off asset is (server-search spec 6.5)", async () => {
  const response = await bulkMoveRoute.POST(jsonRequest("POST", { assetIds: ["ready-1", "license-1"], toLocationId: "loc-2", reason: "ย้ายคลัง" }))
  assert.equal(response.status, 409)
  assert.deepEqual(await response.json(), {
    code: "ASSET_LICENSE_MOVE_NOT_ALLOWED", error: "ASSET_LICENSE_MOVE_NOT_ALLOWED",
    blocked: [{ assetId: "license-1", assetTag: "LICENSE-1", code: "ASSET_LICENSE_MOVE_NOT_ALLOWED" }],
  })
  assert.deepEqual(assetWrites(), [])
})

test("one 409 names every refused asset with its own code, in the verdict's order: outstanding, License, open handover, written off (group 3 spec §10.2, §10.3; P4-R4, P4-R5)", async () => {
  state.outstandingAssetIds = ["component-1"]
  const response = await moveBulk(["disposed-1", "loaned-1", "ready-1", "license-1", "component-1"])
  assert.equal(response.status, 409)
  assert.deepEqual(await response.json(), {
    code: "ASSET_COMPONENT_OUTSTANDING", error: "ASSET_COMPONENT_OUTSTANDING",
    blocked: [
      blockedEntry("component-1", "ASSET_COMPONENT_OUTSTANDING"),
      blockedEntry("license-1", "ASSET_LICENSE_MOVE_NOT_ALLOWED"),
      blockedEntry("loaned-1", "ASSET_ACTIVE_CHECKOUT_EXISTS"),
      blockedEntry("disposed-1", "ASSET_STATUS_TRANSFER_NOT_ALLOWED"),
    ],
  })
  assert.equal(callNames().filter((call) => call === "assetComponent.findMany").length, 1, "one outstanding read, no throw before the other reasons")
  for (const call of ["$transaction", "location.findFirst", "asset.updateMany", "assetMovement.createMany"]) assert.equal(callNames().includes(call), false, call)
})

test("each refused asset is named once under its first reason, request order within one code, and the first code leads the answer (group 3 spec §10.3; P4-R4)", async () => {
  state.activeCheckoutAssetIds = ["loaned-1", "disposed-1"]
  const response = await moveBulk(["disposed-1", "loaned-1", "license-1"])
  assert.equal(response.status, 409)
  assert.deepEqual(await response.json(), {
    code: "ASSET_LICENSE_MOVE_NOT_ALLOWED", error: "ASSET_LICENSE_MOVE_NOT_ALLOWED",
    blocked: [
      blockedEntry("license-1", "ASSET_LICENSE_MOVE_NOT_ALLOWED"),
      blockedEntry("disposed-1", "ASSET_ACTIVE_CHECKOUT_EXISTS"),
      blockedEntry("loaned-1", "ASSET_ACTIVE_CHECKOUT_EXISTS"),
    ],
  })
})

test("bulk move still moves Ready assets of the other ownership types, a ส่วนควบ included (group 3 spec §10.2; P4-R15)", async () => {
  const response = await bulkMoveRoute.POST(jsonRequest("POST", { assetIds: ["ready-1", "component-1"], toLocationId: "loc-2", reason: "ย้ายคลัง" }))
  assert.equal(response.status, 200)
  assert.deepEqual(await response.json(), { updated: 2, unchanged: 0, componentSync: { updated: 0, skipped: 0, movements: 0 } })
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

// The asset edit (group 4 plan 2, P2-R3, P2-R4, P2-R7, P2-R10).
const writeData = () => (assetWrites()[0]?.args as { data: Record<string, unknown> }).data
const editReady = (overrides: Record<string, unknown>) => registerEdit("ready-1", { statusId: "status:Ready", ...overrides })

test("a holder change without a reason is refused 400 under correctionReason, before any write", async () => {
  const response = await editReady({ custodianId: "emp-2" })
  assert.equal(response.status, 400)
  const body = await response.json() as { error: string; fieldErrors: unknown }
  assert.deepEqual(body.fieldErrors, { correctionReason: "required" })
  assert.equal(body.error, "Correction reason is required")
  assert.deepEqual(assetWrites(), [])
  assert.equal(callNames().includes("$transaction"), false)
})

test("a holder change with a reason saves the holder's department whatever the body sent, the movements and the sync under one reference", async () => {
  const response = await editReady({ custodianId: "emp-2", departmentId: "dept-1", correctionReason: "  ผิดคน  " })
  assert.equal(response.status, 200)
  assert.equal(assetWrites().length, 1)
  const write = assetWrites()[0].args as { where: Record<string, unknown>; data: Record<string, unknown> }
  assert.deepEqual(write.where, { id: "ready-1", isActive: true, statusId: "status:Ready", currentLocationId: "loc-1", custodianId: null, departmentId: "dept-1" })
  assert.equal(write.data.custodianId, "emp-2")
  assert.equal(write.data.departmentId, "dept-2")
  assert.equal("correctionReason" in write.data, false)
  const rows = (callsOf("assetMovement.createMany")[0] as { data: Array<{ movementType: string; reason: string | null; referenceType: string; referenceId: string }> }).data
  const corrections = rows.filter((row) => row.movementType.startsWith("register_") && row.movementType !== "register_field_correction")
  assert.deepEqual(corrections.map((row) => [row.movementType, row.reason]), [
    ["register_custodian_correction", "ผิดคน"],
    ["register_department_correction", "ผิดคน"],
  ])
  const referenceIds = new Set(rows.map((row) => row.referenceId))
  assert.equal(referenceIds.size, 1)
  assert.ok(rows.every((row) => row.referenceType === "register_edit"))
  const sync = callsOf("sync")[0] as { changes: Record<string, unknown>; referenceType: string; referenceId: string; reason: string; movementType: string }
  assert.equal(sync.movementType, "parent_register_update_sync")
  assert.equal(sync.changes.departmentId, "dept-2")
  assert.equal(sync.changes.custodianId, "emp-2")
  assert.equal(sync.referenceType, "register_edit")
  assert.equal(sync.referenceId, [...referenceIds][0])
  assert.equal(sync.reason, "ผิดคน")
  assert.deepEqual(callsOf("$transaction"), [{ maxWait: 10_000, timeout: 60_000 }])
  assert.equal(callsOf("systemLog.create").length, 1, "the admin log is written inside the transaction")
})

test("under an open handover a Serial change on an asset whose department differs from its holder's saves, the department kept (Review Focus 2)", async () => {
  const response = await registerEdit("loaned-1", { custodianId: "emp-5", departmentId: "dept-5", serialNumber: "SN-NEW" })
  assert.equal(response.status, 200)
  assert.equal(writeData().departmentId, "dept-1")
  assert.equal(writeData().custodianId, "emp-5")
  const rows = (callsOf("assetMovement.createMany")[0] as { data: Array<{ movementType: string }> }).data
  assert.equal(rows.some((row) => row.movementType === "register_department_correction"), false)
})

test("the automatic fix: a held asset's stale department follows its holder with no reason asked", async () => {
  state.assets[0].custodianId = "emp-5"
  const response = await editReady({ custodianId: "emp-5", serialNumber: "SN-NEW" })
  assert.equal(response.status, 200)
  assert.equal(writeData().departmentId, "dept-5")
  const rows = (callsOf("assetMovement.createMany")[0] as { data: Array<{ movementType: string; reason: string | null }> }).data
  assert.deepEqual(rows.filter((row) => row.movementType === "register_department_correction").map((row) => row.reason), [null])
})

test("under an open handover a new holder without a reason is refused by the custody lock (409) before the reason (400)", async () => {
  const response = await registerEdit("loaned-1", { custodianId: "emp-9" })
  assert.equal(response.status, 409)
  assert.equal((await response.json() as { code: string }).code, "ASSET_CUSTODY_LOCKED_BY_CHECKOUT")
  assert.deepEqual(assetWrites(), [])
})

test("an inactive or unknown new holder is refused 409 under custodianId", async () => {
  for (const custodianId of ["emp-gone", "emp-unknown"]) {
    const response = await editReady({ custodianId, correctionReason: "ผิดคน" })
    assert.equal(response.status, 409, custodianId)
    assert.deepEqual((await response.json() as { fieldErrors: unknown }).fieldErrors, { custodianId: "checkoutReceiverInactive" }, custodianId)
  }
  assert.deepEqual(assetWrites(), [])
})

test("PUT ignores isActive: a body with isActive false writes no isActive", async () => {
  const response = await editReady({ isActive: false, name: "Laptop 2" })
  assert.equal(response.status, 200)
  assert.equal("isActive" in writeData(), false)
})

const outstandingBlocked = (assetId: string) => ({ assetId, assetTag: assetId.toUpperCase(), code: "ASSET_COMPONENT_OUTSTANDING" })

test("bulk move names an outstanding component first and every other refused asset after it (group 3 spec §8.5, §10.2; P2-R17, P4-R4)", async () => {
  state.outstandingAssetIds = ["component-1"]
  const response = await bulkMoveRoute.POST(jsonRequest("POST", { assetIds: ["ready-1", "component-1", "license-1"], toLocationId: "loc-2", reason: "ย้ายคลัง" }))
  assert.equal(response.status, 409)
  assert.deepEqual(await response.json(), { code: "ASSET_COMPONENT_OUTSTANDING", error: "ASSET_COMPONENT_OUTSTANDING", blocked: [outstandingBlocked("component-1"), blockedEntry("license-1", "ASSET_LICENSE_MOVE_NOT_ALLOWED")] })
  assert.deepEqual(assetWrites(), [])
})

test("a link turned outstanding while the bulk move is saved is refused by the re-read after the claims, before any movement (P2-R17)", async () => {
  state.outstandingAnswers = [[], ["ready-1"]]
  const response = await bulkMoveRoute.POST(jsonRequest("POST", { assetIds: ["ready-1"], toLocationId: "loc-2", reason: "ย้ายคลัง" }))
  assert.equal(response.status, 409)
  assert.deepEqual((await response.json() as { blocked: unknown }).blocked, [outstandingBlocked("ready-1")])
  const calls = state.calls.map(({ call }) => call)
  assert.ok(calls.lastIndexOf("assetComponent.findMany") > calls.indexOf("asset.updateMany"), "read again after the claims")
  assert.equal(calls.includes("assetMovement.createMany"), false)
})

test("an open handover is named in the 409 with its own code, no longer an unnamed 400 (group 3 spec §10.2, §10.3; P4-R5)", async () => {
  const response = await moveBulk(["ready-1", "loaned-1"])
  assert.equal(response.status, 409)
  assert.deepEqual(await response.json(), { code: "ASSET_ACTIVE_CHECKOUT_EXISTS", error: "ASSET_ACTIVE_CHECKOUT_EXISTS", blocked: [blockedEntry("loaned-1", "ASSET_ACTIVE_CHECKOUT_EXISTS")] })
  assert.deepEqual(callsOf("assetCheckout.findMany"), [{ where: { assetId: { in: ["ready-1", "loaned-1"] }, isReturned: false, transactionStatus: "active" }, select: { assetId: true } }])
  assert.deepEqual(assetWrites(), [])
})

test("more than 100 assets are refused 400 under assetIds before any read, and 100 pass the check (group 3 spec §10.1, §10.3; P4-R10)", async () => {
  const ids = (count: number) => Array.from({ length: count }, (_, index) => `asset-${index + 1}`)
  const tooMany = await moveBulk(ids(101))
  assert.equal(tooMany.status, 400)
  assert.deepEqual(await tooMany.json(), { error: "Invalid request data", code: "VALIDATION_FAILED", fieldErrors: { assetIds: "outOfRange" } })
  assert.deepEqual(state.calls, [])
  const hundred = await moveBulk(ids(100))
  assert.equal(hundred.status, 409, "100 pass the schema; none of these ids is an active asset")
  assert.equal((await hundred.json() as { blocked: unknown[] }).blocked.length, 100)
})

test("an inactive room is refused 409 under toLocationId before the transaction (group 3 spec §5, §10.3; P4-R14)", async () => {
  state.inactiveLocationIds = ["loc-closed"]
  const response = await moveBulk(["ready-1"], "loc-closed")
  assert.equal(response.status, 409)
  assert.deepEqual(await response.json(), inactiveRoom)
  assert.deepEqual(callsOf("location.findFirst"), [{ where: { id: "loc-closed", isActive: true }, select: { id: true } }])
  assert.equal(callNames().includes("$transaction"), false)
  assert.deepEqual(assetWrites(), [])
})

test("a room closed while the move is saved is refused by the read inside the transaction, before any claim (group 3 spec §10.3; P4-R14)", async () => {
  state.locationAnswers = [true, false]
  const response = await moveBulk(["ready-1"])
  assert.equal(response.status, 409)
  assert.deepEqual(await response.json(), inactiveRoom)
  const calls = callNames()
  assert.ok(calls.lastIndexOf("location.findFirst") > calls.indexOf("$transaction"), "read again inside the transaction")
  for (const call of ["asset.updateMany", "assetMovement.createMany", "systemLog.createMany"]) assert.equal(calls.includes(call), false, call)
})

test("an asset already in the room is counted unchanged and gets no claim, movement, log or sync (group 3 spec §10.2; P4-R15)", async () => {
  state.assets[0].currentLocationId = "loc-2"
  const response = await moveBulk(["ready-1", "component-1"])
  assert.equal(response.status, 200)
  assert.deepEqual(await response.json(), { updated: 1, unchanged: 1, componentSync: { updated: 0, skipped: 0, movements: 0 } })
  assert.deepEqual(assetWrites().map(({ args }) => (args as { where: { id: string } }).where.id), ["component-1"])
  assert.deepEqual((callsOf("assetMovement.createMany")[0] as { data: Array<{ assetId: string }> }).data.map((row) => row.assetId), ["component-1"])
  assert.deepEqual((callsOf("systemLog.createMany")[0] as { data: Array<{ recordId: string }> }).data.map((row) => row.recordId), ["component-1"])
  assert.deepEqual(callsOf("sync").map((args) => (args as { parentAssetId: string }).parentAssetId), ["component-1"])
})

test("a selection already all in the room answers 200 after the room check, without a transaction (group 3 spec §10.2; P4-R15)", async () => {
  const response = await moveBulk(["ready-1", "component-1"], "loc-1")
  assert.equal(response.status, 200)
  assert.deepEqual(await response.json(), { updated: 0, unchanged: 2, componentSync: { updated: 0, skipped: 0, movements: 0 } })
  assert.equal(callsOf("location.findFirst").length, 1)
  for (const call of ["$transaction", "asset.updateMany", "assetMovement.createMany", "systemLog.createMany", "sync"]) assert.equal(callNames().includes(call), false, call)
})

test("every claim comes before the first component sync, writes only the room and who moved it, the answer sums the syncs, and the transaction allows 60 s (group 3 spec §6, §10.2; P4-R3, P4-R16)", async () => {
  state.syncAnswers = [{ updated: 2, skipped: 1, movements: 2 }, { updated: 0, skipped: 0, movements: 0 }]
  const response = await moveBulk(["ready-1", "component-1"])
  assert.equal(response.status, 200)
  assert.deepEqual(await response.json(), { updated: 2, unchanged: 0, componentSync: { updated: 2, skipped: 1, movements: 2 } })
  const calls = callNames()
  assert.ok(calls.lastIndexOf("asset.updateMany") < calls.indexOf("sync"), "a ticked component moves by its own claim, so its parent's sync finds it in the room")
  // Never the holder, the department, the branch or the tag (spec §6 "Unchanged (as today)"; Z22).
  assert.equal(assetWrites().length, 2)
  for (const { args } of assetWrites()) assert.deepEqual(Object.keys((args as { data: Record<string, unknown> }).data).sort(), ["currentLocationId", "updatedBy"])
  assert.deepEqual(callsOf("$transaction"), [{ maxWait: 10_000, timeout: 60_000 }])
  const rows = (callsOf("assetMovement.createMany")[0] as { data: Array<{ assetId: string; movementType: string; referenceType: string; referenceId: string }> }).data
  assert.deepEqual(rows.map((row) => [row.assetId, row.movementType, row.referenceType, row.referenceId]), [
    ["ready-1", "bulk_location_move", "bulk_move", "bulk_move"],
    ["component-1", "bulk_location_move", "bulk_move", "bulk_move"],
  ])
})

// The final review of plan 4 (server-1 … server-4).
test("an id that is not an active asset is named first with ASSET_NOT_ACTIVE, its tag read without the active filter, the id as the tag when no row exists; no unnamed 404 (plan 4 final review server-3, journeys-1)", async () => {
  state.assets.push({ id: "gone-1", statusName: "Ready", custodianId: null, currentLocationId: "loc-1", departmentId: "dept-1", isActive: false })
  const response = await moveBulk(["ready-1", "license-1", "gone-1", "no-such-id"])
  assert.equal(response.status, 409)
  assert.deepEqual(await response.json(), {
    code: "ASSET_NOT_ACTIVE", error: "ASSET_NOT_ACTIVE",
    blocked: [
      blockedEntry("gone-1", "ASSET_NOT_ACTIVE"),
      { assetId: "no-such-id", assetTag: "no-such-id", code: "ASSET_NOT_ACTIVE" },
      blockedEntry("license-1", "ASSET_LICENSE_MOVE_NOT_ALLOWED"),
    ],
  })
  const reads = callsOf("asset.findMany") as Array<{ where: Record<string, unknown> }>
  assert.deepEqual(reads[1].where, { id: { in: ["gone-1", "no-such-id"] } }, "the missing ids are read again without isActive")
  assert.deepEqual(assetWrites(), [])
  assert.equal(callNames().includes("$transaction"), false)
})

test("a claim matches the room read before the transaction, so an asset another request moved meanwhile fails the claim with ASSET_CHANGED_DURING_OPERATION before any movement (plan 4 final review server-1)", async () => {
  state.onTransaction = () => { state.assets[0].currentLocationId = "loc-9" }
  const response = await moveBulk(["ready-1"])
  assert.equal(response.status, 409)
  assert.equal((await response.json() as { code: string }).code, "ASSET_CHANGED_DURING_OPERATION")
  assert.deepEqual((callsOf("asset.updateMany")[0] as { where: unknown }).where, { id: "ready-1", isActive: true, statusId: "status:Ready", currentLocationId: "loc-1" })
  for (const call of ["assetMovement.createMany", "systemLog.createMany", "sync"]) assert.equal(callNames().includes(call), false, call)
})

test("an asset counted unchanged is read again inside the transaction; one moved out of the room meanwhile fails with ASSET_CHANGED_DURING_OPERATION (plan 4 final review server-1)", async () => {
  state.assets[0].currentLocationId = "loc-2"
  state.onTransaction = () => { state.assets[0].currentLocationId = "loc-7" }
  const response = await moveBulk(["ready-1", "component-1"])
  assert.equal(response.status, 409)
  assert.equal((await response.json() as { code: string }).code, "ASSET_CHANGED_DURING_OPERATION")
  const reread = (callsOf("asset.findMany") as Array<{ where: Record<string, unknown> }>).at(-1)
  assert.deepEqual(reread?.where, { id: { in: ["ready-1"] }, isActive: true, currentLocationId: "loc-2" })
  const calls = callNames()
  assert.ok(calls.lastIndexOf("asset.findMany") > calls.indexOf("$transaction"), "read inside the transaction")
  assert.equal(calls.includes("assetMovement.createMany"), false)
})

test("an open handover opened while the bulk move is saved is named by the re-read after the claims, with its tag, before any movement (plan 4 final review server-2)", async () => {
  state.checkoutAnswers = [[], ["component-1"]]
  const response = await moveBulk(["ready-1", "component-1"])
  assert.equal(response.status, 409)
  assert.deepEqual(await response.json(), { code: "ASSET_ACTIVE_CHECKOUT_EXISTS", error: "ASSET_ACTIVE_CHECKOUT_EXISTS", blocked: [blockedEntry("component-1", "ASSET_ACTIVE_CHECKOUT_EXISTS")] })
  const reads = callsOf("assetCheckout.findMany")
  assert.equal(reads.length, 2)
  assert.deepEqual(reads[1], { where: { assetId: { in: ["ready-1", "component-1"] }, isReturned: false, transactionStatus: "active" }, select: { assetId: true } })
  const calls = callNames()
  assert.ok(calls.lastIndexOf("assetCheckout.findMany") > calls.lastIndexOf("asset.updateMany"), "read again after the claims")
  for (const call of ["assetMovement.createMany", "systemLog.createMany", "sync"]) assert.equal(calls.includes(call), false, call)
})

test("the claims run in id order whatever the tick order, the movements keep the request's, and a deadlock victim runs the transaction again (plan 4 final review server-4)", async () => {
  state.transactionErrors = [{ code: "P2034" }]
  const response = await moveBulk(["ready-1", "component-1"])
  assert.equal(response.status, 200)
  assert.deepEqual(await response.json(), { updated: 2, unchanged: 0, componentSync: { updated: 0, skipped: 0, movements: 0 } })
  assert.deepEqual(callsOf("$transaction"), [{ maxWait: 10_000, timeout: 60_000 }, { maxWait: 10_000, timeout: 60_000 }])
  assert.deepEqual(assetWrites().map(({ args }) => (args as { where: { id: string } }).where.id), ["component-1", "ready-1"])
  assert.deepEqual((callsOf("assetMovement.createMany")[0] as { data: Array<{ assetId: string }> }).data.map((row) => row.assetId), ["ready-1", "component-1"])
  assert.match(readFileSync("src/app/api/assets/bulk-move/route.ts", "utf8"), /await withDeadlockRetry\(\(\) => prisma\.\$transaction\(async \(tx\) => \{/)
})
