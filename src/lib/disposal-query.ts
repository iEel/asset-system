import type { Prisma } from "@prisma/client"

export type DisposalListParams = {
  search?: string | string[]
  status?: string | string[]
  disposalType?: string | string[]
  dateFrom?: string | string[]
  dateTo?: string | string[]
  auditRound?: string | string[]
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
  const auditRound = normalizeUuid(getValue("auditRound"))
  const page = normalizePage(getValue("page"))
  const pageSize = normalizePageSize(getValue("pageSize"))

  return { search, status, disposalType, dateFrom, dateTo, auditRound, page, pageSize }
}

/**
 * What the where needs from the database (it is sync): the audit round filter's finding ids, read by the caller with
 * readAuditRoundFindingIds.
 */
export type DisposalWhereContext = { auditRoundFindingIds?: readonly string[] }

export function buildDisposalWhere(
  filters: ReturnType<typeof parseDisposalListParams>,
  context: DisposalWhereContext = {},
): Prisma.DisposalRequestWhereInput {
  const hasValidDateRange = getDisposalDateRangeError(filters) === null

  return {
    isActive: true,
    // "มาจากรอบตรวจนับ" (ยืนยันผลตรวจ plan 4): a request made from the round's confirm page, or from one of its findings
    // on the findings page. In an AND, so the search's OR stays its own.
    ...(filters.auditRound
      ? {
          AND: [
            {
              OR: [
                { sourceType: "audit_round", sourceId: filters.auditRound },
                { sourceType: "audit_finding", sourceId: { in: [...(context.auditRoundFindingIds ?? [])] } },
              ],
            },
          ],
        }
      : {}),
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
  if (merged.auditRound) params.set("auditRound", merged.auditRound)
  params.set("page", String(merged.page))
  params.set("pageSize", String(merged.pageSize))
  return params.toString()
}

/** The audit round filter's finding ids; no round, no read. */
export async function readAuditRoundFindingIds(
  db: { auditFinding: { findMany(args: { where: { auditRoundId: string }; select: { id: true } }): Promise<Array<{ id: string }>> } },
  auditRoundId: string,
): Promise<string[]> {
  if (!auditRoundId) return []
  const rows = await db.auditFinding.findMany({ where: { auditRoundId }, select: { id: true } })
  return rows.map((row) => row.id)
}

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

function normalizeUuid(value: string | undefined) {
  return value && UUID_PATTERN.test(value) ? value : ""
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
