export type LdapSyncSource = "manual" | "scheduled"

export function resolveLdapSyncAuditMetadata(userId?: string, source: LdapSyncSource = "manual") {
  if (source === "scheduled") {
    return {
      userId: undefined,
      remark: "LDAP employee sync applied (scheduled)",
    }
  }

  return {
    userId,
    remark: "LDAP employee sync applied",
  }
}
