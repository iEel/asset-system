import { buildAssetQueryString, type AssetListFilters } from "./asset-list-query.ts"
import { assetRegisterDefaultPageSize } from "./asset-register-filters.ts"

export type AssetRegisterChip = { key: string; label: string; href: string; mobileOnly: boolean }

export type AssetRegisterChipInput = {
  basePath: string
  filters: AssetListFilters
  tabStatusIds: readonly string[]
  names: Partial<Record<
    "company" | "branch" | "category" | "status" | "condition" | "brand" | "model" | "custodian" | "supplier",
    string
  >>
  labels: {
    company: string
    branch: string
    category: string
    status: string
    condition: string
    ownershipType: string
    brand: string
    model: string
    custodian: string
    supplier: string
    rowsPerPage: string
    ownershipTypes: Record<string, string>
    dataQuality: Record<string, string>
    crossScope: Record<string, string>
    activity: Record<string, string>
  }
}

export function buildAssetRegisterChips({ basePath, filters, tabStatusIds, names, labels }: AssetRegisterChipInput) {
  const chips: AssetRegisterChip[] = []
  const add = (key: string, label: string, overrides: Partial<AssetListFilters>, mobileOnly = false) => {
    chips.push({ key, label, href: `${basePath}?${buildAssetQueryString(filters, { ...overrides, page: 1 })}`, mobileOnly })
  }
  const named = (prefix: string, name: string | undefined, raw: string) => `${prefix}: ${name ?? raw}`

  if (filters.companyId) add("company", named(labels.company, names.company, filters.companyId), { companyId: "", branchId: "" }, true)
  if (filters.branchId) add("branch", named(labels.branch, names.branch, filters.branchId), { branchId: "" }, true)
  if (filters.categoryId) add("category", named(labels.category, names.category, filters.categoryId), { categoryId: "" }, true)
  if (filters.statusId && !tabStatusIds.includes(filters.statusId)) {
    add("status", named(labels.status, names.status, filters.statusId), { statusId: "" })
  }
  if (filters.conditionId) add("condition", named(labels.condition, names.condition, filters.conditionId), { conditionId: "" })
  if (filters.ownershipType) {
    add("ownershipType", `${labels.ownershipType}: ${labels.ownershipTypes[filters.ownershipType] ?? filters.ownershipType}`, { ownershipType: "" })
  }
  if (filters.dataQuality) add("dataQuality", labels.dataQuality[filters.dataQuality] ?? filters.dataQuality, { dataQuality: "" })
  if (filters.crossScope) add("crossScope", labels.crossScope[filters.crossScope] ?? filters.crossScope, { crossScope: "" })
  if (filters.pageSize !== assetRegisterDefaultPageSize) {
    add("pageSize", `${labels.rowsPerPage}: ${filters.pageSize}`, { pageSize: assetRegisterDefaultPageSize })
  }
  if (filters.brandId) add("brand", named(labels.brand, names.brand, filters.brandId), { brandId: "" })
  if (filters.modelId) add("model", named(labels.model, names.model, filters.modelId), { modelId: "" })
  if (filters.custodianId) add("custodian", named(labels.custodian, names.custodian, filters.custodianId), { custodianId: "" })
  if (filters.supplierId) add("supplier", named(labels.supplier, names.supplier, filters.supplierId), { supplierId: "" })
  if (filters.activity) add("activity", labels.activity[filters.activity] ?? filters.activity, { activity: "" })

  return chips
}

export function buildAssetRegisterClearAllHref(basePath: string, filters: AssetListFilters) {
  return `${basePath}?${buildAssetQueryString(filters, {
    search: "",
    companyId: "",
    branchId: "",
    categoryId: "",
    brandId: "",
    modelId: "",
    statusId: "",
    conditionId: "",
    ownershipType: "",
    custodianId: "",
    supplierId: "",
    dataQuality: "",
    crossScope: "",
    activity: "",
    page: 1,
    pageSize: assetRegisterDefaultPageSize,
  })}`
}
