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
