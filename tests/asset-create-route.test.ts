import assert from "node:assert/strict"
import { existsSync } from "node:fs"
import * as nodeModule from "node:module"
import { beforeEach, test } from "node:test"
import { pathToFileURL } from "node:url"

// POST /api/assets (group 4 plan 2 task 4, P2-R7, P2-R8): the department rule on create, the holder read active, the
// asset, its first movement and its audit in one transaction, and the tag's unique race. Route modules import
// next/server and "@/…", which node --test cannot load, so a resolve hook serves stand-ins (the v-track-s.test.ts
// pattern). Every query is recorded with the client it ran on: "prisma" or "tx" (the transaction's client).

type Call = { client: "prisma" | "tx"; call: string; args: unknown }
type CreateState = {
  calls: Call[]
  employees: Array<{ id: string; departmentId: string; companyId: string; branchId: string; isActive: boolean }>
  /** Each generateAssetTag call takes the next of these. */
  generatedTags: string[]
  /** Each tx.asset.create throws the next of these first, if any. */
  createErrors: unknown[]
}

const state: CreateState = { calls: [], employees: [], generatedTags: [], createErrors: [] }
Object.assign(globalThis, { __assetCreate: state })

const stubs = new Map<string, string>([
  ["next/server", `
    export class NextRequest extends Request {}
    export class NextResponse extends Response {
      static json(body, init) { return Response.json(body, init) }
    }
  `],
  ["@/lib/auth-utils", `
    export async function requireAuth() { return { id: "actor-1", roles: ["system_admin"], permissions: [], employeeId: null } }
    export function hasRole() { return true }
    export function hasPermission() { return true }
    export function requirePermission() {}
  `],
  ["@/lib/audit-log", `export async function logAudit(params) { globalThis.__assetCreate.calls.push({ client: "prisma", call: "logAudit", args: params }) }`],
  ["@/lib/asset-tag", `
    export async function generateAssetTag(args) {
      const state = globalThis.__assetCreate
      state.calls.push({ client: "prisma", call: "generateAssetTag", args })
      return state.generatedTags.shift()
    }
  `],
  ["@/lib/db", `
    const state = () => globalThis.__assetCreate
    const handle = (client, model, method, args) => {
      state().calls.push({ client, call: model + "." + method, args })
      if (model === "assetStatus") return { id: args.where.id, name: "Ready", isActive: true }
      if (model === "assetCondition") return { id: args.where.id, name: "Good", isActive: true }
      if (model === "asset" && method === "findFirst") return null
      if (model === "employee" && method === "findFirst") {
        const employee = state().employees.find((item) => item.id === args.where.id)
        if (!employee || (args.where.isActive === true && !employee.isActive)) return null
        return { ...employee, company: { code: "C1", nameTh: "บริษัท" }, branch: { code: "B1", name: "สาขา" } }
      }
      if (model === "asset" && method === "create") {
        if (state().createErrors.length > 0) throw state().createErrors.shift()
        return { id: "asset-new", ...args.data }
      }
      if (model === "assetMovement" && method === "create") return { id: "movement-1" }
      if (model === "systemLog" && method === "create") return { id: "log-1" }
      throw new Error("no stand-in for " + client + "." + model + "." + method)
    }
    const clientFor = (client) => new Proxy({}, {
      get: (_, model) => new Proxy({}, { get: (_, method) => async (args) => handle(client, model, method, args) }),
    })
    const tx = clientFor("tx")
    const base = clientFor("prisma")
    export const prisma = new Proxy({}, {
      get: (_, model) => model === "$transaction"
        ? async (work, options) => {
            state().calls.push({ client: "prisma", call: "$transaction", args: options ?? null })
            return work(tx)
          }
        : base[model],
    })
  `],
])
;(nodeModule as unknown as { registerHooks(hooks: { resolve(specifier: string, context: unknown, next: (specifier: string, context: unknown) => unknown): unknown }): void }).registerHooks({
  resolve(specifier, context, next) {
    const stub = stubs.get(specifier)
    if (stub !== undefined) return { url: `data:text/javascript;charset=utf-8,${encodeURIComponent(stub)}`, shortCircuit: true }
    if (specifier.startsWith("@/")) {
      const base = `src/${specifier.slice(2)}`
      const file = [`${base}.ts`, `${base}.tsx`, `${base}/index.ts`].find((candidate) => existsSync(candidate))
      if (file) return { url: pathToFileURL(file).href, shortCircuit: true }
    }
    return next(specifier, context)
  },
})

type Route = { POST(request: Request): Promise<Response> }
const route = () => import(pathToFileURL("src/app/api/assets/route.ts").href) as Promise<Route>

// The new asset form's body (src/components/assets/asset-form.tsx), every key as the form sends it.
const body = (overrides: Record<string, unknown>) => ({
  assetTag: "", name: "Laptop", categoryId: "category-1", brandId: "", modelId: "", serialNumber: "", licenseTotalSeats: "",
  licenseUsedSeats: "", licenseAssignedAssetId: "", companyId: "company-1", branchId: "branch-1", ownershipType: "personal",
  departmentId: "d9", custodianId: "", homeLocationId: "", currentLocationId: "location-1", statusId: "status-ready",
  conditionId: "condition-good", purchaseDate: "", purchasePrice: "", supplierId: "", warrantyStartDate: "", warrantyEndDate: "",
  fixedAssetCode: "", poNumber: "", invoiceNumber: "", remark: "", customFieldsJson: "", isActive: true,
  ...overrides,
})
const post = async (overrides: Record<string, unknown>) => {
  const { POST } = await route()
  return POST(new Request("http://localhost/api/assets", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body(overrides)) }))
}
const callsOf = (call: string) => state.calls.filter((item) => item.call === call)
const createData = () => (callsOf("asset.create")[0].args as { data: Record<string, unknown> }).data
const uniqueViolation = () => Object.assign(new Error("Unique constraint failed"), { name: "PrismaClientKnownRequestError", code: "P2002" })

beforeEach(() => {
  state.calls = []
  state.employees = [
    { id: "emp-1", departmentId: "d1", companyId: "company-1", branchId: "branch-1", isActive: true },
    { id: "emp-gone", departmentId: "d1", companyId: "company-1", branchId: "branch-1", isActive: false },
  ]
  state.generatedTags = ["GEN-0001", "GEN-0002", "GEN-0003"]
  state.createErrors = []
})

test("a held บุคคล asset takes its holder's department whatever the body sent; a ส่วนกลาง one keeps the chosen department", async () => {
  const personal = await post({ custodianId: "emp-1", departmentId: "d9" })
  assert.equal(personal.status, 201)
  assert.equal(createData().departmentId, "d1")
  assert.equal(createData().custodianId, "emp-1")
  assert.deepEqual(callsOf("employee.findFirst").map((item) => [item.client, (item.args as { where: unknown }).where]), [["tx", { id: "emp-1", isActive: true }]])

  state.calls = []
  const shared = await post({ ownershipType: "shared", custodianId: "emp-1", departmentId: "d9" })
  assert.equal(shared.status, 201)
  assert.equal(createData().departmentId, "d9")

  state.calls = []
  const free = await post({ departmentId: "d9" })
  assert.equal(free.status, 201)
  assert.equal(createData().departmentId, "d9")
  assert.equal(callsOf("employee.findFirst").length, 0, "no holder, no holder read")
})

test("an inactive or unknown holder is refused 409 under custodianId and nothing is written", async () => {
  for (const custodianId of ["emp-gone", "emp-unknown"]) {
    state.calls = []
    const response = await post({ custodianId })
    assert.equal(response.status, 409, custodianId)
    assert.deepEqual(await response.json(), {
      code: "ASSET_TRANSFER_DESTINATION_INACTIVE",
      error: "ASSET_TRANSFER_DESTINATION_INACTIVE",
      fieldErrors: { custodianId: "checkoutReceiverInactive" },
    }, custodianId)
    assert.deepEqual(callsOf("asset.create"), [], custodianId)
    assert.deepEqual(callsOf("assetMovement.create"), [], custodianId)
    assert.deepEqual(callsOf("systemLog.create"), [], custodianId)
  }
})

test("the asset, its create movement and its audit go through one transaction's client; isActive false in the body is created active", async () => {
  const response = await post({ isActive: false, custodianId: "emp-1", remark: "first" })
  assert.equal(response.status, 201)
  assert.equal(callsOf("$transaction").length, 1)
  for (const call of ["asset.create", "assetMovement.create", "systemLog.create"]) {
    assert.deepEqual(callsOf(call).map((item) => item.client), ["tx"], call)
  }
  assert.equal(callsOf("logAudit").length, 0, "the audit is written by writeAuditLog(tx, …), not logAudit")
  assert.equal(createData().isActive, true)
  assert.equal(createData().assetTag, "GEN-0001")
  const movement = (callsOf("assetMovement.create")[0].args as { data: Record<string, unknown> }).data
  assert.deepEqual(
    [movement.assetId, movement.movementType, movement.toValue, movement.referenceType, movement.referenceId, movement.remark],
    ["asset-new", "create", "location-1", "asset", "asset-new", "first"],
  )
  const audit = (callsOf("systemLog.create")[0].args as { data: { action: string; module: string; recordId: string; newValue: string } }).data
  assert.deepEqual([audit.action, audit.module, audit.recordId], ["create", "asset", "asset-new"])
  const newValue = JSON.parse(audit.newValue) as Record<string, unknown>
  assert.equal(newValue.assetTag, "GEN-0001")
  assert.equal(newValue.departmentId, "d1")
  assert.equal(newValue.isActive, true)
  assert.equal(newValue.custodianScope, null)
  const created = await response.json() as { id: string }
  assert.equal(created.id, "asset-new")
})

test("a generated tag that loses the unique race is generated again and the asset is created", async () => {
  state.createErrors = [uniqueViolation()]
  const response = await post({})
  assert.equal(response.status, 201)
  assert.equal(callsOf("generateAssetTag").length, 2)
  assert.deepEqual(callsOf("asset.create").map((item) => (item.args as { data: { assetTag: string } }).data.assetTag), ["GEN-0001", "GEN-0002"])
  assert.equal(callsOf("systemLog.create").length, 1)
})

test("a typed tag that loses the unique race is the tag's field error, not retried and not a 500", async () => {
  state.createErrors = [uniqueViolation()]
  const response = await post({ assetTag: "NB-0001" })
  assert.equal(response.status, 400)
  assert.deepEqual(await response.json(), { error: "Asset tag already exists", fieldErrors: { assetTag: "duplicate" } })
  assert.equal(callsOf("generateAssetTag").length, 0)
  assert.equal(callsOf("asset.create").length, 1)
  assert.equal(callsOf("systemLog.create").length, 0)
})
