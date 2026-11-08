import assert from "node:assert/strict"
import { existsSync } from "node:fs"
import * as nodeModule from "node:module"
import { beforeEach, test } from "node:test"
import { pathToFileURL } from "node:url"

type RoleRouteState = {
  actor: { id: string; roles: string[]; permissions: string[]; employeeId: string | null }
  permissions: Array<{ id: string; module: string; action: string }>
  existingRole: Record<string, unknown> | null
  users: Record<string, Record<string, unknown>>
  audits: Array<Record<string, any>>
  writes: string[]
}

const state: RoleRouteState = createState()

function createState(): RoleRouteState {
  return {
    actor: { id: "role-manager-1", roles: ["role_manager"], permissions: ["role:create", "role:edit", "asset:view", "asset:edit"], employeeId: null },
    permissions: [
      { id: "perm-asset-view", module: "asset", action: "view" },
      { id: "perm-asset-edit", module: "asset", action: "edit" },
      { id: "perm-setting-edit", module: "setting", action: "edit" },
      { id: "perm-asset-delete", module: "asset", action: "delete" },
    ],
    existingRole: null,
    users: {},
    audits: [],
    writes: [],
  }
}

Object.assign(globalThis, { __roleRouteState: state })

const mockedModuleSources = new Map<string, string>([
  ["next/server", `
    export class NextRequest extends Request {}
    export class NextResponse extends Response {
      static json(body, init) { return Response.json(body, init) }
    }
  `],
  ["@/lib/auth-utils", `
    const state = () => globalThis.__roleRouteState
    export async function requireAuth() { return state().actor }
    export function hasRole(user, role) { return user.roles.includes(role) }
    export function hasPermission(user, module, action) {
      return user.roles.includes("system_admin") || user.permissions.includes(module + ":" + action)
    }
    export function requirePermission(user, module, action) {
      if (!hasPermission(user, module, action)) throw new Error("Forbidden: insufficient permissions")
    }
  `],
  ["@/lib/audit-log", `export async function logAudit(params) { globalThis.__roleRouteState.audits.push(params) }`],
  ["@/lib/session-access-cache", `
    export function invalidateUserAccess(userId) { globalThis.__roleRouteState.writes.push("invalidate:" + userId) }
    export function invalidateAllAccess() { globalThis.__roleRouteState.writes.push("invalidate:all") }
  `],
  ["@/lib/db", `
    const state = () => globalThis.__roleRouteState
    const tx = {
      role: {
        create: async () => { state().writes.push("role.create"); return { id: "role-new" } },
        update: async () => { state().writes.push("role.update"); return {} },
        findUnique: async () => ({ ...state().existingRole }),
      },
      rolePermission: {
        createMany: async () => { state().writes.push("rolePermission.createMany"); return { count: 1 } },
        deleteMany: async () => { state().writes.push("rolePermission.deleteMany"); return { count: 1 } },
      },
    }
    export const prisma = {
      role: {
        findUnique: async () => null,
        findFirst: async () => (state().existingRole ? { ...state().existingRole } : null),
        findMany: async (args) => {
          const roles = [state().existingRole, ...Object.values(state().users).flatMap((user) => user.userRoles.map((userRole) => userRole.role))]
          return roles.filter((role, index) => role && args.where.id.in.includes(role.id) && roles.findIndex((other) => other?.id === role.id) === index)
        },
      },
      user: {
        findFirst: async (args) => state().users[args.where.id] ?? null,
        findUnique: async (args) => state().users[args.where.id] ?? null,
        count: async () => 1,
      },
      userRole: {
        create: async (args) => { state().writes.push("userRole.create:" + args.data.userId); return args.data },
      },
      permission: {
        findMany: async (args) => state().permissions.filter((permission) => args.where.id.in.includes(permission.id)),
      },
      $transaction: async (callback) => callback(tx),
    }
  `],
])

const registerHooks = (nodeModule as unknown as {
  registerHooks(options: {
    resolve(specifier: string, context: unknown, nextResolve: (specifier: string, context: unknown) => unknown): unknown
  }): void
}).registerHooks

registerHooks({
  resolve(specifier, context, nextResolve) {
    const source = mockedModuleSources.get(specifier)
    if (source !== undefined) {
      return { url: `data:text/javascript;charset=utf-8,${encodeURIComponent(source)}`, shortCircuit: true }
    }
    if (specifier.startsWith("@/")) {
      const base = `src/${specifier.slice(2)}`
      const file = [`${base}.ts`, `${base}.tsx`, `${base}/index.ts`].find((candidate) => existsSync(candidate))
      if (file) return { url: pathToFileURL(file).href, shortCircuit: true }
    }
    return nextResolve(specifier, context)
  },
})

const rolesRoute = await import(pathToFileURL("src/app/api/admin/roles/route.ts").href) as {
  POST(request: Request): Promise<Response>
}
const roleRoute = await import(pathToFileURL("src/app/api/admin/roles/[id]/route.ts").href) as {
  PUT(request: Request, context: { params: Promise<{ id: string }> }): Promise<Response>
}
const roleUsersRoute = await import(pathToFileURL("src/app/api/admin/roles/[id]/users/route.ts").href) as {
  POST(request: Request, context: { params: Promise<{ id: string }> }): Promise<Response>
}

function roleBody(permissionIds: string[]) {
  return JSON.stringify({ name: "warehouse", displayName: "Warehouse", displayNameTh: "", description: "", permissionIds })
}

beforeEach(() => {
  Object.assign(state, createState())
  state.existingRole = {
    id: "role-warehouse",
    name: "warehouse",
    isSystem: false,
    isActive: true,
    displayName: "Warehouse",
    displayNameTh: null,
    description: null,
    rolePermissions: [{ permissionId: "perm-asset-view", permission: { module: "asset", action: "view" } }],
  }
})

test("a role manager cannot create a role carrying permissions they do not hold", async () => {
  const response = await rolesRoute.POST(new Request("http://localhost/api/admin/roles", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: roleBody(["perm-asset-view", "perm-setting-edit"]),
  }))

  assert.equal(response.status, 403)
  assert.deepEqual(state.writes, [])
})

test("a role manager cannot add a permission they do not hold to an existing role", async () => {
  const response = await roleRoute.PUT(
    new Request("http://localhost/api/admin/roles/role-warehouse", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: roleBody(["perm-asset-view", "perm-setting-edit"]),
    }),
    { params: Promise.resolve({ id: "role-warehouse" }) },
  )

  assert.equal(response.status, 403)
  assert.deepEqual(state.writes, [])
})

test("a role manager can add permissions they already hold", async () => {
  const response = await roleRoute.PUT(
    new Request("http://localhost/api/admin/roles/role-warehouse", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: roleBody(["perm-asset-view", "perm-asset-edit"]),
    }),
    { params: Promise.resolve({ id: "role-warehouse" }) },
  )

  assert.equal(response.status, 200)
  assert.ok(state.writes.includes("rolePermission.createMany"))
  assert.equal(state.writes.at(-1), "invalidate:all")
})

function putRole(body: Record<string, unknown>) {
  return roleRoute.PUT(
    new Request("http://localhost/api/admin/roles/role-warehouse", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: "warehouse", displayName: "Warehouse", displayNameTh: "", description: "", ...body }),
    }),
    { params: Promise.resolve({ id: "role-warehouse" }) },
  )
}

function addUsers(body: Record<string, unknown>) {
  return roleUsersRoute.POST(
    new Request("http://localhost/api/admin/roles/role-warehouse/users", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    }),
    { params: Promise.resolve({ id: "role-warehouse" }) },
  )
}

function heldRole(id: string, name: string, permissions: Array<[string, string]>, isActive = true) {
  return {
    roleId: id,
    role: { id, name, isActive, rolePermissions: permissions.map(([module, action]) => ({ permission: { module, action } })) },
  }
}

test("role save logs the note", async () => {
  const created = await rolesRoute.POST(new Request("http://localhost/api/admin/roles", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name: "warehouse", displayName: "Warehouse", displayNameTh: "", description: "", permissionIds: ["perm-asset-view"], note: "new team" }),
  }))
  assert.equal(created.status, 201)
  assert.equal(state.audits.at(-1)?.newValue.note, "new team")

  const updated = await putRole({ permissionIds: ["perm-asset-view"], note: "rename" })
  assert.equal(updated.status, 200)
  assert.equal(state.audits.at(-1)?.newValue.note, "rename")
})

test("reactivating a role needs its permissions", async () => {
  state.actor = { id: "role-manager-1", roles: ["role_manager"], permissions: ["role:edit", "asset:view"], employeeId: null }
  state.existingRole = {
    ...state.existingRole,
    isActive: false,
    rolePermissions: [{ permissionId: "perm-asset-delete", permission: { module: "asset", action: "delete" } }],
  }

  const refused = await putRole({ isActive: true, permissionIds: ["perm-asset-delete"] })
  assert.equal(refused.status, 403)
  assert.deepEqual(await refused.json(), { error: "Forbidden: cannot activate a role with permissions you do not hold" })
  assert.deepEqual(state.writes, [])

  state.actor = { id: "admin-1", roles: ["system_admin"], permissions: [], employeeId: null }
  const allowed = await putRole({ isActive: true, permissionIds: ["perm-asset-delete"] })
  assert.equal(allowed.status, 200)
})

test("bulk add saves the allowed users and names the refused", async () => {
  state.actor = { id: "user-manager-1", roles: ["user_manager"], permissions: ["user:edit", "asset:view"], employeeId: null }
  state.users = {
    "user-a": { id: "user-a", isActive: true, userRoles: [] },
    "user-b": { id: "user-b", isActive: true, userRoles: [heldRole("role-deleter", "deleter", [["asset", "delete"]])] },
  }

  const response = await addUsers({ userIds: ["user-a", "user-b", "user-a"], note: "team move" })

  assert.equal(response.status, 200)
  assert.deepEqual(await response.json(), {
    added: ["user-a"],
    refused: [{ userId: "user-b", reason: "Forbidden: cannot modify a user who has access you do not hold" }],
  })
  assert.deepEqual(state.writes, ["userRole.create:user-a", "invalidate:user-a"])
  const userLog = state.audits.find((audit) => audit.module === "user")
  assert.equal(userLog?.recordId, "user-a")
  assert.equal(userLog?.action, "update")
  assert.deepEqual(userLog?.oldValue.roleIds, [])
  assert.deepEqual(userLog?.newValue, { roleIds: ["role-warehouse"], note: "team move" })
  const roleLogs = state.audits.filter((audit) => audit.module === "role")
  assert.equal(roleLogs.length, 1)
  assert.equal(roleLogs[0].recordId, "role-warehouse")
  assert.deepEqual(roleLogs[0].newValue, { addedUserIds: ["user-a"], note: "team move" })
})

test("bulk add skips a user who already holds the role and refuses a missing user", async () => {
  state.actor = { id: "admin-1", roles: ["system_admin"], permissions: [], employeeId: null }
  state.users = { "user-a": { id: "user-a", isActive: true, userRoles: [heldRole("role-warehouse", "warehouse", [["asset", "view"]])] } }

  const response = await addUsers({ userIds: ["user-a", "user-gone"] })

  assert.equal(response.status, 200)
  assert.deepEqual(await response.json(), {
    added: ["user-a"],
    refused: [{ userId: "user-gone", reason: "User not found or inactive" }],
  })
  assert.deepEqual(state.writes, [])
  assert.equal(state.audits.length, 0)
})

test("bulk add refuses an inactive role", async () => {
  state.actor = { id: "admin-1", roles: ["system_admin"], permissions: [], employeeId: null }
  state.existingRole = { ...state.existingRole, isActive: false }
  const response = await addUsers({ userIds: ["user-a"] })
  assert.equal(response.status, 400)
  assert.deepEqual(await response.json(), { error: "Role is inactive" })
})

test("bulk add returns 404 for a missing role", async () => {
  state.actor = { id: "admin-1", roles: ["system_admin"], permissions: [], employeeId: null }
  state.existingRole = null
  const response = await addUsers({ userIds: ["user-a"] })
  assert.equal(response.status, 404)
})

test("bulk add needs user:edit", async () => {
  const response = await addUsers({ userIds: ["user-a"] })
  assert.equal(response.status, 403)
  assert.deepEqual(state.writes, [])
})

test("bulk add caps at 50", async () => {
  state.actor = { id: "admin-1", roles: ["system_admin"], permissions: [], employeeId: null }
  const response = await addUsers({ userIds: Array.from({ length: 51 }, (_, index) => `user-${index}`) })
  assert.equal(response.status, 400)
  assert.deepEqual(state.writes, [])
})

test("the new refusals have catalog keys", async () => {
  const { getApiErrorKey } = await import(pathToFileURL("src/lib/api-error-catalog.ts").href) as {
    getApiErrorKey(message: string): string | null
  }
  assert.equal(getApiErrorKey("Forbidden: cannot activate a role with permissions you do not hold"), "activateRoleForbidden")
  assert.equal(getApiErrorKey("Role is inactive"), "roleInactiveForAdd")
})
