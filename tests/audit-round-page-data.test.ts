import assert from "node:assert/strict"
import { existsSync, readFileSync } from "node:fs"
import * as nodeModule from "node:module"
import { beforeEach, test } from "node:test"
import { pathToFileURL } from "node:url"
import { isDeepStrictEqual } from "node:util"

import { withAuditRoundOwnItems } from "../src/lib/audit-round-counts-rules.ts"
import { auditRoundAnyFieldFindingWhere, auditRoundPersonDecidedFindingWhere } from "../src/lib/audit-round-page-rules.ts"
import { buildAuditRoundItemWhere, parseAuditRoundListFilters } from "../src/lib/audit-round-result-filters.ts"

type Args = { where?: unknown; by?: readonly string[]; skip?: number; take?: number; orderBy?: unknown; select?: unknown; include?: unknown }
type Call = { call: string; args: Args }
const state: { calls: Call[]; respond: (call: string, args: Args) => unknown } = { calls: [], respond: () => undefined }
Object.assign(globalThis, { __roundPageData: state })

const stubs = new Map<string, string>([
  ["@/lib/db", `
    const state = () => globalThis.__roundPageData
    const model = (name) => new Proxy({}, {
      get: (_, method) => async (args) => {
        const call = name + "." + String(method)
        state().calls.push({ call, args: args ?? {} })
        const value = state().respond(call, args ?? {})
        if (value !== undefined) return value
        if (method === "count") return 0
        if (method === "findMany" || method === "groupBy") return []
        return null
      },
    })
    export const prisma = new Proxy({}, { get: (_, key) => model(String(key)) })
  `],
])
;(nodeModule as unknown as { registerHooks(hooks: { resolve(specifier: string, context: unknown, next: (specifier: string, context: unknown) => unknown): unknown }): void }).registerHooks({
  resolve(specifier, context, next) {
    const stub = stubs.get(specifier)
    if (stub !== undefined) return { url: `data:text/javascript;charset=utf-8,${encodeURIComponent(stub)}`, shortCircuit: true }
    if (specifier.startsWith("@/")) {
      const base = `src/${specifier.slice(2)}`
      const file = [`${base}.ts`, `${base}.tsx`, `${base}/index.ts`].find((candidate) => existsSync(candidate))
      if (file) return { url: pathToFileURL(file).href, shortCircuit: true }
    }
    return next(specifier, context)
  },
})
const load = <T>(path: string) => import(pathToFileURL(path).href) as Promise<T>
const { getAuditRoundPageData } = await load<typeof import("../src/lib/audit-round-page-data.ts")>("src/lib/audit-round-page-data.ts")
const { getAuditRoundCloseChecklist } = await load<typeof import("../src/lib/audit-round-close.ts")>("src/lib/audit-round-close.ts")

const read = (path: string) => readFileSync(path, "utf8").replace(/\r\n/g, "\n")
const round = {
  id: "round-1", auditNo: "AUD-2026-0007", name: "ตรวจนับห้อง IT", status: "open",
  startDate: new Date("2026-10-01T00:00:00.000Z"), endDate: new Date("2026-10-31T00:00:00.000Z"),
  createdBy: "user-opener", cancelledAt: null, cancelledBy: null, cancelReason: null,
}
type ItemWhereInput = Parameters<typeof buildAuditRoundItemWhere>[0]
const itemWhere = (params: Record<string, string>, overrides: Partial<ItemWhereInput> = {}) =>
  buildAuditRoundItemWhere({ ...parseAuditRoundListFilters(params), ...overrides, roundId: "round-1" })
const roundWide = (overrides: Partial<ItemWhereInput>) => itemWhere({}, overrides)
const counted = (rows: Array<[string, string | null, number]>) => rows.map(([auditStatus, auditResult, count]) => ({ auditStatus, auditResult, _count: { _all: count } }))
const callsTo = (call: string) => state.calls.filter((entry) => entry.call === call).map((entry) => entry.args)
const hasWhere = (call: string, where: unknown) => callsTo(call).some((args) => isDeepStrictEqual(args.where, where))
const listCall = () => callsTo("auditItem.findMany").find((args) => args.skip !== undefined)
const ids = (args: Args | undefined, key: "id" | "assetId") => (args?.where as Record<string, { in: string[] }>)[key].in
const loadPage = (params: Record<string, string> = {}, options: { page?: number; userId?: string } = {}) =>
  getAuditRoundPageData({ roundId: "round-1", filters: parseAuditRoundListFilters(params), page: options.page ?? 1, pageSize: 25, user: { id: options.userId ?? "user-head" } })

beforeEach(() => {
  state.calls = []
  state.respond = (call) => (call === "auditRound.findFirst" ? round : undefined)
})

test("a missing round reads as no data and loads nothing else; the round is read without its items (spec §8, recon RP §1)", async () => {
  state.respond = () => undefined
  assert.equal(await loadPage(), null)
  assert.deepEqual(state.calls.map((entry) => entry.call), ["auditRound.findFirst"])
  assert.deepEqual(callsTo("auditRound.findFirst")[0], {
    where: { id: "round-1", isActive: true },
    select: { id: true, auditNo: true, name: true, status: true, startDate: true, endDate: true, createdBy: true, cancelledAt: true, cancelledBy: true, cancelReason: true },
  })
})

test("the result card and the walk are round-wide over the own items, out-of-scope finds apart: พบตรง + ไม่ตรง + ไม่พบ + รอตรวจ = ทั้งหมด (spec §5, §8, P2-R2)", async () => {
  state.respond = (call, args) => {
    if (call === "auditRound.findFirst") return round
    if (call === "auditItem.groupBy" && isDeepStrictEqual(args.where, { auditRoundId: "round-1" })) {
      return counted([["pending", null, 5], ["scanned", "found", 6], ["scanned", "confirmed_with_parent", 1], ["reviewed", "wrong_location", 1], ["reviewed", null, 1], ["reviewed", "not_found", 1], ["reviewed", "out_of_scope", 3]])
    }
    if (call === "auditFinding.count" && isDeepStrictEqual(args.where, { auditRoundId: "round-1", reviewStatus: "approved" })) return 4
    if (call === "auditScanHistory.count") return 12
    return undefined
  }
  const data = await loadPage({ categoryId: "cat-desk" })
  assert.ok(data)
  assert.deepEqual(callsTo("auditItem.groupBy").find((args) => isDeepStrictEqual(args.where, { auditRoundId: "round-1" }))?.by, ["auditStatus", "auditResult"])
  assert.deepEqual(data.resultCard, { all: 15, pending: 5, found: 7, mismatch: 2, notFound: 1, outOfScope: 3 })
  assert.equal(data.resultCard.found + data.resultCard.mismatch + data.resultCard.notFound + data.resultCard.pending, data.resultCard.all)
  assert.deepEqual(data.steps.walk, { checked: 10, total: 15, left: 5 })
  // The cancel dialog's work done stays the API's count (route.ts getCancellationImpact): every non-pending item.
  assert.deepEqual(data.cancelImpact, { pendingItems: 5, processedItems: 13, pendingFindings: 0, approvedFindings: 4, openActions: 0, scanHistoryRows: 12 })
  assert.ok(hasWhere("auditScanHistory.count", { auditRoundId: "round-1" }))
})

test("the list, its total, the result chips, the category chips and the ส่วนควบไม่ครบ chip each count with the list's own where (counts equal lists, spec §5)", async () => {
  const params = { result: "found", categoryId: "cat-desk", companyId: "co-1" }
  state.respond = (call, args) => {
    if (call === "auditRound.findFirst") return round
    if (call === "company.findUnique") return { code: "GLT", nameTh: "จีลิงค์" }
    if (call === "auditItem.groupBy" && isDeepStrictEqual(args.where, itemWhere(params, { result: "all" }))) return counted([["pending", null, 2], ["scanned", "found", 3]])
    if (call !== "auditItem.count") return undefined
    if (isDeepStrictEqual(args.where, itemWhere(params, { result: "out_of_scope" }))) return 1
    if (isDeepStrictEqual(args.where, itemWhere(params, { result: "pending_review" }))) return 4
    if (isDeepStrictEqual(args.where, itemWhere(params, { components: "missing" }))) return 1
    if (isDeepStrictEqual(args.where, itemWhere(params))) return 30
    return undefined
  }
  const data = await loadPage(params, { page: 2 })
  assert.ok(data)
  const list = listCall()
  assert.deepEqual(list?.where, itemWhere(params))
  assert.deepEqual(list?.orderBy, [{ auditStatus: "asc" }, { createdAt: "desc" }, { id: "asc" }])
  assert.equal(list?.skip, 25)
  assert.equal(list?.take, 25)
  assert.equal(data.total, 30)
  assert.deepEqual(data.resultChips, { all: 5, pending: 2, found: 3, mismatch: 0, notFound: 0, outOfScope: 1, pendingReview: 4 })
  assert.equal(data.componentsMissingInFilters, 1)
  const categories = callsTo("asset.groupBy")
  assert.equal(categories.length, 2, "result found: one ranking over every result, one count within it (a single call only when result is all)")
  assert.deepEqual(categories[0].by, ["categoryId"])
  assert.deepEqual(categories[0].where, { auditItems: { some: itemWhere(params, { categoryId: null, result: "all" }) } }, "the six are ranked over every result (P2-R11)")
  assert.deepEqual(categories[1].where, { auditItems: { some: itemWhere(params, { categoryId: null }) } }, "the category chips count within every other filter")
  assert.deepEqual(callsTo("company.findUnique")[0], { where: { id: "co-1" }, select: { code: true, nameTh: true } })
  assert.deepEqual(data.filterNames.company, { code: "GLT", nameTh: "จีลิงค์" })
  assert.equal(callsTo("branch.findUnique").length, 0)
  assert.deepEqual(callsTo("assetCategory.findMany")[0], { where: { id: { in: ["cat-desk"] } }, select: { id: true, code: true, name: true } })
  assert.equal(data.filterNames.category, null, "an unknown category: the page redirects without it")
})

test("อื่น ๆ is every category but the six shown: the list, its total and the result chips read the same six (P2-R11)", async () => {
  const sizes: Record<string, number> = { c1: 40, c2: 30, c3: 20, c4: 10, c5: 5, c6: 5, c7: 3, c8: 1 }
  state.respond = (call) => {
    if (call === "auditRound.findFirst") return round
    if (call === "asset.groupBy") return Object.entries(sizes).reverse().map(([categoryId, count]) => ({ categoryId, _count: { _all: count } }))
    if (call === "assetCategory.findMany") return Object.keys(sizes).map((id) => ({ id, code: id.toUpperCase(), name: `หมวดหมู่ ${id}` }))
    return undefined
  }
  const data = await loadPage({ categoryId: "other" })
  assert.ok(data)
  const top = ["c1", "c2", "c3", "c4", "c5", "c6"]
  assert.deepEqual(listCall()?.where, itemWhere({ categoryId: "other" }, { shownCategoryIds: top }))
  assert.ok(hasWhere("auditItem.count", itemWhere({ categoryId: "other" }, { shownCategoryIds: top })), "the total")
  assert.ok(hasWhere("auditItem.groupBy", itemWhere({ categoryId: "other" }, { result: "all", shownCategoryIds: top })), "the result chips")
  assert.deepEqual(callsTo("assetCategory.findMany")[0], { where: { id: { in: top } }, select: { id: true, code: true, name: true } })
  assert.deepEqual(data.categoryChips.top.map((chip) => [chip.id, chip.count]), [["c1", 40], ["c2", 30], ["c3", 20], ["c4", 10], ["c5", 5], ["c6", 5]])
  assert.deepEqual(data.categoryChips.other, { categories: 2, count: 4 })
  assert.equal(data.categoryChips.selected, null)
  assert.equal(data.filterNames.category, null)
  assert.equal(callsTo("asset.groupBy").length, 1, "result all: the ranking rows are the chip counts")
})

test("อื่น ๆ under another result reuses the six ranked over every result, so each result chip counts against the six its link opens (P2-R11)", async () => {
  const overAll: Record<string, number> = { c1: 40, c2: 30, c3: 20, c4: 10, c5: 5, c6: 5, c7: 3, c8: 1 }
  const notFound: Record<string, number> = { c7: 9, c2: 2, c8: 1 }
  const rowsOf = (sizes: Record<string, number>) => Object.entries(sizes).reverse().map(([categoryId, count]) => ({ categoryId, _count: { _all: count } }))
  state.respond = (call, args) => {
    if (call === "auditRound.findFirst") return round
    if (call === "asset.groupBy") {
      const where = (args.where as { auditItems: { some: unknown } }).auditItems.some
      return isDeepStrictEqual(where, itemWhere({ result: "not_found" }, { categoryId: null })) ? rowsOf(notFound) : rowsOf(overAll)
    }
    if (call === "assetCategory.findMany") return Object.keys(overAll).map((id) => ({ id, code: id.toUpperCase(), name: `หมวดหมู่ ${id}` }))
    return undefined
  }
  const data = await loadPage({ categoryId: "other", result: "not_found" })
  assert.ok(data)
  const top = ["c1", "c2", "c3", "c4", "c5", "c6"]
  assert.equal(callsTo("asset.groupBy").length, 2)
  assert.deepEqual(listCall()?.where, itemWhere({ categoryId: "other", result: "not_found" }, { shownCategoryIds: top }))
  assert.ok(hasWhere("auditItem.groupBy", itemWhere({ categoryId: "other" }, { result: "all", shownCategoryIds: top })), "the result chips read the same six")
  assert.deepEqual(data.categoryChips.top.map((chip) => [chip.id, chip.count]), [["c1", 0], ["c2", 2], ["c3", 0], ["c4", 0], ["c5", 0], ["c6", 0]])
  assert.deepEqual(data.categoryChips.other, { categories: 2, count: 10 }, "c7 and c8, within ไม่พบ")
})

test("the category row stays when the result in use holds one category: its visibility reads the round's categories, its counts the result (final review M4)", async () => {
  const overAll: Record<string, number> = { c1: 5, c2: 2 }
  const notFound: Record<string, number> = { c1: 1 }
  const rowsOf = (sizes: Record<string, number>) => Object.entries(sizes).map(([categoryId, count]) => ({ categoryId, _count: { _all: count } }))
  state.respond = (call, args) => {
    if (call === "auditRound.findFirst") return round
    if (call === "asset.groupBy") {
      const where = (args.where as { auditItems: { some: unknown } }).auditItems.some
      return isDeepStrictEqual(where, itemWhere({ result: "not_found" }, { categoryId: null })) ? rowsOf(notFound) : rowsOf(overAll)
    }
    if (call === "assetCategory.findMany") return Object.keys(overAll).map((id) => ({ id, code: id.toUpperCase(), name: `หมวดหมู่ ${id}` }))
    return undefined
  }
  const data = await loadPage({ result: "not_found" })
  assert.ok(data)
  assert.equal(data.categoryChips.visible, true)
  assert.deepEqual(data.categoryChips.top.map((chip) => [chip.id, chip.count]), [["c1", 1], ["c2", 0]])
  assert.equal(data.categoryChips.all, 1)
})

test("the list's where carries the rooms Task 2's lookup names: the item's expected room by code or name (bug 11, P2-R5, P2-R25)", async () => {
  state.respond = (call, args) => {
    if (call === "auditRound.findFirst") return round
    if (call === "auditItem.groupBy" && isDeepStrictEqual(args.by, ["expectedLocationId"])) return [{ expectedLocationId: "loc-1" }, { expectedLocationId: "loc-7" }]
    if (call === "location.findMany") return ids(args, "id").includes("loc-7") ? [{ id: "loc-7" }] : []
    return undefined
  }
  const data = await loadPage({ search: "B-1" })
  assert.ok(data)
  // One lookup, Task 2's; its chunks and its round-bound room list are pinned in tests/audit-round-list-lookups.test.ts.
  assert.equal(callsTo("location.findMany").length, 1)
  assert.deepEqual(listCall()?.where, itemWhere({ search: "B-1" }, { expectedLocationIds: ["loc-7"], roundLocationIds: ["loc-1", "loc-7"] }))
  // A broad term that names most of the round's rooms sends the rest as notIn (final review M3), in every query.
  state.calls = []
  state.respond = (call, args) => {
    if (call === "auditRound.findFirst") return round
    if (call === "auditItem.groupBy" && isDeepStrictEqual(args.by, ["expectedLocationId"])) return [{ expectedLocationId: "loc-1" }, { expectedLocationId: "loc-7" }, { expectedLocationId: "loc-8" }]
    if (call === "location.findMany") return [{ id: "loc-7" }, { id: "loc-8" }]
    return undefined
  }
  assert.ok(await loadPage({ search: "-" }))
  const broad = listCall()?.where
  assert.deepEqual(broad, itemWhere({ search: "-" }, { expectedLocationIds: ["loc-7", "loc-8"], roundLocationIds: ["loc-1", "loc-7", "loc-8"] }))
  assert.match(JSON.stringify(broad), /"expectedLocationId":\{"notIn":\["loc-1"\]\}/)
  assert.doesNotMatch(JSON.stringify(state.calls.filter((entry) => entry.call !== "location.findMany")), /"in":\["loc-7","loc-8"\]/, "no query sends the matched rooms as in")
})

test("no search reads no room; a search that names no room leaves the room ids out", async () => {
  await loadPage()
  assert.equal(callsTo("location.findMany").length, 0)
  assert.equal(callsTo("auditItem.groupBy").some((args) => isDeepStrictEqual(args.by, ["expectedLocationId"])), false)
  state.respond = (call) => (call === "auditRound.findFirst" ? round : call === "auditItem.groupBy" ? [] : undefined)
  state.calls = []
  await loadPage({ search: "ZZZ" })
  assert.deepEqual(listCall()?.where, itemWhere({ search: "ZZZ" }))
})

test("ไม่ตรงเรื่องอะไร and เครื่องที่ส่วนควบไม่ครบ are round-wide, each the where of the list it opens; the review step counts the round's findings, the rows of the findings page (P2-R1, P2-R16, P2-R18, P2-R26)", async () => {
  state.respond = (call, args) => {
    if (call === "auditRound.findFirst") return round
    if (call === "auditFinding.count") {
      // The findings page's where for status=pending&roundId= (buildAuditFindingWhere), and the person-decided rule.
      if (isDeepStrictEqual(args.where, { auditRoundId: "round-1", reviewStatus: "pending" })) return 5
      if (isDeepStrictEqual(args.where, auditRoundPersonDecidedFindingWhere("round-1"))) return 3
      return undefined
    }
    if (call !== "auditItem.count") return undefined
    if (isDeepStrictEqual(args.where, roundWide({ field: "department" }))) return 1
    if (isDeepStrictEqual(args.where, roundWide({ field: "condition" }))) return 1
    if (isDeepStrictEqual(args.where, withAuditRoundOwnItems({ AND: [{ auditRoundId: "round-1" }, auditRoundAnyFieldFindingWhere] }))) return 1
    if (isDeepStrictEqual(args.where, roundWide({ components: "missing" }))) return 2
    return undefined
  }
  // Active filters on the list: the cards ignore every one of them.
  const data = await loadPage({ categoryId: "cat-desk", companyId: "co-1", result: "not_found" })
  assert.ok(data)
  for (const field of ["location", "department", "custodian", "condition"] as const) assert.ok(hasWhere("auditItem.count", roundWide({ field })), field)
  assert.deepEqual(data.fieldBars, { counts: { location: 0, department: 1, custodian: 0, condition: 1 }, distinctItems: 1, multipleFields: true })
  assert.equal(data.componentsMissing, 2)
  // Step 2 counts findings (P2-R26): รอ 5 is the close checklist's own count, พิจารณาแล้ว 3 the findings a person decided.
  assert.deepEqual(data.steps.review, { pendingFindings: 5, decidedFindings: 3 })
  assert.equal(data.steps.close.checklist.pendingFindings, 5)
  assert.equal(hasWhere("auditItem.count", roundWide({ result: "pending_review" })), false, "no item count for step 2")
})

test("step 3 reads the close API's own checklist; the opener is told and never offered the close (spec §8, R2)", async () => {
  const ready = { checklist: { pendingItems: 0, pendingFindings: 0, openActions: 0, canClose: true }, openedByViewer: false, canClose: true }
  assert.deepEqual((await loadPage())?.steps.close, ready)
  assert.ok(hasWhere("auditItem.count", { auditRoundId: "round-1", auditStatus: "pending" }))
  assert.ok(hasWhere("auditFinding.count", { auditRoundId: "round-1", reviewStatus: "pending" }))
  assert.ok(hasWhere("auditFinding.count", { auditRoundId: "round-1", actionStatus: { in: ["planned", "in_progress", "done"] } }))
  assert.deepEqual((await loadPage({}, { userId: "user-opener" }))?.steps.close, { ...ready, openedByViewer: true, canClose: false })
  state.respond = (call) => (call === "auditRound.findFirst" ? { ...round, status: "closed" } : undefined)
  assert.equal((await loadPage())?.steps.close.canClose, false)
  state.respond = (call, args) => (call === "auditFinding.count" && isDeepStrictEqual(args.where, { auditRoundId: "round-1", reviewStatus: "pending" }) ? 2 : undefined)
  assert.deepEqual(await getAuditRoundCloseChecklist("round-1"), { pendingItems: 0, pendingFindings: 2, openActions: 0, canClose: false })
})

test("รูปหลักฐาน reads the photos of the checked items in chunks of 2,000 and counts the own ones (bug 10, R17)", async () => {
  const checked = Array.from({ length: 2000 }, (_, index) => ({ assetId: `a${index}`, auditStatus: "scanned", auditResult: "found", asset: { categoryId: "desk" } }))
  const outOfScope = { assetId: "x1", auditStatus: "reviewed", auditResult: "out_of_scope", asset: { categoryId: "desk" } }
  const photos = [{ assetId: "a0", originalName: "ด้านหน้า - 1.jpg" }, { assetId: "a1", originalName: "อื่น ๆ.jpg" }, { assetId: "x1", originalName: "ด้านหน้า - 2.jpg" }]
  state.respond = (call, args) => {
    if (call === "auditRound.findFirst") return round
    if (call === "auditItem.findMany" && args.skip === undefined) return [...checked, outOfScope]
    if (call === "attachment.findMany") return photos.filter((photo) => ids(args, "assetId").includes(photo.assetId))
    if (call === "systemSetting.findMany") return [{ key: "asset_category_photo_checklist:desk", value: JSON.stringify(["ด้านหน้า"]) }]
    return undefined
  }
  const data = await loadPage()
  assert.ok(data)
  assert.deepEqual(callsTo("auditItem.findMany").find((args) => args.skip === undefined), {
    where: { auditRoundId: "round-1", auditStatus: { not: "pending" } },
    select: { assetId: true, auditStatus: true, auditResult: true, asset: { select: { categoryId: true } } },
  })
  const attachments = callsTo("attachment.findMany")
  assert.deepEqual(attachments.map((args) => ids(args, "assetId").length), [2000, 1])
  assert.deepEqual(attachments[1], { where: { assetId: { in: ["x1"] }, module: "asset", isActive: true, uploadedAt: { gte: round.startDate } }, select: { assetId: true, originalName: true } })
  assert.deepEqual(callsTo("systemSetting.findMany")[0], { where: { key: { in: ["asset_category_photo_checklist:desk"] } }, select: { key: true, value: true } })
  assert.deepEqual(data.evidence, { checked: 2000, withPhoto: 2, withoutPhoto: 1998, checklistComplete: 1, checklistIncomplete: 1999 })
})

test("each row carries who checked it and when, its photo, its missing components and its own correction history, read for the page's items only (spec §8, P2-R9, P2-R17)", async () => {
  const scannedAt = new Date("2026-10-07T02:00:00.000Z")
  const reportedAt = new Date("2026-10-08T03:00:00.000Z")
  const asset = (id: string, parentComponents: unknown[] = []) => ({ id, assetTag: `TAG-${id}`, name: id, currentLocation: { code: "R1", name: "ห้อง 1" }, custodian: null, condition: null, parentComponents, installedInLinks: [] })
  const parent = {
    id: "item-1", assetId: "asset-1", auditStatus: "scanned", auditResult: "found", scannedBy: "user-a", scannedAt, findings: [],
    asset: asset("asset-1", [
      { componentRole: "adapter", slotNo: "1", componentAsset: { id: "asset-c1", assetTag: "GRL-COM-26-0017-01", name: "Adapter 65W", auditItems: [{ id: "item-c1" }] } },
      { componentRole: "monitor", slotNo: "2", componentAsset: { id: "asset-c2", assetTag: "GRL-COM-26-0017-02", name: "Monitor", auditItems: [] } },
    ]),
  }
  const missing = {
    id: "item-2", assetId: "asset-2", auditStatus: "reviewed", auditResult: "not_found", scannedBy: null, scannedAt: null, asset: asset("asset-2"),
    findings: [{ id: "f-1", findingType: "not_found", expectedValue: "{\"assetTag\":\"TAG-asset-2\"}", actualValue: null, reviewStatus: "pending", actionTaken: "pending_investigation", reportedBy: "user-b", reportedAt }],
  }
  const waiting = { id: "item-3", assetId: "asset-3", auditStatus: "pending", auditResult: null, scannedBy: null, scannedAt: null, findings: [], asset: asset("asset-3") }
  state.respond = (call, args) => {
    if (call === "auditRound.findFirst") return round
    if (call === "auditItem.findMany" && args.skip !== undefined) return [parent, missing, waiting]
    if (call === "auditItem.findMany") return [parent, missing].map((item) => ({ assetId: item.assetId, auditStatus: item.auditStatus, auditResult: item.auditResult, asset: { categoryId: "desk" } }))
    if (call === "attachment.findMany") return [{ assetId: "asset-1", originalName: "ด้านหน้า - 1.jpg" }]
    if (call === "systemLog.findMany") {
      return [{ id: "log-1", action: "scan_result_corrected", module: "audit", recordId: "item-1", oldValue: JSON.stringify({ auditResult: "wrong_location" }), newValue: JSON.stringify({ auditResult: "found", assetId: "asset-1" }), remark: null, createdAt: new Date("2026-10-09T01:00:00.000Z"), user: { username: "somchai", displayName: "สมชาย ใจดี" } }]
    }
    if (call === "user.findMany") return [{ id: "user-opener", username: "opener", displayName: "ผู้เปิด" }, { id: "user-a", username: "somchai", displayName: "สมชาย ใจดี" }, { id: "user-b", username: "suda", displayName: "suda" }]
    return undefined
  }
  const data = await loadPage()
  assert.ok(data)
  assert.deepEqual(callsTo("systemLog.findMany")[0], {
    where: { module: "audit", action: "scan_result_corrected", recordId: { in: ["item-1", "item-2", "item-3"] } },
    orderBy: [{ createdAt: "desc" }, { id: "asc" }],
    include: { user: { select: { username: true, displayName: true } } },
  }, "no take: every item on the page keeps its latest correction (P2-R9)")
  assert.deepEqual([...ids(callsTo("user.findMany")[0], "id")].sort(), ["user-a", "user-b", "user-opener"])
  assert.equal(data.round.createdByLabel, "ผู้เปิด (opener)")
  assert.equal(data.round.cancelledByLabel, null)
  assert.deepEqual(data.rows.map((row) => row.checkedBy), [{ label: "สมชาย ใจดี (somchai)", at: scannedAt }, { label: "suda", at: reportedAt }, null])
  assert.deepEqual(data.rows.map((row) => row.hasPhoto), [true, false, null])
  assert.deepEqual(data.rows[0].missingComponents, [{ id: "asset-c1", assetTag: "GRL-COM-26-0017-01", name: "Adapter 65W" }])
  assert.deepEqual(data.rows.map((row) => row.correctionHistory.length), [1, 0, 0])
  assert.equal(data.rows[0].correctionHistory[0].userLabel, "สมชาย ใจดี")
})

test("the close API and the round page read one checklist; the page reads its data from one timed load and runs no query itself", () => {
  const route = read("src/app/api/audit-rounds/[id]/route.ts")
  assert.match(route, /^import \{ getAuditRoundCloseChecklist \} from "@\/lib\/audit-round-close"$/m)
  assert.match(route, /const checklist = await getAuditRoundCloseChecklist\(id\)/)
  assert.doesNotMatch(route, /function getCloseChecklist/)
  assert.match(read("src/lib/audit-round-close.ts"), /export async function getAuditRoundCloseChecklist\(auditRoundId: string\): Promise<AuditRoundCloseChecklist>/)

  const data = read("src/lib/audit-round-page-data.ts")
  assert.match(data, /export async function getAuditRoundPageData\(\{ roundId, filters, page, pageSize, user \}: AuditRoundPageDataInput\)/)
  assert.match(data, /getAuditRoundCloseChecklist\(roundId\)/)
  // One room lookup, Task 2's (P2-R25): no search file of this task's own.
  assert.match(data, /^import \{ countAuditRoundItemCategories, findAuditRoundSearchLocations \} from "@\/lib\/audit-round-list-lookups"$/m)
  assert.equal(existsSync("src/lib/audit-round-search.ts"), false)
  assert.doesNotMatch(data, /prisma\.location\.findMany|prisma\.asset\.groupBy/)
  assert.match(data, /processedItems: walk\.checked \+ resultCard\.outOfScope,/)
  assert.match(data, /auditItems: \{ where: \{ auditRoundId: roundId, auditResult: "not_found" \}, select: \{ id: true \} \}/)
  assert.doesNotMatch(data, /take: 100/)
  assert.doesNotMatch(data, /\.(create|update|upsert|delete)(Many)?\(|\$executeRaw|\$queryRaw/)

  const page = read("src/app/[locale]/(dashboard)/audit/rounds/[id]/page.tsx")
  // The page's names from here on (Tasks 4-5): filters, page and pageSize; Task 5 folds the destructure into the parse.
  assert.match(page, /const \{ page, pageSize, \.\.\.filters \} = /)
  assert.match(page, /await withPerformanceTiming\(\n\s+"audit-round\.page-data",\n\s+\(\) => getAuditRoundPageData\(\{ roundId: id, filters, page, pageSize, user \}\),/)
  assert.match(page, /if \(!data\) notFound\(\)/)
  assert.doesNotMatch(page, /from "@\/lib\/db"|\bprisma\.|resolveAuditRoundListWhereInput/)
  assert.doesNotMatch(page, /function getEvidenceSummary|getAuditRoundCounts|correctionHistoryByItemId/)
  // The stale category redirect is this task's, through the one href builder (P2-R31).
  assert.match(page, /const staleCategory = Boolean\(filters\.categoryId && filters\.categoryId !== "other" && !filterCategory\)/)
  assert.match(page, /redirect\(buildAuditRoundPageHref\(locale, round\.id, filters, \{ companyId: filterCompany \? filters\.companyId : null, branchId: filterBranch \? filters\.branchId : null, categoryId: staleCategory \? null : filters\.categoryId, pageSize, returnTo: returnToHref \}\)\)/)
})
