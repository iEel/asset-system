import assert from "node:assert/strict"
import * as nodeModule from "node:module"
import test from "node:test"

const registerHooks = (nodeModule as unknown as {
  registerHooks(options: {
    resolve(specifier: string, context: unknown, nextResolve: (specifier: string, context: unknown) => unknown): unknown
  }): void
}).registerHooks

registerHooks({
  resolve(specifier, context, nextResolve) {
    if (specifier === "@/lib/db") {
      return { url: `data:text/javascript;charset=utf-8,${encodeURIComponent("export const prisma = {}")}`, shortCircuit: true }
    }
    return nextResolve(specifier, context)
  },
})

const { getRolePermissionChangeError, getUserAccessChangeError } = await import("../src/lib/admin-access-policy.ts")
const { toExistingUserAccess } = await import("../src/lib/admin-access-data.ts")

const helpdesk = { id: "helpdesk-1", roles: ["helpdesk"], permissions: ["user:view", "user:edit", "asset:view"] }
const systemAdmin = { id: "admin-1", roles: ["system_admin"], permissions: [] }

const employeeRole = { id: "role-employee", name: "employee", isActive: true, permissionKeys: ["asset:view"] }
const systemAdminRole = { id: "role-admin", name: "system_admin", isActive: true, permissionKeys: [] }
const accountingRole = { id: "role-accounting", name: "accounting", isActive: true, permissionKeys: ["asset:view", "report:export"] }
const retiredRole = { id: "role-retired", name: "retired", isActive: false, permissionKeys: [] }

const employeeTarget = { id: "user-2", roleNames: ["employee"], activeRoleNames: ["employee"], permissionKeys: ["asset:view"], isActive: true }
const adminTarget = { id: "user-9", roleNames: ["system_admin"], activeRoleNames: ["system_admin"], permissionKeys: [], isActive: true }

function userChange(overrides: Partial<Parameters<typeof getUserAccessChangeError>[0]>) {
  return getUserAccessChangeError({
    actor: helpdesk,
    target: employeeTarget,
    requestedRoleIds: ["role-employee"],
    requestedRoles: [employeeRole],
    currentRoleIds: ["role-employee"],
    nextIsActive: true,
    otherActiveSystemAdminCount: 1,
    ...overrides,
  })
}

test("a non-admin may manage a user whose access is within their own", () => {
  assert.equal(userChange({}), null)
  assert.equal(userChange({ target: null }), null)
})

test("a non-admin cannot grant the system_admin role, including to themselves", () => {
  assert.equal(
    userChange({ target: { id: "helpdesk-1", roleNames: ["helpdesk"], activeRoleNames: ["helpdesk"], permissionKeys: helpdesk.permissions, isActive: true }, requestedRoleIds: ["role-admin"], requestedRoles: [systemAdminRole] }),
    "Forbidden: only system_admin can grant the system_admin role",
  )
})

test("a non-admin cannot grant permissions they do not hold", () => {
  assert.equal(
    userChange({ requestedRoleIds: ["role-accounting"], requestedRoles: [accountingRole] }),
    "Forbidden: cannot grant report:export without holding it",
  )
})

test("a non-admin cannot edit or reset the password of a more privileged user", () => {
  assert.equal(
    userChange({ target: adminTarget, requestedRoleIds: ["role-admin"], requestedRoles: [systemAdminRole] }),
    "Forbidden: cannot modify a user who has access you do not hold",
  )
  assert.equal(
    userChange({ target: { id: "user-3", roleNames: ["accounting"], activeRoleNames: ["accounting"], permissionKeys: accountingRole.permissionKeys, isActive: true } }),
    "Forbidden: cannot modify a user who has access you do not hold",
  )
})

test("unknown or inactive roles are rejected", () => {
  assert.equal(userChange({ requestedRoleIds: ["role-employee", "role-missing"], requestedRoles: [employeeRole] }), "Invalid role selection")
  assert.equal(userChange({ actor: systemAdmin, requestedRoleIds: ["role-retired"], requestedRoles: [retiredRole] }), "Invalid role selection")
})

test("system administrators may grant any active role", () => {
  assert.equal(userChange({ actor: systemAdmin, requestedRoleIds: ["role-admin"], requestedRoles: [systemAdminRole] }), null)
  assert.equal(userChange({ actor: systemAdmin, target: adminTarget, requestedRoleIds: ["role-accounting"], requestedRoles: [accountingRole] }), null)
})

test("the last active system administrator cannot be demoted or deactivated", () => {
  assert.equal(
    userChange({ actor: systemAdmin, target: adminTarget, requestedRoleIds: ["role-employee"], requestedRoles: [employeeRole], otherActiveSystemAdminCount: 0 }),
    "Cannot remove or deactivate the last active system administrator",
  )
  assert.equal(
    userChange({ actor: systemAdmin, target: adminTarget, requestedRoleIds: ["role-admin"], requestedRoles: [systemAdminRole], nextIsActive: false, otherActiveSystemAdminCount: 0 }),
    "Cannot remove or deactivate the last active system administrator",
  )
  assert.equal(
    userChange({ actor: systemAdmin, target: adminTarget, requestedRoleIds: ["role-employee"], requestedRoles: [employeeRole], otherActiveSystemAdminCount: 1 }),
    null,
  )
})

test("a non-admin role editor cannot add permissions they do not hold", () => {
  const roleEditor = { id: "role-editor-1", roles: ["role_manager"], permissions: ["role:edit", "asset:view", "asset:edit"] }

  assert.equal(
    getRolePermissionChangeError({ actor: roleEditor, currentPermissionKeys: ["asset:view"], requestedPermissionKeys: ["asset:view", "setting:edit"] }),
    "Forbidden: cannot grant setting:edit without holding it",
  )
  assert.equal(
    getRolePermissionChangeError({ actor: roleEditor, currentPermissionKeys: ["asset:view"], requestedPermissionKeys: ["asset:view", "asset:edit"] }),
    null,
  )
})

test("keeping a permission the role already has is not an escalation", () => {
  const roleEditor = { id: "role-editor-1", roles: ["role_manager"], permissions: ["role:edit", "asset:view"] }

  assert.equal(
    getRolePermissionChangeError({ actor: roleEditor, currentPermissionKeys: ["report:export"], requestedPermissionKeys: ["report:export"] }),
    null,
  )
  assert.equal(
    getRolePermissionChangeError({ actor: systemAdmin, currentPermissionKeys: [], requestedPermissionKeys: ["setting:edit"] }),
    null,
  )
})

const oldRole = { id: "old", name: "old_role", isActive: false, permissionKeys: ["asset:delete"] }
const r1Role = { id: "r1", name: "r1_role", isActive: true, permissionKeys: ["asset:view"] }

test("a held inactive role can be kept or removed", () => {
  assert.equal(
    userChange({ currentRoleIds: ["old"], requestedRoleIds: ["old", "r1"], requestedRoles: [oldRole, r1Role] }),
    null,
  )
  assert.equal(userChange({ currentRoleIds: ["old"], requestedRoleIds: ["r1"], requestedRoles: [r1Role] }), null)
})

test("a new inactive role is still refused", () => {
  assert.equal(
    userChange({ currentRoleIds: [], requestedRoleIds: ["old"], requestedRoles: [oldRole] }),
    "Invalid role selection",
  )
  assert.equal(
    userChange({ actor: systemAdmin, currentRoleIds: [], requestedRoleIds: ["old"], requestedRoles: [oldRole] }),
    "Invalid role selection",
  )
})

// Final review ruling (reverses the Task 1 ruling): every role the target holds, active or inactive, counts for the
// "more access" check, so a dormant high-permission role cannot be taken over and switched back on later. Only the
// last-active-system-admin test reads the active role names.
test("a held inactive role still counts as the target's access", () => {
  const actor = { id: "actor-2", roles: ["helpdesk"], permissions: ["asset:view"] }
  const target = toExistingUserAccess({
    id: "user-5",
    isActive: true,
    userRoles: [
      {
        role: {
          name: "old_role",
          isActive: false,
          rolePermissions: [{ permission: { module: "asset", action: "delete" } }],
        },
      },
    ],
  })
  assert.deepEqual(target.permissionKeys, ["asset:delete"])
  assert.deepEqual(target.roleNames, ["old_role"])
  assert.deepEqual(target.activeRoleNames, [])

  assert.equal(
    userChange({
      actor,
      target,
      currentRoleIds: ["old"],
      requestedRoleIds: ["old", "r1"],
      requestedRoles: [oldRole, r1Role],
    }),
    "Forbidden: cannot modify a user who has access you do not hold",
  )
})

test("a held inactive system_admin role blocks a non-admin but is not an active admin for the last-admin rule", () => {
  const target = toExistingUserAccess({
    id: "user-6",
    isActive: true,
    userRoles: [{ role: { name: "system_admin", isActive: false, rolePermissions: [] } }],
  })
  assert.equal(userChange({ target }), "Forbidden: cannot modify a user who has access you do not hold")
  assert.equal(
    userChange({ actor: systemAdmin, target, currentRoleIds: ["role-admin"], requestedRoleIds: ["role-employee"], requestedRoles: [employeeRole], otherActiveSystemAdminCount: 0 }),
    null,
  )
})

test("last system admin rule unchanged", () => {
  assert.equal(
    userChange({
      actor: systemAdmin,
      target: adminTarget,
      currentRoleIds: ["role-admin"],
      requestedRoleIds: ["role-employee"],
      requestedRoles: [employeeRole],
      otherActiveSystemAdminCount: 0,
    }),
    "Cannot remove or deactivate the last active system administrator",
  )
})
