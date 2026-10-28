import assert from "node:assert/strict"
import test from "node:test"

import { searchAssetOperationOptions, type AssetOperationSearchDb } from "../src/lib/asset-operation-search.ts"
import {
  buildAssetOperationSearchWheres, parseAssetOperationSearch,
  type AssetOperationSearchAsset, type AssetOperationSearchCheckoutRecord, type AssetOperationSearchInput,
} from "../src/lib/asset-operation-search-rules.ts"

function input(query: string): AssetOperationSearchInput {
  const parsed = parseAssetOperationSearch(new URLSearchParams(query))
  if ("error" in parsed) throw new Error(query)
  return parsed
}
const somchai = { code: "EMP-0412", fullNameTh: "สมชาย ใจดี" }
const inUse = { name: "In Use", nameTh: "ใช้งานอยู่" }
function asset(tag: string, overrides: Partial<AssetOperationSearchAsset> = {}): AssetOperationSearchAsset {
  return {
    id: `id-${tag}`, assetTag: tag, name: `ชื่อ ${tag}`, serialNumber: null, ownershipType: "personal", custodianId: null,
    currentLocationId: "loc-1", conditionId: "cond-1", status: { name: "Ready", nameTh: "พร้อมใช้งาน" },
    currentLocation: { code: "IT-2", name: "ห้อง IT ชั้น 2" }, custodian: null, ...overrides,
  }
}
function checkout(overrides: Partial<AssetOperationSearchCheckoutRecord>): AssetOperationSearchCheckoutRecord {
  return {
    id: "co-1", assetId: "asset-1", documentNo: "HO-2026-0151", checkoutType: "user", handoverMode: "permanent_assignment",
    checkoutDate: new Date("2026-03-12T00:00:00.000Z"), expectedReturnDate: null, conditionBefore: "cond-1", remark: null,
    custodianId: "emp-1", departmentId: null, locationId: null, parentAssetId: null, custodian: somchai, ...overrides,
  }
}

type Where = { id?: string | { in: string[] }; assetId?: { in: string[] }; OR?: Array<{ assetTag?: unknown }> } & Record<string, unknown>
type Args = { where: Where; select?: unknown; orderBy?: unknown; take?: number }
function fakeDb(data: {
  exact?: AssetOperationSearchAsset[]; held?: AssetOperationSearchAsset[]; prefix?: AssetOperationSearchAsset[]; contains?: AssetOperationSearchAsset[]; total?: number
  checkouts?: AssetOperationSearchCheckoutRecord[]; repairAssetIds?: string[]
} = {}) {
  const calls: Array<{ call: string; args: Args }> = []
  const all = [...(data.exact ?? []), ...(data.held ?? []), ...(data.prefix ?? []), ...(data.contains ?? [])]
  const db: AssetOperationSearchDb = {
    asset: {
      async findMany(args: Args) {
        calls.push({ call: "asset.findMany", args })
        const { id } = args.where
        if (typeof id === "string") return all.filter((row) => row.id === id).slice(0, 1)
        if (id) return []   // the parent-asset labels
        if (args.where.AND) return data.held ?? []   // รับคืน's held tier (S-R45)
        const first = args.where.OR?.[0]?.assetTag
        if (typeof first === "string") return data.exact ?? []
        if (first && typeof first === "object" && "startsWith" in first) return data.prefix ?? []
        return data.contains ?? []
      },
      async count(args: Args) { calls.push({ call: "asset.count", args }); return data.total ?? 0 },
    },
    assetCheckout: { async findMany(args: Args) { calls.push({ call: "assetCheckout.findMany", args }); return (data.checkouts ?? []).filter((row) => args.where.assetId?.in.includes(row.assetId)) } },
    maintenanceTicket: { async findMany(args: Args) { calls.push({ call: "maintenanceTicket.findMany", args }); return (data.repairAssetIds ?? []).map((assetId) => ({ assetId })) } },
    department: { async findMany(args: Args) { calls.push({ call: "department.findMany", args }); return [{ id: "dep-1", code: "IT", name: "ฝ่ายไอที" }] } },
    location: { async findMany(args: Args) { calls.push({ call: "location.findMany", args }); return [] } },
  }
  return { db, calls }
}

test("a text search: three reads of 20 by tag and one count; 20 rows, the exact code first, the true total; facts for those 20 ids only (spec 6.1, 6.2)", async () => {
  const contains = Array.from({ length: 20 }, (_, index) => asset(`AAA-${String(index).padStart(2, "0")}-0228`))
  const { db, calls } = fakeDb({ exact: [asset("SNI-EQU-25-0228")], contains, total: 134 })
  const answer = await searchAssetOperationOptions(db, input("mode=checkout&q=0228"))
  assert.deepEqual([answer.mode, answer.total, answer.rows.length, answer.rows[0].assetTag, answer.rows[19].assetTag, "groups" in answer],
    ["checkout", 134, 20, "SNI-EQU-25-0228", "AAA-18-0228", false])
  const lists = calls.filter((call) => call.call === "asset.findMany")
  assert.equal(lists.length, 3)
  for (const list of lists) assert.deepEqual([list.args.take, list.args.orderBy], [20, { assetTag: "asc" }])
  assert.deepEqual(calls.filter((call) => call.call === "asset.count").map((call) => call.args.where), [buildAssetOperationSearchWheres(input("mode=checkout&q=0228")).text])
  const ids = answer.rows.map((row) => row.id)
  assert.deepEqual(calls.find((call) => call.call === "assetCheckout.findMany")?.args.where, { assetId: { in: ids }, isReturned: false, transactionStatus: "active" })
  assert.deepEqual(calls.find((call) => call.call === "maintenanceTicket.findMany")?.args.where, { isActive: true, repairStatus: { notIn: ["closed", "cancelled"] }, assetId: { in: ids } })
  assert.equal(calls.some((call) => call.call === "department.findMany" || call.call === "location.findMany"), false)
})

test("an open handover or an open repair reaches the row: the handover listed, not takeable, with the asset page's reason; the repair flagged on รับคืน (spec 6.3, S-R43)", async () => {
  const handedOver = fakeDb({ contains: [asset("SNI-EQU-25-0228", { id: "asset-1" })], total: 1, checkouts: [checkout({ assetId: "asset-1" })] })
  const [row] = (await searchAssetOperationOptions(handedOver.db, input("mode=checkout&q=0228"))).rows
  assert.deepEqual([row.eligible, row.reasonKey], [false, "asset.transactionReasonOpenCheckoutHandover"])
  const repaired = fakeDb({
    contains: [asset("SNI-COM-23-02281", { id: "asset-2", custodianId: "emp-1", custodian: somchai, status: inUse })], total: 1,
    checkouts: [checkout({ assetId: "asset-2" })], repairAssetIds: ["asset-2"],
  })
  const [returning] = (await searchAssetOperationOptions(repaired.db, input("mode=checkin&q=0228"))).rows
  // S-R43: the handover's return takes the open repair, and the row says so for the form's ส่งซ่อม.
  assert.deepEqual([returning.eligible, returning.reasonKey, returning.checkout?.documentNo, returning.openRepair], [true, null, "HO-2026-0151", true])
})

test("by id: one read of one active asset, no count, the same verdict (spec 6.4, S-R5)", async () => {
  const { db, calls } = fakeDb({ contains: [asset("SNI-EQU-25-0228", { id: "asset-1", status: inUse })] })
  const answer = await searchAssetOperationOptions(db, input("mode=checkout&id=asset-1"))
  assert.deepEqual(calls.filter((call) => call.call.startsWith("asset.")).map((call) => [call.call, call.args.where, call.args.take]),
    [["asset.findMany", { isActive: true, id: "asset-1" }, 1]])
  assert.deepEqual([answer.total, answer.rows[0].eligible, answer.rows[0].reasonKey], [1, false, "asset.transactionReasonStatusNotReady"])
})

test("nothing found: no further reads; รับคืน answers an empty group list (spec 6.1)", async () => {
  const { db, calls } = fakeDb()
  assert.deepEqual(await searchAssetOperationOptions(db, input("mode=bulkMove&q=zz")), { mode: "bulkMove", total: 0, rows: [] })
  assert.equal(calls.some((call) => call.call === "assetCheckout.findMany" || call.call === "maintenanceTicket.findMany"), false)
  assert.deepEqual(await searchAssetOperationOptions(fakeDb().db, input("mode=checkin&q=zz")), { mode: "checkin", total: 0, rows: [], groups: [] })
})

test("รับคืน: a person's handover and ข้อมูลเก่า under the person, a department handover under the department, nothing to return last; labels read by id only when needed (S-R4)", async () => {
  const { db, calls } = fakeDb({
    contains: [
      asset("A-1", { id: "a1", custodianId: "emp-1", custodian: somchai, status: inUse }),
      asset("A-2", { id: "a2", status: { name: "Checked Out", nameTh: "ถูกยืม" } }),
      asset("A-3", { id: "a3" }),
      asset("A-4", { id: "a4", custodianId: "emp-1", custodian: somchai, status: inUse }),
    ],
    total: 4,
    checkouts: [
      checkout({ id: "co-1", assetId: "a1" }),
      checkout({ id: "co-2", assetId: "a2", checkoutType: "department", handoverMode: "temporary_loan", custodianId: null, custodian: null, departmentId: "dep-1" }),
    ],
  })
  const answer = await searchAssetOperationOptions(db, input("mode=checkin&q=A-"))
  assert.deepEqual(answer.groups, [
    { key: "employee:emp-1", label: "EMP-0412 - สมชาย ใจดี", count: 2 },
    { key: "department:dep-1", label: "IT - ฝ่ายไอที", count: 1 },
    { key: "none", label: null, count: 1 },
  ])
  assert.deepEqual(answer.rows.map((row) => [row.assetTag, row.holderKey, row.checkout?.id ?? null, row.legacy ?? false, row.holderEmployeeId, row.eligible]), [
    ["A-1", "employee:emp-1", "co-1", false, "emp-1", true],
    ["A-4", "employee:emp-1", null, true, "emp-1", true],
    ["A-2", "department:dep-1", "co-2", false, null, true],
    ["A-3", "none", null, false, null, false],
  ])
  assert.deepEqual(calls.filter((call) => call.call === "department.findMany").map((call) => call.args.where), [{ id: { in: ["dep-1"] } }])
  assert.equal(calls.some((call) => call.call === "location.findMany"), false)
  assert.equal(calls.filter((call) => call.call === "asset.findMany").length, 4)   // four tiers, no parent-asset read
})

test("รับคืน: held rows come right after the exact code, so 25 unheld rows ahead by tag never push them out of the 20 (S-R45)", async () => {
  const none = Array.from({ length: 25 }, (_, index) => asset(`A-${String(index).padStart(2, "0")}`, { id: `n${index}` }))
  const heldRows = [
    asset("Z-1", { id: "h1", custodianId: "emp-1", custodian: somchai, status: inUse }),
    asset("Z-2", { id: "h2", status: { name: "Checked Out", nameTh: "ถูกยืม" } }),
  ]
  const { db, calls } = fakeDb({ held: heldRows, contains: none.slice(0, 20), total: 27, checkouts: [checkout({ id: "co-2", assetId: "h2" })] })
  const query = input("mode=checkin&q=A-")
  const answer = await searchAssetOperationOptions(db, query)
  assert.equal(answer.rows.length, 20)
  assert.ok(answer.rows.some((row) => row.id === "h1") && answer.rows.some((row) => row.id === "h2"), "both held rows are in the 20")
  assert.deepEqual(answer.groups?.map((group) => group.key), ["employee:emp-1", "none"])
  assert.equal(answer.total, 27)
  const lists = calls.filter((call) => call.call === "asset.findMany")
  assert.equal(lists.length, 4)
  for (const list of lists) assert.deepEqual([list.args.take, list.args.orderBy], [20, { assetTag: "asc" }])
  assert.ok(lists.some((list) => JSON.stringify(list.args.where) === JSON.stringify(buildAssetOperationSearchWheres(query).held)), "the held where is read")
  for (const call of calls) {
    const ids = (call.args.where.assetId ?? call.args.where.id) as { in?: string[] } | undefined
    if (ids && typeof ids === "object" && ids.in) assert.ok(ids.in.length <= 20, call.call)
  }
})
