import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import test from "node:test"

import { foldTopCategories } from "../src/lib/audit-round-counts-rules.ts"
import { addMonthsToDateKey, auditRoundDailyLoad, auditRoundEndAfterStartChange, countAuditPreviewCategories, foldAuditRoundOverlap, parseAuditSampleRate } from "../src/lib/audit-round-preview-rules.ts"
import { selectAuditSample } from "../src/lib/audit-round-scope.ts"
import { auditRoundPreviewSchema, auditRoundSchema } from "../src/lib/validations/audit.ts"

// Group 2 plan 1, tasks 3 and 4: the create API and the live count of the create form (spec §7, §14).
const read = (path: string) => readFileSync(path, "utf8").replace(/\r\n/g, "\n")

test("a new round has no status to choose: the create schema drops a client status and never refuses it (group 2 spec §7, §14, bug §13.6)", () => {
  const body = { name: "รอบทดสอบ", auditYear: 2026, startDate: "2026-11-01", endDate: "2026-12-01" }
  for (const status of ["open", "draft", "closed", "cancelled", "bogus"]) {
    const input = auditRoundSchema.parse({ ...body, status })
    assert.equal("status" in input, false, status)
    assert.equal(input.name, "รอบทดสอบ")
  }
  const reversed = auditRoundSchema.safeParse({ ...body, endDate: "2026-10-31" })
  assert.equal(reversed.success, false)
  assert.deepEqual(reversed.error?.issues.map((issue) => [issue.path.join("."), issue.message]), [["endDate", "End date must be after start date"]])
  assert.doesNotMatch(read("src/lib/validations/audit.ts"), /auditStatuses|status: z\.enum|\.strict\(\)/)
})

test("the live count's schema is the scope alone: a half-typed name, year or date never fails a count (group 2 spec §7, R10)", () => {
  const scope = auditRoundPreviewSchema.parse({ name: "", auditYear: null, startDate: "2026-1", endDate: "", status: "draft", scopeDepartmentId: " dept-1 ", scopeBranchId: "", sampleRate: "20" })
  assert.equal(scope.scopeDepartmentId, "dept-1")
  assert.equal(scope.scopeBranchId, null)
  assert.equal(scope.sampleRate, 20)
  assert.equal(scope.riskPreset, "all")
  assert.equal(scope.includeClosedAssets, false)
  for (const key of ["name", "auditYear", "startDate", "endDate", "status"]) assert.equal(key in scope, false, key)
  const refused = auditRoundPreviewSchema.safeParse({ sampleRate: 0 })
  assert.equal(refused.success, false)
  assert.deepEqual(refused.error?.issues.map((issue) => issue.path.join(".")), ["sampleRate"])
})

test("the create route always opens the round and logs it open; the preview reads the scope schema and adds categories, the direct sample and the overlap (group 2 spec §7, §14, R9, R10)", () => {
  const create = read("src/app/api/audit-rounds/route.ts")
  assert.match(create, /endDate: input\.endDate,\n\s+status: "open",\n\s+createdBy: user\.id,/)
  assert.doesNotMatch(create, /input\.status/)
  assert.match(create, /newValue: \{\n\s+\.\.\.input,\n\s+status: "open",\n\s+auditNo: round\.auditNo,/)

  const preview = read("src/app/api/audit-rounds/preview/route.ts")
  assert.match(preview, /const input = auditRoundPreviewSchema\.parse\(await request\.json\(\)\)/)
  assert.ok(preview.indexOf('requirePermission(user, "audit", "create")') < preview.indexOf("auditRoundPreviewSchema.parse("), "the permission before the body")
  assert.doesNotMatch(preview, /auditRoundSchema\b|"Audit preview"/)
  assert.match(preview, /const overlap = await getAuditRoundOverlap\(selection\.selectedAssets\.map\(\(asset\) => asset\.id\)\)/)
  assert.match(preview, /directSampled: selection\.selectedAssets\.length - selection\.componentItems,/)
  assert.match(preview, /categories: countAuditPreviewCategories\(selection\.selectedAssets\),\n\s+overlap,/)
})

test("the selection reads the category, loads components by relation and counts the overlap in chunks over own items of rounds in progress (group 2 spec §5, §7, §14, R11)", () => {
  const selection = read("src/lib/audit-round.ts")
  assert.match(selection, /export const auditRoundAssetSelect = \{[^}]*\n\s+categoryId: true,\n[^}]*\} satisfies Prisma\.AssetSelect/)
  assert.match(selection, /export async function getAuditRoundSelection\(input: AuditRoundScopeInput\)/)
  assert.match(selection, /parentAsset: buildAuditAssetWhere\(input\),/)
  assert.doesNotMatch(selection, /parentAssetId: \{ in:/, "no id list as long as the scope")
  assert.match(selection, /export async function getAuditRoundOverlap\(assetIds: readonly string\[\]\): Promise<AuditRoundOverlap>/)
  assert.match(selection, /for \(const chunk of chunkAuditIds\(assetIds\)\)/)
  assert.match(selection, /where: withAuditRoundOwnItems\(\{ assetId: \{ in: chunk \}, auditRound: \{ isActive: true, status: auditRoundOperationalWhere \} \}\),/)
  assert.match(selection, /select: \{ assetId: true, auditRound: \{ select: \{ id: true, auditNo: true \} \} \},/)
  assert.match(selection, /return foldAuditRoundOverlap\(rows\)/)

  const scope = read("src/lib/audit-round-scope.ts")
  assert.match(scope, /^import type \{ AuditRoundScopeInput \} from "\.\/validations\/audit\.ts"$/m)
  assert.match(scope, /export function buildAuditAssetWhere\(input: AuditRoundScopeInput\): Prisma\.AssetWhereInput/)
  assert.doesNotMatch(scope, /findIndex/, "the sample keeps the scope's order through an index map")
  assert.doesNotMatch(read("src/lib/audit-round-preview-rules.ts"), /from "@\/|from "@prisma|\bprisma\./, "the preview rules stay pure")
})

test("the preview counts the selected assets by category, largest first, each component under its own category (group 2 spec §7)", () => {
  const assets = ["desk", "comp", "desk", "mon", "comp", "desk"].map((categoryId) => ({ categoryId }))
  assert.deepEqual(countAuditPreviewCategories(assets), [
    { id: "desk", count: 3 },
    { id: "comp", count: 2 },
    { id: "mon", count: 1 },
  ])
  // A tie keeps the id order, so two counts of the same scope list the categories the same way.
  assert.deepEqual(countAuditPreviewCategories([{ categoryId: "b" }, { categoryId: "a" }]), [{ id: "a", count: 1 }, { id: "b", count: 1 }])
  assert.deepEqual(countAuditPreviewCategories([]), [])
})

test("the six largest categories, then อื่น ๆ with how many categories and items it holds (group 2 spec §2 decision 2, §7; shared with plan 2)", () => {
  const rows = [8, 7, 6, 5, 4, 3, 2, 1].map((count, index) => ({ id: `c${index}`, count }))
  assert.deepEqual(foldTopCategories(rows), { top: rows.slice(0, 6), other: { categories: 2, count: 3 } })
  assert.deepEqual(foldTopCategories(rows, 2), { top: rows.slice(0, 2), other: { categories: 6, count: 21 } })
  assert.deepEqual(foldTopCategories(rows.slice(0, 3)), { top: rows.slice(0, 3), other: { categories: 0, count: 0 } })
  assert.deepEqual(foldTopCategories([]), { top: [], other: { categories: 0, count: 0 } })
  // Unsorted rows are sorted by count, equal counts keep their order, and the input is not changed.
  const unsorted = [{ id: "x", count: 1 }, { id: "y", count: 5 }, { id: "z", count: 5 }]
  assert.deepEqual(foldTopCategories(unsorted, 1), { top: [{ id: "y", count: 5 }], other: { categories: 2, count: 6 } })
  assert.deepEqual(unsorted.map((row) => row.id), ["x", "y", "z"])
})

test("the overlap counts each selected asset once and names every other round it is in, by number (group 2 spec §7)", () => {
  const later = { id: "r1", auditNo: "AUD-2026-0003" }
  const earlier = { id: "r2", auditNo: "AUD-2026-0001" }
  assert.deepEqual(
    foldAuditRoundOverlap([
      { assetId: "a1", auditRound: later },
      { assetId: "a2", auditRound: later },
      { assetId: "a1", auditRound: earlier },
    ]),
    { count: 2, rounds: [earlier, later] },
  )
  assert.deepEqual(foldAuditRoundOverlap([]), { count: 0, rounds: [] })
})

test("the sample keeps the scope's order and is the same on every call (group 2 spec §7: the live count samples on every change)", () => {
  const assets = Array.from({ length: 5000 }, (_, index) => ({ id: `asset-${String(index).padStart(5, "0")}` }))
  const sample = selectAuditSample(assets, 20)
  assert.equal(sample.length, 1000)
  assert.deepEqual(selectAuditSample(assets, 20), sample)
  const positions = sample.map((asset) => assets.indexOf(asset))
  assert.deepEqual(positions, [...positions].sort((left, right) => left - right))
  assert.equal(selectAuditSample(assets, 100), assets)
  assert.equal(selectAuditSample(assets.slice(0, 3), 1).length, 1)
})

test("the end date defaults to one month after the start, on the month's last day when the day is missing (group 2 spec §7, bug §13.7)", () => {
  assert.equal(addMonthsToDateKey("2026-10-26", 1), "2026-11-26")
  assert.equal(addMonthsToDateKey("2026-01-31", 1), "2026-02-28")
  assert.equal(addMonthsToDateKey("2028-01-31", 1), "2028-02-29")
  assert.equal(addMonthsToDateKey("2026-12-15", 1), "2027-01-15")
  assert.equal(addMonthsToDateKey("", 1), "")
  assert.equal(addMonthsToDateKey("26/10/2026", 1), "")
})

test("the daily load is the items over the round's days, both ends counted, rounded up (group 2 spec §7)", () => {
  assert.equal(auditRoundDailyLoad(342, "2026-11-01", "2026-11-30"), 12)
  assert.equal(auditRoundDailyLoad(342, "2026-11-01", "2026-11-01"), 342)
  assert.equal(auditRoundDailyLoad(7, "2026-10-26", "2026-11-25"), 1)
  assert.equal(auditRoundDailyLoad(0, "2026-11-01", "2026-11-30"), null)
  assert.equal(auditRoundDailyLoad(10, "2026-11-30", "2026-11-01"), null)
  assert.equal(auditRoundDailyLoad(10, "", "2026-11-01"), null)
})

test("the end follows a new start a month later until the person sets the end; then it stays (group 2 final review M1)", () => {
  assert.equal(auditRoundEndAfterStartChange("2026-12-01", "2026-11-26", false), "2027-01-01", "a start past the old end moves the end with it")
  assert.equal(auditRoundEndAfterStartChange("2026-01-31", "2026-02-26", false), "2026-02-28")
  assert.equal(auditRoundEndAfterStartChange("2026-12-01", "2026-11-26", true), "2026-11-26", "a set end is kept; validate refuses the pair")
  assert.equal(auditRoundEndAfterStartChange("", "2026-11-26", false), "2026-11-26", "a cleared start leaves the end")
})

test("the shown sample rate is a whole number from 1 to 100, else none (group 2 final review M7)", () => {
  assert.equal(parseAuditSampleRate("100"), 100)
  assert.equal(parseAuditSampleRate(" 25 "), 25)
  assert.equal(parseAuditSampleRate("1"), 1)
  for (const raw of ["", "0", "101", "2.5", "-5", "abc"]) assert.equal(parseAuditSampleRate(raw), null, raw)
})
