import assert from "node:assert/strict"
import { existsSync } from "node:fs"
import * as nodeModule from "node:module"
import { beforeEach, test } from "node:test"
import { pathToFileURL } from "node:url"

import { canApplyAuditScanCorrections } from "../src/lib/audit-segregation.ts"

test("only an approver may correct master data during a scan, and only when segregation of duties is off", () => {
  assert.equal(canApplyAuditScanCorrections({ canApprove: false, segregationRequired: false }), false)
  assert.equal(canApplyAuditScanCorrections({ canApprove: true, segregationRequired: true }), false)
  assert.equal(canApplyAuditScanCorrections({ canApprove: true, segregationRequired: false }), true)
})

type ScanState = {
  permissions: string[]
  segregationSetting: string | null
  calls: Array<{ call: string; args: Record<string, unknown> }>
}

const state: ScanState = { permissions: ["audit:edit"], segregationSetting: null, calls: [] }
Object.assign(globalThis, { __auditScanCorrectionState: state })

const mockedModuleSources = new Map<string, string>([
  ["next/server", `
    export class NextRequest extends Request {}
    export class NextResponse extends Response {
      static json(body, init) { return Response.json(body, init) }
    }
  `],
  ["@/lib/auth-utils", `
    const state = () => globalThis.__auditScanCorrectionState
    export async function requireAuth() { return { id: "auditor-1", roles: ["auditor"], permissions: state().permissions, employeeId: "emp-1" } }
    export function hasRole(user, role) { return user.roles.includes(role) }
    export function hasPermission(user, module, action) { return user.roles.includes("system_admin") || user.permissions.includes(module + ":" + action) }
    export function requirePermission(user, module, action) {
      if (!hasPermission(user, module, action)) throw new Error("Forbidden: insufficient permissions")
    }
  `],
  ["@/lib/audit-log", `export async function logAudit() {}`],
  ["@/lib/asset-component-sync", `
    export async function syncInstalledComponentsWithParent() {
      return { updated: 0, skipped: 0, movements: 0, componentSnapshots: [] }
    }
  `],
  ["@/lib/db", `
    const state = () => globalThis.__auditScanCorrectionState
    const item = {
      id: "item-1",
      auditRoundId: "round-1",
      assetId: "asset-1",
      expectedLocationId: "loc-1",
      expectedCustodianId: "emp-5",
      expectedDepartmentId: "dept-1",
      expectedConditionId: "condition-good",
      scannedAt: null,
      scannedBy: null,
      auditResult: null,
      asset: { id: "asset-1", assetTag: "GRL-COM-26-0036", name: "Laptop", ownershipType: "shared", currentLocationId: "loc-1", custodianId: "emp-5" },
    }
    function model(name) {
      return new Proxy({}, {
        get(_target, method) {
          return async (args) => {
            state().calls.push({ call: name + "." + String(method), args: args ?? {} })
            if (name === "auditRound" && method === "findFirst") return { id: "round-1", status: "open" }
            if (name === "auditItem" && method === "findUnique") return item
            if (name === "systemSetting" && method === "findMany") {
              return state().segregationSetting === null ? [] : [{ key: "workflow_approval_segregation_required", value: state().segregationSetting }]
            }
            if (method === "updateMany") return { count: 0 }
            if (method === "count") return 0
            if (method === "findMany") return []
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

const route = await import(pathToFileURL("src/app/api/audit-rounds/[id]/scan/route.ts").href) as {
  POST(request: Request, context: { params: Promise<{ id: string }> }): Promise<Response>
}

function scanWithCorrection() {
  return route.POST(
    new Request("http://localhost/api/audit-rounds/round-1/scan", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ assetId: "asset-1", actualLocationId: "loc-2", applyCorrections: true }),
    }),
    { params: Promise.resolve({ id: "round-1" }) },
  )
}

const masterDataWrites = () => state.calls.filter(({ call }) => call === "asset.update" || call === "asset.updateMany")
const createdFindings = () =>
  state.calls.filter(({ call }) => call === "auditFinding.create").map(({ args }) => args.data as Record<string, unknown>)

beforeEach(() => {
  state.permissions = ["audit:edit"]
  state.segregationSetting = null
  state.calls = []
})

test("an auditor without approval rights cannot change master data from a scan", async () => {
  const response = await scanWithCorrection()
  const payload = await response.json() as Record<string, unknown>

  assert.equal(response.status, 200, JSON.stringify(payload))
  assert.deepEqual(masterDataWrites(), [])
  assert.deepEqual(createdFindings().map((finding) => finding.reviewStatus), ["pending"])
  assert.equal(payload.correctionsDeferred, true)
})

test("with segregation of duties on, even an approver's scan finding waits for another reviewer", async () => {
  state.permissions = ["audit:edit", "audit:approve"]

  await scanWithCorrection()

  assert.deepEqual(masterDataWrites(), [])
  assert.deepEqual(createdFindings().map((finding) => finding.reviewStatus), ["pending"])
})

test("with segregation of duties off, an approver can still correct the location immediately", async () => {
  state.permissions = ["audit:edit", "audit:approve"]
  state.segregationSetting = "false"

  await scanWithCorrection()

  assert.equal(masterDataWrites().length, 1)
  assert.deepEqual(createdFindings().map((finding) => finding.reviewStatus), ["approved"])
})
