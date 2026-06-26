import type { Prisma } from "@prisma/client"
import { successfulAuditResults } from "./audit-result-summary.ts"

export const auditRoundResultFilterValues = [
  "all",
  "found",
  "wrong_location",
  "wrong_custodian",
  "wrong_condition",
  "not_found",
  "out_of_scope",
  "pending_review",
] as const

export type AuditRoundResultFilter = (typeof auditRoundResultFilterValues)[number]

export type AuditRoundResultListState = {
  result: AuditRoundResultFilter
  search: string
  page: number
  pageSize: number
}

type AuditRoundResultListParams = {
  result?: string | string[]
  search?: string | string[]
  page?: string | string[] | number
  pageSize?: string | string[] | number
}

export const auditRoundResultPageSizeOptions = [25, 50, 100] as const

export type AuditRoundResultSummaryInput = {
  result: Exclude<AuditRoundResultFilter, "all">
  count: number
}

export type AuditRoundResultSummaryItem = AuditRoundResultSummaryInput & {
  actionable: boolean
}

const auditRoundNormalResultOrder: Array<AuditRoundResultSummaryInput["result"]> = ["found"]
const auditRoundNeedsReviewResultOrder: Array<AuditRoundResultSummaryInput["result"]> = [
  "wrong_location",
  "wrong_custodian",
  "wrong_condition",
  "not_found",
  "out_of_scope",
  "pending_review",
]

const auditRoundItemStatusLabelKeys: Record<string, "pending" | "scanned"> = {
  pending: "pending",
  scanned: "scanned",
}

const auditRoundItemResultLabelKeys: Record<string, "found" | "confirmedWithParent" | "notFound" | "mismatch"> = {
  found: "found",
  confirmed_with_parent: "confirmedWithParent",
  not_found: "notFound",
  mismatch: "mismatch",
}

export function buildAuditRoundResultSummaryGroups(items: AuditRoundResultSummaryInput[]) {
  const byResult = new Map(items.map((item) => [item.result, item]))
  return {
    normal: buildAuditRoundResultSummaryItems(auditRoundNormalResultOrder, byResult),
    needsReview: buildAuditRoundResultSummaryItems(auditRoundNeedsReviewResultOrder, byResult).sort((left, right) => {
      if (left.actionable === right.actionable) return 0
      return left.actionable ? -1 : 1
    }),
  }
}

export function getAuditRoundItemStatusLabelKey(status: string | null | undefined) {
  return status ? (auditRoundItemStatusLabelKeys[status] ?? null) : null
}

export function getAuditRoundItemResultLabelKey(result: string | null | undefined) {
  return result ? (auditRoundItemResultLabelKeys[result] ?? null) : null
}

function buildAuditRoundResultSummaryItems(
  order: Array<AuditRoundResultSummaryInput["result"]>,
  byResult: Map<AuditRoundResultSummaryInput["result"], AuditRoundResultSummaryInput>,
): AuditRoundResultSummaryItem[] {
  return order.map((result) => {
    const count = byResult.get(result)?.count ?? 0
    return { result, count, actionable: count > 0 }
  })
}

export function resolveAuditRoundResultFilter(value?: string | string[] | null): AuditRoundResultFilter {
  const raw = Array.isArray(value) ? value[0] : value
  return auditRoundResultFilterValues.includes(raw as AuditRoundResultFilter) ? (raw as AuditRoundResultFilter) : "all"
}

export function parseAuditRoundResultListParams(input: AuditRoundResultListParams): AuditRoundResultListState {
  const pageValue = Number(firstValue(input.page) ?? 1) || 1
  const pageSizeValue = Number(firstValue(input.pageSize) ?? 25) || 25
  return {
    result: resolveAuditRoundResultFilter(input.result),
    search: String(firstValue(input.search) ?? "").trim(),
    page: Math.max(1, pageValue),
    pageSize: Math.min(100, Math.max(10, pageSizeValue)),
  }
}

export function buildAuditRoundItemWhere({
  roundId,
  result,
  search,
}: {
  roundId: string
  result: AuditRoundResultFilter
  search?: string | null
}): Prisma.AuditItemWhereInput {
  const where: Prisma.AuditItemWhereInput = { auditRoundId: roundId }

  if (result === "found") {
    where.auditResult = { in: Array.from(successfulAuditResults) }
  } else if (result === "not_found") {
    where.auditResult = "not_found"
  } else if (result === "pending_review") {
    where.findings = { some: { reviewStatus: "pending" } }
  } else if (isAuditFindingResultFilter(result)) {
    where.findings = { some: { findingType: result } }
  }

  const searchText = search?.trim()
  if (searchText) {
    where.OR = buildAssetSearchWhere(searchText)
  }

  return where
}

export function buildAuditRoundScanHistoryWhere({
  roundId,
  search,
}: {
  roundId: string
  search?: string | null
}): Prisma.AuditScanHistoryWhereInput {
  const where: Prisma.AuditScanHistoryWhereInput = {
    auditRoundId: roundId,
    auditItemId: null,
  }

  const searchText = search?.trim()
  if (searchText) {
    where.OR = buildAssetSearchWhere(searchText)
  }

  return where
}

export function isAuditRoundScanHistoryResultFilter(result: AuditRoundResultFilter) {
  return result === "out_of_scope"
}

export function buildAuditExportFilterLabel({
  result,
  search,
}: {
  result: AuditRoundResultFilter
  search?: string | null
}) {
  const parts: string[] = []
  if (result !== "all") parts.push(result)
  const searchText = search ? search.trim() : ""
  if (searchText) parts.push(`search-${searchText}`)
  return parts.length > 0 ? parts.join("-") : "all"
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
  result,
  search,
  extension,
  date = new Date(),
}: {
  prefix: string
  auditNo: string
  result: AuditRoundResultFilter
  search?: string | null
  extension: string
  date?: Date
}) {
  const filterLabel = buildAuditExportFilterLabel({ result, search })
  const filterSuffix = filterLabel === "all" ? "" : `-${sanitizeAuditExportFilenamePart(filterLabel)}`
  const cleanExtension = extension.replace(/^\./, "")
  return `${prefix}-${auditNo}${filterSuffix}-${date.toISOString().slice(0, 10)}.${cleanExtension}`
}

export function buildAuditExportWorksheetName(filterLabel: string) {
  if (filterLabel === "all") return "Audit Results"
  return `Results - ${filterLabel}`.slice(0, 31)
}

export function buildAuditRoundResultListHref({
  locale,
  roundId,
  result,
  returnTo,
  search = "",
  page = 1,
  pageSize = 25,
}: {
  locale: string
  roundId: string
  result: AuditRoundResultFilter
  returnTo?: string
  search?: string
  page?: number
  pageSize?: number
}) {
  const params = new URLSearchParams()
  if (result !== "all") params.set("result", result)
  if (search.trim()) params.set("search", search.trim())
  params.set("page", String(page))
  params.set("pageSize", String(pageSize))
  if (returnTo) params.set("returnTo", returnTo)
  return `/${locale}/audit/rounds/${roundId}?${params.toString()}#audit-result-list`
}

function isAuditFindingResultFilter(result: AuditRoundResultFilter) {
  return result === "wrong_location" || result === "wrong_custodian" || result === "wrong_condition"
}

function buildAssetSearchWhere(searchText: string) {
  return [
    { asset: { assetTag: { contains: searchText } } },
    { asset: { name: { contains: searchText } } },
  ]
}

function firstValue(value: string | string[] | number | undefined) {
  return Array.isArray(value) ? value[0] : value
}
