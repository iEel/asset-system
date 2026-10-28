import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import test from "node:test"

import {
  AUDIT_ROUND_OTHER_CATEGORY,
  auditCountedFindingReviewStatuses,
  auditFindingFields,
  auditFindingTypeByField,
  auditRoundItemListOrderBy,
  auditRoundResultFilterValues,
  buildAuditRoundExportHref,
  buildAuditRoundFilterWhere,
  buildAuditRoundItemWhere,
  buildAuditRoundItemsHref,
  buildAuditRoundPageHref,
  emptyAuditRoundListFilters,
  emptyAuditRoundResultCounts,
  foldAuditRoundResultCounts,
  parseAuditRoundListFilters,
  parseAuditRoundResultListParams,
  resolveAuditRoundResultFilter,
} from "../src/lib/audit-round-result-filters.ts"

const read = (path: string) => readFileSync(path, "utf8").replace(/\r\n/g, "\n")
// The round's own items (spec §5), null-safe: a pending item has no result.
const own = (where: object) => ({ AND: [where, { OR: [{ auditResult: null }, { auditResult: { not: "out_of_scope" } }] }] })
const round = { auditRoundId: "round-1" }

test("the round page's filters: seven results, a category (other allowed), a field, missing components, company, branch and search (spec §8, P2-R22, P2-R23)", () => {
  assert.deepEqual([...auditRoundResultFilterValues], ["all", "pending", "found", "mismatch", "not_found", "out_of_scope", "pending_review"])
  assert.deepEqual([...auditFindingFields], ["location", "department", "custodian", "condition"])
  assert.deepEqual(auditFindingTypeByField, { location: "wrong_location", department: "wrong_department", custodian: "wrong_custodian", condition: "wrong_condition" })
  assert.deepEqual([...auditCountedFindingReviewStatuses], ["pending", "approved"], "P2-R1: exception and rejected never count")
  assert.equal(AUDIT_ROUND_OTHER_CATEGORY, "other")

  const none = { result: "all", categoryId: null, field: null, components: null, companyId: null, branchId: null, search: "" }
  assert.deepEqual(parseAuditRoundListFilters({}), none)
  assert.deepEqual(emptyAuditRoundListFilters, none)
  assert.equal(Object.isFrozen(emptyAuditRoundListFilters), true)
  assert.deepEqual(
    parseAuditRoundListFilters({ result: "mismatch", categoryId: " cat-1 ", field: "department", components: "missing", companyId: ["c-1", "c-2"], branchId: "  ", search: "  PC  " }),
    { result: "mismatch", categoryId: "cat-1", field: "department", components: "missing", companyId: "c-1", branchId: null, search: "PC" },
  )
  assert.equal(parseAuditRoundListFilters({ result: "pending" }).result, "pending")
  assert.equal(parseAuditRoundListFilters({ categoryId: "other" }).categoryId, "other")
  for (const bogus of [{ result: "bogus" }, { field: "status" }, { components: "all" }]) {
    assert.deepEqual(parseAuditRoundListFilters(bogus), none, JSON.stringify(bogus))
  }
  // Old links keep working (P2-R22): a wrong_* result is the whole list narrowed to that field.
  for (const [result, field] of [["wrong_location", "location"], ["wrong_department", "department"], ["wrong_custodian", "custodian"], ["wrong_condition", "condition"]] as const) {
    assert.deepEqual(parseAuditRoundListFilters({ result }), { ...none, field }, result)
    assert.equal(resolveAuditRoundResultFilter(result), "all", result)
  }
  assert.equal(parseAuditRoundListFilters({ result: "wrong_location", field: "condition" }).field, "condition", "an explicit field wins")
  assert.equal("expectedLocationIds" in parseAuditRoundListFilters({ search: "R101" }), false, "a room lookup, never a URL value")

  assert.deepEqual(parseAuditRoundResultListParams({}), { ...none, page: 1, pageSize: 25 })
  assert.deepEqual(parseAuditRoundResultListParams({ page: "3", pageSize: "500", field: "location" }), { ...none, field: "location", page: 3, pageSize: 100 })
  assert.equal(parseAuditRoundResultListParams({ pageSize: "1" }).pageSize, 10)
})

test("each result is one where; every result but out-of-scope and pending review keeps to the round's own items (spec §5, §8, P2-R2, recon gotcha 1)", () => {
  const where = (result: (typeof auditRoundResultFilterValues)[number]) => buildAuditRoundItemWhere({ roundId: "round-1", result })
  assert.deepEqual(where("all"), own({ AND: [round] }))
  assert.deepEqual(where("pending"), own({ AND: [round, { auditStatus: "pending" }] }))
  assert.deepEqual(where("found"), own({ AND: [round, { auditResult: { in: ["found", "confirmed_with_parent"] } }] }))
  // ไม่ตรง: every variance result (isVarianceAuditResult), plus a checked item with no result (P2-R2).
  assert.deepEqual(where("mismatch"), own({ AND: [round, { OR: [
    { auditResult: { not: null, notIn: ["found", "confirmed_with_parent", "not_found", "out_of_scope"] } },
    { auditResult: null, auditStatus: { not: "pending" } },
  ] }] }))
  assert.deepEqual(where("not_found"), own({ AND: [round, { auditResult: "not_found" }] }))
  // The out-of-scope list is the out-of-scope items, never the whole round (gotcha 1).
  assert.deepEqual(where("out_of_scope"), { AND: [round, { auditResult: "out_of_scope" }] })
  // รอพิจารณา follows the pending findings, out-of-scope finds included (plan 1 R5 kept).
  assert.deepEqual(where("pending_review"), { AND: [round, { findings: { some: { reviewStatus: "pending" } } }] })
})

test("every filter goes into one AND list, so two findings filters and two asset filters never overwrite each other (spec §8, recon gotcha 2)", () => {
  assert.deepEqual(
    buildAuditRoundItemWhere({ roundId: "round-1", result: "not_found", companyId: "c-1", branchId: "b-1", categoryId: "cat-1", field: "location", components: "missing", search: "PC", expectedLocationIds: ["loc-1", "loc-2"] }),
    own({ AND: [
      round,
      { expectedCompanyId: "c-1" },
      { expectedBranchId: "b-1" },
      { asset: { categoryId: "cat-1" } },
      { findings: { some: { findingType: "wrong_location", reviewStatus: { in: ["pending", "approved"] } } } },
      { asset: { parentComponents: { some: { status: "installed", removedAt: null, componentAsset: { auditItems: { some: { auditRoundId: "round-1", auditResult: "not_found" } } } } } } },
      { OR: [{ asset: { assetTag: { contains: "PC" } } }, { asset: { name: { contains: "PC" } } }, { expectedLocationId: { in: ["loc-1", "loc-2"] } }] },
      { auditResult: "not_found" },
    ] }),
  )
  // A field bar under รอพิจารณา: both findings conditions stay.
  assert.deepEqual(buildAuditRoundItemWhere({ roundId: "round-1", result: "pending_review", field: "department" }), { AND: [
    round,
    { findings: { some: { findingType: "wrong_department", reviewStatus: { in: ["pending", "approved"] } } } },
    { findings: { some: { reviewStatus: "pending" } } },
  ] })
  // "อื่น ๆ": none of the six categories the chip row shows (P2-R11); with none shown, every category.
  assert.deepEqual(buildAuditRoundItemWhere({ roundId: "round-1", result: "all", categoryId: "other", shownCategoryIds: ["cat-1", "cat-2"] }), own({ AND: [round, { asset: { categoryId: { notIn: ["cat-1", "cat-2"] } } }] }))
  assert.deepEqual(buildAuditRoundItemWhere({ roundId: "round-1", result: "all", categoryId: "other" }), own({ AND: [round, { asset: { categoryId: { notIn: [] } } }] }))
  // The search is code and name, plus the item's expected room when the lookup found one (P2-R5); no search, no room.
  assert.deepEqual(buildAuditRoundItemWhere({ roundId: "round-1", result: "all", search: " SNI ", expectedLocationIds: [] }), own({ AND: [round, { OR: [{ asset: { assetTag: { contains: "SNI" } } }, { asset: { name: { contains: "SNI" } } }] }] }))
  assert.deepEqual(buildAuditRoundItemWhere({ roundId: "round-1", result: "all", search: "  ", expectedLocationIds: ["loc-1"] }), own({ AND: [round] }))
  // With the round's rooms known, the room branch is the pending list's in / notIn choice (final review M3): the smaller
  // list, so a broad term never sends more than half of the round's rooms.
  const roundRooms = ["loc-1", "loc-2", "loc-3", "loc-4", "loc-5"]
  const roomBranch = (matched: string[]) => buildAuditRoundItemWhere({ roundId: "round-1", result: "all", search: "R", expectedLocationIds: matched, roundLocationIds: roundRooms })
  const nameBranches = [{ asset: { assetTag: { contains: "R" } } }, { asset: { name: { contains: "R" } } }]
  assert.deepEqual(roomBranch(["loc-1", "loc-2"]), own({ AND: [round, { OR: [...nameBranches, { expectedLocationId: { in: ["loc-1", "loc-2"] } }] }] }))
  assert.deepEqual(roomBranch(["loc-1", "loc-2", "loc-3", "loc-4"]), own({ AND: [round, { OR: [...nameBranches, { expectedLocationId: { notIn: ["loc-5"] } }] }] }))
  assert.deepEqual(roomBranch(roundRooms), own({ AND: [round, { OR: [...nameBranches, { expectedLocationId: { notIn: [] } }] }] }), "every room: notIn [] is every row")
  assert.deepEqual(roomBranch([]), own({ AND: [round, { OR: nameBranches }] }))
  const broad = Array.from({ length: 3000 }, (_, index) => `loc-${index}`)
  const broadWhere = buildAuditRoundItemWhere({ roundId: "round-1", result: "all", search: "-", expectedLocationIds: broad.slice(0, 2990), roundLocationIds: broad })
  assert.deepEqual(broadWhere, own({ AND: [round, { OR: [{ asset: { assetTag: { contains: "-" } } }, { asset: { name: { contains: "-" } } }, { expectedLocationId: { notIn: broad.slice(2990) } }] }] }), "3,000 rooms, 2,990 matched: ten ids sent")
  // The chips' base: every filter but the result, not own-wrapped, so one fold counts the out-of-scope finds apart.
  assert.deepEqual(buildAuditRoundFilterWhere({ roundId: "round-1", companyId: "c-1", field: "condition" }), { AND: [
    round,
    { expectedCompanyId: "c-1" },
    { findings: { some: { findingType: "wrong_condition", reviewStatus: { in: ["pending", "approved"] } } } },
  ] })
})

test("one fold of the result counts: own items only, and พบตรง + ไม่ตรง + ไม่พบ + รอตรวจ = ทั้งหมด (spec §5, §8, P2-R2)", () => {
  const counts = foldAuditRoundResultCounts([
    { auditStatus: "pending", auditResult: null, count: 5 },
    { auditStatus: "scanned", auditResult: "found", count: 7 },
    { auditStatus: "scanned", auditResult: "confirmed_with_parent", count: 2 },
    { auditStatus: "scanned", auditResult: "wrong_location", count: 3 },
    { auditStatus: "reviewed", auditResult: "need_review", count: 1 },
    // The review route sets the status only, so a checked item can have no result: it reads ไม่ตรง (P2-R2).
    { auditStatus: "reviewed", auditResult: null, count: 1 },
    { auditStatus: "reviewed", auditResult: "not_found", count: 4 },
    { auditStatus: "reviewed", auditResult: "out_of_scope", count: 3 },
  ])
  assert.deepEqual(counts, { all: 23, pending: 5, found: 9, mismatch: 5, notFound: 4, outOfScope: 3 })
  assert.equal(counts.found + counts.mismatch + counts.notFound + counts.pending, counts.all)
  assert.deepEqual(foldAuditRoundResultCounts([]), { all: 0, pending: 0, found: 0, mismatch: 0, notFound: 0, outOfScope: 0 })
  assert.deepEqual(emptyAuditRoundResultCounts, { all: 0, pending: 0, found: 0, mismatch: 0, notFound: 0, outOfScope: 0 })
  assert.equal(Object.isFrozen(emptyAuditRoundResultCounts), true)
})

test("one link writer: the page's list, its exports and the dashboard carry every filter and drop the defaults (spec §8, global constraint)", () => {
  const none = parseAuditRoundListFilters({})
  const full = { result: "mismatch", search: "PC 1", companyId: "c-1", branchId: "b-1", categoryId: "other", field: "location", components: "missing" } as const
  assert.equal(buildAuditRoundPageHref("th", "round-1", none), "/th/audit/rounds/round-1#audit-result-list")
  assert.equal(
    buildAuditRoundPageHref("th", "round-1", full, { page: 2, pageSize: 50, returnTo: "/th/audit/rounds?view=open" }),
    "/th/audit/rounds/round-1?result=mismatch&search=PC+1&companyId=c-1&branchId=b-1&categoryId=other&field=location&components=missing&page=2&pageSize=50&returnTo=%2Fth%2Faudit%2Frounds%3Fview%3Dopen#audit-result-list",
  )
  // null clears a filter (a chip's ✕), undefined keeps it; page 1 and 25 rows are the defaults.
  assert.equal(
    buildAuditRoundPageHref("th", "round-1", full, { companyId: null, components: null, branchId: undefined, page: 1, pageSize: 25 }),
    "/th/audit/rounds/round-1?result=mismatch&search=PC+1&branchId=b-1&categoryId=other&field=location#audit-result-list",
  )
  // A variable, not a fresh literal: tsc runs no excess-property check against the Omit type (TS2353 otherwise).
  const withRooms = { ...none, expectedLocationIds: ["loc-1"], roundLocationIds: ["loc-1", "loc-2"] }
  assert.equal(buildAuditRoundPageHref("th", "round-1", withRooms), "/th/audit/rounds/round-1#audit-result-list", "a lookup never reaches the URL")
  assert.equal(
    buildAuditRoundExportHref("th", "round-1", "export", full),
    "/api/audit-rounds/round-1/export?result=mismatch&search=PC+1&companyId=c-1&branchId=b-1&categoryId=other&field=location&components=missing&locale=th",
  )
  assert.equal(buildAuditRoundExportHref("en", "round-1", "variance-export", none), "/api/audit-rounds/round-1/variance-export?locale=en")
  assert.equal(buildAuditRoundExportHref("th", "round-1", "export-pdf", { ...none, field: "department" }), "/api/audit-rounds/round-1/export-pdf?field=department&locale=th")
  // The dashboard's links (R13) go through the same writer.
  assert.equal(buildAuditRoundItemsHref("th", "round-1", { companyId: "company-1", branchId: "branch-1" }), "/th/audit/rounds/round-1?companyId=company-1&branchId=branch-1#audit-result-list")
})

test("the filter rules stay pure and client-safe (recon gotcha 3)", () => {
  const source = read("src/lib/audit-round-result-filters.ts")
  assert.doesNotMatch(source, /from "@\//)
  assert.doesNotMatch(source, /^import (?!type )[^\n]*from "@prisma\/client"/m)
  assert.doesNotMatch(source, /prisma\./)
  assert.doesNotMatch(source, /isAuditFindingResultFilter|wrong_location: t\(|result === "wrong_/, "wrong_* is a field now")
})

test("the page and the Excel and PDF exports share one order: by status, newest first, then id (final review M5)", () => {
  assert.deepEqual(auditRoundItemListOrderBy, [{ auditStatus: "asc" }, { createdAt: "desc" }, { id: "asc" }])
})
