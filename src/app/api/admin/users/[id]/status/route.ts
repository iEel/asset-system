import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { requireAuth, requirePermission } from "@/lib/auth-utils"
import { logAudit } from "@/lib/audit-log"
import { errorResponse } from "@/lib/api-response"
import { adminUserStatusSchema } from "@/lib/validations/admin-user"
import { invalidateUserAccess } from "@/lib/session-access-cache"
import { adminUserSecretOmit, toAdminUserResponse } from "@/lib/admin-user-response"
import { getUserAccessChangeError } from "@/lib/admin-access-policy"
import {
  accessChangeErrorStatus,
  countOtherActiveSystemAdmins,
  loadGrantableRoles,
  toExistingUserAccess,
  userAccessInclude,
} from "@/lib/admin-access-data"

type AdminUserStatusRouteContext = {
  params: Promise<{ id: string }>
}

// Close or reopen an account without touching anything else on it (group 11 plan 2). The access rules are the full
// form's, with the stored roles kept as they are, so the last active system administrator still cannot be closed.
export async function PATCH(request: NextRequest, context: AdminUserStatusRouteContext) {
  try {
    const sessionUser = await requireAuth()
    requirePermission(sessionUser, "user", "edit")

    const { id } = await context.params
    const input = adminUserStatusSchema.parse(await request.json())
    const existing = await prisma.user.findFirst({
      where: { id },
      omit: adminUserSecretOmit,
      include: userAccessInclude,
    })
    if (!existing) return NextResponse.json({ error: "User not found" }, { status: 404 })
    if (existing.id === sessionUser.id) {
      return NextResponse.json({ error: "Cannot change the status of your own account" }, { status: 400 })
    }

    const storedRoleIds = existing.userRoles.map((userRole) => userRole.roleId)
    const accessError = getUserAccessChangeError({
      actor: sessionUser,
      target: toExistingUserAccess(existing),
      requestedRoleIds: storedRoleIds,
      requestedRoles: await loadGrantableRoles(storedRoleIds),
      currentRoleIds: storedRoleIds,
      nextIsActive: input.isActive,
      otherActiveSystemAdminCount: await countOtherActiveSystemAdmins(id),
    })
    if (accessError) {
      return NextResponse.json({ error: accessError }, { status: accessChangeErrorStatus(accessError) })
    }

    const updated = await prisma.user.update({
      where: { id },
      data: { isActive: input.isActive },
      omit: adminUserSecretOmit,
    })
    invalidateUserAccess(id)

    await logAudit({
      userId: sessionUser.id,
      action: "update",
      module: "user",
      recordId: id,
      oldValue: { isActive: existing.isActive },
      newValue: { isActive: input.isActive, note: input.note ?? null },
    })

    return NextResponse.json(toAdminUserResponse(updated))
  } catch (error) {
    return errorResponse(error, 400)
  }
}
