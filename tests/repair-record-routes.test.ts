import assert from "node:assert/strict"
import { existsSync, readFileSync } from "node:fs"
import * as nodeModule from "node:module"
import { test } from "node:test"
import { pathToFileURL } from "node:url"

import { MaintenanceApiError } from "../src/lib/maintenance-api-errors.ts"

type RouteState = {
  user: { id: string; name: string; roles: string[]; permissions: string[]; employeeId: string | null }
  calls: Array<{ fn: string; args: unknown[] }>
  error: unknown
}
const state: RouteState = {
  user: { id: "user-1", name: "User", roles: [], permissions: [], employeeId: "emp-1" },
  calls: [],
  error: null,
}
Object.assign(globalThis, { __repairRouteState: state })

const mockedModuleSources = new Map<string, string>([
  ["next/server", `
    export class NextRequest extends Request {}
    export class NextResponse extends Response {
      static json(body, init) { return Response.json(body, init) }
    }
  `],
  ["@/lib/auth-utils", `
    const s = () => globalThis.__repairRouteState
    export async function requireAuth() { return s().user }
    export function hasPermission(user, module, action) {
      return user.roles.includes("system_admin") || user.permissions.includes(module + ":" + action)
    }
    export function requirePermission(user, module, action) {
      if (!hasPermission(user, module, action)) throw new Error("Forbidden: insufficient permissions")
    }
  `],
  ["@/lib/audit-log", `
    export async function logAudit(entry) { globalThis.__repairRouteState.calls.push({ fn: "logAudit", args: [entry] }) }
  `],
  ["@/lib/db", `export const prisma = {}`],
  ["@/lib/repair-record-service", `
    const s = () => globalThis.__repairRouteState
    const previous = { repairStatus: "in_progress", asset: { statusId: "status-under-maintenance" } }
    function record(fn, result) {
      return async (_db, ...args) => {
        s().calls.push({ fn, args })
        if (s().error) throw s().error
        return result
      }
    }
    export const repairRecordInclude = {}
    export const createRepairRecord = record("createRepairRecord", { id: "ticket-1", repairNo: "MT-20261007-0001", repairStatus: "closed" })
    export const completeRepairRecord = record("completeRepairRecord", { ticket: { id: "ticket-1" }, previous })
    export const cancelRepairRecord = record("cancelRepairRecord", { ticket: { id: "ticket-1" }, previous })
    export const updateRepairRecordDetails = record("updateRepairRecordDetails", { ticket: { id: "ticket-1" }, previous })
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

const createRoute = await import(pathToFileURL("src/app/api/maintenance-tickets/route.ts").href) as {
  POST(request: Request): Promise<Response>
}
const recordRoute = await import(pathToFileURL("src/app/api/maintenance-tickets/[id]/route.ts").href) as {
  PATCH(request: Request, context: { params: Promise<{ id: string }> }): Promise<Response>
}

function reset(permissions = ["maintenance:create", "maintenance:edit"]) {
  state.calls = []
  state.error = null
  state.user = { ...state.user, permissions }
}

function jsonRequest(url: string, method: string, body: unknown) {
  return new Request(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) })
}

const context = { params: Promise.resolve({ id: "ticket-1" }) }

test("recording a repair passes the signed-in employee to the service and writes the system log", async () => {
  reset()
  const response = await createRoute.POST(jsonRequest("http://localhost/api/maintenance-tickets", "POST", {
    assetId: "asset-1",
    reportedDate: "2026-10-07",
    problem: "เปลี่ยนแบตเตอรี่",
    done: true,
  }))

  assert.equal(response.status, 201, await response.clone().text())
  const call = state.calls.find(({ fn }) => fn === "createRepairRecord")
  assert.ok(call)
  assert.equal((call.args[0] as { outcome: string }).outcome, "usable")
  assert.deepEqual(call.args[1], { id: "user-1", employeeId: "emp-1" })
  assert.equal(state.calls.some(({ fn }) => fn === "logAudit"), true)
})

test("repair rule errors reach the client as stable codes", async () => {
  reset()
  state.error = new MaintenanceApiError("MAINTENANCE_ASSET_ON_LOAN", "MAINTENANCE_ASSET_ON_LOAN")
  const response = await createRoute.POST(jsonRequest("http://localhost/api/maintenance-tickets", "POST", {
    assetId: "asset-1",
    reportedDate: "2026-10-07",
    problem: "ส่งซ่อม",
    done: false,
  }))

  assert.equal(response.status, 400)
  assert.equal((await response.json()).code, "MAINTENANCE_ASSET_ON_LOAN")
})

test("finishing a repair goes through the complete action", async () => {
  reset()
  const response = await recordRoute.PATCH(jsonRequest("http://localhost/api/maintenance-tickets/ticket-1", "PATCH", {
    action: "complete",
    expectedUpdatedAt: "2026-10-07T03:00:00.000Z",
    returnDate: "2026-10-08",
    outcome: "usable",
  }), context)

  assert.equal(response.status, 200, await response.clone().text())
  const call = state.calls.find(({ fn }) => fn === "completeRepairRecord")
  assert.ok(call)
  assert.equal(call.args[0], "ticket-1")
  assert.equal((call.args[1] as { outcome: string }).outcome, "usable")
})

test("users who can only record repairs cannot finish, edit or cancel them", async () => {
  reset(["maintenance:create"])
  const response = await recordRoute.PATCH(jsonRequest("http://localhost/api/maintenance-tickets/ticket-1", "PATCH", {
    action: "cancel",
    expectedUpdatedAt: "2026-10-07T03:00:00.000Z",
  }), context)

  assert.equal(response.status, 403)
  assert.equal(state.calls.some(({ fn }) => fn === "cancelRepairRecord"), false)
})

test("old workflow actions are rejected", async () => {
  reset()
  const response = await recordRoute.PATCH(jsonRequest("http://localhost/api/maintenance-tickets/ticket-1", "PATCH", {
    action: "status",
    expectedUpdatedAt: "2026-10-07T03:00:00.000Z",
    status: "accepted",
  }), context)

  assert.equal(response.status, 400)
})

test("attachment upload uses the recorder-or-editor rule", () => {
  const source = readFileSync("src/app/api/maintenance-tickets/[id]/attachments/route.ts", "utf8")
  assert.match(source, /canAttachToRepairRecord\(/)
  assert.doesNotMatch(source, /requirePermission\(user, "maintenance", "edit"\)/)
})

test("files on finished records can still be removed by editors", () => {
  const source = readFileSync("src/app/api/attachments/[id]/route.ts", "utf8")
  assert.doesNotMatch(source, /MAINTENANCE_EVIDENCE_LOCKED/)
  assert.doesNotMatch(source, /canDeleteMaintenanceEvidence/)
})
