import assert from "node:assert/strict"
import test from "node:test"
import {
  assetOperationNoHolderGroupKey,
  assetOperationPickerDebounceMs,
  buildAssetOperationSearchUrl,
  buildAssetOperationSections,
  getAssetOperationCountLine,
  getAssetOperationPickerState,
  getAssetOperationRowDetail,
  getAssetOperationRowView,
  moveAssetOperationActive,
  resolveAssetOperationActive,
} from "../src/lib/asset-operation-picker-rules.ts"
import { assetOperationSearchMinChars, type AssetOperationSearchAnswer, type AssetOperationSearchRow } from "../src/lib/asset-operation-search-rules.ts"

// Server search Task 4 (spec 6.1, 6.3, Review Focus 3): what the shared picker shows, as plain data.
const row = (over: Partial<AssetOperationSearchRow> = {}): AssetOperationSearchRow => ({
  id: "a1", assetTag: "SNI-EQU-25-0228", name: "โน้ตบุ๊ก Dell Latitude 5440", statusLabel: "พร้อมใช้งาน",
  placeLabel: "IT-02 - ห้อง IT ชั้น 2", serialNumber: null, currentLocationId: "loc-1", conditionId: "cond-1", eligible: true, reasonKey: null, ...over,
})
const answer = (rows: AssetOperationSearchRow[], over: Partial<AssetOperationSearchAnswer> = {}): AssetOperationSearchAnswer =>
  ({ mode: "checkout", total: rows.length, rows, ...over })
const BASE = "/api/asset-operations/search?"

test("the picker asks after 2 characters and a 250 ms pause (spec 6.1)", () => {
  assert.equal(assetOperationSearchMinChars, 2)   // Task 3's rule, used through isAssetOperationSearchReady
  assert.equal(assetOperationPickerDebounceMs, 250)
})

test("the search URL: the trimmed text, or the id with no 2-character rule, then the page's context (spec 6.2)", () => {
  assert.equal(buildAssetOperationSearchUrl({ mode: "checkout", q: " 0228 " }), `${BASE}mode=checkout&q=0228`)
  assert.equal(buildAssetOperationSearchUrl({ mode: "checkout", q: " 0 " }), null)
  assert.equal(buildAssetOperationSearchUrl({ mode: "checkout" }), null)
  assert.equal(buildAssetOperationSearchUrl({ mode: "checkin", q: "สมชาย" }), BASE + new URLSearchParams({ mode: "checkin", q: "สมชาย" }).toString())
  assert.equal(buildAssetOperationSearchUrl({ mode: "checkin", id: "a1", q: "x" }), `${BASE}mode=checkin&id=a1`)
  assert.equal(buildAssetOperationSearchUrl({ mode: "transfer", q: "NB", context: { assignCustodian: true } }), `${BASE}mode=transfer&q=NB&assignCustodian=1`)
  assert.equal(buildAssetOperationSearchUrl({ mode: "transfer", q: "NB", context: { assignCustodian: false } }), `${BASE}mode=transfer&q=NB`)
  assert.equal(buildAssetOperationSearchUrl({ mode: "checkoutParent", q: "NB", context: { handedOverAssetId: "a9" } }), `${BASE}mode=checkoutParent&q=NB&handedOverAssetId=a9`)
  assert.equal(buildAssetOperationSearchUrl({ mode: "checkoutParent", q: "NB", context: { handedOverAssetId: null } }), `${BASE}mode=checkoutParent&q=NB`)
  assert.equal(buildAssetOperationSearchUrl({ mode: "bulkMove", q: "NB" }), `${BASE}mode=bulkMove&q=NB`)
})

test("the state: the hint under 2 characters, searching until the answer for this very text, then failed, nothing found or rows (spec 6.1, Review Focus 3 and 5)", () => {
  const key = buildAssetOperationSearchUrl({ mode: "checkout", q: "0228" })!
  const older = buildAssetOperationSearchUrl({ mode: "checkout", q: "02" })!
  const rows = answer([row()])
  assert.equal(getAssetOperationPickerState({ query: "", requestKey: null, result: null }), "hint")
  assert.equal(getAssetOperationPickerState({ query: " 0 ", requestKey: null, result: { key: older, answer: rows } }), "hint")
  assert.equal(getAssetOperationPickerState({ query: "0228", requestKey: key, result: null }), "loading")
  assert.equal(getAssetOperationPickerState({ query: "0228", requestKey: key, result: { key: older, answer: rows } }), "loading", "the answer to 02 never shows for 0228")
  assert.equal(getAssetOperationPickerState({ query: "0228", requestKey: key, result: { key, answer: null } }), "error", "a failure is never 'nothing found'")
  assert.equal(getAssetOperationPickerState({ query: "0228", requestKey: key, result: { key, answer: answer([]) } }), "empty")
  assert.equal(getAssetOperationPickerState({ query: "0228", requestKey: key, result: { key, answer: rows } }), "results")
})

test("the count line: the true total, and 'type more' when the server cut it at 20 (spec 6.1)", () => {
  assert.deepEqual(getAssetOperationCountLine(answer([row(), row({ id: "a2" })])), { count: 2, shown: 2, more: false })
  assert.deepEqual(getAssetOperationCountLine({ total: 134, rows: Array.from({ length: 20 }, (_, i) => row({ id: `a${i}` })) }), { count: 134, shown: 20, more: true })
})

test("a row: takeable, chosen already, or not takeable with its reason key; chosen wins (spec 6.1)", () => {
  const none = new Set<string>()
  assert.deepEqual(getAssetOperationRowView(row(), none), { selectable: true, note: null })
  assert.deepEqual(getAssetOperationRowView(row(), new Set(["a1"])), { selectable: false, note: { kind: "chosen" } })
  assert.deepEqual(getAssetOperationRowView(row({ eligible: false, reasonKey: "asset.transactionReasonStatusNotReady" }), none), { selectable: false, note: { kind: "reason", key: "asset.transactionReasonStatusNotReady" } })
  assert.deepEqual(getAssetOperationRowView(row({ eligible: false, reasonKey: "asset.transactionReasonOpenCheckoutHandover" }), new Set(["a1"])), { selectable: false, note: { kind: "chosen" } })
  assert.deepEqual(getAssetOperationRowView(row({ eligible: false, reasonKey: null }), none), { selectable: false, note: null })
})

test("the second line: the handover document on รับคืน, ข้อมูลเก่า for a legacy row, else status and place (spec 6.1, 6.3)", () => {
  const checkout = { id: "c1", documentNo: "HO-2026-0151", checkoutType: "user", handoverMode: "permanent_assignment", checkoutDate: "2026-03-12T00:00:00.000Z", expectedReturnDate: null, conditionBefore: "cond-1", remark: null, destinationLabel: "EMP-0412 - สมชาย ใจดี" }
  assert.deepEqual(getAssetOperationRowDetail(row({ checkout })), { kind: "handover", documentNo: "HO-2026-0151", checkoutDate: "2026-03-12T00:00:00.000Z" })
  assert.deepEqual(getAssetOperationRowDetail(row({ legacy: true })), { kind: "legacy" })
  assert.deepEqual(getAssetOperationRowDetail(row()), { kind: "place", statusLabel: "พร้อมใช้งาน", placeLabel: "IT-02 - ห้อง IT ชั้น 2" })
  assert.deepEqual(getAssetOperationRowDetail(row({ checkout: { ...checkout, documentNo: null } })), { kind: "place", statusLabel: "พร้อมใช้งาน", placeLabel: "IT-02 - ห้อง IT ชั้น 2" }, "a handover without a number reads as an ordinary row (S-R22)")
})

test("sections: one flat section without groups; รับคืน follows the server's group order, drops empty groups, keeps a stray row last (spec 6.3, S-R4)", () => {
  const r1 = row({ id: "a1", holderKey: "u1" })
  const r2 = row({ id: "a2", holderKey: assetOperationNoHolderGroupKey })
  const r3 = row({ id: "a3", holderKey: "u1" })
  const r4 = row({ id: "a4", holderKey: "u9" })
  assert.equal(assetOperationNoHolderGroupKey, "none")
  assert.deepEqual(buildAssetOperationSections(answer([r1, r2])), [{ group: null, rows: [r1, r2] }])
  const groups = [
    { key: "u1", label: "EMP-0412 - สมชาย ใจดี", count: 2 },
    { key: "u2", label: "EMP-0588 - สมชาย รักงาน", count: 1 },
    { key: assetOperationNoHolderGroupKey, label: null, count: 1 },
  ]
  assert.deepEqual(buildAssetOperationSections(answer([r1, r2, r3, r4], { mode: "checkin", groups })), [
    { group: groups[0], rows: [r1, r3] },
    { group: groups[2], rows: [r2] },
    { group: null, rows: [r4] },
  ])
})

test("keys: the first row is active only when it can be taken; the arrows skip what cannot and wrap (spec 6.1)", () => {
  const options = [{ id: "a", selectable: false }, { id: "b", selectable: true }, { id: "c", selectable: false }, { id: "d", selectable: true }]
  assert.equal(resolveAssetOperationActive(options, null), -1, "Enter never takes a lower row when the exact match cannot be taken")
  assert.equal(resolveAssetOperationActive(options, "d"), 3)
  assert.equal(resolveAssetOperationActive(options, "c"), -1)
  assert.equal(resolveAssetOperationActive([{ id: "a", selectable: true }, { id: "b", selectable: true }], null), 0)
  assert.equal(resolveAssetOperationActive([{ id: "a", selectable: true }], "gone"), 0)
  assert.equal(moveAssetOperationActive(options, -1, 1), 1)
  assert.equal(moveAssetOperationActive(options, 1, 1), 3)
  assert.equal(moveAssetOperationActive(options, 3, 1), 1)
  assert.equal(moveAssetOperationActive(options, 1, -1), 3)
  assert.equal(moveAssetOperationActive(options, -1, -1), 3)
  assert.equal(moveAssetOperationActive([{ selectable: false }], -1, 1), -1)
  assert.equal(moveAssetOperationActive([], -1, 1), -1)
})
