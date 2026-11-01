import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import test from "node:test"

import { assetOperationSearchAssetSelect, assetOperationTextConditions } from "../src/lib/asset-operation-search-rules.ts"
import {
  buildBulkMoveListHref, buildBulkMoveListRow, buildBulkMoveListWhere, bulkMoveListAssetSelect, bulkMoveListOrderBy, bulkMoveListPageSize,
  bulkMoveListPath, bulkMoveMaxAssets, parseBulkMoveListQuery, type BulkMoveListAsset, type BulkMoveListInput, type BulkMoveListRowFacts,
} from "../src/lib/bulk-move-list-rules.ts"

const parse = (params: Record<string, string>) => parseBulkMoveListQuery(new URLSearchParams(params))
const blank: BulkMoveListInput = { q: "", locationId: null, categoryId: null, page: 1 }
const asset: BulkMoveListAsset = {
  id: "asset-1", assetTag: "SNI-EQU-25-0228", name: "โน้ตบุ๊ก Dell Latitude 5440", serialNumber: "SN-1", ownershipType: "personal",
  modelId: null, custodianId: "emp-1", currentLocationId: "loc-1", conditionId: "cond-1", status: { name: "In Use", nameTh: "ใช้งานอยู่" },
  condition: { name: "Good" }, currentLocation: { code: "IT-2", name: "ห้อง IT ชั้น 2" }, custodian: { code: "EMP-001", fullNameTh: "สมชาย ใจดี" },
  branchId: "br-1", category: { code: "NB", name: "โน้ตบุ๊ก" },
}
const none: BulkMoveListRowFacts = { openCheckout: null, outstanding: null, travellingComponents: [], componentOf: null }
const ram = { id: "ram-1", currentLocationId: "loc-1" }
const ssd = { id: "ssd-1", currentLocationId: "loc-9" }

test("the list's constants: its path, 25 rows a page, at most 100 per move, ordered by tag then id (group 3 spec §10.1, §10.3; P4-R10, P4-R11)", () => {
  assert.equal(bulkMoveListPath, "/api/asset-operations/bulk-move-list")
  assert.equal(bulkMoveListPageSize, 25)
  assert.equal(bulkMoveMaxAssets, 100)
  assert.deepEqual(bulkMoveListOrderBy, [{ assetTag: "asc" }, { id: "asc" }])
})

test("the query: empty text lists everything, 1 character or more than 100 code points is refused, ids are exact, page 1 by default (group 3 spec §10.3, §11; P4-R11)", () => {
  assert.deepEqual(parse({}), blank)
  assert.deepEqual(parse({ q: "  ", locationId: "", categoryId: " ", page: "" }), blank, "blank values are no filter")
  assert.deepEqual(parse({ q: " notebook บัญชี ", locationId: " loc-1 ", categoryId: "cat-1", page: "3" }), { q: "notebook บัญชี", locationId: "loc-1", categoryId: "cat-1", page: 3 })
  assert.deepEqual(parse({ q: "สม" }), { ...blank, q: "สม" })
  for (const q of ["a", " a "]) assert.equal(parse({ q }), null, `1 character: ${JSON.stringify(q)}`)
  assert.deepEqual(parse({ q: "ก".repeat(100) }), { ...blank, q: "ก".repeat(100) })
  assert.equal(parse({ q: "ก".repeat(101) }), null, "more than 100")
  assert.notEqual(parse({ q: "😀".repeat(100) }), null, "code points, not UTF-16 units")
  for (const page of ["0", "-1", "1.5", "2e3", " 2", "abc", "9007199254740993"]) assert.equal(parse({ page }), null, page)
  assert.deepEqual(parse({ page: "007" }), { ...blank, page: 7 })
  for (const key of ["locationId", "categoryId"]) {
    assert.equal(parse({ [key]: "x".repeat(65) }), null, `${key} longer than 64`)
    assert.notEqual(parse({ [key]: "x".repeat(64) }), null, key)
  }
})

test("the href sends what the parse reads, in a fixed order, and leaves out empty text, no filter and page 1 (P4-R11, P4-R12)", () => {
  assert.equal(buildBulkMoveListHref(blank), bulkMoveListPath)
  assert.equal(buildBulkMoveListHref({ ...blank, page: 2 }), `${bulkMoveListPath}?page=2`)
  assert.equal(buildBulkMoveListHref({ ...blank, locationId: "loc-1" }), `${bulkMoveListPath}?locationId=loc-1`)
  const input: BulkMoveListInput = { q: "notebook บัญชี", locationId: "loc-1", categoryId: "cat-1", page: 4 }
  const href = buildBulkMoveListHref(input)
  assert.ok(href.startsWith(`${bulkMoveListPath}?`), href)
  const params = new URL(href, "http://localhost").searchParams
  assert.deepEqual([...params.keys()], ["q", "locationId", "categoryId", "page"])
  assert.deepEqual(parseBulkMoveListQuery(params), input)
})

test("the where: active assets, the exact room and category, and every word (at most 5) in one of the 8 fields (group 3 spec §10.1, §11; P4-R11)", () => {
  assert.deepEqual(buildBulkMoveListWhere(blank), { isActive: true }, "no words: no AND key")
  assert.deepEqual(buildBulkMoveListWhere({ q: "", locationId: "loc-1", categoryId: "cat-1" }), { isActive: true, currentLocationId: "loc-1", categoryId: "cat-1" })
  assert.deepEqual(buildBulkMoveListWhere({ q: "notebook", locationId: null, categoryId: null }), { isActive: true, AND: [{ OR: assetOperationTextConditions("notebook") }] })
  assert.deepEqual(buildBulkMoveListWhere({ q: "notebook บัญชี", locationId: "loc-1", categoryId: null }), {
    isActive: true, currentLocationId: "loc-1", AND: [{ OR: assetOperationTextConditions("notebook") }, { OR: assetOperationTextConditions("บัญชี") }],
  })
  assert.deepEqual(
    buildBulkMoveListWhere({ q: "w1 w2 W1 w3 w4 w5 w6", locationId: null, categoryId: null }),
    { isActive: true, AND: ["w1", "w2", "w3", "w4", "w5"].map((word) => ({ OR: assetOperationTextConditions(word) })) },
    "duplicates dropped, the first 5 kept",
  )
})

test("the row's select is the search's plus the branch and the category (P4-R11, P4-R22)", () => {
  assert.deepEqual(bulkMoveListAssetSelect, { ...assetOperationSearchAssetSelect, branchId: true, category: { select: { code: true, name: true } } })
})

test("a row: code - name labels, the holder or none, the badge's status name, what travels and what it belongs to (group 3 spec §10.1; P4-R1, P4-R2, P4-R22)", () => {
  assert.deepEqual(buildBulkMoveListRow(asset, { ...none, travellingComponents: [ram, ssd] }), {
    id: "asset-1", assetTag: "SNI-EQU-25-0228", name: "โน้ตบุ๊ก Dell Latitude 5440", categoryLabel: "NB - โน้ตบุ๊ก",
    statusName: "In Use", statusLabel: "ใช้งานอยู่", locationId: "loc-1", locationLabel: "IT-2 - ห้อง IT ชั้น 2", holderLabel: "EMP-001 - สมชาย ใจดี",
    branchId: "br-1", eligible: true, reasonKey: null, travellingComponents: [ram, ssd], componentOf: null,
  })
  assert.equal(buildBulkMoveListRow({ ...asset, custodianId: null, custodian: null }, none).holderLabel, null)
  // P4-R1: an installed ส่วนควบ ticked alone moves, and names its parent.
  const parent = { parentId: "asset-1", parentTag: "SNI-EQU-25-0228" }
  const alone = buildBulkMoveListRow({ ...asset, id: "ram-1", ownershipType: "component", custodianId: null, custodian: null }, { ...none, componentOf: parent })
  assert.deepEqual([alone.eligible, alone.reasonKey, alone.componentOf], [true, null, parent])
})

test("a row's verdict is getBulkMoveVerdict's, in its order; a refused row keeps its holder and nothing travels with it (group 3 spec §10.1; P4-R7, P4-R22)", () => {
  const handover = { id: "co-1", handoverMode: "temporary_loan" }
  const outstanding = { linkId: "link-1", checkinId: "rt-1" }
  const status = (name: string) => ({ status: { name, nameTh: name } })
  const cases: [Partial<BulkMoveListAsset>, Partial<BulkMoveListRowFacts>, string | null][] = [
    [{}, {}, null],
    [{ ownershipType: "software_license" }, {}, "asset.transactionReasonLicenseMove"],
    [{}, { openCheckout: handover }, "asset.transactionReasonOpenCheckoutBulkMove"],
    [status("Disposed"), {}, "asset.transactionReasonWrittenOff"],
    [status("Retired"), {}, "asset.transactionReasonWrittenOff"],
    [{ ownershipType: "component" }, { outstanding }, "asset.transactionReasonComponentOutstanding"],
    [{ ownershipType: "software_license" }, { outstanding, openCheckout: handover }, "asset.transactionReasonComponentOutstanding"],
    [status("Disposed"), { openCheckout: handover }, "asset.transactionReasonOpenCheckoutBulkMove"],
    // The bulk move reads neither the condition nor a repair (P3-R1; spec §10.1: อยู่ระหว่างซ่อม can move).
    [{ condition: { name: "Salvage" } }, {}, null],
    ...["Under Maintenance", "Pending Repair", "Lost", "Missing", "Under Inspection", "Pending Disposal"].map((name) => [status(name), {}, null] as [Partial<BulkMoveListAsset>, Partial<BulkMoveListRowFacts>, null]),
  ]
  for (const [assetOverrides, factOverrides, reasonKey] of cases) {
    const row = buildBulkMoveListRow({ ...asset, ...assetOverrides }, { ...none, travellingComponents: [ram], ...factOverrides })
    const where = `${JSON.stringify(assetOverrides)} ${JSON.stringify(factOverrides)}`
    assert.deepEqual([row.eligible, row.reasonKey], [reasonKey === null, reasonKey], where)
    assert.deepEqual(row.travellingComponents, reasonKey === null ? [ram] : [], where)
    assert.equal(row.holderLabel, "EMP-001 - สมชาย ใจดี", where)
  }
})

test("the list rules are client-safe: relative .ts imports, Prisma as a type only, no database (P4 Global Constraints)", () => {
  const source = readFileSync("src/lib/bulk-move-list-rules.ts", "utf8")
  assert.doesNotMatch(source, /from "@\/|\bprisma\.|from "\.\/(db|asset-operation-search)\.ts"/)
  assert.equal([...source.matchAll(/from "@prisma\/client"/g)].length, 1)
  assert.match(source, /^import type \{ Prisma \} from "@prisma\/client"\r?$/m)
  for (const [, path] of source.matchAll(/from "([^"]+)"/g)) assert.match(path, /^(\.\/[\w-]+\.ts|@prisma\/client)$/, path)
})
