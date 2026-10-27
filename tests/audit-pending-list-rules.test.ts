import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import test from "node:test"

import {
  AUDIT_PENDING_ROOM_ALL,
  AUDIT_PENDING_ROOM_OTHER,
  AUDIT_PENDING_TOP_ROOMS,
  auditPendingBaseWhere,
  auditPendingIdMatchWhere,
  auditPendingRoomWhere,
  buildAuditPendingContinueScanHref,
  buildAuditPendingListWhere,
  buildAuditPendingSearchWhere,
  describeAuditPendingCustodian,
  describeAuditPendingPlace,
  foldAuditPendingRoomChips,
  labelAuditPendingRoomChips,
} from "../src/lib/audit-pending-list-rules.ts"

const read = (path: string) => readFileSync(path, "utf8").replace(/\r\n/g, "\n")
const room = (id: string, count: number) => ({ key: id, kind: "room" as const, locationId: id, count })
const all = (count: number) => ({ key: "all" as const, kind: "all" as const, count })
const other = (count: number) => ({ key: "other" as const, kind: "other" as const, count })

test("the pending list's where: the round's pending items, then the search and the room in one AND list (group 2 spec §9)", () => {
  assert.equal(AUDIT_PENDING_ROOM_ALL, "all")
  assert.equal(AUDIT_PENDING_ROOM_OTHER, "other")
  assert.equal(AUDIT_PENDING_TOP_ROOMS, 6)
  assert.deepEqual(auditPendingBaseWhere("r1"), { auditRoundId: "r1", auditStatus: "pending" })
  assert.equal(auditPendingRoomWhere("", ["l1"]), null)
  assert.deepEqual(auditPendingRoomWhere("l7", ["l1"]), { expectedLocationId: "l7" })
  // "อื่น ๆ" is a real filter: every room but the six shown (P2-R11).
  assert.deepEqual(auditPendingRoomWhere("other", ["l1", "l2"]), { expectedLocationId: { notIn: ["l1", "l2"] } })
  assert.deepEqual(buildAuditPendingListWhere({ roundId: "r1", search: null, room: null }), { AND: [{ auditRoundId: "r1", auditStatus: "pending" }] })
  const search = { OR: [{ asset: { assetTag: { contains: "PC" } } }] }
  assert.deepEqual(buildAuditPendingListWhere({ roundId: "r1", search, room: { expectedLocationId: "l1" } }), {
    AND: [{ auditRoundId: "r1", auditStatus: "pending" }, search, { expectedLocationId: "l1" }],
  })
})

test("a matched room or custodian goes into the where as the smaller list: the matched ids, or notIn the rest of the round's ids (P2-R10)", () => {
  assert.equal(auditPendingIdMatchWhere("expectedLocationId", ["a", "b", "c"], []), null)
  assert.deepEqual(auditPendingIdMatchWhere("expectedLocationId", ["a", "b", "c"], ["b"]), { expectedLocationId: { in: ["b"] } })
  assert.deepEqual(auditPendingIdMatchWhere("expectedLocationId", ["a", "b", "c", "d"], ["a", "b"]), { expectedLocationId: { in: ["a", "b"] } }, "a tie keeps in")
  assert.deepEqual(auditPendingIdMatchWhere("expectedLocationId", ["a", "b", "c"], ["a", "c"]), { expectedLocationId: { notIn: ["b"] } })
  assert.deepEqual(auditPendingIdMatchWhere("expectedLocationId", ["a"], ["a"]), { expectedLocationId: { notIn: [] } }, "every room matches")
  assert.deepEqual(auditPendingIdMatchWhere("expectedCustodianId", ["p1", "p2"], ["p1"]), { expectedCustodianId: { in: ["p1"] } })
  assert.deepEqual(auditPendingIdMatchWhere("expectedCustodianId", ["p1", "p2", "p3"], ["p1", "p3"]), {
    AND: [{ expectedCustodianId: { not: null } }, { expectedCustodianId: { notIn: ["p2"] } }],
  })
  // A broad word ("นาย") in a big round: the list never passes half of the round's ids, so it stays under 2,100 parameters.
  const ids = Array.from({ length: 4001 }, (_, index) => `p${index}`)
  for (const size of [1, 2000, 2001, 4000, 4001]) {
    const where = auditPendingIdMatchWhere("expectedCustodianId", ids, ids.slice(0, size))
    const list = JSON.stringify(where).match(/"p\d+"/g) ?? []
    assert.ok(list.length <= 2000, `${size} matched: ${list.length} ids`)
  }
})

test("the search matches the asset's code and name, and the item's expected room and custodian through their ids (bug 13)", () => {
  assert.equal(buildAuditPendingSearchWhere("", { roomIds: ["l1"], matchedRoomIds: ["l1"], custodianIds: [], matchedCustodianIds: [] }), null)
  assert.deepEqual(buildAuditPendingSearchWhere("บัญชี", { roomIds: ["l1", "l2", "l3"], matchedRoomIds: ["l2"], custodianIds: ["p1", "p2"], matchedCustodianIds: [] }), {
    OR: [{ asset: { assetTag: { contains: "บัญชี" } } }, { asset: { name: { contains: "บัญชี" } } }, { expectedLocationId: { in: ["l2"] } }],
  })
  assert.deepEqual(buildAuditPendingSearchWhere("E001", { roomIds: ["l1"], matchedRoomIds: [], custodianIds: ["p1", "p2"], matchedCustodianIds: ["p1"] }), {
    OR: [{ asset: { assetTag: { contains: "E001" } } }, { asset: { name: { contains: "E001" } } }, { expectedCustodianId: { in: ["p1"] } }],
  })
})

test("room chips: ทุกห้อง, the six largest (equal counts in id order), the selected room kept, then อื่น ๆ (spec §9, P2-R11)", () => {
  const groups = [
    { locationId: "l9", count: 2 },
    { locationId: "l1", count: 5 },
    { locationId: "l3", count: 3 },
    { locationId: "l2", count: 4 },
    { locationId: "l8", count: 1 },
    { locationId: "l6", count: 2 },
    { locationId: "l5", count: 2 },
    { locationId: "l4", count: 2 },
  ]
  const six = [room("l1", 5), room("l2", 4), room("l3", 3), room("l4", 2), room("l5", 2), room("l6", 2)]
  assert.deepEqual(foldAuditPendingRoomChips(groups, ""), { chips: [all(21), ...six, other(3)], topRoomIds: ["l1", "l2", "l3", "l4", "l5", "l6"], current: "all" })
  assert.deepEqual(foldAuditPendingRoomChips(groups, "l2"), { chips: [all(21), ...six, other(3)], topRoomIds: ["l1", "l2", "l3", "l4", "l5", "l6"], current: "l2" })
  // A room outside the six stays visible beside them; "อื่น ๆ" still counts it, as its link opens it too.
  assert.deepEqual(foldAuditPendingRoomChips(groups, "l8").chips, [all(21), ...six, room("l8", 1), other(3)])
  assert.equal(foldAuditPendingRoomChips(groups, "other").current, "other")
  // A room with nothing left (from the scan page) or an unknown id keeps its chip at 0, so the page never reads as unfiltered.
  assert.deepEqual(foldAuditPendingRoomChips(groups, "gone").chips, [all(21), ...six, room("gone", 0), other(3)])
  assert.deepEqual(foldAuditPendingRoomChips([{ locationId: "l1", count: 2 }, { locationId: "l2", count: 1 }], ""), { chips: [all(3), room("l1", 2), room("l2", 1)], topRoomIds: ["l1", "l2"], current: "all" })
  assert.deepEqual(foldAuditPendingRoomChips([{ locationId: "l1", count: 2 }], "other").chips, [all(2), room("l1", 2), other(0)])
  assert.deepEqual(foldAuditPendingRoomChips([], ""), { chips: [all(0)], topRoomIds: [], current: "all" })
})

test("names: a room the lookup cannot find has no place (ไม่ทราบห้อง, bug 16); two rooms of one name show their codes", () => {
  const places = new Map([
    ["l1", { code: "B1-201", name: "ห้องบัญชี" }],
    ["l2", { code: "B2-201", name: "ห้องบัญชี" }],
    ["l3", { code: "B1-301", name: "ห้องประชุม" }],
  ])
  assert.deepEqual(describeAuditPendingPlace("l3", places), { code: "B1-301", name: "ห้องประชุม" })
  assert.equal(describeAuditPendingPlace("gone", places), null)
  const labels = labelAuditPendingRoomChips([all(9), room("l1", 4), room("l2", 3), room("l3", 1), room("gone", 0), other(1)], places)
  assert.deepEqual([...labels.entries()], [
    ["l1", { place: { code: "B1-201", name: "ห้องบัญชี" }, showCode: true }],
    ["l2", { place: { code: "B2-201", name: "ห้องบัญชี" }, showCode: true }],
    ["l3", { place: { code: "B1-301", name: "ห้องประชุม" }, showCode: false }],
    ["gone", { place: null, showCode: false }],
  ])
  const people = new Map([["p1", { code: "E001", name: "สมชาย ใจดี" }]])
  assert.deepEqual(describeAuditPendingCustodian(null, people), { kind: "none" })
  assert.deepEqual(describeAuditPendingCustodian("p9", people), { kind: "unknown" })
  assert.deepEqual(describeAuditPendingCustodian("p1", people), { kind: "person", code: "E001", name: "สมชาย ใจดี" })
})

test("เดินตรวจต่อ goes back to the scan page the person came from, or opens a walk that returns to the round page (spec §9, Appendix A §9)", () => {
  const scan = "/th/audit/rounds/r1/scan?returnTo=%2Fth%2Faudit%2Frounds%2Fr1"
  assert.equal(buildAuditPendingContinueScanHref({ locale: "th", roundId: "r1", returnToHref: scan, scanReturnToHref: "/th/audit/rounds/r1" }), scan)
  assert.equal(buildAuditPendingContinueScanHref({ locale: "th", roundId: "r1", returnToHref: "/th/audit/rounds/r1/scan", scanReturnToHref: "/th/audit/rounds/r1" }), "/th/audit/rounds/r1/scan")
  const roundPage = "/th/audit/rounds/r1?returnTo=%2Fth%2Faudit%2Frounds"
  assert.equal(
    buildAuditPendingContinueScanHref({ locale: "th", roundId: "r1", returnToHref: roundPage, scanReturnToHref: roundPage }),
    "/th/audit/rounds/r1/scan?returnTo=%2Fth%2Faudit%2Frounds%2Fr1%3FreturnTo%3D%252Fth%252Faudit%252Frounds",
  )
})

test("the pending list rules are pure: node --test imports them", () => {
  const source = read("src/lib/audit-pending-list-rules.ts")
  assert.doesNotMatch(source, /from "@\//)
  assert.doesNotMatch(source, /^import (?!type )[^\n]*from "@prisma\/client"/m)
  assert.doesNotMatch(source, /prisma\./)
})
