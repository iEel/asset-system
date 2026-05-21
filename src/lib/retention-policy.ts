export const retentionAttachmentDaysKey = "retention_attachment_days"
export const retentionAuditLogDaysKey = "retention_audit_log_days"
export const retentionOrphanFileDaysKey = "retention_orphan_file_days"

export const retentionPolicySettingKeys = [
  retentionAttachmentDaysKey,
  retentionAuditLogDaysKey,
  retentionOrphanFileDaysKey,
] as const

export type RetentionPolicySummary = {
  configured: number
  total: number
  invalidKeys: string[]
}

export function summarizeRetentionPolicy(settings: Map<string, string>): RetentionPolicySummary {
  const invalidKeys: string[] = []
  let configured = 0

  for (const key of retentionPolicySettingKeys) {
    if (isValidRetentionDays(settings.get(key))) {
      configured += 1
    } else {
      invalidKeys.push(key)
    }
  }

  return {
    configured,
    total: retentionPolicySettingKeys.length,
    invalidKeys,
  }
}

export function isValidRetentionDays(value: string | undefined) {
  const days = Number(value)
  return Number.isInteger(days) && days >= 1 && days <= 3650
}
