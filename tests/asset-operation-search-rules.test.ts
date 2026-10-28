import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import test from "node:test"
import { isDeepStrictEqual } from "node:util"

import { assetSearchConditions } from "../src/lib/asset-list-query.ts"
import {
  getBulkMoveVerdict, getCheckinVerdict, getCheckoutParentVerdict, getCheckoutVerdict, getTransferVerdict,
  type AssetOperationFacts, type AssetOperationVerdict,
} from "../src/lib/asset-operation-eligibility.ts"
import {
  assetOperationSearchLimit, assetOperationSearchMaxChars, assetOperationSearchMinChars, assetOperationTextConditions, buildAssetOperationByIdWhere,
  buildAssetOperationSearchHref, buildAssetOperationSearchRow, buildAssetOperationSearchWheres, getAssetOperationSearchVerdict,
  getCheckinHolder, groupAssetOperationCheckinRows, isAssetOperationSearchReady, parseAssetOperationSearch, rankAssetOperationMatches,
  type AssetOperationSearchAsset, type AssetOperationSearchCheckoutRecord, type AssetOperationSearchInput,
} from "../src/lib/asset-operation-search-rules.ts"

function input(query: string): AssetOperationSearchInput {
  const parsed = parseAssetOperationSearch(new URLSearchParams(query))
  if ("error" in parsed) throw new Error(`${query}: ${parsed.error}`)
  return parsed
}
const somchai = { code: "EMP-0412", fullNameTh: "สมชาย ใจดี" }
const asset: AssetOperationSearchAsset = {
  id: "asset-1", assetTag: "SNI-EQU-25-0228", name: "โน้ตบุ๊ก Dell Latitude 5440", serialNumber: "SN-1", ownershipType: "personal",
  custodianId: null, currentLocationId: "loc-1", conditionId: "cond-1", status: { name: "Ready", nameTh: "พร้อมใช้งาน" },
  currentLocation: { code: "IT-2", name: "ห้อง IT ชั้น 2" }, custodian: null,
}
const held: AssetOperationSearchAsset = { ...asset, custodianId: "emp-1", custodian: somchai, status: { name: "In Use", nameTh: "ใช้งานอยู่" } }
const handover: AssetOperationSearchCheckoutRecord = {
  id: "co-1", assetId: "asset-1", documentNo: "HO-2026-0151", checkoutType: "user", handoverMode: "permanent_assignment",
  checkoutDate: new Date("2026-03-12T00:00:00.000Z"), expectedReturnDate: null, conditionBefore: "cond-1", remark: null,
  custodianId: "emp-1", departmentId: null, locationId: null, parentAssetId: null, custodian: somchai,
}
const noLabels = { departments: new Map<string, string>(), locations: new Map<string, string>(), assets: new Map<string, string>() }
const ctx = (openCheckout: AssetOperationSearchCheckoutRecord | null) => ({ openCheckout, hasOpenRepair: false, labels: noLabels })

test("the search asks for 2 characters and answers 20 rows (spec 6.1, 6.2)", () => {
  assert.equal(assetOperationSearchMinChars, 2)
  assert.equal(assetOperationSearchLimit, 20)
  assert.deepEqual([" a ", "ab", "สม", " 0 2 "].map(isAssetOperationSearchReady), [false, true, true, true])
})

test("the query: a mode, the trimmed text of 2 or more characters or an id; anything else is 'Invalid search'", () => {
  const base = { mode: "checkout", q: "ab", id: null, assignCustodian: false, handedOverAssetId: null }
  assert.deepEqual(parseAssetOperationSearch(new URLSearchParams("mode=checkout&q=%20ab%20")), base)
  for (const query of ["mode=checkout&q=a", "mode=checkout&q=%20a%20", "mode=checkout", "mode=audit&q=ab", "q=ab"]) {
    assert.deepEqual(parseAssetOperationSearch(new URLSearchParams(query)), { error: "Invalid search" }, query)
  }
  assert.deepEqual(input("mode=checkin&id=%20asset-1%20"), { ...base, mode: "checkin", q: "", id: "asset-1" })   // by id: no 2-character rule
  assert.equal(input("mode=transfer&q=ab&assignCustodian=1").assignCustodian, true)
  assert.equal(input("mode=transfer&q=ab&assignCustodian=0").assignCustodian, false)
  assert.equal(input("mode=checkoutParent&q=ab&handedOverAssetId=asset-9").handedOverAssetId, "asset-9")
  assert.equal(input("mode=checkout&q=ab&handedOverAssetId=asset-9").handedOverAssetId, null)   // only ทรัพย์สินอื่น leaves an asset out
  for (const mode of ["checkout", "checkoutParent", "checkin", "transfer", "bulkMove"]) assert.equal(input(`mode=${mode}&q=ab`).mode, mode)
})

test("final review M-6: the search text is capped at 100 characters, counted as code points", () => {
  assert.equal(assetOperationSearchMaxChars, 100)
  assert.equal(input(`mode=checkout&q=${"a".repeat(100)}`).q, "a".repeat(100))
  assert.equal(input(`mode=checkout&q=${encodeURIComponent(` ${"ก".repeat(100)} `)}`).q, "ก".repeat(100))
  assert.equal(input(`mode=checkout&q=${encodeURIComponent("😀".repeat(100))}`).q, "😀".repeat(100))   // 200 UTF-16 units, 100 code points
  assert.deepEqual(parseAssetOperationSearch(new URLSearchParams(`mode=checkout&q=${"a".repeat(101)}`)), { error: "Invalid search" })
  assert.deepEqual(parseAssetOperationSearch(new URLSearchParams(`mode=checkout&q=${encodeURIComponent("ก".repeat(101))}`)), { error: "Invalid search" })
})

test("the picker's href and the route's parse read the same names", () => {
  const href = buildAssetOperationSearchHref({ mode: "transfer", q: "02 28", assignCustodian: true })
  assert.equal(href, "/api/asset-operations/search?mode=transfer&q=02+28&assignCustodian=1")
  assert.deepEqual(parseAssetOperationSearch(new URL(href, "http://localhost").searchParams), { mode: "transfer", q: "02 28", id: null, assignCustodian: true, handedOverAssetId: null })
  assert.equal(buildAssetOperationSearchHref({ mode: "checkoutParent", id: "asset-2", handedOverAssetId: "asset-1" }), "/api/asset-operations/search?mode=checkoutParent&id=asset-2&handedOverAssetId=asset-1")
})

test("the text matches 6 of the register's own conditions: tag, name, serial, fixed-asset code, the holder's code and name (spec 6.2)", () => {
  const conditions = assetOperationTextConditions("0228")
  assert.deepEqual(conditions, [
    { assetTag: { contains: "0228" } }, { name: { contains: "0228" } }, { serialNumber: { contains: "0228" } }, { fixedAssetCode: { contains: "0228" } },
    { custodian: { code: { contains: "0228" } } }, { custodian: { fullNameTh: { contains: "0228" } } },
  ])
  const register = assetSearchConditions("0228")
  for (const condition of conditions) assert.ok(register.some((entry) => isDeepStrictEqual(entry, condition)), JSON.stringify(condition))
})

test("the wheres: active assets; exact and prefix on the three codes; รับคืน adds the open handover; ทรัพย์สินอื่น leaves out the asset handed over", () => {
  assert.deepEqual(buildAssetOperationSearchWheres(input("mode=checkout&q=0228")), {
    text: { isActive: true, OR: assetOperationTextConditions("0228") },
    exact: { isActive: true, OR: [{ assetTag: "0228" }, { serialNumber: "0228" }, { fixedAssetCode: "0228" }] },
    prefix: { isActive: true, OR: [{ assetTag: { startsWith: "0228" } }, { serialNumber: { startsWith: "0228" } }, { fixedAssetCode: { startsWith: "0228" } }] },
  })
  assert.deepEqual(buildAssetOperationSearchWheres(input("mode=checkin&q=HO-26")).text, {
    isActive: true,
    OR: [...assetOperationTextConditions("HO-26"), { checkouts: { some: { isReturned: false, transactionStatus: "active", OR: [
      { documentNo: { contains: "HO-26" } }, { custodian: { code: { contains: "HO-26" } } }, { custodian: { fullNameTh: { contains: "HO-26" } } },
    ] } } }],
  })
  const parent = buildAssetOperationSearchWheres(input("mode=checkoutParent&q=ab&handedOverAssetId=asset-9"))
  for (const where of [parent.text, parent.exact, parent.prefix]) assert.deepEqual(where.NOT, { id: "asset-9" })
  assert.deepEqual(buildAssetOperationByIdWhere(input("mode=transfer&id=asset-1")), { isActive: true, id: "asset-1" })
  assert.deepEqual(buildAssetOperationByIdWhere(input("mode=checkoutParent&id=asset-9&handedOverAssetId=asset-9")), { isActive: true, NOT: { id: "asset-9" }, id: "asset-9" })
})

test("exact codes first, then codes that start with the text, then the rest, at most 20 (spec 6.1, S-R3)", () => {
  const r = (id: string) => ({ id })
  assert.deepEqual(rankAssetOperationMatches({ exact: [r("B")], prefix: [r("A"), r("B"), r("C")], contains: [r("A"), r("B"), r("C"), r("D")] }).map((row) => row.id), ["B", "A", "C", "D"])
  const many = Array.from({ length: 25 }, (_, index) => r(`R${index}`))
  assert.equal(rankAssetOperationMatches({ exact: [], prefix: [], contains: many }).length, 20)
  assert.deepEqual(rankAssetOperationMatches({ exact: many.slice(0, 20), prefix: [r("P")], contains: [] }).map((row) => row.id), many.slice(0, 20).map((row) => row.id))
})

test("each mode asks Task 1's verdict, so the picker, the asset page and the routes agree (spec §5, S-R1)", () => {
  const facts: AssetOperationFacts[] = [
    { statusName: "Ready", ownership: "personal", custodianId: null, openCheckout: null, hasOpenRepair: false },
    { statusName: "In Use", ownership: "personal", custodianId: "emp-1", openCheckout: { id: "co-1", handoverMode: "permanent_assignment" }, hasOpenRepair: false },
    { statusName: "In Use", ownership: "personal", custodianId: "emp-1", openCheckout: null, hasOpenRepair: true },
    { statusName: "Checked Out", ownership: "shared", custodianId: null, openCheckout: { id: "co-2", handoverMode: null }, hasOpenRepair: false },
    { statusName: "Ready", ownership: "stock", custodianId: null, openCheckout: null, hasOpenRepair: false },
    { statusName: "Ready", ownership: "component", custodianId: "emp-1", openCheckout: null, hasOpenRepair: false },
    { statusName: "Ready", ownership: "software_license", custodianId: "emp-1", openCheckout: null, hasOpenRepair: false },
    { statusName: "Disposed", ownership: "shared", custodianId: null, openCheckout: null, hasOpenRepair: false },
  ]
  const pick = (verdict: AssetOperationVerdict) => ({ eligible: verdict.eligible, reasonKey: verdict.reasonKey })
  const verdict = (query: string, row: AssetOperationFacts) => getAssetOperationSearchVerdict(input(query), "asset-1", row)
  for (const row of facts) {
    assert.deepEqual(verdict("mode=checkout&q=ab", row), pick(getCheckoutVerdict(row)))
    assert.deepEqual(verdict("mode=checkoutParent&q=ab&handedOverAssetId=asset-1", row), pick(getCheckoutParentVerdict(row, { handedOverAssetId: "asset-1", assetId: "asset-1" })))
    assert.deepEqual(verdict("mode=checkin&q=ab", row), pick(getCheckinVerdict(row)))
    assert.deepEqual(verdict("mode=transfer&q=ab", row), pick(getTransferVerdict(row, { assignCustodian: false })))
    assert.deepEqual(verdict("mode=transfer&q=ab&assignCustodian=1", row), pick(getTransferVerdict(row, { assignCustodian: true })))
    assert.deepEqual(verdict("mode=bulkMove&q=ab", row), pick(getBulkMoveVerdict(row)))
  }
  // By value (spec 6.3): an In Use asset on ส่งมอบ; a held component on รับคืน.
  assert.deepEqual(verdict("mode=checkout&q=ab", facts[2]), { eligible: false, reasonKey: "asset.transactionReasonStatusNotReady" })
  assert.deepEqual(verdict("mode=checkin&q=ab", facts[5]), { eligible: false, reasonKey: "asset.transactionReasonComponentCheckin" })
})

test("a row carries the words the picker shows, no raw code: status nameTh, the holder when held, else the location (spec 6.1)", () => {
  assert.deepEqual(buildAssetOperationSearchRow(input("mode=checkout&q=0228"), asset, { openCheckout: null, hasOpenRepair: false }), {
    id: "asset-1", assetTag: "SNI-EQU-25-0228", name: "โน้ตบุ๊ก Dell Latitude 5440", serialNumber: "SN-1",
    statusLabel: "พร้อมใช้งาน", placeLabel: "IT-2 - ห้อง IT ชั้น 2",
    currentLocationId: "loc-1", conditionId: "cond-1", eligible: true, reasonKey: null,
  })
  const row = buildAssetOperationSearchRow(input("mode=checkout&q=0228"), held, { openCheckout: null, hasOpenRepair: false })
  assert.deepEqual([row.placeLabel, row.eligible, row.reasonKey], ["EMP-0412 - สมชาย ใจดี", false, "asset.transactionReasonStatusNotReady"])
  const keys = Object.keys(buildAssetOperationSearchRow(input("mode=transfer&q=0228"), held, ctx(handover)))
  assert.deepEqual(keys.filter((key) => ["checkout", "legacy", "holderKey", "holderLabel", "holderEmployeeId"].includes(key)), [])
})

test("รับคืน rows: the open handover with the panel's fields, ข้อมูลเก่า, or nothing to return (spec 6.3)", () => {
  const handed = buildAssetOperationSearchRow(input("mode=checkin&q=สมชาย"), held, ctx(handover))
  assert.deepEqual(handed.checkout, {
    id: "co-1", documentNo: "HO-2026-0151", checkoutType: "user", handoverMode: "permanent_assignment", checkoutDate: "2026-03-12T00:00:00.000Z",
    expectedReturnDate: null, conditionBefore: "cond-1", remark: null, destinationLabel: "EMP-0412 - สมชาย ใจดี",
  })
  assert.deepEqual(["legacy" in handed, handed.holderKey, handed.holderLabel, handed.holderEmployeeId, handed.eligible], [false, "employee:emp-1", "EMP-0412 - สมชาย ใจดี", "emp-1", true])
  const legacy = buildAssetOperationSearchRow(input("mode=checkin&q=สมชาย"), held, ctx(null))
  assert.deepEqual(["checkout" in legacy, legacy.legacy, legacy.holderKey, legacy.holderEmployeeId, legacy.eligible], [false, true, "employee:emp-1", "emp-1", true])
  const nothing = buildAssetOperationSearchRow(input("mode=checkin&q=0228"), asset, ctx(null))
  assert.deepEqual(["legacy" in nothing, nothing.holderKey, nothing.holderLabel, nothing.holderEmployeeId, nothing.eligible, nothing.reasonKey],
    [false, "none", null, null, false, "asset.transactionReasonNoReturnRecord"])
})

test("a handover to a department, a location or another asset groups under that destination; an unreadable label is '-' (S-R4)", () => {
  const labels = { departments: new Map([["dep-1", "IT - ฝ่ายไอที"]]), locations: new Map([["loc-9", "WH - คลัง IT"]]), assets: new Map([["asset-p", "SNI-COM-23-0001 - คอมพิวเตอร์ตั้งโต๊ะ HP"]]) }
  const to = (overrides: Partial<AssetOperationSearchCheckoutRecord>) => ({ ...handover, custodianId: null, custodian: null, ...overrides })
  assert.deepEqual(getCheckinHolder(to({ checkoutType: "department", departmentId: "dep-1" }), held, labels), { key: "department:dep-1", label: "IT - ฝ่ายไอที", employeeId: null })
  assert.deepEqual(getCheckinHolder(to({ checkoutType: "location", locationId: "loc-9" }), asset, labels), { key: "location:loc-9", label: "WH - คลัง IT", employeeId: null })
  assert.deepEqual(getCheckinHolder(to({ checkoutType: "asset", parentAssetId: "asset-p" }), asset, labels), { key: "asset:asset-p", label: "SNI-COM-23-0001 - คอมพิวเตอร์ตั้งโต๊ะ HP", employeeId: null })
  assert.deepEqual(getCheckinHolder(to({ checkoutType: "location", locationId: "loc-gone" }), asset, labels), { key: "location:loc-gone", label: "-", employeeId: null })
  // A person's handover without its person falls back to the asset's holder, then to none.
  assert.deepEqual(getCheckinHolder(to({ checkoutType: "user" }), held, labels), { key: "employee:emp-1", label: "EMP-0412 - สมชาย ใจดี", employeeId: "emp-1" })
  assert.deepEqual(getCheckinHolder(null, asset, labels), { key: "none", label: null, employeeId: null })
})

test("รับคืน groups follow their first row's rank, ไม่มีผู้ถือครอง last, rows group by group, count = the group's rows (S-R4, the mockup)", () => {
  const row = (id: string, holderKey: string, holderLabel: string | null) =>
    ({ ...buildAssetOperationSearchRow(input("mode=checkin&q=ab"), { ...asset, id }, ctx(null)), holderKey, holderLabel })
  const somchaiR = "EMP-0588 - สมชาย รักงาน"
  const { rows, groups } = groupAssetOperationCheckinRows([
    row("r1", "employee:emp-2", somchaiR), row("r2", "none", null), row("r3", "employee:emp-1", "EMP-0412 - สมชาย ใจดี"), row("r4", "employee:emp-2", somchaiR),
  ])
  assert.deepEqual(rows.map((entry) => entry.id), ["r1", "r4", "r3", "r2"])
  assert.deepEqual(groups, [
    { key: "employee:emp-2", label: somchaiR, count: 2 },
    { key: "employee:emp-1", label: "EMP-0412 - สมชาย ใจดี", count: 1 },
    { key: "none", label: null, count: 1 },
  ])
})

test("the rules module is client-safe: relative imports, Prisma for types only, no database", () => {
  const seen = new Set<string>()
  const visit = (path: string) => {
    if (seen.has(path)) return
    seen.add(path)
    const source = readFileSync(path, "utf8")
    assert.doesNotMatch(source, /from "@\//, `${path} imports through "@/"`)
    assert.doesNotMatch(source, /^import (?!type\b)[^\n]*from "@prisma\/client"/m, `${path} imports Prisma values`)
    assert.doesNotMatch(source, /\bprisma\./, `${path} reads the database`)
    for (const [, relative] of source.matchAll(/from "\.\/([^"]+\.ts)"/g)) visit(`src/lib/${relative}`)
  }
  visit("src/lib/asset-operation-search-rules.ts")
  assert.ok(seen.has("src/lib/asset-operation-eligibility.ts"), "the verdicts are Task 1's")
})
