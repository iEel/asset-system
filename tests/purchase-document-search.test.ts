import assert from "node:assert/strict"
import test from "node:test"

import { readPurchaseDocumentChoices, searchPurchaseDocuments, type PurchaseDocumentSearchDb } from "../src/lib/purchase-document-search.ts"
import {
  buildPurchaseDocumentSearchHref,
  buildPurchaseDocumentSearchWheres,
  parsePurchaseDocumentSearch,
  purchaseDocumentLinkedNamesShown,
  purchaseDocumentRecentLimit,
  purchaseDocumentSearchLimit,
  purchaseDocumentSearchPath,
  purchaseDocumentSearchSelect,
  type PurchaseDocumentSearchInput,
  type PurchaseDocumentSearchRecord,
} from "../src/lib/purchase-document-search-rules.ts"

function input(query: string): PurchaseDocumentSearchInput {
  const parsed = parsePurchaseDocumentSearch(new URLSearchParams(query))
  if ("error" in parsed) throw new Error(query)
  return parsed
}

function record(id: string, overrides: Partial<PurchaseDocumentSearchRecord> = {}): PurchaseDocumentSearchRecord {
  return {
    id,
    documentType: "purchase_order",
    documentNo: `PO-${id}`,
    poNumber: null,
    invoiceNumber: null,
    documentDate: new Date("2026-10-01T00:00:00.000Z"),
    totalAmount: null,
    isActive: true,
    supplier: null,
    _count: { assetLinks: 0 },
    assetLinks: [],
    ...overrides,
  }
}

type Args = { where: Record<string, unknown>; select?: unknown; orderBy?: unknown; take?: number }
function fakeDb(data: {
  exact?: PurchaseDocumentSearchRecord[]
  prefix?: PurchaseDocumentSearchRecord[]
  contains?: PurchaseDocumentSearchRecord[]
  total?: number
  activeTotal?: number
  newest?: PurchaseDocumentSearchRecord[]
  supplier?: PurchaseDocumentSearchRecord[]
  byId?: PurchaseDocumentSearchRecord[]
} = {}) {
  const calls: Array<{ call: string; args: Args }> = []
  const db: PurchaseDocumentSearchDb = {
    purchaseDocument: {
      async findMany(raw: object) {
        const args = raw as Args
        calls.push({ call: "findMany", args })
        const where = args.where
        if ("id" in where) {
          const ids = (where.id as { in: string[] }).in
          return (data.byId ?? []).filter((row) => ids.includes(row.id))
        }
        if ("supplierId" in where) return data.supplier ?? []
        const or = where.OR as Array<Record<string, unknown>> | undefined
        if (or && typeof or[0].documentNo === "string") return data.exact ?? []
        if (or && typeof or[0].documentNo === "object" && "startsWith" in (or[0].documentNo as object)) return data.prefix ?? []
        if (Object.keys(where).length === 1) return data.newest ?? []
        return data.contains ?? []
      },
      async count(raw: object) {
        const args = raw as Args
        calls.push({ call: "count", args })
        return Object.keys(args.where).length === 1 ? data.activeTotal ?? 0 : data.total ?? 0
      },
    },
  }
  return { db, calls }
}

test("the constants and the path (plan 3 Task 2)", () => {
  assert.deepEqual(
    [purchaseDocumentSearchLimit, purchaseDocumentRecentLimit, purchaseDocumentLinkedNamesShown, purchaseDocumentSearchPath],
    [20, 10, 3, "/api/purchase-documents/search"],
  )
  assert.equal(buildPurchaseDocumentSearchHref({ q: "PO 31", supplierId: "sup-1" }), "/api/purchase-documents/search?q=PO+31&supplierId=sup-1")
  assert.equal(buildPurchaseDocumentSearchHref({}), "/api/purchase-documents/search")
})

test("the parse: empty q is the newest list, 1 character or over 100 is refused, the supplier is read", () => {
  assert.deepEqual(parsePurchaseDocumentSearch(new URLSearchParams("")), { q: "", supplierId: null })
  assert.deepEqual(parsePurchaseDocumentSearch(new URLSearchParams("q=%20%20&supplierId=sup-1")), { q: "", supplierId: "sup-1" })
  assert.deepEqual(parsePurchaseDocumentSearch(new URLSearchParams("q=%20P%20")), { error: "Invalid search" })
  assert.deepEqual(parsePurchaseDocumentSearch(new URLSearchParams(`q=${"ก".repeat(101)}`)), { error: "Invalid search" })
  assert.deepEqual(parsePurchaseDocumentSearch(new URLSearchParams(`q=${"ก".repeat(100)}`)), { q: "ก".repeat(100), supplierId: null })
})

test("the wheres: active documents, 5 words AND-ed, each over the numbers, the supplier and an active linked asset's tag, name and model", () => {
  const wheres = buildPurchaseDocumentSearchWheres(input("q=a1 b2 c3 d4 e5 f6"))
  const text = wheres.text as { isActive: boolean; AND: Array<{ OR: unknown[] }> }
  assert.equal(text.isActive, true)
  assert.equal(text.AND.length, 5)
  assert.deepEqual(text.AND[0].OR, [
    { documentNo: { contains: "a1" } },
    { poNumber: { contains: "a1" } },
    { invoiceNumber: { contains: "a1" } },
    { supplier: { code: { contains: "a1" } } },
    { supplier: { name: { contains: "a1" } } },
    {
      assetLinks: {
        some: {
          asset: {
            isActive: true,
            OR: [{ assetTag: { contains: "a1" } }, { name: { contains: "a1" } }, { model: { name: { contains: "a1" } } }],
          },
        },
      },
    },
  ])
  assert.ok(!JSON.stringify(text).includes("f6"), "the sixth word is dropped")
  // The number tiers use the whole q.
  assert.deepEqual(wheres.exact, { isActive: true, OR: [{ documentNo: "a1 b2 c3 d4 e5 f6" }, { poNumber: "a1 b2 c3 d4 e5 f6" }, { invoiceNumber: "a1 b2 c3 d4 e5 f6" }] })
  assert.deepEqual(wheres.prefix, {
    isActive: true,
    OR: [{ documentNo: { startsWith: "a1 b2 c3 d4 e5 f6" } }, { poNumber: { startsWith: "a1 b2 c3 d4 e5 f6" } }, { invoiceNumber: { startsWith: "a1 b2 c3 d4 e5 f6" } }],
  })
  const one = buildPurchaseDocumentSearchWheres(input("q=PO-31")).text as { isActive: boolean; OR: unknown[] }
  assert.equal(one.isActive, true)
  assert.equal(one.OR.length, 6)
})

test("the select counts and names active linked assets only, the first 3 by link date (Review Focus 2)", () => {
  assert.deepEqual(purchaseDocumentSearchSelect._count, { select: { assetLinks: { where: { asset: { isActive: true } } } } })
  assert.deepEqual(purchaseDocumentSearchSelect.assetLinks.where, { asset: { isActive: true } })
  assert.equal(purchaseDocumentSearchSelect.assetLinks.take, 3)
  assert.deepEqual(purchaseDocumentSearchSelect.assetLinks.orderBy, [{ linkedAt: "asc" }, { id: "asc" }])
})

test("a search ranks exact, then prefix, then text, each document once, at most 20; total is the text count", async () => {
  const many = Array.from({ length: 25 }, (_, index) => record(`c${index}`))
  const { db, calls } = fakeDb({
    exact: [record("e1")],
    prefix: [record("p1"), record("e1")],
    contains: [record("p1"), record("e1"), ...many],
    total: 27,
    activeTotal: 140,
  })
  const answer = await searchPurchaseDocuments(db, input("q=PO-2569"))
  assert.deepEqual(answer.rows.slice(0, 3).map((row) => row.id), ["e1", "p1", "c0"])
  assert.equal(answer.rows.length, 20)
  assert.equal(new Set(answer.rows.map((row) => row.id)).size, 20)
  assert.deepEqual([answer.total, answer.activeTotal], [27, 140])
  const reads = calls.filter((call) => call.call === "findMany")
  assert.equal(reads.length, 3)
  for (const read of reads) {
    assert.equal(read.args.take, 20)
    assert.deepEqual(read.args.orderBy, [{ documentDate: "desc" }, { createdAt: "desc" }, { id: "asc" }])
    assert.equal(read.args.select, purchaseDocumentSearchSelect)
  }
  assert.deepEqual(calls.filter((call) => call.call === "count").map((call) => call.args.where), [
    buildPurchaseDocumentSearchWheres(input("q=PO-2569")).text,
    { isActive: true },
  ])
})

test("an empty q lists the 10 newest, the form's supplier first; total is the rows shown", async () => {
  const newest = Array.from({ length: 10 }, (_, index) => record(`n${index}`))
  const { db, calls } = fakeDb({ supplier: [record("s1"), record("n3")], newest, activeTotal: 140 })
  const answer = await searchPurchaseDocuments(db, input("supplierId=sup-1"))
  assert.deepEqual(answer.rows.map((row) => row.id), ["s1", "n3", "n0", "n1", "n2", "n4", "n5", "n6", "n7", "n8"])
  assert.deepEqual([answer.total, answer.activeTotal], [10, 140])
  const reads = calls.filter((call) => call.call === "findMany")
  assert.deepEqual(reads.map((read) => [read.args.where, read.args.take]), [
    [{ isActive: true, supplierId: "sup-1" }, 10],
    [{ isActive: true }, 10],
  ])

  const plain = fakeDb({ newest: newest.slice(0, 4), activeTotal: 4 })
  const noSupplier = await searchPurchaseDocuments(plain.db, input(""))
  assert.deepEqual([noSupplier.rows.length, noSupplier.total, noSupplier.activeTotal], [4, 4, 4])
  assert.equal(plain.calls.filter((call) => call.call === "findMany").length, 1)
})

test("a row: ISO date, the amount as a string, the supplier, the active linked count and the first 3 names", async () => {
  const { db } = fakeDb({
    exact: [record("e1", {
      documentType: "invoice",
      poNumber: "PO-1",
      invoiceNumber: "INV-1",
      documentDate: new Date("2026-09-30T00:00:00.000Z"),
      totalAmount: { toString: () => "15000.5" } as unknown as PurchaseDocumentSearchRecord["totalAmount"],
      supplier: { id: "sup-1", code: "SUP-01", name: "บริษัท เอ" },
      _count: { assetLinks: 5 },
      assetLinks: [{ asset: { name: "โน้ตบุ๊ก 1" } }, { asset: { name: "โน้ตบุ๊ก 2" } }, { asset: { name: "จอ 1" } }],
    })],
    total: 1,
  })
  const [row] = (await searchPurchaseDocuments(db, input("q=INV-1"))).rows
  assert.deepEqual(row, {
    id: "e1",
    documentType: "invoice",
    documentNo: "PO-e1",
    poNumber: "PO-1",
    invoiceNumber: "INV-1",
    supplier: { id: "sup-1", code: "SUP-01", name: "บริษัท เอ" },
    documentDate: "2026-09-30T00:00:00.000Z",
    totalAmount: "15000.5",
    linkedAssetCount: 5,
    linkedAssetNames: ["โน้ตบุ๊ก 1", "โน้ตบุ๊ก 2", "จอ 1"],
    isActive: true,
  })
})

test("the chosen documents are read by id, inactive ones too, in the order given (P3-R7)", async () => {
  const { db, calls } = fakeDb({ byId: [record("a"), record("b", { isActive: false }), record("c")] })
  const rows = await readPurchaseDocumentChoices(db, ["c", "b", "missing", "c"])
  assert.deepEqual(rows.map((row) => [row.id, row.isActive]), [["c", true], ["b", false]])
  assert.deepEqual(calls[0].args.where, { id: { in: ["c", "b", "missing"] } })
  assert.equal(calls[0].args.select, purchaseDocumentSearchSelect)

  const empty = fakeDb()
  assert.deepEqual(await readPurchaseDocumentChoices(empty.db, []), [])
  assert.equal(empty.calls.length, 0)
})
