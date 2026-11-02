import assert from "node:assert/strict"
import { existsSync, readFileSync } from "node:fs"
import * as nodeModule from "node:module"
import test from "node:test"
import { pathToFileURL } from "node:url"

// Group 4 plan 3 task 1: the shared purchase-document helpers (src/lib/purchase-documents.ts). A duplicate is any stored
// row with the same type and number, active or not (the database unique covers both, P3-R3); linking takes a db so a
// transaction can use it; the create route answers a P2002 with the same 409 body; the unused list GET is gone (P3-R9).
// Modules import next/server and "@/…", which node --test cannot load, so a resolve hook serves stand-ins (as in
// tests/v-track-s.test.ts). The prisma stand-in calls globalThis.__purchaseDocs.prisma[model][method].
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
  ["@/lib/audit-log", `export async function logAudit() {}`],
  ["@/lib/db", `
    const call = (model, method) => (...args) => {
      const handler = globalThis.__purchaseDocs?.prisma?.[model]?.[method]
      if (!handler) throw new Error("no stand-in for prisma." + model + "." + method)
      return handler(...args)
    }
    export const prisma = new Proxy({}, {
      get: (_, model) => model === "$transaction"
        ? async (work) => (typeof work === "function" ? work(prisma) : Promise.all(work))
        : new Proxy({}, { get: (_, method) => call(model, method) }),
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

type Draft = { documentType: "invoice" | "purchase_order"; documentNo: string }
type Lib = {
  findPurchaseDocumentDuplicates(db: unknown, drafts: Draft[]): Promise<Array<{ index: number; id: string | null; reason: string }>>
  linkPurchaseDocumentsToAsset(db: unknown, input: { assetId: string; purchaseDocumentIds: string[]; userId: string }): Promise<string[]>
  purchaseDocumentDuplicateResponse(id: string | null): Response
}
const lib = () => import(pathToFileURL("src/lib/purchase-documents.ts").href) as Promise<Lib>
const uniqueViolation = () => Object.assign(new Error("Unique constraint failed"), { name: "PrismaClientKnownRequestError", code: "P2002" })
const duplicateBody = (id: string | null) => ({ error: "Purchase document already exists", id, code: "DUPLICATE", fieldErrors: { documentNo: "duplicate" } })

test("a stored document with the same type and number is a duplicate whether it is active or not", async () => {
  const { findPurchaseDocumentDuplicates } = await lib()
  const wheres: unknown[] = []
  const db = {
    purchaseDocument: {
      findMany: async (args: { where: unknown }) => {
        wheres.push(args.where)
        return [{ id: "pd-old", documentType: "invoice", documentNo: "INV-1", isActive: false }]
      },
    },
  }
  const found = await findPurchaseDocumentDuplicates(db, [
    { documentType: "purchase_order", documentNo: "PO-9" },
    { documentType: "invoice", documentNo: "INV-1" },
  ])
  assert.deepEqual(found, [{ index: 1, id: "pd-old", reason: "exists" }])
  assert.equal(JSON.stringify(wheres).includes("isActive"), false, "the read has no isActive filter")
  assert.deepEqual(await findPurchaseDocumentDuplicates(db, []), [])
  assert.equal(wheres.length, 1, "no read for no drafts")
})

test("two drafts with the same type and number: the second is repeated", async () => {
  const { findPurchaseDocumentDuplicates } = await lib()
  const db = { purchaseDocument: { findMany: async () => [] } }
  assert.deepEqual(await findPurchaseDocumentDuplicates(db, [
    { documentType: "invoice", documentNo: "INV-2" },
    { documentType: "purchase_order", documentNo: "INV-2" },
    { documentType: "invoice", documentNo: "INV-2" },
  ]), [{ index: 2, id: null, reason: "repeated" }])
})

test("linking skips links that exist, treats a racing link as linked, and returns the new ids", async () => {
  const { linkPurchaseDocumentsToAsset } = await lib()
  const created: unknown[] = []
  const db = {
    purchaseDocument: { findMany: async () => [{ id: "pd-1" }, { id: "pd-2" }, { id: "pd-3" }] },
    purchaseDocumentAsset: {
      findMany: async () => [{ purchaseDocumentId: "pd-1" }],
      createMany: async (args: { data: unknown[] }) => {
        created.push(...args.data)
        return { count: args.data.length }
      },
    },
  }
  assert.deepEqual(await linkPurchaseDocumentsToAsset(db, { assetId: "a-1", purchaseDocumentIds: ["pd-1", " pd-2 ", "pd-3", "pd-2", "gone"], userId: "u-1" }), ["pd-2", "pd-3"])
  assert.deepEqual(created, [
    { assetId: "a-1", purchaseDocumentId: "pd-2", linkedBy: "u-1" },
    { assetId: "a-1", purchaseDocumentId: "pd-3", linkedBy: "u-1" },
  ])

  // A link another request made between the read and the write (P2002) counts as linked, not an error.
  const racing = {
    purchaseDocument: { findMany: async () => [{ id: "pd-2" }, { id: "pd-3" }] },
    purchaseDocumentAsset: {
      findMany: async () => [],
      createMany: async () => { throw uniqueViolation() },
      create: async (args: { data: { purchaseDocumentId: string } }) => {
        if (args.data.purchaseDocumentId === "pd-2") throw uniqueViolation()
        return args.data
      },
    },
  }
  assert.deepEqual(await linkPurchaseDocumentsToAsset(racing, { assetId: "a-1", purchaseDocumentIds: ["pd-2", "pd-3"], userId: "u-1" }), ["pd-3"])
})

test("the duplicate answer is the shared 409 body", async () => {
  const { purchaseDocumentDuplicateResponse } = await lib()
  const response = purchaseDocumentDuplicateResponse("pd-1")
  assert.equal(response.status, 409, await response.clone().text())
  assert.deepEqual(await response.json(), duplicateBody("pd-1"))
})

test("POST /api/purchase-documents answers a P2002 from create with the 409 body; the list GET is gone", async (t) => {
  t.mock.method(console, "error", () => {})
  const route = await import(pathToFileURL("src/app/api/purchase-documents/route.ts").href) as { POST(request: Request): Promise<Response>; GET?: unknown }
  let reads = 0
  Object.assign(globalThis, {
    __purchaseDocs: {
      prisma: {
        purchaseDocument: {
          findMany: async () => (reads++ === 0 ? [] : [{ id: "pd-twin", documentType: "invoice", documentNo: "INV-1", isActive: false }]),
          create: async () => { throw uniqueViolation() },
        },
      },
    },
  })
  const request = new Request("http://localhost/api/purchase-documents", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ documentType: "invoice", documentNo: "INV-1", documentDate: "", totalAmount: "" }),
  })
  const response = await route.POST(request)
  assert.equal(response.status, 409, await response.clone().text())
  assert.deepEqual(await response.json(), duplicateBody("pd-twin"))

  assert.equal(route.GET, undefined)
  const source = readFileSync("src/app/api/purchase-documents/route.ts", "utf8")
  assert.doesNotMatch(source, /export async function GET/)
})

test("a link request names at most 50 documents", async () => {
  const { purchaseDocumentLinkSchema } = await import(pathToFileURL("src/lib/validations/purchase-document.ts").href) as { purchaseDocumentLinkSchema: { safeParse(input: unknown): { success: boolean } } }
  const ids = (count: number) => Array.from({ length: count }, (_, index) => `pd-${index}`)
  assert.equal(purchaseDocumentLinkSchema.safeParse({ purchaseDocumentIds: ids(50) }).success, true)
  assert.equal(purchaseDocumentLinkSchema.safeParse({ purchaseDocumentIds: ids(51) }).success, false)
})

test("the form's amount rule and the server's schema refuse the same amounts (final review)", async () => {
  const { purchaseDocumentSchema } = await import(pathToFileURL("src/lib/validations/purchase-document.ts").href) as { purchaseDocumentSchema: { safeParse(input: unknown): { success: boolean } } }
  const { purchaseDocumentAmountError, purchaseDocumentLimits } = await import(pathToFileURL("src/lib/asset-form-rules.ts").href) as typeof import("../src/lib/asset-form-rules.ts")
  // The parts every client sends (an absent date or amount is refused, as before).
  const base = { documentType: "invoice", documentNo: "INV-1", documentDate: "", totalAmount: "" }
  for (const amount of ["0", "0.07", "19.99", "1500.5", "9999999999999.99", "10000000000000", "-1", "12.345", "abc"]) {
    const server = purchaseDocumentSchema.safeParse({ ...base, totalAmount: amount }).success
    assert.equal(server, purchaseDocumentAmountError(amount) === null, amount)
  }
  assert.equal(purchaseDocumentLimits.amountMax, 9_999_999_999_999.99)
  const text = (field: string, length: number) => purchaseDocumentSchema.safeParse({ ...base, [field]: "x".repeat(length) }).success
  assert.equal(text("documentNo", purchaseDocumentLimits.documentNo), true)
  assert.equal(text("documentNo", purchaseDocumentLimits.documentNo + 1), false)
  assert.equal(text("poNumber", purchaseDocumentLimits.poNumber), true, "a 100-character document number copied into the PO number still fits")
  assert.equal(text("poNumber", purchaseDocumentLimits.poNumber + 1), false)
  assert.equal(text("currency", purchaseDocumentLimits.currency + 1), false)
})
