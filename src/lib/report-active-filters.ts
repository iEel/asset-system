import { parseAssetListParams } from "./asset-list-query.ts"
import { buildReportHref, type ReportView } from "./report-view.ts"

export type ReportActiveFilterKey =
  | "search"
  | "companyId"
  | "branchId"
  | "categoryId"
  | "brandId"
  | "modelId"
  | "statusId"
  | "conditionId"
  | "ownershipType"
  | "custodianId"
  | "supplierId"
  | "dataQuality"
  | "crossScope"
  | "activity"

export type ReportActiveFilterDescriptor = {
  key: ReportActiveFilterKey
  label: string
  href: string
}

type ParsedAssetFilters = ReturnType<typeof parseAssetListParams>
type ReportAssetFilters = ParsedAssetFilters & Partial<Record<ReportActiveFilterKey, string>>

const reportActiveFilterKeys: ReportActiveFilterKey[] = [
  "search",
  "companyId",
  "branchId",
  "categoryId",
  "brandId",
  "modelId",
  "statusId",
  "conditionId",
  "ownershipType",
  "custodianId",
  "supplierId",
  "dataQuality",
  "crossScope",
  "activity",
]

export function buildReportActiveFilters(input: {
  locale: string
  view: ReportView
  filters: ReportAssetFilters
  names: Partial<Record<ReportActiveFilterKey, string>>
  values?: Partial<Record<ReportActiveFilterKey, string>>
}): ReportActiveFilterDescriptor[] {
  return reportActiveFilterKeys.flatMap((key) => {
    if (!input.filters[key]) return []

    const value = input.values?.[key] ?? String(input.filters[key])
    const overrides = key === "companyId"
      ? { companyId: "", branchId: "" }
      : { [key]: "" }

    return [{
      key,
      label: `${input.names[key] ?? key}: ${value}`,
      href: buildReportHref(input.locale, input.view, input.filters, overrides),
    }]
  })
}
