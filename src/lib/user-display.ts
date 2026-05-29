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
