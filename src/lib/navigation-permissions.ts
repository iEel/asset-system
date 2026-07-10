export type NavigationPermission = {
  module: string
  action: string
}

export type NavigationUser = {
  roles: string[]
  permissions: string[]
}

export type PermissionedNavigationItem<TItem> = {
  href?: string
  permission?: NavigationPermission
  anyPermissions?: NavigationPermission[]
  children?: TItem[]
}

export function filterNavigationItemsByPermission<TItem extends PermissionedNavigationItem<TItem>>(
  items: TItem[],
  user: NavigationUser
): TItem[] {
  return items.flatMap((item) => {
    if (!canAccessNavigationItem(item, user)) return []

    const filteredChildren = item.children
      ? filterNavigationItemsByPermission(item.children, user)
      : undefined

    if (item.children && filteredChildren?.length === 0 && !item.href) return []

    return [
      {
        ...item,
        ...(filteredChildren ? { children: filteredChildren } : {}),
      } as TItem,
    ]
  })
}

function canAccessNavigationItem<TItem extends PermissionedNavigationItem<TItem>>(
  item: TItem,
  user: NavigationUser
) {
  if (item.permission && !hasNavigationPermission(user, item.permission)) {
    return false
  }

  if (item.anyPermissions?.length) {
    return item.anyPermissions.some((permission) => hasNavigationPermission(user, permission))
  }

  return true
}

export function hasNavigationPermission(user: NavigationUser, permission: NavigationPermission) {
  if (user.roles.includes("system_admin")) return true
  return user.permissions.includes(`${permission.module}:${permission.action}`)
}
