import type { Prisma } from "@prisma/client"

export const locationSorts = [
  "createdAt",
  "code",
  "name",
  "branch",
  "locationType",
  "parent",
  "currentAssets",
  "children",
] as const
export const locationAssetUsageFilters = ["all", "withAssets", "withoutAssets"] as const
export const locationHierarchyFilters = ["all", "root", "child", "leaf"] as const

export type LocationSort = (typeof locationSorts)[number]
export type LocationAssetUsageFilter = (typeof locationAssetUsageFilters)[number]
export type LocationHierarchyFilter = (typeof locationHierarchyFilters)[number]

export type LocationListParams = {
  search?: string | string[] | number | null
  page?: string | string[] | number | null
  pageSize?: string | string[] | number | null
  sort?: string | string[] | null
  direction?: string | string[] | null
  branchId?: string | string[] | null
  locationType?: string | string[] | null
  assetUsage?: string | string[] | null
  hierarchy?: string | string[] | null
}

export type LocationListState = {
  search: string
  page: number
  pageSize: number
  sort: LocationSort
  direction: "asc" | "desc"
  branchId: string
  locationType: string
  assetUsage: LocationAssetUsageFilter
  hierarchy: LocationHierarchyFilter
}

export type LocationSummaryItem = {
  parentId: string | null
  locationType: string
  _count: {
    currentAssets: number
    children: number
  }
}

export type LocationPathItem = {
  id: string
  code: string
  name: string
  parentId: string | null
}

export function parseLocationListParams(input: LocationListParams): LocationListState {
  const sortValue = firstValue(input.sort)
  const directionValue = firstValue(input.direction)

  return {
    search: firstValue(input.search).trim(),
    page: parsePositiveInteger(input.page, 1),
    pageSize: parsePageSize(input.pageSize),
    sort: locationSorts.includes(sortValue as LocationSort) ? (sortValue as LocationSort) : "createdAt",
    direction: directionValue === "asc" ? "asc" : "desc",
    branchId: firstValue(input.branchId).trim(),
    locationType: firstValue(input.locationType).trim(),
    assetUsage: parseFilter(input.assetUsage, locationAssetUsageFilters, "all"),
    hierarchy: parseFilter(input.hierarchy, locationHierarchyFilters, "all"),
  }
}

export function buildLocationWhere(state: LocationListState): Prisma.LocationWhereInput {
  return {
    isActive: true,
    ...(state.branchId ? { branchId: state.branchId } : {}),
    ...(state.locationType ? { locationType: state.locationType } : {}),
    ...(state.hierarchy === "root" ? { parentId: null } : {}),
    ...(state.hierarchy === "child" ? { parentId: { not: null } } : {}),
    ...(state.hierarchy === "leaf" ? { children: { none: { isActive: true } } } : {}),
    ...(state.assetUsage === "withAssets" ? { currentAssets: { some: { isActive: true } } } : {}),
    ...(state.assetUsage === "withoutAssets" ? { currentAssets: { none: { isActive: true } } } : {}),
    ...(state.search
      ? {
          OR: [
            { code: { contains: state.search } },
            { name: { contains: state.search } },
            { locationType: { contains: state.search } },
            { description: { contains: state.search } },
            { branch: { code: { contains: state.search } } },
            { branch: { name: { contains: state.search } } },
            { branch: { company: { code: { contains: state.search } } } },
            { branch: { company: { nameTh: { contains: state.search } } } },
          ],
        }
      : {}),
  }
}

export function buildLocationOrderBy({
  sort,
  direction,
}: Pick<LocationListState, "sort" | "direction">): Prisma.LocationOrderByWithRelationInput {
  if (sort === "branch") return { branch: { code: direction } }
  if (sort === "parent") return { parent: { code: direction } }
  if (sort === "currentAssets") return { currentAssets: { _count: direction } }
  if (sort === "children") return { children: { _count: direction } }
  return { [sort]: direction }
}

export function buildLocationQueryString(current: LocationListState, next: Partial<LocationListState>) {
  const merged = { ...current, ...next }
  const params = new URLSearchParams()
  if (merged.search) params.set("search", merged.search)
  params.set("page", String(merged.page))
  params.set("pageSize", String(merged.pageSize))
  params.set("sort", merged.sort)
  params.set("direction", merged.direction)
  if (merged.branchId) params.set("branchId", merged.branchId)
  if (merged.locationType) params.set("locationType", merged.locationType)
  params.set("assetUsage", merged.assetUsage)
  params.set("hierarchy", merged.hierarchy)
  return params.toString()
}

export function buildLocationSummary(locations: LocationSummaryItem[]) {
  return {
    total: locations.length,
    withAssets: locations.filter((location) => location._count.currentAssets > 0).length,
    withoutAssets: locations.filter((location) => location._count.currentAssets === 0).length,
    rootLocations: locations.filter((location) => !location.parentId).length,
    leafLocations: locations.filter((location) => location._count.children === 0).length,
  }
}

export function buildLocationPathMap(locations: LocationPathItem[]) {
  const byId = new Map(locations.map((location) => [location.id, location]))
  const paths = new Map<string, string>()

  function resolvePath(location: LocationPathItem, visiting = new Set<string>()): string {
    const cached = paths.get(location.id)
    if (cached) return cached
    if (visiting.has(location.id)) return location.code

    visiting.add(location.id)
    const parent = location.parentId ? byId.get(location.parentId) : null
    const path = parent ? `${resolvePath(parent, visiting)} / ${location.code}` : location.code
    visiting.delete(location.id)
    paths.set(location.id, path)
    return path
  }

  for (const location of locations) resolvePath(location)
  return paths
}

export function wouldCreateLocationCycle({
  locationId,
  nextParentId,
  locations,
}: {
  locationId: string
  nextParentId: string | null | undefined
  locations: { id: string; parentId: string | null }[]
}) {
  if (!nextParentId) return false
  if (nextParentId === locationId) return true

  const parentById = new Map(locations.map((location) => [location.id, location.parentId]))
  const seen = new Set<string>()
  let current: string | null | undefined = nextParentId

  while (current) {
    if (current === locationId) return true
    if (seen.has(current)) return false
    seen.add(current)
    current = parentById.get(current)
  }

  return false
}

export function getLocationDeleteBlockReason(counts: {
  currentAssets: number
  homeAssets: number
  children: number
  auditRounds: number
}) {
  const reasons = [
    counts.currentAssets > 0 ? `ทรัพย์สินปัจจุบัน ${counts.currentAssets} รายการ` : null,
    counts.homeAssets > 0 ? `ทรัพย์สินที่ตั้งประจำ ${counts.homeAssets} รายการ` : null,
    counts.children > 0 ? `พื้นที่ย่อย ${counts.children} รายการ` : null,
    counts.auditRounds > 0 ? `รอบตรวจนับ ${counts.auditRounds} รายการ` : null,
  ].filter((reason): reason is string => Boolean(reason))

  if (reasons.length === 0) return null
  return `ไม่สามารถลบพื้นที่นี้ได้ เพราะยังมี${joinThaiList(reasons)}ใช้งานอยู่`
}

export function buildLocationDrilldownHrefs({
  locale,
  locationCode,
}: {
  locale: string
  locationCode: string
}) {
  return {
    assets: `/${locale}/assets?search=${encodeURIComponent(locationCode)}&page=1`,
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

function joinThaiList(values: string[]) {
  if (values.length <= 1) return values[0] ?? ""
  return `${values.slice(0, -1).join(", ")} และ${values.at(-1)}`
}
