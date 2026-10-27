import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import test from "node:test"

import {
  buildAuditExportFilename,
  buildAuditExportFilterLabel,
  buildAuditRoundExportSummary,
  buildAuditRoundVarianceWhere,
} from "../src/lib/audit-round-result-filters.ts"

const read = (path: string) => readFileSync(path, "utf8").replace(/\r\n/g, "\n")
const D = "src/app/[locale]/(dashboard)/"
const API = "src/app/api/audit-rounds/[id]/"
const own = (where: object) => ({ AND: [where, { OR: [{ auditResult: null }, { auditResult: { not: "out_of_scope" } }] }] })

test("an export's label and file name name every filter: category (or อื่น ๆ), field and missing components slot in after the branch (spec §8)", () => {
  const sni = { code: "SNI" }
  const hq = { code: "HQ", company: sni }
  assert.equal(
    buildAuditExportFilterLabel({ result: "mismatch", search: "PC", company: sni, branch: hq, category: { code: "NB" }, field: "location", components: "missing" }),
    "mismatch-company-SNI-branch-HQ-category-NB-field-location-components-missing-search-PC",
  )
  assert.equal(buildAuditExportFilterLabel({ result: "all", search: "", category: { code: "other" } }), "category-other")
  assert.equal(buildAuditExportFilterLabel({ result: "all", search: "", field: null, components: null, category: null }), "all")
  assert.equal(
    buildAuditExportFilename({ prefix: "audit-variance", auditNo: "AUD-2026-0003", result: "all", search: "", field: "department", components: "missing", extension: "xlsx", date: new Date("2026-10-27T03:00:00Z") }),
    "audit-variance-AUD-2026-0003-field-department-components-missing-2026-10-27.xlsx",
  )
  assert.equal(
    buildAuditExportFilename({ prefix: "audit-variance", auditNo: "AUD-2026-0003", result: "all", search: "", extension: "xlsx", date: new Date("2026-10-27T03:00:00Z") }),
    "audit-variance-AUD-2026-0003-2026-10-27.xlsx",
    "no filter: today's variance file name",
  )
})

test("the PDF summary: pending, checked (own, not pending), mismatch or not found, and the out-of-scope finds apart; the three add up to the rows (spec §5, P2-R4)", () => {
  const summary = buildAuditRoundExportSummary([
    { auditStatus: "pending", auditResult: null },
    { auditStatus: "scanned", auditResult: "found" },
    { auditStatus: "reviewed", auditResult: "wrong_location" },
    { auditStatus: "reviewed", auditResult: null },
    { auditStatus: "reviewed", auditResult: "not_found" },
    { auditStatus: "reviewed", auditResult: "out_of_scope" },
  ])
  assert.deepEqual(summary, { exported: 6, pending: 1, checked: 4, mismatchOrNotFound: 3, outOfScope: 1 })
  assert.equal(summary.pending + summary.checked + summary.outOfScope, summary.exported)
})

test("the variance report follows the filters; with no result chosen it keeps the out-of-scope finds beside the own items, counted apart (P2-R6)", () => {
  assert.deepEqual(buildAuditRoundVarianceWhere({ roundId: "round-1", result: "all", companyId: "c-1" }), { AND: [{ auditRoundId: "round-1" }, { expectedCompanyId: "c-1" }] })
  assert.deepEqual(buildAuditRoundVarianceWhere({ roundId: "round-1", result: "not_found", companyId: "c-1" }), own({ AND: [{ auditRoundId: "round-1" }, { expectedCompanyId: "c-1" }, { auditResult: "not_found" }] }))
})

test("the room search, the category counts and the export filters are server lookups: chunked, by relation, never writing (P2-R5, P2-R11)", () => {
  const source = read("src/lib/audit-round-list-lookups.ts")
  assert.match(source, /export async function findAuditRoundSearchLocationIds\(roundId: string, search: string\): Promise<string\[\]>/)
  assert.match(source, /by: \["expectedLocationId"\],\s*where: \{ auditRoundId: roundId \}/)
  assert.match(source, /chunkAuditIds\(roomIds\)\.map\(\(chunk\) =>/)
  assert.match(source, /where: \{ id: \{ in: chunk \}, OR: \[\{ code: \{ contains: text \} \}, \{ name: \{ contains: text \} \}\] \}/)
  assert.match(source, /export async function countAuditRoundItemCategories\(itemWhere: Prisma\.AuditItemWhereInput\): Promise<Array<\{ categoryId: string; count: number \}>>/)
  assert.match(source, /prisma\.asset\.groupBy\(\{\s*by: \["categoryId"\],\s*where: \{ auditItems: \{ some: itemWhere \} \},\s*_count: \{ _all: true \},?\s*\}\)/)
  assert.match(source, /export async function resolveAuditRoundListWhereInput\(roundId: string, filters: AuditRoundListFilters\): Promise<AuditRoundItemWhereInput>/)
  assert.match(source, /foldTopCategories\(rows\)\.top\.map\(\(row\) => row\.categoryId\)/)
  assert.match(source, /buildAuditRoundItemWhere\(\{ \.\.\.base, categoryId: null \}\)/, "อื่น ๆ is counted with every other filter, as the chip row counts it")
  assert.match(source, /export async function resolveAuditRoundExportFilters\(roundId: string, searchParams: URLSearchParams\)/)
  assert.match(source, /parseAuditRoundListFilters\(Object\.fromEntries\(searchParams\)\)/)
  assert.match(source, /prisma\.assetCategory\.findUnique\(\{ where: \{ id: parsed\.categoryId \}, select: \{ code: true \} \}\)/)
  assert.doesNotMatch(source, /\.(create|update|upsert|delete)(Many)?\(|\$queryRaw/)

  const labels = read("src/lib/audit-finding-labels.ts")
  assert.match(labels, /export async function buildAuditReferenceLabels\(ids: ReadonlyArray<string \| null \| undefined>\): Promise<Map<string, string>>/)
  assert.match(labels, /chunkAuditIds\(/)
  assert.match(labels, /return buildAuditReferenceLabels\(/, "buildFindingValueLabels shares the chunked lookup")
  assert.equal(labels.match(/prisma\.location\.findMany\(/g)?.length, 1)
})

test("the Excel and PDF exports read the page's whole filter state, the out-of-scope finds as items, with chunked labels and a stable order (P2-R4, P2-R5, P2-R20)", () => {
  for (const file of ["export/route.ts", "export-pdf/route.ts"]) {
    const route = read(`${API}${file}`)
    assert.match(route, /resolveAuditRoundExportFilters\(id, request\.nextUrl\.searchParams\)/, file)
    assert.match(route, /prisma\.auditItem\.findMany\(\{\s*where: buildAuditRoundItemWhere\(whereInput\),\s*orderBy: \[\{ auditStatus: "asc" \}, \{ createdAt: "asc" \}, \{ id: "asc" \}\],/, file)
    assert.match(route, /import \{ buildAuditReferenceLabels \} from "@\/lib\/audit-finding-labels"/, file)
    assert.match(route, /category, field: filters\.field, components: filters\.components/, file)
    assert.doesNotMatch(route, /auditScanHistory|buildOutOfScopeExportRows|isOutOfScopeExport|ScanHistory|async function buildAuditReferenceLabels|prisma\.location\.findMany/, file)
  }
  const pdf = read(`${API}export-pdf/route.ts`)
  assert.match(pdf, /const summary = buildAuditRoundExportSummary\(rows\)/)
  assert.match(pdf, /\{ label: "Checked", value: summary\.checked \}/)
  assert.match(pdf, /\{ label: "Out of Scope", value: summary\.outOfScope \}/)
  assert.doesNotMatch(pdf, /row\.auditStatus === "out_of_scope"|scannedCount/)
})

test("the variance report: the filters, the round's own items, the out-of-scope finds from items, and done plans still open (spec §8, P2-R6)", () => {
  const route = read(`${API}variance-export/route.ts`)
  assert.match(route, /export async function GET\(request: NextRequest, context: AuditVarianceExportContext\)/)
  assert.match(route, /resolveAuditRoundExportFilters\(id, request\.nextUrl\.searchParams\)/)
  assert.match(route, /const scopeWhere = buildAuditRoundVarianceWhere\(whereInput\)/)
  assert.match(route, /prisma\.auditItem\.groupBy\(\{\s*by: \["auditStatus", "auditResult"\],\s*where: scopeWhere,/)
  assert.match(route, /where: \{ auditRoundId: id, auditItem: scopeWhere \}/)
  assert.match(route, /orderBy: \[\{ reviewStatus: "asc" \}, \{ findingType: "asc" \}, \{ reportedAt: "asc" \}, \{ id: "asc" \}\]/)
  assert.match(route, /const counts = foldAuditRoundResultCounts\(/)
  for (const row of [
    /\{ metric: "Total Expected Assets", count: counts\.all \}/,
    /\{ metric: "Matched Assets", count: counts\.found \}/,
    /\{ metric: "Mismatched Assets", count: counts\.mismatch \}/,
    /\{ metric: "Pending Assets", count: counts\.pending \}/,
    /\{ metric: "Not Found Assets", count: counts\.notFound \}/,
    /\{ metric: "Out-of-scope Assets", count: counts\.outOfScope \}/,
  ]) assert.match(route, row)
  assert.match(route, /findings\.filter\(\(finding\) => isOpenAuditFindingActionStatus\(finding\.actionStatus\)\)\.length/)
  assert.match(route, /buildAuditExportFilename\(\{ prefix: "audit-variance"/)
  assert.match(route, /round\.status === "cancelled"/, "the read-only guard (audit-round-cancellation.test.ts:65-85)")
  assert.doesNotMatch(route, /auditScanHistory|_request|\["planned", "in_progress"\]|items\.length|Out-of-scope Scan Events/)
})

test("the round page lists the out-of-scope finds as items under every filter, counts them from the items, and offers no แก้ไขผลตรวจ on them (P2-R4, P2-R5)", () => {
  const page = read(`${D}audit/rounds/[id]/page.tsx`)
  const data = read("src/lib/audit-round-page-data.ts")
  assert.doesNotMatch(page, /auditScanHistory\.findMany|auditItemId: null|isOutOfScopeResultList|ScanHistoryWhere|ScanHistoryResultFilter|outOfScopeScan/)
  assert.match(data, /findAuditRoundSearchLocationIds\(roundId, filters\.search\)/)
  assert.match(data, /orderBy: \[\{ auditStatus: "asc" \}, \{ createdAt: "desc" \}, \{ id: "asc" \}\]/)
  assert.match(page, /const editHref = canScan && !isRoundReadOnly && item\.auditResult !== "out_of_scope" \? buildAuditRoundScanEditHref\(/)
  assert.equal(page.match(/\{item\.editHref \? \(/g)?.length, 1, "the phone card's button; the table's is in ⋯ (item.groups)")
  assert.match(page, /if \(filterCompany\) \{\n\s+resultFilterChips\.push/, "the company chip shows on the out-of-scope list too")
  assert.match(page, /const auditRoundExportHref = buildAuditRoundExportHref\(round\.id, "export", filters\)/)
  assert.match(page, /const auditRoundExportPdfHref = buildAuditRoundExportHref\(round\.id, "export-pdf", filters\)/)
  assert.match(page, /const auditRoundVarianceHref = buildAuditRoundExportHref\(round\.id, "variance-export", filters\)/)
  assert.doesNotMatch(page, /function buildAuditRoundExportHref/)
  // The cancel dialog still counts every scan event (route.ts getCancellationImpact).
  assert.match(data, /prisma\.auditScanHistory\.count\(\{ where: \{ auditRoundId: roundId \} \}\)/)
})

test("the rounds list counts the out-of-scope finds from the items, as the round page's list it opens (P2-R4, R4 closed)", () => {
  const page = read(`${D}audit/rounds/page.tsx`)
  assert.doesNotMatch(page, /auditScanHistory|outOfScopeByRoundId|outOfScopeWorkCounts/)
  assert.match(page, /const \[countsByRoundId, findingWorkRows\] = roundIds\.length/)
  assert.match(page, /buildAuditRoundInsights\(allRounds, countsByRoundId, findingWorkByRoundId\)/)
  assert.match(read("src/lib/audit-rounds-list-rules.ts"), /outOfScope: counts\.outOfScope,/)
})

test("the work view no longer reads like the badge, and the variance report is in Thai (M8, P2-R21, spec §5)", () => {
  const th = JSON.parse(read("messages/th.json"))
  const en = JSON.parse(read("messages/en.json"))
  assert.equal(th.auditRound.viewReview, "มีรายการรอพิจารณา")
  assert.equal(en.auditRound.viewReview, "Has Pending Decisions")
  assert.equal(th.auditRound.pendingReview, "รอพิจารณา", "the badge keeps its word")
  assert.notEqual(th.auditRound.viewReview, th.auditRound.pendingReview)
  assert.equal(th.auditRound.exportVariance, "รายงานผลต่าง")
})
