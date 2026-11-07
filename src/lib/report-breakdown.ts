// The reports page's group tables (group 10 spec §4.2): sorted rows capped at eight, the rest as one "others" row, the
// unassigned row apart, percents of the total and links to the register with the same filters.
// Client-safe and pure: relative imports only, no database, so node --test imports it.
import { buildExactAssetRegisterHref } from "./asset-register-view-memory.ts"
import { formatPercent } from "./display-format.ts"

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

// The share as the tables print it: one decimal ("55.8%"), and "<0.1%" for a group with assets whose share rounds to 0.0,
// so it never reads as empty. "0%" only for a count of 0.
export const BREAKDOWN_PERCENT_BELOW_LABEL = "<0.1%"

export function breakdownPercentLabel(count: number, percent: number): string {
  if (count > 0 && percent === 0) return BREAKDOWN_PERCENT_BELOW_LABEL
  return formatPercent(percent / 100, 1)
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

// The unassigned department row links to the register's "no department" filter (dataQuality=department), but the
// register takes one dataQuality value: under another one (serial, …) the link would drop the report's own filter, so
// the row stays plain text, as the other dimensions' unassigned rows do (group 10 plan 1 final review).
export function breakdownUnassignedLinked(dimension: BreakdownDimension, baseQuery: URLSearchParams): boolean {
  if (dimension !== "department") return false
  const dataQuality = baseQuery.get("dataQuality")?.trim()
  return !dataQuality || dataQuality === "department"
}

// The status strip's "ดูรายการ" links (and "รวมปลดระวาง n"): the register with the report's filters and this status,
// only when the cell counts any asset and the report has no status filter or this same one, so the list never shows
// rows the cell does not count (group 10 plan 1 final review).
export function stripStatusListHref(
  locale: string,
  statusId: string | null,
  count: number,
  baseQuery: URLSearchParams,
): string | undefined {
  if (!statusId || count <= 0) return undefined
  const baseStatus = baseQuery.get("statusId")?.trim()
  if (baseStatus && baseStatus !== statusId) return undefined
  return breakdownRowHref(locale, "status", statusId, baseQuery)
}

export function filterBreakdownGroups<T extends BreakdownGroup>(groups: readonly T[], query: string): T[] {
  const needle = query.trim().toLocaleLowerCase("th")
  if (!needle) return [...groups]
  return groups.filter(
    (group) =>
      group.name.toLocaleLowerCase("th").includes(needle) || (group.code?.toLocaleLowerCase("th").includes(needle) ?? false),
  )
}
