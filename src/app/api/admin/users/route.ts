import { NextRequest, NextResponse } from "next/server"
import bcrypt from "bcryptjs"
import { prisma } from "@/lib/db"
import { requireAuth, requirePermission } from "@/lib/auth-utils"
import { logAudit } from "@/lib/audit-log"
import { errorResponse } from "@/lib/api-response"
import { adminUserSchema } from "@/lib/validations/admin-user"
import { adminUserSecretOmit, toAdminUserResponse } from "@/lib/admin-user-response"
import { getUserAccessChangeError } from "@/lib/admin-access-policy"
import { accessChangeErrorStatus, loadGrantableRoles } from "@/lib/admin-access-data"

export async function GET() {
  try {
    const user = await requireAuth()
    requirePermission(user, "user", "view")

    const users = await prisma.user.findMany({
      omit: adminUserSecretOmit,
      include: {
        employee: { select: { code: true, fullNameTh: true } },
        userRoles: {
          include: { role: { select: { name: true, displayName: true, displayNameTh: true } } },
          orderBy: { role: { name: "asc" } },
        },
      },
      orderBy: { username: "asc" },
    })

    return NextResponse.json({ data: users.map(toAdminUserResponse) })
  } catch (error) {
    return errorResponse(error)
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth()
    requirePermission(user, "user", "create")

    const input = adminUserSchema.parse(await request.json())
    if (!input.password) {
      return NextResponse.json({ error: "Password is required" }, { status: 400 })
    }
    const accessError = getUserAccessChangeError({
      actor: user,
      target: null,
      requestedRoleIds: input.roleIds,
      requestedRoles: await loadGrantableRoles(input.roleIds),
      nextIsActive: input.isActive,
      otherActiveSystemAdminCount: 0,
    })
    if (accessError) {
      return NextResponse.json({ error: accessError }, { status: accessChangeErrorStatus(accessError) })
    }
    await assertUniqueUsername(input.username)
    await assertEmployeeAvailable(input.employeeId)

    const passwordHash = await bcrypt.hash(input.password, 12)
    const created = await prisma.$transaction(async (tx) => {
      const record = await tx.user.create({
        data: {
          username: input.username,
          passwordHash,
          displayName: input.displayName,
          email: input.email,
          employeeId: input.employeeId,
          isActive: input.isActive,
        },
        omit: adminUserSecretOmit,
      })

      await tx.userRole.createMany({
        data: input.roleIds.map((roleId) => ({ userId: record.id, roleId })),
      })

      return record
    })

    await logAudit({
      userId: user.id,
      action: "create",
      module: "user",
      recordId: created.id,
      newValue: { ...input, password: undefined },
    })

    return NextResponse.json(toAdminUserResponse(created), { status: 201 })
  } catch (error) {
    return errorResponse(error, 400)
  }
}

async function assertUniqueUsername(username: string) {
  const existing = await prisma.user.findUnique({
    where: { username },
    select: { id: true },
  })
  if (existing) throw new Error("Username already exists")
}

async function assertEmployeeAvailable(employeeId?: string | null) {
  if (!employeeId) return
  const existing = await prisma.user.findFirst({
    where: { employeeId },
    select: { id: true },
  })
  if (existing) throw new Error("Employee already has a user account")
}
