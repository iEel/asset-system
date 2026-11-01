import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import test from "node:test"

import { getApiErrorKey } from "../src/lib/api-error-catalog.ts"
import { readBulkMoveListPage, readBulkMovePageOptions, type BulkMoveListDb } from "../src/lib/bulk-move-list.ts"
import {
  bulkMoveListAssetSelect, bulkMoveListPageSize, buildBulkMoveListWhere, type BulkMoveListAsset, type BulkMoveListInput,
} from "../src/lib/bulk-move-list-rules.ts"

function asset(tag: string, overrides: Partial<BulkMoveListAsset> = {}): BulkMoveListAsset {
  return {
    id: `id-${tag}`, assetTag: tag, name: `ชื่อ ${tag}`, serialNumber: null, ownershipType: "personal", modelId: null, custodianId: null,
    currentLocationId: "loc-it2", conditionId: "cond-1", status: { name: "Ready", nameTh: "พร้อมใช้งาน" }, condition: { name: "Good" },
    currentLocation: { code: "IT-2", name: "ห้อง IT ชั้น 2" }, custodian: null, category: { code: "NB", name: "โน้ตบุ๊ก" }, branchId: "br-hq",
    ...overrides,
  }
}
const tags = (count: number) => Array.from({ length: count }, (_, index) => `BM-${String(index + 1).padStart(3, "0")}`)
const input = (overrides: Partial<BulkMoveListInput> = {}): BulkMoveListInput => ({ q: "", locationId: null, categoryId: null, page: 1, ...overrides })

type Args = { where: Record<string, unknown>; select?: unknown; orderBy?: unknown; skip?: number; take?: number }
type InstalledLink = { parentAssetId: string; componentAssetId: string; componentAsset: { currentLocationId: string | null; _count: { checkouts: number } } }
type ParentLink = { componentAssetId: string; parentAssetId: string; parentAsset: { assetTag: string } }
// The fake stands in for SQL: it returns what the where would match, and the tests pin each where exactly.
function fakeDb(data: {
  assets?: BulkMoveListAsset[]; checkouts?: Array<{ id: string; assetId: string; handoverMode: string | null }>
  outstanding?: Array<{ id: string; componentAssetId: string; referenceId: string | null }>; installed?: InstalledLink[]; parents?: ParentLink[]
  rooms?: Array<{ id: string; code: string; name: string; branchId: string }>; categories?: Array<{ id: string; code: string; name: string }>
} = {}) {
  const calls: Array<{ call: string; args: Args }> = []
  const within = (args: Args, field: string, value: string) => (args.where[field] as { in: string[] }).in.includes(value)
  const db: BulkMoveListDb = {
    asset: {
      async findMany(args: Args) { calls.push({ call: "asset.findMany", args }); return (data.assets ?? []).slice(args.skip, (args.skip ?? 0) + (args.take ?? 0)) },
      async count(args: Args) { calls.push({ call: "asset.count", args }); return (data.assets ?? []).length },
    },
    assetCheckout: { async findMany(args: Args) { calls.push({ call: "checkouts", args }); return (data.checkouts ?? []).filter((row) => within(args, "assetId", row.assetId)) } },
    assetComponent: {
      async findMany(args: Args) {
        if (args.where.status === "outstanding") { calls.push({ call: "outstanding", args }); return (data.outstanding ?? []).filter((row) => within(args, "componentAssetId", row.componentAssetId)) }
        if (args.where.parentAssetId) { calls.push({ call: "installed", args }); return (data.installed ?? []).filter((row) => within(args, "parentAssetId", row.parentAssetId)) }
        calls.push({ call: "parents", args }); return (data.parents ?? []).filter((row) => within(args, "componentAssetId", row.componentAssetId))
      },
    },
    location: { async findMany(args: Args) { calls.push({ call: "location.findMany", args }); return data.rooms ?? [] } },
    assetCategory: { async findMany(args: Args) { calls.push({ call: "assetCategory.findMany", args }); return data.categories ?? [] } },
  }
  return { db, calls }
}
const open = { isReturned: false, transactionStatus: "active" }

test("a page counts the matches and reads 25 rows by tag then id, with the list's where (group 3 spec §10.1, §10.3; P4-R11)", async () => {
  const { db, calls } = fakeDb({ assets: tags(30).map((tag) => asset(tag)) })
  const query = input({ q: "notebook บัญชี", locationId: "loc-it2", categoryId: "cat-nb" })
  const page = await readBulkMoveListPage(db, query)
  const where = buildBulkMoveListWhere(query)
  assert.deepEqual(calls.find((call) => call.call === "asset.count")?.args, { where })
  assert.deepEqual(calls.find((call) => call.call === "asset.findMany")?.args,
    { where, select: bulkMoveListAssetSelect, orderBy: [{ assetTag: "asc" }, { id: "asc" }], skip: 0, take: 25 })
  assert.deepEqual([page.total, page.page, page.pageSize, page.rows.length, page.rows[0].assetTag, page.rows[24].assetTag],
    [30, 1, bulkMoveListPageSize, 25, "BM-001", "BM-025"])
})

test("past page 1 the count comes first and a page past the last is clamped to it; an empty list answers page 1 with no fact read (group 3 spec §10.1; P4-R11)", async () => {
  for (const asked of [2, 5, 1_000_000_000]) {
    const { db, calls } = fakeDb({ assets: tags(30).map((tag) => asset(tag)) })
    const page = await readBulkMoveListPage(db, input({ page: asked }))
    assert.deepEqual([page.page, page.total, page.rows.length, page.rows[0].assetTag], [2, 30, 5, "BM-026"], `page ${asked}`)
    // One row read, already at the clamped page: no skip past the end ever reaches the database.
    assert.deepEqual(calls.filter((call) => call.call.startsWith("asset.")).map((call) => [call.call, call.args.skip]),
      [["asset.count", undefined], ["asset.findMany", 25]], `page ${asked}`)
  }
  for (const asked of [1, 3]) {
    const { db, calls } = fakeDb()
    assert.deepEqual(await readBulkMoveListPage(db, input({ page: asked })), { total: 0, page: 1, pageSize: 25, rows: [] })
    assert.deepEqual(calls.filter((call) => !call.call.startsWith("asset.")), [], `page ${asked}: no fact read`)
  }
})

test("the fact reads ask only the page's 25 ids: open handovers, outstanding links, the sync's installed links and the links holding the page's components (group 3 spec §10.3; P4-R2, bounded reads)", async () => {
  const { db, calls } = fakeDb({ assets: tags(30).map((tag) => asset(tag)) })
  await readBulkMoveListPage(db, input())
  const ids = tags(25).map((tag) => `id-${tag}`)
  const argsOf = (name: string) => { const found = calls.filter((call) => call.call === name); assert.equal(found.length, 1, name); return found[0].args }
  assert.deepEqual(argsOf("checkouts"), { where: { assetId: { in: ids }, ...open }, select: { id: true, assetId: true, handoverMode: true }, orderBy: { checkoutDate: "desc" } })
  assert.deepEqual(argsOf("outstanding"), {
    where: { componentAssetId: { in: ids }, status: "outstanding", removedAt: null }, select: { id: true, componentAssetId: true, referenceId: true },
    orderBy: [{ updatedAt: "desc" }, { id: "asc" }],
  })
  // syncInstalledComponentsWithParent's own filter, with each component's open handover counted in the same query.
  assert.deepEqual(argsOf("installed"), {
    where: { parentAssetId: { in: ids }, status: "installed", removedAt: null, componentAsset: { isActive: true } },
    select: { parentAssetId: true, componentAssetId: true, componentAsset: { select: { currentLocationId: true, _count: { select: { checkouts: { where: open } } } } } },
  })
  assert.deepEqual(argsOf("parents"), {
    where: { componentAssetId: { in: ids }, status: "installed", removedAt: null, parentAsset: { isActive: true } },
    select: { componentAssetId: true, parentAssetId: true, parentAsset: { select: { assetTag: true } } },
    orderBy: [{ updatedAt: "desc" }, { id: "asc" }],
  })
  assert.equal(calls.length, 6)
})

test("each row gets its facts: an open handover or an outstanding link refuses it, a parent lists what its sync would move, once each and none handed over, and an installed ส่วนควบ names its parent (group 3 spec §10.1; P4-R1, P4-R2, P4-R7)", async () => {
  const { db } = fakeDb({
    assets: [asset("LOAN-001"), asset("MON-001", { ownershipType: "component" }), asset("OUT-001", { ownershipType: "component" }), asset("PC-001")],
    checkouts: [{ id: "co-new", assetId: "id-LOAN-001", handoverMode: "temporary_loan" }, { id: "co-old", assetId: "id-LOAN-001", handoverMode: "permanent_assignment" }],
    outstanding: [{ id: "link-out", componentAssetId: "id-OUT-001", referenceId: "rt-1" }],
    installed: [
      { parentAssetId: "id-PC-001", componentAssetId: "id-MON-001", componentAsset: { currentLocationId: "loc-it2", _count: { checkouts: 0 } } },
      { parentAssetId: "id-PC-001", componentAssetId: "id-RAM-001", componentAsset: { currentLocationId: "loc-store", _count: { checkouts: 0 } } },
      { parentAssetId: "id-PC-001", componentAssetId: "id-RAM-001", componentAsset: { currentLocationId: "loc-store", _count: { checkouts: 0 } } },
      { parentAssetId: "id-PC-001", componentAssetId: "id-KB-001", componentAsset: { currentLocationId: "loc-it2", _count: { checkouts: 1 } } },
      // A refused parent's installed component: the route refuses LOAN-001, so nothing travels with it (Z14).
      { parentAssetId: "id-LOAN-001", componentAssetId: "id-SSD-001", componentAsset: { currentLocationId: "loc-it2", _count: { checkouts: 0 } } },
    ],
    parents: [
      { componentAssetId: "id-MON-001", parentAssetId: "id-PC-001", parentAsset: { assetTag: "PC-001" } },
      { componentAssetId: "id-MON-001", parentAssetId: "id-PC-OLD", parentAsset: { assetTag: "PC-OLD" } },
    ],
  })
  const rows = new Map((await readBulkMoveListPage(db, input())).rows.map((row) => [row.assetTag, row]))
  const facts = (tag: string) => { const row = rows.get(tag)!; return [row.eligible, row.reasonKey, row.travellingComponents, row.componentOf] }
  assert.deepEqual(facts("LOAN-001"), [false, "asset.transactionReasonOpenCheckoutBulkMove", [], null])
  assert.deepEqual(facts("OUT-001"), [false, "asset.transactionReasonComponentOutstanding", [], null])
  assert.deepEqual(facts("MON-001"), [true, null, [], { parentId: "id-PC-001", parentTag: "PC-001" }], "the newest installed link names the parent")
  assert.deepEqual(facts("PC-001"), [true, null, [{ id: "id-MON-001", currentLocationId: "loc-it2" }, { id: "id-RAM-001", currentLocationId: "loc-store" }], null])
})

test("the page's options: active rooms with their branch and active categories, each 'code - name', by code (group 3 spec §10.3; P4-R14, P4-R21)", async () => {
  const { db, calls } = fakeDb({
    rooms: [{ id: "loc-cm", code: "CM-01", name: "ห้องประชุม", branchId: "br-cm" }, { id: "loc-it2", code: "IT-2", name: "ห้อง IT ชั้น 2", branchId: "br-hq" }],
    categories: [{ id: "cat-nb", code: "NB", name: "โน้ตบุ๊ก" }],
  })
  assert.deepEqual(await readBulkMovePageOptions(db), {
    rooms: [{ id: "loc-cm", label: "CM-01 - ห้องประชุม", branchId: "br-cm" }, { id: "loc-it2", label: "IT-2 - ห้อง IT ชั้น 2", branchId: "br-hq" }],
    categories: [{ id: "cat-nb", label: "NB - โน้ตบุ๊ก" }],
  })
  assert.deepEqual(calls.map((call) => [call.call, call.args]), [
    ["location.findMany", { where: { isActive: true }, select: { id: true, code: true, name: true, branchId: true }, orderBy: { code: "asc" } }],
    ["assetCategory.findMany", { where: { isActive: true }, select: { id: true, code: true, name: true }, orderBy: { code: "asc" } }],
  ])
})

test("the reader takes its db from the caller, reads nothing else, and orders by the rule file's order (group 3 spec §10.3; P4-R11, P4-R12)", () => {
  const source = readFileSync("src/lib/bulk-move-list.ts", "utf8")
  assert.doesNotMatch(source, /@\/lib\/db|getAssetOperationMasterOptions|from "@\//)
  assert.match(source, /orderBy: bulkMoveListOrderBy\b/)
  assert.doesNotMatch(source, /assetTag: "asc"/, "one order, in bulk-move-list-rules.ts (Z4)")
})

test("GET /api/asset-operations/bulk-move-list: asset:edit before any read, 'Invalid list' on a bad query, timed, { data } (group 3 spec §10.3, §17; P4-R11, P4-R25)", () => {
  const source = readFileSync("src/app/api/asset-operations/bulk-move-list/route.ts", "utf8")
  const steps = [
    "const user = await requireAuth()",
    'requirePermission(user, "asset", "edit")',
    "const input = parseBulkMoveListQuery(new URL(request.url).searchParams)",
    'if (!input) return NextResponse.json({ error: "Invalid list" }, { status: 400 })',
    "readBulkMoveListPage(prisma as unknown as BulkMoveListDb, input)",
    "return NextResponse.json({ data })",
    "return errorResponse(error)",
  ]
  const at = steps.map((step) => { const index = source.indexOf(step); assert.ok(index >= 0, step); return index })
  assert.deepEqual(at, [...at].sort((a, b) => a - b))
  assert.match(source, /withPerformanceTiming\(\s*"bulk-move-list"/)
  assert.doesNotMatch(source, /export async function (POST|PUT|PATCH|DELETE)\b/)
  assert.doesNotMatch(source, /input\.q[,\s]*}/, "the search text is never logged")
  assert.equal(getApiErrorKey("Invalid list"), "invalidRequest")
})
