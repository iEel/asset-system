import assert from "node:assert/strict"
import { existsSync } from "node:fs"
import * as nodeModule from "node:module"
import { beforeEach, test } from "node:test"
import { pathToFileURL } from "node:url"

import { classifyAuditFindingReviewResponse } from "../src/lib/audit-finding-review-results.ts"

type Call = { call: string; args: Record<string, unknown> }
// `deadlocks`: how many transactions SQL Server picks as the victim before one runs (I-1); `onDeadlock` runs as each
// victim rolls back, as a winner committing meanwhile would.
const state: { finding: Record<string, unknown> | null; pending: boolean; calls: Call[]; deadlocks: number; onDeadlock: (() => void) | null } = { finding: null, pending: true, calls: [], deadlocks: 0, onDeadlock: null }
Object.assign(globalThis, { __reviewRouteState: state })

const mockedModuleSources = new Map<string, string>([
  ["next/server", `
    export class NextRequest extends Request {}
    export class NextResponse extends Response {
      static json(body, init) { return Response.json(body, init) }
    }
  `],
  ["@/lib/auth-utils", `
    export async function requireAuth() { return { id: "reviewer-1", roles: ["it_head"], permissions: ["audit:view", "audit:approve"], employeeId: "emp-9" } }
    export function hasPermission(user, module, action) { return user.permissions.includes(module + ":" + action) }
    export function requirePermission(user, module, action) {
      if (!user.permissions.includes(module + ":" + action)) throw new Error("Forbidden: insufficient permissions")
    }
  `],
  ["@/lib/audit-log", `export async function logAudit() {}`],
  ["@/lib/asset-component-sync", `
    export async function syncInstalledComponentsWithParent() {
      return { updated: 0, skipped: 0, movements: 0, componentSnapshots: [] }
    }
  `],
  ["@/lib/db", `
    const state = () => globalThis.__reviewRouteState
    function model(name) {
      return new Proxy({}, {
        get(_target, method) {
          return async (args) => {
            state().calls.push({ call: name + "." + String(method), args: args ?? {} })
            if (name === "auditFinding" && method === "findUnique") return state().finding
            // The claim (P4-R6): one write finds the finding still pending, every later one finds none.
            if (name === "auditFinding" && method === "updateMany") {
              if (args?.where?.reviewStatus === "pending" && state().pending) {
                state().pending = false
                return { count: 1 }
              }
              return { count: 0 }
            }
            if (name === "auditFinding" && method === "update") return { ...state().finding, ...(args?.data ?? {}) }
            if (name === "auditFinding" && method === "findMany") return [{ findingType: state().finding.findingType, reviewStatus: "approved" }]
            if (method === "findMany") return []
            if (method === "count") return 0
            if (method === "findFirst" || method === "findUnique") return null
            return { id: name + "-new", ...(args?.data ?? {}) }
          }
        },
      })
    }
    const client = new Proxy({}, {
      get(_target, key) {
        if (key === "$transaction") return async (callback) => {
          state().calls.push({ call: "$transaction", args: {} })
          if (state().deadlocks > 0) {
            state().deadlocks -= 1
            state().onDeadlock?.()
            throw Object.assign(new Error("Transaction failed due to a write conflict or a deadlock. Please retry your transaction"), { name: "PrismaClientKnownRequestError", code: "P2034" })
          }
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

const route = await import(pathToFileURL("src/app/api/audit-findings/[id]/review/route.ts").href) as {
  POST(request: Request, context: { params: Promise<{ id: string }> }): Promise<Response>
}

const reportedAt = new Date("2026-10-07T01:00:00.000Z")
function finding(overrides: Record<string, unknown> = {}) {
  return {
    id: "finding-1", auditRoundId: "round-1", auditItemId: "item-1", assetId: "asset-1",
    findingType: "wrong_location", expectedValue: "loc-1", actualValue: "loc-2",
    reportedBy: "auditor-1", reportedAt, reviewStatus: "pending",
    actionPlan: null, actionOwnerId: null, actionDueDate: null, actionStatus: "not_required", closedAt: null,
    auditItem: { id: "item-1" },
    auditRound: { status: "open" },
    // Untouched since the report: no 409.
    asset: { id: "asset-1", currentLocationId: "loc-1", custodianId: null, departmentId: "dept-1", conditionId: "cond-good", updatedAt: new Date("2026-10-06T01:00:00.000Z") },
    ...overrides,
  }
}

async function post(body: unknown) {
  const response = await route.POST(
    new Request("http://localhost/api/audit-findings/finding-1/review", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) }),
    { params: Promise.resolve({ id: "finding-1" }) },
  )
  const payload = await response.json()
  return { status: response.status, payload, outcome: classifyAuditFindingReviewResponse(response.status, payload) }
}

const callsTo = (call: string) => state.calls.filter((entry) => entry.call === call).map((entry) => entry.args)
const writes = () => state.calls.filter((entry) => /\.(update|updateMany|create|createMany)$/.test(entry.call)).map((entry) => entry.call)
const dataOf = (args: Record<string, unknown>) => args.data as Record<string, unknown>

beforeEach(() => {
  state.finding = finding()
  state.pending = true
  state.calls = []
  state.deadlocks = 0
  state.onDeadlock = null
})

test("a reject without a reason is refused under its field before anything is written (decision 5, P4-R5)", async () => {
  for (const body of [{ action: "reject" }, { action: "reject", reviewRemark: "   " }, { action: "reject", reviewRemark: null }]) {
    state.calls = []
    const refused = await post(body)
    assert.equal(refused.status, 400, JSON.stringify(body))
    assert.deepEqual(refused.payload, { error: "Invalid request data", code: "VALIDATION_FAILED", fieldErrors: { reviewRemark: "required" } })
    assert.deepEqual(refused.outcome, { ok: false, reason: "reasonRequired" })
    assert.deepEqual(writes(), [])
  }
})

test("a reject with a reason claims the pending finding, then decides it once with one review time; the master is untouched", async () => {
  const rejected = await post({ action: "reject", reviewRemark: "  ตรวจซ้ำแล้ว สภาพยังดี " })
  assert.equal(rejected.status, 200)
  assert.deepEqual(rejected.outcome, { ok: true })
  const [claim] = callsTo("auditFinding.updateMany")
  assert.deepEqual(claim.where, { id: "finding-1", reviewStatus: "pending" })
  assert.equal(dataOf(claim).reviewedBy, "reviewer-1")
  assert.ok(dataOf(claim).reviewedAt instanceof Date)
  const [decision] = callsTo("auditFinding.update")
  assert.deepEqual(decision.where, { id: "finding-1" })
  assert.equal(dataOf(decision).reviewStatus, "rejected")
  assert.equal(dataOf(decision).reviewRemark, "ตรวจซ้ำแล้ว สภาพยังดี")
  assert.equal(dataOf(decision).actionTaken, "finding_rejected")
  assert.equal(dataOf(decision).reviewedAt, dataOf(claim).reviewedAt, "the claim and the decision share one review time")
  assert.deepEqual(callsTo("asset.update"), [])
  assert.deepEqual(callsTo("assetMovement.create"), [])
})

test("an approve needs no reason and applies the found value once", async () => {
  const approved = await post({ action: "approve" })
  assert.equal(approved.status, 200)
  assert.deepEqual(callsTo("asset.update").map((args) => args.data), [{ currentLocationId: "loc-2", updatedBy: "reviewer-1" }])
  assert.equal(callsTo("assetMovement.create").length, 1)
  assert.equal(dataOf(callsTo("auditFinding.update")[0]).actionTaken, "master_asset_updated")
  const order = state.calls.map((entry) => entry.call)
  const claimAt = order.indexOf("auditFinding.updateMany")
  assert.ok(claimAt >= 0 && claimAt < order.indexOf("asset.update"), "the claim comes before any master change")
})

test("a second press, a second tab or a batch beside the panel applies nothing: one decision per finding (P4-R6)", async () => {
  // Both presses read the finding while it was pending, so the pre-check passes twice; only the claim can stop one.
  const first = await post({ action: "approve" })
  assert.equal(first.status, 200)
  const second = await post({ action: "approve", reviewRemark: "จากอีกแท็บ" })
  assert.equal(second.status, 400)
  assert.deepEqual(second.payload, { error: "Audit finding has already been reviewed" })
  assert.deepEqual(second.outcome, { ok: false, reason: "alreadyDecided" })
  assert.equal(callsTo("auditFinding.updateMany").length, 2)
  assert.equal(callsTo("asset.update").length, 1, "the master changes once")
  assert.equal(callsTo("assetMovement.create").length, 1, "one movement")
  assert.equal(callsTo("auditFinding.update").length, 1, "one decision")
  assert.equal(callsTo("auditItem.update").length, 1, "one item state")

  // The branches that touch no master are claimed too: a not-found finding approved, then rejected from a batch.
  state.finding = finding({ findingType: "not_found", expectedValue: "{\"assetTag\":\"GRL-COM-26-0036\"}", actualValue: null })
  state.pending = true
  state.calls = []
  assert.equal((await post({ action: "approve" })).status, 200)
  assert.deepEqual((await post({ action: "reject", reviewRemark: "เจอแล้ว" })).outcome, { ok: false, reason: "alreadyDecided" })
  assert.deepEqual(callsTo("auditFinding.update").map((args) => dataOf(args).actionTaken), ["not_found_confirmed_no_master_update"])
})

test("every check keeps its order and its answer: 404, read-only round, schema, already decided, own finding, conflict", async () => {
  state.finding = null
  assert.deepEqual(await post({ action: "approve" }), { status: 404, payload: { error: "Audit finding not found" }, outcome: { ok: false, reason: "notFound" } })

  for (const status of ["closed", "cancelled"]) {
    state.finding = finding({ auditRound: { status } })
    const readOnly = await post({ action: "reject" })
    assert.equal(readOnly.status, 400, "the round is checked before the body")
    assert.deepEqual(readOnly.payload, { error: `Audit round is ${status}` })
    assert.deepEqual(readOnly.outcome, { ok: false, reason: "roundReadOnly" })
  }

  state.finding = finding({ reviewStatus: "approved" })
  assert.equal((await post({ action: "reject" })).payload.code, "VALIDATION_FAILED", "the schema before the pending check, as today")
  assert.deepEqual((await post({ action: "reject", reviewRemark: "ซ้ำ" })).payload, { error: "Audit finding has already been reviewed" })

  state.finding = finding({ reportedBy: "reviewer-1" })
  const own = await post({ action: "approve" })
  assert.equal(own.status, 403)
  assert.deepEqual(own.outcome, { ok: false, reason: "ownFinding" })

  // The asset's room changed after the report, to neither value: approve asks for a second press.
  state.finding = finding({ asset: { id: "asset-1", currentLocationId: "loc-9", custodianId: null, departmentId: "dept-1", conditionId: "cond-good", updatedAt: new Date("2026-10-08T01:00:00.000Z") } })
  const conflict = await post({ action: "approve" })
  assert.equal(conflict.status, 409)
  assert.equal(conflict.payload.code, "asset_updated_after_finding")
  assert.equal(conflict.payload.currentValue, "loc-9")
  assert.deepEqual(conflict.outcome, { ok: false, reason: "assetChanged" })

  assert.deepEqual(callsTo("auditFinding.updateMany"), [], "no refusal above reaches the claim")
  assert.equal((await post({ action: "approve", confirmConflict: true })).status, 200, "the second press confirms it")
})

test("a review chosen as a deadlock victim runs again and decides once (I-1)", async () => {
  state.deadlocks = 1
  const approved = await post({ action: "approve" })
  assert.equal(approved.status, 200)
  assert.deepEqual(approved.outcome, { ok: true })
  assert.equal(callsTo("$transaction").length, 2, "the victim, then the run that decides")
  assert.equal(callsTo("asset.update").length, 1)
  assert.equal(callsTo("assetMovement.create").length, 1)
  assert.equal(callsTo("auditFinding.update").length, 1)
})

test("a retry after the winner committed answers already decided through the claim, and writes nothing (I-1)", async () => {
  state.deadlocks = 1
  state.onDeadlock = () => { state.pending = false }
  const retried = await post({ action: "reject", reviewRemark: "จากชุดที่เลือก" })
  assert.equal(retried.status, 400)
  assert.deepEqual(retried.payload, { error: "Audit finding has already been reviewed" })
  assert.deepEqual(retried.outcome, { ok: false, reason: "alreadyDecided" })
  assert.equal(callsTo("$transaction").length, 2)
  assert.deepEqual(writes(), ["auditFinding.updateMany"], "the claim only")
})

test("only a deadlock is retried: already decided inside the transaction runs once; three deadlocks give up (I-1)", async () => {
  state.pending = false
  assert.deepEqual((await post({ action: "approve" })).outcome, { ok: false, reason: "alreadyDecided" })
  assert.equal(callsTo("$transaction").length, 1)

  state.pending = true
  state.calls = []
  state.deadlocks = 3
  const gaveUp = await post({ action: "approve" })
  assert.equal(gaveUp.status, 500)
  assert.equal(callsTo("$transaction").length, 3)
  assert.deepEqual(writes(), [])
})
