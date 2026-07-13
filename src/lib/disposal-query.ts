import type { Prisma } from "@prisma/client"

export type DisposalListParams = {
  search?: string | string[]
  status?: string | string[]
  disposalType?: string | string[]
  dateFrom?: string | string[]
  dateTo?: string | string[]
  page?: string | string[] | number
  pageSize?: string | string[] | number
}

export const disposalStatusFilters = ["pending", "approved", "disposed", "rejected"] as const
export const disposalTypeFilters = ["sell", "donate", "destroy", "lost", "dispose"] as const

export function parseDisposalListParams(input: URLSearchParams | DisposalListParams) {
  const getValue = (key: keyof DisposalListParams) =>
    input instanceof URLSearchParams
      ? input.get(key)?.trim()
      : getSingleValue(input[key])?.trim()

  const search = getValue("search") ?? ""
  const status = normalizeOption(getValue("status"), disposalStatusFilters)
  const disposalType = normalizeOption(getValue("disposalType"), disposalTypeFilters)
  const dateFrom = normalizeDate(getValue("dateFrom"))
  const dateTo = normalizeDate(getValue("dateTo"))
  const page = normalizePage(getValue("page"))
  const pageSize = normalizePageSize(getValue("pageSize"))

  return { search, status, disposalType, dateFrom, dateTo, page, pageSize }
}

export function buildDisposalWhere(filters: ReturnType<typeof parseDisposalListParams>): Prisma.DisposalRequestWhereInput {
  const hasValidDateRange = getDisposalDateRangeError(filters) === null

  return {
    isActive: true,
    ...(filters.status ? { requestStatus: filters.status } : {}),
    ...(filters.disposalType ? { disposalType: filters.disposalType } : {}),
    ...(hasValidDateRange && (filters.dateFrom || filters.dateTo)
      ? {
          requestDate: {
            ...(filters.dateFrom ? { gte: startOfDay(filters.dateFrom) } : {}),
            ...(filters.dateTo ? { lt: nextDay(filters.dateTo) } : {}),
          },
        }
      : {}),
    ...(filters.search
      ? {
          OR: [
            { disposalNo: { contains: filters.search } },
            { reason: { contains: filters.search } },
            { approvalRemark: { contains: filters.search } },
            { asset: { assetTag: { contains: filters.search } } },
            { asset: { name: { contains: filters.search } } },
            { requestedBy: { code: { contains: filters.search } } },
            { requestedBy: { fullNameTh: { contains: filters.search } } },
            { approver: { code: { contains: filters.search } } },
            { approver: { fullNameTh: { contains: filters.search } } },
          ],
        }
      : {}),
  }
}

export function getDisposalDateRangeError(filters: ReturnType<typeof parseDisposalListParams>) {
  if (!filters.dateFrom || !filters.dateTo) return null
  return filters.dateFrom > filters.dateTo ? "invalid_order" as const : null
}

export function buildDisposalQueryString(
  filters: ReturnType<typeof parseDisposalListParams>,
  next: Partial<ReturnType<typeof parseDisposalListParams>> = {}
) {
  const merged = { ...filters, ...next }
  const params = new URLSearchParams()
  if (merged.search) params.set("search", merged.search)
  if (merged.status) params.set("status", merged.status)
  if (merged.disposalType) params.set("disposalType", merged.disposalType)
  if (merged.dateFrom) params.set("dateFrom", merged.dateFrom)
  if (merged.dateTo) params.set("dateTo", merged.dateTo)
  params.set("page", String(merged.page))
  params.set("pageSize", String(merged.pageSize))
  return params.toString()
}

function normalizeOption<T extends readonly string[]>(value: string | undefined, allowed: T): T[number] | "" {
  return value && allowed.includes(value) ? value : ""
}

function normalizeDate(value: string | undefined) {
  return value && /^\d{4}-\d{2}-\d{2}$/.test(value) ? value : ""
}

function normalizePageSize(value: string | undefined) {
  return value === "50" || value === "100" ? Number(value) : 25
}

function normalizePage(value: string | undefined) {
  const parsed = Number(value)
  return Number.isSafeInteger(parsed) && parsed >= 1 ? parsed : 1
}

function getSingleValue(value: string | string[] | number | undefined) {
  if (Array.isArray(value)) return value[0]
  return value == null ? undefined : String(value)
}

function startOfDay(value: string) {
  return new Date(`${value}T00:00:00.000`)
}

function nextDay(value: string) {
  const date = startOfDay(value)
  date.setDate(date.getDate() + 1)
  return date
}
