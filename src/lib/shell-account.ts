import type { SessionUser } from "@/lib/auth-utils"
import { prisma } from "@/lib/db"
import { getUserRoleLabel, type ShellAccount } from "@/lib/user-display"

// The session holds only role codes, so the dashboard layout reads the role names and the department once here
// (menu B shell, spec §6.2). A failed read must never stop the shell from rendering.
export async function getShellAccount(user: SessionUser, locale: string): Promise<ShellAccount> {
  try {
    const record = await prisma.user.findUnique({
      where: { id: user.id },
      select: {
        userRoles: {
          select: { role: { select: { displayName: true, displayNameTh: true, isActive: true } } },
          orderBy: { role: { name: "asc" } },
        },
        employee: { select: { department: { select: { name: true } } } },
      },
    })

    if (!record) return { roleLabel: null, departmentLabel: null }

    const activeRoles = record.userRoles.map((userRole) => userRole.role).filter((role) => role.isActive)
    return {
      roleLabel: getUserRoleLabel(activeRoles, locale),
      departmentLabel: record.employee?.department?.name?.trim() || null,
    }
  } catch (error) {
    console.error("Failed to read the shell account", error)
    return { roleLabel: null, departmentLabel: null }
  }
}
