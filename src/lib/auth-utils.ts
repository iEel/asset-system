import { auth } from "@/lib/auth"

export type SessionUser = {
  id: string
  name: string
  email?: string | null
  roles: string[]
  permissions: string[]
  employeeId?: string | null
}

export async function getSessionUser(): Promise<SessionUser | null> {
  const session = await auth()
  if (!session?.user) return null
  return session.user as unknown as SessionUser
}

export async function requireAuth(): Promise<SessionUser> {
  const user = await getSessionUser()
  if (!user) {
    throw new Error("Unauthorized")
  }
  return user
}

export function hasRole(user: SessionUser, role: string): boolean {
  return user.roles.includes(role)
}

export function hasAnyRole(user: SessionUser, roles: string[]): boolean {
  return roles.some((role) => user.roles.includes(role))
}

export function hasPermission(
  user: SessionUser,
  module: string,
  action: string
): boolean {
  // System admin has all permissions
  if (user.roles.includes("system_admin")) return true
  return user.permissions.includes(`${module}:${action}`)
}

export function requirePermission(
  user: SessionUser,
  module: string,
  action: string
): void {
  if (!hasPermission(user, module, action)) {
    throw new Error("Forbidden: insufficient permissions")
  }
}
