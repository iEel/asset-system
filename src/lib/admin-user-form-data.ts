import type { Prisma } from "@prisma/client"
import { prisma } from "@/lib/db"
import { hasPermission, type SessionUser } from "@/lib/auth-utils"
import { employeeHasLeft } from "@/lib/admin-users-list"
import { grantLockReason, type FormRole } from "@/lib/admin-user-form-model"

// Page group 11 plan 2 task 3: the queries behind the create (/admin/users/new) and edit (/admin/users/[id]) pages.
// The rules are in admin-user-form-model.ts.

export type UserFormEmployee = {
  id: string
  code: string
  fullNameTh: string
  email: string | null
  departmentName: string
  branchName: string
  hasLeft: boolean
  heldAssetCount: number
}

export type UserFormData = {
  // All active roles + inactive roles the user holds, system roles first, then by name.
  roles: FormRole[]
  // Active employees with no account (create), plus this user's linked one (edit, even if left).
  employees: UserFormEmployee[]
  user: null | {
    id: string
    username: string
    displayName: string
    email: string | null
    employeeId: string | null
    roleIds: string[]
    isActive: boolean
    lastLoginAt: Date | null
    createdAt: Date
    isSelf: boolean
  }
  // hasPermission(actor, "system", "view")
  canViewLogs: boolean
}

export async function loadUserFormData(input: { userId: string | null; actor: SessionUser }): Promise<UserFormData> {
  const { userId, actor } = input

  const availableEmployees: Prisma.EmployeeWhereInput = {
    isActive: true,
    employmentStatus: { not: "resigned" },
    user: null,
  }
  const roleWhere: Prisma.RoleWhereInput = userId
    ? { OR: [{ isActive: true }, { userRoles: { some: { userId } } }] }
    : { isActive: true }
  const employeeWhere: Prisma.EmployeeWhereInput = userId
    ? { OR: [availableEmployees, { user: { id: userId } }] }
    : availableEmployees

  const [roles, employees, user] = await Promise.all([
    prisma.role.findMany({
      where: roleWhere,
      select: {
        id: true,
        name: true,
        displayName: true,
        displayNameTh: true,
        isSystem: true,
        isActive: true,
        rolePermissions: { select: { permission: { select: { module: true, action: true } } } },
      },
      orderBy: [{ isSystem: "desc" }, { name: "asc" }],
    }),
    prisma.employee.findMany({
      where: employeeWhere,
      select: {
        id: true,
        code: true,
        fullNameTh: true,
        email: true,
        isActive: true,
        employmentStatus: true,
        department: { select: { name: true } },
        branch: { select: { name: true } },
      },
      orderBy: { code: "asc" },
    }),
    userId
      ? prisma.user.findUnique({
          where: { id: userId },
          select: {
            id: true,
            username: true,
            displayName: true,
            email: true,
            employeeId: true,
            isActive: true,
            lastLoginAt: true,
            createdAt: true,
            userRoles: { select: { roleId: true } },
          },
        })
      : Promise.resolve(null),
  ])

  // Active assets only, the plan 1 rule (admin-users-page-data.ts).
  const employeeIds = employees.map((employee) => employee.id)
  const held =
    employeeIds.length === 0
      ? []
      : await prisma.asset.groupBy({
          by: ["custodianId"],
          where: { custodianId: { in: employeeIds }, isActive: true },
          _count: true,
        })
  const heldByEmployee = new Map(held.map((group) => [group.custodianId, group._count]))

  return {
    roles: roles.map((role) => {
      const permissionKeys = role.rolePermissions.map(({ permission }) => `${permission.module}:${permission.action}`)
      return {
        id: role.id,
        name: role.name,
        label: role.displayNameTh || role.displayName,
        isSystem: role.isSystem,
        isActive: role.isActive,
        permissionKeys,
        lockReason: grantLockReason({ name: role.name, permissionKeys }, actor),
      }
    }),
    employees: employees.map((employee) => ({
      id: employee.id,
      code: employee.code,
      fullNameTh: employee.fullNameTh,
      email: employee.email,
      departmentName: employee.department.name,
      branchName: employee.branch.name,
      hasLeft: employeeHasLeft(employee),
      heldAssetCount: heldByEmployee.get(employee.id) ?? 0,
    })),
    user: user
      ? {
          id: user.id,
          username: user.username,
          displayName: user.displayName,
          email: user.email,
          employeeId: user.employeeId,
          roleIds: user.userRoles.map((userRole) => userRole.roleId),
          isActive: user.isActive,
          lastLoginAt: user.lastLoginAt,
          createdAt: user.createdAt,
          isSelf: user.id === actor.id,
        }
      : null,
    canViewLogs: hasPermission(actor, "system", "view"),
  }
}
