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
}

export function getLdapConfig(): LdapConfig {
  return {
    enabled: process.env.LDAP_ENABLED === "true",
    url: process.env.LDAP_URL ?? "",
    baseDn: process.env.LDAP_BASE_DN ?? "",
    bindDn: process.env.LDAP_BIND_DN ?? null,
    bindPassword: process.env.LDAP_BIND_PASSWORD ?? null,
    userFilter: process.env.LDAP_USER_FILTER ?? "(&(objectClass=user)(sAMAccountName={username}))",
    userDnTemplate: process.env.LDAP_USER_DN_TEMPLATE ?? null,
    upnDomain: process.env.LDAP_UPN_DOMAIN ?? null,
    domain: process.env.LDAP_DOMAIN ?? null,
    autoProvision: process.env.LDAP_AUTO_PROVISION === "true",
    defaultRole: process.env.LDAP_DEFAULT_ROLE ?? "asset_user",
  }
}

export async function authenticateLdapUser(username: string, password: string): Promise<LdapProfile | null> {
  const config = getLdapConfig()

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
