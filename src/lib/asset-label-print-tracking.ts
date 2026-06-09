import type { Prisma } from "@prisma/client"

export const labelPrintQueueModes = ["unprinted", "printed", "recent"] as const
export type LabelPrintQueueMode = (typeof labelPrintQueueModes)[number]

export const labelPrintQueueSorts = ["created_desc", "asset_tag", "location", "category"] as const
export type LabelPrintQueueSort = (typeof labelPrintQueueSorts)[number]

const labelTapeSizes = ["12", "18", "24", "custom"] as const
export type NormalizedLabelTapeSize = (typeof labelTapeSizes)[number]

export type LabelPrintQueueFilters = {
  companyId?: string
  branchId?: string
  categoryId?: string
  locationId?: string
  createdFrom?: string
  createdTo?: string
}

type LabelPrintQueueWhere = {
  isActive: true
  labelPrints?: { none: Record<string, never> } | { some: Record<string, never> }
  companyId?: string
  branchId?: string
  categoryId?: string
  currentLocationId?: string
  createdAt?: {
    gte?: Date
    lte?: Date
  }
}

export function normalizeLabelPrintAssetIds(assetIds: unknown, maxItems = 100) {
  if (!Array.isArray(assetIds)) return []

  const seen = new Set<string>()
  const normalized: string[] = []
  for (const value of assetIds) {
    if (typeof value !== "string") continue
    const id = value.trim()
    if (!id || seen.has(id)) continue
    normalized.push(id)
    seen.add(id)
    if (normalized.length >= maxItems) break
  }

  return normalized
}

export function normalizeLabelTapeSize(
  value: unknown,
  fallback: NormalizedLabelTapeSize = "18"
): NormalizedLabelTapeSize {
  const safeFallback = labelTapeSizes.includes(fallback) ? fallback : "18"
  return labelTapeSizes.includes(value as NormalizedLabelTapeSize)
    ? value as NormalizedLabelTapeSize
    : safeFallback
}

export function normalizeLabelPrintQueueMode(value: unknown): LabelPrintQueueMode {
  return labelPrintQueueModes.includes(value as LabelPrintQueueMode)
    ? value as LabelPrintQueueMode
    : "recent"
}

export function normalizeLabelPrintQueueSort(value: unknown): LabelPrintQueueSort {
  return labelPrintQueueSorts.includes(value as LabelPrintQueueSort)
    ? value as LabelPrintQueueSort
    : "created_desc"
}

export function normalizeLabelPrintQueueFilters(values: Record<string, unknown>): LabelPrintQueueFilters {
  const filters: LabelPrintQueueFilters = {}
  const companyId = normalizeQueueFilterValue(values.companyId)
  const branchId = normalizeQueueFilterValue(values.branchId)
  const categoryId = normalizeQueueFilterValue(values.categoryId)
  const locationId = normalizeQueueFilterValue(values.locationId)
  const createdFrom = normalizeQueueDateValue(values.createdFrom)
  const createdTo = normalizeQueueDateValue(values.createdTo)

  if (companyId) filters.companyId = companyId
  if (branchId) filters.branchId = branchId
  if (categoryId) filters.categoryId = categoryId
  if (locationId) filters.locationId = locationId
  if (createdFrom) filters.createdFrom = createdFrom
  if (createdTo) filters.createdTo = createdTo

  return filters
}

export function buildAssetLabelPrintQueueWhere(modeValue: unknown, filters: LabelPrintQueueFilters = {}): LabelPrintQueueWhere {
  const mode = normalizeLabelPrintQueueMode(modeValue)
  const where: LabelPrintQueueWhere = { isActive: true }

  if (mode === "unprinted") {
    where.labelPrints = { none: {} }
  }
  if (mode === "printed") {
    where.labelPrints = { some: {} }
  }

  if (filters.companyId) where.companyId = filters.companyId
  if (filters.branchId) where.branchId = filters.branchId
  if (filters.categoryId) where.categoryId = filters.categoryId
  if (filters.locationId) where.currentLocationId = filters.locationId

  const createdAt: LabelPrintQueueWhere["createdAt"] = {}
  if (filters.createdFrom) createdAt.gte = startOfUtcDay(filters.createdFrom)
  if (filters.createdTo) createdAt.lte = endOfUtcDay(filters.createdTo)
  if (createdAt.gte || createdAt.lte) where.createdAt = createdAt

  return where
}

export function buildAssetLabelPrintQueueOrderBy(sortValue: unknown): Prisma.AssetOrderByWithRelationInput[] {
  const sort = normalizeLabelPrintQueueSort(sortValue)
  if (sort === "asset_tag") return [{ assetTag: "asc" }]
  if (sort === "location") return [{ currentLocation: { code: "asc" } }, { assetTag: "asc" }]
  if (sort === "category") return [{ category: { code: "asc" } }, { assetTag: "asc" }]
  return [{ createdAt: "desc" }, { assetTag: "asc" }]
}

function normalizeQueueFilterValue(value: unknown) {
  if (typeof value !== "string") return undefined
  const trimmed = value.trim()
  if (!trimmed || trimmed === "all") return undefined
  return trimmed
}

function normalizeQueueDateValue(value: unknown) {
  if (typeof value !== "string") return undefined
  const trimmed = value.trim()
  return /^\d{4}-\d{2}-\d{2}$/.test(trimmed) ? trimmed : undefined
}

function startOfUtcDay(value: string) {
  return new Date(`${value}T00:00:00.000Z`)
}

function endOfUtcDay(value: string) {
  return new Date(`${value}T23:59:59.999Z`)
}
