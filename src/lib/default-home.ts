export type DefaultHomeUser = {
  roles: string[]
  permissions: string[]
  employeeId?: string | null
}

const dashboardOverviewPermissions = new Set([
  "asset:view",
  "audit:view",
  "brand:view",
  "branch:view",
  "category:view",
  "company:view",
  "department:view",
  "disposal:view",
  "employee:view",
  "location:view",
  "maintenance:view",
  "report:view",
  "role:view",
  "setting:view",
  "supplier:view",
  "system:view",
  "user:view",
])

export function getDefaultHomeHref(locale: string, user: DefaultHomeUser) {
  return shouldUseEmployeeHome(user) ? `/${locale}/my-assets` : `/${locale}/dashboard`
}

export function shouldUseEmployeeHome(user: DefaultHomeUser) {
  if (!user.employeeId) return false
  if (user.roles.includes("system_admin")) return false
  return !user.permissions.some((permission) => dashboardOverviewPermissions.has(permission))
}
