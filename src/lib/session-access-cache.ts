import { prisma } from "@/lib/db"
import { buildAccessSnapshot, createAccessSnapshotCache } from "@/lib/session-access"

// Sessions are JWTs that live for 8 hours; re-reading access at most once a minute per
// user lets deactivation and role changes reach live sessions without a DB hit per request.
const accessRefreshTtlMs = 60_000

const globalForSessionAccess = globalThis as unknown as {
  sessionAccessCache?: ReturnType<typeof createAccessSnapshotCache>
}

const sessionAccessCache =
  globalForSessionAccess.sessionAccessCache ??
  createAccessSnapshotCache({ ttlMs: accessRefreshTtlMs, load: loadUserAccessSnapshot })
globalForSessionAccess.sessionAccessCache = sessionAccessCache

async function loadUserAccessSnapshot(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      isActive: true,
      employeeId: true,
      userRoles: {
        select: {
          role: {
            select: {
              name: true,
              isActive: true,
              rolePermissions: { select: { permission: { select: { module: true, action: true } } } },
            },
          },
        },
      },
    },
  })

  return user ? buildAccessSnapshot(user) : null
}

export function getUserAccessSnapshot(userId: string) {
  return sessionAccessCache.get(userId)
}

export function invalidateUserAccess(userId: string) {
  sessionAccessCache.invalidate(userId)
}

export function invalidateAllAccess() {
  sessionAccessCache.invalidateAll()
}
