export type MasterDataListParams = {
  search?: string
  page?: string | number
  pageSize?: string | number
  sort?: string
  direction?: string
}

export type MasterDataListState<TSort extends string> = {
  search: string
  page: number
  pageSize: number
  sort: TSort
  direction: "asc" | "desc"
}

export function parseMasterDataListParams<TSort extends string>({
  input,
  allowedSorts,
  defaultSort,
}: {
  input: MasterDataListParams
  allowedSorts: readonly TSort[]
  defaultSort: TSort
}): MasterDataListState<TSort> {
  const pageValue = Number(input.page ?? 1) || 1
  const pageSizeValue = Number(input.pageSize ?? 25) || 25
  const sort = allowedSorts.includes(input.sort as TSort) ? (input.sort as TSort) : defaultSort
  const direction = input.direction === "asc" ? "asc" : "desc"

  return {
    search: String(input.search ?? "").trim(),
    page: Math.max(1, pageValue),
    pageSize: Math.min(100, Math.max(10, pageSizeValue)),
    sort,
    direction,
  }
}

export function buildMasterDataQueryString<TSort extends string>(
  current: MasterDataListState<TSort>,
  next: Partial<MasterDataListState<TSort>>
) {
  const merged = { ...current, ...next }
  const params = new URLSearchParams()
  if (merged.search) params.set("search", merged.search)
  params.set("page", String(merged.page))
  params.set("pageSize", String(merged.pageSize))
  params.set("sort", merged.sort)
  params.set("direction", merged.direction)
  return params.toString()
}

export function paginationRange(page: number, pageSize: number, total: number) {
  if (total === 0) return { start: 0, end: 0, totalPages: 1 }
  const totalPages = Math.max(1, Math.ceil(total / pageSize))
  const safePage = Math.min(page, totalPages)
  return {
    start: (safePage - 1) * pageSize + 1,
    end: Math.min(safePage * pageSize, total),
    totalPages,
  }
}

// "ไม่ใช้งาน" is also how master data is deleted (soft delete), so a list shows active records by default and can show
// the inactive ones to bring them back (critique 2026-10-20 E1). No imports: tests and pages both load this module.
export const recordStatusFilters = ["active", "inactive", "all"] as const
export type RecordStatusFilter = (typeof recordStatusFilters)[number]

export function parseRecordStatus(value: string | string[] | number | null | undefined): RecordStatusFilter {
  const raw = Array.isArray(value) ? value[0] : value
  const normalized = String(raw ?? "")
  return recordStatusFilters.includes(normalized as RecordStatusFilter) ? (normalized as RecordStatusFilter) : "active"
}

export function recordStatusWhere(status: RecordStatusFilter): { isActive?: boolean } {
  if (status === "inactive") return { isActive: false }
  if (status === "all") return {}
  return { isActive: true }
}

// The default stays out of the URL, so links built before the filter keep their exact query strings.
export function setRecordStatusParam(params: URLSearchParams, status: RecordStatusFilter) {
  if (status !== "active") params.set("status", status)
  return params
}

// Unticking "ใช้งาน" on an active record removes it from use the way "ลบ" does; ticking it again never is.
export function isDeactivation(current: boolean, next: boolean) {
  return current && !next
}
