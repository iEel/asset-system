import type { Prisma } from "@prisma/client"
import { openRepairRecordWhere, repairRecordStatuses } from "./repair-record-policy.ts"

type QueryValue = string | string[] | number | undefined

export type MaintenanceListParams = {
  search?: string
  status?: string
  assetId?: string
  dateFrom?: string
  dateTo?: string
  page?: QueryValue
  pageSize?: QueryValue
}

export const maintenanceStatusFilters = repairRecordStatuses
export const maintenancePageSizes = [25, 50, 100] as const

export type ParsedMaintenanceListParams = ReturnType<typeof parseMaintenanceListParams>

export function parseMaintenanceListParams(input: URLSearchParams | MaintenanceListParams) {
  const getValue = (key: keyof MaintenanceListParams) => {
    const rawValue = input instanceof URLSearchParams ? input.get(key) ?? undefined : input[key]
    const value = Array.isArray(rawValue) ? rawValue[0] : rawValue
    return value === undefined ? undefined : String(value).trim()
  }

  return {
    search: getValue("search") ?? "",
    status: normalizeOption(getValue("status"), maintenanceStatusFilters),
    assetId: getValue("assetId") ?? "",
    dateFrom: normalizeDate(getValue("dateFrom")),
    dateTo: normalizeDate(getValue("dateTo")),
    page: normalizePositiveInteger(getValue("page"), 1),
    pageSize: normalizePageSize(getValue("pageSize")),
  }
}

export function getMaintenanceDateRangeError(filters: ParsedMaintenanceListParams) {
  return filters.dateFrom && filters.dateTo && filters.dateFrom > filters.dateTo
    ? "invalid_order" as const
    : null
}

export function buildMaintenanceWhere(filters: ParsedMaintenanceListParams): Prisma.MaintenanceTicketWhereInput {
  return {
    isActive: true,
    ...(filters.status === "in_progress" ? { repairStatus: openRepairRecordWhere.repairStatus } : {}),
    ...(filters.status === "closed" || filters.status === "cancelled" ? { repairStatus: filters.status } : {}),
    ...(filters.assetId ? { assetId: filters.assetId } : {}),
    ...(!getMaintenanceDateRangeError(filters) && (filters.dateFrom || filters.dateTo)
      ? {
          reportedDate: {
            ...(filters.dateFrom ? { gte: startOfDay(filters.dateFrom) } : {}),
            ...(filters.dateTo ? { lt: nextDay(filters.dateTo) } : {}),
          },
        }
      : {}),
    ...(filters.search
      ? {
          OR: [
            { repairNo: { contains: filters.search } },
            { problem: { contains: filters.search } },
            { resolution: { contains: filters.search } },
            { invoiceNo: { contains: filters.search } },
            { asset: { assetTag: { contains: filters.search } } },
            { asset: { name: { contains: filters.search } } },
            { reportedBy: { code: { contains: filters.search } } },
            { reportedBy: { fullNameTh: { contains: filters.search } } },
            { vendor: { name: { contains: filters.search } } },
          ],
        }
      : {}),
  }
}

export function buildMaintenanceQueryString(
  filters: ParsedMaintenanceListParams,
  overrides: Partial<ParsedMaintenanceListParams> = {},
) {
  const values = { ...filters, ...overrides }
  const params = new URLSearchParams()
  if (values.search) params.set("search", values.search)
  if (values.status) params.set("status", values.status)
  if (values.assetId) params.set("assetId", values.assetId)
  if (values.dateFrom) params.set("dateFrom", values.dateFrom)
  if (values.dateTo) params.set("dateTo", values.dateTo)
  params.set("page", String(values.page))
  params.set("pageSize", String(values.pageSize))
  return params.toString()
}

function normalizeOption<T extends readonly string[]>(value: string | undefined, allowed: T): T[number] | "" {
  return value && allowed.includes(value) ? value : ""
}

function normalizeDate(value: string | undefined) {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return ""
  const date = new Date(`${value}T00:00:00.000`)
  return Number.isNaN(date.getTime()) || toDateKey(date) !== value ? "" : value
}

function normalizePositiveInteger(value: string | undefined, fallback: number) {
  if (!value || !/^\d+$/.test(value)) return fallback
  const parsed = Number(value)
  return Number.isSafeInteger(parsed) && parsed > 0 ? parsed : fallback
}

function normalizePageSize(value: string | undefined): (typeof maintenancePageSizes)[number] {
  const parsed = Number(value)
  return maintenancePageSizes.includes(parsed as (typeof maintenancePageSizes)[number])
    ? parsed as (typeof maintenancePageSizes)[number]
    : 25
}

function toDateKey(date: Date) {
  const year = String(date.getFullYear()).padStart(4, "0")
  const month = String(date.getMonth() + 1).padStart(2, "0")
  const day = String(date.getDate()).padStart(2, "0")
  return `${year}-${month}-${day}`
}

function startOfDay(value: string) {
  return new Date(`${value}T00:00:00.000`)
}

function nextDay(value: string) {
  const date = startOfDay(value)
  date.setDate(date.getDate() + 1)
  return date
}
