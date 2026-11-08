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
  audits: Array<Record<string, unknown>>
  userCreateData: Record<string, unknown> | null
  userUpdateData: Record<string, unknown> | null
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
    audits: [],
    userCreateData: null,
    userUpdateData: null,
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
  ["@/lib/audit-log", `export async function logAudit(entry) { globalThis.__adminUserRouteState.audits.push(entry) }`],
  ["@/lib/session-access-cache", `
    export function invalidateUserAccess(userId) { globalThis.__adminUserRouteState.writes.push("invalidate:" + userId) }
    export function invalidateAllAccess() { globalThis.__adminUserRouteState.writes.push("invalidate:all") }
  `],
  ["@/lib/db", `
    const state = () => globalThis.__adminUserRouteState
    const tx = {
      user: {
        create: async (args) => { state().writes.push("user.create"); state().userCreateData = args?.data ?? null; return { ...state().createdRow } },
        update: async (args) => { state().writes.push("user.update"); state().userUpdateData = args?.data ?? null; return { ...state().updatedRow } },
      },
      userRole: { createMany: async () => ({ count: 1 }), deleteMany: async () => ({ count: 1 }) },
    }
    export const prisma = {
      user: {
        findMany: async () => state().listRows.map((row) => ({ ...row })),
        findUnique: async () => null,
        findFirst: async (args) => (args?.where?.id && !args?.where?.id?.not && state().existingRow ? { ...state().existingRow } : null),
        count: async () => state().activeSystemAdminCount,
        update: async (args) => { state().writes.push("user.update"); state().userUpdateData = args?.data ?? null; return { ...state().updatedRow } },
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

const statusRoutePath = "src/app/api/admin/users/[id]/status/route.ts"
const statusRoute = existsSync(statusRoutePath)
  ? await import(pathToFileURL(statusRoutePath).href) as {
    PATCH(request: Request, context: { params: Promise<{ id: string }> }): Promise<Response>
  }
  : null
const { getApiErrorKey } = await import(pathToFileURL("src/lib/api-error-catalog.ts").href) as {
  getApiErrorKey(raw: string): string | null
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
  state.existingRow = { id: "u4", username: "staff", displayName: "Staff", isActive: true, userRoles: [{ roleId: "role-employee", role: { id: "role-employee", name: "employee", isActive: true, rolePermissions: [{ permission: { module: "asset", action: "view" } }] } }] }
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
    userRoles: [{ roleId: "role-admin", role: { id: "role-admin", name: "system_admin", isActive: true, rolePermissions: [] } }],
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
    userRoles: [{ roleId: "role-admin", role: { id: "role-admin", name: "system_admin", isActive: true, rolePermissions: [] } }],
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
    userRoles: [{ roleId: "role-employee", role: { id: "role-employee", name: "employee", isActive: true, rolePermissions: [{ permission: { module: "asset", action: "view" } }] } }],
  }
  state.updatedRow = { id: "u4", username: "staff", displayName: "Staff", isActive: false }

  const response = await putUser("u4", { username: "staff", displayName: "Staff", roleIds: ["role-employee"], isActive: false })

  assert.equal(response.status, 200)
  assert.ok(state.writes.includes("invalidate:u4"))
})

function patchStatus(id: string, body: Record<string, unknown>) {
  assert.ok(statusRoute, "the status route exists")
  return statusRoute.PATCH(
    new Request(`http://localhost/api/admin/users/${id}/status`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    }),
    { params: Promise.resolve({ id }) },
  )
}

const employeeUserRole = {
  roleId: "role-employee",
  role: { id: "role-employee", name: "employee", isActive: true, rolePermissions: [{ permission: { module: "asset", action: "view" } }] },
}

test("create with authMode ad needs no password and stores a random hash", async () => {
  state.createdRow = { id: "u5", username: "ad.user", displayName: "AD" }

  const response = await usersRoute.POST(jsonRequest({
    username: "ad.user",
    authMode: "ad",
    password: "ignored-password",
    displayName: "AD",
    email: "",
    roleIds: ["role-employee"],
    note: "New starter",
  }))

  assert.equal(response.status, 201)
  const hash = state.userCreateData?.passwordHash as string
  assert.match(hash, /^\$2[aby]\$12\$/)
  const bcrypt = (await import("bcryptjs")).default
  assert.equal(await bcrypt.compare("ignored-password", hash), false)
  assert.equal(state.audits.length, 1)
  const newValue = state.audits[0].newValue as Record<string, unknown>
  assert.equal(newValue.authMode, "ad")
  assert.equal(newValue.note, "New starter")
  assert.equal(newValue.password, undefined)
  assert.equal(JSON.stringify(state.audits[0]).includes("ignored-password"), false)
})

test("create with authMode ad and no password at all is accepted", async () => {
  state.createdRow = { id: "u6", username: "ad.two", displayName: "AD 2" }

  const response = await usersRoute.POST(jsonRequest({
    username: "ad.two",
    authMode: "ad",
    displayName: "AD 2",
    email: "",
    roleIds: ["role-employee"],
  }))

  assert.equal(response.status, 201)
  assert.match(state.userCreateData?.passwordHash as string, /^\$2[aby]\$12\$/)
})

test("create without authMode still needs a password", async () => {
  const response = await usersRoute.POST(jsonRequest({
    username: "local.user",
    displayName: "Local",
    email: "",
    roleIds: ["role-employee"],
  }))
  const payload = await response.json() as { fieldErrors?: Record<string, string> }

  assert.equal(response.status, 400)
  assert.equal(payload.fieldErrors?.password, "required")
  assert.deepEqual(state.writes, [])
})

test("create with authMode local still needs a password", async () => {
  const response = await usersRoute.POST(jsonRequest({
    username: "local.user",
    authMode: "local",
    displayName: "Local",
    email: "",
    roleIds: ["role-employee"],
  }))
  const payload = await response.json() as { fieldErrors?: Record<string, string> }

  assert.equal(response.status, 400)
  assert.equal(payload.fieldErrors?.password, "required")
})

test("update logs the note", async () => {
  state.existingRow = { id: "u4", username: "staff", displayName: "Staff", isActive: true, userRoles: [employeeUserRole] }
  state.updatedRow = { id: "u4", username: "staff", displayName: "Staff" }

  const response = await putUser("u4", { username: "staff", displayName: "Staff", roleIds: ["role-employee"], note: "Moved to IT" })

  assert.equal(response.status, 200)
  assert.equal((state.audits[0].newValue as Record<string, unknown>).note, "Moved to IT")
})

test("status route closes and reopens, logging old and new", async () => {
  state.existingRow = { id: "u4", username: "staff", displayName: "Staff", isActive: true, userRoles: [employeeUserRole] }
  state.updatedRow = { id: "u4", username: "staff", displayName: "Staff", isActive: false, passwordHash: "$2a$12$x" }

  const closed = await patchStatus("u4", { isActive: false, note: "Left the company" })
  const closedPayload = await closed.json() as Record<string, unknown>

  assert.equal(closed.status, 200)
  assert.equal(closedPayload.isActive, false)
  assert.equal("passwordHash" in closedPayload, false)
  assert.deepEqual(state.userUpdateData, { isActive: false })
  assert.ok(state.writes.includes("invalidate:u4"))
  assert.equal(state.audits[0].action, "update")
  assert.equal(state.audits[0].module, "user")
  assert.equal(state.audits[0].recordId, "u4")
  assert.deepEqual(state.audits[0].oldValue, { isActive: true })
  assert.deepEqual(state.audits[0].newValue, { isActive: false, note: "Left the company" })

  state.existingRow = { ...state.existingRow, isActive: false }
  state.updatedRow = { id: "u4", username: "staff", displayName: "Staff", isActive: true }
  const reopened = await patchStatus("u4", { isActive: true })

  assert.equal(reopened.status, 200)
  assert.deepEqual(state.userUpdateData, { isActive: true })
  assert.deepEqual(state.audits[1].oldValue, { isActive: false })
  assert.equal((state.audits[1].newValue as Record<string, unknown>).isActive, true)
})

test("status route refuses your own account", async () => {
  state.existingRow = { id: "actor-1", username: "me", displayName: "Me", isActive: true, userRoles: [employeeUserRole] }

  const response = await patchStatus("actor-1", { isActive: false })
  const payload = await response.json() as { error: string }

  assert.equal(response.status, 400)
  assert.equal(payload.error, "Cannot change the status of your own account")
  assert.equal(getApiErrorKey(payload.error), "ownAccountStatus")
  assert.deepEqual(state.writes, [])
})

test("status route keeps the last-admin rule", async () => {
  state.roles = [employeeRole, adminRole]
  state.activeSystemAdminCount = 0
  state.existingRow = {
    id: "admin-9",
    username: "admin",
    displayName: "Admin",
    isActive: true,
    userRoles: [{ roleId: "role-admin", role: { id: "role-admin", name: "system_admin", isActive: true, rolePermissions: [] } }],
  }

  const response = await patchStatus("admin-9", { isActive: false })

  assert.equal(response.status, 409)
  assert.deepEqual(state.writes, [])
})

test("status route needs user:edit", async () => {
  state.actor = { id: "viewer-1", roles: ["helpdesk"], permissions: ["user:view"], employeeId: null }
  state.existingRow = { id: "u4", username: "staff", displayName: "Staff", isActive: true, userRoles: [employeeUserRole] }

  const response = await patchStatus("u4", { isActive: false })

  assert.equal(response.status, 403)
  assert.deepEqual(state.writes, [])
})

test("status route gives 404 for a missing user", async () => {
  state.existingRow = null as unknown as MockUserRow

  const response = await patchStatus("ghost", { isActive: false })

  assert.equal(response.status, 404)
  assert.deepEqual(state.writes, [])
})
