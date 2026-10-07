const systemAdminRole = "system_admin"

type AccessActor = { id: string; roles: string[]; permissions: string[] }

type GrantableRole = { id: string; name: string; isActive: boolean; permissionKeys: string[] }

type ExistingUserAccess = { id: string; roleNames: string[]; permissionKeys: string[]; isActive: boolean }

export type UserAccessChangeInput = {
  actor: AccessActor
  target: ExistingUserAccess | null
  requestedRoleIds: string[]
  requestedRoles: GrantableRole[]
  nextIsActive: boolean
  otherActiveSystemAdminCount: number
}

export function getUserAccessChangeError(input: UserAccessChangeInput): string | null {
  const requestedRoleIds = new Set(input.requestedRoleIds)
  const validRoles = input.requestedRoles.filter((role) => role.isActive && requestedRoleIds.has(role.id))
  if (validRoles.length !== requestedRoleIds.size) return "Invalid role selection"

  if (!input.actor.roles.includes(systemAdminRole)) {
    const actorPermissions = new Set(input.actor.permissions)
    const targetHasMoreAccess =
      input.target !== null &&
      (input.target.roleNames.includes(systemAdminRole) ||
        input.target.permissionKeys.some((permission) => !actorPermissions.has(permission)))
    if (targetHasMoreAccess) return "Forbidden: cannot modify a user who has access you do not hold"

    if (validRoles.some((role) => role.name === systemAdminRole)) {
      return "Forbidden: only system_admin can grant the system_admin role"
    }

    const ungranted = validRoles.flatMap((role) => role.permissionKeys).find((permission) => !actorPermissions.has(permission))
    if (ungranted) return `Forbidden: cannot grant ${ungranted} without holding it`
  }

  const targetIsActiveSystemAdmin = input.target?.isActive === true && input.target.roleNames.includes(systemAdminRole)
  const remainsActiveSystemAdmin = input.nextIsActive && validRoles.some((role) => role.name === systemAdminRole)
  if (targetIsActiveSystemAdmin && !remainsActiveSystemAdmin && input.otherActiveSystemAdminCount === 0) {
    return "Cannot remove or deactivate the last active system administrator"
  }

  return null
}

export function getRolePermissionChangeError(input: {
  actor: AccessActor
  currentPermissionKeys: string[]
  requestedPermissionKeys: string[]
}): string | null {
  if (input.actor.roles.includes(systemAdminRole)) return null

  const actorPermissions = new Set(input.actor.permissions)
  const currentPermissions = new Set(input.currentPermissionKeys)
  const ungranted = input.requestedPermissionKeys.find(
    (permission) => !currentPermissions.has(permission) && !actorPermissions.has(permission),
  )
  return ungranted ? `Forbidden: cannot grant ${ungranted} without holding it` : null
}
