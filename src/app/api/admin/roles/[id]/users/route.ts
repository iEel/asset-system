import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { requireAuth, requirePermission } from "@/lib/auth-utils"
import { logAudit } from "@/lib/audit-log"
import { errorResponse } from "@/lib/api-response"
import { roleUsersAddSchema } from "@/lib/validations/admin-role"
import { getUserAccessChangeError } from "@/lib/admin-access-policy"
import { countOtherActiveSystemAdmins, loadGrantableRoles, toExistingUserAccess, userAccessInclude } from "@/lib/admin-access-data"
import { invalidateUserAccess } from "@/lib/session-access-cache"

type RoleUsersRouteContext = {
  params: Promise<{ id: string }>
}

// Adds several users to one role (group 11 plan 3). Each user passes the same access checks as the user form; the
// ones refused are named with the reason, the rest are saved. Someone who already holds the role is listed apart in
// alreadyHeld: nothing is written for them, so they are neither added nor in the role log.
export async function POST(request: NextRequest, context: RoleUsersRouteContext) {
  try {
    const actor = await requireAuth()
    requirePermission(actor, "user", "edit")

    const { id: roleId } = await context.params
    const input = roleUsersAddSchema.parse(await request.json())
    const note = input.note ?? null

    const role = await prisma.role.findFirst({ where: { id: roleId }, select: { id: true, isActive: true } })
    if (!role) return NextResponse.json({ error: "Role not found" }, { status: 404 })
    if (!role.isActive) return NextResponse.json({ error: "Role is inactive" }, { status: 400 })

    const added: string[] = []
    const alreadyHeld: string[] = []
    const refused: { userId: string; reason: string }[] = []

    for (const userId of Array.from(new Set(input.userIds))) {
      const user = await prisma.user.findFirst({
        where: { id: userId },
        select: { id: true, isActive: true, ...userAccessInclude },
      })
      if (!user || !user.isActive) {
        refused.push({ userId, reason: "User not found or inactive" })
        continue
      }

      const storedRoleIds = user.userRoles.map((userRole) => userRole.roleId)
      if (storedRoleIds.includes(roleId)) {
        alreadyHeld.push(userId)
        continue
      }

      const requestedRoleIds = [...storedRoleIds, roleId]
      const accessError = getUserAccessChangeError({
        actor,
        target: toExistingUserAccess(user),
        requestedRoleIds,
        requestedRoles: await loadGrantableRoles(requestedRoleIds),
        currentRoleIds: storedRoleIds,
        nextIsActive: true,
        otherActiveSystemAdminCount: await countOtherActiveSystemAdmins(userId),
      })
      if (accessError) {
        refused.push({ userId, reason: accessError })
        continue
      }

      await prisma.userRole.create({ data: { userId, roleId } })
      await logAudit({
        userId: actor.id,
        action: "update",
        module: "user",
        recordId: userId,
        oldValue: { roleIds: storedRoleIds },
        newValue: { roleIds: requestedRoleIds, note },
      })
      invalidateUserAccess(userId)
      added.push(userId)
    }

    if (added.length > 0) {
      await logAudit({
        userId: actor.id,
        action: "update",
        module: "role",
        recordId: roleId,
        newValue: { addedUserIds: added, note },
      })
    }

    return NextResponse.json({ added, alreadyHeld, refused })
  } catch (error) {
    return errorResponse(error, 400)
  }
}
