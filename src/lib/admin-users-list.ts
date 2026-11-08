import type { Prisma } from "@prisma/client"
import { buildMasterDataQueryString, type MasterDataListState } from "./master-data-query.ts"

// Page group 11 plan 1 (spec §4.1–4.2): the /admin/users list rules. Pure, so tests and the page both load it.

export const USER_STATUS_FILTERS = ["all", "active", "inactive", "never", "defaultOnly", "review"] as const
export type UserStatusFilter = (typeof USER_STATUS_FILTERS)[number]
export type UserListFilters = { status: UserStatusFilter; roleId: string | null }

function firstValue(value: string | string[] | undefined) {
  const raw = Array.isArray(value) ? value[0] : value
  return String(raw ?? "").trim()
}

export function parseUserListFilters(input: { status?: string | string[]; role?: string | string[] }): UserListFilters {
  const status = firstValue(input.status)
  const role = firstValue(input.role)
  return {
    status: USER_STATUS_FILTERS.includes(status as UserStatusFilter) ? (status as UserStatusFilter) : "all",
    roleId: role || null,
  }
}

// Drops a roleId not in knownRoleIds, and a defaultOnly status when defaultRoleId is null.
export function resolveUserListFilters(
  filters: UserListFilters,
  knownRoleIds: ReadonlySet<string>,
  defaultRoleId: string | null
): UserListFilters {
  return {
    status: filters.status === "defaultOnly" && defaultRoleId === null ? "all" : filters.status,
    roleId: filters.roleId !== null && knownRoleIds.has(filters.roleId) ? filters.roleId : null,
  }
}

// An employee has left when the record is inactive or marked resigned (a suspended employee has not).
export const EMPLOYEE_LEFT_WHERE: Prisma.EmployeeWhereInput = {
  OR: [{ isActive: false }, { employmentStatus: "resigned" }],
}

export function employeeHasLeft(employee: { isActive: boolean; employmentStatus: string } | null): boolean {
  if (!employee) return false
  return !employee.isActive || employee.employmentStatus === "resigned"
}

export function userStatusWhere(status: UserStatusFilter, defaultRoleId: string | null): Prisma.UserWhereInput {
  switch (status) {
    case "active":
      return { isActive: true }
    case "inactive":
      return { isActive: false }
    case "never":
      return { lastLoginAt: null }
    case "defaultOnly":
      // `every` alone also matches users with no roles, so `some: {}` requires at least one.
      if (defaultRoleId === null) return {}
      return { isActive: true, userRoles: { some: {}, every: { roleId: defaultRoleId } } }
    case "review":
      return { isActive: true, employee: EMPLOYEE_LEFT_WHERE }
    default:
      return {}
  }
}

export function userRoleWhere(roleId: string | null): Prisma.UserWhereInput {
  return roleId ? { userRoles: { some: { roleId } } } : {}
}

export function splitRoleChips<T>(roles: readonly T[], visible = 2): { shown: T[]; rest: T[] } {
  return { shown: roles.slice(0, visible), rest: roles.slice(visible) }
}

// Keeps search, sort, direction and pageSize from MasterDataListState, and adds status (omitted when "all") and role.
export function buildUserListQuery(
  state: MasterDataListState<string>,
  filters: UserListFilters,
  next: Partial<MasterDataListState<string> & UserListFilters> = {}
): string {
  const { status = filters.status, roleId = filters.roleId, ...listNext } = next
  const params = new URLSearchParams(buildMasterDataQueryString(state, listNext))
  if (status !== "all") params.set("status", status)
  if (roleId) params.set("role", roleId)
  return params.toString()
}
