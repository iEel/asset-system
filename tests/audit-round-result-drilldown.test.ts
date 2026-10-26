import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import test from "node:test"

import {
  auditRoundBranchFilterName,
  buildAuditExportFilename,
  buildAuditExportFilterLabel,
  buildAuditRoundResultSummaryGroups,
  buildAuditRoundItemWhere,
  buildAuditRoundItemsHref,
  buildAuditRoundResultListHref,
  buildAuditRoundScanHistoryWhere,
  getAuditRoundItemResultLabelKey,
  getAuditRoundItemStatusLabelKey,
  parseAuditRoundResultListParams,
  resolveAuditRoundResultFilter,
} from "../src/lib/audit-round-result-filters.ts"

// The round's own items (group 2 spec §5): every list but the out-of-scope and pending-review ones leaves the out-of-scope finds out,
// null-safe because a pending item has no result.
const own = (where: object) => ({ AND: [where, { OR: [{ auditResult: null }, { auditResult: { not: "out_of_scope" } }] }] })

test("audit round result filters map dashboard buckets to scoped item queries", () => {
  assert.equal(resolveAuditRoundResultFilter("missing"), "all")
  assert.equal(resolveAuditRoundResultFilter("wrong_location"), "wrong_location")

  assert.deepEqual(buildAuditRoundItemWhere({ roundId: "round-1", result: "found", search: "" }), own({
    auditRoundId: "round-1",
    auditResult: { in: ["found", "confirmed_with_parent"] },
  }))
  assert.deepEqual(buildAuditRoundItemWhere({ roundId: "round-1", result: "not_found", search: "" }), own({
    auditRoundId: "round-1",
    auditResult: "not_found",
  }))
  assert.deepEqual(buildAuditRoundItemWhere({ roundId: "round-1", result: "wrong_location", search: "" }), own({
    auditRoundId: "round-1",
    findings: { some: { findingType: "wrong_location" } },
  }))
  assert.deepEqual(buildAuditRoundItemWhere({ roundId: "round-1", result: "pending_review", search: "" }), {
    auditRoundId: "round-1",
    findings: { some: { reviewStatus: "pending" } },
  })
  assert.deepEqual(buildAuditRoundItemWhere({ roundId: "round-1", result: "all", search: "" }), own({ auditRoundId: "round-1" }))
  // The out-of-scope list still reads the scan history (buildAuditRoundScanHistoryWhere); plan 2 moves it onto items.
  assert.deepEqual(buildAuditRoundItemWhere({ roundId: "round-1", result: "out_of_scope", search: "" }), { auditRoundId: "round-1" })
  // The pending-review list follows the pending findings, out-of-scope finds included, as its count does (R3, the close checklist).
  assert.deepEqual(buildAuditRoundItemWhere({ roundId: "round-1", result: "pending_review", search: "" }), { auditRoundId: "round-1", findings: { some: { reviewStatus: "pending" } } })
})

test("audit round result searches stay scoped to the selected bucket", () => {
  assert.deepEqual(buildAuditRoundItemWhere({ roundId: "round-1", result: "wrong_custodian", search: "SNI-EQU" }), own({
    auditRoundId: "round-1",
    findings: { some: { findingType: "wrong_custodian" } },
    OR: [
      { asset: { assetTag: { contains: "SNI-EQU" } } },
      { asset: { name: { contains: "SNI-EQU" } } },
    ],
  }))

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
  assert.match(page, /href: item\.count > 0 \? item\.href : undefined/)
  assert.match(page, /openFindingReview/)
  assert.match(page, /viewPendingReviewAssets/)
  assert.match(page, /resultListTitle/)
  assert.match(page, /resultListDescription/)
  assert.match(page, /emptyResultTitle/)
  assert.match(page, /emptyResultDescription/)
  assert.match(page, /resultFindingReviewHref/)
  assert.match(page, /findingType/)
  assert.match(page, /id="audit-result-list"/)
  assert.match(page, /<Pagination\b/)
  assert.doesNotMatch(page, /function AuditRoundResultPagination/)
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
    assert.match(route, /request\.nextUrl\.searchParams\.get\("companyId"\)/)
    assert.match(route, /request\.nextUrl\.searchParams\.get\("branchId"\)/)
    assert.match(route, /buildAuditRoundItemWhere\(\{ roundId, result, search, \.\.\.filters \}\)/)
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
  assert.match(closeButton, /<StatStrip\b/)
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

test("out_of_scope results map to the existing outOfScope label", () => {
  assert.equal(getAuditRoundItemResultLabelKey("out_of_scope"), "outOfScope")
  assert.equal(getAuditRoundItemResultLabelKey("mismatch"), "mismatch")
})

test("the results the scan stores for a mismatch read รายการไม่ตรง, never the code (group 1 look step)", () => {
  for (const result of ["wrong_location", "wrong_custodian", "wrong_department", "wrong_condition", "need_review"]) {
    assert.equal(getAuditRoundItemResultLabelKey(result), "mismatch", result)
  }
})

const roundPage = () => readFileSync("src/app/[locale]/(dashboard)/audit/rounds/[id]/page.tsx", "utf8").replace(/\r\n/g, "\n")

test("the round's item list narrows to the expected company and branch, alone or with a bucket and a search (spec §6.7, R13)", () => {
  assert.deepEqual(buildAuditRoundItemWhere({ roundId: "round-1", result: "all", search: "", branchId: "branch-1" }), own({
    auditRoundId: "round-1",
    expectedBranchId: "branch-1",
  }))
  assert.deepEqual(buildAuditRoundItemWhere({ roundId: "round-1", result: "all", search: "", companyId: "company-1" }), own({
    auditRoundId: "round-1",
    expectedCompanyId: "company-1",
  }))
  assert.deepEqual(buildAuditRoundItemWhere({ roundId: "round-1", result: "not_found", search: "SNI", companyId: "company-1", branchId: "branch-1" }), own({
    auditRoundId: "round-1",
    expectedCompanyId: "company-1",
    expectedBranchId: "branch-1",
    auditResult: "not_found",
    OR: [
      { asset: { assetTag: { contains: "SNI" } } },
      { asset: { name: { contains: "SNI" } } },
    ],
  }))
  assert.deepEqual(buildAuditRoundItemWhere({ roundId: "round-1", result: "all", search: "", companyId: null, branchId: null }), own({ auditRoundId: "round-1" }))
})

test("the company and branch params are read once and trimmed, and an empty one is no filter", () => {
  const state = parseAuditRoundResultListParams({ companyId: [" company-1 ", "company-2"], branchId: " branch-1 " })
  assert.equal(state.companyId, "company-1")
  assert.equal(state.branchId, "branch-1")
  assert.equal(parseAuditRoundResultListParams({ companyId: "   " }).companyId, null)
  assert.equal(parseAuditRoundResultListParams({ branchId: "   " }).branchId, null)
  assert.deepEqual(parseAuditRoundResultListParams({}), { result: "all", search: "", companyId: null, branchId: null, page: 1, pageSize: 25 })
})

test("the dashboard's links open the round's whole item list for a company, a branch or both, and the list's own links keep them (spec §6.7, R13)", () => {
  assert.equal(buildAuditRoundItemsHref("th", "round-1", { branchId: "branch-1" }), "/th/audit/rounds/round-1?branchId=branch-1&page=1&pageSize=25#audit-result-list")
  assert.equal(buildAuditRoundItemsHref("th", "round-1", { companyId: "company-1" }), "/th/audit/rounds/round-1?companyId=company-1&page=1&pageSize=25#audit-result-list")
  assert.equal(
    buildAuditRoundItemsHref("th", "round-1", { companyId: "company-1", branchId: "branch-1" }),
    "/th/audit/rounds/round-1?companyId=company-1&branchId=branch-1&page=1&pageSize=25#audit-result-list",
  )
  assert.equal(buildAuditRoundItemsHref("th", "round-1", {}), "/th/audit/rounds/round-1?page=1&pageSize=25#audit-result-list")
  assert.equal(
    buildAuditRoundResultListHref({ locale: "th", roundId: "round-1", result: "found", search: "SNI", companyId: "company-1", branchId: "branch-1", page: 2, pageSize: 50, returnTo: "/th/audit/rounds" }),
    "/th/audit/rounds/round-1?result=found&search=SNI&companyId=company-1&branchId=branch-1&page=2&pageSize=50&returnTo=%2Fth%2Faudit%2Frounds#audit-result-list",
  )
})

test("a branch is named with its company's code until a company is chosen (R16)", () => {
  const headOffice = { name: "สำนักงานใหญ่", companyCode: "SNI" }
  assert.equal(auditRoundBranchFilterName(headOffice, false), "SNI / สำนักงานใหญ่")
  assert.equal(auditRoundBranchFilterName(headOffice, true), "สำนักงานใหญ่")
})

test("an export of a narrowed list says so in its label and file name, naming the branch as the chip does (R13, R16)", () => {
  const sni = { code: "SNI" }
  const hq = { code: "HQ", company: sni }
  assert.equal(buildAuditExportFilterLabel({ result: "all", search: "", branch: hq }), "branch-SNI-HQ")
  assert.equal(buildAuditExportFilterLabel({ result: "all", search: "", company: sni }), "company-SNI")
  assert.equal(buildAuditExportFilterLabel({ result: "found", search: "PC", company: sni, branch: hq }), "found-company-SNI-branch-HQ-search-PC")
  assert.equal(buildAuditExportFilterLabel({ result: "all", search: "" }), "all")
  assert.equal(
    buildAuditExportFilename({ prefix: "audit-result", auditNo: "AUD-2026-0003", result: "all", search: "", company: sni, branch: hq, extension: "xlsx", date: new Date("2026-10-26T03:00:00Z") }),
    "audit-result-AUD-2026-0003-company-SNI-branch-HQ-2026-10-26.xlsx",
  )
})

test("the round page narrows its item list by company and branch, names each in a removable chip, and counts the filtered list (spec §6.7, R13)", () => {
  const page = roundPage()
  assert.match(page, /searchParams: Promise<\{[^}]*pageSize\?: string \| string\[\]; companyId\?: string \| string\[\]; branchId\?: string \| string\[\] \}>/)
  assert.match(page, /const itemFilters = \{ companyId: resultListState\.companyId, branchId: resultListState\.branchId \}/)
  assert.match(page, /const resultItemWhere = buildAuditRoundItemWhere\(\{ roundId: id, result: resultListState\.result, search: resultListState\.search, \.\.\.itemFilters \}\)/)
  assert.match(page, /prisma\.auditItem\.count\(\{ where: resultItemWhere \}\)/, "the number above the list counts the filtered list")
  assert.match(page, /prisma\.company\.findUnique\(\{ where: \{ id: resultListState\.companyId \}, select: \{ code: true, nameTh: true \} \}\)/)
  assert.match(page, /prisma\.branch\.findUnique\(\{ where: \{ id: resultListState\.branchId \}, select: \{ name: true, company: \{ select: \{ code: true \} \} \} \}\)/)
  assert.match(page, /if \(\(resultListState\.companyId && !filterCompany\) \|\| \(resultListState\.branchId && !filterBranch\)\) \{\n\s+redirect\(buildAuditRoundResultListHref\(/, "an unknown company or branch drops its filter")
  assert.match(page, /label: t\("companyFilterChip", \{ company: `\$\{filterCompany\.code\} - \$\{filterCompany\.nameTh\}` \}\)/)
  assert.match(page, /label: t\("branchFilterChip", \{ branch: auditRoundBranchFilterName\(\{ name: filterBranch\.name, companyCode: filterBranch\.company\.code \}, Boolean\(filterCompany\)\) \}\)/, "R16")
  assert.match(page, /<FilterChipList className="mb-3" chips=\{resultFilterChips\} label=\{t\("activeFilters"\)\} removeLabel=\{t\("clearFilter"\)\} \/>/)
  assert.match(page, /\.\.\.\(resultListState\.companyId \? \{ companyId: resultListState\.companyId \} : \{\}\)/, "the search keeps the company")
  assert.match(page, /\.\.\.\(resultListState\.branchId \? \{ branchId: resultListState\.branchId \} : \{\}\)/, "the search keeps the branch")
  assert.match(page, /previousHref=\{buildAuditRoundResultListHref\(\{ [^}]*\.\.\.itemFilters, page: resultListState\.page - 1/)
  assert.match(page, /state: Pick<AuditRoundResultListState, "result" \| "search" \| "companyId" \| "branchId">/)
  assert.doesNotMatch(page, /const \w+ResultHref = buildAuditRoundResultListHref\(\{[^}]*(?:itemFilters|companyId|branchId)/, "the round-wide buckets open round-wide lists")
})

test("the company and branch chips' words (spec §6.7)", () => {
  const th = JSON.parse(readFileSync("messages/th.json", "utf8"))
  const en = JSON.parse(readFileSync("messages/en.json", "utf8"))
  assert.equal(th.auditRound.companyFilterChip, "บริษัท: {company}")
  assert.equal(en.auditRound.companyFilterChip, "Company: {company}")
  assert.equal(th.auditRound.branchFilterChip, "สาขา: {branch}")
  assert.equal(en.auditRound.branchFilterChip, "Branch: {branch}")
  assert.equal(th.auditRound.activeFilters, "ตัวกรองที่ใช้อยู่")
  assert.equal(en.auditRound.activeFilters, "Active filters")
  assert.equal(th.auditRound.clearFilter, "ล้างตัวกรองนี้")
  assert.equal(en.auditRound.clearFilter, "Clear this filter")
})
