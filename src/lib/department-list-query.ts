import type { Prisma } from "@prisma/client"
import { auditRoundOperationalWhere } from "./audit-round-status.ts"
import { appendListPage, parseListPage, type ListPageSize } from "./list-pagination.ts"
import { chunkListIds, parseNameDefaultSort } from "./master-data-list-ui.ts"
import { parseRecordStatus, recordStatusWhere, setRecordStatusParam, type RecordStatusFilter } from "./master-data-query.ts"

// The departments list on board MD-Departments (group 8 plan 1 Task 4, spec §3, §5): parsing, where, order, query
// string, cards, the summary line, the filter chips and the deactivation counts. Type and plain imports only: tests and
// the page both load this module; the route reads departmentDeactivateCountSelect.

// No employee / asset count sorts: Prisma's _count orderBy counts inactive rows too, while the columns show active ones
// only (group 8 plan 1 final review). The old list had date added only; every sort here is new or kept.
export const departmentSorts = ["createdAt", "code", "name", "company"] as const
export const departmentEmployeeUsageFilters = ["all", "withEmployees", "withoutEmployees"] as const
export const departmentAssetUsageFilters = ["all", "withAssets", "withoutAssets"] as const
// The company filter's แผนกกลาง / ไม่ระบุบริษัท choice: a department with no company (the card's แผนกกลาง).
export const departmentSharedCompanyValue = "none"

export type DepartmentSort = (typeof departmentSorts)[number]
export type DepartmentEmployeeUsageFilter = (typeof departmentEmployeeUsageFilters)[number]
export type DepartmentAssetUsageFilter = (typeof departmentAssetUsageFilters)[number]

type QueryValue = string | string[] | number | null | undefined

export type DepartmentListParams = {
  status?: QueryValue
  search?: QueryValue
  page?: QueryValue
  pageSize?: QueryValue
  sort?: QueryValue
  direction?: QueryValue
  companyId?: QueryValue
  employeeUsage?: QueryValue
  assetUsage?: QueryValue
}

export type DepartmentListState = {
  search: string
  status: RecordStatusFilter
  page: number
  pageSize: ListPageSize
  sort: DepartmentSort
  direction: "asc" | "desc"
  companyId: string
  employeeUsage: DepartmentEmployeeUsageFilter
  assetUsage: DepartmentAssetUsageFilter
}

function firstValue(value: QueryValue) {
  if (Array.isArray(value)) return String(value[0] ?? "")
  return String(value ?? "")
}

function parseFilter<T extends string>(value: QueryValue, allowed: readonly T[], fallback: T): T {
  const raw = firstValue(value)
  return allowed.includes(raw as T) ? (raw as T) : fallback
}

// Name A→Z by default (board); the old order (date added, newest first) and every other sort stay reachable.
export function parseDepartmentListParams(input: DepartmentListParams): DepartmentListState {
  return {
    search: firstValue(input.search).trim(),
    status: parseRecordStatus(input.status),
    ...parseListPage({ page: input.page, pageSize: input.pageSize }),
    ...parseNameDefaultSort(input, departmentSorts, "name"),
    companyId: firstValue(input.companyId).trim(),
    employeeUsage: parseFilter(input.employeeUsage, departmentEmployeeUsageFilters, "all"),
    assetUsage: parseFilter(input.assetUsage, departmentAssetUsageFilters, "all"),
  }
}

export function buildDepartmentWhere(state: DepartmentListState): Prisma.DepartmentWhereInput {
  return {
    ...recordStatusWhere(state.status),
    ...(state.companyId === departmentSharedCompanyValue ? { companyId: null } : state.companyId ? { companyId: state.companyId } : {}),
    // Today's search fields, all kept (spec §8).
    ...(state.search
      ? {
          OR: [
            { code: { contains: state.search } },
            { name: { contains: state.search } },
            { company: { code: { contains: state.search } } },
            { company: { nameTh: { contains: state.search } } },
          ],
        }
      : {}),
    ...(state.employeeUsage === "withEmployees" ? { employees: { some: { isActive: true } } } : {}),
    ...(state.employeeUsage === "withoutEmployees" ? { employees: { none: { isActive: true } } } : {}),
    ...(state.assetUsage === "withAssets" ? { assets: { some: { isActive: true } } } : {}),
    ...(state.assetUsage === "withoutAssets" ? { assets: { none: { isActive: true } } } : {}),
  }
}

// The id breaks ties, so no row shows on two pages (spec 2B B4).
export function buildDepartmentOrderBy({
  sort,
  direction,
}: Pick<DepartmentListState, "sort" | "direction">): Prisma.DepartmentOrderByWithRelationInput[] {
  const primary: Prisma.DepartmentOrderByWithRelationInput = sort === "company" ? { company: { nameTh: direction } } : { [sort]: direction }
  return [primary, { id: "asc" }]
}

// Defaults stay out of the URL (page 1, 25 rows, the active records, name A→Z, every filter "all"), so the plain list
// link stays /master-data/departments.
export function buildDepartmentQueryString(current: DepartmentListState, next: Partial<DepartmentListState> = {}) {
  const merged = { ...current, ...next }
  const params = new URLSearchParams()
  if (merged.search) params.set("search", merged.search)
  if (merged.companyId) params.set("companyId", merged.companyId)
  if (merged.employeeUsage !== "all") params.set("employeeUsage", merged.employeeUsage)
  if (merged.assetUsage !== "all") params.set("assetUsage", merged.assetUsage)
  if (merged.sort !== "name" || merged.direction !== "asc") {
    params.set("sort", merged.sort)
    params.set("direction", merged.direction)
  }
  setRecordStatusParam(params, merged.status)
  appendListPage(params, { page: merged.page, pageSize: merged.pageSize })
  return params.toString()
}

export function departmentListHref(basePath: string, current: DepartmentListState, next: Partial<DepartmentListState> = {}) {
  const query = buildDepartmentQueryString(current, next)
  return query ? `${basePath}?${query}` : basePath
}

/** A filter of the form is set (the record status is the segmented control, the sort is not a filter). */
export function departmentListHasFilters(state: DepartmentListState) {
  return Boolean(state.search || state.companyId) || state.employeeUsage !== "all" || state.assetUsage !== "all"
}

export type DepartmentSummaryItem = {
  company: { id: string; nameTh: string } | null
  _count: { employees: number }
}

// The cards over the active departments (board MD-Departments): แผนกทั้งหมด with "[บริษัท] 30 · [บริษัท ข] 5 · แผนกกลาง 3"
// (companies most first, then by name; แผนกกลาง last), มีพนักงาน with the employee total, ยังไม่มีพนักงาน.
export function buildDepartmentSummary(departments: readonly DepartmentSummaryItem[]) {
  const byCompany = new Map<string, { id: string; name: string; count: number }>()
  let shared = 0
  for (const department of departments) {
    if (!department.company) {
      shared += 1
      continue
    }
    const item = byCompany.get(department.company.id) ?? { id: department.company.id, name: department.company.nameTh, count: 0 }
    item.count += 1
    byCompany.set(item.id, item)
  }
  const withEmployees = departments.filter((department) => department._count.employees > 0).length
  return {
    total: departments.length,
    byCompany: [...byCompany.values()].sort((left, right) => right.count - left.count || left.name.localeCompare(right.name, "th")),
    shared,
    withEmployees,
    withoutEmployees: departments.length - withEmployees,
    employeeTotal: departments.reduce((sum, department) => sum + department._count.employees, 0),
  }
}

// The summary line "{n} แผนก · ยังมีทรัพย์สินผูกอยู่ {d} แผนก รวม {a} รายการ": over the whole filtered set, not the page.
export function departmentSummaryLineWheres(where: Prisma.DepartmentWhereInput) {
  return {
    withAssets: { AND: [where, { assets: { some: { isActive: true } } }] } satisfies Prisma.DepartmentWhereInput,
    assets: { isActive: true, department: { is: where } } satisfies Prisma.AssetWhereInput,
  }
}

export type DepartmentFilterChip = { key: string; label: string; href: string }

// The board's chip row: one removable chip per form filter ("พนักงาน: ยังไม่มีพนักงาน"); removing one goes to page 1.
export function buildDepartmentFilterChips({
  basePath,
  state,
  companyName,
  labels,
}: {
  basePath: string
  state: DepartmentListState
  // The chosen company's name, or undefined when it is not one of the offered companies (the raw id shows).
  companyName: string | undefined
  labels: {
    company: string
    sharedCompany: string
    employees: string
    assets: string
    employeeUsage: Record<Exclude<DepartmentEmployeeUsageFilter, "all">, string>
    assetUsage: Record<Exclude<DepartmentAssetUsageFilter, "all">, string>
  }
}): DepartmentFilterChip[] {
  const chips: DepartmentFilterChip[] = []
  const without = (next: Partial<DepartmentListState>) => departmentListHref(basePath, state, { ...next, page: 1 })
  if (state.companyId) {
    const name = state.companyId === departmentSharedCompanyValue ? labels.sharedCompany : (companyName ?? state.companyId)
    chips.push({ key: "company", label: `${labels.company}: ${name}`, href: without({ companyId: "" }) })
  }
  if (state.employeeUsage !== "all") {
    chips.push({ key: "employeeUsage", label: `${labels.employees}: ${labels.employeeUsage[state.employeeUsage]}`, href: without({ employeeUsage: "all" }) })
  }
  if (state.assetUsage !== "all") {
    chips.push({ key: "assetUsage", label: `${labels.assets}: ${labels.assetUsage[state.assetUsage]}`, href: without({ assetUsage: "all" }) })
  }
  return chips
}

// G8P1-R3: an audit round is open while it is active and not closed or cancelled — the audit pages' operational status
// (auditRoundOperationalWhere), not a list of its own.
export const departmentOpenAuditRoundWhere = { isActive: true, status: auditRoundOperationalWhere } satisfies Prisma.AuditRoundWhereInput

// The counts the department guard reads, for the route's findFirst (DELETE and the PUT that deactivates). The rounds are
// the department's scoped ones (AuditRound.scopeDepartmentId) that are still open.
export const departmentDeactivateCountSelect = {
  employees: { where: { isActive: true } },
  assets: { where: { isActive: true } },
  auditRounds: { where: departmentOpenAuditRoundWhere },
} satisfies Prisma.DepartmentCountOutputTypeSelect

/** The route's _count (auditRounds = the open scoped rounds) as getDepartmentDeleteBlockReason reads it. */
export function departmentDeactivateCounts(counts: { employees: number; assets: number; auditRounds: number }) {
  return { employees: counts.employees, assets: counts.assets, openAuditRounds: counts.auditRounds }
}

export type DepartmentOpenAuditRoundReader = { auditRound: { groupBy(args: object): PromiseLike<unknown[]> } }

// The list's ⋯ reason needs each row's open scoped rounds: one grouped query per 2,000 ids (SQL Server takes at most
// 2,100 parameters). A department with none is left out of the map.
export async function readDepartmentOpenAuditRoundCounts(
  db: DepartmentOpenAuditRoundReader,
  ids: readonly string[]
): Promise<Map<string, number>> {
  const counts = new Map<string, number>()
  if (ids.length === 0) return counts
  const parts = await Promise.all(
    chunkListIds(ids).map((chunk) =>
      db.auditRound.groupBy({
        by: ["scopeDepartmentId"],
        where: { ...departmentOpenAuditRoundWhere, scopeDepartmentId: { in: chunk } },
        _count: { _all: true },
      })
    )
  )
  for (const row of parts.flat() as { scopeDepartmentId: string | null; _count: { _all: number } }[]) {
    if (row.scopeDepartmentId) counts.set(row.scopeDepartmentId, (counts.get(row.scopeDepartmentId) ?? 0) + row._count._all)
  }
  return counts
}

export function buildDepartmentDrilldownHrefs({ locale, departmentId }: { locale: string; departmentId: string }) {
  const encoded = encodeURIComponent(departmentId)
  return {
    employees: `/${locale}/master-data/employees?departmentId=${encoded}&page=1`,
    assets: `/${locale}/assets?departmentId=${encoded}&page=1`,
  }
}
