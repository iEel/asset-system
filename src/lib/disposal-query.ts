import type { Prisma } from "@prisma/client"

export type DisposalListParams = {
  search?: string
  status?: string
  disposalType?: string
  dateFrom?: string
  dateTo?: string
}

export const disposalStatusFilters = ["pending", "approved", "disposed", "rejected"] as const
export const disposalTypeFilters = ["sell", "donate", "destroy", "lost", "dispose"] as const

export function parseDisposalListParams(input: URLSearchParams | DisposalListParams) {
  const getValue = (key: keyof DisposalListParams) =>
    input instanceof URLSearchParams ? input.get(key)?.trim() : input[key]?.trim()

  const search = getValue("search") ?? ""
  const status = normalizeOption(getValue("status"), disposalStatusFilters)
  const disposalType = normalizeOption(getValue("disposalType"), disposalTypeFilters)
  const dateFrom = normalizeDate(getValue("dateFrom"))
  const dateTo = normalizeDate(getValue("dateTo"))

  return { search, status, disposalType, dateFrom, dateTo }
}

export function buildDisposalWhere(filters: ReturnType<typeof parseDisposalListParams>): Prisma.DisposalRequestWhereInput {
  return {
    isActive: true,
    ...(filters.status ? { requestStatus: filters.status } : {}),
    ...(filters.disposalType ? { disposalType: filters.disposalType } : {}),
    ...(filters.dateFrom || filters.dateTo
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

export function buildDisposalQueryString(filters: ReturnType<typeof parseDisposalListParams>) {
  const params = new URLSearchParams()
  if (filters.search) params.set("search", filters.search)
  if (filters.status) params.set("status", filters.status)
  if (filters.disposalType) params.set("disposalType", filters.disposalType)
  if (filters.dateFrom) params.set("dateFrom", filters.dateFrom)
  if (filters.dateTo) params.set("dateTo", filters.dateTo)
  return params.toString()
}

function normalizeOption<T extends readonly string[]>(value: string | undefined, allowed: T): T[number] | "" {
  return value && allowed.includes(value) ? value : ""
}

function normalizeDate(value: string | undefined) {
  return value && /^\d{4}-\d{2}-\d{2}$/.test(value) ? value : ""
}

function startOfDay(value: string) {
  return new Date(`${value}T00:00:00.000`)
}

function nextDay(value: string) {
  const date = startOfDay(value)
  date.setDate(date.getDate() + 1)
  return date
}
