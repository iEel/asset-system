export const storedSecretPlaceholder = "__STORED_SECRET__"

const secretSystemSettingKeys: ReadonlySet<string> = new Set(["ldap_bind_password"])

type SettingEntry = { key: string; value: string }

export function isSecretSystemSettingKey(key: string) {
  return secretSystemSettingKeys.has(key)
}

export function maskSecretSystemSettings<T extends SettingEntry>(settings: T[]): T[] {
  return settings.map((setting) =>
    isSecretSystemSettingKey(setting.key) && setting.value
      ? { ...setting, value: storedSecretPlaceholder }
      : setting,
  )
}

export function resolveSubmittedSecretSettings<T extends SettingEntry>(
  submitted: T[],
  storedValues: ReadonlyMap<string, string | undefined>,
): T[] {
  return submitted.map((setting) =>
    isSecretSystemSettingKey(setting.key) && setting.value === storedSecretPlaceholder
      ? { ...setting, value: storedValues.get(setting.key) ?? "" }
      : setting,
  )
}

export function redactSecretSettingValues<T>(values: Record<string, T>): Record<string, T | "[REDACTED]"> {
  return Object.fromEntries(
    Object.entries(values).map(([key, value]) => [key, isSecretSystemSettingKey(key) ? "[REDACTED]" : value]),
  )
}

// LDAP settings decide who can authenticate (and which server receives user passwords),
// so only system administrators may change them. Scheduler status keys are excluded
// because the settings form echoes them back unchanged.
function isSystemAdminOnlySettingKey(key: string) {
  return key.startsWith("ldap_") && !key.startsWith("ldap_sync_last_")
}

export function getRestrictedSettingChangeError(changedKeys: string[], actorRoles: string[]) {
  if (actorRoles.includes("system_admin")) return null
  const restrictedKey = changedKeys.find(isSystemAdminOnlySettingKey)
  return restrictedKey ? `Forbidden: only system_admin can change ${restrictedKey}` : null
}

type LdapTestSettings = Record<string, string>

export type LdapTestSettingsResolution =
  | { ok: true; settings: LdapTestSettings }
  | { ok: false; error: string }

export function resolveLdapTestSettings(
  submitted: LdapTestSettings,
  stored: LdapTestSettings,
): LdapTestSettingsResolution {
  const submittedPassword = submitted.ldap_bind_password ?? ""
  const typedPassword = submittedPassword !== "" && submittedPassword !== storedSecretPlaceholder
  if (typedPassword) return { ok: true, settings: submitted }

  const sameTarget =
    (submitted.ldap_url ?? "") === (stored.ldap_url ?? "") &&
    (submitted.ldap_bind_dn ?? "") === (stored.ldap_bind_dn ?? "")
  if (!sameTarget) {
    return {
      ok: false,
      error: "Enter the bind password to test a different LDAP server or bind account",
    }
  }

  return {
    ok: true,
    settings: {
      ...submitted,
      ldap_bind_password: submittedPassword === storedSecretPlaceholder ? stored.ldap_bind_password ?? "" : "",
    },
  }
}
