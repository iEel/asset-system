import { Client, type Entry } from "ldapts"

export type LdapProfile = {
  username: string
  displayName: string
  email: string | null
  employeeCode: string | null
}

type LdapConfig = {
  enabled: boolean
  url: string
  baseDn: string
  bindDn: string | null
  bindPassword: string | null
  startTls: boolean
  tlsRejectUnauthorized: boolean
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
  | "ldap_start_tls"
  | "ldap_tls_reject_unauthorized"
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
  | "ldap_sync_schedule"
  | "ldap_sync_default_company_code"
  | "ldap_sync_default_branch_code"
  | "ldap_sync_default_department_code"
  | "ldap_sync_deactivate_missing"
  | "ldap_sync_max_scheduled_deactivations",
  string
>>

export function getLdapConfig(settings: LdapConfigInput = {}): LdapConfig {
  return {
    enabled: settingOrEnv(settings.ldap_enabled, "LDAP_ENABLED") === "true",
    url: settingOrEnv(settings.ldap_url, "LDAP_URL"),
    baseDn: settingOrEnv(settings.ldap_base_dn, "LDAP_BASE_DN"),
    bindDn: nullableSettingOrEnv(settings.ldap_bind_dn, "LDAP_BIND_DN"),
    bindPassword: nullableSettingOrEnv(settings.ldap_bind_password, "LDAP_BIND_PASSWORD"),
    startTls: settingOrEnv(settings.ldap_start_tls, "LDAP_START_TLS", "false") === "true",
    tlsRejectUnauthorized: settingOrEnv(settings.ldap_tls_reject_unauthorized, "LDAP_TLS_REJECT_UNAUTHORIZED", "true") !== "false",
    userFilter: normalizeLdapFilter(
      settingOrEnv(settings.ldap_user_filter, "LDAP_USER_FILTER", "(&(objectClass=user)(sAMAccountName={username}))")
    ),
    userDnTemplate: nullableSettingOrEnv(settings.ldap_user_dn_template, "LDAP_USER_DN_TEMPLATE"),
    upnDomain: nullableSettingOrEnv(settings.ldap_upn_domain, "LDAP_UPN_DOMAIN"),
    domain: nullableSettingOrEnv(settings.ldap_domain, "LDAP_DOMAIN"),
    autoProvision: settingOrEnv(settings.ldap_auto_provision, "LDAP_AUTO_PROVISION") === "true",
    defaultRole: settingOrEnv(settings.ldap_default_role, "LDAP_DEFAULT_ROLE", "asset_user"),
    syncEnabled: settingOrEnv(settings.ldap_sync_enabled, "LDAP_SYNC_ENABLED") === "true",
    syncBaseDn: nullableSettingOrEnv(settings.ldap_sync_base_dn, "LDAP_SYNC_BASE_DN"),
    syncFilter: normalizeLdapFilter(
      settingOrEnv(
        settings.ldap_sync_filter,
        "LDAP_SYNC_FILTER",
        "(&(objectCategory=person)(objectClass=user)(employeeID=*)(company=*)(!(userAccountControl:1.2.840.113556.1.4.803:=2)))"
      )
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

  const client = createLdapClient(config)

  try {
    await maybeStartTls(client, config)

    if (config.bindDn && config.bindPassword) {
      await client.bind(config.bindDn, config.bindPassword)

      if (!config.baseDn) {
        return null
      }

      const { searchEntries } = await client.search(config.baseDn, {
        scope: "sub",
        sizeLimit: 1,
        filter: config.userFilter.replaceAll("{username}", escapeLdapFilterValue(username)),
        attributes: ["dn", "employeeID", "displayName", "cn", "mail", "userPrincipalName", "sAMAccountName"],
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
        attributes: ["dn", "employeeID", "displayName", "cn", "mail", "userPrincipalName", "sAMAccountName"],
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
      employeeCode: null,
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

  const client = createLdapClient(config)

  try {
    await maybeStartTls(client, config)
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
    return { ok: false, message: formatLdapError(error) }
  } finally {
    await client.unbind().catch(() => undefined)
  }
}

export async function searchLdapSyncUsers(
  settings?: LdapConfigInput,
  options: { requireSyncEnabled?: boolean } = {}
) {
  const config = getLdapConfig(settings)
  const requireSyncEnabled = options.requireSyncEnabled ?? true

  if (!config.enabled) {
    throw new Error("LDAP is disabled")
  }
  if (requireSyncEnabled && !config.syncEnabled) {
    throw new Error("LDAP sync is disabled")
  }
  if (!config.url || !config.bindDn || !config.bindPassword) {
    throw new Error("LDAP URL, Bind DN, and Bind Password are required")
  }

  const baseDn = config.syncBaseDn || config.baseDn
  if (!baseDn) {
    throw new Error("LDAP sync base DN is required")
  }

  const client = createLdapClient(config)

  try {
    await maybeStartTls(client, config)
    await client.bind(config.bindDn, config.bindPassword)
    const { searchEntries } = await client.search(baseDn, {
      scope: "sub",
      paged: { pageSize: 500 },
      filter: config.syncFilter,
      attributes: [
        "dn",
        "employeeID",
        "sAMAccountName",
        "userPrincipalName",
        "displayName",
        "cn",
        "givenName",
        "sn",
        "mail",
        "title",
        "department",
        "company",
        "distinguishedName",
      ],
    })

    return searchEntries
      .filter((entry) => !isExcludedSyncEntry(entry))
      .map(profileFromSyncEntry)
      .filter((profile) => profile.code)
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

function createLdapClient(config: LdapConfig) {
  const useLdaps = config.url.toLowerCase().startsWith("ldaps://")

  return new Client({
    url: config.url,
    timeout: Number(process.env.LDAP_TIMEOUT_MS ?? 8000),
    connectTimeout: Number(process.env.LDAP_CONNECT_TIMEOUT_MS ?? 8000),
    ...(useLdaps
      ? {
          tlsOptions: {
            rejectUnauthorized: config.tlsRejectUnauthorized,
          },
        }
      : {}),
  })
}

async function maybeStartTls(client: Client, config: LdapConfig) {
  if (!config.startTls || !config.url.toLowerCase().startsWith("ldap://")) {
    return
  }

  await client.startTLS({ rejectUnauthorized: config.tlsRejectUnauthorized })
}

function profileFromEntry(username: string, entry: Entry): LdapProfile {
  const ldapUsername = normalizeLoginName(getEntryString(entry, "sAMAccountName") ?? username)

  return {
    username: ldapUsername,
    displayName: getEntryString(entry, "displayName") ?? getEntryString(entry, "cn") ?? username,
    email: getEntryString(entry, "mail") ?? getEntryString(entry, "userPrincipalName"),
    employeeCode: getEntryString(entry, "employeeID")?.trim() || null,
  }
}

function profileFromSyncEntry(entry: Entry) {
  const dn = getEntryString(entry, "distinguishedName") ?? entry.dn
  const ous = getOrganizationalUnits(dn ?? "")
  const departmentName = ous.length > 1 ? ous[0] : null
  const branchName = ous.length > 1 ? ous[1] : ous[0] ?? null
  const username = normalizeLoginName(getEntryString(entry, "sAMAccountName") ?? getEntryString(entry, "userPrincipalName") ?? "")
  const code = getEntryString(entry, "employeeID") ?? username
  const displayName = getEntryString(entry, "displayName") ?? getEntryString(entry, "cn") ?? username

  return {
    dn,
    code: code.trim(),
    username: username.trim(),
    displayName: displayName.trim(),
    email: getEntryString(entry, "mail") ?? getEntryString(entry, "userPrincipalName"),
    position: getEntryString(entry, "title"),
    companyName: getEntryString(entry, "company"),
    departmentName: departmentName ?? getEntryString(entry, "department"),
    branchName,
  }
}

function isExcludedSyncEntry(entry: Entry) {
  const dn = getEntryString(entry, "distinguishedName") ?? entry.dn ?? ""
  const normalizedDn = dn.toLowerCase()

  return normalizedDn.includes("ou=allow teamviwer,")
}

function normalizeLoginName(value: string) {
  const trimmed = value.trim()
  if (!trimmed.includes("@")) {
    return trimmed
  }

  return trimmed.split("@")[0]
}

function getOrganizationalUnits(dn: string) {
  return splitLdapDn(dn)
    .map((part) => part.trim())
    .filter((part) => part.toLowerCase().startsWith("ou="))
    .map((part) => unescapeLdapDnValue(part.slice(3)))
    .filter(Boolean)
}

function splitLdapDn(dn: string) {
  const parts: string[] = []
  let current = ""
  let escaped = false

  for (const char of dn) {
    if (escaped) {
      current += char
      escaped = false
      continue
    }

    if (char === "\\") {
      current += char
      escaped = true
      continue
    }

    if (char === ",") {
      parts.push(current)
      current = ""
      continue
    }

    current += char
  }

  if (current) {
    parts.push(current)
  }

  return parts
}

function unescapeLdapDnValue(value: string) {
  return value.replace(/\\([,+"\\<>;=# ])/g, "$1").trim()
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

function normalizeLdapFilter(value: string) {
  const trimmed = value.trim()
  if (
    (trimmed.startsWith('"') && trimmed.endsWith('"')) ||
    (trimmed.startsWith("'") && trimmed.endsWith("'"))
  ) {
    return trimmed.slice(1, -1).trim()
  }

  return trimmed
}

function formatLdapError(error: unknown) {
  const message = error instanceof Error ? error.message : "LDAP connection failed"
  const normalizedMessage = message.toLowerCase()

  if (
    normalizedMessage.includes("unable to verify the first certificate") ||
    normalizedMessage.includes("self-signed certificate") ||
    normalizedMessage.includes("certificate")
  ) {
    return `${message}. LDAPS certificate is not trusted by Node.js. Use a hostname that matches the DC certificate and install the AD root CA, run Node with --use-system-ca, or disable LDAPS certificate verification only for trusted internal testing.`
  }

  if (normalizedMessage.includes("econnreset")) {
    return `${message}. The LDAP server reset the connection. If this AD requires encrypted bind, try LDAPS on port 636.`
  }

  if (normalizedMessage.includes("data 52e") || normalizedMessage.includes("invalid credentials")) {
    return `${message}. AD rejected the Bind DN/password. Verify the bind account password and try using UPN format (user@domain) or DOMAIN\\user if DN bind is not accepted.`
  }

  return message
}

function settingOrEnv(value: string | undefined, envKey: string, fallback = "") {
  return value?.trim() || process.env[envKey] || fallback
}

function nullableSettingOrEnv(value: string | undefined, envKey: string) {
  return settingOrEnv(value, envKey) || null
}
