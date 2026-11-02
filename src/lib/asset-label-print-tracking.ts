import type { Prisma } from "@prisma/client"

// reprint = ต้องพิมพ์ใหม่: the latest print's tag differs from today's (group 4 plan 6, P6-R6).
export const labelPrintQueueModes = ["unprinted", "printed", "recent", "reprint"] as const
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

// One print batch, one queue page, the queue's matching ids and one lookup hold at most this many assets (P6-R2).
export const LABEL_PRINT_BATCH_MAX = 100
export const LABEL_PRINT_QUEUE_DEFAULT_PAGE_SIZE = 20

export type LabelPrintQueueWhere = {
  isActive: true
  id?: { in: string[] }
  labelPrints?: { none: Record<string, never> } | { some: Record<string, never> }
  movements?: { some: { movementType: "asset_tag_change" } }
  companyId?: string
  branchId?: string
  categoryId?: string
  currentLocationId?: string
  createdAt?: {
    gte?: Date
    lte?: Date
  }
}

export function normalizeLabelPrintAssetIds(assetIds: unknown, maxItems = LABEL_PRINT_BATCH_MAX) {
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

// reprintIds are the matches found in code (asset-label-queue.ts); they belong to the reprint mode only, and none is an
// empty list, which matches nothing.
export function buildAssetLabelPrintQueueWhere(
  modeValue: unknown,
  filters: LabelPrintQueueFilters = {},
  reprintIds: readonly string[] = [],
): LabelPrintQueueWhere {
  const mode = normalizeLabelPrintQueueMode(modeValue)
  const where: LabelPrintQueueWhere = { isActive: true }

  if (mode === "unprinted") {
    where.labelPrints = { none: {} }
  }
  if (mode === "printed" || mode === "reprint") {
    where.labelPrints = { some: {} }
  }
  if (mode === "reprint") {
    where.id = { in: [...reprintIds] }
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

// The assets one print records, and one lookup returns.
export function buildLabelPrintActiveAssetsWhere(assetIds: readonly string[]) {
  return { id: { in: [...assetIds] }, isActive: true as const }
}

// A missing or unreadable size is the default 20; otherwise a whole number from 1 to 100.
export function normalizeLabelPrintQueuePageSize(value: string | null | undefined) {
  if (value == null || value.trim() === "") return LABEL_PRINT_QUEUE_DEFAULT_PAGE_SIZE
  const parsed = Number(value)
  if (!Number.isFinite(parsed)) return LABEL_PRINT_QUEUE_DEFAULT_PAGE_SIZE
  return Math.min(Math.max(Math.trunc(parsed), 1), LABEL_PRINT_BATCH_MAX)
}

// How many queue rows the page already holds ("แสดงอีก 10 รายการ", P6-R7): a whole number from 0.
export function normalizeLabelPrintQueueSkip(value: string | null | undefined) {
  const parsed = Number(value ?? 0)
  if (!Number.isFinite(parsed)) return 0
  return Math.max(Math.trunc(parsed), 0)
}

// Every sort ends on the unique assetTag, so the order is total and skip pages neither repeat nor miss a row (P6-R7).
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
