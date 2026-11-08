const systemAdminRole = "system_admin"

type AccessActor = { id: string; roles: string[]; permissions: string[] }

type GrantableRole = { id: string; name: string; isActive: boolean; permissionKeys: string[] }

// roleNames and permissionKeys cover every held role, active or inactive (the "more access" check); activeRoleNames
// only the active ones (the last-active-system-admin test).
type ExistingUserAccess = { id: string; roleNames: string[]; permissionKeys: string[]; activeRoleNames: string[]; isActive: boolean }

export type UserAccessChangeInput = {
  actor: AccessActor
  target: ExistingUserAccess | null
  requestedRoleIds: string[]
  requestedRoles: GrantableRole[]
  /** The target's stored role ids; [] on create. A held inactive role may be kept but grants nothing. */
  currentRoleIds: string[]
  nextIsActive: boolean
  otherActiveSystemAdminCount: number
}

export function getUserAccessChangeError(input: UserAccessChangeInput): string | null {
  const requestedRoleIds = new Set(input.requestedRoleIds)
  const currentRoleIds = new Set(input.currentRoleIds)
  const validRoles = input.requestedRoles.filter(
    (role) => requestedRoleIds.has(role.id) && (role.isActive || currentRoleIds.has(role.id)),
  )
  if (validRoles.length !== requestedRoleIds.size) return "Invalid role selection"
  // Inactive roles the user already holds are kept but grant nothing (session-access drops them).
  const grantingRoles = validRoles.filter((role) => role.isActive)

  if (!input.actor.roles.includes(systemAdminRole)) {
    const actorPermissions = new Set(input.actor.permissions)
    const targetHasMoreAccess =
      input.target !== null &&
      (input.target.roleNames.includes(systemAdminRole) ||
        input.target.permissionKeys.some((permission) => !actorPermissions.has(permission)))
    if (targetHasMoreAccess) return "Forbidden: cannot modify a user who has access you do not hold"

    if (grantingRoles.some((role) => role.name === systemAdminRole)) {
      return "Forbidden: only system_admin can grant the system_admin role"
    }

    const ungranted = grantingRoles.flatMap((role) => role.permissionKeys).find((permission) => !actorPermissions.has(permission))
    if (ungranted) return `Forbidden: cannot grant ${ungranted} without holding it`
  }

  const targetIsActiveSystemAdmin = input.target?.isActive === true && input.target.activeRoleNames.includes(systemAdminRole)
  const remainsActiveSystemAdmin = input.nextIsActive && grantingRoles.some((role) => role.name === systemAdminRole)
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
