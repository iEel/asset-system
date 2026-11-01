import assert from "node:assert/strict"
import { existsSync } from "node:fs"
import * as nodeModule from "node:module"
import { beforeEach, test } from "node:test"
import { pathToFileURL } from "node:url"
import { outstandingLinkWhere } from "../src/lib/asset-component-outstanding.ts"
import { getApiErrorKey } from "../src/lib/api-error-catalog.ts"

type Row = Record<string, unknown>
type Args = { where?: Record<string, unknown>; data?: unknown }
type World = {
  permissions: string[]; link: Row | null; linkClaimCount: number; checkin: Row | null; component: Row; parent: Row
  /** Overrides for each parent read in turn (the read before the claim, then the one after it). */
  parentReads: Row[]
  parentOpenCheckout: boolean; parentOpenRepair: boolean; componentOpenRepair: boolean; parentClaimCount: number; componentClaimCount: number
  department: Row | null
  /** Each room read takes the next answer; when empty the room is active. */
  locationAnswers: boolean[]
  conditions: Record<string, { name: string; isActive: boolean }>; audits: Row[]
}
const db: { calls: Array<{ call: string; args: Args }>; answers: Record<string, unknown> } = { calls: [], answers: {} }
const world = {} as World
Object.assign(globalThis, { __fakeDb: db, __lateReturnWorld: world })

const FAKE_DB = `
  const db = () => globalThis.__fakeDb
  function model(name) {
    return new Proxy({}, { get(_target, method) { return async (args) => {
      const call = name + "." + String(method)
      db().calls.push({ call, args })
      const answer = db().answers[call]
      if (typeof answer === "function") return answer(args)
      if (answer !== undefined) return answer
      if (method === "findMany") return []
      if (method === "count") return 0
      if (method === "updateMany" || method === "createMany") return { count: 1 }
      if (method === "findFirst" || method === "findUnique") return null
      return { id: name + "-new", ...(args?.data ?? {}) }
    } } })
  }
  const client = new Proxy({}, { get(_target, key) { return key === "$transaction" ? async (callback) => callback(client) : model(String(key)) } })
  export const prisma = client
`
const mocks = new Map<string, string>([
  ["next/server", `export class NextRequest extends Request {}
    export class NextResponse extends Response { static json(body, init) { return Response.json(body, init) } }`],
  ["@/lib/auth-utils", `const world = () => globalThis.__lateReturnWorld
    export async function requireAuth() { return { id: "user-1", roles: [], permissions: [], employeeId: "emp-1" } }
    export function hasRole() { return false }
    export function hasPermission(_user, module, action) { return world().permissions.includes(module + ":" + action) }
    export function requirePermission(_user, module, action) { if (!world().permissions.includes(module + ":" + action)) throw new Error("Forbidden: insufficient permissions") }`],
  ["@/lib/audit-log", `export async function logAudit(entry) { globalThis.__lateReturnWorld.audits.push(entry) }`],
  ["@/lib/db", FAKE_DB],
])
const registerHooks = (nodeModule as unknown as { registerHooks(options: { resolve(specifier: string, context: unknown, nextResolve: (specifier: string, context: unknown) => unknown): unknown }): void }).registerHooks
registerHooks({
  resolve(specifier, context, nextResolve) {
    const source = mocks.get(specifier)
    if (source !== undefined) return { url: `data:text/javascript;charset=utf-8,${encodeURIComponent(source)}`, shortCircuit: true }
    if (specifier.startsWith("@/")) {
      const base = `src/${specifier.slice(2)}`
      const file = [`${base}.ts`, `${base}.tsx`, `${base}/index.ts`].find((candidate) => existsSync(candidate))
      if (file) return { url: pathToFileURL(file).href, shortCircuit: true }
    }
    return nextResolve(specifier, context)
  },
})
const route = await import(pathToFileURL("src/app/api/assets/[id]/component-return/route.ts").href) as { POST(request: Request, context: { params: Promise<{ id: string }> }): Promise<Response> }

const COMPONENT = { id: "comp-1", assetTag: "GRL-RAM-26-0001", isActive: true, ownershipType: "component", statusId: "status-ready", status: { name: "Ready" }, conditionId: "cond-good", condition: { name: "Good" }, currentLocationId: "loc-desk", custodianId: "emp-2", departmentId: "dept-sales", updatedAt: new Date("2026-10-20T03:00:00Z") }
const PARENT = { id: "parent-1", assetTag: "GRL-COM-26-0100", name: "Notebook", isActive: true, statusId: "status-ready", status: { name: "Ready" }, custodianId: null, currentLocationId: "loc-it", departmentId: "dept-parent" }
const HANDED_OVER = { custodianId: "emp-9", statusId: "status-in-use", status: { name: "In Use" } }
const CHANGED = { code: "ASSET_CHANGED_DURING_OPERATION", error: "Asset status changed while this request was being saved. Reload the asset and try again." }
const linkWhere = { id: "link-1", componentAssetId: "comp-1", referenceType: "checkin", referenceId: "checkin-1", ...outstandingLinkWhere }
const siblingsWhere = { parentAssetId: "parent-1", componentAssetId: "comp-1", referenceType: "checkin", referenceId: "checkin-1", ...outstandingLinkWhere }
const linkValue = JSON.stringify({ componentAssetId: "comp-1", componentAssetTag: "GRL-RAM-26-0001", componentRole: "RAM", slotNo: null })
const moved = { reason: "Component late return", referenceType: "checkin", referenceId: "checkin-1", performedBy: "user-1" }

const body = (overrides: Row = {}) => ({ componentLinkId: "link-1", checkinId: "checkin-1", expectedOutcome: "reattached", returnDate: "2026-10-25", receiveBy: "E001 - สมชาย ใจดี", receiveByEmployeeId: "emp-1", ...overrides })
const post = (payload: unknown) => route.POST(
  new Request("http://localhost/api/assets/comp-1/component-return", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) }),
  { params: Promise.resolve({ id: "comp-1" }) },
)
const args = (call: string) => db.calls.filter((entry) => entry.call === call).map((entry) => entry.args)
const dataOf = (call: string, index = 0) => args(call)[index].data as Row
const movements = () => args("assetMovement.createMany").flatMap((entry) => entry.data as Row[])
const answer = async (response: Response) => [response.status, await response.json()]

beforeEach(() => {
  Object.assign(world, {
    permissions: ["asset:edit"], link: { id: "link-1", parentAssetId: "parent-1", componentRole: "RAM", slotNo: null }, linkClaimCount: 1,
    checkin: { id: "checkin-1", documentNo: "RT-202610-0001", returnDate: new Date("2026-10-20T00:00:00Z") },
    component: { ...COMPONENT }, parent: { ...PARENT }, parentReads: [], parentOpenCheckout: false, parentOpenRepair: false, componentOpenRepair: false,
    parentClaimCount: 1, componentClaimCount: 1, department: { id: "dept-it", code: "IT", name: "Information Technology", isActive: true }, locationAnswers: [],
    conditions: { "cond-good": { name: "Good", isActive: true }, "cond-fair": { name: "Fair", isActive: true }, "cond-na": { name: "Not Assessed", isActive: true } }, audits: [],
  })
  db.calls = []
  db.answers = {
    "asset.findFirst": (a: Args) => (a.where?.id === "comp-1" && world.component.isActive ? { id: "comp-1" } : null),
    "asset.findUnique": (a: Args) => (a.where?.id === "comp-1" ? world.component : { ...world.parent, ...(world.parentReads.shift() ?? {}) }),
    "asset.updateMany": (a: Args) => ({ count: a.where?.id === "comp-1" ? world.componentClaimCount : world.parentClaimCount }),
    "asset.update": (a: Args) => ({ ...world.component, ...(a.data as Row) }),
    "assetComponent.findFirst": () => world.link,
    "assetComponent.findUnique": () => world.link,
    "assetComponent.updateMany": (a: Args) => ({ count: a.where && "id" in a.where ? world.linkClaimCount : 1 }),
    "assetCheckin.findFirst": () => world.checkin,
    "assetCheckout.findFirst": (a: Args) => (a.where?.assetId === "parent-1" && world.parentOpenCheckout ? { id: "checkout-9", handoverMode: "permanent_assignment" } : null),
    "maintenanceTicket.count": (a: Args) => ((a.where?.assetId === "parent-1" ? world.parentOpenRepair : world.componentOpenRepair) ? 1 : 0),
    "department.findFirst": () => world.department,
    "department.findUnique": () => world.department,
    "location.findFirst": (a: Args) => ((world.locationAnswers.length > 0 ? world.locationAnswers.shift() : true) && a.where?.isActive === true ? { id: a.where?.id } : null),
    "assetCondition.findUnique": (a: Args) => world.conditions[String(a.where?.id)] ?? null,
    "assetStatus.findFirst": (a: Args) => (a.where?.name === "Ready" && a.where?.isActive === true ? { id: "status-ready" } : null),
  }
})

test("the parent in IT stock: the link is installed again, the component takes the parent's room and department, its holder is cleared, and the RT- is the reference (spec §8.6, P2-R3, P2-R7)", async () => {
  assert.deepEqual(await answer(await post(body())), [201, { checkinId: "checkin-1", documentNo: "RT-202610-0001", outcome: "reattached" }])
  const [claim, write, ...rest] = args("assetComponent.updateMany")
  assert.deepEqual(claim, { where: linkWhere, data: { updatedBy: "user-1" } })
  assert.deepEqual(write, { where: siblingsWhere, data: { status: "installed", updatedBy: "user-1" } }, "every outstanding link of this component under this RT- (GP X1)")
  assert.equal(rest.length, 0)
  assert.deepEqual(args("asset.updateMany").map((entry) => entry.where), [
    { id: "comp-1", isActive: true },
    { id: "parent-1", isActive: true, statusId: "status-ready" },
  ], "the component is claimed, then the parent")
  assert.deepEqual(args("asset.update"), [{ where: { id: "comp-1" }, data: { currentLocationId: "loc-it", custodianId: null, departmentId: "dept-parent", updatedBy: "user-1" } }])
  assert.deepEqual(movements(), [
    { assetId: "parent-1", movementType: "component_install", toValue: linkValue, reason: null, referenceType: "checkin", referenceId: "checkin-1", performedBy: "user-1" },
    { assetId: "comp-1", movementType: "component_late_return", toValue: JSON.stringify({ receivedByName: "E001 - สมชาย ใจดี", returnDate: "2026-10-25", outcome: "reattached" }), ...moved, remark: null },
    { assetId: "comp-1", movementType: "location_change", fromValue: "loc-desk", toValue: "loc-it", ...moved },
    { assetId: "comp-1", movementType: "custodian_change", fromValue: "emp-2", toValue: null, ...moved },
    { assetId: "comp-1", movementType: "department_change", fromValue: "dept-sales", toValue: "dept-parent", ...moved },
  ])
  assert.deepEqual([world.audits[0].action, world.audits[0].module, world.audits[0].recordId], ["component_late_return", "asset", "comp-1"])
})

test("the parent handed over again: the link ends, the component stands alone in the chosen room with the return department, and the parent is not claimed (spec §8.6, P2-R7)", async () => {
  Object.assign(world.parent, HANDED_OVER); world.parentOpenCheckout = true
  assert.deepEqual(await answer(await post(body({ expectedOutcome: "standalone", nextLocationId: "loc-store", remark: "คืนที่โต๊ะ IT" }))), [201, { checkinId: "checkin-1", documentNo: "RT-202610-0001", outcome: "standalone" }])
  assert.deepEqual(args("assetComponent.updateMany")[1], { where: siblingsWhere, data: { status: "removed", removedAt: new Date("2026-10-25"), updatedBy: "user-1" } })
  assert.deepEqual(args("asset.updateMany").map((entry) => entry.where?.id), ["comp-1"], "only the component is claimed")
  assert.deepEqual(args("asset.update")[0].data, { currentLocationId: "loc-store", custodianId: null, departmentId: "dept-it", updatedBy: "user-1" })
  assert.deepEqual(movements().slice(0, 2), [
    { assetId: "parent-1", movementType: "component_remove", fromValue: linkValue, reason: null, referenceType: "checkin", referenceId: "checkin-1", performedBy: "user-1" },
    { assetId: "comp-1", movementType: "component_late_return", toValue: JSON.stringify({ receivedByName: "E001 - สมชาย ใจดี", returnDate: "2026-10-25", outcome: "standalone" }), ...moved, remark: "คืนที่โต๊ะ IT" },
  ])
})

test("a ส่วนกลาง component standing alone keeps its department, with no department_change line (spec §6, decision 10)", async () => {
  world.component = { ...COMPONENT, ownershipType: "shared" }; Object.assign(world.parent, HANDED_OVER)
  assert.equal((await post(body({ expectedOutcome: "standalone", nextLocationId: "loc-store" }))).status, 201)
  assert.equal(dataOf("asset.update").departmentId, "dept-sales")
  assert.deepEqual(movements().map((row: Row) => row.movementType), ["component_remove", "component_late_return", "location_change", "custodian_change"])
})

test("a panel that no longer matches the parent is refused as changed, never as a field the panel did not show (P2-R3, Review Focus 3)", async () => {
  Object.assign(world.parent, HANDED_OVER)
  assert.deepEqual(await answer(await post(body())), [409, CHANGED], "re-attach expected, no room sent, the parent is out")
  assert.deepEqual([args("assetComponent.updateMany").length, args("asset.update").length, movements().length], [1, 0, 0], "only the claim, which the transaction rolls back")
  world.parent = { ...PARENT }; db.calls = []
  assert.deepEqual(await answer(await post(body({ expectedOutcome: "standalone", nextLocationId: "loc-store" }))), [409, CHANGED], "stand-alone expected, the parent is back in stock")
  assert.equal(movements().length, 0)
})

test("a link already returned, ended or claimed by another save, or an RT- made void, is refused as changed (P2-R3)", async () => {
  world.link = null
  assert.deepEqual(await answer(await post(body())), [409, CHANGED])
  assert.equal(args("assetComponent.updateMany").length, 0, "refused before the transaction")
  world.link = { id: "link-1", parentAssetId: "parent-1", componentRole: "RAM", slotNo: null }; world.linkClaimCount = 0; db.calls = []
  assert.deepEqual(await answer(await post(body())), [409, CHANGED])
  assert.deepEqual([args("assetComponent.updateMany").length, args("asset.update").length, movements().length], [1, 0, 0])
  world.linkClaimCount = 1; world.checkin = null; db.calls = []
  assert.deepEqual(await answer(await post(body())), [409, CHANGED])
})

test("re-attach: a parent claim that loses, or a parent that took a holder before the claim, is refused as changed with nothing written (P2-R3)", async () => {
  world.parentClaimCount = 0
  assert.deepEqual(await answer(await post(body())), [409, CHANGED])
  world.parentClaimCount = 1; world.parentReads = [{}, { custodianId: "emp-9" }]; db.calls = []
  assert.deepEqual(await answer(await post(body())), [409, CHANGED])
  assert.deepEqual([args("assetComponent.updateMany").length, args("asset.update").length, movements().length], [1, 0, 0])
})

test("re-attach: the component takes the room and department of the parent as re-read after the parent claim (final review server-1)", async () => {
  world.parentReads = [{}, { currentLocationId: "loc-it-2", departmentId: "dept-parent-2" }]
  assert.equal((await post(body())).status, 201)
  assert.deepEqual(args("asset.update")[0].data, { currentLocationId: "loc-it-2", custodianId: null, departmentId: "dept-parent-2", updatedBy: "user-1" })
  assert.deepEqual(movements().filter((row: Row) => row.movementType === "location_change").map((row: Row) => row.toValue), ["loc-it-2"])
})

test("the component row is claimed before its state, open handover and repair are read; a lost claim is refused as changed (final review server-4)", async () => {
  assert.equal((await post(body())).status, 201)
  const order = db.calls.map((entry) => entry.call + ":" + String(entry.args.where?.id ?? entry.args.where?.assetId ?? ""))
  const claim = order.indexOf("asset.updateMany:comp-1")
  assert.ok(claim >= 0, "the component is claimed")
  assert.deepEqual(args("asset.updateMany")[0], { where: { id: "comp-1", isActive: true }, data: { updatedBy: "user-1" } })
  assert.ok(claim < order.indexOf("asset.findUnique:comp-1"), "before the component is read")
  assert.ok(claim < order.indexOf("assetCheckout.findFirst:comp-1"), "before its open handover is read")
  assert.ok(claim < order.indexOf("maintenanceTicket.count:comp-1"), "before its open repair is counted")
  world.componentClaimCount = 0; db.calls = []
  assert.deepEqual(await answer(await post(body())), [409, CHANGED])
  assert.deepEqual([args("asset.findUnique").length, args("asset.update").length, movements().length], [0, 0, 0])
})

test("stand alone needs a room; a closed room is refused under it, before and inside the transaction (P2-R3, P2-R15)", async () => {
  Object.assign(world.parent, HANDED_OVER)
  assert.deepEqual(await answer(await post(body({ expectedOutcome: "standalone" }))), [400, { error: "Invalid request data", code: "VALIDATION_FAILED", fieldErrors: { nextLocationId: "locationRequired" } }])
  assert.deepEqual(db.calls, [], "refused before any read")
  const inactive = [409, { code: "ASSET_CHECKIN_LOCATION_INACTIVE", error: "ASSET_CHECKIN_LOCATION_INACTIVE", fieldErrors: { nextLocationId: getApiErrorKey("ASSET_CHECKIN_LOCATION_INACTIVE") } }]
  assert.notEqual(getApiErrorKey("ASSET_CHECKIN_LOCATION_INACTIVE"), null, "T2 catalogued it")
  world.locationAnswers = [false]
  assert.deepEqual(await answer(await post(body({ expectedOutcome: "standalone", nextLocationId: "loc-closed" }))), inactive)
  assert.equal(args("assetComponent.updateMany").length, 0)
  world.locationAnswers = [true, false]; db.calls = []
  assert.deepEqual(await answer(await post(body({ expectedOutcome: "standalone", nextLocationId: "loc-store" }))), inactive)
  assert.deepEqual([args("asset.update").length, movements().length], [0, 0])
})

test("the return department is asked on every late return; a missing or inactive one refuses before any write (spec §12, P2-R8)", async () => {
  world.department = null
  const response = await post(body())
  assert.equal(response.status, 409)
  assert.equal((await response.json()).code, "ASSET_CHECKIN_DEPARTMENT_UNAVAILABLE")
  assert.equal(args("assetComponent.updateMany").length, 0)
})

test("the late return's date: not before the RT-'s day and not after today, each under วันที่คืน (P2-R13)", async () => {
  assert.deepEqual(await answer(await post(body({ returnDate: "2026-10-19" }))), [400, { code: "COMPONENT_RETURN_DATE_BEFORE_CHECKIN", error: "COMPONENT_RETURN_DATE_BEFORE_CHECKIN", fieldErrors: { returnDate: "componentReturnDateBeforeCheckin" } }])
  assert.notEqual(getApiErrorKey("CHECKIN_RETURN_DATE_IN_FUTURE"), null, "T2 catalogued it")
  assert.deepEqual(await answer(await post(body({ returnDate: "2999-01-01" }))), [400, { code: "CHECKIN_RETURN_DATE_IN_FUTURE", error: "CHECKIN_RETURN_DATE_IN_FUTURE", fieldErrors: { returnDate: getApiErrorKey("CHECKIN_RETURN_DATE_IN_FUTURE") } }])
  assert.equal(args("assetComponent.updateMany").length, 0)
  assert.equal((await post(body({ returnDate: "2026-10-20" }))).status, 201, "the RT-'s own day is allowed")
})

test("an optional condition: ยังไม่ประเมิน is refused under it; a new one is written with its line; the same one changes nothing (spec §8.6, §19.2)", async () => {
  assert.deepEqual(await answer(await post(body({ conditionId: "cond-na" }))), [400, { code: "ASSET_CONDITION_NOT_SELECTABLE", error: "Invalid return condition for check-in", fieldErrors: { conditionId: "invalidReturnCondition" } }])
  db.calls = []
  assert.equal((await post(body({ conditionId: "cond-fair" }))).status, 201)
  assert.equal(dataOf("asset.update").conditionId, "cond-fair")
  assert.deepEqual(movements().at(-1), { assetId: "comp-1", movementType: "condition_change", fromValue: "cond-good", toValue: "cond-fair", ...moved })
  db.calls = []
  assert.equal((await post(body({ conditionId: "cond-good" }))).status, 201)
  assert.equal("conditionId" in dataOf("asset.update"), false)
  assert.equal(movements().some((row: Row) => row.movementType === "condition_change"), false)
})

test("a component no longer eligible (an open repair since the panel opened) is refused as changed; an inactive one is not found; a viewer is refused first (P2-R17)", async () => {
  world.componentOpenRepair = true
  assert.deepEqual(await answer(await post(body())), [409, CHANGED])
  assert.deepEqual([args("asset.update").length, movements().length], [0, 0])
  world.componentOpenRepair = false; world.component = { ...COMPONENT, isActive: false }
  assert.deepEqual(await answer(await post(body())), [404, { error: "Asset not found" }])
  world.component = { ...COMPONENT }; world.permissions = []; db.calls = []
  assert.equal((await post(body())).status, 403)
  assert.deepEqual(db.calls, [])
})

const MISSING = { statusId: "status-missing", status: { name: "Missing" } }

test("a หาไม่พบ component returned late becomes พร้อมใช้งาน, re-attached or standing alone, with one status line on the RT- (user 2026-11-01)", async () => {
  const statusLine = { assetId: "comp-1", movementType: "status_change", fromValue: "status-missing", toValue: "status-ready", ...moved }
  for (const [outcome, payload] of [["reattached", body()], ["standalone", body({ expectedOutcome: "standalone", nextLocationId: "loc-store" })]] as const) {
    world.component = { ...COMPONENT, ...MISSING }; world.parent = outcome === "reattached" ? { ...PARENT } : { ...PARENT, ...HANDED_OVER }; world.audits = []; db.calls = []
    assert.equal((await post(payload)).status, 201, outcome)
    assert.deepEqual(args("asset.update").length, 1, outcome)
    assert.equal(dataOf("asset.update").statusId, "status-ready", outcome)
    assert.deepEqual(movements().filter((row: Row) => row.movementType === "status_change"), [statusLine], outcome)
    const update = db.calls.findIndex((entry) => entry.call === "asset.update")
    assert.ok(db.calls.findIndex((entry) => entry.call === "assetStatus.findFirst") < update, "the Ready id is read before the write")
    assert.deepEqual(db.calls.slice(update + 1).map((entry) => entry.call).filter((call) => call.startsWith("asset.")), [], "nothing writes the asset after the update (the RT- cancel check)")
    const audit = world.audits[0].newValue as Row
    assert.deepEqual([audit.statusId, audit.previousStatusId], ["status-ready", "status-missing"], outcome)
  }
})

test("a component in any other status keeps it: no status written, no status line (user 2026-11-01)", async () => {
  for (const status of [{}, { statusId: "status-in-use", status: { name: "In Use" } }]) {
    world.component = { ...COMPONENT, ...status }; db.calls = []
    assert.equal((await post(body())).status, 201)
    assert.equal("statusId" in dataOf("asset.update"), false)
    assert.equal(movements().some((row: Row) => row.movementType === "status_change"), false)
    assert.equal(args("assetStatus.findFirst").length, 0, "the Ready id is not read")
  }
})
