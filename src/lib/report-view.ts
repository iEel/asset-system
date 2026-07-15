import { buildAssetQueryString, parseAssetListParams } from "./asset-list-query.ts"

export const reportViews = ["overview", "accounting", "operations", "catalog"] as const
export type ReportView = (typeof reportViews)[number]
type ParsedAssetFilters = ReturnType<typeof parseAssetListParams>

export function parseReportView(value: unknown): ReportView {
  const candidate = Array.isArray(value) ? value[0] : value
  return reportViews.includes(candidate as ReportView) ? candidate as ReportView : "overview"
}

export function buildReportQueryString(
  view: ReportView,
  filters: ParsedAssetFilters,
  overrides: Partial<ParsedAssetFilters> = {},
) {
  const params = new URLSearchParams(buildAssetQueryString(filters, { ...overrides, page: 1 }))
  params.set("view", view)
  return params.toString()
}

export function buildReportHref(
  locale: string,
  view: ReportView,
  filters: ParsedAssetFilters,
  overrides: Partial<ParsedAssetFilters> = {},
) {
  return `/${locale}/reports?${buildReportQueryString(view, filters, overrides)}`
}
