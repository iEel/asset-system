import { parseListPage } from "./list-pagination.ts"
import { HIGH_RISK_ACTIONS } from "./permission-groups.ts"

// Page group 11 plan 3 task 1: the /admin/roles list rules (view tab, type and check chips, search, paging).
// Pure, so tests and the page both load it.

export const ROLE_LIST_VIEWS = ["roles", "matrix"] as const
export const ROLE_TYPE_FILTERS = ["all", "system", "custom"] as const
export const ROLE_CHECK_FILTERS = ["highRisk", "noUsers", "inactive"] as const

export type RoleListView = (typeof ROLE_LIST_VIEWS)[number]
export type RoleTypeFilter = (typeof ROLE_TYPE_FILTERS)[number]
export type RoleCheckFilter = (typeof ROLE_CHECK_FILTERS)[number]
export type RoleListFilters = {
  view: RoleListView
  type: RoleTypeFilter
  check: RoleCheckFilter | null
  search: string
  page: number
  pageSize: number
}

export type RoleListItem = {
  id: string
  // the role key
  name: string
  // displayNameTh || displayName
  label: string
  description: string | null
  isSystem: boolean
  isActive: boolean
  userCount: number
  permissionKeys: string[]
}

const DEFAULT_FILTERS: RoleListFilters = { view: "roles", type: "all", check: null, search: "", page: 1, pageSize: 25 }

function firstValue(value: string | string[] | undefined) {
  const raw = Array.isArray(value) ? value[0] : value
  return String(raw ?? "").trim()
}

function pick<T extends string>(allowed: readonly T[], value: string): T | null {
  return allowed.includes(value as T) ? (value as T) : null
}

export function parseRoleListFilters(input: Record<string, string | string[] | undefined>): RoleListFilters {
  const { page, pageSize } = parseListPage({ page: firstValue(input.page), pageSize: firstValue(input.pageSize) })
  return {
    view: pick(ROLE_LIST_VIEWS, firstValue(input.view)) ?? DEFAULT_FILTERS.view,
    type: pick(ROLE_TYPE_FILTERS, firstValue(input.type)) ?? DEFAULT_FILTERS.type,
    check: pick(ROLE_CHECK_FILTERS, firstValue(input.check)),
    search: firstValue(input.search),
    page,
    pageSize,
  }
}

/** A role is high risk when it holds delete, approve or export on any module. */
export function isHighRiskRole(permissionKeys: readonly string[]): boolean {
  return permissionKeys.some((key) => HIGH_RISK_ACTIONS.includes(key.slice(key.indexOf(":") + 1)))
}

function matchesSearch(role: RoleListItem, search: string): boolean {
  const needle = search.trim().toLocaleLowerCase()
  if (!needle) return true
  return [role.name, role.label, role.description ?? ""].some((text) => text.toLocaleLowerCase().includes(needle))
}

function matchesType(role: RoleListItem, type: RoleTypeFilter): boolean {
  if (type === "system") return role.isSystem
  if (type === "custom") return !role.isSystem
  return true
}

function matchesCheck(role: RoleListItem, check: RoleCheckFilter | null): boolean {
  switch (check) {
    case "highRisk":
      return isHighRiskRole(role.permissionKeys)
    case "noUsers":
      return role.userCount === 0
    case "inactive":
      return !role.isActive
    default:
      return true
  }
}

/** type AND check AND search. */
export function filterRoles(roles: readonly RoleListItem[], filters: RoleListFilters): RoleListItem[] {
  return roles.filter(
    (role) => matchesType(role, filters.type) && matchesCheck(role, filters.check) && matchesSearch(role, filters.search)
  )
}

/** Chip counts after the search only (not the type or check chip). */
export function roleListCounts(
  roles: readonly RoleListItem[],
  search: string
): { all: number; system: number; custom: number; highRisk: number; noUsers: number; inactive: number } {
  const counts = { all: 0, system: 0, custom: 0, highRisk: 0, noUsers: 0, inactive: 0 }
  for (const role of roles) {
    if (!matchesSearch(role, search)) continue
    counts.all += 1
    if (role.isSystem) counts.system += 1
    else counts.custom += 1
    if (isHighRiskRole(role.permissionKeys)) counts.highRisk += 1
    if (role.userCount === 0) counts.noUsers += 1
    if (!role.isActive) counts.inactive += 1
  }
  return counts
}

export function inactiveRolesWithUsers(roles: readonly RoleListItem[]): RoleListItem[] {
  return roles.filter((role) => !role.isActive && role.userCount > 0)
}

/** The query string without defaults (view roles, type all, no check, page 1, pageSize 25, empty search). */
export function buildRoleListQuery(filters: RoleListFilters, next: Partial<RoleListFilters>): string {
  const merged = { ...filters, ...next }
  const params = new URLSearchParams()
  if (merged.view !== DEFAULT_FILTERS.view) params.set("view", merged.view)
  if (merged.type !== DEFAULT_FILTERS.type) params.set("type", merged.type)
  if (merged.check) params.set("check", merged.check)
  const search = merged.search.trim()
  if (search) params.set("search", search)
  if (merged.page !== DEFAULT_FILTERS.page) params.set("page", String(merged.page))
  if (merged.pageSize !== DEFAULT_FILTERS.pageSize) params.set("pageSize", String(merged.pageSize))
  return params.toString()
}
