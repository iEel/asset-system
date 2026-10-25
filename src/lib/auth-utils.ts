import { auth, unstable_update } from "@/lib/auth"
import type { SessionClock } from "@/lib/session-deadline"

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

/** The person and the session's deadlines from one auth() call, for the dashboard shell. */
export async function getShellSession(): Promise<{ user: SessionUser; clock: SessionClock | null } | null> {
  const session = await auth()
  if (!session?.user) return null
  return { user: session.user as unknown as SessionUser, clock: session.clock ?? null }
}

/** The session's deadlines without extending it: a read never moves activeAt (src/lib/session-deadline.ts). */
export async function requireSessionClock(): Promise<SessionClock> {
  const session = await auth()
  if (!session?.user || !session.clock) throw new Error("Unauthorized")
  return session.clock
}

/** Moves activeAt to now through the jwt callback's update trigger and returns the new deadlines. */
export async function extendSession(): Promise<SessionClock> {
  const session = await unstable_update({})
  if (!session?.user || !session.clock) throw new Error("Unauthorized")
  return session.clock
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
