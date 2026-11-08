import { prisma } from "@/lib/db"
import { hasPermission, type SessionUser } from "@/lib/auth-utils"
import { getRolePermissionChangeError } from "@/lib/admin-access-policy"
import { parseWorkflowApprovalPolicy, workflowApprovalSettingKeys } from "@/lib/workflow-approval"

// Page group 11 plan 3 task 4 (spec §7; board US-Role-Edit): the queries behind the create (/admin/roles/new) and edit
// (/admin/roles/[id]/edit) pages. The editor's rules are in role-editor-model.ts.

export type RoleFormRole = {
  id?: string
  name: string
  displayName: string
  displayNameTh: string | null
  description: string | null
  isSystem: boolean
  isActive: boolean
}

export type RoleFormPermission = { id: string; module: string; action: string }

export type RoleFormPerson = { id: string; displayName: string; username: string; isActive: boolean; lastLoginAt: Date | null }

export type RoleFormData = {
  role: RoleFormRole
  permissions: RoleFormPermission[]
  selectedIds: string[]
  userCount: number
  // The first 10 by display name; [] without user:view.
  people: RoleFormPerson[]
  canViewUsers: boolean
  canEditUsers: boolean
  canViewLogs: boolean
  // The disposal setting "บังคับแยกผู้ทำรายการ/ผู้อนุมัติ" (workflow_approval_segregation_required).
  disposalSegregationOn: boolean
  // "module:action" keys the actor cannot grant (no escalation); every key of system_admin.
  lockedKeys: string[]
}

/** null when roleId names no role. roleId null is the create page. */
export async function loadRoleFormData(input: { roleId: string | null; actor: SessionUser }): Promise<RoleFormData | null> {
  const { roleId, actor } = input
  const canViewUsers = hasPermission(actor, "user", "view")

  const [role, permissions, settings] = await Promise.all([
    roleId
      ? prisma.role.findFirst({
          where: { id: roleId },
          include: { rolePermissions: { select: { permission: { select: { id: true, module: true, action: true } } } } },
        })
      : Promise.resolve(null),
    prisma.permission.findMany({
      select: { id: true, module: true, action: true },
      orderBy: [{ module: "asc" }, { action: "asc" }],
    }),
    prisma.systemSetting.findMany({
      where: { key: { in: [...workflowApprovalSettingKeys] } },
      select: { key: true, value: true },
    }),
  ])
  if (roleId && !role) return null

  const [userCount, people] = role
    ? await Promise.all([
        prisma.userRole.count({ where: { roleId: role.id } }),
        canViewUsers
          ? prisma.user.findMany({
              where: { userRoles: { some: { roleId: role.id } } },
              select: { id: true, displayName: true, username: true, isActive: true, lastLoginAt: true },
              orderBy: { displayName: "asc" },
              take: 10,
            })
          : Promise.resolve([]),
      ])
    : [0, []]

  const allKeys = permissions.map((permission) => `${permission.module}:${permission.action}`)
  const currentKeys = role?.rolePermissions.map(({ permission }) => `${permission.module}:${permission.action}`) ?? []
  const lockedKeys =
    role?.name === "system_admin"
      ? allKeys
      : allKeys.filter(
          (key) => getRolePermissionChangeError({ actor, currentPermissionKeys: currentKeys, requestedPermissionKeys: [key] }) !== null,
        )

  return {
    role: role
      ? {
          id: role.id,
          name: role.name,
          displayName: role.displayName,
          displayNameTh: role.displayNameTh,
          description: role.description,
          isSystem: role.isSystem,
          isActive: role.isActive,
        }
      : { name: "", displayName: "", displayNameTh: "", description: "", isSystem: false, isActive: true },
    permissions,
    selectedIds: role?.rolePermissions.map(({ permission }) => permission.id) ?? [],
    userCount,
    people,
    canViewUsers,
    canEditUsers: hasPermission(actor, "user", "edit"),
    canViewLogs: hasPermission(actor, "system", "view"),
    disposalSegregationOn: parseWorkflowApprovalPolicy(settings).segregationRequired,
    lockedKeys,
  }
}
