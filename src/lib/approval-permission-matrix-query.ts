import { prisma } from "@/lib/db"

export async function getApprovalPermissionMatrixUsers() {
  const users = await prisma.user.findMany({
    where: { isActive: true },
    select: {
      id: true,
      username: true,
      displayName: true,
      userRoles: {
        select: {
          role: {
            select: {
              name: true,
              displayName: true,
              displayNameTh: true,
              isActive: true,
              rolePermissions: {
                select: {
                  permission: { select: { module: true, action: true } },
                },
              },
            },
          },
        },
      },
    },
    orderBy: { displayName: "asc" },
  })

  return users.map((user) => {
    const activeRoles = user.userRoles.map((userRole) => userRole.role).filter((role) => role.isActive)
    const permissionKeys = new Set(
      activeRoles.flatMap((role) => role.rolePermissions.map((rolePermission) => `${rolePermission.permission.module}:${rolePermission.permission.action}`))
    )

    return {
      id: user.id,
      label: `${user.displayName} (${user.username})`,
      roleKeys: activeRoles.map((role) => role.name),
      roleLabels: activeRoles.map((role) => role.displayNameTh ?? role.displayName),
      permissionKeys: Array.from(permissionKeys),
    }
  })
}
