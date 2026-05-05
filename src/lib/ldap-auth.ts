import { Client, type Entry } from "ldapts"

export type LdapProfile = {
  username: string
  displayName: string
  email: string | null
}

type LdapConfig = {
  enabled: boolean
  url: string
  baseDn: string
  bindDn: string | null
  bindPassword: string | null
  userFilter: string
  userDnTemplate: string | null
  upnDomain: string | null
  domain: string | null
  autoProvision: boolean
  defaultRole: string
  syncEnabled: boolean
  syncBaseDn: string | null
  syncFilter: string
  syncMode: string
  syncSchedule: string
}

export type LdapConfigInput = Partial<Record<
  | "ldap_enabled"
  | "ldap_url"
  | "ldap_base_dn"
  | "ldap_bind_dn"
  | "ldap_bind_password"
  | "ldap_user_filter"
  | "ldap_user_dn_template"
  | "ldap_upn_domain"
  | "ldap_domain"
  | "ldap_auto_provision"
  | "ldap_default_role"
  | "ldap_sync_enabled"
  | "ldap_sync_base_dn"
  | "ldap_sync_filter"
  | "ldap_sync_mode"
  | "ldap_sync_schedule",
  string
>>

export function getLdapConfig(settings: LdapConfigInput = {}): LdapConfig {
  return {
    enabled: settingOrEnv(settings.ldap_enabled, "LDAP_ENABLED") === "true",
    url: settingOrEnv(settings.ldap_url, "LDAP_URL"),
    baseDn: settingOrEnv(settings.ldap_base_dn, "LDAP_BASE_DN"),
    bindDn: nullableSettingOrEnv(settings.ldap_bind_dn, "LDAP_BIND_DN"),
    bindPassword: nullableSettingOrEnv(settings.ldap_bind_password, "LDAP_BIND_PASSWORD"),
    userFilter: settingOrEnv(settings.ldap_user_filter, "LDAP_USER_FILTER", "(&(objectClass=user)(sAMAccountName={username}))"),
    userDnTemplate: nullableSettingOrEnv(settings.ldap_user_dn_template, "LDAP_USER_DN_TEMPLATE"),
    upnDomain: nullableSettingOrEnv(settings.ldap_upn_domain, "LDAP_UPN_DOMAIN"),
    domain: nullableSettingOrEnv(settings.ldap_domain, "LDAP_DOMAIN"),
    autoProvision: settingOrEnv(settings.ldap_auto_provision, "LDAP_AUTO_PROVISION") === "true",
    defaultRole: settingOrEnv(settings.ldap_default_role, "LDAP_DEFAULT_ROLE", "asset_user"),
    syncEnabled: settingOrEnv(settings.ldap_sync_enabled, "LDAP_SYNC_ENABLED") === "true",
    syncBaseDn: nullableSettingOrEnv(settings.ldap_sync_base_dn, "LDAP_SYNC_BASE_DN"),
    syncFilter: settingOrEnv(
      settings.ldap_sync_filter,
      "LDAP_SYNC_FILTER",
      "(&(objectClass=user)(!(userAccountControl:1.2.840.113556.1.4.803:=2)))"
    ),
    syncMode: settingOrEnv(settings.ldap_sync_mode, "LDAP_SYNC_MODE", "preview"),
    syncSchedule: settingOrEnv(settings.ldap_sync_schedule, "LDAP_SYNC_SCHEDULE", "0 2 * * *"),
  }
}

export async function authenticateLdapUser(username: string, password: string, settings?: LdapConfigInput): Promise<LdapProfile | null> {
  const config = getLdapConfig(settings)

  if (!config.enabled || !config.url || !username || !password) {
    return null
  }

  const client = new Client({
    url: config.url,
    timeout: Number(process.env.LDAP_TIMEOUT_MS ?? 8000),
    connectTimeout: Number(process.env.LDAP_CONNECT_TIMEOUT_MS ?? 8000),
    tlsOptions: {
      rejectUnauthorized: process.env.LDAP_TLS_REJECT_UNAUTHORIZED !== "false",
    },
  })

  try {
    if (config.bindDn && config.bindPassword) {
      await client.bind(config.bindDn, config.bindPassword)

      if (!config.baseDn) {
        return null
      }

      const { searchEntries } = await client.search(config.baseDn, {
        scope: "sub",
        sizeLimit: 1,
        filter: config.userFilter.replaceAll("{username}", escapeLdapFilterValue(username)),
        attributes: ["dn", "displayName", "cn", "mail", "userPrincipalName", "sAMAccountName"],
      })
      const entry = searchEntries[0]

      if (!entry?.dn) {
        return null
      }

      await client.bind(entry.dn, password)
      return profileFromEntry(username, entry)
    }

    const bindIdentity = getDirectBindIdentity(username, config)
    await client.bind(bindIdentity, password)

    if (config.baseDn) {
      const { searchEntries } = await client.search(config.baseDn, {
        scope: "sub",
        sizeLimit: 1,
        filter: config.userFilter.replaceAll("{username}", escapeLdapFilterValue(username)),
        attributes: ["dn", "displayName", "cn", "mail", "userPrincipalName", "sAMAccountName"],
      })
      const entry = searchEntries[0]

      if (entry) {
        return profileFromEntry(username, entry)
      }
    }

    return {
      username,
      displayName: username,
      email: null,
    }
  } catch {
    return null
  } finally {
    await client.unbind().catch(() => undefined)
  }
}

export async function testLdapConnection(settings?: LdapConfigInput) {
  const config = getLdapConfig(settings)

  if (!config.enabled) {
    return { ok: false, message: "LDAP is disabled" }
  }
  if (!config.url) {
    return { ok: false, message: "LDAP URL is required" }
  }
  if (!config.bindDn || !config.bindPassword) {
    return { ok: false, message: "Bind DN and bind password are required for connection test" }
  }

  const client = new Client({
    url: config.url,
    timeout: Number(process.env.LDAP_TIMEOUT_MS ?? 8000),
    connectTimeout: Number(process.env.LDAP_CONNECT_TIMEOUT_MS ?? 8000),
    tlsOptions: {
      rejectUnauthorized: process.env.LDAP_TLS_REJECT_UNAUTHORIZED !== "false",
    },
  })

  try {
    await client.bind(config.bindDn, config.bindPassword)

    if (config.baseDn) {
      await client.search(config.baseDn, {
        scope: "base",
        sizeLimit: 1,
        attributes: ["dn"],
      })
    }

    return { ok: true, message: "LDAP connection succeeded" }
  } catch (error) {
    return { ok: false, message: error instanceof Error ? error.message : "LDAP connection failed" }
  } finally {
    await client.unbind().catch(() => undefined)
  }
}

function getDirectBindIdentity(username: string, config: LdapConfig) {
  if (config.userDnTemplate) {
    return config.userDnTemplate.replaceAll("{username}", username)
  }

  if (config.upnDomain && !username.includes("@")) {
    return `${username}@${config.upnDomain}`
  }

  if (config.domain && !username.includes("\\") && !username.includes("@")) {
    return `${config.domain}\\${username}`
  }

  return username
}

function profileFromEntry(username: string, entry: Entry): LdapProfile {
  return {
    username: getEntryString(entry, "sAMAccountName") ?? username,
    displayName: getEntryString(entry, "displayName") ?? getEntryString(entry, "cn") ?? username,
    email: getEntryString(entry, "mail") ?? getEntryString(entry, "userPrincipalName"),
  }
}

function getEntryString(entry: Entry, key: string) {
  const value = entry[key]

  if (Array.isArray(value)) {
    const first = value[0]
    return Buffer.isBuffer(first) ? first.toString("utf8") : first
  }

  return Buffer.isBuffer(value) ? value.toString("utf8") : value ?? null
}

function escapeLdapFilterValue(value: string) {
  return value.replace(/[\0()*\\]/g, (char) => {
    const hex = char.charCodeAt(0).toString(16).padStart(2, "0")
    return `\\${hex}`
  })
}

function settingOrEnv(value: string | undefined, envKey: string, fallback = "") {
  return value?.trim() || process.env[envKey] || fallback
}

function nullableSettingOrEnv(value: string | undefined, envKey: string) {
  return settingOrEnv(value, envKey) || null
}
