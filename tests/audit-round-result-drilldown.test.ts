import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import test from "node:test"

import {
  buildAuditRoundResultSummaryGroups,
  buildAuditRoundItemWhere,
  buildAuditRoundResultListHref,
  buildAuditRoundScanHistoryWhere,
  getAuditRoundItemResultLabelKey,
  getAuditRoundItemStatusLabelKey,
  resolveAuditRoundResultFilter,
} from "../src/lib/audit-round-result-filters.ts"

test("audit round result filters map dashboard buckets to scoped item queries", () => {
  assert.equal(resolveAuditRoundResultFilter("missing"), "all")
  assert.equal(resolveAuditRoundResultFilter("wrong_location"), "wrong_location")

  assert.deepEqual(buildAuditRoundItemWhere({ roundId: "round-1", result: "found", search: "" }), {
    auditRoundId: "round-1",
    auditResult: { in: ["found", "confirmed_with_parent"] },
  })
  assert.deepEqual(buildAuditRoundItemWhere({ roundId: "round-1", result: "not_found", search: "" }), {
    auditRoundId: "round-1",
    auditResult: "not_found",
  })
  assert.deepEqual(buildAuditRoundItemWhere({ roundId: "round-1", result: "wrong_location", search: "" }), {
    auditRoundId: "round-1",
    findings: { some: { findingType: "wrong_location" } },
  })
  assert.deepEqual(buildAuditRoundItemWhere({ roundId: "round-1", result: "pending_review", search: "" }), {
    auditRoundId: "round-1",
    findings: { some: { reviewStatus: "pending" } },
  })
})

test("audit round result searches stay scoped to the selected bucket", () => {
  assert.deepEqual(buildAuditRoundItemWhere({ roundId: "round-1", result: "wrong_custodian", search: "SNI-EQU" }), {
    auditRoundId: "round-1",
    findings: { some: { findingType: "wrong_custodian" } },
    OR: [
      { asset: { assetTag: { contains: "SNI-EQU" } } },
      { asset: { name: { contains: "SNI-EQU" } } },
    ],
  })

  assert.deepEqual(buildAuditRoundScanHistoryWhere({ roundId: "round-1", search: "GRL" }), {
    auditRoundId: "round-1",
    auditItemId: null,
    OR: [
      { asset: { assetTag: { contains: "GRL" } } },
      { asset: { name: { contains: "GRL" } } },
    ],
  })
})

test("audit round result drilldown href preserves return context and anchors the result list", () => {
  assert.equal(
    buildAuditRoundResultListHref({
      locale: "th",
      roundId: "round-1",
      result: "found",
      returnTo: "/th/audit/rounds?view=open",
      page: 2,
      pageSize: 50,
      search: "SNI",
    }),
    "/th/audit/rounds/round-1?result=found&search=SNI&page=2&pageSize=50&returnTo=%2Fth%2Faudit%2Frounds%3Fview%3Dopen#audit-result-list"
  )
})

test("audit round result summary separates normal results from actionable exceptions", () => {
  const groups = buildAuditRoundResultSummaryGroups([
    { result: "found", count: 12 },
    { result: "wrong_location", count: 2 },
    { result: "wrong_custodian", count: 0 },
    { result: "wrong_condition", count: 1 },
    { result: "not_found", count: 0 },
    { result: "out_of_scope", count: 3 },
    { result: "pending_review", count: 0 },
  ])

  assert.deepEqual(groups.normal.map((item) => item.result), ["found"])
  assert.deepEqual(groups.needsReview.map((item) => item.result), [
    "wrong_location",
    "wrong_condition",
    "out_of_scope",
    "wrong_custodian",
    "not_found",
    "pending_review",
  ])
  assert.equal(groups.needsReview.find((item) => item.result === "wrong_location")?.actionable, true)
  assert.equal(groups.needsReview.find((item) => item.result === "wrong_custodian")?.actionable, false)
})

test("audit round item display labels use translation keys instead of raw values", () => {
  assert.equal(getAuditRoundItemStatusLabelKey("scanned"), "scanned")
  assert.equal(getAuditRoundItemStatusLabelKey("pending"), "pending")
  assert.equal(getAuditRoundItemStatusLabelKey("unexpected"), null)
  assert.equal(getAuditRoundItemResultLabelKey("found"), "found")
  assert.equal(getAuditRoundItemResultLabelKey("confirmed_with_parent"), "confirmedWithParent")
  assert.equal(getAuditRoundItemResultLabelKey("not_found"), "notFound")
  assert.equal(getAuditRoundItemResultLabelKey("unexpected"), null)
})

test("audit round detail page exposes clickable result dashboard and paginated result list", () => {
  const page = readFileSync("src/app/[locale]/(dashboard)/audit/rounds/[id]/page.tsx", "utf8")

  assert.match(page, /result\?: string \| string\[\]/)
  assert.match(page, /buildAuditRoundResultListHref/)
  assert.match(page, /resultNormalGroup/)
  assert.match(page, /resultNeedsReviewGroup/)
  assert.match(page, /href: foundResultHref/)
  assert.match(page, /href=\{item\.count > 0 \? item\.href : undefined\}/)
  assert.match(page, /openFindingReview/)
  assert.match(page, /viewPendingReviewAssets/)
  assert.match(page, /id="audit-result-list"/)
  assert.match(page, /AuditRoundResultPagination/)
  assert.match(page, /resultItems\.map/)
})
