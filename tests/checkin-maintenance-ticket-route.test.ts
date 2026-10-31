import assert from "node:assert/strict"
import { existsSync } from "node:fs"
import * as nodeModule from "node:module"
import { beforeEach, test } from "node:test"
import { pathToFileURL } from "node:url"

type Department = { id: string; code: string; name: string; isActive: boolean }
type CheckinState = {
  calls: Array<{ call: string; args: Record<string, unknown> }>
  openRecords: number
  openRecordCounts: number[]
  // The open handover the transaction reads; a temporary loan in Checked Out unless a test sets another.
  checkout: { handoverMode: string; statusName: string } | null
  // The asset's own fields a test changes (ownershipType, departmentId).
  assetOverrides: Record<string, unknown>
  // The saved checkin_department_code (null: no row).
  checkinDepartmentSetting: string | null
  // The department master.
  departments: Department[]
  // One-off answers to department.findFirst.
  departmentAnswers: Array<{ id: string; code: string; name: string } | null>
  syncChanges: Array<Record<string, unknown>>
  audits: Array<{ action: string; newValue: Record<string, unknown> }>
}
const itDepartment: Department = { id: "dept-it", code: "IT", name: "Information Technology", isActive: true }
const state: CheckinState = {
  calls: [], openRecords: 0, openRecordCounts: [], checkout: null,
  assetOverrides: {}, checkinDepartmentSetting: null, departments: [{ ...itDepartment }], departmentAnswers: [], syncChanges: [], audits: [],
}
Object.assign(globalThis, { __checkinTicketState: state })

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
  ["@/lib/audit-log", `export async function logAudit(entry) { globalThis.__checkinTicketState.audits.push(entry) }`],
  ["@/lib/asset-status-flow", `export async function isValidCheckinReturnStatus() { return true }`],
  ["@/lib/operation-document-number", `export async function generateCheckinDocumentNo() { return "RT-202610-0001" }`],
  ["@/lib/asset-component-sync", `
    export async function syncInstalledComponentsWithParent(_tx, args) {
      globalThis.__checkinTicketState.syncChanges.push(args.changes)
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
    const state = () => globalThis.__checkinTicketState
    const baseAsset = {
      id: "asset-1",
      statusId: "status:Checked Out",
      conditionId: "condition-good",
      branchId: "branch-1",
      currentLocationId: "loc-1",
      custodianId: "emp-5",
      departmentId: "dept-1",
      ownershipType: "personal",
      updatedAt: new Date("2026-10-01T00:00:00Z"),
    }
    const asset = () => ({ ...baseAsset, ...state().assetOverrides })
    function model(name) {
      return new Proxy({}, {
        get(_target, method) {
          return async (args) => {
            state().calls.push({ call: name + "." + String(method), args: args ?? {} })
            if (name === "asset" && (method === "findFirst" || method === "findUnique")) return asset()
            if (name === "asset" && method === "update") return { ...asset(), ...(args?.data ?? {}), updatedAt: new Date("2026-10-07T03:00:00Z") }
            if (name === "assetCheckout" && method === "findFirst") {
              const checkout = state().checkout ?? { handoverMode: "temporary_loan", statusName: "Checked Out" }
              return { id: "co-1", assetId: "asset-1", handoverMode: checkout.handoverMode, custodianId: "emp-5", asset: { status: { name: checkout.statusName } } }
            }
            if (name === "assetCondition") return { name: "Damaged", isActive: true }
            if (name === "assetStatus") {
              const id = args?.where?.id ?? "status:Ready"
              return { id, name: String(id).replace("status:", "") }
            }
            if (method === "updateMany") return { count: 1 }
            if (name === "maintenanceTicket" && method === "count") return state().openRecordCounts.shift() ?? state().openRecords
            if (name === "systemSetting" && method === "findUnique") {
              const value = state().checkinDepartmentSetting
              return args?.where?.key === "checkin_department_code" && value !== null ? { value } : null
            }
            if (name === "department" && method === "findFirst") {
              if (state().departmentAnswers.length > 0) return state().departmentAnswers.shift()
              const found = state().departments.find((department) => department.code === args?.where?.code && department.isActive === args?.where?.isActive)
              return found ? { id: found.id, code: found.code, name: found.name } : null
            }
            if (method === "count") return 0
            if (method === "findMany") return []
            if (method === "findFirst" || method === "findUnique") return null
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

const route = await import(pathToFileURL("src/app/api/assets/[id]/checkin/route.ts").href) as {
  POST(request: Request, context: { params: Promise<{ id: string }> }): Promise<Response>
}

function checkinRequest(nextStatusId: string, extra: Record<string, unknown> = {}) {
  return new Request("http://localhost/api/assets/asset-1/checkin", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      checkoutId: "co-1",
      returnDate: "2026-10-07",
      returnBy: "สมชาย",
      receiveBy: "สมหญิง",
      conditionAfter: "condition-damaged",
      damageNote: "จอแตก",
      nextStatusId,
      nextLocationId: "loc-1",
      ...extra,
    }),
  })
}

const context = { params: Promise.resolve({ id: "asset-1" }) }
beforeEach(() => {
  Object.assign(state, { assetOverrides: {}, checkinDepartmentSetting: null, departments: [{ ...itDepartment }], departmentAnswers: [], syncChanges: [], audits: [] })
})

test("returning an asset as 'send for repair' opens an unfinished repair record", async () => {
  state.calls = []
  state.openRecords = 0
  const response = await route.POST(checkinRequest("status:Under Maintenance"), context)

  assert.equal(response.status, 201, await response.clone().text())
  const ticket = state.calls.find(({ call }) => call === "maintenanceTicket.create")?.args.data as Record<string, unknown>
  assert.equal(ticket.repairStatus, "in_progress")
  assert.equal(ticket.reportedById, "emp-1")
  assert.match(String(ticket.problem), /จอแตก/)
})

const repairStatusRequired = {
  code: "ASSET_CHECKIN_REPAIR_STATUS_REQUIRED",
  error: "ASSET_CHECKIN_REPAIR_STATUS_REQUIRED",
  fieldErrors: { nextStatusId: "checkinRepairStatusRequired" },
}

test("an asset with an unfinished repair record is returned into ส่งซ่อม under that repair, with no second record (S-R43)", async () => {
  state.calls = []
  state.openRecords = 1
  const response = await route.POST(checkinRequest("status:Under Maintenance"), context)

  assert.equal(response.status, 201, await response.clone().text())
  const update = state.calls.find(({ call }) => call === "asset.update")?.args.data as Record<string, unknown>
  assert.equal(update.statusId, "status:Under Maintenance")
  assert.equal(state.calls.some(({ call }) => call === "maintenanceTicket.create"), false)
  assert.equal(state.calls.some(({ call, args }) => call === "assetMovement.create" && (args.data as Record<string, unknown>)?.movementType === "maintenance_create"), false)
  state.openRecords = 0
})

test("with an unfinished repair record another next status than ส่งซ่อม is refused under that field, and nothing is written (S-R43)", async () => {
  state.calls = []
  state.openRecords = 1
  const response = await route.POST(checkinRequest("status:Ready"), context)

  assert.equal(response.status, 409)
  assert.deepEqual(await response.json(), repairStatusRequired)
  assert.deepEqual(state.calls.filter(({ call }) => /\.(create|update|updateMany)$/.test(call)), [])
  state.openRecords = 0
})

test("a repair opened while the return is being saved refuses a next status other than ส่งซ่อม inside the transaction (S-R43)", async () => {
  state.calls = []
  state.openRecordCounts = [0, 1]
  const response = await route.POST(checkinRequest("status:Ready"), context)

  assert.equal(response.status, 409)
  assert.deepEqual(await response.json(), repairStatusRequired)
  assert.equal(state.calls.some(({ call }) => call === "assetCheckin.create"), false)
  state.openRecordCounts = []
})

test("a permanent handover whose asset went into repair is returned into ส่งซ่อม under that repair, and the handover is closed (S-R48)", async () => {
  state.calls = []
  state.openRecords = 1
  state.checkout = { handoverMode: "permanent_assignment", statusName: "Under Maintenance" }
  const response = await route.POST(checkinRequest("status:Under Maintenance"), context)

  assert.equal(response.status, 201, await response.clone().text())
  const closed = state.calls.find(({ call }) => call === "assetCheckout.update")?.args as { where: { id: string }; data: Record<string, unknown> }
  assert.deepEqual([closed.where.id, closed.data.isReturned], ["co-1", true])
  const update = state.calls.find(({ call }) => call === "asset.update")?.args.data as Record<string, unknown>
  assert.deepEqual([update.statusId, update.custodianId], ["status:Under Maintenance", null])
  assert.equal(state.calls.some(({ call }) => call === "maintenanceTicket.create"), false)
  state.openRecords = 0
  state.checkout = null
})

test("a permanent handover under repair still has to go into ส่งซ่อม: another next status is refused under that field (S-R48, S-R43)", async () => {
  state.calls = []
  state.openRecords = 1
  state.checkout = { handoverMode: "permanent_assignment", statusName: "Under Maintenance" }
  const response = await route.POST(checkinRequest("status:Ready"), context)

  assert.equal(response.status, 409)
  assert.deepEqual(await response.json(), repairStatusRequired)
  assert.deepEqual(state.calls.filter(({ call }) => /\.(create|update|updateMany)$/.test(call)), [])
  state.openRecords = 0
  state.checkout = null
})

test("a permanent handover in Under Maintenance without an open repair is refused as a status mismatch, as before (S-R48)", async () => {
  state.calls = []
  state.openRecords = 0
  state.checkout = { handoverMode: "permanent_assignment", statusName: "Under Maintenance" }
  const response = await route.POST(checkinRequest("status:Under Maintenance"), context)

  assert.equal(response.status, 409, await response.clone().text())
  assert.deepEqual(await response.json(), { code: "ASSET_HANDOVER_STATUS_MISMATCH", error: "ASSET_HANDOVER_STATUS_MISMATCH" })
  assert.equal(state.calls.some(({ call }) => call === "assetCheckin.create"), false)
  state.checkout = null
})

test("returning to Ready does not create a repair record", async () => {
  state.calls = []
  const response = await route.POST(checkinRequest("status:Ready"), context)

  assert.equal(response.status, 201, await response.clone().text())
  assert.equal(state.calls.some(({ call }) => call === "maintenanceTicket.create"), false)
})

test("a long damage note is capped to the movement reason column but kept in full on the repair record", async () => {
  state.calls = []
  state.openRecords = 0
  const longNote = "ก".repeat(600)
  const response = await route.POST(checkinRequest("status:Under Maintenance", { damageNote: longNote }), context)

  assert.equal(response.status, 201, await response.clone().text())
  const movement = state.calls.find(({ call, args }) =>
    call === "assetMovement.create" && (args.data as Record<string, unknown>)?.movementType === "maintenance_create",
  )?.args.data as Record<string, unknown>
  assert.equal(String(movement.reason).length, 500)
  const ticket = state.calls.find(({ call }) => call === "maintenanceTicket.create")?.args.data as Record<string, unknown>
  assert.ok(String(ticket.problem).includes(longNote))
})

const written = (call: string) => state.calls.filter((entry) => entry.call === call).map((entry) => entry.args.data as Record<string, unknown>)
const departmentLines = () => written("assetMovement.create").filter((row) => row.movementType === "department_change")
const departmentUnavailable = { code: "ASSET_CHECKIN_DEPARTMENT_UNAVAILABLE", error: "ASSET_CHECKIN_DEPARTMENT_UNAVAILABLE" }

test("a return gives a บุคคล or Stock asset and its components the return department, with a department_change line and both departments in the log (group 3 spec §6, §12, P2-R7)", async () => {
  for (const ownershipType of ["personal", "stock"]) {
    state.calls = []
    state.syncChanges = []
    state.audits = []
    state.assetOverrides = { ownershipType }
    const response = await route.POST(checkinRequest("status:Ready"), context)
    assert.equal(response.status, 201, await response.clone().text())
    assert.equal(written("asset.update")[0].departmentId, "dept-it", ownershipType)
    assert.equal(state.syncChanges[0].departmentId, "dept-it", ownershipType)
    assert.deepEqual(departmentLines(), [{
      assetId: "asset-1", movementType: "department_change", fromValue: "dept-1", toValue: "dept-it", reason: "Asset checkin",
      referenceType: "checkin", referenceId: "assetCheckin-new", performedBy: "user-1",
    }], ownershipType)
    assert.deepEqual([state.audits[0].action, state.audits[0].newValue.departmentId, state.audits[0].newValue.previousDepartmentId], ["checkin", "dept-it", "dept-1"], ownershipType)
  }
})

test("ส่วนกลาง, ส่วนควบ and License keep their department, and an asset already in the return department changes nothing: no department_change line (spec §6, decision 10, P2-R7)", async () => {
  const cases: Array<{ ownershipType: string; departmentId?: string }> = [
    { ownershipType: "shared" }, { ownershipType: "component" }, { ownershipType: "software_license" }, { ownershipType: "personal", departmentId: "dept-it" },
  ]
  for (const overrides of cases) {
    state.calls = []
    state.syncChanges = []
    state.audits = []
    state.assetOverrides = overrides
    const kept = overrides.departmentId ?? "dept-1"
    assert.equal((await route.POST(checkinRequest("status:Ready"), context)).status, 201, JSON.stringify(overrides))
    assert.equal(written("asset.update")[0].departmentId, kept, JSON.stringify(overrides))
    assert.equal(state.syncChanges[0].departmentId, kept, JSON.stringify(overrides))
    assert.deepEqual(departmentLines(), [], JSON.stringify(overrides))
    assert.deepEqual([state.audits[0].newValue.departmentId, state.audits[0].newValue.previousDepartmentId], [kept, kept], JSON.stringify(overrides))
  }
})

test("the return department is the one the setting names, upper-cased, and the RT- snapshots carry the department before and after (spec §12, P2-R8)", async () => {
  state.calls = []
  state.checkinDepartmentSetting = " fin "
  state.departments = [{ ...itDepartment }, { id: "dept-fin", code: "FIN", name: "Finance", isActive: true }]
  assert.equal((await route.POST(checkinRequest("status:Ready"), context)).status, 201)
  assert.equal(written("asset.update")[0].departmentId, "dept-fin")
  const finalized = written("assetCheckin.update")[0]
  assert.deepEqual(
    [JSON.parse(String(finalized.beforeSnapshotJson)).departmentId, JSON.parse(String(finalized.afterSnapshotJson)).departmentId],
    ["dept-1", "dept-fin"],
  )
})

test("a missing or inactive return department refuses every return, ส่วนกลาง included, before anything is written (spec §6, §12, P2-R8)", async () => {
  const cases: Array<[Department[], string]> = [[[], "personal"], [[{ ...itDepartment, isActive: false }], "personal"], [[], "shared"]]
  for (const [departments, ownershipType] of cases) {
    state.calls = []
    state.departments = departments
    state.assetOverrides = { ownershipType }
    const response = await route.POST(checkinRequest("status:Ready"), context)
    assert.deepEqual([response.status, await response.json()], [409, departmentUnavailable], ownershipType)
    assert.deepEqual(state.calls.filter(({ call }) => /\.(create|update|updateMany)$/.test(call)), [], ownershipType)
  }
})

test("a return department closed while the return is saved is refused inside the transaction, before the RT- record (spec §12, P2-R8)", async () => {
  state.calls = []
  state.departmentAnswers = [{ id: "dept-it", code: "IT", name: "Information Technology" }, null]
  const response = await route.POST(checkinRequest("status:Ready"), context)
  assert.deepEqual([response.status, await response.json()], [409, departmentUnavailable])
  const calls = state.calls.map(({ call }) => call)
  const reads = calls.flatMap((call, index) => (call === "department.findFirst" ? [index] : []))
  assert.equal(reads.length, 2)
  assert.ok(reads[1] > calls.lastIndexOf("assetCheckout.findFirst"), "read again inside the transaction")
  assert.equal(calls.includes("assetCheckin.create"), false)
  assert.equal(calls.includes("asset.update"), false)
})
