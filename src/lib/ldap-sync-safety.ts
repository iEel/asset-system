export const ldapSyncMaxScheduledDeactivationsKey = "ldap_sync_max_scheduled_deactivations"
export const defaultLdapSyncMaxScheduledDeactivations = 10

export type LdapDeactivationSafetyInput = {
  isScheduled: boolean
  deactivateMissingEnabled: boolean
  deactivationCount: number
  maxScheduledDeactivations: string | number | null | undefined
}

export type LdapDeactivationSafetyResult =
  | {
      status: "safe"
      threshold: number
      reason: null
    }
  | {
      status: "blocked"
      threshold: number
      reason: string
    }

export function evaluateLdapDeactivationSafety(input: LdapDeactivationSafetyInput): LdapDeactivationSafetyResult {
  const threshold = parseScheduledDeactivationThreshold(input.maxScheduledDeactivations)

  if (!input.isScheduled || !input.deactivateMissingEnabled || input.deactivationCount <= threshold) {
    return {
      status: "safe",
      threshold,
      reason: null,
    }
  }

  return {
    status: "blocked",
    threshold,
    reason: `Scheduled LDAP sync would deactivate ${input.deactivationCount} employees, exceeding the safety threshold of ${threshold}. Run a manual preview/apply after reviewing the AD filter and OU mapping.`,
  }
}

function parseScheduledDeactivationThreshold(value: string | number | null | undefined) {
  const parsed = typeof value === "number" ? value : Number(value)
  if (!Number.isInteger(parsed) || parsed < 0) return defaultLdapSyncMaxScheduledDeactivations
  return parsed
}
