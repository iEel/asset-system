import assert from "node:assert/strict"
import test from "node:test"
import {
  buildPurchaseDocumentPickerUrl,
  buildPurchaseDocumentRefsSummary,
  countPurchaseDocumentBadge,
  getPurchaseDocumentChipView,
  getPurchaseDocumentLinkedLine,
  getPurchaseDocumentPickerView,
  getPurchaseDocumentResultView,
  isPurchaseDocumentChosen,
  parsePurchaseDocumentAmount,
  purchaseDocumentPickerDebounceMs,
} from "../src/lib/purchase-document-picker-rules.ts"
import type { PurchaseDocumentSearchAnswer, PurchaseDocumentSearchRow } from "../src/lib/purchase-document-search-rules.ts"

// Group 4 plan 3 Task 4 (spec §9.1-§9.2, P3-R1, P3-R4, P3-R7): what the purchase-document picker shows, as plain data.
const row = (over: Partial<PurchaseDocumentSearchRow> = {}): PurchaseDocumentSearchRow => ({
  id: "d1",
  documentType: "purchase_order",
  documentNo: "PO-2569-0412",
  poNumber: "PO-2569-0412",
  invoiceNumber: null,
  supplier: { id: "s1", code: "SUP-01", name: "บริษัท ไอที ซัพพลาย" },
  documentDate: "2026-10-01T00:00:00.000Z",
  totalAmount: "15000.5",
  linkedAssetCount: 0,
  linkedAssetNames: [],
  isActive: true,
  ...over,
})
const answer = (rows: PurchaseDocumentSearchRow[], total = rows.length, activeTotal = 40): PurchaseDocumentSearchAnswer => ({ total, activeTotal, rows })

test("300 ms debounce (P3-R4)", () => {
  assert.equal(purchaseDocumentPickerDebounceMs, 300)
})

test("no request until the person types 2 characters or the supplier changes after mount (P3-R4)", () => {
  assert.equal(buildPurchaseDocumentPickerUrl({ query: "", supplierId: "s1", initialSupplierId: "s1" }), null)
  assert.equal(buildPurchaseDocumentPickerUrl({ query: "  P ", supplierId: null, initialSupplierId: null }), null)
  assert.equal(buildPurchaseDocumentPickerUrl({ query: "x".repeat(101), supplierId: null, initialSupplierId: null }), null)
  // Typed text: the search, without the supplier (the route reads it only for the empty query).
  assert.equal(buildPurchaseDocumentPickerUrl({ query: " PO ", supplierId: "s1", initialSupplierId: "s1" }), "/api/purchase-documents/search?q=PO")
  assert.equal(buildPurchaseDocumentPickerUrl({ query: "Dell 7440", supplierId: "s2", initialSupplierId: "s1" }), "/api/purchase-documents/search?q=Dell+7440")
  // A changed supplier with no typed text: the newest list for that supplier; back to the first one shows the props again.
  assert.equal(buildPurchaseDocumentPickerUrl({ query: "", supplierId: "s2", initialSupplierId: "s1" }), "/api/purchase-documents/search?supplierId=s2")
  assert.equal(buildPurchaseDocumentPickerUrl({ query: "P", supplierId: null, initialSupplierId: "s1" }), "/api/purchase-documents/search")
  assert.equal(buildPurchaseDocumentPickerUrl({ query: "", supplierId: "s1", initialSupplierId: "s1" }), null)
})

test("the view: the recent props without a request; an answer counts only for the URL it answers; a failure is kept as failed", () => {
  const recent = answer([row()], 1, 40)
  assert.deepEqual(getPurchaseDocumentPickerView({ requestKey: null, result: null, recent }), { state: "rows", answer: recent, searched: false })
  assert.deepEqual(getPurchaseDocumentPickerView({ requestKey: "/a?q=PO", result: null, recent }), { state: "loading" })
  assert.deepEqual(getPurchaseDocumentPickerView({ requestKey: "/a?q=PO", result: { key: "/a?q=P0", answer: recent }, recent }), { state: "loading" })
  assert.deepEqual(getPurchaseDocumentPickerView({ requestKey: "/a?q=PO", result: { key: "/a?q=PO", answer: null }, recent }), { state: "error" })
  const found = answer([], 0, 40)
  assert.deepEqual(getPurchaseDocumentPickerView({ requestKey: "/a?q=PO", result: { key: "/a?q=PO", answer: found }, recent }), { state: "rows", answer: found, searched: true })
  // A supplier-only list is not a search: an empty one reads "no documents yet", not "no match".
  assert.deepEqual(getPurchaseDocumentPickerView({ requestKey: "/a?supplierId=s2", result: { key: "/a?supplierId=s2", answer: found }, recent }), { state: "rows", answer: found, searched: false })
})

test("chosen means chosen and not marked for removal; a removed one can be chosen again", () => {
  const chosen = [row({ id: "d1" }), row({ id: "d2" })]
  assert.equal(isPurchaseDocumentChosen("d1", chosen), true)
  assert.equal(isPurchaseDocumentChosen("d3", chosen), false)
  assert.equal(isPurchaseDocumentChosen("d2", chosen, new Set(["d2"])), false)
})

test("the result line with 8 linked and 3 names: ผูกกับ 8 เครื่อง: <3 names>; none linked has no names", () => {
  assert.deepEqual(getPurchaseDocumentLinkedLine(row({ linkedAssetCount: 8, linkedAssetNames: ["Dell Latitude 7440", "Dell Latitude 7450", "HP ProBook 440"] })), {
    count: 8,
    names: "Dell Latitude 7440, Dell Latitude 7450, HP ProBook 440",
  })
  assert.deepEqual(getPurchaseDocumentLinkedLine(row()), { count: 0, names: null })
})

test("the amount: the Decimal string as a number for the money formatter; none stays null", () => {
  assert.equal(parsePurchaseDocumentAmount("15000.5"), 15000.5)
  assert.equal(parsePurchaseDocumentAmount("0"), 0)
  assert.equal(parsePurchaseDocumentAmount(null), null)
  assert.equal(parsePurchaseDocumentAmount("abc"), null)
})

test("a result: type and number, the supplier's name first (not the code), date, amount, linked line, chosen", () => {
  const view = getPurchaseDocumentResultView(row({ linkedAssetCount: 8, linkedAssetNames: ["A", "B", "C"] }), [row()])
  assert.deepEqual(view, {
    typeKey: "purchase_order",
    documentNo: "PO-2569-0412",
    supplierName: "บริษัท ไอที ซัพพลาย",
    documentDate: "2026-10-01T00:00:00.000Z",
    amount: 15000.5,
    linked: { count: 8, names: "A, B, C" },
    chosen: true,
    selectable: false,
  })
  const free = getPurchaseDocumentResultView(row({ id: "d9", supplier: null, documentDate: null, totalAmount: null }), [row()])
  assert.equal(free.supplierName, null)
  assert.equal(free.amount, null)
  assert.equal(free.chosen, false)
  assert.equal(free.selectable, true)
})

test("a chip: type, number, supplier name, linked count; inactive marked (P3-R7); removed marked (P3-R5)", () => {
  assert.deepEqual(getPurchaseDocumentChipView(row({ linkedAssetCount: 12 })), {
    typeKey: "purchase_order",
    documentNo: "PO-2569-0412",
    supplierName: "บริษัท ไอที ซัพพลาย",
    linkedCount: 12,
    inactive: false,
    removed: false,
  })
  const chip = getPurchaseDocumentChipView(row({ isActive: false, supplier: null }), new Set(["d1"]))
  assert.equal(chip.inactive, true)
  assert.equal(chip.removed, true)
  assert.equal(chip.supplierName, null)
})

test("the summary for two chosen documents: ใบ PO … · ใบกำกับ …; more than 3 adds +n", () => {
  const label = (type: string) => ({ purchase_order: "ใบ PO", invoice: "ใบกำกับ", delivery_note: "ใบส่งของ" })[type] ?? type
  const two = [row({ documentNo: "PO-2569-0031" }), row({ id: "d2", documentType: "invoice", documentNo: "INV-6901-0107" })]
  assert.equal(buildPurchaseDocumentRefsSummary(two, label), "ใบ PO PO-2569-0031 · ใบกำกับ INV-6901-0107")
  const five = [...two, row({ id: "d3", documentType: "delivery_note", documentNo: "DN-1" }), row({ id: "d4", documentNo: "PO-2" }), row({ id: "d5", documentNo: "PO-3" })]
  assert.equal(buildPurchaseDocumentRefsSummary(five, label), "ใบ PO PO-2569-0031 · ใบกำกับ INV-6901-0107 · ใบส่งของ DN-1 +2")
  assert.equal(buildPurchaseDocumentRefsSummary([], label), "")
})

test("the badge: create counts the chosen and the drafts (เลือกแล้ว n ใบ); edit counts the linked kept, inactive included (ผูกไว้ n ใบ, P3-R7)", () => {
  const chosen = [row({ id: "d1" }), row({ id: "d2", isActive: false }), row({ id: "d3" })]
  assert.deepEqual(countPurchaseDocumentBadge({ mode: "create", chosen, drafts: 2 }), { key: "documentsSelected", count: 5 })
  assert.deepEqual(countPurchaseDocumentBadge({ mode: "edit", chosen, removedIds: new Set(["d3"]), drafts: 1 }), { key: "documentsLinked", count: 2 })
  assert.equal(countPurchaseDocumentBadge({ mode: "create", chosen: [], drafts: 0 }), null)
  assert.equal(countPurchaseDocumentBadge({ mode: "edit", chosen: [row()], removedIds: new Set(["d1"]), drafts: 0 }), null)
})
