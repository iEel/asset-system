import { prisma } from "@/lib/db"
import { requireAuth, requirePermission } from "@/lib/auth-utils"
import { createWorkbook, styleWorksheetHeader, workbookResponse } from "@/lib/asset-excel"
import { errorResponse } from "@/lib/api-response"

const highRiskActions = new Set(["delete", "approve", "export"])

export async function GET() {
  try {
    const user = await requireAuth()
    requirePermission(user, "role", "export")

    const roles = await prisma.role.findMany({
      include: {
        _count: { select: { userRoles: true, rolePermissions: true } },
        rolePermissions: {
          include: { permission: { select: { module: true, action: true } } },
          orderBy: [{ permission: { module: "asc" } }, { permission: { action: "asc" } }],
        },
      },
      orderBy: [{ isSystem: "desc" }, { name: "asc" }],
    })
    const permissions = await prisma.permission.findMany({ orderBy: [{ module: "asc" }, { action: "asc" }] })
    const rolePermissions = new Map(
      roles.map((role) => [
        role.id,
        new Set(role.rolePermissions.map((rolePermission) => `${rolePermission.permission.module}:${rolePermission.permission.action}`)),
      ])
    )

    const workbook = createWorkbook()
    const summarySheet = workbook.addWorksheet("Role Summary")
    summarySheet.columns = [
      { header: "Role Key", key: "roleKey", width: 24 },
      { header: "Display Name", key: "displayName", width: 32 },
      { header: "Display Name TH", key: "displayNameTh", width: 32 },
      { header: "Type", key: "type", width: 14 },
      { header: "Active", key: "active", width: 12 },
      { header: "Users", key: "users", width: 10 },
      { header: "Permissions", key: "permissions", width: 14 },
      { header: "High Risk Permissions", key: "highRiskPermissions", width: 80 },
      { header: "Description", key: "description", width: 48 },
    ]
    summarySheet.addRows(
      roles.map((role) => ({
        roleKey: role.name,
        displayName: role.displayName,
        displayNameTh: role.displayNameTh ?? "",
        type: role.isSystem ? "System" : "Custom",
        active: role.isActive ? "Yes" : "No",
        users: role._count.userRoles,
        permissions: role._count.rolePermissions,
        highRiskPermissions: role.rolePermissions
          .filter((rolePermission) => highRiskActions.has(rolePermission.permission.action))
          .map((rolePermission) => `${rolePermission.permission.module}:${rolePermission.permission.action}`)
          .join(", "),
        description: role.description ?? "",
      }))
    )
    styleWorksheetHeader(summarySheet)

    const matrixSheet = workbook.addWorksheet("Permission Matrix")
    matrixSheet.columns = [
      { header: "Module", key: "module", width: 22 },
      { header: "Action", key: "action", width: 16 },
      { header: "Assigned Roles", key: "assignedRoles", width: 100 },
    ]
    matrixSheet.addRows(
      permissions.map((permission) => ({
        module: permission.module,
        action: permission.action,
        assignedRoles: roles
          .filter((role) => rolePermissions.get(role.id)?.has(`${permission.module}:${permission.action}`))
          .map((role) => role.displayNameTh || role.displayName)
          .join(", "),
      }))
    )
    styleWorksheetHeader(matrixSheet)

    const buffer = await workbook.xlsx.writeBuffer()
    return workbookResponse(buffer, `role-permission-audit-${new Date().toISOString().slice(0, 10)}.xlsx`)
  } catch (error) {
    return errorResponse(error)
  }
}
