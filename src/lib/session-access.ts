export type AccessSnapshot = {
  isActive: boolean
  roles: string[]
  permissions: string[]
  employeeId: string | null
}

type UserAccessRecord = {
  isActive: boolean
  employeeId: string | null
  userRoles: Array<{
    role: {
      name: string
      isActive: boolean
      rolePermissions: Array<{ permission: { module: string; action: string } }>
    }
  }>
}

export function buildAccessSnapshot(user: UserAccessRecord): AccessSnapshot {
  const activeRoles = user.userRoles.map(({ role }) => role).filter((role) => role.isActive)

  return {
    isActive: user.isActive,
    roles: activeRoles.map((role) => role.name),
    permissions: activeRoles.flatMap((role) =>
      role.rolePermissions.map(({ permission }) => `${permission.module}:${permission.action}`),
    ),
    employeeId: user.employeeId,
  }
}

export async function refreshSessionToken<T extends Record<string, unknown>>(
  token: T,
  loadSnapshot: (userId: string) => Promise<AccessSnapshot | null>,
): Promise<T | null> {
  if (typeof token.id !== "string" || !token.id) return null

  let snapshot: AccessSnapshot | null
  try {
    snapshot = await loadSnapshot(token.id)
  } catch (error) {
    console.error("Failed to refresh session access; keeping current claims:", error)
    return token
  }

  if (!snapshot?.isActive) return null

  return {
    ...token,
    roles: snapshot.roles,
    permissions: snapshot.permissions,
    employeeId: snapshot.employeeId,
  }
}

export function createAccessSnapshotCache(options: {
  ttlMs: number
  load: (userId: string) => Promise<AccessSnapshot | null>
  now?: () => number
}) {
  const now = options.now ?? Date.now
  const entries = new Map<string, { loadedAt: number; snapshot: Promise<AccessSnapshot | null> }>()

  return {
    get(userId: string) {
      const cached = entries.get(userId)
      if (cached && now() - cached.loadedAt <= options.ttlMs) return cached.snapshot

      const snapshot = options.load(userId)
      entries.set(userId, { loadedAt: now(), snapshot })
      snapshot.catch(() => entries.delete(userId))
      return snapshot
    },
    invalidate(userId: string) {
      entries.delete(userId)
    },
    invalidateAll() {
      entries.clear()
    },
  }
}
