import { prisma } from "@/lib/db"

export const userAccessInclude = {
  userRoles: {
    select: {
      roleId: true,
      role: {
        select: {
          name: true,
          rolePermissions: { select: { permission: { select: { module: true, action: true } } } },
        },
      },
    },
  },
} as const

type RolePermissionRows = Array<{ permission: { module: string; action: string } }>

function toPermissionKeys(rolePermissions: RolePermissionRows) {
  return rolePermissions.map(({ permission }) => `${permission.module}:${permission.action}`)
}

export async function loadGrantableRoles(roleIds: string[]) {
  const roles = await prisma.role.findMany({
    where: { id: { in: Array.from(new Set(roleIds)) } },
    select: {
      id: true,
      name: true,
      isActive: true,
      rolePermissions: { select: { permission: { select: { module: true, action: true } } } },
    },
  })

  return roles.map((role) => ({
    id: role.id,
    name: role.name,
    isActive: role.isActive,
    permissionKeys: toPermissionKeys(role.rolePermissions),
  }))
}

export function toExistingUserAccess(user: {
  id: string
  isActive: boolean
  userRoles: Array<{ role: { name: string; rolePermissions: RolePermissionRows } }>
}) {
  return {
    id: user.id,
    isActive: user.isActive,
    roleNames: user.userRoles.map(({ role }) => role.name),
    permissionKeys: user.userRoles.flatMap(({ role }) => toPermissionKeys(role.rolePermissions)),
  }
}

export function countOtherActiveSystemAdmins(excludeUserId: string | null) {
  return prisma.user.count({
    where: {
      ...(excludeUserId ? { id: { not: excludeUserId } } : {}),
      isActive: true,
      userRoles: { some: { role: { name: "system_admin", isActive: true } } },
    },
  })
}

export function accessChangeErrorStatus(message: string) {
  if (message.startsWith("Forbidden")) return 403
  if (message.startsWith("Cannot remove or deactivate")) return 409
  return 400
}
