import assert from "node:assert/strict"
import { existsSync } from "node:fs"
import * as nodeModule from "node:module"
import { beforeEach, test } from "node:test"
import { pathToFileURL } from "node:url"

// The return and legacy-backfill writes as in-transaction helpers (group 7 plan 4 task 1), run against a fake tx: the
// rows they write, in order, and the claims' refusals.
type Call = { call: string; args: Record<string, unknown> }
type WriteState = {
  calls: Call[]
  // What claiming the handover answers (assetCheckout.updateMany).
  handoverClaimCount: number
  // What claiming the asset answers (asset.updateMany, the legacy backfill's claim).
  assetClaimCount: number
  activeLocation: boolean
  // The open handover the legacy claim's re-read finds.
  openCheckoutAfterClaim: { id: string } | null
}
const state: WriteState = { calls: [], handoverClaimCount: 1, assetClaimCount: 1, activeLocation: true, openCheckoutAfterClaim: null }
Object.assign(globalThis, { __checkinWriteState: state })

const mockedModuleSources = new Map<string, string>([
  ["@/lib/auth-utils", `
    export function requirePermission() {}
  `],
  ["@/lib/operation-document-number", `
    export async function generateCheckinDocumentNo() { globalThis.__checkinWriteState.calls.push({ call: "documentNo.checkin", args: {} }); return "RT-202611-0001" }
    export async function generateCheckoutDocumentNo() { globalThis.__checkinWriteState.calls.push({ call: "documentNo.checkout", args: {} }); return "HO-202611-0001" }
  `],
  ["@/lib/asset-component-sync", `
    export async function syncInstalledComponentsWithParent(_tx, args) {
      globalThis.__checkinWriteState.calls.push({ call: "componentSync", args })
      return { updated: 0, skipped: 0, movements: 0, componentSnapshots: [] }
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

const checkinWrite = await import(pathToFileURL("src/lib/checkin-write.ts").href) as typeof import("../src/lib/checkin-write.ts")
const legacyWrite = await import(pathToFileURL("src/lib/legacy-checkout-write.ts").href) as typeof import("../src/lib/legacy-checkout-write.ts")
const claim = await import(pathToFileURL("src/lib/asset-operation-claim.ts").href) as typeof import("../src/lib/asset-operation-claim.ts")

const assetRow = {
  id: "asset-1", updatedAt: new Date("2026-11-01T00:00:00Z"), statusId: "status-checked-out", conditionId: "condition-good",
  branchId: "branch-1", currentLocationId: "loc-old", custodianId: "emp-5", departmentId: "dept-sales",
}

function fakeTx() {
  const model = (name: string) => new Proxy({}, {
    get(_target, method) {
      return async (args: Record<string, unknown> = {}) => {
        state.calls.push({ call: `${name}.${String(method)}`, args })
        const data = (args.data ?? {}) as Record<string, unknown>
        if (name === "assetCheckout" && method === "findFirst") {
          // The return's re-read selects the asset's status; the legacy claim's re-read selects the id only.
          if ((args.select as Record<string, unknown> | undefined)?.asset) {
            return { id: "co-1", handoverMode: "temporary_loan", asset: { status: { name: "Checked Out" } } }
          }
          return state.openCheckoutAfterClaim
        }
        if (name === "assetCheckout" && method === "updateMany") return { count: state.handoverClaimCount }
        if (name === "asset" && method === "updateMany") return { count: state.assetClaimCount }
        if (name === "maintenanceTicket" && method === "count") return 0
        if (name === "maintenanceTicket" && method === "findFirst") return null
        if (name === "systemSetting") return null
        if (name === "department" && method === "findFirst") return { id: "dept-it", code: "IT", name: "Information Technology" }
        if (name === "location" && method === "findFirst") return state.activeLocation ? { id: "loc-store" } : null
        if (name === "assetComponent" && method === "findMany") return []
        if (name === "asset" && method === "findUnique") return { ...assetRow }
        if (name === "asset" && method === "update") return { ...assetRow, ...data, updatedAt: new Date("2026-11-06T03:00:00Z") }
        if (name === "assetCheckin" && method === "create") return { id: `rt-${state.calls.filter((call) => call.call === "assetCheckin.create").length}`, ...data }
        if (name === "assetCheckin" && method === "update") return { id: (args.where as { id: string }).id, documentNo: "from-update", ...data }
        if (name === "assetCheckout" && method === "create") return { id: "ho-new", ...data }
        return { id: `${name}-new`, ...data }
      }
    },
  })
  return new Proxy({}, { get: (_target, key) => model(String(key)) }) as never
}

const user = { id: "user-1", name: "IT", roles: ["system_admin"], permissions: [], employeeId: "emp-1" }
const signature = (name: string) => ({ fileName: `saved-${name}`, originalName: name, fileType: "image/png", fileSize: 10, filePath: `uploads/checkin/${name}` })
const checkinInput = {
  checkoutId: "co-1",
  returnDate: new Date("2026-11-06T00:00:00Z"),
  returnByEmployeeId: "emp-5",
  returnBy: "สมชาย",
  receiveByEmployeeId: "emp-1",
  receiveBy: "สมหญิง",
  conditionAfter: "condition-good",
  missingAccessories: null,
  damageNote: null,
  nextStatusId: "status-ready",
  nextLocationId: "loc-store",
  remark: null,
  maintenanceReportedById: null,
  maintenanceProblem: null,
  missingComponentIds: [],
} as unknown as import("../src/lib/validations/asset-operations.ts").AssetCheckinInput

function writeInput(overrides: Partial<import("../src/lib/checkin-write.ts").CheckinWriteInput> = {}) {
  return {
    asset: { id: "asset-1", currentLocationId: "loc-old", ownershipType: "personal" },
    checkin: checkinInput,
    holderEmployeeId: "emp-5",
    sendsToRepair: false,
    repairReporterId: null,
    evidence: {
      photosAfter: [{ file: signature("photo.jpg"), label: "ด้านหน้า" }],
      returnSignature: signature("return.png"),
      receiveSignature: signature("receive.png"),
    },
    ...overrides,
  }
}

const callNames = () => state.calls.map((call) => call.call)
const callsOf = (name: string) => state.calls.filter((call) => call.call === name)

beforeEach(() => {
  Object.assign(state, { calls: [], handoverClaimCount: 1, assetClaimCount: 1, activeLocation: true, openCheckoutAfterClaim: null })
})

test("the return write claims the handover, then writes the RT-, its attachments, the asset, its movements and the snapshots, in the route's order", async () => {
  const result = await checkinWrite.writeCheckinInTransaction(fakeTx(), writeInput(), { user })

  assert.deepEqual(callNames(), [
    "assetCheckout.findFirst",
    "maintenanceTicket.count",
    "systemSetting.findUnique",
    "department.findFirst",
    "location.findFirst",
    "assetCheckout.updateMany",
    "asset.findUnique",
    "documentNo.checkin",
    "assetCheckin.create",
    "attachment.create",
    "attachment.create",
    "attachment.create",
    "asset.update",
    "assetMovement.create",
    "assetMovement.create",
    "componentSync",
    "assetCheckin.update",
  ])
  assert.deepEqual(callsOf("assetCheckout.updateMany")[0].args, {
    where: { id: "co-1", assetId: "asset-1", isReturned: false, transactionStatus: "active" },
    data: { isReturned: true },
  })
  const created = callsOf("assetCheckin.create")[0].args.data as Record<string, unknown>
  assert.equal(created.documentNo, "RT-202611-0001")
  assert.equal(created.checkoutId, "co-1")
  assert.equal(created.photoAfter, "uploads/checkin/photo.jpg")
  assert.deepEqual(callsOf("attachment.create").map((call) => {
    const data = call.args.data as Record<string, unknown>
    return [data.module, data.referenceId, data.filePath, data.originalName]
  }), [
    ["checkin_photo_after", "rt-1", "uploads/checkin/photo.jpg", "ด้านหน้า - photo.jpg"],
    ["checkin_return_signature", "rt-1", "uploads/checkin/return.png", "return.png"],
    ["checkin_receive_signature", "rt-1", "uploads/checkin/receive.png", "receive.png"],
  ])
  assert.deepEqual(callsOf("asset.update")[0].args.data, {
    statusId: "status-ready", conditionId: "condition-good", currentLocationId: "loc-store", custodianId: null, departmentId: "dept-it", updatedBy: "user-1",
  })
  assert.deepEqual(callsOf("assetMovement.create").map((call) => {
    const data = call.args.data as Record<string, unknown>
    return [data.movementType, data.fromValue, data.toValue, data.referenceId]
  }), [
    ["checkin", "loc-old", "loc-store", "rt-1"],
    ["department_change", "dept-sales", "dept-it", "rt-1"],
  ])
  const finalized = callsOf("assetCheckin.update")[0].args.data as Record<string, string>
  assert.equal(JSON.parse(finalized.afterSnapshotJson).checkout.isReturned, true)
  assert.equal(JSON.parse(finalized.beforeSnapshotJson).checkout.isReturned, false)
  assert.equal(result.record.id, "rt-1")
  assert.deepEqual(result.componentSync, { updated: 0, skipped: 0, movements: 0 })
  assert.equal(result.departmentId, "dept-it")
  assert.equal(result.previousDepartmentId, "dept-sales")
  assert.deepEqual(result.missingComponents, [])
  assert.equal(result.repair, null)
})

test("a pre-generated RT- number is used as given, and the same stored signature files attach to every record (G7P4-R1, R5)", async () => {
  const shared = { photosAfter: [], returnSignature: signature("return.png"), receiveSignature: signature("receive.png") }
  const tx = fakeTx()
  await checkinWrite.writeCheckinInTransaction(tx, writeInput({ documentNo: "RT-202611-0042", evidence: shared }), { user })
  await checkinWrite.writeCheckinInTransaction(tx, writeInput({ documentNo: "RT-202611-0042", evidence: shared }), { user })

  assert.equal(callsOf("documentNo.checkin").length, 0, "no number is generated when one is given")
  assert.deepEqual(callsOf("assetCheckin.create").map((call) => (call.args.data as Record<string, unknown>).documentNo), ["RT-202611-0042", "RT-202611-0042"])
  assert.deepEqual(callsOf("attachment.create").map((call) => {
    const data = call.args.data as Record<string, unknown>
    return [data.module, data.referenceId, data.filePath]
  }), [
    ["checkin_return_signature", "rt-1", "uploads/checkin/return.png"],
    ["checkin_receive_signature", "rt-1", "uploads/checkin/receive.png"],
    ["checkin_return_signature", "rt-2", "uploads/checkin/return.png"],
    ["checkin_receive_signature", "rt-2", "uploads/checkin/receive.png"],
  ])
})

test("a handover claimed elsewhere (count !== 1) refuses with ASSET_CHANGED_DURING_OPERATION before the RT- number or any row", async () => {
  state.handoverClaimCount = 0
  await assert.rejects(
    checkinWrite.writeCheckinInTransaction(fakeTx(), writeInput(), { user }),
    (error: unknown) => error instanceof claim.AssetOperationConflictError && error.code === "ASSET_CHANGED_DURING_OPERATION",
  )
  assert.equal(callNames().at(-1), "assetCheckout.updateMany")
  for (const name of ["documentNo.checkin", "assetCheckin.create", "attachment.create", "asset.update", "assetMovement.create"]) {
    assert.equal(callsOf(name).length, 0, name)
  }
})

test("a room closed since the pre-check refuses before the claim", async () => {
  state.activeLocation = false
  await assert.rejects(
    checkinWrite.writeCheckinInTransaction(fakeTx(), writeInput(), { user }),
    (error: unknown) => error instanceof checkinWrite.CheckinLocationInactiveError,
  )
  assert.equal(callsOf("assetCheckout.updateMany").length, 0)
})

const legacyInput = {
  asset: { id: "asset-1", statusId: "status-ready", conditionId: "condition-good", currentLocationId: "loc-old" },
  custodianId: "emp-5",
  checkoutDate: new Date("2026-11-06T03:00:00Z"),
  inUseStatusId: "status-in-use",
}

test("the legacy backfill claims the asset, then writes the HO- (permanent, legacy remark), In Use and its checkout movement", async () => {
  const record = await legacyWrite.backfillLegacyCheckoutInTransaction(fakeTx(), legacyInput, { userId: "user-1" })

  assert.deepEqual(callNames(), [
    "asset.updateMany",
    "assetCheckout.findFirst",
    "assetComponent.findMany",
    "documentNo.checkout",
    "assetCheckout.create",
    "asset.update",
    "assetMovement.create",
  ])
  assert.deepEqual(callsOf("asset.updateMany")[0].args, {
    where: { id: "asset-1", isActive: true, statusId: "status-ready" },
    data: { updatedBy: "user-1" },
  })
  assert.deepEqual(callsOf("assetCheckout.create")[0].args.data, {
    documentNo: "HO-202611-0001",
    assetId: "asset-1",
    checkoutType: "user",
    handoverMode: "permanent_assignment",
    custodianId: "emp-5",
    checkoutDate: legacyInput.checkoutDate,
    expectedReturnDate: null,
    conditionBefore: "condition-good",
    remark: legacyWrite.legacyReturnBackfillRemark,
    checkedOutBy: "user-1",
  })
  assert.equal(legacyWrite.legacyReturnBackfillRemark, "legacy_return_backfill: Created from current custodian before check-in")
  assert.deepEqual(callsOf("asset.update")[0].args, { where: { id: "asset-1" }, data: { statusId: "status-in-use", updatedBy: "user-1" } })
  assert.deepEqual(callsOf("assetMovement.create")[0].args.data, {
    assetId: "asset-1",
    movementType: "checkout",
    fromValue: "loc-old",
    toValue: "loc-old",
    reason: "Legacy return checkout backfill",
    referenceType: "checkout",
    referenceId: "ho-new",
    performedBy: "user-1",
    remark: "legacy_return_backfill",
  })
  assert.equal(record.id, "ho-new")
})

test("the legacy backfill's claim refuses a changed asset (count !== 1) and an open handover, before any HO- is written", async () => {
  state.assetClaimCount = 0
  await assert.rejects(
    legacyWrite.backfillLegacyCheckoutInTransaction(fakeTx(), legacyInput, { userId: "user-1" }),
    (error: unknown) => error instanceof claim.AssetOperationConflictError && error.code === "ASSET_CHANGED_DURING_OPERATION",
  )
  assert.equal(callsOf("assetCheckout.create").length, 0)

  Object.assign(state, { calls: [], assetClaimCount: 1, openCheckoutAfterClaim: { id: "co-9" } })
  await assert.rejects(
    legacyWrite.backfillLegacyCheckoutInTransaction(fakeTx(), legacyInput, { userId: "user-1" }),
    (error: unknown) => error instanceof claim.AssetOperationConflictError && error.code === "ASSET_ACTIVE_CHECKOUT_EXISTS",
  )
  assert.equal(callsOf("assetCheckout.create").length, 0)
})
