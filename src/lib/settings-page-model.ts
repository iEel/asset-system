import type { SettingsTabId } from "./settings-information-architecture.ts"
import { getSystemSettingsTabForKey } from "./settings-search.ts"
import { isSecretSystemSettingKey } from "./system-setting-secrets.ts"

// The pure model behind the settings page (board AD-Settings, group 12 plan 5): the four tab groups, the dirty counts
// on tabs and groups, the Thai label of every setting and the value the change review shows.

export type SettingsGroupKey = "assetsDocuments" | "organizationWork" | "signIn" | "other"

export const SETTINGS_GROUPS: readonly { key: SettingsGroupKey; tabs: readonly SettingsTabId[] }[] = [
  { key: "assetsDocuments", tabs: ["asset-numbering", "label-template", "documents"] },
  { key: "organizationWork", tabs: ["organization", "notifications", "workflow-approval", "automation"] },
  { key: "signIn", tabs: ["ldap-login", "ldap-sync"] },
  { key: "other", tabs: ["governance", "advanced"] },
]

const groupOfTab = new Map<SettingsTabId, SettingsGroupKey>(
  SETTINGS_GROUPS.flatMap((group) => group.tabs.map((tab) => [tab, group.key] as const)),
)

// The tab a setting is edited on; a key the page does not know lands on the advanced tab.
export function tabOfSettingKey(key: string): SettingsTabId {
  return getSystemSettingsTabForKey(key)
}

// tabOf says which tab a key is edited on; the page passes its own rule (a key it shows in the advanced table counts on
// the advanced tab whatever its prefix), the default is the key's prefix rule.
export function dirtyCounts(
  changedKeys: readonly string[],
  tabOf: (key: string) => SettingsTabId = tabOfSettingKey,
): {
  byTab: Partial<Record<SettingsTabId, number>>
  byGroup: Partial<Record<SettingsGroupKey, number>>
  total: number
} {
  const byTab: Partial<Record<SettingsTabId, number>> = {}
  const byGroup: Partial<Record<SettingsGroupKey, number>> = {}
  const keys = new Set(changedKeys)
  for (const key of keys) {
    const tab = tabOf(key)
    byTab[tab] = (byTab[tab] ?? 0) + 1
    const group = groupOfTab.get(tab) ?? "other"
    byGroup[group] = (byGroup[group] ?? 0) + 1
  }
  return { byTab, byGroup, total: keys.size }
}

// SETTING_LABEL_KEYS values are relative to this namespace: useTranslations(SETTING_LABEL_NAMESPACE)(SETTING_LABEL_KEYS[key]).
export const SETTING_LABEL_NAMESPACE = "systemSettingsPage"

const tapeSizes = ["12", "18", "24", "custom"] as const
const tapeFields = [
  "width_mm",
  "height_mm",
  "qr_size",
  "margin_mm",
  "gap_mm",
  "layout",
  "primary_template",
  "secondary_template",
  "tertiary_template",
] as const

// Every known setting key → its label message. Labels the form already shows are reused; the per-tape label fields and
// the two JSON policies have their own label.<key> messages so the review list can tell them apart.
export const SETTING_LABEL_KEYS: Record<string, string> = {
  asset_tag_prefix: "globalPrefix",
  asset_tag_separator: "separator",
  asset_tag_running_digits: "runningDigits",
  asset_tag_format_template: "assetTagFormat",
  asset_tag_category_prefixes: "categoryPrefixes",
  checkout_document_template: "checkoutDocumentTemplate",
  checkin_document_template: "checkinDocumentTemplate",
  operation_document_running_digits: "operationDocumentRunningDigits",
  company_name: "companyName",
  default_currency: "defaultCurrency",
  checkin_department_code: "checkinDepartmentCode",
  accounting_depreciation_policy: "label.accounting_depreciation_policy",
  asset_data_quality_rules: "label.asset_data_quality_rules",
  notification_return_due_soon_days: "returnDueSoonDays",
  notification_audit_action_due_soon_days: "auditActionDueSoonDays",
  notification_warranty_expiry_days: "warrantyExpiryDays",
  notification_license_expiry_days: "licenseExpiryDays",
  retention_attachment_days: "retentionAttachmentDays",
  retention_audit_log_days: "retentionAuditLogDays",
  retention_orphan_file_days: "retentionOrphanFileDays",
  workflow_approval_disposal_required: "workflowApprovalDisposalRequired",
  workflow_approval_audit_close_required: "workflowApprovalAuditCloseRequired",
  workflow_approval_min_approvers: "workflowApprovalMinApprovers",
  workflow_approval_segregation_required: "workflowApprovalSegregationRequired",
  workflow_approval_sla_days: "workflowApprovalSlaDays",
  ldap_enabled: "ldapEnabled",
  ldap_url: "ldapUrl",
  ldap_base_dn: "ldapBaseDn",
  ldap_bind_dn: "ldapBindDn",
  ldap_bind_password: "ldapBindPassword",
  ldap_start_tls: "ldapStartTls",
  ldap_tls_reject_unauthorized: "ldapTlsRejectUnauthorized",
  ldap_user_filter: "ldapUserFilter",
  ldap_upn_domain: "ldapUpnDomain",
  ldap_domain: "ldapDomain",
  ldap_user_dn_template: "ldapUserDnTemplate",
  ldap_auto_provision: "ldapAutoProvision",
  ldap_default_role: "ldapDefaultRole",
  ldap_sync_enabled: "ldapSyncEnabled",
  ldap_sync_base_dn: "ldapSyncBaseDn",
  ldap_sync_filter: "ldapSyncFilter",
  ldap_sync_mode: "ldapSyncMode",
  ldap_sync_schedule: "ldapSyncSchedule",
  ldap_sync_default_company_code: "ldapSyncDefaultCompanyCode",
  ldap_sync_default_branch_code: "ldapSyncDefaultBranchCode",
  ldap_sync_default_department_code: "ldapSyncDefaultDepartmentCode",
  ldap_sync_deactivate_missing: "ldapSyncDeactivateMissing",
  ldap_sync_max_scheduled_deactivations: "ldapSyncMaxScheduledDeactivations",
  asset_label_default_tape_size: "defaultTapeSize",
  asset_label_compact_asset_name_enabled: "compactLabelAssetName",
  asset_qr_public_base_url: "publicQrBaseUrl",
  ...Object.fromEntries(
    tapeSizes.flatMap((size) => tapeFields.map((field) => {
      const key = `asset_label_${size}_${field}`
      return [key, `label.${key}`] as const
    })),
  ),
}

// Settings stored as "true"/"false" and shown as on/off.
const booleanSettingKeys: ReadonlySet<string> = new Set([
  "asset_label_compact_asset_name_enabled",
  "workflow_approval_disposal_required",
  "workflow_approval_audit_close_required",
  "workflow_approval_segregation_required",
  "ldap_enabled",
  "ldap_start_tls",
  "ldap_tls_reject_unauthorized",
  "ldap_auto_provision",
  "ldap_sync_enabled",
  "ldap_sync_deactivate_missing",
])

export const LDAP_DEFAULT_ROLE_KEY = "ldap_default_role"

export type ReviewValue =
  | { kind: "bool"; on: boolean }
  | { kind: "secret" }
  | { kind: "missingRole"; name: string }
  | { kind: "text"; text: string }

// What the change review shows for one value. A secret never carries its value, not even its length.
export function reviewValue(key: string, value: string, context: { roleNames: Set<string> }): ReviewValue {
  if (isSecretSystemSettingKey(key)) return { kind: "secret" }
  if (booleanSettingKeys.has(key)) return { kind: "bool", on: value.trim().toLowerCase() === "true" }
  if (key === LDAP_DEFAULT_ROLE_KEY && value && !context.roleNames.has(value)) return { kind: "missingRole", name: value }
  return { kind: "text", text: value }
}

// An edit of the LDAP settings: any ldap_* key except the sync status the scheduler writes (ldap_sync_last_*).
export function ldapDirty(changedKeys: readonly string[]): boolean {
  return changedKeys.some((key) => key.startsWith("ldap_") && !key.startsWith("ldap_sync_last_"))
}
