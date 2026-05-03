import { NextRequest, NextResponse } from "next/server"
import bcrypt from "bcryptjs"
import { prisma } from "@/lib/db"
import { requireAuth, requirePermission } from "@/lib/auth-utils"
import { logAudit } from "@/lib/audit-log"
import { errorResponse } from "@/lib/api-response"
import { adminUserSchema } from "@/lib/validations/admin-user"

type AdminUserRouteContext = {
  params: Promise<{ id: string }>
}

export async function PUT(request: NextRequest, context: AdminUserRouteContext) {
  try {
    const sessionUser = await requireAuth()
    requirePermission(sessionUser, "user", "edit")

    const { id } = await context.params
    const input = adminUserSchema.parse(await request.json())
    const existing = await prisma.user.findFirst({
      where: { id },
      include: { userRoles: { select: { roleId: true } } },
    })
    if (!existing) return NextResponse.json({ error: "User not found" }, { status: 404 })

    await assertUniqueUsername(input.username, id)
    await assertEmployeeAvailable(input.employeeId, id)

    const passwordHash = input.password ? await bcrypt.hash(input.password, 12) : undefined
    const updated = await prisma.$transaction(async (tx) => {
      const record = await tx.user.update({
        where: { id },
        data: {
          username: input.username,
          ...(passwordHash ? { passwordHash } : {}),
          displayName: input.displayName,
          email: input.email,
          employeeId: input.employeeId,
          isActive: input.isActive,
        },
      })

      await tx.userRole.deleteMany({ where: { userId: id } })
      await tx.userRole.createMany({
        data: input.roleIds.map((roleId) => ({ userId: id, roleId })),
      })

      return record
    })

    await logAudit({
      userId: sessionUser.id,
      action: "update",
      module: "user",
      recordId: id,
      oldValue: {
        username: existing.username,
        displayName: existing.displayName,
        email: existing.email,
        employeeId: existing.employeeId,
        isActive: existing.isActive,
        roleIds: existing.userRoles.map((role) => role.roleId),
      },
      newValue: { ...input, password: input.password ? "[changed]" : undefined },
    })

    return NextResponse.json(updated)
  } catch (error) {
    return errorResponse(error, 400)
  }
}

async function assertUniqueUsername(username: string, excludeId: string) {
  const existing = await prisma.user.findFirst({
    where: { username, id: { not: excludeId } },
    select: { id: true },
  })
  if (existing) throw new Error("Username already exists")
}

async function assertEmployeeAvailable(employeeId: string | null | undefined, excludeId: string) {
  if (!employeeId) return
  const existing = await prisma.user.findFirst({
    where: { employeeId, id: { not: excludeId } },
    select: { id: true },
  })
  if (existing) throw new Error("Employee already has a user account")
}
