import assert from "node:assert/strict"
import { existsSync } from "node:fs"
import * as nodeModule from "node:module"
import { beforeEach, test } from "node:test"
import { pathToFileURL } from "node:url"

type RoleRouteState = {
  actor: { id: string; roles: string[]; permissions: string[]; employeeId: string | null }
  permissions: Array<{ id: string; module: string; action: string }>
  existingRole: Record<string, unknown> | null
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
    ],
    existingRole: null,
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
  ["@/lib/audit-log", `export async function logAudit() {}`],
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
