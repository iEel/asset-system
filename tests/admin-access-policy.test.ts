import assert from "node:assert/strict"
import test from "node:test"

import { getRolePermissionChangeError, getUserAccessChangeError } from "../src/lib/admin-access-policy.ts"

const helpdesk = { id: "helpdesk-1", roles: ["helpdesk"], permissions: ["user:view", "user:edit", "asset:view"] }
const systemAdmin = { id: "admin-1", roles: ["system_admin"], permissions: [] }

const employeeRole = { id: "role-employee", name: "employee", isActive: true, permissionKeys: ["asset:view"] }
const systemAdminRole = { id: "role-admin", name: "system_admin", isActive: true, permissionKeys: [] }
const accountingRole = { id: "role-accounting", name: "accounting", isActive: true, permissionKeys: ["asset:view", "report:export"] }
const retiredRole = { id: "role-retired", name: "retired", isActive: false, permissionKeys: [] }

const employeeTarget = { id: "user-2", roleNames: ["employee"], permissionKeys: ["asset:view"], isActive: true }
const adminTarget = { id: "user-9", roleNames: ["system_admin"], permissionKeys: [], isActive: true }

function userChange(overrides: Partial<Parameters<typeof getUserAccessChangeError>[0]>) {
  return getUserAccessChangeError({
    actor: helpdesk,
    target: employeeTarget,
    requestedRoleIds: ["role-employee"],
    requestedRoles: [employeeRole],
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
    userChange({ target: { id: "helpdesk-1", roleNames: ["helpdesk"], permissionKeys: helpdesk.permissions, isActive: true }, requestedRoleIds: ["role-admin"], requestedRoles: [systemAdminRole] }),
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
    userChange({ target: { id: "user-3", roleNames: ["accounting"], permissionKeys: accountingRole.permissionKeys, isActive: true } }),
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
