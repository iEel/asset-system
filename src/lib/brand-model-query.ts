export const modelPhotoFilters = ["all", "with", "without"] as const
export const modelUsageFilters = ["all", "used", "unused"] as const

export type ModelPhotoFilter = (typeof modelPhotoFilters)[number]
export type ModelUsageFilter = (typeof modelUsageFilters)[number]

export type BrandModelListParams = {
  search?: string | string[] | number | null
  brandPage?: string | string[] | number | null
  brandPageSize?: string | string[] | number | null
  modelPage?: string | string[] | number | null
  modelPageSize?: string | string[] | number | null
  modelBrandId?: string | string[] | null
  modelCategoryId?: string | string[] | null
  modelPhoto?: string | string[] | null
  modelUsage?: string | string[] | null
}

export type BrandModelListState = {
  search: string
  brandPage: number
  brandPageSize: number
  modelPage: number
  modelPageSize: number
  modelBrandId: string
  modelCategoryId: string
  modelPhoto: ModelPhotoFilter
  modelUsage: ModelUsageFilter
}

export type DuplicateNameItem = {
  id: string
  name: string
}

export type DuplicateNameGroup<TItem extends DuplicateNameItem> = {
  normalizedName: string
  displayName: string
  items: TItem[]
}

export function parseBrandModelListParams(input: BrandModelListParams): BrandModelListState {
  return {
    search: firstValue(input.search).trim(),
    brandPage: parsePositiveInteger(input.brandPage, 1),
    brandPageSize: parsePageSize(input.brandPageSize),
    modelPage: parsePositiveInteger(input.modelPage, 1),
    modelPageSize: parsePageSize(input.modelPageSize),
    modelBrandId: firstValue(input.modelBrandId),
    modelCategoryId: firstValue(input.modelCategoryId),
    modelPhoto: parseModelPhotoFilter(input.modelPhoto),
    modelUsage: parseModelUsageFilter(input.modelUsage),
  }
}

export function buildBrandModelQueryString(current: BrandModelListState, next: Partial<BrandModelListState>) {
  const merged = { ...current, ...next }
  const params = new URLSearchParams()
  if (merged.search) params.set("search", merged.search)
  params.set("brandPage", String(merged.brandPage))
  params.set("brandPageSize", String(merged.brandPageSize))
  params.set("modelPage", String(merged.modelPage))
  params.set("modelPageSize", String(merged.modelPageSize))
  if (merged.modelBrandId) params.set("modelBrandId", merged.modelBrandId)
  if (merged.modelCategoryId) params.set("modelCategoryId", merged.modelCategoryId)
  params.set("modelPhoto", merged.modelPhoto)
  params.set("modelUsage", merged.modelUsage)
  return params.toString()
}

export function buildDuplicateNameGroups<TItem extends DuplicateNameItem>(items: TItem[]) {
  const groups = new Map<string, TItem[]>()
  for (const item of items) {
    const normalizedName = normalizeDuplicateName(item.name)
    if (!normalizedName) continue
    groups.set(normalizedName, [...(groups.get(normalizedName) ?? []), item])
  }

  return Array.from(groups.entries())
    .filter(([, groupItems]) => groupItems.length > 1)
    .map(([normalizedName, groupItems]) => ({
      normalizedName,
      displayName: groupItems[0]?.name ?? normalizedName,
      items: groupItems,
    }))
    .sort((a, b) => b.items.length - a.items.length || a.displayName.localeCompare(b.displayName))
}

export function normalizeDuplicateName(name: string) {
  return name
    .trim()
    .toLowerCase()
    .replace(/[\s._\-()/\\]+/g, "")
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

function parseModelPhotoFilter(value: string | string[] | null | undefined): ModelPhotoFilter {
  const normalized = firstValue(value)
  return modelPhotoFilters.includes(normalized as ModelPhotoFilter) ? (normalized as ModelPhotoFilter) : "all"
}

function parseModelUsageFilter(value: string | string[] | null | undefined): ModelUsageFilter {
  const normalized = firstValue(value)
  return modelUsageFilters.includes(normalized as ModelUsageFilter) ? (normalized as ModelUsageFilter) : "all"
}
