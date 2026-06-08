import type { Prisma } from "@prisma/client"
import { normalizeAssetDataQualityFilter } from "./asset-data-quality-filter.ts"
import { assetMissingResponsibilityWhere, assetOwnershipTypes } from "./asset-ownership.ts"

export type AssetListParams = {
  search?: string
  companyId?: string
  branchId?: string
  categoryId?: string
  statusId?: string
  conditionId?: string
  ownershipType?: string
  custodianId?: string
  supplierId?: string
  dataQuality?: string
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

  return {
    search: String(getValue("search") ?? "").trim(),
    companyId: String(getValue("companyId") ?? "").trim(),
    branchId: String(getValue("branchId") ?? "").trim(),
    categoryId: String(getValue("categoryId") ?? "").trim(),
    statusId: String(getValue("statusId") ?? "").trim(),
    conditionId: String(getValue("conditionId") ?? "").trim(),
    ownershipType: assetOwnershipTypes.includes(ownershipType as (typeof assetOwnershipTypes)[number]) ? ownershipType : "",
    custodianId: String(getValue("custodianId") ?? "").trim(),
    supplierId: String(getValue("supplierId") ?? "").trim(),
    dataQuality,
    page,
    pageSize,
    sort: sortableFields.has(sort) ? sort : "createdAt",
    direction,
  }
}

export function buildAssetWhere(filters: ReturnType<typeof parseAssetListParams>): Prisma.AssetWhereInput {
  const where: Prisma.AssetWhereInput = {
    isActive: true,
    ...(filters.companyId ? { companyId: filters.companyId } : {}),
    ...(filters.branchId ? { branchId: filters.branchId } : {}),
    ...(filters.categoryId ? { categoryId: filters.categoryId } : {}),
    ...(filters.statusId ? { statusId: filters.statusId } : {}),
    ...(filters.conditionId ? { conditionId: filters.conditionId } : {}),
    ...(filters.ownershipType ? { ownershipType: filters.ownershipType } : {}),
    ...(filters.custodianId ? { custodianId: filters.custodianId } : {}),
    ...(filters.supplierId ? { supplierId: filters.supplierId } : {}),
    ...(filters.search
      ? {
          OR: [
            { assetTag: { contains: filters.search } },
            { name: { contains: filters.search } },
            { serialNumber: { contains: filters.search } },
            { fixedAssetCode: { contains: filters.search } },
            { category: { code: { contains: filters.search } } },
            { category: { name: { contains: filters.search } } },
            { company: { code: { contains: filters.search } } },
            { branch: { code: { contains: filters.search } } },
            { custodian: { code: { contains: filters.search } } },
            { custodian: { fullNameTh: { contains: filters.search } } },
            { currentLocation: { code: { contains: filters.search } } },
          ],
        }
      : {}),
  }

  const dataQualityWhere = buildAssetDataQualityWhere(filters.dataQuality)
  if (dataQualityWhere) {
    where.AND = [...(Array.isArray(where.AND) ? where.AND : where.AND ? [where.AND] : []), dataQualityWhere]
  }

  return where
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

  for (const key of ["search", "companyId", "branchId", "categoryId", "statusId", "conditionId", "ownershipType", "custodianId", "supplierId", "dataQuality", "sort", "direction"] as const) {
    if (next[key]) params.set(key, String(next[key]))
  }

  params.set("page", String(next.page))
  params.set("pageSize", String(next.pageSize))
  return params.toString()
}

function buildAssetDataQualityWhere(dataQuality: ReturnType<typeof normalizeAssetDataQualityFilter>): Prisma.AssetWhereInput | null {
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
  if (dataQuality === "warranty") {
    const now = new Date()
    const warrantyThreshold = new Date(now)
    warrantyThreshold.setDate(warrantyThreshold.getDate() + 30)
    return { warrantyEndDate: { gte: now, lte: warrantyThreshold } }
  }
  return null
}
