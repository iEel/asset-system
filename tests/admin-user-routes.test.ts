import assert from "node:assert/strict"
import * as nodeModule from "node:module"
import { beforeEach, test } from "node:test"
import { pathToFileURL } from "node:url"
import { existsSync } from "node:fs"

type MockUserRow = Record<string, unknown>

type AdminUserRouteState = {
  actor: { id: string; roles: string[]; permissions: string[]; employeeId: string | null }
  listRows: MockUserRow[]
  createdRow: MockUserRow
  updatedRow: MockUserRow
  existingRow: MockUserRow
  roles: Array<{ id: string; name: string; isActive: boolean; rolePermissions: Array<{ permission: { module: string; action: string } }> }>
  activeSystemAdminCount: number
  writes: string[]
}

const state: AdminUserRouteState = createState()

function createState(): AdminUserRouteState {
  return {
    actor: { id: "actor-1", roles: ["system_admin"], permissions: [], employeeId: null },
    listRows: [],
    createdRow: {},
    updatedRow: {},
    existingRow: {},
    roles: [],
    activeSystemAdminCount: 2,
    writes: [],
  }
}

Object.assign(globalThis, { __adminUserRouteState: state })

const mockedModuleSources = new Map<string, string>([
  ["next/server", `
    export class NextRequest extends Request {}
    export class NextResponse extends Response {
      static json(body, init) { return Response.json(body, init) }
    }
  `],
  ["@/lib/auth-utils", `
    const state = () => globalThis.__adminUserRouteState
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
    export function invalidateUserAccess(userId) { globalThis.__adminUserRouteState.writes.push("invalidate:" + userId) }
    export function invalidateAllAccess() { globalThis.__adminUserRouteState.writes.push("invalidate:all") }
  `],
  ["@/lib/db", `
    const state = () => globalThis.__adminUserRouteState
    const tx = {
      user: {
        create: async () => { state().writes.push("user.create"); return { ...state().createdRow } },
        update: async () => { state().writes.push("user.update"); return { ...state().updatedRow } },
      },
      userRole: { createMany: async () => ({ count: 1 }), deleteMany: async () => ({ count: 1 }) },
    }
    export const prisma = {
      user: {
        findMany: async () => state().listRows.map((row) => ({ ...row })),
        findUnique: async () => null,
        findFirst: async (args) => (args?.where?.id && !args?.where?.id?.not ? { ...state().existingRow } : null),
        count: async () => state().activeSystemAdminCount,
      },
      role: {
        findMany: async (args) => {
          const ids = args?.where?.id?.in ?? []
          return state().roles.filter((role) => ids.includes(role.id))
        },
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

const usersRoute = await import(pathToFileURL("src/app/api/admin/users/route.ts").href) as {
  GET(): Promise<Response>
  POST(request: Request): Promise<Response>
}
const userRoute = await import(pathToFileURL("src/app/api/admin/users/[id]/route.ts").href) as {
  PUT(request: Request, context: { params: Promise<{ id: string }> }): Promise<Response>
}

const employeeRole = {
  id: "role-employee",
  name: "employee",
  isActive: true,
  rolePermissions: [{ permission: { module: "asset", action: "view" } }],
}

beforeEach(() => {
  Object.assign(state, createState())
  state.roles = [employeeRole]
})

function jsonRequest(body: unknown) {
  return new Request("http://localhost/api/admin/users", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  })
}

test("admin user list never exposes password hashes", async () => {
  state.listRows = [
    { id: "u1", username: "admin", displayName: "Admin", passwordHash: "$2a$12$hash-one", userRoles: [] },
    { id: "u2", username: "staff", displayName: "Staff", passwordHash: "$2a$12$hash-two", userRoles: [] },
  ]

  const response = await usersRoute.GET()
  const payload = await response.json() as { data: Array<Record<string, unknown>> }

  assert.equal(response.status, 200)
  assert.deepEqual(payload.data.map((row) => row.username), ["admin", "staff"])
  assert.equal(payload.data.some((row) => "passwordHash" in row), false)
})

test("creating an admin user does not echo the stored password hash", async () => {
  state.createdRow = { id: "u3", username: "new.user", displayName: "New", passwordHash: "$2a$12$hash-three" }

  const response = await usersRoute.POST(jsonRequest({
    username: "new.user",
    password: "a-strong-password",
    displayName: "New",
    email: "",
    roleIds: ["role-employee"],
  }))
  const payload = await response.json() as Record<string, unknown>

  assert.equal(response.status, 201)
  assert.equal(payload.username, "new.user")
  assert.equal("passwordHash" in payload, false)
})

test("updating an admin user does not echo the stored password hash", async () => {
  state.existingRow = { id: "u4", username: "staff", displayName: "Staff", isActive: true, userRoles: [{ roleId: "role-employee", role: { name: "employee", rolePermissions: [{ permission: { module: "asset", action: "view" } }] } }] }
  state.updatedRow = { id: "u4", username: "staff", displayName: "Staff 2", passwordHash: "$2a$12$hash-four" }

  const response = await userRoute.PUT(
    new Request("http://localhost/api/admin/users/u4", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username: "staff", password: "", displayName: "Staff 2", email: "", roleIds: ["role-employee"] }),
    }),
    { params: Promise.resolve({ id: "u4" }) },
  )
  const payload = await response.json() as Record<string, unknown>

  assert.equal(response.status, 200)
  assert.equal(payload.displayName, "Staff 2")
  assert.equal("passwordHash" in payload, false)
})

const adminRole = { id: "role-admin", name: "system_admin", isActive: true, rolePermissions: [] }
const helpdeskActor = { id: "helpdesk-1", roles: ["helpdesk"], permissions: ["user:view", "user:create", "user:edit", "asset:view"], employeeId: null }

function putUser(id: string, body: Record<string, unknown>) {
  return userRoute.PUT(
    new Request(`http://localhost/api/admin/users/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password: "", email: "", ...body }),
    }),
    { params: Promise.resolve({ id }) },
  )
}

test("a helpdesk user with user:create cannot create a system administrator", async () => {
  state.actor = helpdeskActor
  state.roles = [employeeRole, adminRole]

  const response = await usersRoute.POST(jsonRequest({
    username: "backdoor",
    password: "a-strong-password",
    displayName: "Backdoor",
    email: "",
    roleIds: ["role-admin"],
  }))

  assert.equal(response.status, 403)
  assert.deepEqual(state.writes, [])
})

test("a helpdesk user cannot reset the password of a system administrator", async () => {
  state.actor = helpdeskActor
  state.roles = [employeeRole, adminRole]
  state.existingRow = {
    id: "admin-9",
    username: "admin",
    displayName: "Admin",
    isActive: true,
    userRoles: [{ roleId: "role-admin", role: { name: "system_admin", rolePermissions: [] } }],
  }

  const response = await putUser("admin-9", { username: "admin", password: "attacker-chosen", displayName: "Admin", roleIds: ["role-admin"] })

  assert.equal(response.status, 403)
  assert.deepEqual(state.writes, [])
})

test("the last active system administrator cannot be demoted through the API", async () => {
  state.roles = [employeeRole, adminRole]
  state.activeSystemAdminCount = 0
  state.existingRow = {
    id: "admin-9",
    username: "admin",
    displayName: "Admin",
    isActive: true,
    userRoles: [{ roleId: "role-admin", role: { name: "system_admin", rolePermissions: [] } }],
  }

  const response = await putUser("admin-9", { username: "admin", displayName: "Admin", roleIds: ["role-employee"] })

  assert.equal(response.status, 409)
  assert.deepEqual(state.writes, [])
})

test("editing a user refreshes that user's live session access", async () => {
  state.existingRow = {
    id: "u4",
    username: "staff",
    displayName: "Staff",
    isActive: true,
    userRoles: [{ roleId: "role-employee", role: { name: "employee", rolePermissions: [{ permission: { module: "asset", action: "view" } }] } }],
  }
  state.updatedRow = { id: "u4", username: "staff", displayName: "Staff", isActive: false }

  const response = await putUser("u4", { username: "staff", displayName: "Staff", roleIds: ["role-employee"], isActive: false })

  assert.equal(response.status, 200)
  assert.ok(state.writes.includes("invalidate:u4"))
})
