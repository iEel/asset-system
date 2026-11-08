import type { Prisma } from "@prisma/client"
import { prisma } from "@/lib/db"
import { getLdapConfig } from "@/lib/ldap-auth"
import type { MasterDataListState } from "@/lib/master-data-query"
import {
  USER_STATUS_FILTERS,
  employeeHasLeft,
  resolveUserListFilters,
  userRoleWhere,
  userStatusWhere,
  type UserListFilters,
  type UserStatusFilter,
} from "@/lib/admin-users-list"

// Page group 11 plan 1 (spec §4, board US-Users): the /admin/users list's queries. The rules are in admin-users-list.ts.

// Every sort stays valid in the URL (spec §9); only ผู้ใช้ and เข้าสู่ระบบล่าสุด have header buttons.
export const userSorts = ["createdAt", "username", "displayName", "email", "lastLoginAt"] as const
export type UserSort = (typeof userSorts)[number]

export type UserListRow = {
  id: string
  username: string
  displayName: string
  email: string | null
  isActive: boolean
  lastLoginAt: Date | null
  isSelf: boolean
  employee: {
    id: string
    code: string
    fullNameTh: string
    departmentName: string
    branchName: string
    hasLeft: boolean
    heldAssetCount: number
  } | null
  // label = displayNameTh || displayName, ordered by role name
  roles: { id: string; label: string }[]
}

// defaultOnly is absent when the default role does not exist (its chip is hidden).
export type UserStatusCounts = Record<Exclude<UserStatusFilter, "defaultOnly">, number> & { defaultOnly?: number }

export type UsersPageData = {
  rows: UserListRow[]
  total: number
  grandTotal: number
  // Follow the search and the role filter.
  statusCounts: UserStatusCounts
  // Global: no search, no role filter.
  reviewTotal: number
  // Every role, active and inactive; label "ชื่อไทย · key".
  roleOptions: { value: string; label: string }[]
  defaultRoleId: string | null
  // Already resolved.
  filters: UserListFilters
}

// The search matches login name, display name, email and role names, as before group 11 (spec §4.2, §9).
function userSearchWhere(searchText: string): Prisma.UserWhereInput {
  if (!searchText) return {}
  return {
    OR: [
      { username: { contains: searchText } },
      { displayName: { contains: searchText } },
      { email: { contains: searchText } },
      { userRoles: { some: { role: { displayName: { contains: searchText } } } } },
      { userRoles: { some: { role: { displayNameTh: { contains: searchText } } } } },
      { userRoles: { some: { role: { name: { contains: searchText } } } } },
    ],
  }
}

export async function loadUsersPageData(input: {
  listState: MasterDataListState<UserSort>
  filters: UserListFilters
  viewerId: string
}): Promise<UsersPageData> {
  const { listState, viewerId } = input
  const [roles, defaultRoleSetting] = await Promise.all([
    prisma.role.findMany({
      select: { id: true, name: true, displayName: true, displayNameTh: true },
      orderBy: { name: "asc" },
    }),
    prisma.systemSetting.findUnique({ where: { key: "ldap_default_role" }, select: { value: true } }),
  ])
  // The same fallback as LDAP auto-provision: the setting, then LDAP_DEFAULT_ROLE, then asset_user.
  const defaultRoleName = getLdapConfig({ ldap_default_role: defaultRoleSetting?.value }).defaultRole
  const defaultRoleId = roles.find((role) => role.name === defaultRoleName)?.id ?? null
  const filters = resolveUserListFilters(input.filters, new Set(roles.map((role) => role.id)), defaultRoleId)

  const searchWhere = userSearchWhere(listState.search)
  const roleWhere = userRoleWhere(filters.roleId)
  const where: Prisma.UserWhereInput = { AND: [searchWhere, roleWhere, userStatusWhere(filters.status, defaultRoleId)] }
  const countedStatuses = USER_STATUS_FILTERS.filter((status) => status !== "defaultOnly" || defaultRoleId !== null)

  const [users, total, grandTotal, reviewTotal, counts] = await Promise.all([
    prisma.user.findMany({
      where,
      select: {
        id: true,
        username: true,
        displayName: true,
        email: true,
        isActive: true,
        lastLoginAt: true,
        employee: {
          select: {
            id: true,
            code: true,
            fullNameTh: true,
            isActive: true,
            employmentStatus: true,
            department: { select: { name: true } },
            branch: { select: { name: true } },
          },
        },
        userRoles: {
          select: { role: { select: { id: true, displayName: true, displayNameTh: true } } },
          orderBy: { role: { name: "asc" } },
        },
      },
      orderBy: { [listState.sort]: listState.direction },
      skip: (listState.page - 1) * listState.pageSize,
      take: listState.pageSize,
    }),
    prisma.user.count({ where }),
    prisma.user.count(),
    prisma.user.count({ where: userStatusWhere("review", defaultRoleId) }),
    Promise.all(
      countedStatuses.map((status) =>
        prisma.user.count({ where: { AND: [searchWhere, roleWhere, userStatusWhere(status, defaultRoleId)] } })
      )
    ),
  ])

  const statusCounts = Object.fromEntries(countedStatuses.map((status, index) => [status, counts[index]])) as UserStatusCounts

  // One groupBy for the employees on this page. Active assets only, like the register that the link opens.
  const employeeIds = users.flatMap((user) => (user.employee ? [user.employee.id] : []))
  const held =
    employeeIds.length === 0
      ? []
      : await prisma.asset.groupBy({
          by: ["custodianId"],
          where: { custodianId: { in: employeeIds }, isActive: true },
          _count: true,
        })
  const heldByEmployee = new Map(held.map((group) => [group.custodianId, group._count]))

  const rows: UserListRow[] = users.map((user) => ({
    id: user.id,
    username: user.username,
    displayName: user.displayName,
    email: user.email,
    isActive: user.isActive,
    lastLoginAt: user.lastLoginAt,
    isSelf: user.id === viewerId,
    employee: user.employee
      ? {
          id: user.employee.id,
          code: user.employee.code,
          fullNameTh: user.employee.fullNameTh,
          departmentName: user.employee.department.name,
          branchName: user.employee.branch.name,
          hasLeft: employeeHasLeft(user.employee),
          heldAssetCount: heldByEmployee.get(user.employee.id) ?? 0,
        }
      : null,
    roles: user.userRoles.map(({ role }) => ({ id: role.id, label: role.displayNameTh || role.displayName })),
  }))

  return {
    rows,
    total,
    grandTotal,
    statusCounts,
    reviewTotal,
    roleOptions: roles.map((role) => ({ value: role.id, label: `${role.displayNameTh || role.displayName} · ${role.name}` })),
    defaultRoleId,
    filters,
  }
}
