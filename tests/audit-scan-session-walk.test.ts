import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import test from "node:test"

import {
  auditScanListScope,
  auditScanSearchPageSize,
  buildRoomList,
  buildRoomOptions,
  countAuditScanPendingForLink,
  findAuditScanItemByCodes,
  findAuditScanOwnItem,
  foldAuditScanCategoryChips,
  getAuditItemBadge,
  listAuditScanRecordedOutOfScope,
  resolveAuditScanCategory,
  searchAuditItems,
  selectAuditRoomProgress,
  summarizeProgress,
  type AuditScanItemRow,
} from "../src/lib/audit-scan-session.ts"

const read = (path: string) => readFileSync(path, "utf8").replace(/\r\n/g, "\n")

function row(overrides: Partial<AuditScanItemRow> & Pick<AuditScanItemRow, "itemId" | "assetTag">): AuditScanItemRow {
  return {
    assetId: `asset-${overrides.itemId}`,
    name: "",
    serialNumber: null,
    fixedAssetCode: null,
    categoryId: "cat-pc",
    ownershipType: "shared",
    expectedLocationId: "loc-a",
    expectedCustodianId: null,
    expectedDepartmentId: "dept-1",
    expectedConditionId: "cond-good",
    actualLocationId: null,
    actualCustodianId: null,
    actualDepartmentId: null,
    actualConditionId: null,
    auditStatus: "pending",
    auditResult: null,
    lastScanAt: null,
    scannedByName: null,
    currentLocationId: "loc-a",
    currentCustodianId: null,
    currentDepartmentId: "dept-1",
    componentCount: 0,
    ...overrides,
  }
}

// Room A: w1-w4 (+ the out-of-scope find x1). Room B: w5-w7. x2 is a find whose master room is not in the round.
const walk: AuditScanItemRow[] = [
  row({ itemId: "w1", assetTag: "T-001", serialNumber: "SN-001", name: "โน้ตบุ๊ก Dell Latitude" }),
  row({ itemId: "w2", assetTag: "T-002", serialNumber: "SN-002", name: "โน้ตบุ๊ก Dell Vostro", auditStatus: "scanned", auditResult: "found", lastScanAt: "2026-10-07T03:00:00.000Z" }),
  row({ itemId: "w3", assetTag: "T-003", serialNumber: "SN-003", name: "ตู้เอกสาร A", categoryId: "cat-cab", expectedDepartmentId: "dept-2" }),
  // The review route sets the status only, so a checked item can have no result: it reads ไม่ตรง (P2-R2).
  row({ itemId: "w4", assetTag: "T-004", serialNumber: "SN-004", name: "จอ Dell P2422H", categoryId: "cat-mon", auditStatus: "reviewed", auditResult: null, lastScanAt: "2026-10-07T04:00:00.000Z" }),
  row({ itemId: "w5", assetTag: "T-005", serialNumber: "SN-005", name: "โน้ตบุ๊ก HP ProBook", expectedLocationId: "loc-b" }),
  row({ itemId: "w6", assetTag: "T-006", serialNumber: "SN-006", name: "ตู้เอกสาร B", categoryId: "cat-cab", expectedLocationId: "loc-b", auditStatus: "scanned", auditResult: "wrong_department", lastScanAt: "2026-10-07T05:00:00.000Z" }),
  row({ itemId: "w7", assetTag: "T-007", serialNumber: "SN-007", name: "โน้ตบุ๊ก Asus", expectedLocationId: "loc-b", expectedDepartmentId: "dept-2", auditStatus: "reviewed", auditResult: "not_found", lastScanAt: "2026-10-07T06:00:00.000Z" }),
  // Out-of-scope finds (scan route :145-169): AuditItems of the round, never its own items (spec §5, P3-R1).
  row({ itemId: "x1", assetTag: "X-001", serialNumber: "SN-X1", name: "โน้ตบุ๊ก Lenovo", auditStatus: "reviewed", auditResult: "out_of_scope", lastScanAt: "2026-10-07T07:00:00.000Z" }),
  row({ itemId: "x2", assetTag: "X-002", serialNumber: "SN-X2", name: "จอ Samsung", categoryId: "cat-mon", expectedLocationId: "loc-c", expectedDepartmentId: "dept-2", auditStatus: "reviewed", auditResult: "out_of_scope", lastScanAt: "2026-10-07T08:00:00.000Z" }),
]
const locations = [{ id: "loc-a", label: "A01 - ห้อง IT" }, { id: "loc-b", label: "B01 - บัญชี" }, { id: "loc-c", label: "C01 - คลัง" }]
const departments = [{ id: "dept-1", label: "D01 - ไอที" }, { id: "dept-2", label: "D02 - บัญชี" }]
const locationLabels = new Map(locations.map((option) => [option.id, option.label]))
const names = new Map([["cat-pc", { code: "PC", name: "คอมพิวเตอร์" }], ["cat-mon", { code: "MO", name: "จอภาพ" }], ["cat-cab", { code: "CB", name: "ตู้เอกสาร" }]])
const noRoom = { locationId: "", departmentId: "" }
const roomA = { locationId: "loc-a", departmentId: "" }
const roomB = { locationId: "loc-b", departmentId: "" }
const ids = (rows: readonly AuditScanItemRow[]) => rows.map((item) => item.itemId)

test("the header counts the round's own items through the round page's fold: ไม่ตรง includes a checked item with no result (spec §5, P3-R1, P3-R2)", () => {
  // Own: w1-w7. Pending w1, w3, w5; found w2; not found w7; ไม่ตรง w6 (wrong_department) and w4 (checked, no result).
  assert.deepEqual(summarizeProgress(walk), { total: 7, checked: 4, mismatched: 2 })
  assert.deepEqual(summarizeProgress([]), { total: 0, checked: 0, mismatched: 0 })
  // The row badge agrees with the count.
  assert.equal(getAuditItemBadge(walk[3]), "mismatch")
  assert.equal(getAuditItemBadge(walk[1]), "found")
  assert.equal(getAuditItemBadge(walk[0]), null)
  assert.equal(getAuditItemBadge(walk[7]), "out_of_scope")
})

test("the room list and its tabs read own items; a category narrows the rows but not the tab counts (P3-R1, P3-R6)", () => {
  const pending = buildRoomList({ items: walk, room: roomA, tab: "pending", limit: 50, locationLabels })
  assert.deepEqual(ids(pending.rows), ["w1", "w3"])
  assert.deepEqual(pending.counts, { pending: 2, checked: 2, all: 4 }, "x1 is in neither checked nor all")

  const checked = buildRoomList({ items: walk, room: roomA, tab: "checked", limit: 50, locationLabels })
  assert.deepEqual(ids(checked.rows), ["w4", "w2"], "most recent first; the find saved at 07:00 is not listed")

  const cabinets = buildRoomList({ items: walk, room: roomA, tab: "pending", limit: 50, locationLabels, categoryId: "cat-cab" })
  assert.deepEqual(ids(cabinets.rows), ["w3"])
  assert.equal(cabinets.total, 1)
  assert.deepEqual(cabinets.counts, { pending: 2, checked: 2, all: 4 }, "the tabs count the room, as the chip row's ทุกหมวดหมู่ does")

  const computers = buildRoomList({ items: walk, room: roomA, tab: "all", limit: 50, locationLabels, categoryId: "cat-pc" })
  assert.deepEqual(ids(computers.rows), ["w1", "w2"])

  const round = buildRoomList({ items: walk, room: noRoom, tab: "all", limit: 50, locationLabels, categoryId: null })
  assert.deepEqual(ids(round.rows), ["w1", "w2", "w3", "w4", "w5", "w6", "w7"], "by place, then tag")
  assert.deepEqual(round.counts, { pending: 3, checked: 4, all: 7 })
})

test("room options count own items, each department with its pending; the room button follows the chosen department (bug 21, P3-R13)", () => {
  const rooms = buildRoomOptions(walk, locations, departments)
  assert.deepEqual(rooms.map((option) => [option.locationId, option.pending, option.total]), [["loc-a", 2, 4], ["loc-b", 1, 3]], "x1 leaves room A at 4; x2 adds no room C")
  assert.deepEqual(rooms[0].departments.map((entry) => [entry.departmentId, entry.label, entry.pending, entry.total]), [["dept-1", "D01 - ไอที", 1, 3], ["dept-2", "D02 - บัญชี", 1, 1]])
  assert.deepEqual(rooms[1].departments.map((entry) => [entry.departmentId, entry.pending, entry.total]), [["dept-1", 1, 2], ["dept-2", 0, 1]])

  assert.deepEqual(selectAuditRoomProgress(rooms, roomA), { checked: 2, total: 4, pending: 2 })
  assert.deepEqual(selectAuditRoomProgress(rooms, { locationId: "loc-a", departmentId: "dept-1" }), { checked: 2, total: 3, pending: 1 })
  assert.deepEqual(selectAuditRoomProgress(rooms, { locationId: "loc-b", departmentId: "dept-2" }), { checked: 1, total: 1, pending: 0 })
  assert.deepEqual(selectAuditRoomProgress(rooms, { locationId: "loc-a", departmentId: "dept-9" }), { checked: 0, total: 0, pending: 0 }, "a stored department with no items in the room: the list is empty too")
  assert.equal(selectAuditRoomProgress(rooms, noRoom), null)
  assert.equal(selectAuditRoomProgress(rooms, { locationId: "loc-c", departmentId: "" }), null)
})

test("the footer counts the room's pending own items, department ignored, as the pending list it opens (P3-R14); one scope picks the room or round wording (P3-R7)", () => {
  assert.equal(countAuditScanPendingForLink(walk, { locationId: "loc-a", departmentId: "dept-1" }), 2)
  assert.equal(countAuditScanPendingForLink(walk, roomB), 1)
  assert.equal(countAuditScanPendingForLink(walk, noRoom), 3)
  assert.equal(auditScanListScope(roomA), "room")
  assert.equal(auditScanListScope({ locationId: "loc-a", departmentId: "dept-1" }), "room")
  assert.equal(auditScanListScope(noRoom), "round")
})

test("search: own items only, the chosen room first, the true total split in room and other rooms, no cap (bug 20, P3-R5)", () => {
  const custodians = new Map<string, string>()
  const inB = searchAuditItems(walk, "โน้ตบุ๊ก", custodians, roomB)
  assert.deepEqual(inB.matches.map((match) => [match.item.itemId, match.elsewhere]), [["w5", false], ["w7", false], ["w1", true], ["w2", true]], "room B first, then the rest; pending first within each")
  assert.deepEqual({ total: inB.total, inRoom: inB.inRoom, otherRooms: inB.otherRooms }, { total: 4, inRoom: 2, otherRooms: 2 })

  const round = searchAuditItems(walk, "โน้ตบุ๊ก", custodians, noRoom)
  assert.deepEqual(round.matches.map((match) => [match.item.itemId, match.elsewhere]), [["w1", false], ["w5", false], ["w2", false], ["w7", false]])
  assert.deepEqual({ total: round.total, inRoom: round.inRoom, otherRooms: round.otherRooms }, { total: 4, inRoom: 0, otherRooms: 0 })

  // The room is the place: a chosen department does not push the room's other items to "ห้องอื่น".
  const department = searchAuditItems(walk, "โน้ตบุ๊ก", custodians, { locationId: "loc-a", departmentId: "dept-2" })
  assert.deepEqual(department.matches.map((match) => match.item.itemId), ["w1", "w2", "w5", "w7"])
  assert.equal(department.inRoom, 2)

  // A recorded out-of-scope find is not a round item: no local match, so Enter goes to the register lookup.
  assert.deepEqual(searchAuditItems(walk, "X-001", custodians, roomA), { matches: [], total: 0, inRoom: 0, otherRooms: 0 })
  assert.deepEqual(searchAuditItems(walk, "โ", custodians, roomA), { matches: [], total: 0, inRoom: 0, otherRooms: 0 })

  const many = Array.from({ length: 30 }, (_, index) => row({ itemId: `m${index}`, assetTag: `ROOM-${String(index).padStart(2, "0")}` }))
  const all = searchAuditItems(many, "ROOM", custodians, noRoom)
  assert.equal(all.total, 30)
  assert.equal(all.matches.length, 30, "the UI pages them, the rule never caps")
  assert.equal(auditScanSearchPageSize, 10)
})

test("search: an exact code comes first wherever its room is, then the chosen room's matches, then the other rooms' (P3-R17)", () => {
  const custodians = new Map<string, string>()
  const codes = [
    row({ itemId: "c1", assetTag: "ROOM-1", expectedLocationId: "loc-b" }),
    row({ itemId: "c10", assetTag: "ROOM-10" }),
    row({ itemId: "c11", assetTag: "ROOM-11", auditStatus: "scanned", auditResult: "found" }),
    row({ itemId: "c12", assetTag: "ROOM-12", expectedLocationId: "loc-b" }),
  ]
  // "room-1" is c1's whole tag (tier 0) in room B, and the start of the other three: Enter opens c1 from room A.
  const exact = searchAuditItems(codes, "room-1", custodians, roomA)
  assert.deepEqual(exact.matches.map((match) => [match.item.itemId, match.tier, match.elsewhere]), [["c1", 0, true], ["c10", 1, false], ["c11", 1, false], ["c12", 1, true]])
  assert.deepEqual({ total: exact.total, inRoom: exact.inRoom, otherRooms: exact.otherRooms }, { total: 4, inRoom: 2, otherRooms: 2 }, "the line still counts by room")
  // A whole serial typed for an item of another room opens it too.
  assert.deepEqual(searchAuditItems(walk, "sn-005", custodians, roomA).matches.map((match) => [match.item.itemId, match.field, match.tier]), [["w5", "serialNumber", 0]])
  // A whole fixed asset code is tier 0 too: it opens from room A ahead of room A's prefix match.
  assert.deepEqual(searchAuditItems([row({ itemId: "f1", assetTag: "T-900", fixedAssetCode: "FA-9", expectedLocationId: "loc-b" }), row({ itemId: "f2", assetTag: "FA-90" })], "fa-9", custodians, roomA).matches.map((match) => [match.item.itemId, match.tier]), [["f1", 0], ["f2", 1]])
})

test("category chips count within the room and tab, largest first then by name, hidden at one category or none (decision 3, P3-R6)", () => {
  const chips = (room: { locationId: string; departmentId: string }, tab: "pending" | "checked" | "all", categoryNames = names) =>
    foldAuditScanCategoryChips(walk, { room, tab, names: categoryNames })
  assert.deepEqual(chips(roomA, "pending"), [{ id: "cat-pc", count: 1 }, { id: "cat-cab", count: 1 }], "equal counts by name: คอมพิวเตอร์, ตู้เอกสาร")
  assert.deepEqual(chips(roomA, "checked"), [{ id: "cat-pc", count: 1 }, { id: "cat-mon", count: 1 }], "x1 (cat-pc) adds nothing")
  assert.deepEqual(chips(roomA, "all"), [{ id: "cat-pc", count: 2 }, { id: "cat-mon", count: 1 }, { id: "cat-cab", count: 1 }])
  assert.deepEqual(chips(roomB, "pending"), [], "one category: hidden")
  assert.deepEqual(chips(roomB, "checked"), [{ id: "cat-pc", count: 1 }, { id: "cat-cab", count: 1 }])
  assert.deepEqual(chips({ locationId: "loc-a", departmentId: "dept-1" }, "all"), [{ id: "cat-pc", count: 2 }, { id: "cat-mon", count: 1 }])
  assert.deepEqual(chips({ locationId: "loc-a", departmentId: "dept-1" }, "pending"), [])
  assert.deepEqual(chips(noRoom, "all"), [{ id: "cat-pc", count: 4 }, { id: "cat-cab", count: 2 }, { id: "cat-mon", count: 1 }], "x1 and x2 leave cat-pc at 4 and cat-mon at 1")
  // A category the page has no name for (a later poll) sorts after the named ones at an equal count.
  const withoutMonitor = new Map([...names].filter(([id]) => id !== "cat-mon"))
  assert.deepEqual(chips(roomA, "all", withoutMonitor), [{ id: "cat-pc", count: 2 }, { id: "cat-cab", count: 1 }, { id: "cat-mon", count: 1 }])

  // A chosen category that left the row (its last pending item saved, or another tab) no longer narrows the list.
  const pendingA = chips(roomA, "pending")
  assert.equal(resolveAuditScanCategory(pendingA, "cat-cab"), "cat-cab")
  assert.equal(resolveAuditScanCategory(pendingA, "cat-mon"), null)
  assert.equal(resolveAuditScanCategory([], "cat-pc"), null)
  assert.equal(resolveAuditScanCategory(pendingA, null), null)
})

test("a camera code, a component and a register pick open own items only (P3-R1, recon-walk §0.2 b)", () => {
  assert.equal(findAuditScanItemByCodes(walk, ["x-001"]), null, "the find goes to the register lookup")
  assert.equal(findAuditScanItemByCodes(walk, ["t-005"])?.itemId, "w5")
  assert.equal(findAuditScanItemByCodes(walk, ["T-002"])?.itemId, "w2")
  assert.equal(findAuditScanItemByCodes(walk, ["nothing", "sn-006"])?.itemId, "w6")
  assert.equal(findAuditScanItemByCodes(walk, ["asset-w7"])?.itemId, "w7")
  assert.equal(findAuditScanItemByCodes(walk, []), null)
  assert.equal(findAuditScanOwnItem(walk, "asset-x1"), null)
  assert.equal(findAuditScanOwnItem(walk, "asset-w3")?.itemId, "w3")
})

test("recorded out-of-scope finds are listed apart, where they were found, most recent first; no own item among them (P3-R25)", () => {
  assert.deepEqual(ids(listAuditScanRecordedOutOfScope(walk, { roomId: "loc-a" })), ["x1"], "x1 has no found place, so its snapshot's room A")
  assert.deepEqual(ids(listAuditScanRecordedOutOfScope(walk, { roomId: "loc-b" })), [])
  assert.deepEqual(ids(listAuditScanRecordedOutOfScope(walk, { roomId: "" })), ["x2", "x1"], "no room: the round's, the 08:00 find first")
  // Found in room B, its master room C: listed under room B, where the walker recorded it.
  const foundInB = row({ itemId: "x3", assetTag: "X-003", expectedLocationId: "loc-c", actualLocationId: "loc-b", auditStatus: "reviewed", auditResult: "out_of_scope", lastScanAt: "2026-10-07T09:00:00.000Z" })
  assert.deepEqual(ids(listAuditScanRecordedOutOfScope([...walk, foundInB], { roomId: "loc-b" })), ["x3"])
  assert.deepEqual(ids(listAuditScanRecordedOutOfScope([...walk, foundInB], { roomId: "loc-c" })), ["x2"])
  // The tabs still count own items only: the list is apart from them.
  assert.deepEqual(buildRoomList({ items: walk, room: roomA, tab: "checked", limit: 50, locationLabels }).counts, { pending: 2, checked: 2, all: 4 })
})

test("the session stays pure and reads the shared own-item rule and fold; the workspace matches through it (P3-R1)", () => {
  const session = read("src/lib/audit-scan-session.ts")
  assert.match(session, /^import \{ isAuditRoundOwnItem \} from "\.\/audit-round-counts-rules\.ts"$/m)
  assert.match(session, /^import \{ foldAuditRoundResultCounts \} from "\.\/audit-round-result-filters\.ts"$/m)
  assert.doesNotMatch(session, /from "@\/|auditScanSearchLimit|foundResults/)

  const workspace = read("src/components/audit/audit-scan-workspace.tsx")
  assert.match(workspace, /const search = useMemo\(\(\) => searchAuditItems\(items, term, custodianLabels, room\), \[items, term, custodianLabels, room\]\)/)
  assert.match(workspace, /const item = findAuditScanItemByCodes\(items, extractAssetLookupCandidatesFromScanValue\(text\)\)/)
  assert.match(workspace, /const item = findAuditScanOwnItem\(items, component\.assetId\)/)
  assert.match(workspace, /const item = match\.inRound \? findAuditScanOwnItem\(items, match\.assetId\) : null/)
  assert.doesNotMatch(workspace, /candidates\.has\(/)
})
