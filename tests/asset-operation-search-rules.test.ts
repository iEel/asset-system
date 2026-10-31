import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import test from "node:test"
import { isDeepStrictEqual } from "node:util"

import { assetSearchConditions } from "../src/lib/asset-list-query.ts"
import {
  getBulkMoveVerdict, getCheckinVerdict, getCheckoutVerdict, getTransferVerdict,
  type AssetOperationFacts, type AssetOperationVerdict,
} from "../src/lib/asset-operation-eligibility.ts"
import {
  assetOperationSearchLimit, assetOperationSearchMaxChars, assetOperationSearchMaxWords, assetOperationSearchMinChars, assetOperationTextConditions,
  buildAssetOperationByIdWhere, buildAssetOperationSearchHref, buildAssetOperationSearchRow, buildAssetOperationSearchWheres, getAssetOperationSearchVerdict,
  getCheckinHolder, groupAssetOperationCheckinRows, isAssetOperationSearchReady, parseAssetOperationSearch, rankAssetOperationMatches,
  splitAssetOperationSearchWords, buildAssetOperationComponentLinkWhere, buildAssetOperationRowDetail,
  type AssetOperationChosenDetail, type AssetOperationSearchDetailAsset,
  type AssetOperationSearchAsset, type AssetOperationSearchCheckoutRecord, type AssetOperationSearchInput,
  assetOperationOutstandingLinkSelect, type AssetOperationOutstandingLinkRecord, type AssetOperationOutstandingRead,
  assetOperationLateReturnParentSelect, assetOperationParentOutstandingLinkSelect, buildAssetOperationLateReturnParent, buildAssetOperationOutstandingComponents,
  type AssetOperationParentOutstandingLink,
} from "../src/lib/asset-operation-search-rules.ts"

function input(query: string): AssetOperationSearchInput {
  const parsed = parseAssetOperationSearch(new URLSearchParams(query))
  if ("error" in parsed) throw new Error(`${query}: ${parsed.error}`)
  return parsed
}
const somchai = { code: "EMP-0412", fullNameTh: "สมชาย ใจดี" }
const asset: AssetOperationSearchAsset = {
  id: "asset-1", assetTag: "SNI-EQU-25-0228", name: "โน้ตบุ๊ก Dell Latitude 5440", serialNumber: "SN-1", ownershipType: "personal",
  modelId: null, custodianId: null, currentLocationId: "loc-1", conditionId: "cond-1", status: { name: "Ready", nameTh: "พร้อมใช้งาน" },
  condition: { name: "Good" }, currentLocation: { code: "IT-2", name: "ห้อง IT ชั้น 2" }, custodian: null,
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
  const base = { mode: "checkout", q: "ab", id: null, assignCustodian: false }
  assert.deepEqual(parseAssetOperationSearch(new URLSearchParams("mode=checkout&q=%20ab%20")), base)
  for (const query of ["mode=checkout&q=a", "mode=checkout&q=%20a%20", "mode=checkout", "mode=audit&q=ab", "q=ab"]) {
    assert.deepEqual(parseAssetOperationSearch(new URLSearchParams(query)), { error: "Invalid search" }, query)
  }
  assert.deepEqual(input("mode=checkin&id=%20asset-1%20"), { ...base, mode: "checkin", q: "", id: "asset-1" })   // by id: no 2-character rule
  assert.equal(input("mode=transfer&q=ab&assignCustodian=1").assignCustodian, true)
  assert.equal(input("mode=transfer&q=ab&assignCustodian=0").assignCustodian, false)
  for (const mode of ["checkout", "checkin", "transfer", "bulkMove"]) assert.equal(input(`mode=${mode}&q=ab`).mode, mode)
  assert.deepEqual(parseAssetOperationSearch(new URLSearchParams("mode=checkoutParent&q=ab")), { error: "Invalid search" })
  assert.deepEqual(input("mode=checkout&q=ab&handedOverAssetId=asset-9"), base)   // a stray parameter is not read
  assert.equal(input("mode=checkout&id=asset-1&detail=1").detail, true)
  for (const q of ["mode=checkout&id=asset-1", "mode=checkout&id=asset-1&detail=true", "mode=checkout&q=ab&detail=1"]) assert.equal("detail" in input(q), false, q)
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
  assert.deepEqual(parseAssetOperationSearch(new URL(href, "http://localhost").searchParams), { mode: "transfer", q: "02 28", id: null, assignCustodian: true })
  assert.equal(buildAssetOperationSearchHref({ mode: "checkout", id: "asset-2" }), "/api/asset-operations/search?mode=checkout&id=asset-2")
  const detailHref = buildAssetOperationSearchHref({ mode: "checkout", id: "asset-1", detail: true })
  assert.equal(detailHref, "/api/asset-operations/search?mode=checkout&id=asset-1&detail=1")
  assert.deepEqual(parseAssetOperationSearch(new URL(detailHref, "http://localhost").searchParams), { mode: "checkout", q: "", id: "asset-1", assignCustodian: false, detail: true })
  assert.equal(buildAssetOperationSearchHref({ mode: "checkout", id: "asset-1", detail: false }), "/api/asset-operations/search?mode=checkout&id=asset-1")
})

test("the chosen asset's detail: ownership, the status's English name, department and holder as 'code - name' (null when none), both branches, each installed component once by tag with whether it travels (group 3 plan 1 Task 4, spec §7.1)", () => {
  const chosen: AssetOperationSearchDetailAsset = { ...held, ownershipType: "stock", departmentId: "dep-acc", department: { code: "ACC", name: "บัญชี" },
    branch: { name: "สำนักงานใหญ่" }, currentLocation: { code: "RY-01", name: "ห้องบัญชี", branch: { name: "สาขาระยอง" } } }
  const link = (id: string, assetTag: string, name: string) => ({ componentAssetId: id, componentAsset: { assetTag, name, currentLocation: { code: "RY-01", name: "ห้องบัญชี" } } })
  const links = [link("c-2", "NB-0017-02", "Mouse ไร้สาย"), link("c-1", "NB-0017-01", "Adapter 65W"), link("c-2", "NB-0017-02", "Mouse ไร้สาย")]
  const expected: AssetOperationChosenDetail = {
    ownership: "stock", statusName: "In Use", departmentId: "dep-acc", departmentLabel: "ACC - บัญชี", departmentName: "บัญชี", holderLabel: "EMP-0412 - สมชาย ใจดี", holderName: "สมชาย ใจดี",
    ownerBranchLabel: "สำนักงานใหญ่", locationBranchLabel: "สาขาระยอง",
    components: [{ id: "c-1", assetTag: "NB-0017-01", name: "Adapter 65W", travels: true, locationLabel: "RY-01 - ห้องบัญชี" }, { id: "c-2", assetTag: "NB-0017-02", name: "Mouse ไร้สาย", travels: false, locationLabel: "RY-01 - ห้องบัญชี" }],
    outstandingComponents: [],
  }
  assert.deepEqual(buildAssetOperationRowDetail(chosen, links, new Set(["c-2"]), []), expected)
  const bare = buildAssetOperationRowDetail({ ...chosen, ownershipType: "bogus", departmentId: null, department: null, custodianId: null, custodian: null }, [], new Set(), [])
  assert.deepEqual([bare.ownership, bare.departmentId, bare.departmentLabel, bare.departmentName, bare.holderLabel, bare.holderName, bare.components], ["personal", null, null, null, null, null, []])
  // The same links the sync moves with the parent (asset-component-sync.ts:115-122).
  assert.deepEqual(buildAssetOperationComponentLinkWhere("asset-1"), { parentAssetId: "asset-1", status: "installed", removedAt: null, componentAsset: { isActive: true } })
  const sync = readFileSync("src/lib/asset-component-sync.ts", "utf8")
  for (const part of ['status: "installed"', "removedAt: null", "componentAsset: { isActive: true }"]) assert.ok(sync.includes(part), part)
})

test("the text matches 6 of the register's own conditions, then the asset's and the holder's department names (spec 6.2, §11)", () => {
  const conditions = assetOperationTextConditions("0228")
  assert.deepEqual(conditions, [
    { assetTag: { contains: "0228" } }, { name: { contains: "0228" } }, { serialNumber: { contains: "0228" } }, { fixedAssetCode: { contains: "0228" } },
    { custodian: { code: { contains: "0228" } } }, { custodian: { fullNameTh: { contains: "0228" } } },
    { department: { name: { contains: "0228" } } }, { custodian: { department: { name: { contains: "0228" } } } },
  ])
  const register = assetSearchConditions("0228")
  for (const condition of conditions.slice(0, 6)) assert.ok(register.some((entry) => isDeepStrictEqual(entry, condition)), JSON.stringify(condition))
})

test("the wheres: active assets; exact and prefix on the three codes; รับคืน adds the open handover", () => {
  assert.deepEqual(buildAssetOperationSearchWheres(input("mode=checkout&q=0228")), {
    text: { isActive: true, OR: assetOperationTextConditions("0228") },
    exact: { isActive: true, OR: [{ assetTag: "0228" }, { serialNumber: "0228" }, { fixedAssetCode: "0228" }] },
    prefix: { isActive: true, OR: [{ assetTag: { startsWith: "0228" } }, { serialNumber: { startsWith: "0228" } }, { fixedAssetCode: { startsWith: "0228" } }] },
  })
  const checkinText = [...assetOperationTextConditions("HO-26"), { checkouts: { some: { isReturned: false, transactionStatus: "active", OR: [
    { documentNo: { contains: "HO-26" } }, { custodian: { code: { contains: "HO-26" } } }, { custodian: { fullNameTh: { contains: "HO-26" } } },
  ] } } }, { currentLocation: { code: { contains: "HO-26" } } }, { currentLocation: { name: { contains: "HO-26" } } }]
  const checkin = buildAssetOperationSearchWheres(input("mode=checkin&q=HO-26"))
  // S-R47: รับคืน also matches the current location's code and name.
  assert.deepEqual(checkin.text, { isActive: true, OR: checkinText })
  // S-R45: รับคืน adds the held tier, the same text on assets with an open handover or a custodian.
  assert.deepEqual(checkin.held, {
    isActive: true,
    AND: [{ OR: checkinText }, { OR: [{ checkouts: { some: { isReturned: false, transactionStatus: "active" } } }, { custodianId: { not: null } }] }],
  })
  for (const mode of ["checkout", "transfer", "bulkMove"]) {
    const wheres = buildAssetOperationSearchWheres(input(`mode=${mode}&q=ab`))
    assert.deepEqual(Object.keys(wheres), ["text", "exact", "prefix"], `${mode} keeps three tiers`)
    assert.equal(JSON.stringify(wheres.text).includes("currentLocation"), false, mode)
  }
  assert.deepEqual(buildAssetOperationByIdWhere(input("mode=transfer&id=asset-1")), { isActive: true, id: "asset-1" })
})

test("multi-word: the text splits on whitespace into at most 5 words, duplicates dropped, in typed order (P1-R6)", () => {
  assert.equal(assetOperationSearchMaxWords, 5)
  assert.deepEqual(splitAssetOperationSearchWords("  notebook   บัญชี "), ["notebook", "บัญชี"])
  assert.deepEqual(splitAssetOperationSearchWords("notebook\tบัญชี\n0228"), ["notebook", "บัญชี", "0228"])
  assert.deepEqual(splitAssetOperationSearchWords("Dell dell DELL 5440 dell"), ["Dell", "5440"])
  assert.deepEqual(splitAssetOperationSearchWords("w1 w2 w3 w4 w5 w6 w7"), ["w1", "w2", "w3", "w4", "w5"])
  assert.deepEqual(splitAssetOperationSearchWords("w1 w1 w2 w3 w4 w5 w6"), ["w1", "w2", "w3", "w4", "w5"])   // duplicates go before the cap
  assert.deepEqual(splitAssetOperationSearchWords("SNI-EQU-25-0228"), ["SNI-EQU-25-0228"])
  assert.deepEqual(splitAssetOperationSearchWords("   "), [])
})

test("multi-word: every word must match a field, the code tiers keep the whole text; รับคืน's held tier needs every word too (spec §11)", () => {
  const q = "notebook บัญชี"
  assert.deepEqual(buildAssetOperationSearchWheres(input(`mode=checkout&q=${encodeURIComponent(q)}`)), {
    text: { isActive: true, AND: [{ OR: assetOperationTextConditions("notebook") }, { OR: assetOperationTextConditions("บัญชี") }] },
    exact: { isActive: true, OR: [{ assetTag: q }, { serialNumber: q }, { fixedAssetCode: q }] },
    prefix: { isActive: true, OR: [{ assetTag: { startsWith: q } }, { serialNumber: { startsWith: q } }, { fixedAssetCode: { startsWith: q } }] },
  })
  const checkinWord = (word: string) => ({ OR: [...assetOperationTextConditions(word), { checkouts: { some: { isReturned: false, transactionStatus: "active", OR: [
    { documentNo: { contains: word } }, { custodian: { code: { contains: word } } }, { custodian: { fullNameTh: { contains: word } } },
  ] } } }, { currentLocation: { code: { contains: word } } }, { currentLocation: { name: { contains: word } } }] })
  const checkin = buildAssetOperationSearchWheres(input(`mode=checkin&q=${encodeURIComponent("สมชาย HO-26")}`))
  assert.deepEqual(checkin.text, { isActive: true, AND: [checkinWord("สมชาย"), checkinWord("HO-26")] })
  assert.deepEqual(checkin.held, { isActive: true, AND: [checkinWord("สมชาย"), checkinWord("HO-26"),
    { OR: [{ checkouts: { some: { isReturned: false, transactionStatus: "active" } } }, { custodianId: { not: null } }] }] })
  // One word left after the duplicates go: today's shape.
  assert.deepEqual(buildAssetOperationSearchWheres(input("mode=transfer&q=Dell%20dell")).text, { isActive: true, OR: assetOperationTextConditions("Dell") })
  const six = buildAssetOperationSearchWheres(input("mode=bulkMove&q=w1%20w2%20w3%20w4%20w5%20w6"))
  assert.equal((six.text.AND as unknown[]).length, 5)
  assert.deepEqual(six.exact.OR, [{ assetTag: "w1 w2 w3 w4 w5 w6" }, { serialNumber: "w1 w2 w3 w4 w5 w6" }, { fixedAssetCode: "w1 w2 w3 w4 w5 w6" }])
})

test("exact codes first, then codes that start with the text, then the rest, at most 20 (spec 6.1, S-R3)", () => {
  const r = (id: string) => ({ id })
  assert.deepEqual(rankAssetOperationMatches({ exact: [r("B")], prefix: [r("A"), r("B"), r("C")], contains: [r("A"), r("B"), r("C"), r("D")] }).map((row) => row.id), ["B", "A", "C", "D"])
  const many = Array.from({ length: 25 }, (_, index) => r(`R${index}`))
  assert.equal(rankAssetOperationMatches({ exact: [], prefix: [], contains: many }).length, 20)
  assert.deepEqual(rankAssetOperationMatches({ exact: many.slice(0, 20), prefix: [r("P")], contains: [] }).map((row) => row.id), many.slice(0, 20).map((row) => row.id))
})

test("รับคืน: exact codes, then held rows, then code prefixes, then the rest (S-R45)", () => {
  const r = (id: string) => ({ id })
  assert.deepEqual(
    rankAssetOperationMatches({ exact: [r("E")], held: [r("H1"), r("E"), r("H2")], prefix: [r("P"), r("H1")], contains: [r("A"), r("H2"), r("P")] }).map((row) => row.id),
    ["E", "H1", "H2", "P", "A"],
  )
  const many = Array.from({ length: 25 }, (_, index) => r(`N${index}`))
  const ranked = rankAssetOperationMatches({ exact: [], held: [r("H1"), r("H2")], prefix: [], contains: many.slice(0, 20) })
  assert.deepEqual([ranked.length, ranked[0].id, ranked[1].id], [20, "H1", "H2"])
})

test("each mode asks Task 1's verdict, so the picker, the asset page and the routes agree (spec §5, S-R1)", () => {
  const facts: AssetOperationFacts[] = [
    { statusName: "Ready", ownership: "personal", custodianId: null, openCheckout: null, hasOpenRepair: false, conditionName: null, outstanding: null },
    { statusName: "In Use", ownership: "personal", custodianId: "emp-1", openCheckout: { id: "co-1", handoverMode: "permanent_assignment" }, hasOpenRepair: false, conditionName: null, outstanding: null },
    { statusName: "In Use", ownership: "personal", custodianId: "emp-1", openCheckout: null, hasOpenRepair: true, conditionName: null, outstanding: null },
    { statusName: "Checked Out", ownership: "shared", custodianId: null, openCheckout: { id: "co-2", handoverMode: null }, hasOpenRepair: false, conditionName: null, outstanding: null },
    { statusName: "Ready", ownership: "stock", custodianId: null, openCheckout: null, hasOpenRepair: false, conditionName: null, outstanding: null },
    { statusName: "Ready", ownership: "component", custodianId: "emp-1", openCheckout: null, hasOpenRepair: false, conditionName: null, outstanding: null },
    { statusName: "Ready", ownership: "software_license", custodianId: "emp-1", openCheckout: null, hasOpenRepair: false, conditionName: null, outstanding: null },
    { statusName: "Disposed", ownership: "shared", custodianId: null, openCheckout: null, hasOpenRepair: false, conditionName: null, outstanding: null },
    { statusName: "Ready", ownership: "personal", custodianId: "emp-1", openCheckout: null, hasOpenRepair: false, conditionName: null, outstanding: { linkId: "link-1", checkinId: "rt-1" } },
  ]
  const pick = (verdict: AssetOperationVerdict) => ({ eligible: verdict.eligible, reasonKey: verdict.reasonKey })
  const verdict = (query: string, row: AssetOperationFacts) => getAssetOperationSearchVerdict(input(query), row)
  for (const row of facts) {
    assert.deepEqual(verdict("mode=checkout&q=ab", row), pick(getCheckoutVerdict(row)))
    assert.deepEqual(verdict("mode=checkin&q=ab", row), pick(getCheckinVerdict(row)))
    assert.deepEqual(verdict("mode=transfer&q=ab", row), pick(getTransferVerdict(row, { assignCustodian: false })))
    assert.deepEqual(verdict("mode=transfer&q=ab&assignCustodian=1", row), pick(getTransferVerdict(row, { assignCustodian: true })))
    assert.deepEqual(verdict("mode=bulkMove&q=ab", row), pick(getBulkMoveVerdict(row)))
  }
  // By value (spec 6.3): an In Use asset on ส่งมอบ; a held component on รับคืน.
  assert.deepEqual(verdict("mode=checkout&q=ab", facts[2]), { eligible: false, reasonKey: "asset.transactionReasonStatusNotReady" })
  assert.deepEqual(verdict("mode=checkin&q=ab", facts[5]), { eligible: false, reasonKey: "asset.transactionReasonComponentCheckin" })
  // An outstanding component (group 3 spec §8.5, §8.6): refused by ส่งมอบ, taken by รับคืน.
  assert.deepEqual(verdict("mode=checkout&q=ab", facts[8]), { eligible: false, reasonKey: "asset.transactionReasonComponentOutstanding" })
  assert.deepEqual(verdict("mode=checkin&q=ab", facts[8]), { eligible: true, reasonKey: null })
})

test("a row carries the words the picker shows, no raw code: status nameTh, the holder when held, else the location (spec 6.1)", () => {
  assert.deepEqual(buildAssetOperationSearchRow(input("mode=checkout&q=0228"), asset, { openCheckout: null, hasOpenRepair: false }), {
    id: "asset-1", assetTag: "SNI-EQU-25-0228", name: "โน้ตบุ๊ก Dell Latitude 5440", serialNumber: "SN-1",
    statusLabel: "พร้อมใช้งาน", placeLabel: "IT-2 - ห้อง IT ชั้น 2", locationLabel: "IT-2 - ห้อง IT ชั้น 2",
    currentLocationId: "loc-1", conditionId: "cond-1", eligible: true, reasonKey: null, photo: null,
  })
  // The search hands the row its photo (group 3 spec §19.5); the row keeps it as given.
  const photo = { id: "att-1", alt: "dell.jpg", fileType: "image/jpeg" }
  assert.deepEqual(buildAssetOperationSearchRow(input("mode=checkin&q=0228"), asset, { openCheckout: null, hasOpenRepair: false, photo }).photo, photo)
  const row = buildAssetOperationSearchRow(input("mode=checkout&q=0228"), held, { openCheckout: null, hasOpenRepair: false })
  assert.deepEqual([row.placeLabel, row.locationLabel, row.eligible, row.reasonKey], ["EMP-0412 - สมชาย ใจดี", "IT-2 - ห้อง IT ชั้น 2", false, "asset.transactionReasonStatusNotReady"])
  const keys = Object.keys(buildAssetOperationSearchRow(input("mode=transfer&q=0228"), held, ctx(handover)))
  assert.deepEqual(keys.filter((key) => ["checkout", "legacy", "holderKey", "holderLabel", "holderEmployeeId"].includes(key)), [])
})

test("a row reads the asset's condition: a เสียหาย or ซาก asset is refused for ส่งมอบ with its reason, and still moves (group 3 spec §19.2)", () => {
  const damaged = { ...asset, condition: { name: "Damaged" } }
  const checkout = buildAssetOperationSearchRow(input("mode=checkout&q=0228"), damaged, { openCheckout: null, hasOpenRepair: false })
  assert.deepEqual([checkout.eligible, checkout.reasonKey], [false, "asset.transactionReasonConditionDamaged"])
  const salvage = buildAssetOperationSearchRow(input("mode=checkout&q=0228"), { ...asset, condition: { name: "Salvage" } }, { openCheckout: null, hasOpenRepair: false })
  assert.deepEqual([salvage.eligible, salvage.reasonKey], [false, "asset.transactionReasonConditionSalvage"])
  const moved = buildAssetOperationSearchRow(input("mode=transfer&q=0228"), damaged, { openCheckout: null, hasOpenRepair: false })
  assert.deepEqual([moved.eligible, moved.reasonKey], [true, null])
})

test("รับคืน rows: the open handover with the panel's fields, ข้อมูลเก่า, or nothing to return (spec 6.3)", () => {
  const handed = buildAssetOperationSearchRow(input("mode=checkin&q=สมชาย"), held, ctx(handover))
  assert.deepEqual(handed.checkout, {
    id: "co-1", documentNo: "HO-2026-0151", checkoutType: "user", handoverMode: "permanent_assignment", checkoutDate: "2026-03-12T00:00:00.000Z",
    expectedReturnDate: null, conditionBefore: "cond-1", remark: null, destinationLabel: "EMP-0412 - สมชาย ใจดี",
  })
  assert.deepEqual(["legacy" in handed, handed.holderKey, handed.holderLabel, handed.holderEmployeeId, handed.eligible], [false, "employee:emp-1", "EMP-0412 - สมชาย ใจดี", "emp-1", true])
  const legacy = buildAssetOperationSearchRow(input("mode=checkin&q=สมชาย"), held, ctx(null))
  assert.deepEqual(["checkout" in legacy, legacy.legacy, legacy.holderKey, legacy.holderEmployeeId, legacy.eligible, legacy.locationLabel], [false, true, "employee:emp-1", "emp-1", true, "IT-2 - ห้อง IT ชั้น 2"])
  const nothing = buildAssetOperationSearchRow(input("mode=checkin&q=0228"), asset, ctx(null))
  assert.deepEqual(["legacy" in nothing, nothing.holderKey, nothing.holderLabel, nothing.holderEmployeeId, nothing.eligible, nothing.reasonKey],
    [false, "none", null, null, false, "asset.transactionReasonNoReturnRecord"])
})

test("รับคืน: a row whose asset has an open repair says so, and the return form sends it to ส่งซ่อม (S-R43)", () => {
  const repairing = { ...ctx(handover), hasOpenRepair: true }
  const row = buildAssetOperationSearchRow(input("mode=checkin&q=สมชาย"), held, repairing)
  assert.deepEqual([row.openRepair, row.eligible, row.reasonKey, row.checkout?.id], [true, true, null, "co-1"])
  assert.equal("openRepair" in buildAssetOperationSearchRow(input("mode=checkin&q=สมชาย"), held, ctx(handover)), false)
  for (const mode of ["checkout", "transfer", "bulkMove"]) {
    assert.equal("openRepair" in buildAssetOperationSearchRow(input(`mode=${mode}&q=0228`), held, repairing), false, mode)
  }
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

const parentStock: AssetOperationOutstandingLinkRecord["parentAsset"] = {
  id: "asset-p", assetTag: "NB-0017", name: "โน้ตบุ๊ก Dell", isActive: true, custodianId: null, status: { name: "Ready" }, _count: { checkouts: 0, maintenanceTickets: 0 },
}
const outLink = (overrides: Partial<AssetOperationOutstandingLinkRecord> = {}): AssetOperationOutstandingLinkRecord =>
  ({ id: "link-1", componentAssetId: "asset-1", referenceId: "rt-1", parentAsset: parentStock, ...overrides })
const rt1 = { id: "rt-1", documentNo: "RT-202610-0004", returnDate: new Date("2026-10-20T00:00:00.000Z") }
const outRead = (link = outLink(), checkin: AssetOperationOutstandingRead["checkin"] = rt1): AssetOperationOutstandingRead => ({ link, checkin })
const late = (outstanding: AssetOperationOutstandingRead) => buildAssetOperationSearchRow(input("mode=checkin&q=0228"), held, { ...ctx(null), outstanding })

test("the outstanding link read: the link, its RT- reference, and its parent's IT-stock facts (group 3 spec §8.6, P2-R17)", () => {
  assert.deepEqual(assetOperationOutstandingLinkSelect, {
    id: true, componentAssetId: true, referenceId: true,
    parentAsset: { select: {
      id: true, assetTag: true, name: true, isActive: true, custodianId: true, status: { select: { name: true } },
      _count: { select: {
        checkouts: { where: { isReturned: false, transactionStatus: "active" } },
        maintenanceTickets: { where: { isActive: true, repairStatus: { notIn: ["closed", "cancelled"] } } },
      } },
    } },
  })
})

test("รับคืน: an outstanding component is a row of its own with its late return, its badge, and never ข้อมูลเก่า (group 3 spec §8.6, P2-R4, P2-R17)", () => {
  const row = late(outRead())
  assert.deepEqual(row.lateReturn, {
    linkId: "link-1", checkinId: "rt-1", checkinNo: "RT-202610-0004", checkinDate: "2026-10-20T00:00:00.000Z",
    parent: { id: "asset-p", assetTag: "NB-0017", name: "โน้ตบุ๊ก Dell" }, parentInStock: true,
  })
  assert.deepEqual([row.eligible, row.reasonKey, row.badge, "legacy" in row, "checkout" in row, row.holderKey, row.holderEmployeeId],
    [true, null, "outstanding", false, false, "employee:emp-1", "emp-1"])
  // The parent anywhere else: the panel says the component stands alone (P2-R4).
  for (const parentAsset of [{ ...parentStock, custodianId: "emp-2" }, { ...parentStock, status: { name: "In Use" } }, { ...parentStock, isActive: false },
    { ...parentStock, _count: { checkouts: 1, maintenanceTickets: 0 } }, { ...parentStock, _count: { checkouts: 0, maintenanceTickets: 1 } }]) {
    assert.equal(late(outRead(outLink({ parentAsset }))).lateReturn?.parentInStock, false, JSON.stringify(parentAsset))
  }
  // An RT- that cannot be read keeps its id; its number and date read null.
  assert.deepEqual([late(outRead(outLink(), null)).lateReturn?.checkinId, late(outRead(outLink(), null)).lateReturn?.checkinNo, late(outRead(outLink(), null)).lateReturn?.checkinDate], ["rt-1", null, null])
  // A link that names no RT- is refused, with no late return.
  const unlinked = late(outRead(outLink({ referenceId: null }), null))
  assert.deepEqual([unlinked.eligible, unlinked.reasonKey, "lateReturn" in unlinked, unlinked.badge], [false, "asset.transactionReasonNoReturnRecord", false, "outstanding"])
})

test("the other modes refuse an outstanding component and carry no รับคืน keys; the รับคืน badge follows the row (P2-R17)", () => {
  for (const mode of ["checkout", "transfer", "bulkMove"]) {
    const row = buildAssetOperationSearchRow(input(`mode=${mode}&q=0228`), asset, { openCheckout: null, hasOpenRepair: false, outstanding: outRead() })
    assert.deepEqual([row.eligible, row.reasonKey, "lateReturn" in row, "badge" in row], [false, "asset.transactionReasonComponentOutstanding", false, false], mode)
  }
  assert.equal(buildAssetOperationSearchRow(input("mode=checkin&q=0228"), held, ctx(handover)).badge, "handover")
  assert.equal(buildAssetOperationSearchRow(input("mode=checkin&q=0228"), held, ctx(null)).badge, "legacy")
  assert.equal("badge" in buildAssetOperationSearchRow(input("mode=checkin&q=0228"), asset, ctx(null)), false)
})

test("the chosen asset's outstanding components: each once (the first link; callers read newest first), by tag, with its holder and the RT- that left it out (group 3 spec §7.1, P2-R19)", () => {
  assert.deepEqual(assetOperationParentOutstandingLinkSelect, {
    componentAssetId: true, referenceId: true,
    componentAsset: { select: { assetTag: true, name: true, custodian: { select: { fullNameTh: true } } } },
  })
  const out = (componentAssetId: string, assetTag: string, name: string, holder: string | null, referenceId: string | null): AssetOperationParentOutstandingLink =>
    ({ componentAssetId, referenceId, componentAsset: { assetTag, name, custodian: holder ? { fullNameTh: holder } : null } })
  const links = [out("c-3", "NB-0017-03", "Dock", "สมชาย ใจดี", "rt-2"), out("c-2", "NB-0017-02", "Mouse ไร้สาย", null, "rt-1"), out("c-3", "NB-0017-03", "Dock", "สมชาย ใจดี", "rt-1"), out("c-4", "NB-0017-04", "Pen", "สมหญิง รักงาน", null)]
  assert.deepEqual(buildAssetOperationOutstandingComponents(links, new Map([["rt-1", "RT-202610-0004"], ["rt-2", "RT-202610-0009"]])), [
    { assetTag: "NB-0017-02", name: "Mouse ไร้สาย", holderName: null, checkinNo: "RT-202610-0004" },
    { assetTag: "NB-0017-03", name: "Dock", holderName: "สมชาย ใจดี", checkinNo: "RT-202610-0009" },
    { assetTag: "NB-0017-04", name: "Pen", holderName: "สมหญิง รักงาน", checkinNo: null },
  ])
  assert.deepEqual(buildAssetOperationOutstandingComponents([out("c-2", "NB-0017-02", "Mouse ไร้สาย", null, "rt-9")], new Map()), [{ assetTag: "NB-0017-02", name: "Mouse ไร้สาย", holderName: null, checkinNo: null }], "an RT- that was not read")
})

test("a late return's parent: its room as 'code - name' and its department, for the re-attach summary (group 3 spec §8.6, P2-R7)", () => {
  assert.deepEqual(assetOperationLateReturnParentSelect, {
    id: true, currentLocationId: true, currentLocation: { select: { code: true, name: true } }, departmentId: true, department: { select: { name: true } },
  })
  const parent = { id: "asset-p", currentLocationId: "loc-it", currentLocation: { code: "IT-2", name: "ห้อง IT ชั้น 2" }, departmentId: "dep-adm", department: { name: "ธุรการ" } }
  assert.deepEqual(buildAssetOperationLateReturnParent(parent), { locationId: "loc-it", locationLabel: "IT-2 - ห้อง IT ชั้น 2", departmentId: "dep-adm", departmentName: "ธุรการ" })
  assert.deepEqual(buildAssetOperationLateReturnParent({ ...parent, departmentId: null, department: null }), { locationId: "loc-it", locationLabel: "IT-2 - ห้อง IT ชั้น 2", departmentId: null, departmentName: null })
})
