import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import test from "node:test"
import { readBulkMoveBlocked } from "../src/lib/bulk-move-blocked.ts"
import {
  getBulkMovePageState, getBulkMoveResultParts, getBulkMoveReviewCounts, getBulkMoveRowLock, readBulkMoveSaveAnswer,
  refreshBulkMoveSelection, removeBulkMoveIds, setBulkMovePage, toggleBulkMoveRow, type BulkMoveSelection,
} from "../src/lib/bulk-move-form-rules.ts"
import { bulkMoveMaxAssets, type BulkMoveListRow, type BulkMoveRoomOption } from "../src/lib/bulk-move-list-rules.ts"

// ย้ายที่ตั้งหลายรายการ's pure form rules (group 3 plan 4 Task 5, spec §10.1-§10.2): a selection of row snapshots keyed
// by asset id, kept across pages and filters in the order rows were ticked, at most bulkMoveMaxAssets.
const row = (id: string, overrides: Partial<BulkMoveListRow> = {}): BulkMoveListRow => ({
  id, assetTag: id.toUpperCase(), name: `เครื่อง ${id}`, categoryLabel: "NB - Notebook", statusName: "Ready", statusLabel: "พร้อมใช้งาน",
  locationId: "loc-a", locationLabel: "A-01 - ห้อง A", holderLabel: null, branchId: "b-hq", eligible: true, reasonKey: null,
  travellingComponents: [], componentOf: null, ...overrides,
})
const refusedRow = (id: string, reasonKey = "asset.transactionReasonLicenseMove") => row(id, { eligible: false, reasonKey })
const room: BulkMoveRoomOption = { id: "loc-room", label: "HQ-09 - คลัง IT", branchId: "b-hq" }
const empty: BulkMoveSelection = new Map()
const tick = (selection: BulkMoveSelection, ...rows: BulkMoveListRow[]) =>
  rows.reduce((current, next) => toggleBulkMoveRow(current, next, true).selection, selection)
const ids = (selection: BulkMoveSelection) => [...selection.keys()]
const many = (prefix: string, count: number) => Array.from({ length: count }, (_, i) => row(`${prefix}${String(i).padStart(3, "0")}`))

test("a tick adds the row's snapshot last, an untick drops it, a refused row is never ticked, and no change returns the same selection (group 3 spec §10.1; P4-R9, P4-R10)", () => {
  const a = row("a"), b = row("b"), c = row("c")
  const one = toggleBulkMoveRow(empty, a, true)
  assert.equal(one.capped, false)
  assert.equal(one.selection.get("a"), a, "the snapshot is the row itself")
  const three = tick(one.selection, c, b)
  assert.deepEqual(ids(three), ["a", "c", "b"], "the order the rows were ticked")
  assert.equal(empty.size, 0, "the input is never changed")
  const dropped = toggleBulkMoveRow(three, c, false)
  assert.deepEqual(ids(dropped.selection), ["a", "b"])
  assert.equal(dropped.capped, false)
  assert.deepEqual(ids(three), ["a", "c", "b"], "the input is never changed")
  assert.equal(toggleBulkMoveRow(three, a, true).selection, three, "already ticked")
  assert.equal(toggleBulkMoveRow(three, row("z"), false).selection, three, "not ticked")
  const refused = toggleBulkMoveRow(three, refusedRow("lic"), true)
  assert.equal(refused.selection, three, "a refused row is never ticked")
  assert.equal(refused.capped, false)
})

test("a fetched page refreshes the snapshot of each ticked row in its place; a ticked row that comes back refused stays ticked with its box enabled (group 3 spec §10.1; P4-R9)", () => {
  const a = row("a"), b = row("b"), c = row("c")
  const selection = tick(empty, a, b, c)
  const freshB = row("b", { eligible: false, reasonKey: "asset.transactionReasonOpenCheckoutBulkMove", holderLabel: "E001 - สมชาย ใจดี" })
  const refreshed = refreshBulkMoveSelection(selection, [row("x"), freshB])
  assert.deepEqual(ids(refreshed), ["a", "b", "c"], "still ticked, in its place; an unticked row is not ticked")
  assert.equal(refreshed.get("b"), freshB)
  assert.equal(refreshed.get("a"), a, "a row off this page keeps its snapshot")
  assert.equal(selection.get("b"), b, "the input is never changed")
  assert.equal(getBulkMoveRowLock(refreshed, freshB), null, "its box stays enabled so it can be unticked")
  assert.equal(getBulkMoveRowLock(empty, freshB), "blocked", "unticked, the same row is locked with its reason")
  assert.deepEqual(ids(toggleBulkMoveRow(refreshed, freshB, false).selection), ["a", "c"])
  assert.equal(getBulkMoveReviewCounts(refreshed, room).tags.length, 3, "the save names it; the review still lists it")
  assert.equal(refreshBulkMoveSelection(selection, [row("x"), row("y")]), selection, "a page with no ticked row changes nothing")
})

test("ticks on page 1 under one filter and page 2 under another both stay; each header shows only its own page (group 3 spec §10.1; Review Focus 2)", () => {
  const page1 = [row("p1-a"), row("p1-b"), refusedRow("p1-lic")]
  const page2 = [row("p2-a", { locationId: "loc-b" }), row("p2-b", { locationId: "loc-b" })]
  assert.equal(getBulkMovePageState(empty, page1), "none")
  const both = tick(empty, page1[0], page2[1])
  assert.equal(both.size, 2)
  assert.deepEqual(getBulkMoveReviewCounts(both, room).tags, ["P1-A", "P2-B"])
  assert.equal(getBulkMovePageState(both, page1), "some")
  assert.equal(getBulkMovePageState(both, page2), "some")
  assert.equal(getBulkMovePageState(both, [row("p3-a")]), "none")
  const page1All = setBulkMovePage(both, page1, true)
  assert.equal(page1All.capped, false)
  assert.deepEqual(ids(page1All.selection), ["p1-a", "p2-b", "p1-b"], "only the rows that can move, in page order")
  assert.equal(getBulkMovePageState(page1All.selection, page1), "all", "the refused row does not hold the header back")
  assert.equal(getBulkMovePageState(page1All.selection, page2), "some")
  assert.equal(setBulkMovePage(page1All.selection, page1, true).selection, page1All.selection, "nothing left to tick")
  const page1None = setBulkMovePage(page1All.selection, page1, false)
  assert.deepEqual(ids(page1None.selection), ["p2-b"], "unticking a page leaves the other page's tick")
  assert.equal(getBulkMovePageState(page1None.selection, page1), "none")
  assert.deepEqual(page1.map((r) => getBulkMoveRowLock(page1None.selection, r)), [null, null, "blocked"])
  // A page whose only ticked row came back refused (P4-R9): nothing more can be ticked, and unticking the page drops it.
  const staleOnly = refreshBulkMoveSelection(tick(empty, row("s")), [refusedRow("s", "asset.transactionReasonWrittenOff")])
  assert.equal(getBulkMovePageState(staleOnly, [refusedRow("s", "asset.transactionReasonWrittenOff")]), "all")
  assert.equal(setBulkMovePage(staleOnly, [refusedRow("s")], false).selection.size, 0)
  assert.equal(getBulkMovePageState(empty, [refusedRow("r1"), refusedRow("r2")]), "none")
})

test("the selection stops at bulkMoveMaxAssets: เลือกทั้งหมดในหน้านี้ with 90 ticked adds 10 in page order, the rest lock with the cap, and the 101st tick changes nothing (group 3 spec §10.1; P4-R10, Review Focus 4)", () => {
  assert.equal(bulkMoveMaxAssets, 100)
  const ninety = tick(empty, ...many("t", 90))
  assert.equal(ninety.size, 90)
  const page = many("p", 25)
  const all = setBulkMovePage(ninety, page, true)
  assert.equal(all.capped, true)
  assert.equal(all.selection.size, 100)
  assert.deepEqual(ids(all.selection).slice(90), page.slice(0, 10).map((r) => r.id))
  assert.deepEqual(page.map((r) => getBulkMoveRowLock(all.selection, r)), [...Array(10).fill(null), ...Array(15).fill("cap")])
  assert.equal(getBulkMovePageState(all.selection, page), "all", "nothing more on the page can be ticked")
  const extra = toggleBulkMoveRow(all.selection, page[10], true)
  assert.equal(extra.capped, true)
  assert.equal(extra.selection, all.selection, "the 101st tick changes nothing")
  assert.equal(getBulkMoveRowLock(all.selection, refusedRow("lic")), "blocked", "a refused row keeps its own reason past the cap")
  assert.equal(toggleBulkMoveRow(all.selection, refusedRow("lic"), true).capped, false, "refused, not capped")
  const ninetyNine = toggleBulkMoveRow(all.selection, page[0], false).selection
  assert.equal(ninetyNine.size, 99)
  assert.equal(getBulkMoveRowLock(ninetyNine, page[10]), null, "below the cap the boxes come back")
  assert.equal(getBulkMovePageState(ninetyNine, page), "some")
  // Exactly to the cap is not capped; refused rows take no place under it.
  const exact = setBulkMovePage(tick(empty, ...many("t", 75)), [...page.slice(0, 5), refusedRow("lic"), ...page.slice(5)], true)
  assert.equal(exact.selection.size, 100)
  assert.equal(exact.capped, false)
  // A full selection and a page with none of it: the header ticks nothing and reports the cap.
  const other = [row("q1"), row("q2")]
  assert.equal(getBulkMovePageState(all.selection, other), "none")
  const refusedPage = setBulkMovePage(all.selection, other, true)
  assert.equal(refusedPage.selection, all.selection)
  assert.equal(refusedPage.capped, true)
  assert.deepEqual(other.map((r) => getBulkMoveRowLock(all.selection, r)), ["cap", "cap"])
})

test("the review's ส่วนควบย้ายตาม counts neither a ticked component nor one already in the room, and counts each component once (group 3 spec §10.2; P4-R2, P4-R3, Review Focus 1)", () => {
  const parent = row("p", { assetTag: "NB-P", travellingComponents: [
    { id: "c1", currentLocationId: "loc-a" }, { id: "c2", currentLocationId: "loc-room" }, { id: "c3", currentLocationId: "loc-a" },
  ] })
  const c1 = row("c1", { assetTag: "RAM-1", componentOf: { parentId: "p", parentTag: "NB-P" } })
  assert.deepEqual(getBulkMoveReviewCounts(tick(empty, parent, c1), room),
    { assets: 2, tags: ["NB-P", "RAM-1"], componentsFollow: 1, alreadyThere: 0, otherBranch: 0, componentsAlone: 0 })
  const bare = row("p", { assetTag: "NB-P", travellingComponents: parent.travellingComponents.slice(0, 2) })
  assert.equal(getBulkMoveReviewCounts(tick(empty, bare, c1), room).componentsFollow, 0, "C1 is ticked, C2 is already there")
  // Two ticked rows naming one component id (a stale snapshot) count it once; a component with no room counts.
  const twice = tick(empty, row("x", { travellingComponents: [{ id: "k", currentLocationId: "loc-a" }] }),
    row("y", { travellingComponents: [{ id: "k", currentLocationId: "loc-b" }, { id: "n", currentLocationId: null }] }))
  assert.equal(getBulkMoveReviewCounts(twice, room).componentsFollow, 2)
})

test("an asset already in the room counts once as อยู่ที่ตั้งนี้แล้ว and moves nothing: no components, no other-branch line, no ส่วนควบที่เลือกเอง (group 3 spec §10.2; P4-R15, P4-R17)", () => {
  const there = row("t", { locationId: "loc-room", branchId: "b-bn", travellingComponents: [{ id: "tc", currentLocationId: "loc-a" }] })
  const thereComponent = row("tcx", { locationId: "loc-room", componentOf: { parentId: "far", parentTag: "NB-FAR" } })
  const moving = row("m", { travellingComponents: [{ id: "mc", currentLocationId: "loc-b" }] })
  assert.deepEqual(getBulkMoveReviewCounts(tick(empty, there, thereComponent, moving), room),
    { assets: 3, tags: ["T", "TCX", "M"], componentsFollow: 1, alreadyThere: 2, otherBranch: 0, componentsAlone: 0 })
  assert.deepEqual(getBulkMoveReviewCounts(empty, room),
    { assets: 0, tags: [], componentsFollow: 0, alreadyThere: 0, otherBranch: 0, componentsAlone: 0 })
})

test("the review counts rows moving to another branch by branchId and installed ส่วนควบ ticked without their parent (group 3 spec §10.2, call 19; P4-R1, P4-R17)", () => {
  const bnRoom: BulkMoveRoomOption = { id: "loc-bn", label: "BN-01 - ชั้น 2 ฝ่ายขาย", branchId: "b-bn" }
  const hq = row("h1")
  const bn = row("bn", { branchId: "b-bn", locationId: "loc-b" })
  const alone = row("ram", { assetTag: "RAM-9", componentOf: { parentId: "nb-9", parentTag: "NB-9" } })
  const withParent = row("ssd", { componentOf: { parentId: "h1", parentTag: "H1" } })
  const selection = tick(empty, hq, bn, alone, withParent)
  assert.deepEqual(getBulkMoveReviewCounts(selection, bnRoom),
    { assets: 4, tags: ["H1", "BN", "RAM-9", "SSD"], componentsFollow: 0, alreadyThere: 0, otherBranch: 3, componentsAlone: 1 })
  assert.equal(getBulkMoveReviewCounts(selection, room).otherBranch, 1, "only BN is of another branch than HQ-09")
  const parentOnOtherPage = tick(selection, row("nb-9"))
  assert.equal(getBulkMoveReviewCounts(parentOnOtherPage, room).componentsAlone, 0, "its parent is ticked, on whatever page")
})

test("the refused list's นำรายการที่ย้ายไม่ได้ออก unticks every named id, wherever its row is (group 3 spec §10.2; P4-R8)", () => {
  const selection = tick(empty, row("a"), row("b"), row("c"), row("d"))
  assert.deepEqual(ids(removeBulkMoveIds(selection, ["d", "b", "zz"])), ["a", "c"])
  assert.equal(removeBulkMoveIds(selection, []), selection)
  assert.equal(removeBulkMoveIds(selection, ["zz"]), selection)
  assert.equal(selection.size, 4, "the input is never changed")
  const blocked = readBulkMoveBlocked({ code: "ASSET_LICENSE_MOVE_NOT_ALLOWED", error: "ASSET_LICENSE_MOVE_NOT_ALLOWED", blocked: [
    { assetId: "a", assetTag: "A", code: "ASSET_LICENSE_MOVE_NOT_ALLOWED" }, { assetId: "c", assetTag: "C", code: "ASSET_ACTIVE_CHECKOUT_EXISTS" },
  ] })
  assert.deepEqual(ids(removeBulkMoveIds(selection, blocked.map((asset) => asset.assetId))), ["b", "d"])
})

test("the save's answer is read only with its six counts, and the result line takes M from componentSync.updated (group 3 spec §10.2; P4-R3, P4-R15, P4-R18, Review Focus 1)", () => {
  const answer = { updated: 3, unchanged: 1, componentSync: { updated: 2, skipped: 1, movements: 2 } }
  assert.deepEqual(readBulkMoveSaveAnswer(answer), answer)
  assert.deepEqual(readBulkMoveSaveAnswer({ ...answer, extra: "x", componentSync: { ...answer.componentSync, componentSnapshots: [] } }), answer)
  for (const payload of [
    null, undefined, "x", [], {}, { code: "ASSET_CHANGED_DURING_OPERATION", error: "x" },
    { updated: 2, componentSync: { updated: 0, skipped: 0, movements: 0 } },
    { ...answer, updated: "3" }, { ...answer, unchanged: -1 }, { ...answer, updated: 1.5 }, { ...answer, componentSync: null },
    { ...answer, componentSync: { updated: 2, skipped: 1 } },
  ]) assert.equal(readBulkMoveSaveAnswer(payload), null, String(JSON.stringify(payload)))
  assert.deepEqual(getBulkMoveResultParts(answer), { moved: 3, components: 2, unchanged: 1 })
  // Review Focus 1 saved: the parent and its ticked component move on their own claims; the one already there is not counted.
  assert.deepEqual(getBulkMoveResultParts({ updated: 2, unchanged: 0, componentSync: { updated: 0, skipped: 0, movements: 0 } }),
    { moved: 2, components: 0, unchanged: 0 })
})

test("one rule, one function: the form rules read the cap from bulk-move-list-rules.ts, stay pure and take no device or network (group 3 plan 4 Global Constraints; P4-R10)", () => {
  const source = readFileSync("src/lib/bulk-move-form-rules.ts", "utf8")
  assert.doesNotMatch(source, /from "@\/|@prisma\/client"|\bprisma\./)
  for (const [, path] of source.matchAll(/from "([^"]+)"/g)) assert.match(path, /^\.\/[\w-]+\.ts$/, path)
  assert.match(source, /import \{[^}]*\bbulkMoveMaxAssets\b[^}]*\} from "\.\/bulk-move-list-rules\.ts"/)
  assert.doesNotMatch(source, /\b100\b/, "the cap is bulkMoveMaxAssets, never a literal")
  assert.doesNotMatch(source, /isDesktop|matchMedia|\bwindow\.\w|\bdocument\.\w|\bfetch\(/)
})
