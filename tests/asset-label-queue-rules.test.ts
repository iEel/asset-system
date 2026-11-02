import assert from "node:assert/strict"
import test from "node:test"
import {
  LABEL_QUEUE_FIRST_PAGE,
  LABEL_QUEUE_MORE_STEP,
  addAllCounts,
  addAllNoteKey,
  appendQueueRows,
  buildLabelLookupSearch,
  buildLabelQueueSearch,
  defaultLabelQueueFilters,
  labelButtonKey,
  labelDuplicateNames,
  labelQueueOldTag,
  labelQueueRowHolder,
  labelRowNameKey,
  lookupMissingCount,
  mergeIntoPrintList,
  printListRoom,
  printListStatusKey,
} from "../src/lib/asset-label-queue-rules.ts"
import type { LabelQueueRow } from "../src/lib/asset-label-queue.ts"

// Group 4 plan 6 Task 4 (P6-R2, P6-R3, P6-R7, P6-R11, Review Focus 2): the labels page's add-all math, the 100 cap of the
// print list, the queue's paging and the row words, as pure rules.

const ids = (prefix: string, count: number, start = 0) => Array.from({ length: count }, (_, index) => `${prefix}-${start + index}`)
const rowsOf = (list: string[]) => list.map((id) => ({ id }))

function row(overrides: Partial<LabelQueueRow> = {}): LabelQueueRow {
  return {
    id: "a1",
    assetTag: "GRL-COM-26-0017",
    name: "Notebook Lenovo ThinkPad E14 Gen 5",
    ownershipType: "personal",
    holder: { code: "E001", name: "สมชาย ใจดี" },
    location: { code: "ACC-3", name: "ห้องบัญชี ชั้น 3" },
    company: { code: "GRL", name: "บริษัท" },
    branch: { code: "HQ", name: "สำนักงานใหญ่" },
    category: { code: "COM", name: "คอมพิวเตอร์" },
    lastPrint: null,
    ...overrides,
  }
}

test("Review Focus 2: the list holds 95, the filter matches 30 and 10 of them are listed: the button adds 5 and the line says the list is full", () => {
  const matchIds = ids("m", 30)
  const listed = [...matchIds.slice(0, 10), ...ids("other", 85)]
  assert.equal(listed.length, 95)
  const room = printListRoom(listed.length)
  assert.equal(room, 5)
  const counts = addAllCounts({ total: 30, matchIds, selectedIds: new Set(listed), room })
  assert.deepEqual(counts, { a: 30, b: 10, c: 5, capped: true, left: 0, addIds: matchIds.slice(10, 15) })
  assert.equal(labelButtonKey(counts), "addSome", "the button reads เพิ่ม 5 รายการ, the number that is added")
  assert.equal(addAllNoteKey(counts, room), "addAllRoom", "the line says the list will be full")
  // Adding them ends the list at 100, and the 21st of the matches is refused by the list itself.
  const merged = mergeIntoPrintList(rowsOf(listed), rowsOf(counts.addIds))
  assert.equal(merged.next.length, 100)
  assert.deepEqual({ added: merged.added, requested: merged.requested }, { added: 5, requested: 5 })
  assert.equal(printListRoom(merged.next.length), 0)
  assert.deepEqual(printListStatusKey(merged.next.length, merged), { key: "listFull" })
  const refused = mergeIntoPrintList(merged.next, rowsOf(matchIds.slice(15, 16)))
  assert.equal(refused.next.length, 100)
  assert.deepEqual(printListStatusKey(refused.next.length, refused), { key: "listRefused", values: { added: 0, requested: 1, max: 100 } })
})

test("P6-R3: the number on the button is always what will be added", () => {
  // Nothing listed: เพิ่มทั้งหมด {c}.
  const none = addAllCounts({ total: 18, matchIds: ids("m", 18), selectedIds: new Set(), room: 100 })
  assert.deepEqual(none, { a: 18, b: 0, c: 18, capped: false, left: 0, addIds: ids("m", 18) })
  assert.equal(labelButtonKey(none), "addAll")
  assert.equal(addAllNoteKey(none, 100), null)
  // The board's case: 18 match, 3 listed: เพิ่ม 15 รายการ, never "เพิ่มทั้งหมด 18".
  const some = addAllCounts({ total: 18, matchIds: ids("m", 18), selectedIds: new Set(["m-1", "m-4", "m-9", "x"]), room: 96 })
  assert.equal(some.b, 3)
  assert.equal(some.c, 15)
  assert.equal(some.addIds.includes("m-1"), false)
  assert.deepEqual(some.addIds.slice(0, 3), ["m-0", "m-2", "m-3"], "queue order is kept")
  assert.equal(labelButtonKey(some), "addSome")
  // More than 100 match: the first 100 ids, and how many are left.
  const many = addAllCounts({ total: 240, matchIds: ids("m", 100), selectedIds: new Set(), room: 100 })
  assert.deepEqual({ a: many.a, b: many.b, c: many.c, capped: many.capped, left: many.left }, { a: 240, b: 0, c: 100, capped: false, left: 140 })
  assert.equal(labelButtonKey(many), "addFirst100")
  // More than 100 match and some of the first 100 are listed: เพิ่ม {c}, not "100 รายการแรก".
  const manyListed = addAllCounts({ total: 240, matchIds: ids("m", 100), selectedIds: new Set(["m-0", "m-1"]), room: 98 })
  assert.deepEqual({ b: manyListed.b, c: manyListed.c, left: manyListed.left }, { b: 2, c: 98, left: 140 })
  assert.equal(labelButtonKey(manyListed), "addSome")
  // More than 100 match and the list's room cuts c.
  const manyCut = addAllCounts({ total: 240, matchIds: ids("m", 100), selectedIds: new Set(ids("x", 40)), room: 60 })
  assert.deepEqual({ c: manyCut.c, capped: manyCut.capped }, { c: 60, capped: true })
  assert.equal(labelButtonKey(manyCut), "addSome")
  assert.equal(addAllNoteKey(manyCut, 60), "addAllRoom")
})

test("P6-R3: nothing to add says why", () => {
  const empty = addAllCounts({ total: 0, matchIds: [], selectedIds: new Set(), room: 100 })
  assert.equal(empty.c, 0)
  assert.equal(addAllNoteKey(empty, 100), "queueEmpty")
  const allListed = addAllCounts({ total: 3, matchIds: ids("m", 3), selectedIds: new Set(ids("m", 3)), room: 97 })
  assert.deepEqual({ b: allListed.b, c: allListed.c, capped: allListed.capped }, { b: 3, c: 0, capped: false })
  assert.equal(addAllNoteKey(allListed, 97), "addAllNone")
  const full = addAllCounts({ total: 3, matchIds: ids("m", 3), selectedIds: new Set(ids("x", 100)), room: 0 })
  assert.deepEqual({ c: full.c, capped: full.capped }, { c: 0, capped: true })
  assert.equal(addAllNoteKey(full, 0), "listFull")
  // A negative room (a list that came in over the cap) counts as none.
  assert.equal(addAllCounts({ total: 3, matchIds: ids("m", 3), selectedIds: new Set(), room: -4 }).c, 0)
})

test("add-all counts the assets the lookup no longer returns (deactivated since the queue loaded)", () => {
  assert.equal(lookupMissingCount(["a", "b", "c"], rowsOf(["a", "c"])), 1)
  assert.equal(lookupMissingCount(["a", "b"], rowsOf(["b", "a"])), 0)
  assert.equal(lookupMissingCount(["a", "b"], []), 2)
  assert.equal(lookupMissingCount([], []), 0)
})

test("P6-R2: the print list refuses adds past 100 from every source, keeps its order and never adds a row twice", () => {
  assert.equal(printListRoom(0), 100)
  assert.equal(printListRoom(100), 0)
  assert.equal(printListRoom(130), 0)
  const start = rowsOf(ids("s", 98))
  const merged = mergeIntoPrintList(start, rowsOf(["s-3", "n-0", "n-0", "n-1", "n-2", "n-3"]))
  assert.deepEqual(merged.next.slice(-2).map((item) => item.id), ["n-0", "n-1"])
  assert.equal(merged.next.length, 100)
  assert.deepEqual({ added: merged.added, requested: merged.requested }, { added: 2, requested: 4 }, "the listed s-3 and the repeated n-0 are not requests")
  assert.deepEqual(printListStatusKey(merged.next.length, merged), { key: "listRefused", values: { added: 2, requested: 4, max: 100 } })
  // Below the cap nothing is said; a row that is already listed is no change.
  const small = mergeIntoPrintList(rowsOf(["a"]), rowsOf(["a", "b"]))
  assert.deepEqual(small.next.map((item) => item.id), ["a", "b"])
  assert.equal(printListStatusKey(small.next.length, small), null)
  assert.equal(printListStatusKey(3, null), null)
  assert.deepEqual(printListStatusKey(100, null), { key: "listFull" })
  // An incoming list over the cap keeps its first 100.
  const incoming = mergeIntoPrintList([], rowsOf(ids("i", 120)))
  assert.equal(incoming.next.length, 100)
  assert.equal(incoming.next.at(-1)?.id, "i-99")
})

test("P6-R7: the queue asks for 20 first, then 10 more at a time from where it is, and appends without duplicates", () => {
  assert.equal(LABEL_QUEUE_FIRST_PAGE, 20)
  assert.equal(LABEL_QUEUE_MORE_STEP, 10)
  const first = new URLSearchParams(buildLabelQueueSearch(defaultLabelQueueFilters, { pageSize: LABEL_QUEUE_FIRST_PAGE, skip: 0, locale: "th" }))
  assert.deepEqual(Object.fromEntries(first), { mode: "unprinted", sort: "created_desc", pageSize: "20", skip: "0", locale: "th" })
  const more = new URLSearchParams(buildLabelQueueSearch(
    { ...defaultLabelQueueFilters, mode: "reprint", sort: "asset_tag", companyId: "c1", branchId: "all", categoryId: "", locationId: "l1", createdFrom: "2026-01-01", createdTo: "" },
    { pageSize: LABEL_QUEUE_MORE_STEP, skip: 20, locale: "en" },
  ))
  assert.deepEqual(Object.fromEntries(more), { mode: "reprint", sort: "asset_tag", pageSize: "10", skip: "20", locale: "en", companyId: "c1", locationId: "l1", createdFrom: "2026-01-01" })
  assert.deepEqual(appendQueueRows(rowsOf(["a", "b"]), rowsOf(["b", "c", "c", "d"])).map((item) => item.id), ["a", "b", "c", "d"])
})

test("P6-R11: the lookup asks for the given ids in their order", () => {
  assert.equal(buildLabelLookupSearch(["x-2", "x-1"], "th"), "ids=x-2%2Cx-1&locale=th")
  assert.deepEqual(new URLSearchParams(buildLabelLookupSearch(["x-2", "x-1"], "en")).get("ids")?.split(","), ["x-2", "x-1"])
})

test("rows: holder or ส่วนกลาง, the old tag and the board's names", () => {
  assert.equal(labelQueueRowHolder(row(), "ส่วนกลาง"), "สมชาย ใจดี")
  assert.equal(labelQueueRowHolder(row({ ownershipType: "shared", holder: null }), "ส่วนกลาง"), "ส่วนกลาง")
  assert.equal(labelQueueRowHolder(row({ ownershipType: "shared" }), "ส่วนกลาง"), "ส่วนกลาง", "a shared asset reads ส่วนกลาง whoever looks after it")
  assert.equal(labelQueueRowHolder(row({ holder: null }), "ส่วนกลาง"), null)
  // ป้ายเดิม: the label still shows the tag printed, also after a change of case.
  assert.equal(labelQueueOldTag(row()), null)
  assert.equal(labelQueueOldTag(row({ lastPrint: { printedAt: "2026-10-01T00:00:00.000Z", assetTag: "GRL-COM-26-0017" } })), null)
  assert.equal(labelQueueOldTag(row({ lastPrint: { printedAt: "2026-10-01T00:00:00.000Z", assetTag: "GRL-COM-25-0001" } })), "GRL-COM-25-0001")
  assert.equal(labelQueueOldTag(row({ lastPrint: { printedAt: "2026-10-01T00:00:00.000Z", assetTag: "grl-com-26-0017" } })), "grl-com-26-0017")
  // The board names an add with the tag only where two rows share a name.
  const rows = [row({ id: "a", name: "Monitor Dell P2422H" }), row({ id: "b", name: "Monitor Dell P2422H", assetTag: "GRL-MON-25-0043" }), row({ id: "c", name: "HP ProDesk" })]
  const duplicates = labelDuplicateNames(rows)
  assert.deepEqual([...duplicates], ["Monitor Dell P2422H"])
  assert.deepEqual(labelRowNameKey(rows[1], { listed: false, duplicateNames: duplicates }), { key: "rowAddWithTag", values: { name: "Monitor Dell P2422H", tag: "GRL-MON-25-0043" } })
  assert.deepEqual(labelRowNameKey(rows[2], { listed: false, duplicateNames: duplicates }), { key: "rowAdd", values: { name: "HP ProDesk" } })
  assert.deepEqual(labelRowNameKey(rows[0], { listed: true, duplicateNames: duplicates }), { key: "rowListed", values: { name: "Monitor Dell P2422H" } })
})
