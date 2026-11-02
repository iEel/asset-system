import assert from "node:assert/strict"
import { existsSync, mkdtempSync, readdirSync, readFileSync, rmSync } from "node:fs"
import * as nodeModule from "node:module"
import { tmpdir } from "node:os"
import path from "node:path"
import { after, beforeEach, test } from "node:test"
import { pathToFileURL } from "node:url"

// Group 4 plan 3 task 3: the duplicate pre-check (POST /api/purchase-documents/check-duplicates), create-and-link in one
// multipart request (POST /api/assets/[id]/purchase-documents) and unlink (DELETE /api/assets/[id]/purchase-documents/
// [documentId]). The routes run against stand-ins for next/server, auth, the audit log, prisma and the upload tracker;
// savePurchaseDocumentFile is the real one and writes into a temporary UPLOAD_DIR, so "no file saved" is read from disk.
type Call = { where: "prisma" | "tx"; name: string; args: unknown }
type World = {
  permissions: string[]
  calls: Call[]
  audits: Array<{ where: "logAudit" | "tx"; params: Record<string, unknown> }>
  tracked: string[]
  committed: boolean
  discards: string[]
  scans: string[]
  failScan: boolean
  asset: { id: string; supplierId: string | null } | null
  activeSuppliers: string[]
  stored: Array<{ id: string; documentType: string; documentNo: string; isActive: boolean }>
  link: { id: string; purchaseDocument: { documentType: string; documentNo: string } } | null
  failCreate: Error | null
  failDelete: Error | null
}

const world: World = freshWorld()
Object.assign(globalThis, { __assetPurchaseDocs: world })

function freshWorld(): World {
  return {
    permissions: ["asset:view", "asset:create", "asset:edit"],
    calls: [],
    audits: [],
    tracked: [],
    committed: false,
    discards: [],
    scans: [],
    failScan: false,
    asset: { id: "asset-1", supplierId: "sup-asset" },
    activeSuppliers: ["sup-asset", "sup-chosen"],
    stored: [],
    link: null,
    failCreate: null,
    failDelete: null,
  }
}

const uploadDir = mkdtempSync(path.join(tmpdir(), "asset-purchase-docs-"))
process.env.UPLOAD_DIR = uploadDir
after(() => rmSync(uploadDir, { recursive: true, force: true }))

const mockedModuleSources = new Map<string, string>([
  ["next/server", `
    export class NextRequest extends Request {}
    export class NextResponse extends Response { static json(body, init) { return Response.json(body, init) } }
  `],
  ["@/lib/auth-utils", `
    const world = () => globalThis.__assetPurchaseDocs
    export async function requireAuth() { return { id: "user-1", roles: [], permissions: world().permissions } }
    export function hasPermission(user, module, action) { return user.permissions.includes(module + ":" + action) }
    export function requirePermission(user, module, action) {
      if (!user.permissions.includes(module + ":" + action)) throw new Error("Forbidden: insufficient permissions")
    }
  `],
  ["@/lib/audit-log", `
    const world = () => globalThis.__assetPurchaseDocs
    export async function logAudit(params) { world().audits.push({ where: "logAudit", params }) }
    export async function writeAuditLog(db, params) {
      if (db.__isTx !== true) throw new Error("writeAuditLog outside the transaction")
      world().audits.push({ where: "tx", params })
    }
  `],
  ["@/lib/upload-server", `
    import { unlink } from "node:fs/promises"
    const world = () => globalThis.__assetPurchaseDocs
    export async function scanWrittenUploadFile(filePath) {
      world().scans.push(filePath)
      if (world().failScan) {
        await unlink(filePath).catch(() => undefined)
        throw new Error("Uploaded file failed malware scan")
      }
    }
    export function createUploadCleanup() {
      const filePaths = []
      return {
        track(filePath) { filePaths.push(filePath); world().tracked.push(filePath) },
        commit() { world().committed = true },
        async discardIfUncommitted() {
          if (world().committed) return
          for (const filePath of filePaths.splice(0)) { world().discards.push(filePath); await unlink(filePath).catch(() => undefined) }
        },
      }
    }
  `],
  ["@/lib/db", `
    const world = () => globalThis.__assetPurchaseDocs
    const searchRecord = (id, data) => ({
      id, documentType: data.documentType, documentNo: data.documentNo, poNumber: data.poNumber ?? null,
      invoiceNumber: data.invoiceNumber ?? null, documentDate: data.documentDate ?? null, totalAmount: data.totalAmount ?? null,
      isActive: true, supplier: data.supplierId ? { id: data.supplierId, code: "S-1", name: "ผู้ขาย" } : null,
      _count: { assetLinks: 1 }, assetLinks: [{ asset: { name: "โน้ตบุ๊ก" } }],
    })
    let created = null
    const handlers = {
      asset: { findFirst: async () => world().asset },
      supplier: { findFirst: async (args) => (world().activeSuppliers.includes(args.where.id) ? { id: args.where.id } : null) },
      purchaseDocument: {
        findMany: async (args) => {
          if (!args.where?.id?.in) return world().stored
          const hits = world().stored.filter((document) => args.where.id.in.includes(document.id))
          return created && args.where.id.in.includes(created.id) ? [...hits, searchRecord(created.id, created.data)] : hits
        },
        create: async (args) => {
          if (world().failCreate) throw world().failCreate
          created = { id: "pd-new", data: args.data }
          return { id: "pd-new", ...args.data, supplier: null, assetLinks: [] }
        },
      },
      attachment: { create: async (args) => ({ id: "att-1", ...args.data }) },
      purchaseDocumentAsset: {
        create: async (args) => ({ id: "link-new", ...args.data }),
        findUnique: async () => world().link,
        delete: async (args) => {
          if (world().failDelete) throw world().failDelete
          return { id: args.where.id }
        },
        findMany: async () => [],
        createMany: async (args) => ({ count: args.data.length }),
      },
    }
    const client = (where) => new Proxy({}, {
      get: (_, model) => {
        if (model === "__isTx") return where === "tx"
        if (model === "then") return undefined
        if (model === "$transaction") return async (work) => work(client("tx"))
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

type Handler = (request: Request, context: { params: Promise<Record<string, string>> }) => Promise<Response>
const checkRoute = await import(pathToFileURL("src/app/api/purchase-documents/check-duplicates/route.ts").href) as { POST(request: Request): Promise<Response> }
const assetRoute = await import(pathToFileURL("src/app/api/assets/[id]/purchase-documents/route.ts").href) as { POST: Handler }
const linkRoute = await import(pathToFileURL("src/app/api/assets/[id]/purchase-documents/[documentId]/route.ts").href) as { DELETE: Handler }

const pngBytes = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 0x0d, 0x49, 0x48, 0x44, 0x52])
const assetContext = { params: Promise.resolve({ id: "asset-1" }) }
const linkContext = (documentId: string) => ({ params: Promise.resolve({ id: "asset-1", documentId }) })
const savedFiles = () => (existsSync(path.join(uploadDir, "purchase-documents")) ? readdirSync(path.join(uploadDir, "purchase-documents"), { recursive: true }).filter((entry) => String(entry).includes(".")) : [])
const names = (where?: "prisma" | "tx") => world.calls.filter((call) => !where || call.where === where).map((call) => call.name)
const duplicateBody = (id: string | null) => ({ error: "Purchase document already exists", id, code: "DUPLICATE", fieldErrors: { documentNo: "duplicate" } })
const uniqueViolation = () => Object.assign(new Error("Unique constraint failed"), { name: "PrismaClientKnownRequestError", code: "P2002" })

function checkRequest(body: unknown) {
  return new Request("http://localhost/api/purchase-documents/check-duplicates", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) })
}

function multipartRequest(fields: Record<string, string>, withFile = true) {
  const form = new FormData()
  for (const [key, value] of Object.entries(fields)) form.set(key, value)
  if (withFile) form.set("file", new File([pngBytes], "invoice.png", { type: "image/png" }))
  return new Request("http://localhost/api/assets/asset-1/purchase-documents", { method: "POST", body: form })
}

const draft = { documentType: "invoice", documentNo: "INV-77", documentDate: "2026-10-01", totalAmount: "1500" }

beforeEach(() => {
  Object.assign(world, freshWorld())
  rmSync(path.join(uploadDir, "purchase-documents"), { recursive: true, force: true })
})

test("the pre-check finds an inactive stored twin and a repeated pair (Review Focus 1)", async () => {
  world.stored = [{ id: "pd-old", documentType: "invoice", documentNo: "INV-1", isActive: false }]
  const response = await checkRoute.POST(checkRequest({ documents: [
    { documentType: "invoice", documentNo: "INV-1" },
    { documentType: "purchase_order", documentNo: "PO-1" },
    { documentType: "purchase_order", documentNo: "PO-1" },
  ] }))
  assert.equal(response.status, 200)
  assert.deepEqual(await response.json(), { duplicates: [
    { index: 0, id: "pd-old", reason: "exists" },
    { index: 2, id: null, reason: "repeated" },
  ] })
  assert.equal(JSON.stringify((world.calls[0].args as { where: unknown }).where).includes("isActive"), false, "the read keeps inactive rows")
})

test("the pre-check takes asset:create or asset:edit, refuses the viewer before reading, and bounds its list", async () => {
  world.permissions = ["asset:view"]
  assert.equal((await checkRoute.POST(checkRequest({ documents: [{ documentType: "invoice", documentNo: "X" }] }))).status, 403)
  assert.deepEqual(world.calls, [])
  for (const permission of ["asset:create", "asset:edit"]) {
    world.permissions = [permission]
    assert.equal((await checkRoute.POST(checkRequest({ documents: [{ documentType: "invoice", documentNo: "X" }] }))).status, 200, permission)
  }
  const tooMany = Array.from({ length: 21 }, (_, index) => ({ documentType: "invoice", documentNo: `INV-${index}` }))
  assert.equal((await checkRoute.POST(checkRequest({ documents: tooMany }))).status, 400)
  assert.equal((await checkRoute.POST(checkRequest({ documents: [{ documentType: "invoice", documentNo: " " }] }))).status, 400)
})

test("create-and-link writes the document, its attachment and the link in one transaction, then commits the upload", async () => {
  const response = await assetRoute.POST(multipartRequest({ ...draft, supplierId: "sup-chosen" }), assetContext)
  assert.equal(response.status, 201, await response.clone().text())
  const body = await response.json() as { document: Record<string, unknown>; linkedIds: string[] }
  assert.deepEqual(body.linkedIds, ["pd-new"])
  assert.equal(body.document.id, "pd-new")
  assert.equal(body.document.documentNo, "INV-77")
  assert.equal(body.document.linkedAssetCount, 1)
  assert.deepEqual(body.document.linkedAssetNames, ["โน้ตบุ๊ก"])
  assert.deepEqual(names("tx").slice(0, 3), ["purchaseDocument.create", "attachment.create", "purchaseDocumentAsset.create"])
  assert.equal(names("prisma").some((name) => name.endsWith(".create")), false, "every write is inside the transaction")
  const linkCall = world.calls.find((call) => call.name === "purchaseDocumentAsset.create")
  assert.deepEqual(linkCall?.args, { data: { assetId: "asset-1", purchaseDocumentId: "pd-new", linkedBy: "user-1" } })
  assert.equal((world.calls.find((call) => call.name === "purchaseDocument.create")?.args as { data: { supplierId: string } }).data.supplierId, "sup-chosen")
  assert.equal(world.tracked.length, 1)
  assert.equal(world.committed, true)
  assert.deepEqual(world.discards, [])
  assert.equal(savedFiles().length, 1)
  assert.equal(world.scans.length, 1, "the file went through the virus scan")
  assert.deepEqual(world.audits.map((audit) => [audit.where, audit.params.action, audit.params.module]), [
    ["logAudit", "create", "purchase_document"],
    ["logAudit", "link_purchase_documents", "asset"],
  ])
  assert.deepEqual(world.audits[1].params.newValue, { purchaseDocumentIds: ["pd-new"] })
})

test("a duplicate type and number answers the 409 before any file is saved (P3-R3)", async () => {
  world.stored = [{ id: "pd-old", documentType: "invoice", documentNo: "INV-77", isActive: false }]
  const response = await assetRoute.POST(multipartRequest(draft), assetContext)
  assert.equal(response.status, 409)
  assert.deepEqual(await response.json(), duplicateBody("pd-old"))
  assert.deepEqual(savedFiles(), [])
  assert.deepEqual(world.scans, [])
  assert.deepEqual(names("tx"), [])
  assert.deepEqual(world.audits, [])
})

test("a failed scan answers an error, writes nothing and discards nothing it did not save (Review Focus 3)", async () => {
  world.failScan = true
  const response = await assetRoute.POST(multipartRequest(draft), assetContext)
  assert.equal(response.status, 400)
  assert.deepEqual(await response.json(), { error: "Uploaded file failed malware scan" })
  assert.deepEqual(names("tx"), [])
  assert.deepEqual(world.tracked, [])
  assert.deepEqual(world.discards, [])
  assert.deepEqual(savedFiles(), [])
  assert.deepEqual(world.audits, [])
})

test("a P2002 inside the transaction answers the same 409 and discards the saved file", async () => {
  world.failCreate = uniqueViolation()
  const response = await assetRoute.POST(multipartRequest(draft), assetContext)
  assert.equal(response.status, 409)
  assert.deepEqual((await response.json() as { code: string }).code, "DUPLICATE")
  assert.equal(world.committed, false)
  assert.equal(world.discards.length, 1)
  assert.deepEqual(savedFiles(), [])
  assert.deepEqual(world.audits, [])
})

test("the supplier defaults to the asset's; an unknown or inactive supplier is refused under supplierId before the file is saved", async () => {
  const response = await assetRoute.POST(multipartRequest(draft, false), assetContext)
  assert.equal(response.status, 201)
  assert.equal((world.calls.find((call) => call.name === "purchaseDocument.create")?.args as { data: { supplierId: string } }).data.supplierId, "sup-asset")

  Object.assign(world, freshWorld())
  world.asset = { id: "asset-1", supplierId: "sup-closed" }
  assert.equal((await assetRoute.POST(multipartRequest(draft, false), assetContext)).status, 201)
  assert.equal((world.calls.find((call) => call.name === "purchaseDocument.create")?.args as { data: { supplierId: unknown } }).data.supplierId, null, "an inactive asset supplier is not copied")

  Object.assign(world, freshWorld())
  const refused = await assetRoute.POST(multipartRequest({ ...draft, supplierId: "sup-gone" }), assetContext)
  assert.equal(refused.status, 400)
  assert.deepEqual(await refused.json(), { error: "Supplier not found or inactive", fieldErrors: { supplierId: "purchaseDocumentSupplierInactive" } })
  assert.deepEqual(savedFiles(), [])
  assert.deepEqual(names("tx"), [])
})

test("the JSON body keeps the additive link and its { linkedIds } answer", async () => {
  const request = new Request("http://localhost/api/assets/asset-1/purchase-documents", {
    method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ purchaseDocumentIds: ["pd-1"] }),
  })
  world.stored = [{ id: "pd-1", documentType: "invoice", documentNo: "INV-1", isActive: true }]
  const response = await assetRoute.POST(request, assetContext)
  assert.equal(response.status, 200)
  assert.deepEqual(await response.json(), { linkedIds: ["pd-1"] })
  assert.deepEqual(world.audits.map((audit) => audit.params.action), ["link_purchase_documents"])
})

test("create-and-link and unlink refuse a viewer before reading anything", async () => {
  world.permissions = ["asset:view"]
  assert.equal((await assetRoute.POST(multipartRequest(draft), assetContext)).status, 403)
  assert.equal((await linkRoute.DELETE(new Request("http://localhost/x", { method: "DELETE" }), linkContext("pd-1"))).status, 403)
  // asset:create alone does not create a document (P3-R2).
  world.permissions = ["asset:create"]
  assert.equal((await assetRoute.POST(multipartRequest(draft), assetContext)).status, 403)
  assert.deepEqual(world.calls, [])
  assert.deepEqual(savedFiles(), [])
})

test("unlink removes this asset's link and writes its audit in one transaction; the document stays", async () => {
  world.link = { id: "link-9", purchaseDocument: { documentType: "invoice", documentNo: "INV-9" } }
  const response = await linkRoute.DELETE(new Request("http://localhost/x", { method: "DELETE" }), linkContext("pd-9"))
  assert.equal(response.status, 200)
  assert.deepEqual(await response.json(), { unlinkedId: "pd-9" })
  const lookup = world.calls.find((call) => call.name === "purchaseDocumentAsset.findUnique")
  assert.deepEqual((lookup?.args as { where: unknown }).where, { purchaseDocumentId_assetId: { purchaseDocumentId: "pd-9", assetId: "asset-1" } })
  assert.deepEqual(names("tx"), ["purchaseDocumentAsset.delete"])
  assert.deepEqual(world.calls.find((call) => call.name === "purchaseDocumentAsset.delete")?.args, { where: { id: "link-9" } })
  assert.equal(names().some((name) => name.startsWith("purchaseDocument.") || name.startsWith("attachment.")), false, "the document and its files stay")
  assert.deepEqual(world.audits, [{ where: "tx", params: {
    userId: "user-1", action: "unlink_purchase_documents", module: "asset", recordId: "asset-1",
    oldValue: { purchaseDocumentIds: ["pd-9"], documentType: "invoice", documentNo: "INV-9" },
  } }])
})

test("unlinking a document that is not linked to this asset answers 404 and writes nothing", async () => {
  world.link = null
  const response = await linkRoute.DELETE(new Request("http://localhost/x", { method: "DELETE" }), linkContext("pd-other"))
  assert.equal(response.status, 404)
  assert.deepEqual(await response.json(), { code: "PURCHASE_DOCUMENT_LINK_NOT_FOUND", error: "Purchase document link not found" })
  assert.deepEqual(names("tx"), [])
  assert.deepEqual(world.audits, [])

  world.asset = null
  assert.equal((await linkRoute.DELETE(new Request("http://localhost/x", { method: "DELETE" }), linkContext("pd-9"))).status, 404)
})

test("the unlink handler checks asset:edit before any read (source)", () => {
  const source = readFileSync("src/app/api/assets/[id]/purchase-documents/[documentId]/route.ts", "utf8")
  const permission = source.indexOf('requirePermission(user, "asset", "edit")')
  assert.ok(permission > 0 && permission < source.indexOf("prisma."))
  assert.ok(source.indexOf("writeAuditLog(tx,") > source.indexOf("await prisma.$transaction("), "the audit is written inside the transaction")
})

test("a link removed between the read and the delete (P2025) answers the same 404, not a hidden 500 (final review)", async () => {
  world.link = { id: "link-9", purchaseDocument: { documentType: "invoice", documentNo: "INV-9" } }
  world.failDelete = Object.assign(new Error("Record to delete does not exist."), { name: "PrismaClientKnownRequestError", code: "P2025" })
  const response = await linkRoute.DELETE(new Request("http://localhost/x", { method: "DELETE" }), linkContext("pd-9"))
  assert.equal(response.status, 404)
  assert.deepEqual(await response.json(), { code: "PURCHASE_DOCUMENT_LINK_NOT_FOUND", error: "Purchase document link not found" })
  assert.deepEqual(world.audits, [])
})

test("an explicit empty supplier stores none; an absent one still follows the asset's (final review)", async () => {
  const none = await assetRoute.POST(multipartRequest({ ...draft, supplierId: "" }, false), assetContext)
  assert.equal(none.status, 201, await none.clone().text())
  assert.equal((world.calls.find((call) => call.name === "purchaseDocument.create")?.args as { data: { supplierId: unknown } }).data.supplierId, null)
  assert.equal(world.calls.some((call) => call.name === "supplier.findFirst"), false, "no fallback lookup when none was chosen")

  Object.assign(world, freshWorld())
  assert.equal((await assetRoute.POST(multipartRequest(draft, false), assetContext)).status, 201)
  assert.equal((world.calls.find((call) => call.name === "purchaseDocument.create")?.args as { data: { supplierId: unknown } }).data.supplierId, "sup-asset")
})

test("upload fields past their limits answer field errors before any read or file save (final review)", async () => {
  const cases: Array<[Record<string, string>, Record<string, string>]> = [
    [{ poNumber: "P".repeat(101) }, { poNumber: "tooLong" }],
    [{ invoiceNumber: "I".repeat(101) }, { invoiceNumber: "tooLong" }],
    [{ currency: "THBTHBTHBTHB" }, { currency: "tooLong" }],
    [{ remark: "r".repeat(501) }, { remark: "tooLong" }],
    [{ totalAmount: "10000000000000" }, { totalAmount: "outOfRange" }],
    [{ totalAmount: "-1" }, { totalAmount: "outOfRange" }],
    [{ totalAmount: "12.345" }, { totalAmount: "invalidNumber" }],
    [{ documentDate: "not-a-date" }, { documentDate: "invalidDate" }],
    [{ documentDate: "1800-01-01" }, { documentDate: "outOfRange" }],
  ]
  for (const [fields, fieldErrors] of cases) {
    Object.assign(world, freshWorld())
    const response = await assetRoute.POST(multipartRequest({ ...draft, ...fields }), assetContext)
    assert.equal(response.status, 400, JSON.stringify(fields))
    assert.deepEqual((await response.json() as { fieldErrors: unknown }).fieldErrors, fieldErrors, JSON.stringify(fields))
    assert.deepEqual(savedFiles(), [])
    assert.deepEqual(names("tx"), [])
  }
})
