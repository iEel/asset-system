import type { Prisma } from "@prisma/client"

export const categorySorts = ["code", "name", "models", "assets", "customFields", "createdAt"] as const
export const categoryAssetUsageFilters = ["all", "withAssets", "withoutAssets"] as const
export const categoryModelStatusFilters = ["all", "withModels", "withoutModels"] as const
export const categoryCustomFieldStatusFilters = ["all", "withCustomFields", "withoutCustomFields"] as const
export const categoryChecklistStatusFilters = ["all", "withChecklist", "withoutChecklist"] as const
export const categoryPrefixStatusFilters = ["all", "withPrefix", "withoutPrefix"] as const

export type CategorySort = (typeof categorySorts)[number]
export type CategoryAssetUsageFilter = (typeof categoryAssetUsageFilters)[number]
export type CategoryModelStatusFilter = (typeof categoryModelStatusFilters)[number]
export type CategoryCustomFieldStatusFilter = (typeof categoryCustomFieldStatusFilters)[number]
export type CategoryChecklistStatusFilter = (typeof categoryChecklistStatusFilters)[number]
export type CategoryPrefixStatusFilter = (typeof categoryPrefixStatusFilters)[number]

export type CategoryListParams = {
  search?: string | string[] | number | null
  page?: string | string[] | number | null
  pageSize?: string | string[] | number | null
  sort?: string | string[] | null
  direction?: string | string[] | null
  assetUsage?: string | string[] | null
  modelStatus?: string | string[] | null
  customFieldStatus?: string | string[] | null
  checklistStatus?: string | string[] | null
  prefixStatus?: string | string[] | null
}

export type CategoryListState = {
  search: string
  page: number
  pageSize: number
  sort: CategorySort
  direction: "asc" | "desc"
  assetUsage: CategoryAssetUsageFilter
  modelStatus: CategoryModelStatusFilter
  customFieldStatus: CategoryCustomFieldStatusFilter
  checklistStatus: CategoryChecklistStatusFilter
  prefixStatus: CategoryPrefixStatusFilter
}

export type CategoryHealthSummaryItem = {
  id: string
  _count: {
    assets: number
    models: number
    customFieldDefs: number
  }
}

export function parseCategoryListParams(input: CategoryListParams): CategoryListState {
  const sortValue = firstValue(input.sort)
  const directionValue = firstValue(input.direction)

  return {
    search: firstValue(input.search).trim(),
    page: parsePositiveInteger(input.page, 1),
    pageSize: parsePageSize(input.pageSize),
    sort: categorySorts.includes(sortValue as CategorySort) ? (sortValue as CategorySort) : "code",
    direction: directionValue === "desc" ? "desc" : "asc",
    assetUsage: parseFilter(input.assetUsage, categoryAssetUsageFilters, "all"),
    modelStatus: parseFilter(input.modelStatus, categoryModelStatusFilters, "all"),
    customFieldStatus: parseFilter(input.customFieldStatus, categoryCustomFieldStatusFilters, "all"),
    checklistStatus: parseFilter(input.checklistStatus, categoryChecklistStatusFilters, "all"),
    prefixStatus: parseFilter(input.prefixStatus, categoryPrefixStatusFilters, "all"),
  }
}

export function buildCategoryWhere(
  state: CategoryListState,
  {
    categoryIdsWithChecklist = [],
    categoryIdsWithPrefix = [],
  }: {
    categoryIdsWithChecklist?: string[]
    categoryIdsWithPrefix?: string[]
  } = {}
): Prisma.AssetCategoryWhereInput {
  const idFilter: Prisma.StringFilter<"AssetCategory"> = {}

  if (state.checklistStatus === "withChecklist") {
    idFilter.in = categoryIdsWithChecklist.length ? categoryIdsWithChecklist : ["__no_category_checklist__"]
  }
  if (state.checklistStatus === "withoutChecklist" && categoryIdsWithChecklist.length) {
    idFilter.notIn = categoryIdsWithChecklist
  }
  if (state.prefixStatus === "withPrefix") {
    idFilter.in = categoryIdsWithPrefix.length
      ? intersection(idFilter.in, categoryIdsWithPrefix)
      : ["__no_category_prefix__"]
  }
  if (state.prefixStatus === "withoutPrefix" && categoryIdsWithPrefix.length) {
    idFilter.notIn = unique([...(idFilter.notIn ?? []), ...categoryIdsWithPrefix])
  }

  return {
    isActive: true,
    ...(state.search
      ? {
          OR: [
            { code: { contains: state.search } },
            { name: { contains: state.search } },
            { description: { contains: state.search } },
          ],
        }
      : {}),
    ...(state.assetUsage === "withAssets" ? { assets: { some: { isActive: true } } } : {}),
    ...(state.assetUsage === "withoutAssets" ? { assets: { none: { isActive: true } } } : {}),
    ...(state.modelStatus === "withModels" ? { models: { some: { isActive: true } } } : {}),
    ...(state.modelStatus === "withoutModels" ? { models: { none: { isActive: true } } } : {}),
    ...(state.customFieldStatus === "withCustomFields" ? { customFieldDefs: { some: { isActive: true } } } : {}),
    ...(state.customFieldStatus === "withoutCustomFields" ? { customFieldDefs: { none: { isActive: true } } } : {}),
    ...(Object.keys(idFilter).length ? { id: idFilter } : {}),
  }
}

export function buildCategoryQueryString(current: CategoryListState, next: Partial<CategoryListState>) {
  const merged = { ...current, ...next }
  const params = new URLSearchParams()
  if (merged.search) params.set("search", merged.search)
  params.set("page", String(merged.page))
  params.set("pageSize", String(merged.pageSize))
  params.set("sort", merged.sort)
  params.set("direction", merged.direction)
  params.set("assetUsage", merged.assetUsage)
  params.set("modelStatus", merged.modelStatus)
  params.set("customFieldStatus", merged.customFieldStatus)
  params.set("checklistStatus", merged.checklistStatus)
  params.set("prefixStatus", merged.prefixStatus)
  return params.toString()
}

export function buildCategoryHealthSummary(
  categories: CategoryHealthSummaryItem[],
  {
    categoryIdsWithChecklist = [],
    categoryIdsWithPrefix = [],
  }: {
    categoryIdsWithChecklist?: string[]
    categoryIdsWithPrefix?: string[]
  } = {}
) {
  const checklistIds = new Set(categoryIdsWithChecklist)
  const prefixIds = new Set(categoryIdsWithPrefix)
  return {
    total: categories.length,
    used: categories.filter((category) => category._count.assets > 0).length,
    missingModels: categories.filter((category) => category._count.models === 0).length,
    missingCustomFields: categories.filter((category) => category._count.customFieldDefs === 0).length,
    missingChecklist: categories.filter((category) => !checklistIds.has(category.id)).length,
    missingPrefix: categories.filter((category) => !prefixIds.has(category.id)).length,
  }
}

export function buildCategoryOrderBy({
  sort,
  direction,
}: Pick<CategoryListState, "sort" | "direction">): Prisma.AssetCategoryOrderByWithRelationInput {
  if (sort === "models") return { models: { _count: direction } }
  if (sort === "assets") return { assets: { _count: direction } }
  if (sort === "customFields") return { customFieldDefs: { _count: direction } }
  return { [sort]: direction }
}

export function parseCategoryPrefixMap(value?: string | null) {
  if (!value) return {}
  try {
    const parsed = JSON.parse(value) as unknown
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return {}
    return Object.fromEntries(
      Object.entries(parsed)
        .map(([categoryId, prefix]) => [categoryId, typeof prefix === "string" ? prefix.trim().toUpperCase() : ""])
        .filter(([, prefix]) => prefix)
    )
  } catch {
    return {}
  }
}

function firstValue(value: string | string[] | number | null | undefined) {
  if (Array.isArray(value)) return String(value[0] ?? "")
  return String(value ?? "")
}

function parsePositiveInteger(value: string | string[] | number | null | undefined, fallback: number) {
  const parsed = Number(firstValue(value))
  if (!Number.isFinite(parsed)) return fallback
  return Math.max(1, Math.floor(parsed))
}

function parsePageSize(value: string | string[] | number | null | undefined) {
  const raw = firstValue(value).trim()
  if (!raw) return 25
  const parsed = Number(raw)
  if (!Number.isFinite(parsed)) return 25
  return Math.min(100, Math.max(10, Math.floor(parsed)))
}

function parseFilter<TValue extends string>(
  value: string | string[] | null | undefined,
  allowedValues: readonly TValue[],
  fallback: TValue
) {
  const normalized = firstValue(value)
  return allowedValues.includes(normalized as TValue) ? (normalized as TValue) : fallback
}

function unique(values: string[]) {
  return Array.from(new Set(values))
}

function intersection(current: string[] | undefined, next: string[]) {
  if (!current) return next
  const nextSet = new Set(next)
  return current.filter((value) => nextSet.has(value))
}
