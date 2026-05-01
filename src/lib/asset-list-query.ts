import type { Prisma } from "@prisma/client"

export type AssetListParams = {
  search?: string
  companyId?: string
  branchId?: string
  categoryId?: string
  statusId?: string
  conditionId?: string
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

  return {
    search: String(getValue("search") ?? "").trim(),
    companyId: String(getValue("companyId") ?? "").trim(),
    branchId: String(getValue("branchId") ?? "").trim(),
    categoryId: String(getValue("categoryId") ?? "").trim(),
    statusId: String(getValue("statusId") ?? "").trim(),
    conditionId: String(getValue("conditionId") ?? "").trim(),
    page,
    pageSize,
    sort: sortableFields.has(sort) ? sort : "createdAt",
    direction,
  }
}

export function buildAssetWhere(filters: ReturnType<typeof parseAssetListParams>): Prisma.AssetWhereInput {
  return {
    isActive: true,
    ...(filters.companyId ? { companyId: filters.companyId } : {}),
    ...(filters.branchId ? { branchId: filters.branchId } : {}),
    ...(filters.categoryId ? { categoryId: filters.categoryId } : {}),
    ...(filters.statusId ? { statusId: filters.statusId } : {}),
    ...(filters.conditionId ? { conditionId: filters.conditionId } : {}),
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
            { custodian: { fullNameTh: { contains: filters.search } } },
            { currentLocation: { code: { contains: filters.search } } },
          ],
        }
      : {}),
  }
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

  for (const key of ["search", "companyId", "branchId", "categoryId", "statusId", "conditionId", "sort", "direction"] as const) {
    if (next[key]) params.set(key, String(next[key]))
  }

  params.set("page", String(next.page))
  params.set("pageSize", String(next.pageSize))
  return params.toString()
}
