// The settings form's rules, one setting at a time (V track plan 3, spec
// docs/superpowers/specs/2026-10-17-v-track-field-errors-design.md §4.4, §4.5, U8). The form sends every setting in one
// list, and the server keys a refused setting settings.<key> (settingFieldKeyFor), so the form's field keys are the same.
// Each rule answers the code the server's systemSettingsUpdateSchema answers for the same setting (its api-error catalog
// key, or the shared tooLong), so a rule the form finds and the same rule the server finds read one sentence under one
// field. tests/v-track3.test.ts runs both on the same values.
import { assetLabelLayouts, assetLabelSettingKeys, assetLabelTapeSizes, assetLabelTemplateTokens } from "@/lib/asset-label-template"
import { depreciationPolicySettingKey, parseDepreciationPolicySetting } from "@/lib/asset-depreciation"
import { assetQrPublicBaseUrlKey, normalizePublicQrBaseUrl } from "@/lib/asset-qr"
import { normalizeCategoryPrefix, type CategoryPrefixRow } from "@/lib/category-prefix-groups"
import { ldapSyncMaxScheduledDeactivationsKey } from "@/lib/ldap-sync-safety"
import { validateOperationDocumentTemplate } from "@/lib/operation-document-number"
import { isValidRetentionDays, retentionPolicySettingKeys } from "@/lib/retention-policy"
import { isSupportedCronExpression } from "@/lib/scheduled-job"
import {
  assetTagCategoryPrefixesKey,
  assetTagFormatTemplateKey,
  checkinDocumentTemplateKey,
  checkoutDocumentTemplateKey,
  notificationRuleSettingKeys,
  operationDocumentRunningDigitsKey,
} from "@/lib/system-setting-defaults"
import { range, step, wholeNumber } from "@/lib/validation-rules"
import { workflowApprovalMinApproversKey, workflowApprovalSettingKeys, workflowApprovalSlaDaysKey } from "@/lib/workflow-approval"

export type SettingEntry = { key: string; value: string }
export type SettingFieldKey = `settings.${string}`

export function settingFieldKey(key: string): SettingFieldKey {
  return `settings.${key}`
}

// The setting a field key names: settings.<key> → <key>.
export function settingKeyOf(field: string): string {
  return field.startsWith("settings.") ? field.slice("settings.".length) : field
}

// The tokens an asset tag template may use (the server's list).
export const assetTagFormatTokens = [
  "companyCode",
  "assetCompanyCode",
  "branchCode",
  "categoryCode",
  "assetPrefix",
  "globalPrefix",
  "year",
  "year2",
  "month",
  "day",
  "running",
  "separator",
]

const templateTokens = (value: string) => Array.from(value.matchAll(/\{([A-Za-z0-9]+)\}/g)).map((match) => match[1])
const labelTemplateKeys = new Set<string>(assetLabelSettingKeys.filter((key) => key.endsWith("_template")))
const labelKeys = (suffix: string) => new Set<string>(assetLabelTapeSizes.map((size) => `asset_label_${size}_${suffix}`))
const labelWidthKeys = labelKeys("width_mm")
const labelHeightKeys = labelKeys("height_mm")
const labelQrSizeKeys = labelKeys("qr_size")
const labelSpacingKeys = new Set<string>([...labelKeys("margin_mm"), ...labelKeys("gap_mm")])
const labelLayoutKeys = labelKeys("layout")
const notificationKeys = new Set<string>(notificationRuleSettingKeys)
const retentionKeys = new Set<string>(retentionPolicySettingKeys)
const approvalToggleKeys = new Set<string>(
  workflowApprovalSettingKeys.filter((key) => key !== workflowApprovalMinApproversKey && key !== workflowApprovalSlaDaysKey)
)
const outside = (value: string, min: number, max: number) => {
  const number = Number(value)
  return !Number.isFinite(number) || number < min || number > max
}
const notWhole = (value: string, min: number, max: number) => {
  const number = Number(value)
  return !Number.isInteger(number) || number < min || number > max
}

// The server's rule for one setting, on the trimmed value it checks: its catalog code, or null.
export function settingRuleCode(key: string, value: string): string | null {
  if (key === assetTagFormatTemplateKey) {
    return !value.includes("{running}") || templateTokens(value).some((token) => !assetTagFormatTokens.includes(token)) ? "assetTagTemplateInvalid" : null
  }
  if (key === "asset_label_default_tape_size") return assetLabelTapeSizes.includes(value as (typeof assetLabelTapeSizes)[number]) ? null : "labelTapeSizeInvalid"
  if (key === assetQrPublicBaseUrlKey) return value && !normalizePublicQrBaseUrl(value) ? "publicQrUrlInvalid" : null
  if (labelWidthKeys.has(key)) return outside(value, 30, 120) ? "labelWidthRange" : null
  if (labelQrSizeKeys.has(key)) return outside(value, 20, 90) ? "labelQrSizeRange" : null
  if (labelHeightKeys.has(key)) return outside(value, 10, 100) ? "labelHeightRange" : null
  if (labelSpacingKeys.has(key)) return outside(value, 0, 10) ? "labelSpacingRange" : null
  if (labelLayoutKeys.has(key)) return assetLabelLayouts.includes(value as (typeof assetLabelLayouts)[number]) ? null : "labelLayoutUnsupported"
  if (key === "asset_label_compact_asset_name_enabled") return value === "true" || value === "false" ? null : "labelToggleInvalid"
  if (labelTemplateKeys.has(key)) {
    return templateTokens(value).some((token) => !(assetLabelTemplateTokens as readonly string[]).includes(token)) ? "labelTemplateTokens" : null
  }
  if (key === checkoutDocumentTemplateKey || key === checkinDocumentTemplateKey) return validateOperationDocumentTemplate(value) ? null : "documentTemplateInvalid"
  if (key === operationDocumentRunningDigitsKey) return outside(value, 1, 12) ? "documentRunningDigitsRange" : null
  if (notificationKeys.has(key)) return notWhole(value, 0, 365) ? "notificationDaysRange" : null
  if (retentionKeys.has(key)) return isValidRetentionDays(value) ? null : "retentionDaysRange"
  if (key === "ldap_sync_mode") return ["preview", "manual", "scheduled"].includes(value) ? null : "schedulerModeInvalid"
  if (key === "ldap_sync_schedule") return isSupportedCronExpression(value) ? null : "schedulerCronInvalid"
  if (key === depreciationPolicySettingKey) return parseDepreciationPolicySetting(value).isValid ? null : "depreciationPolicyInvalid"
  if (approvalToggleKeys.has(key)) return value === "true" || value === "false" ? null : "approvalToggleInvalid"
  if (key === workflowApprovalMinApproversKey) return notWhole(value, 1, 5) ? "approvalMinApproversRange" : null
  if (key === workflowApprovalSlaDaysKey) return notWhole(value, 1, 90) ? "approvalSlaDaysRange" : null
  return null
}

// What the control itself allowed before noValidate, where the server allows more: the asset tag's running digits
// (min 1, max 12), the LDAP sync's deactivation limit (min 0), whole numbers (the shared wholeNumber, v-track final
// task 1) and the 0.5 step of a label's margin and gap. Client rules only (spec §6.3: no new server rule); a save checks
// them only on the settings it changes (settingSaveErrors).
export function settingControlCode(key: string, value: string): string | null {
  if (key === "asset_tag_running_digits") return range(value, 1, 12) ?? wholeNumber(value)
  if (key === ldapSyncMaxScheduledDeactivationsKey) return range(value, 0) ?? wholeNumber(value)
  if (key === operationDocumentRunningDigitsKey || labelWidthKeys.has(key) || labelHeightKeys.has(key) || labelQrSizeKeys.has(key)) return wholeNumber(value)
  if (labelSpacingKeys.has(key)) return step(value, 0.5)
  return null
}

// The limits a control's own rule names in its message (outOfRange reads them).
export const settingControlParams: Readonly<Record<string, { min: number; max?: number }>> = {
  asset_tag_running_digits: { min: 1, max: 12 },
  [ldapSyncMaxScheduledDeactivationsKey]: { min: 0 },
}

// The settings whose rule a box showed while the person typed (the 12 boxes of the page, spec U8): the same rule now
// shows under its field while the value breaks it. Every other rule waits for save (U6).
export function isLiveSetting(key: string): boolean {
  return (
    key === assetTagFormatTemplateKey ||
    key === assetQrPublicBaseUrlKey ||
    labelTemplateKeys.has(key) ||
    labelWidthKeys.has(key) ||
    labelHeightKeys.has(key) ||
    labelQrSizeKeys.has(key) ||
    labelSpacingKeys.has(key) ||
    labelLayoutKeys.has(key) ||
    key === checkoutDocumentTemplateKey ||
    key === checkinDocumentTemplateKey ||
    key === operationDocumentRunningDigitsKey ||
    notificationKeys.has(key) ||
    retentionKeys.has(key) ||
    key === depreciationPolicySettingKey ||
    approvalToggleKeys.has(key) ||
    key === workflowApprovalMinApproversKey ||
    key === workflowApprovalSlaDaysKey ||
    key === "ldap_sync_schedule"
  )
}

// A category prefix: 2 to 10 letters A-Z or digits (the prefix editor's rule, and each group of the prefix table).
export function isValidCategoryPrefix(prefix: string) {
  return /^[A-Z0-9]{2,10}$/.test(normalizeCategoryPrefix(prefix))
}

// The prefix table has no server rule: a group whose prefix breaks the editor's rule (only stored data can hold one)
// shows the editor's own sentence, systemSettingsPage.invalidPrefix, under the table.
function prefixRowsCode(rows: readonly CategoryPrefixRow[]): string | null {
  return rows.some((row) => row.categoryId && !isValidCategoryPrefix(row.prefix)) ? "invalidPrefix" : null
}

// The errors a save finds, per setting sent: the server's 5000-character limit and its rule on every setting, then the
// control's own rule on the settings this save changes only (changedKeys, compared with the stored values by the form):
// a value stored before noValidate that only a control's limit refuses does not stop a save of another setting, as
// spec §7.4 treats the asset edit form's warranty pair (plan 3 open issue 13). And the prefix groups of the active
// categories.
export function settingSaveErrors(entries: readonly SettingEntry[], prefixRows: readonly CategoryPrefixRow[], changedKeys: ReadonlySet<string>) {
  const errors: Partial<Record<SettingFieldKey, string>> = {}
  for (const { key, value } of entries) {
    const trimmed = value.trim()
    const code = (trimmed.length > 5000 ? "tooLong" : null) ?? settingRuleCode(key, trimmed) ?? (changedKeys.has(key) ? settingControlCode(key, trimmed) : null)
    if (code) errors[settingFieldKey(key)] = code
  }
  const prefixCode = prefixRowsCode(prefixRows)
  if (prefixCode) errors[settingFieldKey(assetTagCategoryPrefixesKey)] = prefixCode
  return errors
}

// The errors shown while the person types: the server's rule of each live setting, and the prefix groups.
export function settingLiveErrors(entries: readonly SettingEntry[], prefixRows: readonly CategoryPrefixRow[]) {
  const errors: Partial<Record<SettingFieldKey, string>> = {}
  for (const { key, value } of entries) {
    const code = isLiveSetting(key) ? settingRuleCode(key, value.trim()) : null
    if (code) errors[settingFieldKey(key)] = code
  }
  const prefixCode = prefixRowsCode(prefixRows)
  if (prefixCode) errors[settingFieldKey(assetTagCategoryPrefixesKey)] = prefixCode
  return errors
}
