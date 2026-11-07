// The reports page's group tables (group 10 spec §4.2): sorted rows capped at eight, the rest as one "others" row, the
// unassigned row apart, percents of the total and links to the register with the same filters.
// Client-safe and pure: relative imports only, no database, so node --test imports it.
import { buildExactAssetRegisterHref } from "./asset-register-view-memory.ts"

export type BreakdownDimension = "status" | "category" | "company" | "branch" | "department" | "ownership"

// key null = the assets with no value for this dimension (only department can be null today).
export type BreakdownGroup = { key: string | null; name: string; code: string | null; count: number }

export type BreakdownRow = { key: string; name: string; code: string | null; count: number; percent: number }

export type BreakdownTable = {
  dimension: BreakdownDimension
  total: number
  // Named groups only, the unassigned group is not one.
  groupCount: number
  rows: BreakdownRow[]
  // names only when groups <= 3, so a short tail can be read inline.
  others: { groups: number; count: number; percent: number; names: string[] } | null
  unassigned: { count: number; percent: number } | null
}

const OTHERS_NAMES_MAX = 3

const dimensionParam: Record<BreakdownDimension, string> = {
  status: "statusId",
  category: "categoryId",
  company: "companyId",
  branch: "branchId",
  department: "departmentId",
  ownership: "ownershipType",
}

export function breakdownPercent(count: number, total: number): number {
  if (total <= 0) return 0
  return Math.round((count / total) * 1000) / 10
}

export function sortBreakdownGroups<T extends BreakdownGroup>(groups: readonly T[]): T[] {
  return [...groups].sort((a, b) => b.count - a.count || a.name.localeCompare(b.name, "th"))
}

export function buildBreakdownTable(
  dimension: BreakdownDimension,
  groups: readonly BreakdownGroup[],
  total: number,
  limit = 8,
): BreakdownTable {
  const named = sortBreakdownGroups(groups.filter((group): group is BreakdownGroup & { key: string } => group.key !== null))
  const unassignedCount = groups.reduce((sum, group) => (group.key === null ? sum + group.count : sum), 0)

  const rows = named.slice(0, limit).map((group) => ({
    key: group.key,
    name: group.name,
    code: group.code,
    count: group.count,
    percent: breakdownPercent(group.count, total),
  }))

  const rest = named.slice(limit)
  const othersCount = rest.reduce((sum, group) => sum + group.count, 0)
  const others =
    rest.length > 0
      ? {
          groups: rest.length,
          count: othersCount,
          percent: breakdownPercent(othersCount, total),
          names: rest.length <= OTHERS_NAMES_MAX ? rest.map((group) => group.name) : [],
        }
      : null

  const unassigned = unassignedCount > 0 ? { count: unassignedCount, percent: breakdownPercent(unassignedCount, total) } : null

  return { dimension, total, groupCount: named.length, rows, others, unassigned }
}

// The register with the report's filters plus this group's; the unassigned department uses the register's
// existing "no department" filter (dataQuality=department).
export function breakdownRowHref(
  locale: string,
  dimension: BreakdownDimension,
  key: string | null,
  baseQuery: URLSearchParams,
): string {
  const params: Record<string, string> = {}
  for (const [name, value] of baseQuery) {
    if (value.trim()) params[name] = value
  }
  if (key === null) {
    if (dimension === "department") params.dataQuality = "department"
  } else {
    params[dimensionParam[dimension]] = key
  }
  return buildExactAssetRegisterHref(locale, params)
}

export function filterBreakdownGroups<T extends BreakdownGroup>(groups: readonly T[], query: string): T[] {
  const needle = query.trim().toLocaleLowerCase("th")
  if (!needle) return [...groups]
  return groups.filter(
    (group) =>
      group.name.toLocaleLowerCase("th").includes(needle) || (group.code?.toLocaleLowerCase("th").includes(needle) ?? false),
  )
}
