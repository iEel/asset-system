import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import test from "node:test"

import {
  auditRoundBranchFilterName,
  buildAuditExportFilename,
  buildAuditExportFilterLabel,
  buildAuditRoundItemWhere,
  buildAuditRoundItemsHref,
  buildAuditRoundPageHref,
  emptyAuditRoundListFilters,
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
  assert.equal(resolveAuditRoundResultFilter("wrong_location"), "all")

  assert.deepEqual(buildAuditRoundItemWhere({ roundId: "round-1", result: "found", search: "" }), own({ AND: [{ auditRoundId: "round-1" }, { auditResult: { in: ["found", "confirmed_with_parent"] } }] }))
  assert.deepEqual(buildAuditRoundItemWhere({ roundId: "round-1", result: "not_found", search: "" }), own({ AND: [{ auditRoundId: "round-1" }, { auditResult: "not_found" }] }))
  assert.deepEqual(buildAuditRoundItemWhere({ roundId: "round-1", result: "all", field: "location", search: "" }), own({ AND: [{ auditRoundId: "round-1" }, { findings: { some: { findingType: "wrong_location", reviewStatus: { in: ["pending", "approved"] } } } }] }))
  assert.deepEqual(buildAuditRoundItemWhere({ roundId: "round-1", result: "pending_review", search: "" }), { AND: [{ auditRoundId: "round-1" }, { findings: { some: { reviewStatus: "pending" } } }] })
  assert.deepEqual(buildAuditRoundItemWhere({ roundId: "round-1", result: "all", search: "" }), own({ AND: [{ auditRoundId: "round-1" }] }))
  // The out-of-scope list is the out-of-scope items (plan 2, gotcha 1); Task 2 moves the page and the exports onto it.
  assert.deepEqual(buildAuditRoundItemWhere({ roundId: "round-1", result: "out_of_scope", search: "" }), { AND: [{ auditRoundId: "round-1" }, { auditResult: "out_of_scope" }] })
  // The pending-review list follows the pending findings, out-of-scope finds included, as its count does (R3, the close checklist).
  assert.deepEqual(buildAuditRoundItemWhere({ roundId: "round-1", result: "pending_review", search: "" }), { AND: [{ auditRoundId: "round-1" }, { findings: { some: { reviewStatus: "pending" } } }] })
})

test("audit round result searches stay scoped to the selected bucket", () => {
  assert.deepEqual(buildAuditRoundItemWhere({ roundId: "round-1", result: "all", field: "custodian", search: "SNI-EQU" }), own({ AND: [{ auditRoundId: "round-1" }, { findings: { some: { findingType: "wrong_custodian", reviewStatus: { in: ["pending", "approved"] } } } }, { OR: [{ asset: { assetTag: { contains: "SNI-EQU" } } }, { asset: { name: { contains: "SNI-EQU" } } }] }] }))
})

test("audit round result drilldown href preserves return context and anchors the result list", () => {
  assert.equal(
    buildAuditRoundPageHref("th", "round-1", { ...emptyAuditRoundListFilters, result: "found", search: "SNI" }, { returnTo: "/th/audit/rounds?view=open", page: 2, pageSize: 50 }),
    "/th/audit/rounds/round-1?result=found&search=SNI&page=2&pageSize=50&returnTo=%2Fth%2Faudit%2Frounds%3Fview%3Dopen#audit-result-list"
  )
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
  assert.match(page, /buildAuditRoundPageHref/)
  assert.match(page, /href: pageHref\(roundWideFilters, \{ result \}\)/)
  assert.match(page, /href: cell\.count > 0 \? cell\.href : undefined/)
  assert.match(page, /openFindingReview/)
  assert.match(page, /resultListTitle/)
  assert.match(page, /resultListDescription/)
  assert.match(page, /emptyResultTitle/)
  assert.match(page, /emptyResultDescription/)
  assert.match(page, /resultFindingReviewHref/)
  assert.match(page, /findingType/)
  assert.match(page, /id="audit-result-list"/)
  assert.match(page, /<Pagination\b/)
  assert.doesNotMatch(page, /function AuditRoundResultPagination/)
  assert.match(page, /data\.rows\.map/)
})

test("audit round exports follow every filter of the list (group 2 spec §8 ตามตัวกรองที่เลือก)", () => {
  const page = readFileSync("src/app/[locale]/(dashboard)/audit/rounds/[id]/page.tsx", "utf8")
  const menus = readFileSync("src/components/audit/audit-round-header-menus.tsx", "utf8")
  assert.match(page, /const auditRoundExportHref = buildAuditRoundExportHref\(locale, round\.id, "export", filters\)/)
  assert.match(page, /const auditRoundExportPdfHref = buildAuditRoundExportHref\(locale, round\.id, "export-pdf", filters\)/)
  assert.match(menus, /href=\{exports\.excel\}/)
  assert.match(menus, /href=\{exports\.pdf\}/)
})

test("audit round result exports use the same filters as the on-screen result list", () => {
  const excelRoute = readFileSync("src/app/api/audit-rounds/[id]/export/route.ts", "utf8")
  const pdfRoute = readFileSync("src/app/api/audit-rounds/[id]/export-pdf/route.ts", "utf8")

  for (const route of [excelRoute, pdfRoute]) {
    assert.match(route, /request: NextRequest/)
    assert.match(route, /resolveAuditRoundExportFilters\(id, request\.nextUrl\.searchParams\)/)
    assert.match(route, /buildAuditRoundItemWhere\(whereInput\)/)
    assert.match(route, /auditItem\.findMany/)
    assert.doesNotMatch(route, /auditScanHistory|ScanHistoryWhere|ScanHistoryResultFilter/, "the out-of-scope export is the out-of-scope items (P2-R4)")
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
    assert.match(route, /buildAuditExportFilename/)
  }

  assert.match(excelRoute, /buildAuditExportFilterLabel/)
  assert.match(excelRoute, /filterLabel/)
  assert.match(excelRoute, /workbook\.addWorksheet\(buildAuditExportWorksheetName\(filterLabel\)\)/)
  // The PDF's filter line is in words (group 2 plan 4 P4-R7); the file name keeps the code label.
  assert.match(pdfRoute, /const filterWords = buildAuditExportFilterWords\(labelInput, auditExportFilterWords\(t\)\)/)
  assert.match(pdfRoute, /subtitle: `\$\{round\.name\} \| \$\{formatDate\(round\.startDate\)\} - \$\{formatDate\(round\.endDate\)\} \| \$\{t\("auditRound\.exportPdfFilter", \{ filter: filterWords \}\)\}`/)
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
  assert.match(page, /closeConditions/)
  assert.match(page, /href: pendingHref/)
  assert.match(page, /href: pendingReviewFindingsHref/)
  assert.match(page, /href: openActionFindingsHref/)

  assert.doesNotMatch(closeButton, /href\?: string|<StatStrip\b/)

  for (const messages of [th, en]) {
    assert.equal(typeof messages.auditRound.closeNoPendingItems, "string")
  }
})

test("audit round result rows surface scan correction history", () => {
  const page = readFileSync("src/app/[locale]/(dashboard)/audit/rounds/[id]/page.tsx", "utf8")
  const data = readFileSync("src/lib/audit-round-page-data.ts", "utf8")
  const route = readFileSync("src/app/api/audit-rounds/[id]/scan/route.ts", "utf8")
  const th = JSON.parse(readFileSync("messages/th.json", "utf8"))
  const en = JSON.parse(readFileSync("messages/en.json", "utf8"))

  assert.match(data, /buildAuditCorrectionHistoryByItemId\(logs\)/)
  assert.match(data, /action: "scan_result_corrected"/)
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
  assert.deepEqual(buildAuditRoundItemWhere({ roundId: "round-1", result: "all", search: "", branchId: "branch-1" }), own({ AND: [{ auditRoundId: "round-1" }, { expectedBranchId: "branch-1" }] }))
  assert.deepEqual(buildAuditRoundItemWhere({ roundId: "round-1", result: "all", search: "", companyId: "company-1" }), own({ AND: [{ auditRoundId: "round-1" }, { expectedCompanyId: "company-1" }] }))
  assert.deepEqual(buildAuditRoundItemWhere({ roundId: "round-1", result: "not_found", search: "SNI", companyId: "company-1", branchId: "branch-1" }), own({ AND: [{ auditRoundId: "round-1" }, { expectedCompanyId: "company-1" }, { expectedBranchId: "branch-1" }, { OR: [{ asset: { assetTag: { contains: "SNI" } } }, { asset: { name: { contains: "SNI" } } }] }, { auditResult: "not_found" }] }))
  assert.deepEqual(buildAuditRoundItemWhere({ roundId: "round-1", result: "all", search: "", companyId: null, branchId: null }), own({ AND: [{ auditRoundId: "round-1" }] }))
})

test("the company and branch params are read once and trimmed, and an empty one is no filter", () => {
  const state = parseAuditRoundResultListParams({ companyId: [" company-1 ", "company-2"], branchId: " branch-1 " })
  assert.equal(state.companyId, "company-1")
  assert.equal(state.branchId, "branch-1")
  assert.equal(parseAuditRoundResultListParams({ companyId: "   " }).companyId, null)
  assert.equal(parseAuditRoundResultListParams({ branchId: "   " }).branchId, null)
  assert.deepEqual(parseAuditRoundResultListParams({}), { result: "all", categoryId: null, field: null, components: null, companyId: null, branchId: null, search: "", page: 1, pageSize: 25 })
})

test("the dashboard's links open the round's whole item list for a company, a branch or both, and the list's own links keep them (spec §6.7, R13)", () => {
  assert.equal(buildAuditRoundItemsHref("th", "round-1", { branchId: "branch-1" }), "/th/audit/rounds/round-1?branchId=branch-1#audit-result-list")
  assert.equal(buildAuditRoundItemsHref("th", "round-1", { companyId: "company-1" }), "/th/audit/rounds/round-1?companyId=company-1#audit-result-list")
  assert.equal(
    buildAuditRoundItemsHref("th", "round-1", { companyId: "company-1", branchId: "branch-1" }),
    "/th/audit/rounds/round-1?companyId=company-1&branchId=branch-1#audit-result-list",
  )
  assert.equal(buildAuditRoundItemsHref("th", "round-1", {}), "/th/audit/rounds/round-1#audit-result-list")
  assert.equal(
    buildAuditRoundPageHref("th", "round-1", { ...emptyAuditRoundListFilters, result: "found", search: "SNI", companyId: "company-1", branchId: "branch-1" }, { page: 2, pageSize: 50, returnTo: "/th/audit/rounds" }),
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
  assert.match(page, /searchParams: Promise<\{[^}]*pageSize\?: string \| string\[\]; companyId\?: string \| string\[\]; branchId\?: string \| string\[\]; categoryId\?: string \| string\[\]; field\?: string \| string\[\]; components\?: string \| string\[\] \}>/)
  assert.match(page, /const \{ page, pageSize, \.\.\.filters \} = parseAuditRoundResultListParams\(rawSearchParams\)/)
  const data = readFileSync("src/lib/audit-round-page-data.ts", "utf8").replace(/\r\n/g, "\n")
  assert.match(data, /const rowsWhere = listWhere\(\)/)
  assert.match(data, /prisma\.auditItem\.count\(\{ where: rowsWhere \}\)/, "the number above the list counts the filtered list")
  assert.match(data, /prisma\.company\.findUnique\(\{ where: \{ id: filters\.companyId \}, select: \{ code: true, nameTh: true \} \}\)/)
  assert.match(data, /prisma\.branch\.findUnique\(\{ where: \{ id: filters\.branchId \}, select: \{ name: true, company: \{ select: \{ code: true \} \} \} \}\)/)
  assert.match(page, /if \(\(\w+\.companyId && !filterCompany\) \|\| \(\w+\.branchId && !filterBranch\) \|\| staleCategory\) \{\n\s+redirect\(/, "an unknown company, branch or category drops its filter")
  assert.match(page, /label: t\("companyFilterChip", \{ company: `\$\{filterCompany\.code\} - \$\{filterCompany\.nameTh\}` \}\)/)
  assert.match(page, /label: t\("branchFilterChip", \{ branch: auditRoundBranchFilterName\(\{ name: filterBranch\.name, companyCode: filterBranch\.company\.code \}, Boolean\(filterCompany\)\) \}\)/, "R16")
  assert.match(page, /<FilterChipList chips=\{resultFilterChips\} label=\{t\("activeFilters"\)\} removeLabel=\{t\("clearFilter"\)\} clearAll=\{\{ href: allResultHref, label: t\("clearAllFilters"\) \}\} \/>/)
  assert.match(page, /hiddenInputs=\{Object\.fromEntries\(auditRoundHrefQuery\(pageHref\(filters, \{ search: "", page: 1 \}\)\)\)\}/, "the search keeps every filter")
  assert.match(page, /previousHref=\{pageHref\(filters, \{ page: page - 1 \}\)\}/)
  assert.match(page, /const pageHref = \(target: AuditRoundListFilters, overrides: AuditRoundPageHrefOverrides = \{\}\) =>/)
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
