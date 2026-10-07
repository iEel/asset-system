import assert from "node:assert/strict"
import { existsSync } from "node:fs"
import * as nodeModule from "node:module"
import { test } from "node:test"
import { pathToFileURL } from "node:url"

type CheckinState = { calls: Array<{ call: string; args: Record<string, unknown> }> }
const state: CheckinState = { calls: [] }
Object.assign(globalThis, { __checkinTicketState: state })

const mockedModuleSources = new Map<string, string>([
  ["next/server", `
    export class NextRequest extends Request {}
    export class NextResponse extends Response {
      static json(body, init) { return Response.json(body, init) }
    }
  `],
  ["@/lib/auth-utils", `
    export async function requireAuth() { return { id: "user-1", roles: ["system_admin"], permissions: [], employeeId: "emp-1" } }
    export function hasRole(user, role) { return user.roles.includes(role) }
    export function hasPermission() { return true }
    export function requirePermission() {}
  `],
  ["@/lib/audit-log", `export async function logAudit() {}`],
  ["@/lib/asset-status-flow", `export async function isValidCheckinReturnStatus() { return true }`],
  ["@/lib/operation-document-number", `export async function generateCheckinDocumentNo() { return "RT-202610-0001" }`],
  ["@/lib/asset-component-sync", `
    export async function syncInstalledComponentsWithParent() {
      return { updated: 0, skipped: 0, movements: 0, componentSnapshots: [] }
    }
  `],
  ["@/lib/asset-operation-evidence", `
    export function optionalFormFile() { return null }
    export function optionalFormText() { return null }
    export function requiredFormText() { return "" }
    export async function saveOperationEvidenceFile() { return null }
  `],
  ["@/lib/db", `
    const state = () => globalThis.__checkinTicketState
    const asset = {
      id: "asset-1",
      statusId: "status:Checked Out",
      conditionId: "condition-good",
      branchId: "branch-1",
      currentLocationId: "loc-1",
      custodianId: "emp-5",
      departmentId: "dept-1",
      updatedAt: new Date("2026-10-01T00:00:00Z"),
    }
    function model(name) {
      return new Proxy({}, {
        get(_target, method) {
          return async (args) => {
            state().calls.push({ call: name + "." + String(method), args: args ?? {} })
            if (name === "asset" && (method === "findFirst" || method === "findUnique")) return asset
            if (name === "asset" && method === "update") return { ...asset, ...(args?.data ?? {}), updatedAt: new Date("2026-10-07T03:00:00Z") }
            if (name === "assetCheckout" && method === "findFirst") {
              return { id: "co-1", assetId: "asset-1", handoverMode: "temporary_loan", custodianId: "emp-5", asset: { status: { name: "Checked Out" } } }
            }
            if (name === "assetCondition") return { name: "Damaged", isActive: true }
            if (name === "assetStatus") return { id: "status:Pending Repair", name: "Pending Repair" }
            if (method === "updateMany") return { count: 1 }
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

const route = await import(pathToFileURL("src/app/api/assets/[id]/checkin/route.ts").href) as {
  POST(request: Request, context: { params: Promise<{ id: string }> }): Promise<Response>
}

test("a repair ticket opened while returning a damaged asset can move through the normal repair workflow", async () => {
  const response = await route.POST(
    new Request("http://localhost/api/assets/asset-1/checkin", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        checkoutId: "co-1",
        returnDate: "2026-10-07",
        returnBy: "สมชาย",
        receiveBy: "สมหญิง",
        conditionAfter: "condition-damaged",
        nextStatusId: "status:Pending Repair",
        nextLocationId: "loc-1",
        createMaintenance: true,
        maintenanceReportedById: "emp-1",
      }),
    }),
    { params: Promise.resolve({ id: "asset-1" }) },
  )

  assert.equal(response.status, 201, await response.clone().text())
  const ticket = state.calls.find(({ call }) => call === "maintenanceTicket.create")?.args.data as Record<string, unknown>
  assert.equal(ticket.repairStatus, "reported", "the schema default 'open' can only jump to closed, so the ticket must start as reported")
})
