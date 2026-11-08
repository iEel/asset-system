import { prisma } from "@/lib/db"
import {
  filterRoles,
  inactiveRolesWithUsers,
  roleListCounts,
  type RoleListFilters,
  type RoleListItem,
} from "@/lib/admin-roles-list"

// Page group 11 plan 3 task 3 (spec §6, board US-Roles): the /admin/roles queries. The rules are in admin-roles-list.ts.
// Every role loads once with its user count and permission keys; the list filters and pages in memory (roles number in
// the low thousands at most, and the chips count every role).

export type RoleListCounts = ReturnType<typeof roleListCounts>

export type RolesPageData = {
  // The current page of the filtered list.
  items: RoleListItem[]
  // The filtered list's size.
  total: number
  // Follow the search only.
  counts: RoleListCounts
  // Global: inactive roles that still have users, in list order.
  inactiveWithUsers: RoleListItem[]
  // Every permission the system has (25 modules × 6 actions).
  permissionTotal: number
  // Only on the matrix tab: every role in list order, for the module × action table.
  matrixRoles?: RoleListItem[]
}

export async function loadRolesPageData(filters: RoleListFilters): Promise<RolesPageData> {
  const [rows, permissionTotal] = await Promise.all([
    prisma.role.findMany({
      select: {
        id: true,
        name: true,
        displayName: true,
        displayNameTh: true,
        description: true,
        isSystem: true,
        isActive: true,
        _count: { select: { userRoles: true } },
        rolePermissions: {
          select: { permission: { select: { module: true, action: true } } },
          orderBy: [{ permission: { module: "asc" } }, { permission: { action: "asc" } }],
        },
      },
      // System roles first, then by key (spec §6, §9).
      orderBy: [{ isSystem: "desc" }, { name: "asc" }],
    }),
    prisma.permission.count(),
  ])

  const roles: RoleListItem[] = rows.map((role) => ({
    id: role.id,
    name: role.name,
    label: role.displayNameTh || role.displayName,
    displayName: role.displayName,
    description: role.description,
    isSystem: role.isSystem,
    isActive: role.isActive,
    userCount: role._count.userRoles,
    permissionKeys: role.rolePermissions.map(({ permission }) => `${permission.module}:${permission.action}`),
  }))

  const filtered = filterRoles(roles, filters)
  const start = (filters.page - 1) * filters.pageSize

  return {
    items: filtered.slice(start, start + filters.pageSize),
    total: filtered.length,
    counts: roleListCounts(roles, filters.search),
    inactiveWithUsers: inactiveRolesWithUsers(roles),
    permissionTotal,
    ...(filters.view === "matrix" ? { matrixRoles: roles } : {}),
  }
}
