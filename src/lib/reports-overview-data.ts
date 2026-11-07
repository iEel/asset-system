import type { Prisma } from "@prisma/client"

import { normalizeAssetOwnershipType } from "./asset-ownership.ts"
import {
  buildBreakdownTable,
  filterBreakdownGroups,
  sortBreakdownGroups,
  type BreakdownDimension,
  type BreakdownGroup,
  type BreakdownTable,
} from "./report-breakdown.ts"

// The reports overview's reads (group 10 plan 1 Task 2, spec §4): the six group-bys the page ran inline, now with the
// department one counting assets without a department (§4.4), the status strip that adds up (§4.1: นอกขั้นตัดจำหน่าย +
// รอตัดจำหน่าย + ตัดจำหน่ายแล้ว = the total), the full list of one dimension for `breakdown=` filtered by `bq=` (§4.2),
// and the ten newest assets for the preview (§4.3). The db is injected, as the other page-data readers, so the page
// passes prisma and the tests fake it.

export const reportBreakdownDimensions = ["status", "category", "company", "branch", "department", "ownership"] as const satisfies readonly BreakdownDimension[]

// Statuses are looked up by their English name, as audit-round-scope.ts and asset-repair-rules.ts do.
export const PENDING_DISPOSAL_STATUS_NAME = "Pending Disposal"
export const DISPOSED_STATUS_NAME = "Disposed"
export const RETIRED_STATUS_NAME = "Retired"

const ACTIVE_EXAMPLES_MAX = 3
const PREVIEW_ROWS = 10

// Method syntax, so fakes may narrow args; the page passes `prisma as unknown as ReportsOverviewDb`.
export type ReportsOverviewDb = {
  asset: {
    groupBy(args: object): Promise<unknown[]>
    findMany(args: object): Promise<unknown[]>
    aggregate(args: object): Promise<unknown>
  }
  assetStatus: { findMany(args: object): Promise<unknown[]> }
  assetCategory: { findMany(args: object): Promise<unknown[]> }
  company: { findMany(args: object): Promise<unknown[]> }
  branch: { findMany(args: object): Promise<unknown[]> }
  department: { findMany(args: object): Promise<unknown[]> }
}

export type ReportsOverviewInput = {
  locale: string
  // The report's filters as a register query (no page, no view): every row link adds its group to it.
  baseQuery: URLSearchParams
  // `breakdown=`: the dimension whose full list replaces the six tables, or null.
  breakdown: BreakdownDimension | null
  // `bq=`: the full list's search.
  bq: string
  // `group=`: the phone's one table (default status). The six tables are read either way.
  phoneGroup: BreakdownDimension
  labels: {
    // "ยังไม่ระบุแผนก": the name of the department group with no department, in the full list.
    unassignedDepartment: string
    // asset.ownershipType_<type>
    ownership: (type: string) => string
  }
}

export type ReportsOverviewPreviewRow = {
  id: string
  assetTag: string
  name: string
  category: string
  branch: string
  department: string | null
  custodian: string | null
  ownership: string
  // The English status name, for the badge's tone (getStatusTone).
  statusName: string
  statusLabel: string
}

export type ReportsOverviewStrip = {
  total: number
  active: number
  activeStatusCount: number
  activeExamples: string[]
  pendingDisposal: number
  writtenOff: number
  retired: number
  purchaseTotal: number
  statusIds: { pendingDisposal: string | null; disposed: string | null; retired: string | null }
}

export type ReportsOverviewData = {
  strip: ReportsOverviewStrip
  tables: Record<BreakdownDimension, BreakdownTable>
  full: { dimension: BreakdownDimension; groups: BreakdownGroup[] } | null
  preview: ReportsOverviewPreviewRow[]
}

type CountRow<K extends string> = { [key in K]: string | null } & { _count: { _all: number } }
type NamedRecord = { id: string; name: string; code?: string }

export function parseReportBreakdownDimension(value: unknown): BreakdownDimension | null {
  const candidate = Array.isArray(value) ? value[0] : value
  return (reportBreakdownDimensions as readonly string[]).includes(candidate as string) ? (candidate as BreakdownDimension) : null
}

export function parseReportPhoneGroup(value: unknown): BreakdownDimension {
  return parseReportBreakdownDimension(value) ?? "status"
}

export function parseReportBreakdownQuery(value: unknown): string {
  const candidate = Array.isArray(value) ? value[0] : value
  return typeof candidate === "string" ? candidate.trim().slice(0, 100) : ""
}

export async function getReportsOverviewData(
  where: Prisma.AssetWhereInput,
  input: ReportsOverviewInput,
  db: ReportsOverviewDb,
): Promise<ReportsOverviewData> {
  const [byStatus, byCategory, byCompany, byBranch, byDepartment, byOwnership, purchase, closingStatuses, previewAssets] = await Promise.all([
    db.asset.groupBy({ by: ["statusId"], where, _count: { _all: true } }) as Promise<CountRow<"statusId">[]>,
    db.asset.groupBy({ by: ["categoryId"], where, _count: { _all: true } }) as Promise<CountRow<"categoryId">[]>,
    db.asset.groupBy({ by: ["companyId"], where, _count: { _all: true } }) as Promise<CountRow<"companyId">[]>,
    db.asset.groupBy({ by: ["branchId"], where, _count: { _all: true } }) as Promise<CountRow<"branchId">[]>,
    // Nulls included (spec §4.4): the assets with no department are a group of their own, so the table adds up.
    db.asset.groupBy({ by: ["departmentId"], where, _count: { _all: true } }) as Promise<CountRow<"departmentId">[]>,
    db.asset.groupBy({ by: ["ownershipType"], where, _count: { _all: true } }) as Promise<CountRow<"ownershipType">[]>,
    db.asset.aggregate({ where, _sum: { purchasePrice: true } }) as Promise<{ _sum: { purchasePrice: unknown } }>,
    db.assetStatus.findMany({
      where: { name: { in: [PENDING_DISPOSAL_STATUS_NAME, DISPOSED_STATUS_NAME, RETIRED_STATUS_NAME] } },
      select: { id: true, name: true },
    }) as Promise<Array<{ id: string; name: string }>>,
    db.asset.findMany({
      where,
      take: PREVIEW_ROWS,
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        assetTag: true,
        name: true,
        ownershipType: true,
        category: { select: { code: true, name: true } },
        branch: { select: { code: true, name: true } },
        department: { select: { code: true, name: true } },
        custodian: { select: { code: true, fullNameTh: true } },
        status: { select: { name: true, nameTh: true } },
      },
    }) as Promise<PreviewAsset[]>,
  ])

  const ids = <K extends string>(rows: CountRow<K>[], key: K) =>
    rows.map((row): string | null => row[key]).filter((id): id is string => Boolean(id))

  const [statuses, categories, companies, branches, departments] = await Promise.all([
    db.assetStatus.findMany({ where: { id: { in: ids(byStatus, "statusId") } }, select: { id: true, name: true, nameTh: true } }) as Promise<Array<{ id: string; name: string; nameTh: string }>>,
    db.assetCategory.findMany({ where: { id: { in: ids(byCategory, "categoryId") } }, select: { id: true, code: true, name: true } }) as Promise<NamedRecord[]>,
    db.company.findMany({ where: { id: { in: ids(byCompany, "companyId") } }, select: { id: true, code: true, nameTh: true } }) as Promise<Array<{ id: string; code: string; nameTh: string }>>,
    db.branch.findMany({ where: { id: { in: ids(byBranch, "branchId") } }, select: { id: true, code: true, name: true, company: { select: { code: true } } } }) as Promise<Array<{ id: string; code: string; name: string; company: { code: string } }>>,
    db.department.findMany({ where: { id: { in: ids(byDepartment, "departmentId") } }, select: { id: true, code: true, name: true } }) as Promise<NamedRecord[]>,
  ])

  const statusMap = new Map(statuses.map((status) => [status.id, status]))
  const categoryMap = new Map(categories.map((category) => [category.id, category]))
  const companyMap = new Map(companies.map((company) => [company.id, company]))
  const branchMap = new Map(branches.map((branch) => [branch.id, branch]))
  const departmentMap = new Map(departments.map((department) => [department.id, department]))

  const groups: Record<BreakdownDimension, BreakdownGroup[]> = {
    status: byStatus.map((row) => ({ key: row.statusId, name: statusMap.get(row.statusId ?? "")?.nameTh ?? String(row.statusId), code: null, count: row._count._all })),
    category: byCategory.map((row) => {
      const category = categoryMap.get(row.categoryId ?? "")
      return { key: row.categoryId, name: category?.name ?? String(row.categoryId), code: category?.code ?? null, count: row._count._all }
    }),
    company: byCompany.map((row) => {
      const company = companyMap.get(row.companyId ?? "")
      return { key: row.companyId, name: company?.nameTh ?? String(row.companyId), code: company?.code ?? null, count: row._count._all }
    }),
    // A branch reads its name with "company code · branch code" under it (spec §4.2).
    branch: byBranch.map((row) => {
      const branch = branchMap.get(row.branchId ?? "")
      return { key: row.branchId, name: branch?.name ?? String(row.branchId), code: branch ? `${branch.company.code} · ${branch.code}` : null, count: row._count._all }
    }),
    department: byDepartment.map((row) => {
      if (row.departmentId === null) return { key: null, name: input.labels.unassignedDepartment, code: null, count: row._count._all }
      const department = departmentMap.get(row.departmentId)
      return { key: row.departmentId, name: department?.name ?? row.departmentId, code: department?.code ?? null, count: row._count._all }
    }),
    ownership: mergeOwnershipGroups(byOwnership, input.labels.ownership),
  }

  const total = byStatus.reduce((sum, row) => sum + row._count._all, 0)
  const tables = Object.fromEntries(
    reportBreakdownDimensions.map((dimension) => [dimension, buildBreakdownTable(dimension, groups[dimension], total)]),
  ) as Record<BreakdownDimension, BreakdownTable>

  const statusIdByName = new Map(closingStatuses.map((status) => [status.name, status.id]))
  const countOf = (name: string) =>
    byStatus.reduce((sum, row) => (statusMap.get(row.statusId ?? "")?.name === name ? sum + row._count._all : sum), 0)
  const pendingDisposal = countOf(PENDING_DISPOSAL_STATUS_NAME)
  const disposed = countOf(DISPOSED_STATUS_NAME)
  const retired = countOf(RETIRED_STATUS_NAME)
  const closingNames = new Set([PENDING_DISPOSAL_STATUS_NAME, DISPOSED_STATUS_NAME, RETIRED_STATUS_NAME])
  const activeGroups = sortBreakdownGroups(groups.status.filter((group) => !closingNames.has(statusMap.get(group.key ?? "")?.name ?? "")))

  const full = input.breakdown
    ? {
        dimension: input.breakdown,
        groups: (() => {
          const matching = filterBreakdownGroups(groups[input.breakdown], input.bq)
          // Named groups by count, the unassigned group last.
          return [...sortBreakdownGroups(matching.filter((group) => group.key !== null)), ...matching.filter((group) => group.key === null)]
        })(),
      }
    : null

  return {
    strip: {
      total,
      active: total - pendingDisposal - disposed - retired,
      activeStatusCount: activeGroups.length,
      activeExamples: activeGroups.slice(0, ACTIVE_EXAMPLES_MAX).map((group) => group.name),
      pendingDisposal,
      writtenOff: disposed + retired,
      retired,
      purchaseTotal: purchase._sum.purchasePrice == null ? 0 : Number(purchase._sum.purchasePrice),
      statusIds: {
        pendingDisposal: statusIdByName.get(PENDING_DISPOSAL_STATUS_NAME) ?? null,
        disposed: statusIdByName.get(DISPOSED_STATUS_NAME) ?? null,
        retired: statusIdByName.get(RETIRED_STATUS_NAME) ?? null,
      },
    },
    tables,
    full,
    preview: previewAssets.map((asset) => ({
      id: asset.id,
      assetTag: asset.assetTag,
      name: asset.name,
      category: asset.category.name,
      branch: asset.branch.name,
      department: asset.department?.name ?? null,
      custodian: asset.custodian?.fullNameTh ?? null,
      ownership: input.labels.ownership(normalizeAssetOwnershipType(asset.ownershipType)),
      statusName: asset.status.name,
      statusLabel: asset.status.nameTh,
    })),
  }
}

type PreviewAsset = {
  id: string
  assetTag: string
  name: string
  ownershipType: string | null
  category: { code: string; name: string }
  branch: { code: string; name: string }
  department: { code: string; name: string } | null
  custodian: { code: string; fullNameTh: string } | null
  status: { name: string; nameTh: string }
}

// Old rows may hold an ownership type the app no longer knows; they count as the default type, as the register shows them.
function mergeOwnershipGroups(rows: CountRow<"ownershipType">[], label: (type: string) => string): BreakdownGroup[] {
  const counts = new Map<string, number>()
  for (const row of rows) {
    const type = normalizeAssetOwnershipType(row.ownershipType)
    counts.set(type, (counts.get(type) ?? 0) + row._count._all)
  }
  return [...counts].map(([type, count]) => ({ key: type, name: label(type), code: null, count }))
}
