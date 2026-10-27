import assert from "node:assert/strict"
import { existsSync } from "node:fs"
import * as nodeModule from "node:module"
import { beforeEach, test } from "node:test"
import { pathToFileURL } from "node:url"

type Finding = { id: string; findingType: string; actualValue: string | null; reviewStatus: string }
type Call = { call: string; args: Record<string, unknown> }
type State = {
  item: Record<string, unknown>
  parentItem: Record<string, unknown> | null
  permissions: string[]
  findings: Finding[]
  outOfScopeFindingId: string | null
  attachmentIds: string[]
  pendingCount: number
  calls: Call[]
  logs: Array<Record<string, unknown>>
}

// The out-of-scope find X1 as its first scan left it: the master's snapshot loc-1 / no custodian / dept-1 / good, found
// in loc-2. The master has moved since (loc-9), so a comparison with the master would read differently.
function recordedFind(): Record<string, unknown> {
  return {
    id: "item-x1", auditRoundId: "round-1", assetId: "asset-x1",
    expectedLocationId: "loc-1", expectedCustodianId: null, expectedDepartmentId: "dept-1", expectedConditionId: "condition-good",
    actualLocationId: "loc-2", actualCustodianId: null, actualDepartmentId: "dept-1", actualConditionId: "condition-good",
    auditStatus: "reviewed", auditResult: "out_of_scope", findingRequired: true, reconcileStatus: "pending", scanCount: 1,
    scannedAt: new Date("2026-10-27T02:00:00Z"), scannedBy: "auditor-1", lastScanAt: new Date("2026-10-27T02:00:00Z"), remark: null,
    asset: { id: "asset-x1", assetTag: "GRL-COM-26-0099", name: "Notebook", ownershipType: "shared", currentLocationId: "loc-9", custodianId: null },
  }
}

const state: State = { item: recordedFind(), parentItem: null, permissions: ["audit:edit"], findings: [], outOfScopeFindingId: "finding-oos", attachmentIds: ["att-1"], pendingCount: 1, calls: [], logs: [] }
Object.assign(globalThis, { __outOfScopeRescanState: state })

const mockedModuleSources = new Map<string, string>([
  ["next/server", `
    export class NextRequest extends Request {}
    export class NextResponse extends Response {
      static json(body, init) { return Response.json(body, init) }
    }
  `],
  ["@/lib/auth-utils", `
    export async function requireAuth() {
      return { id: "auditor-1", roles: ["auditor"], permissions: globalThis.__outOfScopeRescanState.permissions, employeeId: "emp-1" }
    }
    export function hasRole(user, role) { return user.roles.includes(role) }
    export function hasPermission(user, module, action) { return user.permissions.includes(module + ":" + action) }
    export function requirePermission(user, module, action) {
      if (!user.permissions.includes(module + ":" + action)) throw new Error("Forbidden: insufficient permissions")
    }
  `],
  ["@/lib/audit-log", `export async function logAudit(entry) { globalThis.__outOfScopeRescanState.logs.push(entry) }`],
  ["@/lib/asset-component-sync", `
    export async function syncInstalledComponentsWithParent(_tx, args) {
      globalThis.__outOfScopeRescanState.calls.push({ call: "syncInstalledComponentsWithParent", args })
      return { updated: 0, skipped: 0, movements: 0, componentSnapshots: [] }
    }
  `],
  ["@/lib/db", `
    const state = () => globalThis.__outOfScopeRescanState
    const attachment = (id) => ({ fileName: id + ".jpg", originalName: id + ".jpg", fileType: "image/jpeg", fileSize: 1000, filePath: "audit/" + id + ".jpg" })
    function answer(name, method, args) {
      if (name === "auditRound" && method === "findFirst") return { id: "round-1", status: "open" }
      if (name === "auditItem" && method === "findUnique") {
        return args.where.auditRoundId_assetId.assetId === state().item.assetId ? state().item : state().parentItem
      }
      if (name === "auditItem" && method === "update") return { ...state().item, ...args.data, scanCount: state().item.scanCount + 1 }
      if (name === "user" && method === "findUnique") return { displayName: "ผู้ตรวจ 1" }
      if (name === "auditFinding" && method === "findMany") {
        const types = args.where?.findingType?.in ?? []
        const status = args.where?.reviewStatus
        const statuses = typeof status === "string" ? [status] : status?.in ?? []
        return state().findings.filter((finding) => types.includes(finding.findingType) && statuses.includes(finding.reviewStatus))
      }
      if (name === "auditFinding" && method === "findFirst") {
        return args.where?.findingType === "out_of_scope" && state().outOfScopeFindingId ? { id: state().outOfScopeFindingId } : null
      }
      if (name === "auditFinding" && method === "count") return state().pendingCount
      if (name === "auditFinding" && method === "create") return { id: "created-" + args.data.findingType, ...args.data }
      if (name === "attachment" && method === "findMany") return args.where.id.in.filter((id) => state().attachmentIds.includes(id)).map(attachment)
      if (name === "assetComponent" && method === "findFirst") return { parentAssetId: "asset-p1", parentAsset: { assetTag: "GRL-COM-26-0100", name: "Desktop" } }
      if (method === "updateMany") return { count: 0 }
      if (method === "count") return 0
      if (method === "findMany") return []
      if (method === "findFirst" || method === "findUnique") return null
      return { id: name + "-new", ...(args.data ?? {}) }
    }
    function model(name) {
      return new Proxy({}, {
        get(_target, method) {
          return async (args = {}) => {
            state().calls.push({ call: name + "." + String(method), args })
            return answer(name, String(method), args)
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

const route = await import(pathToFileURL("src/app/api/audit-rounds/[id]/scan/route.ts").href) as {
  POST(request: Request, context: { params: Promise<{ id: string }> }): Promise<Response>
}

function scan(body: Record<string, unknown>) {
  return route.POST(
    new Request("http://localhost/api/audit-rounds/round-1/scan", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ assetId: "asset-x1", ...body }),
    }),
    { params: Promise.resolve({ id: "round-1" }) },
  )
}

const callsTo = (call: string) => state.calls.filter((entry) => entry.call === call).map((entry) => entry.args)
const dataOf = (args: Record<string, unknown>) => args.data as Record<string, unknown>
const sameAsFirstScan = { actualLocationId: "loc-2", actualCustodianId: null, actualDepartmentId: "dept-1", actualConditionId: "condition-good" }
type RescanPayload = { status?: string; auditResult?: string; item: { auditResult: string; auditStatus: string; scanCount: number }; scannedByName: string | null; error?: string; code?: string; mismatches?: unknown; appliedCorrections?: unknown }

beforeEach(() => {
  state.item = recordedFind()
  state.parentItem = null
  state.permissions = ["audit:edit"]
  state.findings = []
  state.outOfScopeFindingId = "finding-oos"
  state.attachmentIds = ["att-1"]
  state.pendingCount = 1
  state.calls = []
  state.logs = []
})

test("a re-scan of an out-of-scope find stays out of scope: result and status kept, the found values saved, scanCount + 1, answered as out_of_scope (P3-R3)", async () => {
  state.findings = [{ id: "finding-loc", findingType: "wrong_location", actualValue: "loc-2", reviewStatus: "pending" }]
  state.pendingCount = 2

  const response = await scan({ ...sameAsFirstScan, evidenceAttachmentIds: ["att-1"], remark: "ยังอยู่ห้อง 2" })
  assert.equal(response.status, 200)
  const payload = await response.json() as RescanPayload
  assert.equal(payload.status, "out_of_scope")
  assert.equal(payload.auditResult, "out_of_scope")
  assert.equal(payload.item.auditResult, "out_of_scope")
  assert.equal(payload.item.auditStatus, "reviewed")
  assert.equal(payload.item.scanCount, 2)
  assert.equal(payload.scannedByName, "ผู้ตรวจ 1")

  const updates = callsTo("auditItem.update")
  assert.equal(updates.length, 1)
  assert.deepEqual(updates[0].where, { id: "item-x1" })
  const data = dataOf(updates[0])
  assert.ok(data.lastScanAt instanceof Date)
  assert.deepEqual({ ...data, lastScanAt: "now" }, {
    actualDepartmentId: "dept-1",
    actualLocationId: "loc-2",
    actualCustodianId: null,
    actualConditionId: "condition-good",
    lastScanAt: "now",
    scanCount: { increment: 1 },
    remark: "ยังอยู่ห้อง 2",
    findingRequired: true,
    reconcileStatus: "pending",
  }, "no auditResult, no auditStatus, no scannedAt / scannedBy: the first scan's stay")
  assert.deepEqual(callsTo("auditFinding.create"), [], "the unchanged wrong_location finding is left as it is")
})

test("the find is compared with its first scan's snapshot, never the master: matching the snapshot closes the pending field finding", async () => {
  state.findings = [{ id: "finding-loc", findingType: "wrong_location", actualValue: "loc-2", reviewStatus: "pending" }]
  state.pendingCount = 1

  const response = await scan({ actualLocationId: "loc-1", actualCustodianId: null, actualDepartmentId: "dept-1", actualConditionId: "condition-good" })
  assert.equal(response.status, 200)
  assert.deepEqual(callsTo("asset.findFirst"), [], "the master is not read")
  assert.deepEqual(callsTo("attachment.findMany"), [], "nothing differs, so no evidence is needed or read")
  const closed = callsTo("auditFinding.updateMany").filter((args) => dataOf(args).reviewRemark === "ยกเลิกเพราะแก้ผลตรวจ")
  assert.equal(closed.length, 1)
  assert.deepEqual(closed[0].where, { id: { in: ["finding-loc"] }, reviewStatus: "pending" })
  assert.equal(dataOf(closed[0]).reviewStatus, "rejected")
  assert.equal(dataOf(closed[0]).reviewedBy, "auditor-1")
  assert.deepEqual(callsTo("auditFinding.create"), [])
})

test("a field that differs from the snapshot and changes in this save needs evidence, as the first out-of-scope scan does; nothing is written without it (P3-R18)", async () => {
  const response = await scan({ actualLocationId: "loc-3" })
  assert.equal(response.status, 400)
  assert.deepEqual(await response.json(), { error: "Evidence attachment is required for changed out-of-scope actual fields" })
  assert.deepEqual(callsTo("auditItem.update"), [])
  assert.deepEqual(callsTo("auditScanHistory.create"), [])
})

test("a remark-only edit needs no new photo: the location still differs from the snapshot but repeats what was recorded (P3-R18)", async () => {
  state.findings = [{ id: "finding-loc", findingType: "wrong_location", actualValue: "loc-2", reviewStatus: "pending" }]

  const response = await scan({ ...sameAsFirstScan, remark: "ยังอยู่ห้อง 2 ป้ายหลุด" })
  assert.equal(response.status, 200)
  assert.equal((await response.json() as RescanPayload).item.auditResult, "out_of_scope")
  assert.deepEqual(callsTo("attachment.findMany"), [], "no evidence asked or read")
  assert.deepEqual(callsTo("attachment.createMany"), [])
  assert.deepEqual(callsTo("auditFinding.create"), [], "the unchanged wrong_location finding is left as it is")
  assert.equal(dataOf(callsTo("auditItem.update")[0]).remark, "ยังอยู่ห้อง 2 ป้ายหลุด")
})

test("a remark-only edit after the reviewer rejected the location files nothing again (P3-R18)", async () => {
  // The mock's findMany filters by the statuses the route asks for, so the rejected row is never returned; the route
  // still must not create a finding, because this save leaves the location as recorded.
  state.findings = [{ id: "finding-loc", findingType: "wrong_location", actualValue: "loc-2", reviewStatus: "rejected" }]
  state.pendingCount = 0

  const response = await scan({ ...sameAsFirstScan, remark: "ป้ายหลุด" })
  assert.equal(response.status, 200)
  assert.deepEqual(callsTo("auditFinding.create"), [])
  assert.deepEqual(callsTo("attachment.findMany"), [])
  assert.equal("reconcileStatus" in dataOf(callsTo("auditItem.update")[0]), false, "the reviewer's decision is not undone")
})

test("the evidence must be the scanner's own active photos of this asset", async () => {
  const response = await scan({ actualLocationId: "loc-3", evidenceAttachmentIds: ["att-other"] })
  assert.equal(response.status, 400)
  assert.deepEqual(await response.json(), { error: "Evidence attachment is invalid for this asset" })
  assert.deepEqual(callsTo("attachment.findMany")[0].where, { id: { in: ["att-other"] }, assetId: "asset-x1", module: "asset", isActive: true, uploadedBy: "auditor-1" })
  assert.deepEqual(callsTo("auditItem.update"), [])
})

test("a new differing field becomes a reviewable finding, a changed one takes the new value, the pending out_of_scope finding takes the found values, and the evidence goes on each", async () => {
  state.findings = [{ id: "finding-loc", findingType: "wrong_location", actualValue: "loc-2", reviewStatus: "pending" }]
  const remark = "ย้ายไปห้อง 3 จอแตก"

  const response = await scan({ actualLocationId: "loc-3", actualConditionId: "condition-poor", evidenceAttachmentIds: ["att-1"], remark })
  assert.equal(response.status, 200)

  assert.deepEqual(callsTo("auditFinding.create").map(dataOf), [{
    auditRoundId: "round-1",
    auditItemId: "item-x1",
    assetId: "asset-x1",
    findingType: "wrong_condition",
    expectedValue: "condition-good",
    actualValue: "condition-poor",
    reportedBy: "auditor-1",
    reviewStatus: "pending",
    remark,
    actionTaken: "out_of_scope_actual_field_reported",
  }])
  const updates = callsTo("auditFinding.update")
  assert.deepEqual(updates.map((args) => args.where), [{ id: "finding-oos" }, { id: "finding-loc" }])
  assert.deepEqual(JSON.parse(dataOf(updates[0]).actualValue as string), {
    assetTag: "GRL-COM-26-0099", assetName: "Notebook", locationId: "loc-3", custodianId: null, departmentId: "dept-1", conditionId: "condition-poor",
  })
  assert.deepEqual(dataOf(updates[1]), { actualValue: "loc-3", remark })

  const copies = dataOf(callsTo("attachment.createMany")[0]) as unknown as Array<Record<string, unknown>>
  assert.deepEqual(copies.map((copy) => copy.referenceId), ["finding-oos", "created-wrong_condition", "finding-loc"])
  assert.deepEqual(copies[0], {
    assetId: "asset-x1", module: "audit_finding", referenceId: "finding-oos",
    fileName: "att-1.jpg", originalName: "att-1.jpg", fileType: "image/jpeg", fileSize: 1000, filePath: "audit/att-1.jpg", uploadedBy: "auditor-1",
  })
})

test("never the master: an approver with the correction tick and segregation off moves no asset, writes no movement and syncs no component", async () => {
  state.permissions = ["audit:edit", "audit:approve"]

  const response = await scan({ actualLocationId: "loc-3", applyCorrections: true, evidenceAttachmentIds: ["att-1"] })
  assert.equal(response.status, 200)
  const payload = await response.json() as RescanPayload
  assert.equal("appliedCorrections" in payload, false)
  for (const call of ["asset.update", "assetMovement.create", "systemSetting.findMany", "asset.findFirst", "syncInstalledComponentsWithParent"]) {
    assert.deepEqual(callsTo(call), [], call)
  }
})

test("a component confirm on an out-of-scope find is refused: the find is not in the round", async () => {
  const response = await scan({ confirmedWithParentAssetId: "asset-p1", componentConfirmationReason: "อยู่ในเครื่องหลัก" })
  assert.equal(response.status, 400)
  assert.deepEqual(await response.json(), { error: "Component is not included in this audit round" })
  assert.deepEqual(callsTo("auditItem.update"), [])
  assert.deepEqual(callsTo("assetComponent.findFirst"), [])
})

test("a component of the round cannot be confirmed with a parent that is an out-of-scope find", async () => {
  state.item = {
    ...recordedFind(), id: "item-c1", assetId: "asset-c1", auditStatus: "pending", auditResult: null, scanCount: 0, scannedAt: null, scannedBy: null,
    asset: { id: "asset-c1", assetTag: "GRL-COM-26-0101", name: "RAM", ownershipType: "component", currentLocationId: "loc-1", custodianId: null },
  }
  state.parentItem = { id: "item-p1", auditResult: "out_of_scope" }

  const response = await scan({ assetId: "asset-c1", confirmedWithParentAssetId: "asset-p1", componentConfirmationReason: "อยู่ในเครื่องหลัก" })
  assert.equal(response.status, 400)
  assert.deepEqual(await response.json(), { error: "Component parent is not included in this audit round" })
  const parentRead = callsTo("auditItem.findUnique").find((args) => (args.where as { auditRoundId_assetId: { assetId: string } }).auditRoundId_assetId.assetId === "asset-p1")
  assert.deepEqual(parentRead?.select, { id: true, auditResult: true })
  assert.deepEqual(callsTo("auditScanHistory.create"), [])
})

test("the history row names the item and marks the re-scan; the log is a correction that keeps the result", async () => {
  await scan({ ...sameAsFirstScan, evidenceAttachmentIds: ["att-1"] })

  const [history] = callsTo("auditScanHistory.create").map(dataOf)
  assert.equal(history.auditItemId, "item-x1")
  assert.equal(history.scanLocationId, "loc-2")
  const raw = JSON.parse(history.rawPayload as string) as Record<string, unknown>
  assert.equal(raw.outOfScope, true)
  assert.equal(raw.rescan, true)
  assert.deepEqual(raw.actual, { departmentId: "dept-1", locationId: "loc-2", custodianId: null, conditionId: "condition-good" })

  assert.equal(state.logs.length, 1)
  const log = state.logs[0] as { action: string; recordId: string; oldValue: Record<string, unknown>; newValue: Record<string, unknown> }
  assert.equal(log.action, "scan_result_corrected")
  assert.equal(log.recordId, "item-x1")
  assert.equal(log.oldValue.auditResult, "out_of_scope")
  assert.equal(log.newValue.auditResult, "out_of_scope")
  assert.equal(log.newValue.outOfScope, true)
  assert.deepEqual(log.newValue.fieldFindingTypes, ["wrong_location"])
})

test("an own item still goes through the in-round path, which writes its result", async () => {
  state.item = { ...recordedFind(), auditStatus: "scanned", auditResult: "found" }

  const payload = await (await scan({ actualLocationId: "loc-1", actualCustodianId: null, actualDepartmentId: "dept-1", actualConditionId: "condition-good" })).json() as RescanPayload
  assert.equal(payload.status, undefined)
  assert.deepEqual(payload.mismatches, [])
  assert.equal(dataOf(callsTo("auditItem.update")[0]).auditResult, "found")
})

test("a save carries at most 20 evidence photos, refused before any read", async () => {
  const ids = Array.from({ length: 21 }, (_, index) => `att-${index + 1}`)
  const refused = await scan({ actualLocationId: "loc-3", evidenceAttachmentIds: ids })
  assert.equal(refused.status, 400)
  assert.equal((await refused.json() as RescanPayload).code, "VALIDATION_FAILED")
  assert.deepEqual(state.calls, [])

  state.attachmentIds = ids.slice(0, 20)
  const accepted = await scan({ actualLocationId: "loc-3", evidenceAttachmentIds: ids.slice(0, 20) })
  assert.equal(accepted.status, 200)
})
