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


test("audit round result drilldown copy is translated", () => {
  const th = JSON.parse(readFileSync("messages/th.json", "utf8"))
  const en = JSON.parse(readFileSync("messages/en.json", "utf8"))

  for (const messages of [th, en]) {
    assert.equal(typeof messages.auditRound.resultListFilteredTitle, "string")
    assert.equal(typeof messages.auditRound.resultListFilteredHelp, "string")
    assert.equal(typeof messages.auditRound.emptyResultFilterTitle, "string")
    assert.equal(typeof messages.auditRound.emptyResultFilterHelp, "string")
    assert.equal(typeof messages.auditRound.emptyResultSearchTitle, "string")
    assert.equal(typeof messages.auditRound.emptyResultSearchHelp, "string")
  }
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
  assert.match(page, /resultListTitle/)
  assert.match(page, /resultListDescription/)
  assert.match(page, /emptyResultTitle/)
  assert.match(page, /emptyResultDescription/)
  assert.match(page, /resultFindingReviewHref/)
  assert.match(page, /findingType/)
  assert.match(page, /id="audit-result-list"/)
  assert.match(page, /AuditRoundResultPagination/)
  assert.match(page, /resultItems\.map/)
})

test("audit round detail export links preserve the active result bucket and search", () => {
  const page = readFileSync("src/app/[locale]/(dashboard)/audit/rounds/[id]/page.tsx", "utf8")

  assert.match(page, /buildAuditRoundExportHref/)
  assert.match(page, /auditRoundExportHref/)
  assert.match(page, /auditRoundExportPdfHref/)
  assert.match(page, /resultListState\.result/)
  assert.match(page, /resultListState\.search/)
  assert.match(page, /href=\{auditRoundExportHref\}/)
  assert.match(page, /href=\{auditRoundExportPdfHref\}/)
})

test("audit round result exports use the same filters as the on-screen result list", () => {
  const excelRoute = readFileSync("src/app/api/audit-rounds/[id]/export/route.ts", "utf8")
  const pdfRoute = readFileSync("src/app/api/audit-rounds/[id]/export-pdf/route.ts", "utf8")

  for (const route of [excelRoute, pdfRoute]) {
    assert.match(route, /request: NextRequest/)
    assert.match(route, /request\.nextUrl\.searchParams/)
    assert.match(route, /resolveAuditRoundResultFilter/)
    assert.match(route, /buildAuditRoundItemWhere/)
    assert.match(route, /buildAuditRoundScanHistoryWhere/)
    assert.match(route, /isAuditRoundScanHistoryResultFilter/)
    assert.match(route, /auditScanHistory\.findMany/)
    assert.match(route, /auditItem\.findMany/)
    assert.match(route, /out_of_scope/)
  }
})

test("audit round detail result rows link directly to scan edit mode", () => {
  const page = readFileSync("src/app/[locale]/(dashboard)/audit/rounds/[id]/page.tsx", "utf8")
  const th = JSON.parse(readFileSync("messages/th.json", "utf8"))
  const en = JSON.parse(readFileSync("messages/en.json", "utf8"))

  assert.match(page, /buildAuditRoundScanEditHref/)
  assert.match(page, /editHref/)
  assert.match(page, /mode", "edit"/)
  assert.match(page, /assetId", assetId/)
  assert.match(page, /returnTo", returnTo/)
  assert.match(page, /href=\{item\.editHref\}/)
  assert.match(page, /t\("editScanResult"\)/)

  for (const messages of [th, en]) {
    assert.equal(typeof messages.auditRound.editScanResult, "string")
  }
})

test("audit round filtered result exports include the active filter in filenames and labels", () => {
  const excelRoute = readFileSync("src/app/api/audit-rounds/[id]/export/route.ts", "utf8")
  const pdfRoute = readFileSync("src/app/api/audit-rounds/[id]/export-pdf/route.ts", "utf8")
  const filters = readFileSync("src/lib/audit-round-result-filters.ts", "utf8")

  assert.match(filters, /buildAuditExportFilterLabel/)
  assert.match(filters, /buildAuditExportFilename/)
  assert.match(filters, /sanitizeAuditExportFilenamePart/)
  assert.match(filters, /buildAuditExportWorksheetName/)
  assert.match(filters, /result !== "all"/)
  assert.match(filters, /search\.trim\(\)/)

  for (const route of [excelRoute, pdfRoute]) {
    assert.match(route, /buildAuditExportFilterLabel/)
    assert.match(route, /buildAuditExportFilename/)
    assert.match(route, /filterLabel/)
  }

  assert.match(excelRoute, /workbook\.addWorksheet\(buildAuditExportWorksheetName\(filterLabel\)\)/)
  assert.match(pdfRoute, /subtitle: `\$\{round\.name\} \| \$\{formatDate\(round\.startDate\)\} - \$\{formatDate\(round\.endDate\)\} \| Filter: \$\{filterLabel\}`/)
})
test("audit round result list exposes component relationship context without duplicating scan workflow", () => {
  const page = readFileSync("src/app/[locale]/(dashboard)/audit/rounds/[id]/page.tsx", "utf8")
  const th = JSON.parse(readFileSync("messages/th.json", "utf8"))
  const en = JSON.parse(readFileSync("messages/en.json", "utf8"))

  assert.match(page, /parentComponents/)
  assert.match(page, /installedInLinks/)
  assert.match(page, /componentRelationshipLines/)
  assert.match(page, /componentHasChildren/)
  assert.match(page, /componentInstalledInParent/)
  assert.doesNotMatch(page, /function AuditComponentPanel/)

  for (const messages of [th, en]) {
    assert.equal(typeof messages.auditRound.componentHasChildren, "string")
    assert.equal(typeof messages.auditRound.componentInstalledInParent, "string")
  }
})

test("audit round close checklist items link to focused drilldown pages", () => {
  const page = readFileSync("src/app/[locale]/(dashboard)/audit/rounds/[id]/page.tsx", "utf8")
  const closeButton = readFileSync("src/components/audit/audit-round-close-button.tsx", "utf8")
  const th = JSON.parse(readFileSync("messages/th.json", "utf8"))
  const en = JSON.parse(readFileSync("messages/en.json", "utf8"))

  assert.match(page, /pendingHref/)
  assert.match(page, /status=action_open/)
  assert.match(page, /checklistDrilldown/)
  assert.match(page, /href: pendingHref/)
  assert.match(page, /href: pendingReviewFindingsHref/)
  assert.match(page, /href: openActionFindingsHref/)

  assert.match(closeButton, /href\?: string/)
  assert.match(closeButton, /actionLabel\?: string/)
  assert.match(closeButton, /Link/)
  assert.match(closeButton, /item\.href && item\.value > 0/)

  for (const messages of [th, en]) {
    assert.equal(typeof messages.auditRound.checklistDrilldown, "string")
  }
})

test("audit round result rows surface scan correction history", () => {
  const page = readFileSync("src/app/[locale]/(dashboard)/audit/rounds/[id]/page.tsx", "utf8")
  const route = readFileSync("src/app/api/audit-rounds/[id]/scan/route.ts", "utf8")
  const th = JSON.parse(readFileSync("messages/th.json", "utf8"))
  const en = JSON.parse(readFileSync("messages/en.json", "utf8"))

  assert.match(page, /buildAuditCorrectionHistoryByItemId/)
  assert.match(page, /scan_result_corrected/)
  assert.match(page, /latestCorrection/)
  assert.match(page, /correctionHistoryLatest/)
  assert.match(page, /correctionHistoryFields/)

  assert.match(route, /actualDepartmentId: item\.actualDepartmentId/)
  assert.match(route, /actualLocationId: item\.actualLocationId/)
  assert.match(route, /auditRoundId: id/)
  assert.match(route, /auditItemId: item\.id/)

  for (const messages of [th, en]) {
    assert.equal(typeof messages.auditRound.correctionHistoryLatest, "string")
    assert.equal(typeof messages.auditRound.correctionHistoryFields, "string")
  }
})
