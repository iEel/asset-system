export type LdapProvisionProfile = {
  username: string
  displayName: string
  email: string | null
  employeeCode?: string | null
}

export function buildLdapEmployeeLookup(profile: LdapProvisionProfile) {
  const OR = [
    ...(profile.email ? [{ email: profile.email }] : []),
    ...(profile.employeeCode ? [{ code: profile.employeeCode }] : []),
  ]

  if (OR.length === 0) return null
  return { OR, isActive: true }
}

export function buildLdapUserLookup({
  profile,
  employeeId,
}: {
  profile: LdapProvisionProfile
  employeeId?: string | null
}) {
  return {
    OR: [
      { username: profile.username },
      ...(profile.email ? [{ email: profile.email }] : []),
      ...(employeeId ? [{ employeeId }] : []),
    ],
  }
}

export function shouldCreateLdapUser(employeeId?: string | null) {
  return Boolean(employeeId)
}
