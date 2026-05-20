import type { Prisma } from "@prisma/client"

export const categorySorts = ["code", "name", "models", "assets", "customFields", "createdAt"] as const

export type CategorySort = (typeof categorySorts)[number]

export type CategoryListParams = {
  search?: string | string[] | number | null
  page?: string | string[] | number | null
  pageSize?: string | string[] | number | null
  sort?: string | string[] | null
  direction?: string | string[] | null
}

export type CategoryListState = {
  search: string
  page: number
  pageSize: number
  sort: CategorySort
  direction: "asc" | "desc"
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
