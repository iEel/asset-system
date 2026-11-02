import assert from "node:assert/strict"
import test from "node:test"

import type { AssetActionInput } from "../src/lib/asset-actions.ts"
import { splitAssetOperationSearchWords } from "../src/lib/asset-operation-search-rules.ts"
import { searchAssetScan, type AssetScanSearchDb } from "../src/lib/asset-scan-search.ts"
import {
  assetScanSearchLimit,
  assetScanSearchPath,
  buildAssetScanSearchHref,
  buildAssetScanSearchWheres,
  getAssetScanMatch,
  parseAssetScanSearch,
  rankAssetScanMatches,
  type AssetScanSearchAsset,
  type AssetScanSearchInput,
} from "../src/lib/asset-scan-search-rules.ts"

type Can = AssetActionInput["can"]
const editor: Can = { assetEdit: true, maintenanceCreate: true, maintenanceView: true, disposalView: true }
// The viewer (e2e/support/run-plan.ts): asset:view, maintenance:view, disposal:view, no edit and no create.
const viewer: Can = { assetEdit: false, maintenanceCreate: false, maintenanceView: true, disposalView: true }

function input(query: string): AssetScanSearchInput {
  const parsed = parseAssetScanSearch(new URLSearchParams(query))
  if ("error" in parsed) throw new Error(query)
  return parsed
}

function asset(id: string, overrides: Partial<AssetScanSearchAsset> = {}): AssetScanSearchAsset {
  return {
    id,
    assetTag: `GRL-COM-26-${id}`,
    name: `โน้ตบุ๊ก ${id}`,
    serialNumber: null,
    ownershipType: "personal",
    custodianId: null,
    status: { name: "Ready", nameTh: "พร้อมใช้งาน" },
    condition: { name: "Good", nameTh: "ดี" },
    custodian: null,
    currentLocation: { code: "IT-2", name: "ห้อง IT ชั้น 2", branch: { name: "สำนักงานใหญ่" } },
    model: null,
    ...overrides,
  }
}

type Args = { where: Record<string, unknown>; select?: unknown; orderBy?: unknown; take?: number }
type Facts = {
  checkouts?: Array<{ id: string; assetId: string; handoverMode: string | null }>
  repairs?: Array<{ id: string; assetId: string }>
  disposals?: Array<{ id: string; assetId: string }>
  outstanding?: Array<{ id: string; componentAssetId: string; referenceId: string | null }>
  installed?: Array<{ parentAssetId: string; componentAsset: { name: string } }>
}
function fakeDb(data: { exact?: AssetScanSearchAsset[]; prefix?: AssetScanSearchAsset[]; contains?: AssetScanSearchAsset[]; total?: number } & Facts = {}) {
  const calls: Array<{ call: string; args: Args }> = []
  const record = (call: string) => (raw: object) => {
    calls.push({ call, args: raw as Args })
  }
  const db: AssetScanSearchDb = {
    asset: {
      async findMany(raw: object) {
        record("asset.findMany")(raw)
        const or = (raw as Args).where.OR as Array<Record<string, unknown>> | undefined
        if (or && typeof or[0].assetTag === "string") return data.exact ?? []
        if (or && typeof or[0].assetTag === "object" && "startsWith" in (or[0].assetTag as object)) return data.prefix ?? []
        return data.contains ?? []
      },
      async count(raw: object) {
        record("asset.count")(raw)
        return data.total ?? 0
      },
    },
    assetCheckout: { async findMany(raw: object) { record("assetCheckout.findMany")(raw); return data.checkouts ?? [] } },
    maintenanceTicket: { async findMany(raw: object) { record("maintenanceTicket.findMany")(raw); return data.repairs ?? [] } },
    disposalRequest: { async findMany(raw: object) { record("disposalRequest.findMany")(raw); return data.disposals ?? [] } },
    assetComponent: {
      async findMany(raw: object) {
        record("assetComponent.findMany")(raw)
        return "componentAssetId" in (raw as Args).where ? data.outstanding ?? [] : data.installed ?? []
      },
    },
  }
  return { db, calls }
}

test("the constants, the path and the href (plan 4 Task 4)", () => {
  assert.deepEqual([assetScanSearchLimit, assetScanSearchPath], [8, "/api/assets/scan-search"])
  assert.equal(buildAssetScanSearchHref({ q: "SN 77", locale: "en" }), "/api/assets/scan-search?q=SN+77&locale=en")
  assert.equal(buildAssetScanSearchHref({ q: "SN-77", locale: "th" }), "/api/assets/scan-search?q=SN-77&locale=th")
})

test("the parse: 2-100 code points after trimming, the locale is en or else th", () => {
  assert.deepEqual(parseAssetScanSearch(new URLSearchParams("q=%20SN-77%20&locale=en")), { q: "SN-77", locale: "en" })
  assert.deepEqual(parseAssetScanSearch(new URLSearchParams("q=SN-77")), { q: "SN-77", locale: "th" })
  assert.deepEqual(parseAssetScanSearch(new URLSearchParams("q=SN-77&locale=fr")), { q: "SN-77", locale: "th" })
  for (const query of ["", "q=", "q=S", "q=%20S%20", `q=${"ก".repeat(101)}`]) {
    assert.deepEqual(parseAssetScanSearch(new URLSearchParams(query)), { error: "Invalid search" }, query)
  }
  assert.deepEqual(parseAssetScanSearch(new URLSearchParams(`q=${"ก".repeat(100)}`)), { q: "ก".repeat(100), locale: "th" })
})

test("the wheres: active assets, at most 5 words AND-ed over tag, Serial, name, holder, room and model; the tiers use tag and Serial", () => {
  const wheres = buildAssetScanSearchWheres(input("q=a1 b2 c3 d4 e5 f6"))
  const text = wheres.text as { isActive: boolean; AND: Array<{ OR: unknown[] }> }
  assert.equal(text.isActive, true)
  assert.equal(text.AND.length, 5)
  assert.deepEqual(text.AND[0].OR, [
    { assetTag: { contains: "a1" } },
    { serialNumber: { contains: "a1" } },
    { name: { contains: "a1" } },
    { custodian: { code: { contains: "a1" } } },
    { custodian: { fullNameTh: { contains: "a1" } } },
    { currentLocation: { code: { contains: "a1" } } },
    { currentLocation: { name: { contains: "a1" } } },
    { model: { name: { contains: "a1" } } },
  ])
  assert.ok(!JSON.stringify(text).includes("f6"), "the sixth word is dropped")
  const q = "a1 b2 c3 d4 e5 f6"
  assert.deepEqual(wheres.exact, { isActive: true, OR: [{ assetTag: q }, { serialNumber: q }] })
  assert.deepEqual(wheres.prefix, { isActive: true, OR: [{ assetTag: { startsWith: q } }, { serialNumber: { startsWith: q } }] })

  const one = buildAssetScanSearchWheres(input("q=SN-77")).text as Record<string, unknown>
  assert.equal(one.isActive, true)
  assert.ok(Array.isArray(one.OR) && !("AND" in one))
})

test("the matched field: the whole text in P4-R7 order (tag, Serial, name, holder, room, model), else the first word's field", () => {
  const laptop = asset("1", {
    assetTag: "GRL-COM-26-0007",
    serialNumber: "SN-7781",
    name: "Dell Latitude 5440",
    custodian: { code: "E1234", fullNameTh: "สมชาย ใจดี", department: { name: "บัญชี" } },
    currentLocation: { code: "ACC-3", name: "ห้องบัญชี ชั้น 3", branch: { name: "สำนักงานใหญ่" } },
    model: { name: "Latitude 5440 Pro" },
  })
  const match = (q: string) => getAssetScanMatch(laptop, q, splitAssetOperationSearchWords(q))
  assert.deepEqual(match("SN-77"), { field: "serial", text: "SN-7781" })
  assert.deepEqual(match("sn-77"), { field: "serial", text: "SN-7781" })
  assert.deepEqual(match("0007"), { field: "tag", text: "GRL-COM-26-0007" })
  assert.deepEqual(match("สมชาย"), { field: "holder", text: "สมชาย ใจดี" })
  assert.deepEqual(match("E1234"), { field: "holder", text: "E1234" })
  assert.deepEqual(match("ห้องบัญชี"), { field: "room", text: "ห้องบัญชี ชั้น 3" })
  assert.deepEqual(match("ACC-3"), { field: "room", text: "ACC-3" })
  // "Latitude" is in the name and the model: the name comes first.
  assert.deepEqual(match("Latitude"), { field: "name", text: "Dell Latitude 5440" })
  assert.deepEqual(match("Pro"), { field: "model", text: "Latitude 5440 Pro" })
  // Two words in two fields: the whole text is in none, so the first word's field.
  assert.deepEqual(match("สมชาย Latitude"), { field: "holder", text: "สมชาย ใจดี" })
  assert.deepEqual(match("Latitude สมชาย"), { field: "name", text: "Dell Latitude 5440" })
})

test("the ranking: exact, then prefix, then contains, each asset once, at most 8", () => {
  const rows = (prefix: string, count: number) => Array.from({ length: count }, (_, index) => ({ id: `${prefix}${index}` }))
  const ranked = rankAssetScanMatches({ exact: [{ id: "x" }], prefix: [{ id: "x" }, { id: "p" }], contains: [{ id: "p" }, ...rows("c", 10)] })
  assert.deepEqual(ranked.map((row) => row.id), ["x", "p", "c0", "c1", "c2", "c3", "c4", "c5"])
})

test("8 rows take exactly 9 reads: 3 tiers and the count, then the 5 facts, each `in` list at most 8 ids (Review Focus 3)", async () => {
  const contains = Array.from({ length: 12 }, (_, index) => asset(String(index).padStart(4, "0")))
  const { db, calls } = fakeDb({ exact: [contains[5]], prefix: [contains[3]], contains, total: 37 })
  const answer = await searchAssetScan(db, input("q=GRL-COM"), editor)

  assert.equal(answer.total, 37)
  assert.deepEqual(answer.rows.map((row) => row.id), ["0005", "0003", "0000", "0001", "0002", "0004", "0006", "0007"])
  assert.deepEqual(calls.map((entry) => entry.call).sort(), [
    "asset.count",
    "asset.findMany",
    "asset.findMany",
    "asset.findMany",
    "assetCheckout.findMany",
    "assetComponent.findMany",
    "assetComponent.findMany",
    "disposalRequest.findMany",
    "maintenanceTicket.findMany",
  ])
  for (const { call, args } of calls.filter((entry) => entry.call === "asset.findMany")) {
    assert.equal(args.take, 8, call)
    assert.deepEqual(args.orderBy, { assetTag: "asc" })
  }
  assert.deepEqual(calls.find((entry) => entry.call === "asset.count")?.args.where, buildAssetScanSearchWheres(input("q=GRL-COM")).text)
  const factCalls = calls.filter((entry) => !entry.call.startsWith("asset."))
  for (const { call, args } of factCalls) {
    // The asset ids' list (an open disposal's where has a list of request states too).
    const lists = [...JSON.stringify(args.where).matchAll(/"in":\[([^\]]*)\]/g)].map((list) => list[1].split(",")).filter((list) => list[0].startsWith('"0'))
    assert.equal(lists.length, 1, call)
    assert.deepEqual(lists[0].map((id) => JSON.parse(id)), answer.rows.map((row) => row.id), call)
  }
})

test("no match reads no facts", async () => {
  const { db, calls } = fakeDb({ total: 0 })
  assert.deepEqual(await searchAssetScan(db, input("q=nothing"), editor), { total: 0, rows: [] })
  assert.equal(calls.length, 4)
})

test("a row: the name, the hrefs, the labels in the page's language, the holder line, the room, the components and the match", async () => {
  const held = asset("a1", {
    assetTag: "GRL-COM-26-0007",
    serialNumber: "SN-77",
    name: "Dell Latitude 5440",
    custodianId: "emp-1",
    status: { name: "In Use", nameTh: "ใช้งานอยู่" },
    custodian: { code: "E1234", fullNameTh: "สมชาย ใจดี", department: { name: "บัญชี" } },
  })
  const shared = asset("a2", { ownershipType: "shared", serialNumber: "SN-770", currentLocation: { code: "MR-1", name: "ห้องประชุม", branch: { name: "สาขาระยอง" } } })
  const facts: Facts = {
    installed: [
      { parentAssetId: "a1", componentAsset: { name: "Adapter 65W" } },
      { parentAssetId: "a1", componentAsset: { name: "Mouse ไร้สาย" } },
      { parentAssetId: "a1", componentAsset: { name: "RAM 16GB" } },
      { parentAssetId: "a1", componentAsset: { name: "SSD 1TB" } },
    ],
  }
  const th = await searchAssetScan(fakeDb({ exact: [held], prefix: [held, shared], contains: [held, shared], total: 2, ...facts }).db, input("q=sn-77"), editor)
  const [first, second] = th.rows
  assert.deepEqual(
    [first.id, first.assetTag, first.name, first.serialNumber, first.href, first.printLabelHref],
    ["a1", "GRL-COM-26-0007", "Dell Latitude 5440", "SN-77", "/th/assets/a1", "/th/assets/a1/label"],
  )
  assert.deepEqual([first.status, first.condition], [{ name: "In Use", label: "ใช้งานอยู่" }, { name: "Good", label: "ดี" }])
  assert.deepEqual(first.holder, { kind: "holder", name: "สมชาย ใจดี", department: "บัญชี" })
  assert.deepEqual(first.room, { name: "ห้อง IT ชั้น 2", branchName: "สำนักงานใหญ่" })
  assert.deepEqual(first.components, { count: 4, names: ["Adapter 65W", "Mouse ไร้สาย", "RAM 16GB"] })
  assert.deepEqual([first.match, first.exact], [{ field: "serial", text: "SN-77" }, true])
  // A prefix hit is not exact (P4-R2: Enter opens only an exact tag or Serial).
  assert.deepEqual([second.exact, second.holder, second.components], [false, { kind: "shared" }, { count: 0, names: [] }])
  assert.deepEqual(second.room, { name: "ห้องประชุม", branchName: "สาขาระยอง" })

  const en = await searchAssetScan(fakeDb({ exact: [held], total: 1 }).db, input("q=GRL-COM-26-0007&locale=en"), editor)
  assert.deepEqual([en.rows[0].status.label, en.rows[0].condition.label, en.rows[0].href, en.rows[0].exact], ["In Use", "Good", "/en/assets/a1", true])
})

test("the editor's actions: built with the scan page's returnTo, the facts reach the rule, unavailable ones are left out (P4-R7)", async () => {
  const ready = asset("r1")
  const handedOver = asset("h1", { status: { name: "In Use", nameTh: "ใช้งานอยู่" }, custodianId: "emp-1" })
  const { db } = fakeDb({
    contains: [ready, handedOver],
    total: 2,
    checkouts: [{ id: "co-1", assetId: "h1", handoverMode: "permanent_assignment" }],
  })
  const [readyRow, heldRow] = (await searchAssetScan(db, input("q=GRL"), editor)).rows
  const returnTo = encodeURIComponent("/th/asset-management/scan")

  assert.equal(readyRow.actions.primary?.key, "checkout")
  assert.equal(readyRow.actions.primary?.href, `/th/asset-management/checkout?assetId=r1&returnTo=${returnTo}`)
  // รับคืน cannot run on a Ready asset with no holder: it is left out, not shown as unavailable.
  assert.deepEqual(readyRow.actions.transactions.map((action) => [action.key, action.enabled]), [["transfer", true]])
  assert.equal(readyRow.actions.transactions[0].href, `/th/asset-management/transfer?assetId=r1&returnTo=${returnTo}`)
  assert.ok(readyRow.actions.transactions.every((action) => action.enabled && action.href !== null))

  assert.equal(heldRow.actions.primary?.key, "checkin")
  assert.equal(heldRow.actions.primary?.href, `/th/asset-management/checkin?checkoutId=co-1&returnTo=${returnTo}`)
  assert.ok(heldRow.actions.transactions.every((action) => action.enabled))
  // บันทึกซ่อม comes from getAssetRecordRepairAction, without a returnTo.
  assert.deepEqual(
    [heldRow.recordRepair?.key, heldRow.recordRepair?.href],
    ["recordRepair", "/th/maintenance/new?assetId=h1"],
  )
})

test("an open repair, disposal or outstanding link reaches the rule (one read each, the newest per asset)", async () => {
  const repairing = asset("m1", { status: { name: "Under Maintenance", nameTh: "อยู่ระหว่างซ่อม" } })
  const disposing = asset("d1", { status: { name: "Pending Disposal", nameTh: "รอตัดจำหน่าย" } })
  const outstanding = asset("o1", { ownershipType: "component", status: { name: "In Use", nameTh: "ใช้งานอยู่" } })
  const { db } = fakeDb({
    contains: [repairing, disposing, outstanding],
    total: 3,
    repairs: [{ id: "mt-new", assetId: "m1" }, { id: "mt-old", assetId: "m1" }],
    disposals: [{ id: "dr-1", assetId: "d1" }],
    outstanding: [{ id: "link-1", componentAssetId: "o1", referenceId: "ci-1" }],
  })
  const [m, d, o] = (await searchAssetScan(db, input("q=GRL"), editor)).rows
  assert.deepEqual([m.actions.primary?.key, m.actions.primary?.href], ["viewRepair", "/th/maintenance/mt-new"])
  assert.deepEqual([d.actions.primary?.key, d.actions.primary?.href], ["viewDisposal", "/th/disposal/dr-1"])
  assert.equal(o.actions.primary?.key, "checkin")
  assert.match(o.actions.primary?.href ?? "", /^\/th\/asset-management\/checkin\?assetId=o1&returnTo=/)
})

test("the viewer's card has no transaction and no บันทึกซ่อม; พิมพ์ป้าย stays (asset:view)", async () => {
  const handedOver = asset("h1", { status: { name: "In Use", nameTh: "ใช้งานอยู่" }, custodianId: "emp-1" })
  const ready = asset("r1")
  const { db } = fakeDb({ contains: [handedOver, ready], total: 2, checkouts: [{ id: "co-1", assetId: "h1", handoverMode: "permanent_assignment" }] })
  for (const row of (await searchAssetScan(db, input("q=GRL"), viewer)).rows) {
    assert.deepEqual([row.actions.primary, row.actions.transactions, row.recordRepair], [null, [], null], row.id)
    assert.equal(row.printLabelHref, `/th/assets/${row.id}/label`)
  }
})
