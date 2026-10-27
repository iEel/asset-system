// The round page's list filters (group 2 spec §5, §8): the parsed state, one where per filter in one AND list, the
// result fold, and the one link writer for the page, its exports and the dashboard. Pure and client-safe: `import type`
// and relative `.ts` imports only (asset-detail-frame-rules, asset-history-rules and dashboard-overview-rules import it).
import type { Prisma } from "@prisma/client"
import { isSuccessfulAuditResult, successfulAuditResults } from "./audit-result-summary.ts"
import { auditRoundOutOfScopeItemWhere, isAuditRoundOwnItem, withAuditRoundOwnItems } from "./audit-round-counts-rules.ts"

export const auditRoundResultFilterValues = ["all", "pending", "found", "mismatch", "not_found", "out_of_scope", "pending_review"] as const

export type AuditRoundResultFilter = (typeof auditRoundResultFilterValues)[number]

export const auditFindingFields = ["location", "department", "custodian", "condition"] as const

export type AuditFindingField = (typeof auditFindingFields)[number]

export const auditFindingTypeByField: Readonly<Record<AuditFindingField, string>> = Object.freeze({
  location: "wrong_location",
  department: "wrong_department",
  custodian: "wrong_custodian",
  condition: "wrong_condition",
})

// P2-R1: a field bar counts findings waiting or approved; `exception` and every `rejected` are left out.
export const auditCountedFindingReviewStatuses = ["pending", "approved"] as const

// "อื่น ๆ" on the category chip row: none of the categories it shows (P2-R11, P2-R29).
export const AUDIT_ROUND_OTHER_CATEGORY = "other"

// P2-R22: an old `result=wrong_*` link opens the whole list narrowed to that field.
const legacyFieldByResult: Readonly<Record<string, AuditFindingField>> = Object.freeze({ wrong_location: "location", wrong_department: "department", wrong_custodian: "custodian", wrong_condition: "condition" })

export type AuditRoundListFilters = {
  result: AuditRoundResultFilter
  categoryId: string | null
  field: AuditFindingField | null
  components: "missing" | null
  companyId: string | null
  branchId: string | null
  search: string
  expectedLocationIds?: readonly string[]
}

export type AuditRoundListParams = Readonly<Record<string, string | string[] | undefined>>

export type AuditRoundResultListState = AuditRoundListFilters & { page: number; pageSize: number }

export const auditRoundResultPageSizeOptions = [25, 50, 100] as const

const AUDIT_ROUND_DEFAULT_PAGE_SIZE = 25

const auditRoundItemStatusLabelKeys: Record<string, "pending" | "scanned"> = {
  pending: "pending",
  scanned: "scanned",
}

const auditRoundItemResultLabelKeys: Record<string, "found" | "confirmedWithParent" | "notFound" | "mismatch" | "outOfScope"> = {
  found: "found",
  confirmed_with_parent: "confirmedWithParent",
  not_found: "notFound",
  mismatch: "mismatch",
  // What the scan stores for a mismatch (api/audit-rounds/[id]/scan: one wrong field, or need_review for several):
  // the round page and the asset's fact strip read "รายการไม่ตรง", never the code.
  wrong_location: "mismatch",
  wrong_custodian: "mismatch",
  wrong_department: "mismatch",
  wrong_condition: "mismatch",
  need_review: "mismatch",
  out_of_scope: "outOfScope",
}

export function getAuditRoundItemStatusLabelKey(status: string | null | undefined) {
  return status ? (auditRoundItemStatusLabelKeys[status] ?? null) : null
}

export function getAuditRoundItemResultLabelKey(result: string | null | undefined) {
  return result ? (auditRoundItemResultLabelKeys[result] ?? null) : null
}

export function resolveAuditRoundResultFilter(value?: string | string[] | null): AuditRoundResultFilter {
  const raw = Array.isArray(value) ? value[0] : value
  return auditRoundResultFilterValues.includes(raw as AuditRoundResultFilter) ? (raw as AuditRoundResultFilter) : "all"
}

export function resolveAuditFindingField(value?: string | string[] | null): AuditFindingField | null {
  const raw = firstValue(value ?? undefined)
  return auditFindingFields.includes(raw as AuditFindingField) ? (raw as AuditFindingField) : null
}

export function parseAuditRoundListFilters(params: AuditRoundListParams): AuditRoundListFilters {
  const rawResult = firstValue(params.result)
  const legacyField = typeof rawResult === "string" && Object.hasOwn(legacyFieldByResult, rawResult) ? legacyFieldByResult[rawResult] : null
  return {
    result: resolveAuditRoundResultFilter(params.result),
    categoryId: trimmedOrNull(params.categoryId),
    field: resolveAuditFindingField(params.field) ?? legacyField,
    components: firstValue(params.components) === "missing" ? "missing" : null,
    companyId: trimmedOrNull(params.companyId),
    branchId: trimmedOrNull(params.branchId),
    search: String(firstValue(params.search) ?? "").trim(),
  }
}

export const emptyAuditRoundListFilters: Readonly<AuditRoundListFilters> = Object.freeze(parseAuditRoundListFilters({}))

export function parseAuditRoundResultListParams(params: AuditRoundListParams): AuditRoundResultListState {
  const pageValue = Number(firstValue(params.page) ?? 1) || 1
  const pageSizeValue = Number(firstValue(params.pageSize) ?? 25) || 25
  return {
    ...parseAuditRoundListFilters(params),
    page: Math.max(1, pageValue),
    pageSize: Math.min(100, Math.max(10, pageSizeValue)),
  }
}

export type AuditRoundItemWhereInput = {
  roundId: string
  result: AuditRoundResultFilter
  search?: string | null
  companyId?: string | null
  branchId?: string | null
  categoryId?: string | null
  field?: AuditFindingField | null
  components?: "missing" | null
  expectedLocationIds?: readonly string[]
  shownCategoryIds?: readonly string[] // the six categories the chip row shows; categoryId "other" = none of them
}

export function auditRoundResultWhere(result: AuditRoundResultFilter): Prisma.AuditItemWhereInput | null {
  switch (result) {
    case "all":
      return null
    case "pending":
      return { auditStatus: "pending" }
    case "found":
      return { auditResult: { in: Array.from(successfulAuditResults) } }
    case "mismatch":
      // `isVarianceAuditResult` (audit-result-summary.ts) as a where. `not: null` is spelled out so a pending item, whose
      // result is null, is never a variance. The null branch is P2-R2: a checked item with no result (the review route
      // sets the status only) reads ไม่ตรง, so พบตรง + ไม่ตรง + ไม่พบ + รอตรวจ = ทั้งหมด. The `found` and `not_found`
      // wheres need no status, because only a pending item has a null result and no write path leaves a pending item
      // with a result (mark-not-found takes pending items only; the scan always sets scanned or reconciled).
      return {
        OR: [
          { auditResult: { not: null, notIn: [...successfulAuditResults, "not_found", "out_of_scope"] } },
          { auditResult: null, auditStatus: { not: "pending" } },
        ],
      }
    case "not_found":
      return { auditResult: "not_found" }
    case "out_of_scope":
      return auditRoundOutOfScopeItemWhere
    case "pending_review":
      return { findings: { some: { reviewStatus: "pending" } } }
  }
}

// An item has no category of its own: an asset's category rarely changes, and spec §4 allows no new column.
export function auditRoundCategoryWhere(categoryId: string, shownCategoryIds: readonly string[] = []): Prisma.AuditItemWhereInput {
  return categoryId === AUDIT_ROUND_OTHER_CATEGORY ? { asset: { categoryId: { notIn: [...shownCategoryIds] } } } : { asset: { categoryId } }
}

export function auditRoundFieldFindingWhere(field: AuditFindingField): Prisma.AuditItemWhereInput {
  return { findings: { some: { findingType: auditFindingTypeByField[field], reviewStatus: { in: [...auditCountedFindingReviewStatuses] } } } }
}

// A parent with an installed component whose own item in this round is ไม่พบ (spec §8, decision 6). Both not-found
// paths set the result (the pending list and the component-missing dialog post mark-not-found), and a rejected not-found
// finding keeps it (P2-R19). Relations only, so no id list.
export function auditRoundComponentsMissingWhere(roundId: string): Prisma.AuditItemWhereInput {
  return {
    asset: {
      parentComponents: {
        some: { status: "installed", removedAt: null, componentAsset: { auditItems: { some: { auditRoundId: roundId, auditResult: "not_found" } } } },
      },
    },
  }
}

// The caller passes the trimmed text; the expected rooms come from the page's or route's lookup (P2-R5).
export function auditRoundSearchWhere(search: string, expectedLocationIds: readonly string[] = []): Prisma.AuditItemWhereInput {
  return {
    OR: [...buildAssetSearchWhere(search), ...(expectedLocationIds.length > 0 ? [{ expectedLocationId: { in: [...expectedLocationIds] } }] : [])],
  }
}

function auditRoundFilterClauses(input: Omit<AuditRoundItemWhereInput, "result">): Prisma.AuditItemWhereInput[] {
  const clauses: Prisma.AuditItemWhereInput[] = [{ auditRoundId: input.roundId }]
  if (input.companyId) clauses.push({ expectedCompanyId: input.companyId })
  if (input.branchId) clauses.push({ expectedBranchId: input.branchId })
  if (input.categoryId) clauses.push(auditRoundCategoryWhere(input.categoryId, input.shownCategoryIds))
  if (input.field) clauses.push(auditRoundFieldFindingWhere(input.field))
  if (input.components === "missing") clauses.push(auditRoundComponentsMissingWhere(input.roundId))
  const searchText = input.search?.trim()
  if (searchText) clauses.push(auditRoundSearchWhere(searchText, input.expectedLocationIds))
  return clauses
}

/** Every filter but the result, not own-wrapped, so one fold counts the out-of-scope finds apart. */
export function buildAuditRoundFilterWhere(input: Omit<AuditRoundItemWhereInput, "result">): Prisma.AuditItemWhereInput {
  return { AND: auditRoundFilterClauses(input) }
}

export function buildAuditRoundItemWhere(input: AuditRoundItemWhereInput): Prisma.AuditItemWhereInput {
  const { result } = input
  const resultWhere = auditRoundResultWhere(result)
  // Every filter in one AND list (a spread would overwrite: pending review and a field both write findings; a
  // category and missing components both write asset).
  const where: Prisma.AuditItemWhereInput = { AND: [...auditRoundFilterClauses(input), ...(resultWhere ? [resultWhere] : [])] }
  // The round's own items (group 2 spec §5): every result list leaves the out-of-scope finds out, so each count
  // equals the list it opens. Two lists keep them: the out-of-scope list (the out-of-scope items) and the
  // pending-review list, which follows the pending findings; an out-of-scope find waits for review too (R5).
  return result === "out_of_scope" || result === "pending_review" ? where : withAuditRoundOwnItems(where)
}

export type AuditRoundResultCountRow = { auditStatus: string; auditResult: string | null; count: number }

export type AuditRoundResultCounts = { all: number; pending: number; found: number; mismatch: number; notFound: number; outOfScope: number }

export const emptyAuditRoundResultCounts: Readonly<AuditRoundResultCounts> = Object.freeze({ all: 0, pending: 0, found: 0, mismatch: 0, notFound: 0, outOfScope: 0 })

// Out-of-scope rows go to outOfScope only; every own row lands in exactly one of the four, so พบตรง + ไม่ตรง + ไม่พบ +
// รอตรวจ = ทั้งหมด (P2-R2: a checked item with a null result reads ไม่ตรง).
export function foldAuditRoundResultCounts(rows: readonly AuditRoundResultCountRow[]): AuditRoundResultCounts {
  const counts: AuditRoundResultCounts = { ...emptyAuditRoundResultCounts }
  for (const row of rows) {
    if (!isAuditRoundOwnItem(row)) {
      counts.outOfScope += row.count
      continue
    }
    counts.all += row.count
    if (row.auditStatus === "pending") counts.pending += row.count
    else if (isSuccessfulAuditResult(row.auditResult)) counts.found += row.count
    else if (row.auditResult === "not_found") counts.notFound += row.count
    else counts.mismatch += row.count
  }
  return counts
}

type AuditExportCompany = { code: string }
type AuditExportBranch = { code: string; company: { code: string } }
type AuditExportCategory = { code: string }

type AuditExportFilterLabelInput = {
  result: AuditRoundResultFilter
  search?: string | null
  company?: AuditExportCompany | null
  branch?: AuditExportBranch | null
  category?: AuditExportCategory | null
  field?: AuditFindingField | null
  components?: "missing" | null
}

// The export's filter label, in one order: result, company, branch, category (or "other"), field, missing components,
// then the search (spec §8: the export names every filter of the list it holds).
export function buildAuditExportFilterLabel({ result, search, company, branch, category, field, components }: AuditExportFilterLabelInput) {
  const parts: string[] = []
  if (result !== "all") parts.push(result)
  if (company) parts.push(`company-${company.code}`)
  if (branch) parts.push(company ? `branch-${branch.code}` : `branch-${branch.company.code}-${branch.code}`)
  if (category) parts.push(`category-${category.code}`)
  if (field) parts.push(`field-${field}`)
  if (components) parts.push(`components-${components}`)
  const searchText = search ? search.trim() : ""
  if (searchText) parts.push(`search-${searchText}`)
  return parts.length > 0 ? parts.join("-") : "all"
}

// The PDF's summary cells (P2-R4): the out-of-scope finds apart from the round's own items, so pending + checked +
// out of scope = the exported rows. Checked is every own item not pending, whatever its result.
export function buildAuditRoundExportSummary(rows: ReadonlyArray<{ auditStatus: string; auditResult: string | null }>) {
  const counts = foldAuditRoundResultCounts(rows.map((row) => ({ auditStatus: row.auditStatus, auditResult: row.auditResult, count: 1 })))
  return { exported: rows.length, pending: counts.pending, checked: counts.found + counts.mismatch + counts.notFound, mismatchOrNotFound: counts.mismatch + counts.notFound, outOfScope: counts.outOfScope }
}

// Every result but `all` already leaves the out-of-scope finds out or keeps only them (Task 1), so only `all` differs:
// the variance report keeps the finds, because they are variances too, and its summary counts them apart.
export function buildAuditRoundVarianceWhere(input: AuditRoundItemWhereInput): Prisma.AuditItemWhereInput {
  return input.result === "all" ? buildAuditRoundFilterWhere(input) : buildAuditRoundItemWhere(input)
}

export function sanitizeAuditExportFilenamePart(value: string) {
  return value
    .trim()
    .replace(/[^\p{L}\p{N}_-]+/gu, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 80) || "all"
}

export function buildAuditExportFilename({
  prefix,
  auditNo,
  extension,
  date = new Date(),
  ...filters
}: AuditExportFilterLabelInput & {
  prefix: string
  auditNo: string
  extension: string
  date?: Date
}) {
  const filterLabel = buildAuditExportFilterLabel(filters)
  const filterSuffix = filterLabel === "all" ? "" : `-${sanitizeAuditExportFilenamePart(filterLabel)}`
  const cleanExtension = extension.replace(/^\./, "")
  return `${prefix}-${auditNo}${filterSuffix}-${date.toISOString().slice(0, 10)}.${cleanExtension}`
}

export function buildAuditExportWorksheetName(filterLabel: string) {
  if (filterLabel === "all") return "Audit Results"
  return `Results - ${filterLabel}`.slice(0, 31)
}

export type AuditRoundListHrefFilters = Omit<AuditRoundListFilters, "expectedLocationIds">

export type AuditRoundPageHrefOverrides = Partial<AuditRoundListHrefFilters> & { page?: number; pageSize?: number; returnTo?: string | null }

export type AuditRoundExportEndpoint = "export" | "export-pdf" | "variance-export"

// The one writer of the list's filter params, in one order, defaults dropped. A room lookup and the shown categories
// never reach a URL.
function writeAuditRoundListParams(filters: AuditRoundListHrefFilters): URLSearchParams {
  const params = new URLSearchParams()
  if (filters.result !== "all") params.set("result", filters.result)
  if (filters.search.trim()) params.set("search", filters.search.trim())
  if (filters.companyId) params.set("companyId", filters.companyId)
  if (filters.branchId) params.set("branchId", filters.branchId)
  if (filters.categoryId) params.set("categoryId", filters.categoryId)
  if (filters.field) params.set("field", filters.field)
  if (filters.components) params.set("components", filters.components)
  return params
}

/** The one link to the round page's list: an override of `undefined` keeps the filter, and `null` clears it. */
export function buildAuditRoundPageHref(locale: string, roundId: string, filters: AuditRoundListHrefFilters, overrides: AuditRoundPageHrefOverrides = {}): string {
  const merged: AuditRoundListHrefFilters = {
    result: overrides.result !== undefined ? overrides.result : filters.result,
    categoryId: overrides.categoryId !== undefined ? overrides.categoryId : filters.categoryId,
    field: overrides.field !== undefined ? overrides.field : filters.field,
    components: overrides.components !== undefined ? overrides.components : filters.components,
    companyId: overrides.companyId !== undefined ? overrides.companyId : filters.companyId,
    branchId: overrides.branchId !== undefined ? overrides.branchId : filters.branchId,
    search: overrides.search !== undefined ? overrides.search : filters.search,
  }
  const params = writeAuditRoundListParams(merged)
  if (overrides.page !== undefined && overrides.page > 1) params.set("page", String(overrides.page))
  if (overrides.pageSize !== undefined && overrides.pageSize !== AUDIT_ROUND_DEFAULT_PAGE_SIZE) params.set("pageSize", String(overrides.pageSize))
  if (overrides.returnTo) params.set("returnTo", overrides.returnTo)
  const query = params.toString()
  return `/${locale}/audit/rounds/${roundId}${query ? `?${query}` : ""}#audit-result-list`
}

// The query of a round-page link as URLSearchParams: the search's hidden inputs read it (Task 5), so the one writer
// (buildAuditRoundPageHref) decides every name and default (group 2 plan 2).
export function auditRoundHrefQuery(href: string): URLSearchParams {
  return new URLSearchParams(href.split("#")[0].split("?")[1] ?? "")
}

/** The round's exports: the list's own filter params, with no page, returnTo or hash. */
export function buildAuditRoundExportHref(roundId: string, endpoint: AuditRoundExportEndpoint, filters: AuditRoundListHrefFilters): string {
  const query = writeAuditRoundListParams(filters).toString()
  return `/api/audit-rounds/${roundId}/${endpoint}${query ? `?${query}` : ""}`
}

/** The round's whole item list for a company, a branch or both (R13); no returnTo (R14). */
export function buildAuditRoundItemsHref(locale: string, roundId: string, filters: { branchId?: string; companyId?: string }): string {
  return buildAuditRoundPageHref(locale, roundId, emptyAuditRoundListFilters, { companyId: filters.companyId ?? null, branchId: filters.branchId ?? null })
}

/** R16: "<company code> / <branch name>" until a company is chosen, then the branch name alone. */
export function auditRoundBranchFilterName(branch: { name: string; companyCode: string }, companyChosen: boolean): string {
  return companyChosen ? branch.name : `${branch.companyCode} / ${branch.name}`
}

function buildAssetSearchWhere(searchText: string) {
  return [
    { asset: { assetTag: { contains: searchText } } },
    { asset: { name: { contains: searchText } } },
  ]
}

function firstValue(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value
}

function trimmedOrNull(value: string | string[] | undefined) {
  return String(firstValue(value) ?? "").trim() || null
}
