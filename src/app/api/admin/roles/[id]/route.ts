import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { requireAuth, requirePermission } from "@/lib/auth-utils"
import { logAudit } from "@/lib/audit-log"
import { errorResponse } from "@/lib/api-response"
import { adminRolePermissionSchema } from "@/lib/validations/admin-role"

type AdminRoleRouteContext = {
  params: Promise<{ id: string }>
}

export async function PUT(request: NextRequest, context: AdminRoleRouteContext) {
  try {
    const user = await requireAuth()
    requirePermission(user, "role", "edit")

    const { id } = await context.params
    const input = adminRolePermissionSchema.parse(await request.json())
    const permissionIds = Array.from(new Set(input.permissionIds))
    const existing = await prisma.role.findFirst({
      where: { id },
      include: { rolePermissions: { select: { permissionId: true } } },
    })
    if (!existing) return NextResponse.json({ error: "Role not found" }, { status: 404 })

    const existingPermissions = await prisma.permission.findMany({
      where: { id: { in: permissionIds } },
      select: { id: true },
    })
    if (existingPermissions.length !== permissionIds.length) {
      return NextResponse.json({ error: "Invalid permission selection" }, { status: 400 })
    }

    const updated = await prisma.$transaction(async (tx) => {
      await tx.rolePermission.deleteMany({ where: { roleId: id } })
      if (permissionIds.length > 0) {
        await tx.rolePermission.createMany({
          data: permissionIds.map((permissionId) => ({ roleId: id, permissionId })),
        })
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
        permissionIds: existing.rolePermissions.map((permission) => permission.permissionId),
      },
      newValue: {
        role: existing.name,
        permissionIds,
      },
    })

    return NextResponse.json(updated)
  } catch (error) {
    return errorResponse(error, 400)
  }
}
