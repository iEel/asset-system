import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { requireAuth, requirePermission } from "@/lib/auth-utils"
import { logAudit } from "@/lib/audit-log"
import { errorResponse } from "@/lib/api-response"
import { adminRoleSchema } from "@/lib/validations/admin-role"

type AdminRoleRouteContext = {
  params: Promise<{ id: string }>
}

export async function PUT(request: NextRequest, context: AdminRoleRouteContext) {
  try {
    const user = await requireAuth()
    requirePermission(user, "role", "edit")

    const { id } = await context.params
    const input = adminRoleSchema.parse(await request.json())
    const permissionIds = Array.from(new Set(input.permissionIds))
    const existing = await prisma.role.findFirst({
      where: { id },
      include: { rolePermissions: { select: { permissionId: true } } },
    })
    if (!existing) return NextResponse.json({ error: "Role not found" }, { status: 404 })
    const isProtectedSystemAdmin = existing.name === "system_admin"

    const existingPermissions = await prisma.permission.findMany({
      where: { id: { in: permissionIds } },
      select: { id: true },
    })
    if (existingPermissions.length !== permissionIds.length) {
      return NextResponse.json({ error: "Invalid permission selection" }, { status: 400 })
    }
    if (isProtectedSystemAdmin && !sameStringSet(permissionIds, existing.rolePermissions.map((permission) => permission.permissionId))) {
      return NextResponse.json({ error: "System administrator permissions are protected" }, { status: 400 })
    }

    const updated = await prisma.$transaction(async (tx) => {
      await tx.role.update({
        where: { id },
        data: {
          name: existing.isSystem ? existing.name : input.name,
          displayName: input.displayName,
          displayNameTh: input.displayNameTh,
          description: input.description,
          isActive: existing.isSystem ? existing.isActive : input.isActive,
        },
      })

      if (!isProtectedSystemAdmin) {
        await tx.rolePermission.deleteMany({ where: { roleId: id } })
        if (permissionIds.length > 0) {
          await tx.rolePermission.createMany({
            data: permissionIds.map((permissionId) => ({ roleId: id, permissionId })),
          })
        }
      }

      return tx.role.findUnique({
        where: { id },
        include: {
          rolePermissions: {
            include: { permission: { select: { module: true, action: true } } },
          },
        },
      })
    })

    await logAudit({
      userId: user.id,
      action: "update_permissions",
      module: "role",
      recordId: id,
      oldValue: {
        role: existing.name,
        displayName: existing.displayName,
        displayNameTh: existing.displayNameTh,
        description: existing.description,
        isActive: existing.isActive,
        permissionIds: existing.rolePermissions.map((permission) => permission.permissionId),
      },
      newValue: {
        role: existing.isSystem ? existing.name : input.name,
        displayName: input.displayName,
        displayNameTh: input.displayNameTh,
        description: input.description,
        isActive: existing.isSystem ? existing.isActive : input.isActive,
        permissionIds,
      },
    })

    return NextResponse.json(updated)
  } catch (error) {
    return errorResponse(error, 400)
  }
}

function sameStringSet(left: string[], right: string[]) {
  if (left.length !== right.length) return false
  const rightSet = new Set(right)
  return left.every((item) => rightSet.has(item))
}
