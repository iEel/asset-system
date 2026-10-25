export type UserDisplayIdentity = {
  name?: string | null
  email?: string | null
}

export function getUserDisplayLabel(user: UserDisplayIdentity) {
  return user.name?.trim() || user.email?.trim() || "User"
}

export function getUserSecondaryLabel(user: UserDisplayIdentity) {
  const email = user.email?.trim()
  if (!email || email === getUserDisplayLabel(user)) return ""
  return email
}

export function getUserInitial(user: UserDisplayIdentity) {
  const [firstCharacter] = Array.from(getUserDisplayLabel(user).trim())
  return firstCharacter?.toLocaleUpperCase() || "U"
}

// The person's role and department as the menu foot and the phone sheet show them (menu B shell, spec §6.2).
export type ShellAccount = {
  roleLabel: string | null
  departmentLabel: string | null
}

export function getUserRoleLabel(
  roles: ReadonlyArray<{ displayName: string; displayNameTh: string | null }>,
  locale: string,
): string | null {
  const names = roles
    .map((role) => (locale === "th" ? role.displayNameTh?.trim() || role.displayName : role.displayName).trim())
    .filter((name) => name.length > 0)
  return names.length > 0 ? names.join(", ") : null
}
