import assert from "node:assert/strict"
import { existsSync } from "node:fs"
import * as nodeModule from "node:module"
import { beforeEach, test } from "node:test"
import { pathToFileURL } from "node:url"
import { createPrismaAssetTransactionCancellationRepository } from "../src/lib/asset-transaction-cancellation-prisma.ts"
import { cancelAssetTransaction } from "../src/lib/asset-transaction-cancellation-service.ts"

type AssetRow = {
  id: string; assetTag: string; name: string; ownershipType: string; isActive: boolean; statusId: string; conditionId: string
  branchId: string; currentLocationId: string; custodianId: string | null; departmentId: string | null; updatedAt: Date
}
type LinkRow = {
  id: string; parentAssetId: string; componentAssetId: string; status: string; removedAt: Date | null
  referenceType: string | null; referenceId: string | null; updatedAt: Date
}
type World = {
  assets: Record<string, AssetRow>
  links: LinkRow[]
  employees: Record<string, { id: string; departmentId: string; isActive: boolean }>
  holderId: string
  ownHandovers: string[]
  calls: Array<{ call: string; args: Record<string, unknown> }>
  checkin: Record<string, unknown> | null
  saves: number
  failLinkMark: boolean
  clock: number
}

const BEFORE = new Date("2026-10-20T03:00:00.000Z")
const held = { isActive: true, statusId: "status:Ready", conditionId: "cond-good", branchId: "branch-1", currentLocationId: "loc-desk", custodianId: "emp-holder", departmentId: "dept-sales", updatedAt: BEFORE }
const row = (id: string, assetTag: string, name: string, ownershipType: string, fields: Partial<AssetRow> = {}): AssetRow => ({ id, assetTag, name, ownershipType, ...held, ...fields })
const link = (id: string, componentAssetId: string, fields: Partial<LinkRow> = {}): LinkRow => ({
  id, parentAssetId: "laptop-1", componentAssetId, status: "installed", removedAt: null, referenceType: null, referenceId: null, updatedAt: BEFORE, ...fields,
})

function freshWorld(): World {
  return {
    assets: Object.fromEntries([
      row("laptop-1", "NB-0001", "Notebook", "personal", { statusId: "status:Checked Out" }),
      row("dock-1", "DK-0001", "Dock", "component"),
      row("mouse-1", "MS-0001", "Mouse", "component"),
      row("hub-1", "HB-0001", "USB hub", "shared"),
      row("bag-1", "BG-0001", "Laptop bag", "component"),
      row("keyboard-1", "KB-0001", "Keyboard", "personal"),
      row("pen-1", "PN-0001", "Stylus", "component"),
    ].map((asset) => [asset.id, asset])),
    // Sorted by id, the order the route reads them in. bag-1 has two installed links (GP X1); pen-1 belongs to another laptop.
    links: [
      link("link-bag-a", "bag-1"),
      link("link-bag-b", "bag-1"),
      link("link-dock", "dock-1"),
      link("link-hub", "hub-1"),
      link("link-kb", "keyboard-1"),
      link("link-mouse", "mouse-1", { referenceType: "purchase", referenceId: "PO-7" }),
      link("link-pen", "pen-1", { parentAssetId: "laptop-2" }),
    ],
    employees: {
      "emp-holder": { id: "emp-holder", departmentId: "dept-sales", isActive: true },
      "emp-manager": { id: "emp-manager", departmentId: "dept-hr", isActive: true },
      "emp-left": { id: "emp-left", departmentId: "dept-old", isActive: false },
    },
    // The handover's holder (its custodianId), the one former employee the form offers as ผู้คืน (S-R46).
    holderId: "emp-holder",
    // keyboard-1 has its own open HO-, so it does not travel (asset-component-sync.ts:146-162).
    ownHandovers: ["keyboard-1"],
    calls: [],
    checkin: null,
    saves: 0,
    failLinkMark: false,
    clock: Date.parse("2026-10-31T03:00:00.000Z"),
  }
}
let world = freshWorld()
Object.assign(globalThis, { __checkinOutstandingWorld: () => world })
beforeEach(() => { world = freshWorld() })

const mockedModuleSources = new Map<string, string>([
  ["next/server", `
    export class NextRequest extends Request {}
    export class NextResponse extends Response {
      static json(body, init) { return Response.json(body, init) }
    }
  `],
  ["@/lib/auth-utils", `
    export async function requireAuth() { return { id: "user-1", roles: ["system_admin"], permissions: [], employeeId: "emp-it" } }
    export function hasRole() { return true }
    export function hasPermission() { return true }
    export function requirePermission() {}
  `],
  ["@/lib/audit-log", `export async function logAudit() {}`],
  ["@/lib/asset-status-flow", `export async function isValidCheckinReturnStatus() { return true }`],
  ["@/lib/operation-document-number", `export async function generateCheckinDocumentNo() { return "RT-202610-0001" }`],
  ["@/lib/asset-operation-evidence", `
    const world = () => globalThis.__checkinOutstandingWorld()
    export function requiredFormText(formData, name) { return String(formData.get(name) ?? "") }
    export function optionalFormText(formData, name) { const value = formData.get(name); return typeof value === "string" && value.trim() ? value : null }
    export function optionalFormFile() { return null }
    export async function saveOperationEvidenceFile(file) {
      world().saves += 1
      return { fileName: file.name, originalName: file.name, fileType: file.type, fileSize: file.size, filePath: "/uploads/" + file.name }
    }
  `],
  ["@/lib/db", `
    const world = () => globalThis.__checkinOutstandingWorld()
    const tick = () => { world().clock += 1000; return new Date(world().clock) }
    // Each where key: an equality, null, { in }, or componentAsset: { isActive }.
    const matches = (row, where = {}) => Object.entries(where).every(([key, condition]) => {
      if (key === "componentAsset") return world().assets[row.componentAssetId]?.isActive === condition.isActive
      if (condition && typeof condition === "object" && "in" in condition) return condition.in.includes(row[key])
      return row[key] === condition
    })
    const withoutUpdatedBy = (data) => { const { updatedBy, ...rest } = data; return rest }
    const handover = () => ({ id: "co-1", assetId: "laptop-1", handoverMode: "temporary_loan", isReturned: false, transactionStatus: "active",
      checkoutDate: new Date("2026-10-01T03:00:00.000Z"), remark: null, custodianId: world().holderId, asset: { status: { name: "Checked Out" } } })
    function model(name) {
      return new Proxy({}, {
        get(_target, method) {
          return async (args = {}) => {
            world().calls.push({ call: name + "." + String(method), args })
            const where = args.where ?? {}
            if (name === "asset") {
              const asset = world().assets[where.id]
              if (method === "findFirst") return asset && (where.isActive === undefined || asset.isActive === where.isActive) ? { ...asset } : null
              if (method === "findUnique") return asset ? { ...asset } : null
              if (method === "update") { Object.assign(asset, withoutUpdatedBy(args.data), { updatedAt: tick() }); return { ...asset } }
              if (method === "updateMany") {
                const rows = Object.values(world().assets).filter((row) => matches(row, where))
                for (const row of rows) Object.assign(row, withoutUpdatedBy(args.data), { updatedAt: tick() })
                return { count: rows.length }
              }
            }
            if (name === "assetComponent") {
              const rows = world().links.filter((row) => matches(row, where))
              if (method === "findMany") return rows.map((row) => ({ ...row, componentAsset: { ...world().assets[row.componentAssetId] } }))
              if (method === "updateMany") {
                if (world().failLinkMark) return { count: 0 }
                for (const row of rows) Object.assign(row, withoutUpdatedBy(args.data), { updatedAt: tick() })
                return { count: rows.length }
              }
            }
            if (name === "assetCheckout") {
              if (method === "findFirst" || method === "findUnique") return handover()
              if (method === "findMany") return world().ownHandovers.filter((id) => where.assetId?.in?.includes(id)).map((assetId) => ({ assetId }))
              if (method === "update") return { id: "co-1", isReturned: true }
            }
            if (name === "assetCheckin" && method === "create") { world().checkin = { id: "rt-1", ...args.data }; return world().checkin }
            if (name === "assetCheckin" && method === "update") { Object.assign(world().checkin, args.data); return world().checkin }
            if (name === "assetCondition") return { name: "Good", isActive: true }
            if (name === "assetStatus") return { id: where.id, name: String(where.id).replace("status:", "") }
            if (name === "employee" && (method === "findUnique" || method === "findFirst")) {
              const employee = world().employees[where.id]
              return employee && (where.isActive === undefined || employee.isActive === where.isActive) ? employee : null
            }
            if (name === "location" && (method === "findUnique" || method === "findFirst")) return { id: where.id, code: "IT-01", name: "คลัง IT", isActive: true }
            if (name === "department" && (method === "findFirst" || method === "findUnique")) return { id: "dept-it", code: "IT", name: "Information Technology", isActive: true }
            if (method === "updateMany") return { count: 1 }
            if (method === "count") return 0
            if (method === "findMany") return []
            if (method === "findFirst" || method === "findUnique") return null
            return { id: name + "-new", ...(args.data ?? {}) }
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

;(nodeModule as unknown as { registerHooks(hooks: { resolve(specifier: string, context: unknown, next: (specifier: string, context: unknown) => unknown): unknown }): void }).registerHooks({
  resolve(specifier, context, nextResolve) {
    const source = mockedModuleSources.get(specifier)
    if (source !== undefined) return { url: `data:text/javascript;charset=utf-8,${encodeURIComponent(source)}`, shortCircuit: true }
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
const context = { params: Promise.resolve({ id: "laptop-1" }) }
const returnBody = (extra: Record<string, unknown> = {}) => ({
  checkoutId: "co-1", returnDate: "2026-10-30", returnByEmployeeId: "emp-holder", returnBy: "E001 - สมชาย ใจดี", receiveBy: "สมหญิง",
  conditionAfter: "cond-good", nextStatusId: "status:Ready", nextLocationId: "loc-it", ...extra,
})
const post = (body: Record<string, unknown>) => route.POST(new Request("http://localhost/api/assets/laptop-1/checkin", {
  method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body),
}), context)
const postForm = (form: FormData) => route.POST(new Request("http://localhost/api/assets/laptop-1/checkin", { method: "POST", body: form }), context)
const returnForm = (missingComponentIds: string[]) => {
  const form = new FormData()
  for (const [key, value] of Object.entries(returnBody())) form.append(key, String(value))
  for (const id of missingComponentIds) form.append("missingComponentIds", id)
  return form
}
const answer = async (response: Response) => [response.status, await response.json()] as const
type Snapshot = { components: Array<Record<string, unknown>> }
const snapshots = () => ({
  before: JSON.parse(String(world.checkin?.beforeSnapshotJson)) as Snapshot,
  after: JSON.parse(String(world.checkin?.afterSnapshotJson)) as Snapshot,
})
const entry = (snapshot: Snapshot, componentAssetId: string) => snapshot.components.filter((component) => component.componentAssetId === componentAssetId)
// The room, the holder and the department of a component that stays out (this task's rule).
const place = (id: string) => [world.assets[id].currentLocationId, world.assets[id].custodianId, world.assets[id].departmentId]
// A returned component's room and holder; its department is T1's (the return department through the sync).
const stock = (id: string) => [world.assets[id].currentLocationId, world.assets[id].custodianId]
const linkRow = (id: string) => world.links.find((candidate) => candidate.id === id)!
const linkStatus = (id: string) => {
  const found = world.links.find((candidate) => candidate.id === id)!
  return [found.status, found.referenceType, found.referenceId, found.removedAt]
}
const written = (call: string) => world.calls.filter((entry) => entry.call === call).map((entry) => entry.args.data as Record<string, unknown>)
const outstandingMovements = () => [...written("assetMovement.create"), ...written("assetMovement.createMany").flat()].filter((row) => row.movementType === "component_outstanding")
const IT_STOCK = ["loc-it", null]
const AT_DESK = ["loc-desk", "emp-holder", "dept-sales"]

test("a return with every component ticked behaves as today: no link changes, every travelling component goes to IT stock (group 3 spec §8.5, Review Focus 1)", async () => {
  for (const extra of [{}, { missingComponentIds: [] }, { missingComponentIds: [], returnByEmployeeId: undefined }]) {
    world = freshWorld()
    const [status, body] = await answer(await post(returnBody(extra)))
    assert.equal(status, 201, JSON.stringify(body))
    assert.deepEqual([body.id, body.documentNo, body.missingComponents], ["rt-1", "RT-202610-0001", []], JSON.stringify(extra))
    assert.equal(world.calls.some(({ call }) => call === "assetComponent.updateMany"), false)
    assert.deepEqual(outstandingMovements(), [])
    assert.deepEqual(world.links.map((candidate) => candidate.status), Array(7).fill("installed"))
    for (const id of ["dock-1", "mouse-1", "hub-1", "bag-1"]) assert.deepEqual(stock(id), IT_STOCK, id)
    assert.deepEqual(place("keyboard-1"), AT_DESK, "a component with its own handover stays, as today")
    const { before, after } = snapshots()
    assert.deepEqual(after.components.map((component) => component.relationshipStatus), ["installed", "installed", "installed", "installed"])
    assert.equal(before.components.some((component) => "relationshipReferenceType" in component), false)
  }
})

test("a component left out stays with ผู้คืน in its room: its link turns outstanding under the RT-, and the others go to IT stock (spec §8.5, decision 7, P2-R1, P2-R2)", async () => {
  const [status, body] = await answer(await post(returnBody({ missingComponentIds: ["mouse-1"] })))

  assert.equal(status, 201, JSON.stringify(body))
  assert.deepEqual(body.missingComponents, [{ assetTag: "MS-0001", name: "Mouse" }])
  assert.deepEqual(linkStatus("link-mouse"), ["outstanding", "checkin", "rt-1", null])
  assert.deepEqual(place("mouse-1"), AT_DESK, "ผู้คืน is already its holder: nothing changes")
  for (const id of ["dock-1", "hub-1", "bag-1"]) assert.deepEqual(stock(id), IT_STOCK, id)
  assert.deepEqual(outstandingMovements(), [{
    assetId: "mouse-1", movementType: "component_outstanding",
    fromValue: JSON.stringify({ custodianId: "emp-holder", departmentId: "dept-sales" }),
    toValue: JSON.stringify({ custodianId: "emp-holder", departmentId: "dept-sales" }),
    reason: "Not returned with its parent asset", referenceType: "checkin", referenceId: "rt-1", performedBy: "user-1", remark: null,
  }])
  assert.equal(written("assetMovement.createMany").flat().some((row) => row.assetId === "mouse-1"), false, "the sync skips it")

  const { before, after } = snapshots()
  const [mouseBefore] = entry(before, "mouse-1")
  const [mouseAfter] = entry(after, "mouse-1")
  const [dockAfter] = entry(after, "dock-1")
  assert.deepEqual(Object.keys(mouseAfter), Object.keys(dockAfter), "the after entry has the sync's keys in the sync's order")
  assert.deepEqual(Object.keys(mouseBefore), [...Object.keys(dockAfter), "relationshipReferenceType", "relationshipReferenceId"])
  assert.deepEqual([mouseBefore.relationshipStatus, mouseBefore.relationshipReferenceType, mouseBefore.relationshipReferenceId], ["installed", "purchase", "PO-7"])
  assert.deepEqual([mouseAfter.componentLinkId, mouseAfter.relationshipStatus, mouseAfter.custodianId], ["link-mouse", "outstanding", "emp-holder"])
  assert.notEqual(mouseAfter.assetUpdatedAt, mouseBefore.assetUpdatedAt, "the component's row is written even when nothing changes")
  assert.notEqual(mouseAfter.relationshipUpdatedAt, mouseBefore.relationshipUpdatedAt)
  // The cancel compares the after entry with the rows as they stand, so it must be what the request left (final review tests-1).
  assert.deepEqual([mouseAfter.assetUpdatedAt, mouseAfter.relationshipUpdatedAt], [world.assets["mouse-1"].updatedAt.toISOString(), linkRow("link-mouse").updatedAt.toISOString()])
  assert.equal(JSON.parse(String(world.checkin?.componentSnapshotJson)).changes.length, 4)
})

test("the missing components' rows are claimed after the handover claim and before the in-transaction plan read; an empty list claims none (final review server-4)", async () => {
  assert.equal((await post(returnBody({ missingComponentIds: ["mouse-1", "bag-1"] }))).status, 201)
  const order = world.calls.map((entry) => entry.call)
  const handoverClaim = order.indexOf("assetCheckout.updateMany")
  const claim = world.calls.findIndex((entry) => entry.call === "asset.updateMany")
  assert.deepEqual(world.calls[claim].args, { where: { id: { in: ["mouse-1", "bag-1"] }, isActive: true }, data: { updatedBy: "user-1" } })
  const planRead = world.calls.findIndex((entry, index) => index > handoverClaim && entry.call === "assetComponent.findMany"
    && (entry.args.where as Record<string, unknown> | undefined)?.componentAssetId !== undefined)
  assert.ok(handoverClaim >= 0 && handoverClaim < claim && claim < planRead, `handover claim ${handoverClaim}, component claim ${claim}, plan read ${planRead}`)
  assert.equal(order.slice(handoverClaim, claim).includes("employee.findUnique"), false, "the plan is read after the claim")

  world = freshWorld()
  assert.equal((await post(returnBody())).status, 201)
  assert.equal(world.calls.some((entry) => entry.call === "asset.updateMany"), false)
})

test("when ผู้คืน is not the holder, a missing component's holder becomes ผู้คืน with ผู้คืน's department, a ส่วนกลาง one keeps its department, and the room never changes; the holder who has left may still be ผู้คืน (spec §8.5, §8.3, call 13, P2-R7, S-R46)", async () => {
  const [status, body] = await answer(await post(returnBody({ missingComponentIds: ["mouse-1", "hub-1"], returnByEmployeeId: "emp-manager", returnBy: "E002 - ผู้จัดการ" })))

  assert.equal(status, 201, JSON.stringify(body))
  assert.deepEqual(body.missingComponents, [{ assetTag: "HB-0001", name: "USB hub" }, { assetTag: "MS-0001", name: "Mouse" }])
  assert.deepEqual(place("mouse-1"), ["loc-desk", "emp-manager", "dept-hr"])
  assert.deepEqual(place("hub-1"), ["loc-desk", "emp-manager", "dept-sales"])
  assert.deepEqual(outstandingMovements().map((row) => [row.assetId, row.toValue]), [
    ["hub-1", JSON.stringify({ custodianId: "emp-manager", departmentId: "dept-sales" })],
    ["mouse-1", JSON.stringify({ custodianId: "emp-manager", departmentId: "dept-hr" })],
  ])

  // The handover's holder has left: the form offers them as "(พ้นสภาพ)", they can still return (S-R46), and the component stays with them.
  world = freshWorld()
  world.holderId = "emp-left"
  assert.equal((await post(returnBody({ missingComponentIds: ["mouse-1"], returnByEmployeeId: "emp-left", returnBy: "E009 - (พ้นสภาพ)" }))).status, 201)
  assert.deepEqual(place("mouse-1"), ["loc-desk", "emp-left", "dept-old"])
})

test("a component with two installed links under the parent: both turn outstanding, with one snapshot entry and one movement (GP X1, Review Focus 2)", async () => {
  const [status, body] = await answer(await post(returnBody({ missingComponentIds: ["bag-1", "bag-1"] })))

  assert.equal(status, 201, JSON.stringify(body))
  assert.deepEqual(body.missingComponents, [{ assetTag: "BG-0001", name: "Laptop bag" }])
  assert.deepEqual([linkStatus("link-bag-a")[0], linkStatus("link-bag-b")[0]], ["outstanding", "outstanding"])
  const { before, after } = snapshots()
  assert.deepEqual(entry(before, "bag-1").map((component) => component.componentLinkId), ["link-bag-a"])
  assert.deepEqual(entry(after, "bag-1").map((component) => component.componentLinkId), ["link-bag-a"])
  const [bagAfter] = entry(after, "bag-1")
  assert.deepEqual([bagAfter.assetUpdatedAt, bagAfter.relationshipUpdatedAt], [world.assets["bag-1"].updatedAt.toISOString(), linkRow("link-bag-a").updatedAt.toISOString()], "the after entry is the rows as the request left them (final review tests-1)")
  assert.equal(outstandingMovements().length, 1)
  assert.deepEqual(place("bag-1"), AT_DESK)
})

test("a multipart return sends one missingComponentIds entry per id (P2-R1)", async () => {
  const response = await postForm(returnForm(["mouse-1", "dock-1"]))

  assert.equal(response.status, 201, await response.clone().text())
  assert.deepEqual([linkStatus("link-mouse")[0], linkStatus("link-dock")[0], linkStatus("link-hub")[0]], ["outstanding", "outstanding", "installed"])
})

const invalidComponent = { code: "ASSET_CHECKIN_MISSING_COMPONENT_INVALID", error: "ASSET_CHECKIN_MISSING_COMPONENT_INVALID", fieldErrors: { missingComponentIds: "checkinMissingComponentInvalid" } }
const returnerRefused = { code: "CHECKIN_MISSING_COMPONENT_RETURNER_REQUIRED", error: "CHECKIN_MISSING_COMPONENT_RETURNER_REQUIRED", fieldErrors: { returnBy: "checkinMissingComponentReturnerRequired" } }

test("a list the server cannot honour, or ผู้คืน who cannot keep what stays out, is refused under its field before anything is written (P2-R1, P2-R18)", async () => {
  const cases: Array<[Record<string, unknown>, number, Record<string, unknown>]> = [
    [{ missingComponentIds: ["mouse-1"], returnByEmployeeId: undefined }, 400, { error: "Invalid request data", code: "VALIDATION_FAILED", fieldErrors: { returnBy: "checkinMissingComponentReturnerRequired" } }],
    [{ missingComponentIds: ["mouse-1"], returnByEmployeeId: "emp-gone" }, 400, returnerRefused],
    // emp-left has left and is not this handover's holder (emp-holder), so the form never offers them.
    [{ missingComponentIds: ["mouse-1"], returnByEmployeeId: "emp-left" }, 400, returnerRefused],
    [{ missingComponentIds: ["ghost-1"] }, 400, invalidComponent],
    [{ missingComponentIds: ["pen-1"] }, 400, invalidComponent],
    [{ missingComponentIds: ["keyboard-1"] }, 400, invalidComponent],
    [{ missingComponentIds: ["mouse-1", "ghost-1"] }, 400, invalidComponent],
    [{ missingComponentIds: "mouse-1" }, 400, { error: "Invalid request data", code: "VALIDATION_FAILED", fieldErrors: { missingComponentIds: "required" } }],
    [{ missingComponentIds: Array.from({ length: 101 }, (_, index) => `c-${index}`) }, 400, { error: "Invalid request data", code: "VALIDATION_FAILED", fieldErrors: { missingComponentIds: "outOfRange" } }],
  ]
  for (const [extra, status, body] of cases) {
    world = freshWorld()
    assert.deepEqual(await answer(await post(returnBody(extra))), [status, body], JSON.stringify(extra).slice(0, 80))
    for (const call of ["assetCheckin.create", "assetComponent.updateMany", "asset.update"]) {
      assert.equal(world.calls.some((entry) => entry.call === call), false, `${call} after ${JSON.stringify(extra).slice(0, 60)}`)
    }
  }
})

test("a multipart return refused for its list saves no evidence file (P2-R15)", async () => {
  const form = returnForm(["ghost-1"])
  form.append("photoAfterFiles", new File(["png"], "front.png", { type: "image/png" }))
  assert.deepEqual(await answer(await postForm(form)), [400, invalidComponent])
  assert.equal(world.saves, 0)
})

test("a link taken between the check and the write answers 409, so the page reloads instead of saving half a return (P2-R1)", async () => {
  world.failLinkMark = true
  assert.deepEqual(await answer(await post(returnBody({ missingComponentIds: ["mouse-1"] }))), [409, {
    code: "ASSET_CHANGED_DURING_OPERATION", error: "Asset status changed while this request was being saved. Reload the asset and try again.",
  }])
})

test("ส่งซ่อม with a component left out: the repair problem text names it (spec §8.3)", async () => {
  const [status] = await answer(await post(returnBody({ missingComponentIds: ["mouse-1"], nextStatusId: "status:Under Maintenance", conditionAfter: "cond-damaged", damageNote: "จอแตก" })))
  assert.equal(status, 201)
  assert.equal(written("maintenanceTicket.create")[0].problem, "ความเสียหาย: จอแตก\nส่วนควบที่ยังไม่ได้คืน: MS-0001 - Mouse")
})

// The cancellation repository over the rows this route left (final review tests-1): only the calls it makes.
function cancellationDb(rtUpdatedAt: Date) {
  const checkin = world.checkin!
  const state = { checkoutReturned: true, rtStatus: "active" }
  const matches = (row: Record<string, unknown>, where: Record<string, unknown>) => Object.entries(where).every(([key, condition]) => {
    const value = row[key]
    if (condition instanceof Date) return value instanceof Date && value.getTime() === condition.getTime()
    if (condition && typeof condition === "object" && "in" in condition) return (condition.in as unknown[]).includes(value)
    if (condition && typeof condition === "object" && "not" in condition) return value !== condition.not
    return value === condition
  })
  const write = <T extends object>(rows: T[], data: Record<string, unknown>) => {
    const fields = { ...data }
    delete fields.updatedBy
    for (const row of rows) Object.assign(row, fields, { updatedAt: new Date((row as { updatedAt: Date }).updatedAt.getTime() + 60_000) })
    return { count: rows.length }
  }
  const db = {
    $transaction: async (work: (tx: unknown) => Promise<unknown>) => work(db),
    assetCheckin: {
      findUnique: async () => ({ id: "rt-1", assetId: "laptop-1", transactionStatus: state.rtStatus, createdAt: new Date(world.clock), updatedAt: rtUpdatedAt, voidedAt: null, checkoutId: "co-1", beforeSnapshotJson: checkin.beforeSnapshotJson, afterSnapshotJson: checkin.afterSnapshotJson }),
      count: async () => 0,
      updateMany: async () => { state.rtStatus = "void"; return { count: 1 } },
    },
    asset: {
      findUnique: async ({ where }: { where: { id: string } }) => world.assets[where.id] ?? null,
      updateMany: async ({ where, data }: { where: Record<string, unknown>; data: Record<string, unknown> }) =>
        write(Object.values(world.assets).filter((row) => matches(row, where)), data),
    },
    assetComponent: {
      findMany: async ({ where }: { where: Record<string, unknown> }) =>
        world.links.filter((row) => matches(row, where)).map((row) => ({ ...row, componentAsset: world.assets[row.componentAssetId] })),
      updateMany: async ({ where, data }: { where: Record<string, unknown>; data: Record<string, unknown> }) =>
        write(world.links.filter((row) => matches(row, where)), data),
    },
    assetCheckout: {
      findUnique: async () => ({ id: "co-1", isReturned: state.checkoutReturned }),
      count: async () => 0,
      updateMany: async () => { state.checkoutReturned = false; return { count: 1 } },
    },
    assetTransfer: { count: async () => 0 },
    assetMovement: { findMany: async () => [], create: async () => ({ id: "movement-cancel" }) },
    systemLog: { create: async () => ({}) },
    assetStateReview: { findFirst: async () => null, create: async () => ({ id: "review-1" }) },
  }
  return { db, state }
}

test("the RT- the route writes for a left-out component can be cancelled: both duplicate links go back to installed with their own reference (final review tests-1, Review Focus 2)", async () => {
  assert.equal((await post(returnBody({ missingComponentIds: ["mouse-1", "bag-1"] }))).status, 201)
  const rtUpdatedAt = new Date("2026-10-31T04:00:00.000Z")
  const { db, state } = cancellationDb(rtUpdatedAt)
  const result = await cancelAssetTransaction(
    { type: "checkin", transactionId: "rt-1", userId: "user-9", reason: "บันทึกผิดคน", expectedUpdatedAt: rtUpdatedAt.toISOString() },
    createPrismaAssetTransactionCancellationRepository(db as never),
  )
  assert.equal(result.status, "cancelled", JSON.stringify(result))
  assert.deepEqual(["link-mouse", "link-bag-a", "link-bag-b"].map(linkStatus), [
    ["installed", "purchase", "PO-7", null],
    ["installed", null, null, null],
    ["installed", null, null, null],
  ])
  assert.deepEqual([place("mouse-1"), place("bag-1")], [AT_DESK, AT_DESK])
  assert.deepEqual([state.checkoutReturned, state.rtStatus], [false, "void"])
})
