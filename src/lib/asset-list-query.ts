import type { Prisma } from "@prisma/client"
import { getAssetActivityWhere, normalizeAssetActivityFilter } from "./asset-activity-filter.ts"
import { normalizeAssetCrossScopeFilter } from "./asset-cross-scope-filter.ts"
import { getAssetCustodianStateWhere, normalizeAssetCustodianStateFilter } from "./asset-custodian-state-filter.ts"
import { normalizeAssetDataQualityFilter } from "./asset-data-quality-filter.ts"
import { assetMissingResponsibilityWhere, assetOwnershipTypes } from "./asset-ownership.ts"
import {
  DEFAULT_WAITING_WORK_RULES,
  licenseExpiringSoonWhere,
  returnsDueSoonAssetWhere,
  startOfBangkokDay,
  warrantyExpiringSoonWhere,
  type WaitingWorkRules,
} from "./waiting-work-rules.ts"

export type AssetListParams = {
  search?: string
  companyId?: string
  branchId?: string
  categoryId?: string
  brandId?: string
  modelId?: string
  statusId?: string
  conditionId?: string
  ownershipType?: string
  custodianId?: string
  custodianState?: string
  supplierId?: string
  dataQuality?: string
  crossScope?: string
  activity?: string
  page?: string | number
  pageSize?: string | number
  sort?: string
  direction?: string
}

const sortableFields = new Set(["assetTag", "name", "createdAt", "purchaseDate", "purchasePrice"])

export function parseAssetListParams(input: URLSearchParams | AssetListParams) {
  const getValue = (key: keyof AssetListParams) =>
    input instanceof URLSearchParams ? input.get(key) : input[key]

  const page = Math.max(1, Number(getValue("page") ?? 1) || 1)
  const pageSizeValue = Number(getValue("pageSize") ?? 25) || 25
  const pageSize = Math.min(100, Math.max(10, pageSizeValue))
  const sort = String(getValue("sort") ?? "createdAt")
  const direction = getValue("direction") === "asc" ? "asc" : "desc"
  const ownershipType = String(getValue("ownershipType") ?? "").trim()
  const dataQuality = normalizeAssetDataQualityFilter(getValue("dataQuality"))
  const crossScope = normalizeAssetCrossScopeFilter(getValue("crossScope"))
  const activity = normalizeAssetActivityFilter(getValue("activity"))

  return {
    search: String(getValue("search") ?? "").trim(),
    companyId: String(getValue("companyId") ?? "").trim(),
    branchId: String(getValue("branchId") ?? "").trim(),
    categoryId: String(getValue("categoryId") ?? "").trim(),
    brandId: String(getValue("brandId") ?? "").trim(),
    modelId: String(getValue("modelId") ?? "").trim(),
    statusId: String(getValue("statusId") ?? "").trim(),
    conditionId: String(getValue("conditionId") ?? "").trim(),
    ownershipType: assetOwnershipTypes.includes(ownershipType as (typeof assetOwnershipTypes)[number]) ? ownershipType : "",
    custodianId: String(getValue("custodianId") ?? "").trim(),
    custodianState: normalizeAssetCustodianStateFilter(getValue("custodianState")),
    supplierId: String(getValue("supplierId") ?? "").trim(),
    dataQuality,
    crossScope,
    activity,
    page,
    pageSize,
    sort: sortableFields.has(sort) ? sort : "createdAt",
    direction,
  }
}

// The day and the notification windows the warranty, licence and return filters read (group 1 spec §6.3).
export type AssetWhereOptions = { today: Date; rules: WaitingWorkRules }

export function buildAssetWhere(
  filters: ReturnType<typeof parseAssetListParams>,
  options: AssetWhereOptions = { today: startOfBangkokDay(new Date()), rules: DEFAULT_WAITING_WORK_RULES },
): Prisma.AssetWhereInput {
  const where: Prisma.AssetWhereInput = {
    isActive: true,
    ...(filters.companyId ? { companyId: filters.companyId } : {}),
    ...(filters.branchId ? { branchId: filters.branchId } : {}),
    ...(filters.categoryId ? { categoryId: filters.categoryId } : {}),
    ...(filters.brandId ? { brandId: filters.brandId } : {}),
    ...(filters.modelId ? { modelId: filters.modelId } : {}),
    ...(filters.statusId ? { statusId: filters.statusId } : {}),
    ...(filters.conditionId ? { conditionId: filters.conditionId } : {}),
    ...(filters.ownershipType ? { ownershipType: filters.ownershipType } : {}),
    ...(filters.custodianId ? { custodianId: filters.custodianId } : {}),
    ...(filters.supplierId ? { supplierId: filters.supplierId } : {}),
    ...(filters.search
      ? {
          OR: assetSearchConditions(filters.search),
        }
      : {}),
  }

  // In order: the data-quality rule, the custodian state, the activity rule, each only when present.
  const parts = [
    buildAssetDataQualityWhere(filters.dataQuality, options),
    getAssetCustodianStateWhere(filters.custodianState),
    getAssetActivityWhere(filters.activity),
  ].filter((part): part is Prisma.AssetWhereInput => part !== null)
  if (parts.length > 0) where.AND = parts

  return where
}

/** True when the filters hold a windowed value, so the caller must read the notification rules. */
export function assetFiltersUseWaitingWorkRules(filters: Pick<AssetListFilters, "dataQuality">): boolean {
  return filters.dataQuality === "warranty" || filters.dataQuality === "licenseExpiry" || filters.dataQuality === "returnDue"
}

/**
 * The one list of fields an asset search matches, in the global search route's order. The register, its export,
 * the reports that read buildAssetWhere and the global search all find the same assets (user decision 2026-10-25).
 */
export function assetSearchConditions(search: string): Prisma.AssetWhereInput[] {
  return [
    { assetTag: { contains: search } },
    { name: { contains: search } },
    { serialNumber: { contains: search } },
    { fixedAssetCode: { contains: search } },
    { category: { code: { contains: search } } },
    { category: { name: { contains: search } } },
    { brand: { name: { contains: search } } },
    { model: { name: { contains: search } } },
    { company: { code: { contains: search } } },
    { company: { nameTh: { contains: search } } },
    { company: { nameEn: { contains: search } } },
    { branch: { code: { contains: search } } },
    { branch: { name: { contains: search } } },
    { custodian: { code: { contains: search } } },
    { custodian: { fullNameTh: { contains: search } } },
    { custodian: { fullNameEn: { contains: search } } },
    { custodian: { email: { contains: search } } },
    { currentLocation: { code: { contains: search } } },
    { currentLocation: { name: { contains: search } } },
  ]
}

/** What the global search's "view all in the register (N)" counts: the register's own search and nothing else. */
export function buildAssetSearchWhere(search: string): Prisma.AssetWhereInput {
  return buildAssetWhere(parseAssetListParams({ search }))
}

export type AssetListFilters = ReturnType<typeof parseAssetListParams>

/** The register's status tabs count with every filter except the status itself. */
export function buildAssetStatusCountWhere(filters: AssetListFilters, options?: AssetWhereOptions): Prisma.AssetWhereInput {
  return buildAssetWhere({ ...filters, statusId: "" }, options)
}

export function buildAssetOrderBy(filters: ReturnType<typeof parseAssetListParams>): Prisma.AssetOrderByWithRelationInput {
  return { [filters.sort]: filters.direction }
}

export function buildAssetQueryString(
  filters: ReturnType<typeof parseAssetListParams>,
  overrides: Partial<ReturnType<typeof parseAssetListParams>> = {}
) {
  const next = { ...filters, ...overrides }
  const params = new URLSearchParams()

  for (const key of ["search", "companyId", "branchId", "categoryId", "brandId", "modelId", "statusId", "conditionId", "ownershipType", "custodianId", "custodianState", "supplierId", "dataQuality", "crossScope", "activity", "sort", "direction"] as const) {
    if (next[key]) params.set(key, String(next[key]))
  }

  params.set("page", String(next.page))
  params.set("pageSize", String(next.pageSize))
  return params.toString()
}

function buildAssetDataQualityWhere(
  dataQuality: ReturnType<typeof normalizeAssetDataQualityFilter>,
  options: AssetWhereOptions,
): Prisma.AssetWhereInput | null {
  if (dataQuality === "responsibility") return assetMissingResponsibilityWhere
  if (dataQuality === "serial") return { OR: [{ serialNumber: null }, { serialNumber: "" }] }
  if (dataQuality === "photo") {
    return {
      ownershipType: { not: "software_license" },
      attachments: { none: { module: "asset", fileType: { startsWith: "image/" }, isActive: true } },
    }
  }
  if (dataQuality === "department") return { departmentId: null }
  if (dataQuality === "purchase") {
    return {
      OR: [
        { purchaseDate: null },
        { purchasePrice: null },
        { supplierId: null },
        { poNumber: null },
        { poNumber: "" },
        { invoiceNumber: null },
        { invoiceNumber: "" },
      ],
    }
  }
  // The bell's own rules with the days the settings give (group 1 spec §6.3).
  if (dataQuality === "warranty") return warrantyExpiringSoonWhere(options.today, options.rules)
  if (dataQuality === "licenseExpiry") return licenseExpiringSoonWhere(options.today, options.rules)
  if (dataQuality === "returnDue") return returnsDueSoonAssetWhere(options.today, options.rules)
  return null
}
