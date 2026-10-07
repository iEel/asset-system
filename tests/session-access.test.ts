import assert from "node:assert/strict"
import test from "node:test"

import {
  buildAccessSnapshot,
  createAccessSnapshotCache,
  refreshSessionToken,
  type AccessSnapshot,
} from "../src/lib/session-access.ts"

function role(name: string, isActive: boolean, permissions: string[]) {
  return {
    role: {
      name,
      isActive,
      rolePermissions: permissions.map((key) => {
        const [module, action] = key.split(":")
        return { permission: { module, action } }
      }),
    },
  }
}

test("access snapshots ignore roles that an administrator has disabled", () => {
  const snapshot = buildAccessSnapshot({
    isActive: true,
    employeeId: "emp-1",
    userRoles: [role("employee", true, ["asset:view"]), role("compromised_role", false, ["setting:edit", "user:edit"])],
  })

  assert.deepEqual(snapshot, { isActive: true, roles: ["employee"], permissions: ["asset:view"], employeeId: "emp-1" })
})

const baseToken = { id: "user-1", name: "Somchai", roles: ["accounting"], permissions: ["report:export"], employeeId: "emp-1" }

test("a deactivated user loses their session on the next refresh", async () => {
  const refreshed = await refreshSessionToken(baseToken, async () => ({ isActive: false, roles: ["accounting"], permissions: ["report:export"], employeeId: "emp-1" }))
  assert.equal(refreshed, null)
})

test("a deleted user loses their session on the next refresh", async () => {
  assert.equal(await refreshSessionToken(baseToken, async () => null), null)
})

test("role changes reach an existing session without logging the user out", async () => {
  const refreshed = await refreshSessionToken(baseToken, async () => ({ isActive: true, roles: ["employee"], permissions: ["asset:view"], employeeId: "emp-1" }))

  assert.deepEqual(refreshed, { id: "user-1", name: "Somchai", roles: ["employee"], permissions: ["asset:view"], employeeId: "emp-1" })
})

test("a transient database error keeps the current session instead of logging everyone out", async () => {
  const refreshed = await refreshSessionToken(baseToken, async () => {
    throw new Error("Connection lost")
  })

  assert.deepEqual(refreshed, baseToken)
})

test("tokens without a user id are rejected", async () => {
  assert.equal(await refreshSessionToken({ name: "ghost" }, async () => ({ isActive: true, roles: [], permissions: [], employeeId: null })), null)
})

test("the snapshot cache reloads after its TTL and after invalidation", async () => {
  let clock = 0
  const loads: string[] = []
  const snapshot: AccessSnapshot = { isActive: true, roles: ["employee"], permissions: [], employeeId: null }
  const cache = createAccessSnapshotCache({
    ttlMs: 60_000,
    now: () => clock,
    load: async (userId) => {
      loads.push(userId)
      return snapshot
    },
  })

  await cache.get("user-1")
  clock = 59_000
  await cache.get("user-1")
  assert.deepEqual(loads, ["user-1"])

  clock = 60_001
  await cache.get("user-1")
  assert.deepEqual(loads, ["user-1", "user-1"])

  cache.invalidate("user-1")
  await cache.get("user-1")
  assert.deepEqual(loads, ["user-1", "user-1", "user-1"])

  await cache.get("user-2")
  cache.invalidateAll()
  await cache.get("user-1")
  await cache.get("user-2")
  assert.deepEqual(loads, ["user-1", "user-1", "user-1", "user-2", "user-1", "user-2"])
})
