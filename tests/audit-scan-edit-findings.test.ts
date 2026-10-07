import assert from "node:assert/strict"
import { existsSync } from "node:fs"
import * as nodeModule from "node:module"
import { beforeEach, test } from "node:test"
import { pathToFileURL } from "node:url"

type Finding = { id: string; findingType: string; actualValue: string | null }
const state: { pendingFindings: Finding[]; calls: Array<{ call: string; args: Record<string, unknown> }> } = { pendingFindings: [], calls: [] }
Object.assign(globalThis, { __editFindingsState: state })

const mockedModuleSources = new Map<string, string>([
  ["next/server", `
    export class NextRequest extends Request {}
    export class NextResponse extends Response {
      static json(body, init) { return Response.json(body, init) }
    }
  `],
  ["@/lib/auth-utils", `
    export async function requireAuth() { return { id: "auditor-1", roles: ["auditor"], permissions: ["audit:edit"], employeeId: "emp-1" } }
    export function hasRole(user, role) { return user.roles.includes(role) }
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
    const state = () => globalThis.__editFindingsState
    const item = {
      id: "item-1", auditRoundId: "round-1", assetId: "asset-1",
      expectedLocationId: "loc-1", expectedCustodianId: "emp-5", expectedDepartmentId: "dept-1", expectedConditionId: "condition-good",
      auditStatus: "scanned", auditResult: "wrong_location", scanCount: 1,
      actualLocationId: "loc-2", actualCustodianId: "emp-5", actualDepartmentId: "dept-1", actualConditionId: "condition-good",
      scannedAt: new Date("2026-10-07T01:00:00Z"), scannedBy: "auditor-1", remark: null,
      asset: { id: "asset-1", assetTag: "GRL-COM-26-0036", name: "Laptop", ownershipType: "shared", currentLocationId: "loc-1", custodianId: "emp-5" },
    }
    function model(name) {
      return new Proxy({}, {
        get(_target, method) {
          return async (args) => {
            state().calls.push({ call: name + "." + String(method), args: args ?? {} })
            if (name === "auditRound" && method === "findFirst") return { id: "round-1", status: "open" }
            if (name === "auditItem" && method === "findUnique") return item
            if (name === "auditItem" && method === "update") return { ...item, ...(args?.data ?? {}), scanCount: 2, lastScanAt: new Date("2026-10-07T02:00:00Z") }
            if (name === "user" && method === "findUnique") return { displayName: "ผู้ตรวจ 1" }
            if (name === "auditFinding" && method === "findMany") {
              const types = args?.where?.findingType?.in ?? []
              return state().pendingFindings.filter((finding) => types.includes(finding.findingType))
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

function rescan(actualLocationId: string) {
  return route.POST(
    new Request("http://localhost/api/audit-rounds/round-1/scan", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ assetId: "asset-1", actualLocationId, resultCorrection: true }),
    }),
    { params: Promise.resolve({ id: "round-1" }) },
  )
}

const callsTo = (call: string) => state.calls.filter((entry) => entry.call === call).map((entry) => entry.args)

beforeEach(() => {
  state.pendingFindings = []
  state.calls = []
})

test("correcting a result back to matching closes the pending finding it no longer has", async () => {
  state.pendingFindings = [{ id: "finding-1", findingType: "wrong_location", actualValue: "loc-2" }]

  const response = await rescan("loc-1")
  assert.equal(response.status, 200)

  const closed = callsTo("auditFinding.updateMany").filter((args) => (args.data as Record<string, unknown>)?.reviewRemark === "ยกเลิกเพราะแก้ผลตรวจ")
  assert.equal(closed.length, 1)
  const where = closed[0].where as { auditItemId: string; reviewStatus: string; findingType: { in: string[] } }
  assert.equal(where.auditItemId, "item-1")
  assert.equal(where.reviewStatus, "pending")
  assert.ok(where.findingType.in.includes("wrong_location"))
  assert.ok(!where.findingType.in.includes("not_found"))
  assert.equal((closed[0].data as Record<string, unknown>).reviewStatus, "rejected")
  assert.deepEqual(callsTo("auditFinding.create"), [])
})

test("correcting the found location updates the pending finding's actual value instead of keeping the old one", async () => {
  state.pendingFindings = [{ id: "finding-1", findingType: "wrong_location", actualValue: "loc-2" }]

  await rescan("loc-3")

  const updates = callsTo("auditFinding.update")
  assert.equal(updates.length, 1)
  assert.deepEqual(updates[0].where, { id: "finding-1" })
  assert.equal((updates[0].data as Record<string, unknown>).actualValue, "loc-3")
  assert.deepEqual(callsTo("auditFinding.create"), [])
})

test("an unchanged mismatch leaves the pending finding alone", async () => {
  state.pendingFindings = [{ id: "finding-1", findingType: "wrong_location", actualValue: "loc-2" }]

  await rescan("loc-2")

  assert.deepEqual(callsTo("auditFinding.update"), [])
})

test("the response names who first scanned the item", async () => {
  const payload = await (await rescan("loc-1")).json() as { scannedByName: string | null }
  assert.equal(payload.scannedByName, "ผู้ตรวจ 1")
})
