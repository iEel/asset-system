import assert from "node:assert/strict"
import { existsSync, mkdtempSync, readdirSync, readFileSync, rmSync } from "node:fs"
import * as nodeModule from "node:module"
import { tmpdir } from "node:os"
import path from "node:path"
import { after, beforeEach, test } from "node:test"
import { pathToFileURL } from "node:url"

// Group 4 plan 3 Task 6 (P3-R8): the batch POST takes one new purchase document as multipart (payload + newDocument +
// file). Every check, the document's duplicate and supplier checks included, runs before the tags are generated, the
// file is saved or anything is written; the document is created and linked to every row inside the batch transaction
// ({ maxWait: 10_000, timeout: 60_000 }); a new document needs asset:edit (P3-R2). A JSON batch works as before.
// The route runs against stand-ins for next/server, auth, the audit log, the tag generator, prisma and the upload
// tracker; savePurchaseDocumentFile is the real one and writes into a temporary UPLOAD_DIR.
type Call = { where: "prisma" | "tx"; name: string; args: unknown }
type World = {
  permissions: string[]
  events: string[]
  calls: Call[]
  audits: Array<Record<string, unknown>>
  tracked: string[]
  committed: boolean
  discards: string[]
  txOptions: unknown
  activeDocuments: string[]
  stored: Array<{ id: string; documentType: string; documentNo: string; isActive: boolean }>
  activeSuppliers: string[]
  failDocumentCreate: Error | null
}

const world: World = freshWorld()
Object.assign(globalThis, { __assetBatchDocs: world })

function freshWorld(): World {
  return {
    permissions: ["asset:view", "asset:create", "asset:edit"],
    events: [],
    calls: [],
    audits: [],
    tracked: [],
    committed: false,
    discards: [],
    txOptions: undefined,
    activeDocuments: ["pd-chosen"],
    stored: [],
    activeSuppliers: ["supplier-1", "supplier-doc"],
    failDocumentCreate: null,
  }
}

const uploadDir = mkdtempSync(path.join(tmpdir(), "asset-batch-docs-"))
process.env.UPLOAD_DIR = uploadDir
after(() => rmSync(uploadDir, { recursive: true, force: true }))

const mockedModuleSources = new Map<string, string>([
  ["next/server", `
    export class NextRequest extends Request {}
    export class NextResponse extends Response { static json(body, init) { return Response.json(body, init) } }
  `],
  ["@/lib/auth-utils", `
    const world = () => globalThis.__assetBatchDocs
    export async function requireAuth() { return { id: "user-1", roles: [], permissions: world().permissions } }
    export function hasPermission(user, module, action) { return user.permissions.includes(module + ":" + action) }
    export function requirePermission(user, module, action) {
      if (!user.permissions.includes(module + ":" + action)) throw new Error("Forbidden: insufficient permissions")
    }
  `],
  ["@/lib/audit-log", `
    const world = () => globalThis.__assetBatchDocs
    export async function logAudit(params) { world().audits.push(params) }
  `],
  ["@/lib/asset-tag", `
    const world = () => globalThis.__assetBatchDocs
    export async function generateAssetTags({ count }) {
      world().events.push("tags")
      return Array.from({ length: count }, (_, index) => "GEN-" + (index + 1))
    }
  `],
  ["@/lib/upload-server", `
    const world = () => globalThis.__assetBatchDocs
    export async function scanWrittenUploadFile(filePath) { world().events.push("file") }
    export function createUploadCleanup() {
      const filePaths = []
      return {
        track(filePath) { filePaths.push(filePath); world().tracked.push(filePath) },
        commit() { world().committed = true },
        async discardIfUncommitted() { if (!world().committed) world().discards.push(...filePaths.splice(0)) },
      }
    }
  `],
  ["@/lib/db", `
    const world = () => globalThis.__assetBatchDocs
    let assetCount = 0
    const handlers = {
      assetStatus: { findFirst: async (args) => ({ id: args.where.id, name: "Ready", isActive: true }) },
      assetCondition: { findFirst: async (args) => ({ id: args.where.id, name: "Good", isActive: true }) },
      asset: {
        findMany: async () => [],
        create: async (args) => { assetCount += 1; return { id: "asset-" + assetCount, assetTag: args.data.assetTag, name: args.data.name, currentLocationId: args.data.currentLocationId, remark: null } },
      },
      employee: { findMany: async () => [] },
      supplier: { findFirst: async (args) => (world().activeSuppliers.includes(args.where.id) ? { id: args.where.id } : null) },
      purchaseDocument: {
        findMany: async (args) => {
          if (args.where?.id?.in) return world().activeDocuments.filter((id) => args.where.id.in.includes(id)).map((id) => ({ id }))
          return world().stored
        },
        create: async (args) => {
          if (world().failDocumentCreate) throw world().failDocumentCreate
          return { id: "pd-new", ...args.data, supplier: null, assetLinks: [] }
        },
      },
      attachment: { create: async (args) => ({ id: "att-1", ...args.data }) },
      assetMovement: { create: async (args) => ({ id: "move-1", ...args.data }) },
      purchaseDocumentAsset: { createMany: async (args) => ({ count: args.data.length }) },
      systemLog: { create: async (args) => ({ id: "log-1", ...args.data }) },
    }
    const client = (where) => new Proxy({}, {
      get: (_, model) => {
        if (model === "then") return undefined
        if (model === "$transaction") return async (work, options) => {
          world().events.push("transaction")
          world().txOptions = options
          assetCount = 0
          return work(client("tx"))
        }
        return new Proxy({}, {
          get: (_, method) => async (args) => {
            world().calls.push({ where, name: model + "." + method, args })
            const handler = handlers[model]?.[method]
            if (!handler) throw new Error("no stand-in for " + model + "." + method)
            return handler(args)
          },
        })
      },
    })
    export const prisma = client("prisma")
  `],
])

;(nodeModule as unknown as {
  registerHooks(options: { resolve(specifier: string, context: unknown, next: (specifier: string, context: unknown) => unknown): unknown }): void
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

const batchRoute = await import(pathToFileURL("src/app/api/assets/batch/route.ts").href) as { POST(request: Request): Promise<Response> }

const pngBytes = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 0x0d, 0x49, 0x48, 0x44, 0x52])
const savedFiles = () => (existsSync(path.join(uploadDir, "purchase-documents")) ? readdirSync(path.join(uploadDir, "purchase-documents"), { recursive: true }).filter((entry) => String(entry).includes(".")) : [])
const names = (where?: "prisma" | "tx") => world.calls.filter((call) => !where || call.where === where).map((call) => call.name)
const duplicateBody = (id: string | null) => ({ error: "Purchase document already exists", id, code: "DUPLICATE", fieldErrors: { documentNo: "duplicate" } })
const uniqueViolation = () => Object.assign(new Error("Unique constraint failed"), { name: "PrismaClientKnownRequestError", code: "P2002" })

const common = {
  name: "Desktop Computer Dell Optiplex",
  categoryId: "category-1",
  brandId: "",
  modelId: "",
  licenseTotalSeats: "",
  licenseUsedSeats: "",
  licenseAssignedAssetId: "",
  companyId: "company-1",
  branchId: "branch-1",
  ownershipType: "stock",
  departmentId: "department-it",
  custodianId: "",
  homeLocationId: "location-store",
  currentLocationId: "location-store",
  statusId: "status-ready",
  conditionId: "condition-good",
  purchaseDate: "",
  purchasePrice: "",
  supplierId: "supplier-1",
  warrantyStartDate: "",
  warrantyEndDate: "",
  fixedAssetCode: "",
  poNumber: "",
  invoiceNumber: "",
  remark: "",
  customFieldsJson: "",
  isActive: true,
}
const payload = { common, rows: [{ clientId: "row-1" }, { clientId: "row-2" }], purchaseDocumentIds: ["pd-chosen"] }
const newDocument = { documentType: "invoice", documentNo: "INV-88", invoiceNumber: "INV-88", documentDate: "2026-10-01", totalAmount: "15000", supplierId: "", currency: "THB" }

function jsonRequest(body: unknown) {
  return new Request("http://localhost/api/assets/batch", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) })
}

function multipartRequest({ document = newDocument as Record<string, unknown> | null, files = 1 } = {}) {
  const form = new FormData()
  form.set("payload", JSON.stringify(payload))
  if (document) form.set("newDocument", JSON.stringify(document))
  for (let index = 0; index < files; index += 1) form.append("file", new File([pngBytes], `invoice-${index}.png`, { type: "image/png" }))
  return new Request("http://localhost/api/assets/batch", { method: "POST", body: form })
}

beforeEach(() => {
  Object.assign(world, freshWorld())
  rmSync(path.join(uploadDir, "purchase-documents"), { recursive: true, force: true })
})

test("a batch whose new document is a duplicate is refused before the tags, the file and any write (Review Focus 5)", async () => {
  world.stored = [{ id: "pd-old", documentType: "invoice", documentNo: "INV-88", isActive: false }]
  const response = await batchRoute.POST(multipartRequest())
  assert.equal(response.status, 409, await response.clone().text())
  assert.deepEqual(await response.json(), duplicateBody("pd-old"))
  assert.deepEqual(world.events, [], "no tags generated, no file saved, no transaction")
  assert.deepEqual(savedFiles(), [])
  assert.deepEqual(names("tx"), [])
  assert.ok(!names().some((name) => /\.(create|createMany|update)$/.test(name)), names().join(", "))
})

test("a batch with a new document creates it once and links it, with the chosen ones, to every asset inside the transaction", async () => {
  const response = await batchRoute.POST(multipartRequest())
  assert.equal(response.status, 201, await response.clone().text())
  const body = await response.json()
  assert.deepEqual(Object.keys(body).sort(), ["assetIds", "assets", "created"], "the summary shape bulk-move.spec reads")
  assert.equal(body.created, 2)
  assert.deepEqual(world.events, ["tags", "file", "transaction"], "the checks, then the tags, then the file, then the writes")
  assert.deepEqual(world.txOptions, { maxWait: 10_000, timeout: 60_000 })
  const txNames = names("tx")
  assert.equal(txNames.filter((name) => name === "purchaseDocument.create").length, 1)
  assert.ok(txNames.indexOf("purchaseDocument.create") < txNames.indexOf("asset.create"), "the document first")
  assert.ok(txNames.includes("attachment.create"))
  const links = world.calls.filter((call) => call.name === "purchaseDocumentAsset.createMany")
  assert.equal(links.length, 2)
  for (const link of links) {
    assert.equal(link.where, "tx")
    const data = (link.args as { data: Array<{ purchaseDocumentId: string }> }).data
    assert.deepEqual(data.map((row) => row.purchaseDocumentId), ["pd-chosen", "pd-new"])
  }
  const created = world.calls.find((call) => call.name === "purchaseDocument.create")?.args as { data: Record<string, unknown> }
  assert.equal(created.data.supplierId, "supplier-1", "no supplier chosen: the batch's own while it is active")
  assert.equal(created.data.documentNo, "INV-88")
  const summary = world.calls.filter((call) => call.name === "systemLog.create").at(-1)?.args as { data: { newValue: string } }
  assert.deepEqual(JSON.parse(summary.data.newValue).purchaseDocumentIds, ["pd-chosen", "pd-new"])
  assert.equal(world.committed, true)
  assert.deepEqual(world.discards, [])
  assert.equal(savedFiles().length, 1)
  assert.deepEqual(world.audits.map((audit) => [audit.action, audit.module, audit.recordId]), [["create", "purchase_document", "pd-new"]])
})

test("a create-only user sending a new document is refused before anything is read or saved (P3-R2)", async () => {
  world.permissions = ["asset:view", "asset:create"]
  const response = await batchRoute.POST(multipartRequest())
  assert.equal(response.status, 403, await response.clone().text())
  assert.deepEqual(world.calls, [])
  assert.deepEqual(world.events, [])
  assert.deepEqual(savedFiles(), [])
})

test("a create-only user may still link chosen documents to a JSON batch", async () => {
  world.permissions = ["asset:view", "asset:create"]
  const response = await batchRoute.POST(jsonRequest(payload))
  assert.equal(response.status, 201, await response.clone().text())
})

test("a JSON batch works as before: the chosen documents are linked, no document is created, no file is saved", async () => {
  const response = await batchRoute.POST(jsonRequest(payload))
  assert.equal(response.status, 201, await response.clone().text())
  const body = await response.json()
  assert.deepEqual(body.assetIds, ["asset-1", "asset-2"])
  assert.deepEqual(body.assets.map((asset: { assetTag: string }) => asset.assetTag), ["GEN-1", "GEN-2"])
  assert.ok(!names().includes("purchaseDocument.create"))
  assert.deepEqual(savedFiles(), [])
  assert.deepEqual(world.audits, [])
  const links = world.calls.filter((call) => call.name === "purchaseDocumentAsset.createMany")
  assert.deepEqual(links.map((link) => (link.args as { data: Array<{ purchaseDocumentId: string }> }).data.map((row) => row.purchaseDocumentId)), [["pd-chosen"], ["pd-chosen"]])
})

test("a JSON batch with no chosen document writes no link rows", async () => {
  const response = await batchRoute.POST(jsonRequest({ ...payload, purchaseDocumentIds: [] }))
  assert.equal(response.status, 201, await response.clone().text())
  assert.ok(!names().includes("purchaseDocumentAsset.createMany"))
})

test("a batch with more than one file is refused before anything is saved", async () => {
  const response = await batchRoute.POST(multipartRequest({ files: 2 }))
  assert.equal(response.status, 400)
  assert.deepEqual(await response.json(), { error: "Only one purchase document file per batch" })
  assert.deepEqual(world.events, [])
  assert.deepEqual(savedFiles(), [])
})

test("a chosen supplier that is closed is refused under the supplier before the tags and the file", async () => {
  const response = await batchRoute.POST(multipartRequest({ document: { ...newDocument, supplierId: "supplier-closed" } }))
  assert.equal(response.status, 400)
  assert.deepEqual(await response.json(), { error: "Supplier not found or inactive", fieldErrors: { supplierId: "purchaseDocumentSupplierInactive" } })
  assert.deepEqual(world.events, [])
  assert.deepEqual(savedFiles(), [])
})

test("a duplicate raced in between the check and the create answers the same 409 and removes the file", async () => {
  world.failDocumentCreate = uniqueViolation()
  const response = await batchRoute.POST(multipartRequest())
  assert.equal(response.status, 409, await response.clone().text())
  assert.deepEqual(await response.json(), duplicateBody(null))
  assert.equal(world.committed, false)
  assert.equal(world.discards.length, 1)
})

test("getAssetFormOptions no longer reads purchase documents (the 300-document load goes)", () => {
  const source = readFileSync("src/lib/asset-form-options.ts", "utf8")
  assert.doesNotMatch(source, /purchaseDocument/)
})

test("buildAssetBatchRequestBody: JSON without a draft (bulk-move.spec's request), payload + newDocument + file with one", async () => {
  const { buildAssetBatchRequestBody } = await import(pathToFileURL("src/lib/asset-form-documents.ts").href) as typeof import("../src/lib/asset-form-documents.ts")
  const plain = buildAssetBatchRequestBody(payload, null)
  assert.deepEqual(plain.headers, { "Content-Type": "application/json" })
  assert.equal(plain.body, JSON.stringify(payload))

  const file = new File([pngBytes], "invoice.png", { type: "image/png" })
  const draft = { id: "active", documentType: "purchase_order" as const, documentNo: "PO-9", documentDate: "", totalAmount: "", supplierId: null, file }
  const multipart = buildAssetBatchRequestBody(payload, draft)
  assert.equal(multipart.headers, undefined, "the browser sets the multipart boundary")
  assert.ok(multipart.body instanceof FormData)
  assert.equal(multipart.body.get("payload"), JSON.stringify(payload))
  assert.deepEqual(JSON.parse(String(multipart.body.get("newDocument"))), {
    documentType: "purchase_order", documentNo: "PO-9", poNumber: "PO-9", invoiceNumber: "", documentDate: "", totalAmount: "", supplierId: "", currency: "THB",
  })
  assert.equal((multipart.body.get("file") as File).name, "invoice.png")
  assert.equal(multipart.body.getAll("file").length, 1)
})
