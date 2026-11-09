import assert from "node:assert/strict"
import { existsSync } from "node:fs"
import * as nodeModule from "node:module"
import { beforeEach, test } from "node:test"
import { pathToFileURL } from "node:url"

// ยืนยันผลตรวจ plan 5 final review (controller decision A): the old Ready-only status correction refuses an Under
// Inspection asset (ยืนยันผลตรวจ is the release path), except as the escape hatch where those flows refuse the asset
// because of a handover: the open handover is unclear, or the asset's round row is not-found with any open handover.
// The route also writes only while the status is still the one it read.

type Handover = { assetId: string; handoverMode: string | null }
type EscapeState = {
  statusName: string
  handovers: Handover[]
  /** The asset's audit items in live rounds, as findAssetInspectionRound reads them. */
  items: Array<{ auditRoundId: string; auditStatus: string; auditResult: string | null }>
  findings: Array<{ auditRoundId: string; findingType: string; reviewStatus: string }>
  updateCount: number
  calls: Array<{ call: string; args: Record<string, unknown> }>
}

const state: EscapeState = { statusName: "Under Inspection", handovers: [], items: [], findings: [], updateCount: 1, calls: [] }
Object.assign(globalThis, { __escapeState: state })

const dbSource = `
  const state = () => globalThis.__escapeState
  function model(name) {
    return new Proxy({}, {
      get(_target, method) {
        return async (args) => {
          state().calls.push({ call: name + "." + String(method), args: args ?? {} })
          if (name === "asset" && method === "findFirst") {
            return { id: "asset-1", statusId: "status:" + state().statusName, status: { id: "status:" + state().statusName, name: state().statusName, nameTh: state().statusName } }
          }
          if (name === "assetStatus" && method === "findFirst") return { id: "status:Ready", name: "Ready", nameTh: "พร้อมใช้งาน" }
          if (name === "assetCheckout" && method === "findMany") return state().handovers
          if (name === "auditItem" && method === "findMany") {
            return state().items.map((item, index) => ({
              ...item,
              auditRound: { auditNo: "AUD-" + index, startDate: new Date(2026, 10, 1 + index), status: "in_progress", isActive: true },
              asset: { condition: { name: "Good" } },
            }))
          }
          if (name === "auditFinding" && method === "findMany") return state().findings
          if (name === "asset" && method === "updateMany") return { count: state().updateCount }
          if (name === "asset" && method === "findUnique") return { id: "asset-1", statusId: "status:Ready" }
          if (method === "create") return { id: name + "-new" }
          return null
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
`

const mockedModuleSources = new Map<string, string>([
  ["next/server", `
    export class NextRequest extends Request {}
    export class NextResponse extends Response {
      static json(body, init) { return Response.json(body, init) }
    }
  `],
  ["@/lib/auth-utils", `
    export async function requireAuth() { return { id: "user-1", roles: [], permissions: ["asset:edit"], employeeId: "emp-1" } }
    export function hasRole() { return false }
    export function hasPermission() { return true }
    export function requirePermission() {}
  `],
  ["@/lib/audit-log", `export async function logAudit() {}`],
  ["@/lib/db", dbSource],
])

;(nodeModule as unknown as {
  registerHooks(options: { resolve(specifier: string, context: unknown, nextResolve: (specifier: string, context: unknown) => unknown): unknown }): void
}).registerHooks({
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

const { prisma } = await import("@/lib/db" as string) as { prisma: never }
const { inspectionCorrectionEscapeAllowed } = await import(pathToFileURL("src/lib/inspection-confirm-data.ts").href) as typeof import("../src/lib/inspection-confirm-data.ts")
const route = await import(pathToFileURL("src/app/api/assets/[id]/status-correction/route.ts").href) as {
  POST(request: Request, context: { params: Promise<{ id: string }> }): Promise<Response>
}

const notFoundItem = { auditRoundId: "round-1", auditStatus: "checked", auditResult: "not_found" }
const notFoundApproved = { auditRoundId: "round-1", findingType: "not_found", reviewStatus: "approved" }
const readyItem = { auditRoundId: "round-1", auditStatus: "checked", auditResult: "found" }

function correct() {
  return route.POST(
    new Request("http://localhost/api/assets/asset-1/status-correction", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ nextStatusId: "status:Ready", reason: "ใบยืมเก่าค้าง ปลดสถานะ" }),
    }),
    { params: Promise.resolve({ id: "asset-1" }) },
  )
}

beforeEach(() => {
  state.statusName = "Under Inspection"
  state.handovers = []
  state.items = []
  state.findings = []
  state.updateCount = 1
  state.calls = []
})

test("the escape hatch: no handover, or a clear one where a flow can release the asset, is refused", async () => {
  assert.equal(await inspectionCorrectionEscapeAllowed(prisma, "asset-1"), false, "no handover, no round: the dialog")
  state.items = [readyItem]
  assert.equal(await inspectionCorrectionEscapeAllowed(prisma, "asset-1"), false, "no handover, in a round: the round")
  state.handovers = [{ assetId: "asset-1", handoverMode: "permanent_assignment" }]
  assert.equal(await inspectionCorrectionEscapeAllowed(prisma, "asset-1"), false, "a clear handover on the ready tab: the round confirms it")
  state.items = []
  assert.equal(await inspectionCorrectionEscapeAllowed(prisma, "asset-1"), false, "a clear handover in no round: the dialog locks to it")
  state.items = [notFoundItem]
  assert.equal(await inspectionCorrectionEscapeAllowed(prisma, "asset-1"), false, "a not-found item without an approved finding is the ready tab")
})

test("the escape hatch: an unclear handover anywhere, or a not-found row with any open handover, is allowed", async () => {
  state.handovers = [{ assetId: "asset-1", handoverMode: null }]
  assert.equal(await inspectionCorrectionEscapeAllowed(prisma, "asset-1"), true, "an unknown mode")
  state.handovers = [{ assetId: "asset-1", handoverMode: "permanent_assignment" }, { assetId: "asset-1", handoverMode: "temporary_loan" }]
  assert.equal(await inspectionCorrectionEscapeAllowed(prisma, "asset-1"), true, "both modes open")
  state.handovers = [{ assetId: "asset-1", handoverMode: "temporary_loan" }]
  state.items = [notFoundItem]
  state.findings = [notFoundApproved]
  assert.equal(await inspectionCorrectionEscapeAllowed(prisma, "asset-1"), true, "หาไม่พบ refuses the not-found row (handoverOpen)")
})

test("the route refuses an Under Inspection asset outside the escape hatch, under nextStatusId, and writes nothing", async () => {
  const response = await correct()
  assert.equal(response.status, 400)
  assert.deepEqual(await response.json(), {
    error: "Confirm this asset under inspection through the inspection confirm",
    fieldErrors: { nextStatusId: "statusCorrectionUseInspectionConfirm" },
  })
  assert.equal(state.calls.some(({ call }) => call === "asset.updateMany" || call === "assetMovement.create"), false)
})

test("the route corrects an Under Inspection asset in the escape hatch, conditional on the status it read", async () => {
  state.handovers = [{ assetId: "asset-1", handoverMode: null }]
  const response = await correct()
  assert.equal(response.status, 200)
  const update = state.calls.find(({ call }) => call === "asset.updateMany")
  assert.deepEqual(update?.args.where, { id: "asset-1", isActive: true, statusId: "status:Under Inspection" })
  assert.ok(state.calls.some(({ call }) => call === "assetMovement.create"))
})

test("a status changed meanwhile is a 409, with no movement written", async () => {
  state.handovers = [{ assetId: "asset-1", handoverMode: null }]
  state.updateCount = 0
  const response = await correct()
  assert.equal(response.status, 409)
  assert.deepEqual(await response.json(), { error: "Asset status changed while this request was being saved. Reload the asset and try again." })
  assert.equal(state.calls.some(({ call }) => call === "assetMovement.create"), false)
})

test("other protected statuses keep the correction, without the inspection reads", async () => {
  state.statusName = "Missing"
  const response = await correct()
  assert.equal(response.status, 200)
  assert.equal(state.calls.some(({ call }) => call === "assetCheckout.findMany"), false)
})
