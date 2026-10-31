import assert from "node:assert/strict"
import { existsSync } from "node:fs"
import * as nodeModule from "node:module"
import { afterEach, beforeEach, test } from "node:test"
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
  // The "module:action" pairs the signed-in user lacks.
  denied: string[]
  // The signed-in user's employee.
  employeeId: string | null
  handover: { checkoutDate: Date; remark: string | null }
  inactiveLocationIds: string[]
  // location.findFirst answers in call order while the queue is not empty.
  locationAnswers: Array<{ id: string } | null>
  // What claiming the handover answers.
  closeCount: number
}
const itDepartment: Department = { id: "dept-it", code: "IT", name: "Information Technology", isActive: true }
const state: CheckinState = {
  calls: [], openRecords: 0, openRecordCounts: [], checkout: null,
  assetOverrides: {}, checkinDepartmentSetting: null, departments: [{ ...itDepartment }], departmentAnswers: [], syncChanges: [], audits: [],
  denied: [], employeeId: "emp-1", handover: { checkoutDate: new Date("2026-10-01T03:00:00Z"), remark: null }, inactiveLocationIds: [], locationAnswers: [], closeCount: 1,
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
    const state = () => globalThis.__checkinTicketState
    export async function requireAuth() { return { id: "user-1", roles: ["system_admin"], permissions: [], employeeId: state().employeeId } }
    export function hasRole(user, role) { return user.roles.includes(role) }
    export function hasPermission(_user, module, action) { return !state().denied.includes(module + ":" + action) }
    export function requirePermission(user, module, action) { if (!hasPermission(user, module, action)) throw new Error("Forbidden: insufficient permissions") }
  `],
  ["@/lib/audit-log", `export async function logAudit(entry) { globalThis.__checkinTicketState.audits.push(entry) }`],
  ["@/lib/asset-status-flow", `export async function isValidCheckinReturnStatus() { return true }`],
  ["@/lib/operation-document-number", `export async function generateCheckinDocumentNo() { globalThis.__checkinTicketState.calls.push({ call: "documentNo", args: {} }); return "RT-202610-0001" }`],
  ["@/lib/asset-component-sync", `
    export async function syncInstalledComponentsWithParent(_tx, args) {
      globalThis.__checkinTicketState.syncChanges.push(args.changes)
      return { updated: 0, skipped: 0, movements: 0, componentSnapshots: [] }
    }
  `],
  ["@/lib/asset-operation-evidence", `
    export function optionalFormFile(formData, name) { const value = formData.get(name); return value instanceof File && value.size > 0 ? value : null }
    export function optionalFormText(formData, name) { const value = formData.get(name); return typeof value === "string" && value.trim() ? value.trim() : null }
    export function requiredFormText(formData, name) { const value = formData.get(name); return typeof value === "string" ? value : "" }
    export async function saveOperationEvidenceFile(file) {
      globalThis.__checkinTicketState.calls.push({ call: "evidence.save", args: { name: file.name } })
      return { fileName: "saved-" + file.name, originalName: file.name, fileType: file.type, fileSize: file.size, filePath: "uploads/" + file.name }
    }
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
              return { id: "co-1", assetId: "asset-1", handoverMode: checkout.handoverMode, custodianId: "emp-5", checkoutDate: state().handover.checkoutDate, remark: state().handover.remark, asset: { status: { name: checkout.statusName } } }
            }
            if (name === "assetCondition") return { name: "Damaged", isActive: true }
            if (name === "assetStatus") {
              const id = args?.where?.id ?? "status:Ready"
              return { id, name: String(id).replace("status:", "") }
            }
            if (name === "assetCheckout" && method === "updateMany") return { count: state().closeCount }
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
            if (name === "location" && method === "findFirst") { if (state().locationAnswers.length > 0) return state().locationAnswers.shift(); return args?.where?.isActive === true && !state().inactiveLocationIds.includes(args?.where?.id) ? { id: args.where.id } : null }
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
function resetReturnState(overrides: Partial<CheckinState> = {}) {
  Object.assign(state, {
    calls: [], openRecords: 0, openRecordCounts: [], checkout: null, denied: [], employeeId: "emp-1",
    handover: { checkoutDate: new Date("2026-10-01T03:00:00Z"), remark: null }, inactiveLocationIds: [], locationAnswers: [], closeCount: 1,
  }, overrides)
}
// Later tests (and later tasks' tests) start from the defaults whatever the previous one set.
afterEach(() => resetReturnState())

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
  const closed = state.calls.find(({ call }) => call === "assetCheckout.updateMany")?.args as { where: Record<string, unknown>; data: Record<string, unknown> }
  assert.deepEqual([closed.where, closed.data], [{ id: "co-1", assetId: "asset-1", isReturned: false, transactionStatus: "active" }, { isReturned: true }])
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

// Group 3 plan 2 Task 2: the return route's guards (P2-R13, P2-R14, P2-R15, P2-R18).
const statusAndBody = async (response: Response) => [response.status, await response.json()]
const wasCalled = (name: string) => state.calls.some(({ call }) => call === name)
const positionsOf = (name: string) => state.calls.flatMap(({ call }, index) => (call === name ? [index] : []))
const writeCalls = () => state.calls.map(({ call }) => call).filter((call) => /\.(create|update|updateMany)$/.test(call))
const parentUpdate = () => state.calls.find(({ call, args }) => call === "asset.update" && (args.where as { id?: string })?.id === "asset-1")?.args.data as Record<string, unknown>
// Bangkok's day `offset` days from now, as the form's date field sends it.
const bangkokDayFromToday = (offset: number) => new Date(Date.now() + 7 * 3_600_000 + offset * 86_400_000).toISOString().slice(0, 10)
const photoFile = (name = "front.jpg", type = "image/jpeg") => new File(["evidence"], name, { type })
function returnForm(fields: Record<string, string | string[]> = {}, files: Record<string, File> = { photoAfterFiles: photoFile() }) {
  const form = new FormData()
  const all = { checkoutId: "co-1", returnDate: bangkokDayFromToday(0), returnBy: "สมชาย", returnByEmployeeId: "emp-5", receiveBy: "สมหญิง", conditionAfter: "condition-damaged", nextStatusId: "status:Ready", nextLocationId: "loc-1", ...fields }
  for (const [key, value] of Object.entries(all)) for (const item of [value].flat()) form.append(key, item)
  for (const [key, file] of Object.entries(files)) form.append(key, file)
  return new Request("http://localhost/api/assets/asset-1/checkin", { method: "POST", body: form })
}
const returnDateRefusal = (code: string, key: string) => ({ code, error: code, fieldErrors: { returnDate: key } })
const roomInactive = { code: "ASSET_CHECKIN_LOCATION_INACTIVE", error: "ASSET_CHECKIN_LOCATION_INACTIVE", fieldErrors: { nextLocationId: "checkinLocationInactive" } }
const changedMeanwhile = { code: "ASSET_CHANGED_DURING_OPERATION", error: "Asset status changed while this request was being saved. Reload the asset and try again." }
const forbidden = { error: "Forbidden: insufficient permissions" }
const reporterRequired = { code: "MAINTENANCE_REPORTER_REQUIRED", error: "Select who is recording this repair" }
const returnerRequired = { error: "Invalid request data", code: "VALIDATION_FAILED", fieldErrors: { returnBy: "checkinMissingComponentReturnerRequired" } }

test("a return date later than today in Bangkok is refused under วันที่คืน before any file is saved or anything is written (group 3 spec §8.3, P2-R13, P2-R15)", async () => {
  resetReturnState()
  assert.deepEqual(await statusAndBody(await route.POST(returnForm({ returnDate: bangkokDayFromToday(2) }), context)),
    [400, returnDateRefusal("CHECKIN_RETURN_DATE_IN_FUTURE", "checkinReturnDateInFuture")])
  assert.equal(wasCalled("evidence.save"), false)
  assert.deepEqual(writeCalls(), [])
  // The form's "YYYY-MM-DD" and the API helpers' full ISO (e2e/cross-cutting/support/records.ts:114) both pass for today.
  for (const returnDate of [bangkokDayFromToday(0), new Date().toISOString()]) {
    resetReturnState()
    const response = await route.POST(checkinRequest("status:Ready", { returnDate }), context)
    assert.equal(response.status, 201, `${returnDate}: ${await response.clone().text()}`)
  }
})

test("a return date before the handover's Bangkok day is refused, the handover's own day passes, and a legacy-backfilled handover has no lower bound (P2-R13)", async () => {
  // 18:00 UTC on 1 October is 01:00 on 2 October in Bangkok: 1 October is before the handover although the UTC day says otherwise.
  resetReturnState({ handover: { checkoutDate: new Date("2026-10-01T18:00:00Z"), remark: "ส่งมอบให้ฝ่ายบัญชี" } })
  assert.deepEqual(await statusAndBody(await route.POST(checkinRequest("status:Ready", { returnDate: "2026-10-01" }), context)),
    [400, returnDateRefusal("CHECKIN_RETURN_DATE_BEFORE_HANDOVER", "checkinReturnDateBeforeHandover")])
  assert.deepEqual(writeCalls(), [])
  resetReturnState({ handover: { checkoutDate: new Date("2026-10-01T18:00:00Z"), remark: null } })
  assert.equal((await route.POST(checkinRequest("status:Ready", { returnDate: "2026-10-02" }), context)).status, 201)
  // The backfill dates its HO- the moment it is made, so an older return entered late still saves.
  resetReturnState({ handover: { checkoutDate: new Date(), remark: "legacy_return_backfill: Created from current custodian before check-in" } })
  assert.equal((await route.POST(checkinRequest("status:Ready", { returnDate: "2026-09-15" }), context)).status, 201)
})

test("an unknown or closed room is refused under เก็บไว้ที่ before any file is saved or anything is written (spec §8.3, P2-R15)", async () => {
  resetReturnState({ inactiveLocationIds: ["loc-closed"] })
  assert.deepEqual(await statusAndBody(await route.POST(returnForm({ nextLocationId: "loc-closed" }), context)), [409, roomInactive])
  assert.deepEqual(state.calls.find(({ call }) => call === "location.findFirst")?.args, { where: { id: "loc-closed", isActive: true }, select: { id: true } })
  assert.equal(wasCalled("evidence.save"), false)
  assert.deepEqual(writeCalls(), [])
})

test("a room closed while the return is saved is refused inside the transaction, before the handover is claimed (P2-R15)", async () => {
  resetReturnState({ locationAnswers: [{ id: "loc-1" }, null] })
  assert.deepEqual(await statusAndBody(await route.POST(checkinRequest("status:Ready"), context)), [409, roomInactive])
  const reads = positionsOf("location.findFirst")
  assert.equal(reads.length, 2)
  assert.ok(reads[1] > positionsOf("assetCheckout.findFirst")[1], "read again after the transaction's handover re-read")
  assert.deepEqual(writeCalls(), [])
})

test("a handover another desk returned meanwhile is refused 409 before the RT- number is taken (P2-R15, GP W1)", async () => {
  resetReturnState({ closeCount: 0 })
  assert.deepEqual(await statusAndBody(await route.POST(checkinRequest("status:Ready"), context)), [409, changedMeanwhile])
  assert.deepEqual(state.calls.find(({ call }) => call === "assetCheckout.updateMany")?.args, {
    where: { id: "co-1", assetId: "asset-1", isReturned: false, transactionStatus: "active" },
    data: { isReturned: true },
  })
  assert.equal(wasCalled("documentNo"), false)
  assert.deepEqual(writeCalls(), ["assetCheckout.updateMany"])
})

test("a return claims its handover once, after the transaction's re-read and before the RT- number, and the snapshots still record the close (P2-R15)", async () => {
  resetReturnState()
  assert.equal((await route.POST(checkinRequest("status:Ready"), context)).status, 201)
  const [claim] = positionsOf("assetCheckout.updateMany")
  assert.ok(claim > positionsOf("assetCheckout.findFirst")[1])
  assert.ok(claim < positionsOf("documentNo")[0])
  // In the transaction: Task 1's department read, then the room, then the claim.
  const [, departmentInTransaction] = positionsOf("department.findFirst")
  const [, roomInTransaction] = positionsOf("location.findFirst")
  assert.ok(departmentInTransaction < roomInTransaction && roomInTransaction < claim, `${departmentInTransaction} < ${roomInTransaction} < ${claim}`)
  assert.equal(wasCalled("assetCheckout.update"), false, "the handover is not written a second time")
  const finalized = state.calls.find(({ call }) => call === "assetCheckin.update")?.args.data as Record<string, string>
  assert.deepEqual([JSON.parse(finalized.beforeSnapshotJson).checkout, JSON.parse(finalized.afterSnapshotJson).checkout],
    [{ id: "co-1", isReturned: false }, { id: "co-1", isReturned: true }])
})

test("joining an open repair needs only asset:edit: without maintenance:create and without a reporter, the return goes into ส่งซ่อม under it (spec §5, call 3; P2-R14)", async () => {
  resetReturnState({ openRecords: 1, denied: ["maintenance:create"], employeeId: null })
  const response = await route.POST(checkinRequest("status:Under Maintenance"), context)
  assert.equal(response.status, 201, await response.clone().text())
  assert.equal(parentUpdate().statusId, "status:Under Maintenance")
  assert.equal(wasCalled("maintenanceTicket.create"), false)
})

test("a new ส่งซ่อม still needs maintenance:create and a reporter, refused before any file is saved or anything is written (spec §5; P2-R14)", async () => {
  resetReturnState({ denied: ["maintenance:create"] })
  assert.deepEqual(await statusAndBody(await route.POST(returnForm({ nextStatusId: "status:Under Maintenance" }), context)), [403, forbidden])
  assert.equal(wasCalled("evidence.save"), false)
  assert.deepEqual(writeCalls(), [])
  resetReturnState({ employeeId: null })
  assert.deepEqual(await statusAndBody(await route.POST(checkinRequest("status:Under Maintenance"), context)), [400, reporterRequired])
  assert.deepEqual(writeCalls(), [])
})

test("a repair that closed while the return was saved turns the join into a new record: the permission and the reporter are asked again inside the transaction (P2-R14, GP X9)", async () => {
  resetReturnState({ openRecordCounts: [1, 0], denied: ["maintenance:create"] })
  assert.deepEqual(await statusAndBody(await route.POST(checkinRequest("status:Under Maintenance"), context)), [403, forbidden])
  assert.equal(positionsOf("assetCheckout.findFirst").length, 2, "refused inside the transaction, not by the pre-check")
  assert.deepEqual(writeCalls(), [])
  resetReturnState({ openRecordCounts: [1, 0], employeeId: null })
  assert.deepEqual(await statusAndBody(await route.POST(checkinRequest("status:Under Maintenance"), context)), [400, reporterRequired])
  assert.equal(positionsOf("assetCheckout.findFirst").length, 2)
  assert.deepEqual(writeCalls(), [])
  resetReturnState({ openRecordCounts: [1, 0] })
  assert.equal((await route.POST(checkinRequest("status:Under Maintenance"), context)).status, 201)
  assert.equal(wasCalled("maintenanceTicket.create"), true, "with the right and a reporter, the record is created")
})

test("ผู้คืน must be an employee when a component did not come back: refused under ผู้คืน before the asset is read or a file is saved (spec §8.5, P2-R18)", async () => {
  resetReturnState()
  assert.deepEqual(await statusAndBody(await route.POST(checkinRequest("status:Ready", { missingComponentIds: ["comp-1"] }), context)), [400, returnerRequired])
  assert.equal(wasCalled("asset.findFirst"), false)
  resetReturnState()
  assert.deepEqual(await statusAndBody(await route.POST(returnForm({ returnByEmployeeId: "", missingComponentIds: ["comp-1", "comp-2"] }), context)), [400, returnerRequired])
  assert.equal(wasCalled("asset.findFirst"), false)
  assert.equal(wasCalled("evidence.save"), false)
})

test("the evidence files are saved once every check has passed, before the transaction, and are attached to the RT- (P2-R15, GP G16)", async () => {
  resetReturnState()
  const response = await route.POST(returnForm({}, {
    photoAfterFiles: photoFile(),
    returnSignatureFile: photoFile("return.png", "image/png"),
    receiveSignatureFile: photoFile("receive.png", "image/png"),
  }), context)
  assert.equal(response.status, 201, await response.clone().text())
  const saves = positionsOf("evidence.save")
  assert.equal(saves.length, 3)
  const [departmentRead] = positionsOf("department.findFirst")
  assert.ok(departmentRead !== undefined, "the return department is read before the transaction (Task 1)")
  for (const check of [positionsOf("location.findFirst")[0], positionsOf("maintenanceTicket.count")[0], departmentRead]) assert.ok(saves[0] > check, `save after call ${check}`)
  assert.ok(saves[2] < positionsOf("assetCheckout.findFirst")[1], "before the transaction")
  assert.deepEqual(state.calls.filter(({ call }) => call === "attachment.create").map(({ args }) => (args.data as Record<string, unknown>).filePath),
    ["uploads/front.jpg", "uploads/return.png", "uploads/receive.png"])
})
