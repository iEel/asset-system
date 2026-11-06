import type { Prisma } from "@prisma/client"
import { parseRecordStatus, recordStatusWhere, setRecordStatusParam, type RecordStatusFilter } from "./master-data-query.ts"
import { parseNameDefaultSort } from "./master-data-list-ui.ts"
import { buildCategoryPrefixGroups, parsePrefixRows } from "./category-prefix-groups.ts"

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
  status?: string | string[] | number | null
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
  status: RecordStatusFilter
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
  // Board MD-Categories (group 8 plan 2 Task 1, spec §3): name A→Z by default; every other sort stays reachable.
  const { sort, direction } = parseNameDefaultSort(input, categorySorts, "name")

  return {
    search: firstValue(input.search).trim(),
    status: parseRecordStatus(input.status),
    page: parsePositiveInteger(input.page, 1),
    pageSize: parsePageSize(input.pageSize),
    sort,
    direction,
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
    ...recordStatusWhere(state.status),
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
  setRecordStatusParam(params, merged.status)
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
    // The total card's "รุ่นรวม {m} · ทรัพย์สินรวม {a}" (board MD-Categories): the page counts active models and assets.
    modelTotal: categories.reduce((sum, category) => sum + category._count.models, 0),
    assetTotal: categories.reduce((sum, category) => sum + category._count.assets, 0),
    missingModels: categories.filter((category) => category._count.models === 0).length,
    missingCustomFields: categories.filter((category) => category._count.customFieldDefs === 0).length,
    missingChecklist: categories.filter((category) => !checklistIds.has(category.id)).length,
    missingPrefix: categories.filter((category) => !prefixIds.has(category.id)).length,
  }
}

export function buildCategoryDrilldownHrefs({
  locale,
  categoryId,
}: {
  locale: string
  categoryId: string
}) {
  const encodedCategoryId = encodeURIComponent(categoryId)
  return {
    assets: `/${locale}/assets?categoryId=${encodedCategoryId}`,
    models: `/${locale}/master-data/brands?modelCategoryId=${encodedCategoryId}&modelPage=1`,
    edit: `/${locale}/master-data/categories/${encodedCategoryId}/edit`,
  }
}

// The id is the tie-breaker, so rows with one name or one count keep their order from page to page (group 8 plan 2 Task 1).
export function buildCategoryOrderBy({
  sort,
  direction,
}: Pick<CategoryListState, "sort" | "direction">): Prisma.AssetCategoryOrderByWithRelationInput[] {
  const primary: Prisma.AssetCategoryOrderByWithRelationInput =
    sort === "models"
      ? { models: { _count: direction } }
      : sort === "assets"
        ? { assets: { _count: direction } }
        : sort === "customFields"
          ? { customFieldDefs: { _count: direction } }
          : { [sort]: direction }
  return [primary, { id: "asc" }]
}

// The footer's "รุ่นรวม {m} · ทรัพย์สินรวม {a}" (board MD-Categories): active models and assets of the filtered categories.
export function categoryFooterTotalWheres(where: Prisma.AssetCategoryWhereInput) {
  return {
    models: { isActive: true, category: { is: where } } satisfies Prisma.AssetModelWhereInput,
    assets: { isActive: true, category: { is: where } } satisfies Prisma.AssetWhereInput,
  }
}

// The categories that share their prefix with another one (a prefix group of two or more in the settings): the page
// reads their names for "{prefix} · ใช้ร่วมกับ {other}".
export function sharedPrefixCategoryIds(value?: string | null): string[] {
  return buildCategoryPrefixGroups(parsePrefixRows(value)).flatMap((group) => (group.categoryIds.length > 1 ? group.categoryIds : []))
}

export type CategoryPrefixCell = { prefix: string | null; sharedWith: string[] }

// The คำนำหน้ารหัส column (board MD-Categories): the category's prefix from the settings, or null when none is set (the
// asset tag then uses the category code, asset-tag.ts), and the names of the other categories in its prefix group. names
// holds the categories that count (the page reads the active ones), so a category no longer active is not named.
export function buildCategoryPrefixCells(
  value: string | null | undefined,
  categoryIds: readonly string[],
  names: ReadonlyMap<string, string>
): Map<string, CategoryPrefixCell> {
  const groupOf = new Map<string, { prefix: string; categoryIds: string[] }>()
  for (const group of buildCategoryPrefixGroups(parsePrefixRows(value))) {
    for (const categoryId of group.categoryIds) groupOf.set(categoryId, group)
  }
  return new Map<string, CategoryPrefixCell>(
    categoryIds.map((categoryId) => {
      const group = groupOf.get(categoryId)
      if (!group) return [categoryId, { prefix: null, sharedWith: [] }]
      const sharedWith = group.categoryIds
        .filter((otherId) => otherId !== categoryId && names.has(otherId))
        .map((otherId) => names.get(otherId) as string)
        .sort((a, b) => a.localeCompare(b, "th"))
      return [categoryId, { prefix: group.prefix, sharedWith }]
    })
  )
}

// "คำนำหน้ารหัส … ในการตั้งค่า": the settings page's asset-numbering tab, at the prefix groups.
export function buildCategoryPrefixSettingsHref(locale: string) {
  return `/${locale}/admin/settings?tab=asset-numbering#category-prefix-groups`
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
