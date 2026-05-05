import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { requireAuth, requirePermission } from "@/lib/auth-utils"
import { logAudit } from "@/lib/audit-log"
import { errorResponse } from "@/lib/api-response"
import { adminRoleSchema } from "@/lib/validations/admin-role"

export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth()
    requirePermission(user, "role", "create")

    const input = adminRoleSchema.parse(await request.json())
    const permissionIds = Array.from(new Set(input.permissionIds))
    const existing = await prisma.role.findUnique({ where: { name: input.name }, select: { id: true } })
    if (existing) return NextResponse.json({ error: "Role name already exists" }, { status: 409 })

    const existingPermissions = await prisma.permission.findMany({
      where: { id: { in: permissionIds } },
      select: { id: true },
    })
    if (existingPermissions.length !== permissionIds.length) {
      return NextResponse.json({ error: "Invalid permission selection" }, { status: 400 })
    }

    const role = await prisma.$transaction(async (tx) => {
      const record = await tx.role.create({
        data: {
          name: input.name,
          displayName: input.displayName,
          displayNameTh: input.displayNameTh,
          description: input.description,
          isActive: input.isActive,
          isSystem: false,
        },
      })

      if (permissionIds.length > 0) {
        await tx.rolePermission.createMany({
          data: permissionIds.map((permissionId) => ({ roleId: record.id, permissionId })),
        })
      }

      return record
    })

    await logAudit({
      userId: user.id,
      action: "create",
      module: "role",
      recordId: role.id,
      newValue: { ...input, permissionIds },
    })

    return NextResponse.json(role, { status: 201 })
  } catch (error) {
    return errorResponse(error, 400)
  }
}
