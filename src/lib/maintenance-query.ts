import type { Prisma } from "@prisma/client"

export type MaintenanceListParams = {
  search?: string
  status?: string
  repairType?: string
  evidence?: string
  dateFrom?: string
  dateTo?: string
}

export const maintenanceStatusFilters = ["open", "closed"] as const
export const maintenanceRepairTypeFilters = ["internal", "vendor"] as const
export const maintenanceEvidenceFilters = ["with", "without"] as const

export function parseMaintenanceListParams(input: URLSearchParams | MaintenanceListParams) {
  const getValue = (key: keyof MaintenanceListParams) =>
    input instanceof URLSearchParams ? input.get(key)?.trim() : input[key]?.trim()

  const search = getValue("search") ?? ""
  const status = normalizeOption(getValue("status"), maintenanceStatusFilters)
  const repairType = normalizeOption(getValue("repairType"), maintenanceRepairTypeFilters)
  const evidence = normalizeOption(getValue("evidence"), maintenanceEvidenceFilters)
  const dateFrom = normalizeDate(getValue("dateFrom"))
  const dateTo = normalizeDate(getValue("dateTo"))

  return { search, status, repairType, evidence, dateFrom, dateTo }
}

export function buildMaintenanceWhere(
  filters: ReturnType<typeof parseMaintenanceListParams>,
  evidenceTicketIds?: string[]
): Prisma.MaintenanceTicketWhereInput {
  return {
    isActive: true,
    ...(filters.status ? { repairStatus: filters.status } : {}),
    ...(filters.repairType ? { repairType: filters.repairType } : {}),
    ...(filters.evidence === "with" ? { id: { in: evidenceTicketIds?.length ? evidenceTicketIds : ["__no_matching_ticket__"] } } : {}),
    ...(filters.evidence === "without" && evidenceTicketIds?.length ? { id: { notIn: evidenceTicketIds } } : {}),
    ...(filters.dateFrom || filters.dateTo
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
            { rootCause: { contains: filters.search } },
            { resolution: { contains: filters.search } },
            { asset: { assetTag: { contains: filters.search } } },
            { asset: { name: { contains: filters.search } } },
            { reportedBy: { code: { contains: filters.search } } },
            { reportedBy: { fullNameTh: { contains: filters.search } } },
            { assignedTo: { code: { contains: filters.search } } },
            { assignedTo: { fullNameTh: { contains: filters.search } } },
            { vendor: { name: { contains: filters.search } } },
          ],
        }
      : {}),
  }
}

export function buildMaintenanceQueryString(filters: ReturnType<typeof parseMaintenanceListParams>) {
  const params = new URLSearchParams()
  if (filters.search) params.set("search", filters.search)
  if (filters.status) params.set("status", filters.status)
  if (filters.repairType) params.set("repairType", filters.repairType)
  if (filters.evidence) params.set("evidence", filters.evidence)
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
