import assert from "node:assert/strict"
import { existsSync, readFileSync } from "node:fs"
import * as nodeModule from "node:module"
import { beforeEach, test } from "node:test"
import { pathToFileURL } from "node:url"
import { bulkUpdateBlockedOrder, bulkUpdateBlockedReasonKey } from "../src/lib/bulk-update-blocked.ts"

// POST /api/assets/bulk-update is a data correction (group 4 decisions 3 and 11; plan 1 Task 7, P1-R1, P1-R5, P1-R6).

type AssetRow = {
  id: string
  assetTag: string
  ownershipType: string
  statusName: string
  conditionName: string
  currentLocationId: string
  custodianId: string | null
  departmentId: string | null
  isActive: boolean
}
type World = {
  assets: Record<string, AssetRow>
  employees: Record<string, { id: string; departmentId: string; isActive: boolean }>
  /** Each `employee.findFirst` takes the next of these first (true = active), if any. */
  employeeAnswers: boolean[]
  inactiveLocationIds: string[]
  openCheckouts: string[]
  /** Each `assetCheckout.findMany` takes the next of these first, if any. */
  checkoutAnswers: string[][]
  outstanding: string[]
  /** Each `assetComponent.findMany` takes the next of these first, if any. */
  outstandingAnswers: string[][]
  onTransaction: (() => void) | null
  transactionErrors: unknown[]
  calls: Array<{ call: string; args: Record<string, unknown> }>
}

const asset = (id: string, fields: Partial<AssetRow> = {}): AssetRow => ({
  id, assetTag: id.toUpperCase(), ownershipType: "personal", statusName: "Ready", conditionName: "Good",
  currentLocationId: "loc-1", custodianId: null, departmentId: "dept-it", isActive: true, ...fields,
})

function freshWorld(): World {
  return {
    assets: Object.fromEntries([
      asset("personal-1", { statusName: "In Use", custodianId: "emp-a", departmentId: "dept-a" }),
      asset("shared-1", { ownershipType: "shared", custodianId: "emp-a", departmentId: "dept-shared" }),
      asset("stock-1", { ownershipType: "stock", departmentId: "dept-it" }),
      // Held by emp-old (who has left), recorded under the wrong department.
      asset("drifted-1", { statusName: "In Use", custodianId: "emp-old", departmentId: "dept-wrong" }),
      asset("broken-1", { conditionName: "Damaged" }),
      asset("license-1", { ownershipType: "software_license" }),
      asset("component-1", { ownershipType: "component" }),
      asset("loaned-1", { statusName: "Checked Out", custodianId: "emp-a", departmentId: "dept-a" }),
      asset("disposed-1", { statusName: "Disposed" }),
      asset("repair-1", { statusName: "Under Maintenance" }),
      asset("gone-1", { isActive: false }),
    ].map((row) => [row.id, row])),
    employees: {
      "emp-a": { id: "emp-a", departmentId: "dept-a", isActive: true },
      "emp-b": { id: "emp-b", departmentId: "dept-b", isActive: true },
      "emp-old": { id: "emp-old", departmentId: "dept-old", isActive: false },
      "emp-left": { id: "emp-left", departmentId: "dept-left", isActive: false },
    },
    employeeAnswers: [],
    inactiveLocationIds: [],
    openCheckouts: ["loaned-1"],
    checkoutAnswers: [],
    outstanding: [],
    outstandingAnswers: [],
    onTransaction: null,
    transactionErrors: [],
    calls: [],
  }
}
let world = freshWorld()
Object.assign(globalThis, { __bulkUpdateWorld: () => world })
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
  ["@/lib/asset-status-flow", `export async function getRequiredAssetStatusId(name) { return "status:" + name }`],
  ["@/lib/asset-component-sync", `
    export async function syncInstalledComponentsWithParent(_tx, input) {
      globalThis.__bulkUpdateWorld().calls.push({ call: "sync", args: input })
      return { updated: 0, skipped: 0, movements: 0, componentSnapshots: [] }
    }
  `],
  ["@/lib/db", `
    const world = () => globalThis.__bulkUpdateWorld()
    const toRow = (asset) => ({
      id: asset.id, assetTag: asset.assetTag, name: "Laptop", ownershipType: asset.ownershipType,
      statusId: "status:" + asset.statusName, currentLocationId: asset.currentLocationId, custodianId: asset.custodianId,
      departmentId: asset.departmentId, isActive: asset.isActive, status: { name: asset.statusName },
    })
    // Each where key: an equality (null included) or { in }.
    const matches = (row, where = {}) => Object.entries(where).every(([key, condition]) => {
      if (condition && typeof condition === "object" && "in" in condition) return condition.in.includes(row[key])
      return row[key] === condition
    })
    function model(name) {
      return new Proxy({}, {
        get(_target, method) {
          return async (args = {}) => {
            world().calls.push({ call: name + "." + String(method), args })
            const where = args.where ?? {}
            if (name === "asset" && method === "findMany") {
              const ids = where.id?.in ?? []
              return ids.map((id) => world().assets[id]).filter(Boolean).map(toRow).filter((row) => matches(row, where))
            }
            if (name === "asset" && method === "updateMany") {
              const row = world().assets[where.id]
              if (!row || !matches(toRow(row), where)) return { count: 0 }
              const { updatedBy, statusId, ...data } = args.data
              Object.assign(row, data, statusId ? { statusName: statusId.replace("status:", "") } : {})
              return { count: 1 }
            }
            if (name === "employee" && method === "findFirst") {
              const employee = world().employees[where.id]
              const active = world().employeeAnswers.length > 0 ? world().employeeAnswers.shift() : employee?.isActive
              if (!employee || (where.isActive !== undefined && active !== where.isActive)) return null
              return { id: employee.id, departmentId: employee.departmentId }
            }
            if (name === "employee" && method === "findMany") {
              return Object.values(world().employees).filter((row) => matches(row, where)).map((row) => ({ id: row.id, departmentId: row.departmentId }))
            }
            if (name === "location" && method === "findFirst") {
              return world().inactiveLocationIds.includes(where.id) ? null : { id: where.id }
            }
            if (name === "assetCheckout" && method === "findMany") {
              const open = world().checkoutAnswers.length > 0 ? world().checkoutAnswers.shift() : world().openCheckouts
              return open.filter((id) => (where.assetId?.in ?? []).includes(id)).map((assetId) => ({ assetId }))
            }
            if (name === "assetComponent" && method === "findMany") {
              const out = world().outstandingAnswers.length > 0 ? world().outstandingAnswers.shift() : world().outstanding
              return out.filter((id) => (where.componentAssetId?.in ?? []).includes(id))
                .map((componentAssetId) => ({ componentAssetId, componentAsset: { assetTag: componentAssetId.toUpperCase() } }))
            }
            if (method === "createMany") return { count: args.data.length }
            throw new Error("unexpected " + name + "." + String(method))
          }
        },
      })
    }
    const client = new Proxy({}, {
      get(_target, key) {
        if (key === "$transaction") return async (callback, options) => {
          world().calls.push({ call: "$transaction", args: options })
          if (world().transactionErrors.length > 0) throw world().transactionErrors.shift()
          world().onTransaction?.()
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

const route = await import(pathToFileURL("src/app/api/assets/bulk-update/route.ts").href) as {
  POST(request: Request): Promise<Response>
}

type Movement = { assetId: string; movementType: string; fromValue: string | null; toValue: string | null; reason: string; referenceType: string; referenceId: string }

const post = (body: Record<string, unknown>) => route.POST(new Request("http://localhost/api/assets/bulk-update", {
  method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ reason: "บันทึกผิด", ...body }),
}))
const callsOf = (name: string) => world.calls.filter(({ call }) => call === name).map(({ args }) => args)
const callNames = () => world.calls.map(({ call }) => call)
const claims = () => callsOf("asset.updateMany") as Array<{ where: Record<string, unknown>; data: Record<string, unknown> }>
const movements = () => callsOf("assetMovement.createMany").flatMap((args) => args.data as Movement[])
const syncs = () => callsOf("sync") as Array<{ parentAssetId: string; changes: Record<string, unknown>; movementType: string; referenceType: string; referenceId: string; reason: string }>
const blockedEntry = (assetId: string, code: string) => ({ assetId, assetTag: assetId.toUpperCase(), code })
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/

test("one holder for a held บุคคล asset and a ส่วนกลาง asset: บุคคล takes the holder's department with a correction row, ส่วนกลาง keeps its own and gets none (Review Focus 2)", async () => {
  const response = await post({ assetIds: ["personal-1", "shared-1", "stock-1"], toCustodianId: "emp-b" })
  assert.equal(response.status, 200)

  assert.equal(world.assets["personal-1"].custodianId, "emp-b")
  assert.equal(world.assets["personal-1"].departmentId, "dept-b")
  assert.equal(world.assets["stock-1"].departmentId, "dept-b")
  assert.equal(world.assets["shared-1"].custodianId, "emp-b")
  assert.equal(world.assets["shared-1"].departmentId, "dept-shared")

  const rows = movements()
  assert.deepEqual(rows.map((row) => [row.assetId, row.movementType, row.fromValue, row.toValue]), [
    ["personal-1", "register_custodian_correction", "emp-a", "emp-b"],
    ["personal-1", "register_department_correction", "dept-a", "dept-b"],
    ["shared-1", "register_custodian_correction", "emp-a", "emp-b"],
    ["stock-1", "register_custodian_correction", null, "emp-b"],
    ["stock-1", "register_department_correction", "dept-it", "dept-b"],
  ])
  const referenceId = rows[0].referenceId
  assert.match(referenceId, UUID, "one batch reference, a UUID (P1-R5)")
  for (const row of rows) {
    assert.equal(row.referenceId, referenceId)
    assert.equal(row.referenceType, "bulk_update")
    assert.equal(row.reason, "บันทึกผิด")
  }
  for (const sync of syncs()) {
    assert.equal(sync.referenceId, referenceId)
    assert.equal(sync.referenceType, "bulk_update")
    assert.equal(sync.movementType, "parent_bulk_update_sync")
  }
  assert.deepEqual(syncs().map((sync) => [sync.parentAssetId, sync.changes]), [
    ["personal-1", { custodianId: "emp-b", departmentId: "dept-b" }],
    ["shared-1", { custodianId: "emp-b" }],
    ["stock-1", { custodianId: "emp-b", departmentId: "dept-b" }],
  ])
  assert.equal(rows.some((row) => /^bulk_.*_update$|^department_change$/.test(row.movementType)), false)
})

test("a holder sets In Use only on บุคคล and Stock; a ส่วนกลาง asset keeps its status", async () => {
  const response = await post({ assetIds: ["personal-1", "shared-1", "stock-1"], toCustodianId: "emp-b" })
  assert.equal(response.status, 200)
  assert.equal(world.assets["personal-1"].statusName, "In Use")
  assert.equal(world.assets["stock-1"].statusName, "In Use")
  assert.equal(world.assets["shared-1"].statusName, "Ready")
  const byId = new Map(claims().map((claim) => [claim.where.id, claim.data]))
  assert.equal(byId.get("stock-1")?.statusId, "status:In Use")
  assert.equal("statusId" in (byId.get("shared-1") ?? {}), false)
})

test("a room-only save of a held บุคคล asset whose department differs from its holder's corrects the department, the holder read without the active filter (Review Focus 3)", async () => {
  const response = await post({ assetIds: ["drifted-1", "shared-1"], toLocationId: "loc-2" })
  assert.equal(response.status, 200)
  assert.equal(world.assets["drifted-1"].currentLocationId, "loc-2")
  assert.equal(world.assets["drifted-1"].departmentId, "dept-old")
  assert.equal(world.assets["drifted-1"].statusName, "In Use")
  assert.equal(world.assets["shared-1"].departmentId, "dept-shared")
  assert.deepEqual(movements().map((row) => [row.assetId, row.movementType, row.fromValue, row.toValue]), [
    ["drifted-1", "register_location_correction", "loc-1", "loc-2"],
    ["drifted-1", "register_department_correction", "dept-wrong", "dept-old"],
    ["shared-1", "register_location_correction", "loc-1", "loc-2"],
  ])
  const holderReads = callsOf("employee.findMany") as Array<{ where: Record<string, unknown> }>
  assert.ok(holderReads.length > 0)
  for (const read of holderReads) assert.equal("isActive" in read.where, false, "the current holder is read without isActive")
  assert.deepEqual(syncs().map((sync) => [sync.parentAssetId, sync.changes]), [
    ["drifted-1", { currentLocationId: "loc-2", departmentId: "dept-old" }],
    ["shared-1", { currentLocationId: "loc-2" }],
  ])
})

test("one 409 names every refused asset in order: not active, outstanding, License, open handover, status; nothing is written", async () => {
  world.outstanding = ["component-1"]
  const response = await post({ assetIds: ["disposed-1", "loaned-1", "personal-1", "license-1", "component-1", "gone-1", "missing-1"], toLocationId: "loc-2" })
  assert.equal(response.status, 409)
  assert.deepEqual(await response.json(), {
    code: "ASSET_NOT_ACTIVE", error: "ASSET_NOT_ACTIVE",
    blocked: [
      blockedEntry("gone-1", "ASSET_NOT_ACTIVE"),
      { assetId: "missing-1", assetTag: "missing-1", code: "ASSET_NOT_ACTIVE" },
      blockedEntry("component-1", "ASSET_COMPONENT_OUTSTANDING"),
      blockedEntry("license-1", "ASSET_LICENSE_MOVE_NOT_ALLOWED"),
      blockedEntry("loaned-1", "ASSET_ACTIVE_CHECKOUT_EXISTS"),
      blockedEntry("disposed-1", "ASSET_STATUS_TRANSFER_NOT_ALLOWED"),
    ],
  })
  for (const call of ["$transaction", "asset.updateMany", "assetMovement.createMany"]) assert.equal(callNames().includes(call), false, call)
})

test("a holder for a status that cannot take one is refused; a เสียหาย asset given a holder is not (P1-R1)", async () => {
  const refused = await post({ assetIds: ["repair-1", "broken-1"], toCustodianId: "emp-b" })
  assert.equal(refused.status, 409)
  assert.deepEqual((await refused.json() as { blocked: unknown }).blocked, [blockedEntry("repair-1", "ASSET_STATUS_TRANSFER_NOT_ALLOWED")])

  world = freshWorld()
  const broken = await post({ assetIds: ["broken-1"], toCustodianId: "emp-b" })
  assert.equal(broken.status, 200)
  assert.equal(world.assets["broken-1"].custodianId, "emp-b")
})

test("choosing an asset's own holder is not a holder change: a Pending Repair asset is not refused and keeps its status (final review A1)", async () => {
  world.assets["pending-1"] = asset("pending-1", { statusName: "Pending Repair", custodianId: "emp-a", departmentId: "dept-a" })
  const response = await post({ assetIds: ["pending-1", "personal-1"], toCustodianId: "emp-a", toLocationId: "loc-2" })
  assert.equal(response.status, 200)
  assert.equal(world.assets["pending-1"].currentLocationId, "loc-2")
  assert.equal(world.assets["pending-1"].statusName, "Pending Repair")
  assert.deepEqual(movements().map((row) => [row.assetId, row.movementType]), [
    ["pending-1", "register_location_correction"],
    ["personal-1", "register_location_correction"],
  ])

  // Another holder for the same Pending Repair asset is still refused.
  world = freshWorld()
  world.assets["pending-1"] = asset("pending-1", { statusName: "Pending Repair", custodianId: "emp-a", departmentId: "dept-a" })
  const refused = await post({ assetIds: ["pending-1"], toCustodianId: "emp-b", toLocationId: "loc-2" })
  assert.equal(refused.status, 409)
  assert.deepEqual((await refused.json() as { blocked: unknown }).blocked, [blockedEntry("pending-1", "ASSET_STATUS_TRANSFER_NOT_ALLOWED")])
})

test("a Ready บุคคล asset already held by the chosen person keeps Ready; one held by another person moves to In Use (final review A1)", async () => {
  world.assets["ready-held-1"] = asset("ready-held-1", { custodianId: "emp-a", departmentId: "dept-a" })
  world.assets["ready-other-1"] = asset("ready-other-1", { custodianId: "emp-b", departmentId: "dept-b" })
  const response = await post({ assetIds: ["ready-held-1", "ready-other-1"], toCustodianId: "emp-a", toLocationId: "loc-2" })
  assert.equal(response.status, 200)
  assert.equal(world.assets["ready-held-1"].statusName, "Ready")
  assert.equal(world.assets["ready-other-1"].statusName, "In Use")
  const byId = new Map(claims().map((claim) => [claim.where.id, claim.data]))
  assert.equal("statusId" in (byId.get("ready-held-1") ?? {}), false)
  assert.equal(byId.get("ready-other-1")?.statusId, "status:In Use")
})

test("more than 100 ids are refused 400 under assetIds before any read", async () => {
  const ids = Array.from({ length: 101 }, (_, index) => `asset-${index + 1}`)
  const response = await post({ assetIds: ids, toLocationId: "loc-2" })
  assert.equal(response.status, 400)
  assert.deepEqual(await response.json(), { error: "Invalid request data", code: "VALIDATION_FAILED", fieldErrors: { assetIds: "outOfRange" } })
  assert.deepEqual(world.calls, [])
})

test("an inactive employee is refused 409 under toCustodianId, before the transaction and again inside it", async () => {
  const before = await post({ assetIds: ["personal-1"], toCustodianId: "emp-left" })
  assert.equal(before.status, 409)
  assert.deepEqual(await before.json(), {
    code: "ASSET_TRANSFER_DESTINATION_INACTIVE", error: "ASSET_TRANSFER_DESTINATION_INACTIVE",
    fieldErrors: { toCustodianId: "checkoutReceiverInactive" },
  })
  assert.equal(callNames().includes("$transaction"), false)

  world = freshWorld()
  world.employeeAnswers = [true, false]
  const inside = await post({ assetIds: ["personal-1"], toCustodianId: "emp-b" })
  assert.equal(inside.status, 409)
  assert.deepEqual((await inside.json() as { fieldErrors: unknown }).fieldErrors, { toCustodianId: "checkoutReceiverInactive" })
  assert.equal(callNames().includes("$transaction"), true)
  assert.deepEqual(claims(), [])
  const reads = callsOf("employee.findFirst") as Array<{ where: Record<string, unknown>; select: Record<string, unknown> }>
  assert.equal(reads.length, 2)
  for (const read of reads) {
    assert.equal(read.where.isActive, true)
    assert.equal(read.select.departmentId, true)
  }
})

test("an inactive room is refused 409 under toLocationId", async () => {
  world.inactiveLocationIds = ["loc-closed"]
  const response = await post({ assetIds: ["personal-1"], toLocationId: "loc-closed" })
  assert.equal(response.status, 409)
  assert.deepEqual(await response.json(), {
    code: "ASSET_TRANSFER_DESTINATION_INACTIVE", error: "ASSET_TRANSFER_DESTINATION_INACTIVE",
    fieldErrors: { toLocationId: "checkoutLocationInactive" },
  })
  assert.deepEqual(claims(), [])
})

test("claims run in id order with the read room, holder and status in the where; a deadlock victim runs again with 60 s options", async () => {
  world.transactionErrors = [{ code: "P2034" }]
  const response = await post({ assetIds: ["stock-1", "personal-1"], toLocationId: "loc-2" })
  assert.equal(response.status, 200)
  assert.deepEqual(callsOf("$transaction"), [{ maxWait: 10_000, timeout: 60_000 }, { maxWait: 10_000, timeout: 60_000 }])
  assert.deepEqual(claims().map((claim) => claim.where.id), ["personal-1", "stock-1"])
  assert.deepEqual(claims()[0].where, { id: "personal-1", isActive: true, statusId: "status:In Use", currentLocationId: "loc-1", custodianId: "emp-a", departmentId: "dept-a" })
  assert.deepEqual(movements().map((row) => row.assetId), ["stock-1", "personal-1"], "the movements keep the request's order")
  assert.match(readFileSync("src/app/api/assets/bulk-update/route.ts", "utf8"), /await withDeadlockRetry\(\(\) => prisma\.\$transaction\(async \(tx\) => \{/)
})

test("a claim that misses fails with ASSET_CHANGED_DURING_OPERATION before any movement", async () => {
  world.onTransaction = () => { world.assets["personal-1"].currentLocationId = "loc-9" }
  const response = await post({ assetIds: ["personal-1"], toLocationId: "loc-2" })
  assert.equal(response.status, 409)
  assert.equal((await response.json() as { code: string }).code, "ASSET_CHANGED_DURING_OPERATION")
  assert.equal(callNames().includes("assetMovement.createMany"), false)
})

test("an outstanding link or an open handover found inside the transaction names its asset before any movement", async () => {
  world.outstandingAnswers = [[], ["stock-1"]]
  const outstanding = await post({ assetIds: ["stock-1"], toLocationId: "loc-2" })
  assert.equal(outstanding.status, 409)
  assert.deepEqual(await outstanding.json(), { code: "ASSET_COMPONENT_OUTSTANDING", error: "ASSET_COMPONENT_OUTSTANDING", blocked: [blockedEntry("stock-1", "ASSET_COMPONENT_OUTSTANDING")] })

  world = freshWorld()
  world.checkoutAnswers = [[], ["stock-1"]]
  const open = await post({ assetIds: ["stock-1"], toLocationId: "loc-2" })
  assert.equal(open.status, 409)
  assert.deepEqual(await open.json(), { code: "ASSET_ACTIVE_CHECKOUT_EXISTS", error: "ASSET_ACTIVE_CHECKOUT_EXISTS", blocked: [blockedEntry("stock-1", "ASSET_ACTIVE_CHECKOUT_EXISTS")] })
  assert.equal(callNames().includes("assetMovement.createMany"), false)
})

test("an asset that nothing would change gets no claim, movement, log or sync", async () => {
  world.assets["shared-1"].currentLocationId = "loc-2"
  const response = await post({ assetIds: ["shared-1", "stock-1"], toLocationId: "loc-2" })
  assert.equal(response.status, 200)
  assert.deepEqual(await response.json(), { updated: 1, unchanged: 1, movements: 1, componentSync: { updated: 0, skipped: 0, movements: 0 } })
  assert.deepEqual(claims().map((claim) => claim.where.id), ["stock-1"])
  assert.deepEqual(syncs().map((sync) => sync.parentAssetId), ["stock-1"])
  assert.deepEqual((callsOf("systemLog.createMany")[0].data as Array<{ recordId: string }>).map((row) => row.recordId), ["stock-1"])
})

test("the refusal words: the order, and a status refusal worded by whether the holder changes (P1-R1)", () => {
  assert.deepEqual([...bulkUpdateBlockedOrder], ["ASSET_NOT_ACTIVE", "ASSET_COMPONENT_OUTSTANDING", "ASSET_LICENSE_MOVE_NOT_ALLOWED", "ASSET_ACTIVE_CHECKOUT_EXISTS", "ASSET_STATUS_TRANSFER_NOT_ALLOWED"])
  assert.equal(bulkUpdateBlockedReasonKey("ASSET_STATUS_TRANSFER_NOT_ALLOWED", true), "asset.transactionReasonStatusNotTransferable")
  assert.equal(bulkUpdateBlockedReasonKey("ASSET_STATUS_TRANSFER_NOT_ALLOWED", false), "asset.transactionReasonWrittenOff")
  assert.equal(bulkUpdateBlockedReasonKey("ASSET_NOT_ACTIVE", false), "bulkMove.blockedNotActive")
  assert.equal(bulkUpdateBlockedReasonKey("ASSET_COMPONENT_OUTSTANDING", true), "asset.transactionReasonComponentOutstanding")
  assert.equal(bulkUpdateBlockedReasonKey("ASSET_LICENSE_MOVE_NOT_ALLOWED", true), "asset.transactionReasonLicenseMove")
  assert.equal(bulkUpdateBlockedReasonKey("ASSET_ACTIVE_CHECKOUT_EXISTS", true), "asset.transactionReasonOpenCheckoutCorrection")
  assert.equal(bulkUpdateBlockedReasonKey("ASSET_ACTIVE_CHECKOUT_EXISTS", false), "asset.transactionReasonOpenCheckoutCorrection")
  assert.equal(bulkUpdateBlockedReasonKey("SOMETHING_ELSE", true), null)
})
