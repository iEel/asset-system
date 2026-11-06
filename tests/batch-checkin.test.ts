import assert from "node:assert/strict"
import { existsSync, readFileSync } from "node:fs"
import * as nodeModule from "node:module"
import { beforeEach, test } from "node:test"
import { pathToFileURL } from "node:url"

// รับคืนหลายรายการ's API (group 7 plan 4 Task 2): the schema's limits, the checks before the transaction and the
// transaction body (against a fake db that answers like SQL Server for the rows involved), and the route's order: the
// signatures before anything is read, the files after every check, removed again on a refusal.
type AssetRow = {
  id: string; assetTag: string; statusId: string; conditionId: string; currentLocationId: string; custodianId: string | null
  ownershipType: string; isActive: boolean; statusName: string; departmentId: string
}
type CheckoutRow = { id: string; assetId: string; custodianId: string; handoverMode: string; checkoutDate: Date; remark: string | null; isReturned: boolean }
type World = {
  calls: string[]
  assets: Map<string, AssetRow>
  checkouts: CheckoutRow[]
  repairs: Set<string>
  outstanding: Set<string>
  // Checkout ids whose claim (assetCheckout.updateMany) loses the race.
  lostClaims: Set<string>
  // Checkout ids returned elsewhere after the checks before the transaction.
  returnedMeanwhile: Set<string>
  inTransaction: boolean
  transactionOptions: unknown[]
  attachments: Array<{ referenceId: string; module: string; filePath: string }>
  checkins: Array<{ id: string; documentNo: string; assetId: string; checkoutId: string }>
  documentNumbers: number
  saves: string[]
  discards: string[]
  audits: Array<{ action: string; recordId: string }>
}
const world: World = freshWorld()

function freshWorld(): World {
  const asset = (id: string, tag: string, overrides: Partial<AssetRow> = {}): [string, AssetRow] => [id, {
    id, assetTag: tag, statusId: "status-in-use", conditionId: "condition-good", currentLocationId: "loc-desk", custodianId: "emp-5",
    ownershipType: "personal", isActive: true, statusName: "In Use", departmentId: "dept-sales", ...overrides,
  }]
  return {
    calls: [],
    assets: new Map([asset("asset-a", "NB-001"), asset("asset-b", "NB-002"), asset("asset-c", "NB-003")]),
    checkouts: [
      { id: "co-a", assetId: "asset-a", custodianId: "emp-5", handoverMode: "permanent_assignment", checkoutDate: new Date("2026-10-01T03:00:00Z"), remark: null, isReturned: false },
      { id: "co-b", assetId: "asset-b", custodianId: "emp-5", handoverMode: "permanent_assignment", checkoutDate: new Date("2026-10-01T03:00:00Z"), remark: null, isReturned: false },
    ],
    repairs: new Set(),
    outstanding: new Set(),
    lostClaims: new Set(),
    returnedMeanwhile: new Set(),
    inTransaction: false,
    transactionOptions: [],
    attachments: [],
    checkins: [],
    documentNumbers: 0,
    saves: [],
    discards: [],
    audits: [],
  }
}

type Args = { where?: Record<string, unknown>; data?: Record<string, unknown>; select?: Record<string, unknown> }
const idsIn = (value: unknown) => (value as { in?: string[] } | undefined)?.in

function openCheckouts() {
  return world.checkouts.filter((row) => !row.isReturned && !(world.inTransaction && world.returnedMeanwhile.has(row.id)))
}

function handle(model: string, method: string, args: Args = {}): unknown {
  const where = args.where ?? {}
  const data = args.data ?? {}
  const assetOut = (row: AssetRow) => ({ ...row, status: { name: row.statusName } })
  switch (`${model}.${method}`) {
    case "asset.findMany": {
      const ids = idsIn(where.id) ?? []
      return ids.flatMap((id) => {
        const row = world.assets.get(id)
        if (!row || (where.isActive === true && !row.isActive)) return []
        return [assetOut(row)]
      })
    }
    case "asset.findFirst": {
      const row = world.assets.get(where.id as string)
      if (!row || !row.isActive) return null
      if ("custodianId" in where && row.custodianId !== where.custodianId) return null
      return assetOut(row)
    }
    case "asset.findUnique": return { ...assetOut(world.assets.get(where.id as string)!), updatedAt: new Date("2026-11-01T00:00:00Z"), branchId: "branch-1" }
    case "asset.updateMany": {
      const row = world.assets.get(where.id as string)
      const matches = row && row.isActive && (!("statusId" in where) || row.statusId === where.statusId)
      return { count: matches ? 1 : 0 }
    }
    case "asset.update": {
      const row = world.assets.get(where.id as string)!
      if (typeof data.statusId === "string") row.statusId = data.statusId
      if ("custodianId" in data) row.custodianId = data.custodianId as string | null
      return { ...assetOut(row), updatedAt: new Date("2026-11-07T03:00:00Z"), branchId: "branch-1" }
    }
    case "assetCheckout.findMany": {
      const byAsset = idsIn(where.assetId)
      const byId = idsIn(where.id)
      return openCheckouts().filter((row) => (byAsset ? byAsset.includes(row.assetId) : true) && (byId ? byId.includes(row.id) : true))
    }
    case "assetCheckout.findFirst": {
      const row = openCheckouts().find((candidate) => candidate.assetId === where.assetId && (!where.id || candidate.id === where.id))
      if (!row) return null
      return { ...row, asset: { status: { name: world.assets.get(row.assetId)!.statusName } } }
    }
    case "assetCheckout.updateMany": {
      const row = openCheckouts().find((candidate) => candidate.id === where.id)
      if (!row || world.lostClaims.has(row.id)) return { count: 0 }
      row.isReturned = true
      return { count: 1 }
    }
    case "assetCheckout.create": {
      const row: CheckoutRow = {
        id: `co-new-${data.assetId as string}`, assetId: data.assetId as string, custodianId: data.custodianId as string,
        handoverMode: data.handoverMode as string, checkoutDate: data.checkoutDate as Date, remark: data.remark as string, isReturned: false,
      }
      world.checkouts.push(row)
      world.calls.push(`backfill ${row.assetId}`)
      return { ...row, documentNo: data.documentNo }
    }
    case "maintenanceTicket.findMany": return [...world.repairs].filter((id) => (idsIn(where.assetId) ?? []).includes(id)).map((assetId) => ({ assetId }))
    case "maintenanceTicket.count": return world.repairs.has(where.assetId as string) ? 1 : 0
    case "maintenanceTicket.findFirst": return null
    case "assetComponent.findMany": {
      const ids = idsIn(where.componentAssetId) ?? []
      return ids.filter((id) => world.outstanding.has(id)).map((id) => ({ componentAssetId: id, componentAsset: { assetTag: world.assets.get(id)?.assetTag ?? id } }))
    }
    case "assetCondition.findMany": return (idsIn(where.id) ?? []).map((id) => ({ id, name: id === "condition-damaged" ? "Damaged" : "Good", isActive: true }))
    case "assetStatus.findMany": {
      const names: Record<string, string> = { "status-ready": "Ready", "status-repair": "Under Maintenance", "status-in-use": "In Use" }
      return (idsIn(where.id) ?? []).flatMap((id) => (names[id] ? [{ id, name: names[id], isActive: true }] : []))
    }
    case "assetStatus.findFirst": return { id: "status-in-use" }
    case "location.findFirst": return where.id === "loc-closed" ? null : { id: where.id }
    case "location.findMany": return (idsIn(where.id) ?? []).filter((id) => id !== "loc-closed").map((id) => ({ id }))
    case "systemSetting.findUnique": return null
    case "systemSetting.findMany": return []
    case "department.findFirst": return { id: "dept-it", code: "IT", name: "Information Technology" }
    case "assetCheckin.create": {
      const row = { id: `rt-${world.checkins.length + 1}`, documentNo: data.documentNo as string, assetId: data.assetId as string, checkoutId: data.checkoutId as string }
      world.checkins.push(row)
      return { ...data, ...row }
    }
    case "assetCheckin.update": return { ...world.checkins.find((row) => row.id === where.id), ...data }
    case "attachment.create": {
      world.attachments.push({ referenceId: data.referenceId as string, module: data.module as string, filePath: data.filePath as string })
      return { id: `att-${world.attachments.length}` }
    }
    case "assetMovement.create": return { id: "move-new" }
    default: throw new Error(`fake db: unexpected ${model}.${method}`)
  }
}

const fakeDb = new Proxy({}, {
  get(_target, key) {
    if (key === "$transaction") {
      return async (callback: (tx: unknown) => Promise<unknown>, options: unknown) => {
        world.transactionOptions.push(options)
        world.inTransaction = true
        try {
          return await callback(fakeDb)
        } finally {
          world.inTransaction = false
        }
      }
    }
    const model = String(key)
    return new Proxy({}, {
      get(_inner, method) {
        return async (args: Args) => {
          world.calls.push(`${world.inTransaction ? "tx" : "db"}:${model}.${String(method)}`)
          return handle(model, String(method), args)
        }
      },
    })
  },
})
Object.assign(globalThis, { __batchCheckinWorld: world, __batchCheckinDb: fakeDb })

const mockedModuleSources = new Map<string, string>([
  ["next/server", `
    export class NextRequest extends Request {}
    export class NextResponse extends Response {
      static json(body, init) { return Response.json(body, init) }
    }
  `],
  ["@/lib/db", `export const prisma = globalThis.__batchCheckinDb`],
  ["@/lib/auth-utils", `
    export async function requireAuth() { return { id: "user-1", roles: ["system_admin"], permissions: [], employeeId: "emp-1" } }
    export function hasRole(user, role) { return user.roles.includes(role) }
    export function hasPermission() { return true }
    export function requirePermission() {}
  `],
  ["@/lib/audit-log", `
    export async function logAudit(entry) { globalThis.__batchCheckinWorld.audits.push({ action: entry.action, recordId: entry.recordId }) }
  `],
  ["@/lib/operation-document-number", `
    export async function generateCheckinDocumentNo() {
      const world = globalThis.__batchCheckinWorld
      world.documentNumbers += 1
      world.calls.push("documentNo.checkin")
      return "RT-202611-000" + world.documentNumbers
    }
    export async function generateCheckoutDocumentNo() { return "HO-202611-0009" }
  `],
  ["@/lib/asset-component-sync", `
    export async function syncInstalledComponentsWithParent() { return { updated: 0, skipped: 0, movements: 0, componentSnapshots: [] } }
  `],
  ["@/lib/asset-operation-evidence", `
    const world = () => globalThis.__batchCheckinWorld
    export function optionalFormFile(formData, name) { const value = formData.get(name); return value instanceof File && value.size > 0 && value.name.trim() ? value : null }
    export function optionalFormText(formData, name) { const value = formData.get(name); return typeof value === "string" && value.trim() ? value.trim() : null }
    export function requiredFormText(formData, name) { const value = formData.get(name); return typeof value === "string" ? value : "" }
    export async function saveOperationEvidenceFile(file, operation) {
      world().saves.push(file.name)
      return { fileName: "saved-" + file.name, originalName: file.name, fileType: file.type, fileSize: file.size, filePath: "uploads/" + operation + "/" + file.name }
    }
  `],
  ["@/lib/upload-server", `
    const world = () => globalThis.__batchCheckinWorld
    export function createUploadCleanup() {
      const filePaths = []
      let committed = false
      return {
        track(filePath) { filePaths.push(filePath) },
        commit() { committed = true },
        async discardIfUncommitted() { if (!committed) world().discards.push(...filePaths.splice(0)) },
      }
    }
  `],
])

;(nodeModule as unknown as {
  registerHooks(hooks: { resolve(specifier: string, context: unknown, next: (specifier: string, context: unknown) => unknown): unknown }): void
}).registerHooks({
  resolve(specifier, context, next) {
    const source = mockedModuleSources.get(specifier)
    if (source !== undefined) return { url: `data:text/javascript;charset=utf-8,${encodeURIComponent(source)}`, shortCircuit: true }
    if (specifier.startsWith("@/")) {
      const base = `src/${specifier.slice(2)}`
      const file = [`${base}.ts`, `${base}.tsx`, `${base}/index.ts`].find((candidate) => existsSync(candidate))
      if (file) return { url: pathToFileURL(file).href, shortCircuit: true }
    }
    return next(specifier, context)
  },
})

const validation = await import(pathToFileURL("src/lib/validations/batch-checkin.ts").href) as typeof import("../src/lib/validations/batch-checkin.ts")
const service = await import(pathToFileURL("src/lib/batch-checkin-service.ts").href) as typeof import("../src/lib/batch-checkin-service.ts")
const route = await import(pathToFileURL("src/app/api/asset-checkins/batch/route.ts").href) as { POST(request: Request): Promise<Response> }
const { ZodError } = await import("zod")

beforeEach(() => {
  Object.assign(world, freshWorld())
})

const user = { id: "user-1", name: "IT", roles: ["system_admin"], permissions: [], employeeId: "emp-1" } as never
const now = new Date("2026-11-07T03:00:00Z")
const saved = (name: string) => ({ fileName: `saved-${name}`, originalName: name, fileType: "image/png", fileSize: 10, filePath: `uploads/checkin/${name}` })
const evidence = { returnSignature: saved("return.png"), receiveSignature: saved("receive.png"), photosAfterByAsset: new Map() }

type ItemOverrides = Partial<{ assetId: string; checkoutId: string | null; conditionAfter: string; nextStatusId: string; nextLocationId: string }>
function item(assetId: string, checkoutId: string | null, overrides: ItemOverrides = {}) {
  return { assetId, checkoutId, conditionAfter: "condition-good", nextStatusId: "status-ready", ...overrides }
}
function body(items: unknown[], overrides: Record<string, unknown> = {}) {
  return {
    employeeId: "emp-5", returnDate: "2026-11-07", returnBy: "สมชาย", returnByEmployeeId: "emp-5", receiveBy: "สมหญิง",
    receiveByEmployeeId: "emp-1", nextLocationId: "loc-store", items, ...overrides,
  }
}
const parse = (items: unknown[], overrides: Record<string, unknown> = {}) => validation.batchCheckinSchema.parse(body(items, overrides))

async function blockedOf(run: Promise<unknown>) {
  const error = await run.then(() => null, (caught: unknown) => caught)
  assert.ok(error instanceof service.BatchCheckinBlockedError, `expected a blocked refusal, got ${String(error)}`)
  return error.blocked
}

async function runBatch(items: unknown[]) {
  const plan = await service.readBatchCheckinPlan(fakeDb as never, parse(items), { now })
  return (fakeDb as { $transaction(callback: (tx: unknown) => Promise<unknown>, options: unknown): Promise<unknown> }).$transaction(
    (tx) => service.writeBatchCheckinInTransaction(tx as never, plan, evidence, { user, inUseStatusId: "status-in-use", now }),
    service.batchCheckinTransactionOptions,
  ) as Promise<Awaited<ReturnType<typeof service.writeBatchCheckinInTransaction>>>
}

// --- the schema (G7P4-R3) ---

test("a multi-return takes 1 to 50 machines, each once (G7P4-R3)", () => {
  assert.equal(validation.MAX_BATCH_CHECKIN_ITEMS, 50)
  const many = (count: number) => Array.from({ length: count }, (_, index) => item(`asset-${index}`, null))
  assert.equal(parse(many(50)).items.length, 50)
  for (const items of [many(51), []]) {
    assert.throws(() => parse(items), (error: unknown) => error instanceof ZodError && error.issues.some((issue) => issue.path[0] === "items"))
  }
  assert.throws(() => parse([item("asset-a", "co-a"), item("asset-a", "co-a")]), (error: unknown) => {
    return error instanceof ZodError && error.issues.some((issue) => issue.message === "BATCH_CHECKIN_DUPLICATE_ASSET" && issue.path.join(".") === "items.1.assetId")
  })
  // A blank checkoutId is a held asset with no handover; a room override is optional.
  const parsed = parse([{ assetId: "asset-c", checkoutId: "", conditionAfter: "condition-good", nextStatusId: "status-ready" }])
  assert.equal(parsed.items[0].checkoutId, null)
  assert.equal(parsed.items[0].nextLocationId, undefined)
})

// --- one RT-, signatures stored once (G7P4-R1, G7P4-R5) ---

test("two machines share one RT- number, generated once inside the transaction, and each record gets both signatures pointing at the same stored files (G7P4-R1, R5)", async () => {
  const result = await runBatch([item("asset-b", "co-b"), item("asset-a", "co-a", { nextLocationId: "loc-shelf" })])
  assert.equal(world.documentNumbers, 1)
  assert.equal(result.documentNo, "RT-202611-0001")
  assert.deepEqual(world.checkins.map((row) => [row.assetId, row.documentNo]), [["asset-a", "RT-202611-0001"], ["asset-b", "RT-202611-0001"]], "written in asset-id order")
  // The answer keeps the request's order.
  assert.deepEqual(result.machines.map((machine) => machine.assetId), ["asset-b", "asset-a"])
  assert.equal(result.machines[1].checkin.nextLocationId, "loc-shelf")
  assert.equal(result.machines[0].checkin.nextLocationId, "loc-store")
  for (const record of world.checkins) {
    assert.deepEqual(world.attachments.filter((row) => row.referenceId === record.id).map((row) => [row.module, row.filePath]), [
      ["checkin_return_signature", "uploads/checkin/return.png"],
      ["checkin_receive_signature", "uploads/checkin/receive.png"],
    ])
  }
  assert.deepEqual(world.transactionOptions, [{ isolationLevel: "Serializable", maxWait: 10_000, timeout: 120_000 }])
  // The RT- number is taken after the handovers are re-read, before the first record.
  const calls = world.calls.filter((call) => call.startsWith("tx:") || call === "documentNo.checkin")
  assert.ok(calls.indexOf("documentNo.checkin") > calls.indexOf("tx:assetCheckout.findMany"))
  assert.ok(calls.indexOf("documentNo.checkin") < calls.indexOf("tx:assetCheckin.create"))
})

// --- Review Focus 1 ---

test("a handover returned elsewhere before the save refuses the whole save and names that machine (Review Focus 1)", async () => {
  world.checkouts.find((row) => row.id === "co-b")!.isReturned = true
  const blocked = await blockedOf(runBatch([item("asset-a", "co-a"), item("asset-b", "co-b")]))
  assert.deepEqual(blocked, [{ assetId: "asset-b", assetTag: "NB-002", code: "ASSET_CHANGED_DURING_OPERATION" }])
  assert.equal(world.checkins.length, 0)
})

test("a handover returned elsewhere during the save is named before the RT- number is taken, and nothing is written (Review Focus 1)", async () => {
  world.returnedMeanwhile.add("co-b")
  const blocked = await blockedOf(runBatch([item("asset-a", "co-a"), item("asset-b", "co-b")]))
  assert.deepEqual(blocked, [{ assetId: "asset-b", assetTag: "NB-002", code: "ASSET_CHANGED_DURING_OPERATION" }])
  assert.equal(world.documentNumbers, 0)
  assert.equal(world.checkins.length, 0)
})

test("a claim lost to another save refuses the whole save and names the machine whose claim lost", async () => {
  world.lostClaims.add("co-b")
  const blocked = await blockedOf(runBatch([item("asset-a", "co-a"), item("asset-b", "co-b")]))
  assert.deepEqual(blocked, [{ assetId: "asset-b", assetTag: "NB-002", code: "ASSET_CHANGED_DURING_OPERATION" }])
})

// --- Review Focus 2, G7P4-R2 ---

test("a machine with an open repair, ส่งซ่อม as its next status, or held as an outstanding component is refused as BATCH_CHECKIN_NEEDS_SINGLE, and every refused machine is named in one answer (Review Focus 2)", async () => {
  world.repairs.add("asset-a")
  world.outstanding.add("asset-c")
  const blocked = await blockedOf(service.readBatchCheckinPlan(fakeDb as never, parse([
    item("asset-a", "co-a"),
    item("asset-b", "co-b", { nextStatusId: "status-repair" }),
    item("asset-c", null),
  ]), { now }))
  assert.deepEqual(blocked, [
    { assetId: "asset-a", assetTag: "NB-001", code: "BATCH_CHECKIN_NEEDS_SINGLE" },
    { assetId: "asset-b", assetTag: "NB-002", code: "BATCH_CHECKIN_NEEDS_SINGLE" },
    { assetId: "asset-c", assetTag: "NB-003", code: "BATCH_CHECKIN_NEEDS_SINGLE" },
  ])
  assert.equal(world.calls.some((call) => call.startsWith("tx:")), false)
})

test("a repair opened during the save refuses it as BATCH_CHECKIN_NEEDS_SINGLE (G7P4-R2)", async () => {
  const plan = await service.readBatchCheckinPlan(fakeDb as never, parse([item("asset-a", "co-a")]), { now })
  world.repairs.add("asset-a")
  const blocked = await blockedOf(service.writeBatchCheckinInTransaction(fakeDb as never, plan, evidence, { user, inUseStatusId: null, now }))
  assert.deepEqual(blocked, [{ assetId: "asset-a", assetTag: "NB-001", code: "BATCH_CHECKIN_NEEDS_SINGLE" }])
})

test("a machine not held by the multi-return's holder, a deactivated one, a stale room and a date before the handover are each named", async () => {
  world.checkouts.find((row) => row.id === "co-b")!.custodianId = "emp-9"
  world.assets.get("asset-c")!.isActive = false
  world.checkouts.find((row) => row.id === "co-a")!.checkoutDate = new Date("2026-11-08T03:00:00Z")
  const blocked = await blockedOf(service.readBatchCheckinPlan(fakeDb as never, parse([
    item("asset-a", "co-a"),
    item("asset-b", "co-b"),
    item("asset-c", null),
  ]), { now: new Date("2026-11-09T03:00:00Z") }))
  assert.deepEqual(blocked.map((row) => [row.assetId, row.code]), [
    ["asset-a", "CHECKIN_RETURN_DATE_BEFORE_HANDOVER"],
    ["asset-b", "BATCH_CHECKIN_NOT_HELD"],
    ["asset-c", "ASSET_NOT_ACTIVE"],
  ])
  world.checkouts.find((row) => row.id === "co-a")!.checkoutDate = new Date("2026-10-01T03:00:00Z")
  const roomBlocked = await blockedOf(service.readBatchCheckinPlan(fakeDb as never, parse([item("asset-a", "co-a", { nextLocationId: "loc-closed" })]), { now }))
  assert.deepEqual(roomBlocked.map((row) => row.code), ["ASSET_CHECKIN_LOCATION_INACTIVE"])
})

test("the form's own fields are refused under them: a future date, an inactive room for all", async () => {
  const future = await service.readBatchCheckinPlan(fakeDb as never, parse([item("asset-a", "co-a")], { returnDate: "2026-11-09" }), { now }).catch((error: unknown) => error)
  assert.ok(future instanceof service.BatchCheckinFieldError)
  assert.deepEqual([future.status, future.code, future.fieldErrors], [400, "CHECKIN_RETURN_DATE_IN_FUTURE", { returnDate: "checkinReturnDateInFuture" }])
  const room = await service.readBatchCheckinPlan(fakeDb as never, parse([item("asset-a", "co-a")], { nextLocationId: "loc-closed" }), { now }).catch((error: unknown) => error)
  assert.ok(room instanceof service.BatchCheckinFieldError)
  assert.deepEqual([room.status, room.code, room.fieldErrors], [409, "ASSET_CHECKIN_LOCATION_INACTIVE", { nextLocationId: "checkinLocationInactive" }])
})

// --- Review Focus 5, G7P4-R6 ---

test("a held asset with no handover gets its HO- backfilled in the same transaction and returned under it (Review Focus 5)", async () => {
  const result = await runBatch([item("asset-a", "co-a"), item("asset-c", null)])
  const backfill = world.checkouts.find((row) => row.assetId === "asset-c")!
  assert.equal(backfill.remark, "legacy_return_backfill: Created from current custodian before check-in")
  assert.equal(backfill.isReturned, true, "the return claimed the backfilled HO-")
  assert.deepEqual(world.checkins.map((row) => [row.assetId, row.checkoutId]), [["asset-a", "co-a"], ["asset-c", backfill.id]])
  assert.equal(result.machines[1].backfilledCheckoutId, backfill.id)
  assert.equal(result.machines[0].backfilledCheckoutId, null)
  // The backfill comes before the RT- number, inside the transaction.
  assert.ok(world.calls.indexOf("backfill asset-c") < world.calls.indexOf("documentNo.checkin"))
})

test("a refused save after a backfill throws out of the transaction, so its HO- is rolled back with the rest (Review Focus 5)", async () => {
  world.lostClaims.add("co-a")
  // asset-c sorts after asset-a, but its backfill runs before any return is written.
  const blocked = await blockedOf(runBatch([item("asset-c", null), item("asset-a", "co-a")]))
  assert.deepEqual(blocked, [{ assetId: "asset-a", assetTag: "NB-001", code: "ASSET_CHANGED_DURING_OPERATION" }])
  assert.ok(world.calls.includes("backfill asset-c"), "the backfill ran inside the refused transaction")
  assert.equal(world.transactionOptions.length, 1)
})

test("a held asset handed to someone else during the save is refused before its backfill", async () => {
  const plan = await service.readBatchCheckinPlan(fakeDb as never, parse([item("asset-c", null)]), { now })
  world.assets.get("asset-c")!.custodianId = "emp-9"
  const blocked = await blockedOf(service.writeBatchCheckinInTransaction(fakeDb as never, plan, evidence, { user, inUseStatusId: "status-in-use", now }))
  assert.deepEqual(blocked, [{ assetId: "asset-c", assetTag: "NB-003", code: "BATCH_CHECKIN_NOT_HELD" }])
  assert.equal(world.calls.includes("backfill asset-c"), false)
})

// --- the route ---

function png(name: string) {
  return new File([new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 0])], name, { type: "image/png" })
}

function request(fields: Record<string, unknown>, files: Record<string, File> = {}) {
  const formData = new FormData()
  for (const [key, value] of Object.entries(fields)) formData.append(key, typeof value === "string" ? value : JSON.stringify(value))
  for (const [key, file] of Object.entries(files)) formData.append(key, file)
  return new Request("http://localhost/api/asset-checkins/batch", { method: "POST", body: formData })
}

const signatures = () => ({ returnSignatureFile: png("return.png"), receiveSignatureFile: png("receive.png") })

test("missing signatures are refused under their fields before anything is read or saved (Review Focus 4)", async () => {
  const response = await route.POST(request(body([item("asset-a", "co-a")]), { receiveSignatureFile: png("receive.png") }))
  assert.equal(response.status, 400)
  assert.deepEqual(await response.json(), {
    code: "BATCH_CHECKIN_SIGNATURE_REQUIRED",
    error: "BATCH_CHECKIN_SIGNATURE_REQUIRED",
    fieldErrors: { returnSignatureFile: "batchCheckinSignatureRequired" },
  })
  assert.deepEqual([world.calls, world.saves], [[], []])
})

test("51 machines are refused under items before anything is read (G7P4-R3)", async () => {
  const items = Array.from({ length: 51 }, (_, index) => item(`asset-${index}`, null))
  const response = await route.POST(request(body(items), signatures()))
  assert.equal(response.status, 400)
  const payload = await response.json() as { code: string; fieldErrors: Record<string, string> }
  assert.equal(payload.code, "VALIDATION_FAILED")
  assert.ok("items" in payload.fieldErrors)
  assert.deepEqual([world.calls, world.saves], [[], []])
})

test("a blocked machine answers 409 with blocked[] and saves no file", async () => {
  world.repairs.add("asset-b")
  const response = await route.POST(request(body([item("asset-a", "co-a"), item("asset-b", "co-b")]), { ...signatures(), "photoAfterFiles[asset-a]": png("a.png") }))
  assert.equal(response.status, 409)
  assert.deepEqual(await response.json(), {
    code: "BATCH_CHECKIN_NEEDS_SINGLE",
    error: "BATCH_CHECKIN_NEEDS_SINGLE",
    blocked: [{ assetId: "asset-b", assetTag: "NB-002", code: "BATCH_CHECKIN_NEEDS_SINGLE" }],
  })
  assert.deepEqual(world.saves, [])
})

test("a refusal inside the transaction removes the files the save wrote", async () => {
  world.returnedMeanwhile.add("co-b")
  const response = await route.POST(request(body([item("asset-a", "co-a"), item("asset-b", "co-b")]), { ...signatures(), "photoAfterFiles[asset-a]": png("a.png") }))
  assert.equal(response.status, 409)
  assert.deepEqual((await response.json() as { blocked: unknown }).blocked, [{ assetId: "asset-b", assetTag: "NB-002", code: "ASSET_CHANGED_DURING_OPERATION" }])
  assert.deepEqual(world.saves.sort(), ["a.png", "receive.png", "return.png"])
  assert.deepEqual(world.discards.sort(), ["uploads/checkin/a.png", "uploads/checkin/receive.png", "uploads/checkin/return.png"])
})

test("a photo for a machine not in the list is refused before anything is saved", async () => {
  const response = await route.POST(request(body([item("asset-a", "co-a")]), { ...signatures(), "photoAfterFiles[asset-z]": png("z.png") }))
  assert.equal(response.status, 400)
  assert.deepEqual((await response.json() as { fieldErrors: unknown }).fieldErrors, { "photoAfterFiles[asset-z]": "invalid" })
  assert.deepEqual(world.saves, [])
})

test("a saved multi-return answers 201 { documentNo, checkinIds, firstCheckinId } in request order, keeps its files, and logs each machine after commit", async () => {
  const response = await route.POST(request(body([item("asset-c", null), item("asset-a", "co-a")]), { ...signatures(), "photoAfterFiles[asset-a]": png("a.png") }))
  assert.equal(response.status, 201)
  const payload = await response.json() as { documentNo: string; checkinIds: string[]; firstCheckinId: string }
  const idOf = (assetId: string) => world.checkins.find((row) => row.assetId === assetId)!.id
  assert.deepEqual(payload, { documentNo: "RT-202611-0001", checkinIds: [idOf("asset-c"), idOf("asset-a")], firstCheckinId: idOf("asset-c") })
  assert.deepEqual(world.discards, [])
  // The signatures are stored once: two saves for two machines, plus the one photo.
  assert.deepEqual(world.saves.sort(), ["a.png", "receive.png", "return.png"])
  assert.deepEqual(world.attachments.filter((row) => row.module === "checkin_photo_after").map((row) => [row.referenceId, row.filePath]), [[idOf("asset-a"), "uploads/checkin/a.png"]])
  assert.deepEqual(world.audits, [
    { action: "legacy_return_backfill", recordId: "asset-c" },
    { action: "checkin", recordId: "asset-c" },
    { action: "checkin", recordId: "asset-a" },
  ])
})

// --- source pins (CRLF-safe: whole files, single-line patterns) ---

test("the route checks, saves and writes in the plan's order, in one Serializable transaction with deadlock retry", () => {
  const source = readFileSync("src/app/api/asset-checkins/batch/route.ts", "utf8")
  const order = [
    "requirePermission(user, \"asset\", \"edit\")",
    "readBatchCheckinRequest(request)",
    "BATCH_CHECKIN_SIGNATURE_REQUIRED",
    "readBatchCheckinPlan(prisma, input",
    "saveTrackedEvidenceFiles(",
    "withDeadlockRetry(() => prisma.$transaction(",
    "uploads.commit()",
    "await logAudit(",
  ].map((needle) => source.indexOf(needle))
  assert.ok(order.every((index) => index >= 0), String(order))
  assert.deepEqual([...order].sort((left, right) => left - right), order)
  const serviceSource = readFileSync("src/lib/batch-checkin-service.ts", "utf8")
  assert.match(serviceSource, /isolationLevel: "Serializable",/)
  assert.match(serviceSource, /maxWait: 10_000,/)
  assert.match(serviceSource, /timeout: 120_000,/)
  assert.match(serviceSource, /writeCheckinInTransaction\(tx, \{/)
  assert.match(serviceSource, /backfillLegacyCheckoutInTransaction\(tx, \{/)
  assert.equal(serviceSource.match(/generateCheckinDocumentNo\(/g)?.length, 1)
})
