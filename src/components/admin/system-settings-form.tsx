"use client"

import { Fragment, useEffect, useState } from "react"
import Link from "next/link"
import { useParams, usePathname, useRouter, useSearchParams } from "next/navigation"
import { useTranslations } from "next-intl"
import { ArrowLeft, ArrowRight, ExternalLink, Pencil, PlugZap, Plus, Save, Trash2 } from "lucide-react"
import { QRCodeSVG } from "qrcode.react"
import { toast } from "sonner"
import { DepreciationPolicyBuilder } from "@/components/admin/depreciation-policy-builder"
import { SearchableSelect } from "@/components/ui/searchable-select"
import { AccessibleDialog, AccessibleDialogBody, AccessibleDialogCancel, AccessibleDialogFooter } from "@/components/ui/accessible-dialog"
import { Button } from "@/components/ui/button"
import { buttonVariants, linkVariants } from "@/components/ui/button-variants"
import { ContentPanel } from "@/components/ui/content-panel"
import { DataTable, DataTableBody, DataTableCell, DataTableHead, DataTableHeader, DataTableRow } from "@/components/ui/data-table"
import { EmptyNote } from "@/components/ui/empty-note"
import { Field, FieldError } from "@/components/ui/field"
import { FieldGroup } from "@/components/ui/field-group"
import { checkboxVariants, fieldLabelClasses } from "@/components/ui/field-variants"
import { FormSection } from "@/components/ui/form-section"
import { Input } from "@/components/ui/input"
import { KeyValueList, type KeyValueItem } from "@/components/ui/key-value-list"
import { NativeSelect } from "@/components/ui/native-select"
import { Nil, orNil } from "@/components/ui/nil"
import { Notice } from "@/components/ui/notice"
import { SearchField } from "@/components/ui/search-field"
import { Segmented } from "@/components/ui/segmented"
import { StatStrip } from "@/components/ui/stat-strip"
import { StatusBadge } from "@/components/ui/status-badge"
import { StickyFormFooter } from "@/components/ui/sticky-form-footer"
import { TabNav } from "@/components/ui/tab-nav"
import { formatCount } from "@/lib/display-format"
import { cn } from "@/lib/utils"
import {
  assetLabelPresets,
  assetLabelSettingKeys,
  assetLabelTapeSizes,
  assetLabelTemplateTokens,
  parseAssetLabelTemplates,
  renderAssetLabelTemplate,
  type AssetLabelTapeSize,
  type AssetLabelTemplates,
} from "@/lib/asset-label-template"
import { depreciationPolicySettingKey } from "@/lib/asset-depreciation"
import { assetQrPublicBaseUrlKey, buildAssetQrValue } from "@/lib/asset-qr"
import {
  assetTagCategoryPrefixesKey,
  assetTagFormatTemplateKey,
  checkinDocumentTemplateKey,
  checkoutDocumentTemplateKey,
  defaultCheckinDocumentTemplate,
  defaultCheckoutDocumentTemplate,
  defaultAssetTagFormatTemplate,
  ldapSettingKeys,
  ldapSyncStatusSettingKeys,
  notificationAuditActionDueSoonDaysKey,
  notificationLicenseExpiryDaysKey,
  notificationReturnDueSoonDaysKey,
  notificationRuleSettingKeys,
  notificationWarrantyExpiryDaysKey,
  operationDocumentRunningDigitsKey,
  operationDocumentSettingKeys,
  retentionPolicySettingKeys,
} from "@/lib/system-setting-defaults"
import { operationDocumentTemplateTokens, renderOperationDocumentTemplate } from "@/lib/operation-document-number"
import { retiredSystemSettingKeys } from "@/lib/retired-system-settings"
import {
  retentionAttachmentDaysKey,
  retentionAuditLogDaysKey,
  retentionOrphanFileDaysKey,
} from "@/lib/retention-policy"
import { getSettingsTabOrder, type SettingsTabId } from "@/lib/settings-information-architecture"
import { buildSystemSettingsTabHref, parseSystemSettingsTab } from "@/lib/system-settings-tabs"
import { findSystemSettingsSearchResults, getSystemSettingsTabForKey } from "@/lib/settings-search"
import { buildSystemLogFilterHref, type LdapSyncHistoryItem } from "@/lib/system-log-history"
import {
  applyCategoryPrefixGroupEdit,
  buildCategoryPrefixGroups,
  filterPrefixRowsByCategoryIds,
  normalizeCategoryPrefix,
  parsePrefixRows,
  serializePrefixRows,
  type CategoryPrefixRow,
} from "@/lib/category-prefix-groups"
import {
  assetTagFormatTokens,
  isValidCategoryPrefix,
  settingControlParams,
  settingFieldKey,
  settingKeyOf,
  settingLiveErrors,
  settingSaveErrors,
  type SettingEntry,
  type SettingFieldKey,
} from "@/lib/system-settings-field-rules"
import { atLeastOne, required } from "@/lib/validation-rules"
import {
  parseWorkflowApprovalPolicy,
  workflowApprovalAuditCloseRequiredKey,
  workflowApprovalDisposalRequiredKey,
  workflowApprovalMinApproversKey,
  workflowApprovalSegregationRequiredKey,
  workflowApprovalSlaDaysKey,
  workflowApprovalSettingKeys,
} from "@/lib/workflow-approval"
import { useApiError } from "@/components/ui/use-api-error"
import { useFieldErrors, useValidationMessage } from "@/components/ui/use-field-errors"
import { ApiErrorText } from "@/components/ui/api-error-text"

type SystemSettingItem = {
  key: string
  value: string
  description?: string | null
}

type SystemSettingsCategory = {
  id: string
  code: string
  name: string
}

type SystemSettingsFormProps = {
  settings: SystemSettingItem[]
  categories: SystemSettingsCategory[]
  defaultRoleOptions: Array<{
    id: string
    label: string
  }>
  ldapSyncHistory: LdapSyncHistoryItem[]
  labels: {
    key: string
    value: string
    description: string
    tabAssetNumbering: string
    tabLabelTemplate: string
    tabDocuments: string
    tabOrganization: string
    tabNotifications: string
    tabWorkflowApproval: string
    tabAutomation: string
    tabGovernance: string
    tabLdapLogin: string
    tabLdapSync: string
    tabAdvanced: string
    settingsOverview: string
    settingsOverviewDescription: string
    overviewAssetTag: string
    overviewLabel: string
    overviewDocuments: string
    overviewOrganization: string
    overviewNotifications: string
    overviewApproval: string
    overviewGovernance: string
    overviewLdapLogin: string
    overviewLdapSync: string
    overviewAdvanced: string
    overviewDays: string
    enabled: string
    disabled: string
    advancedSettingCount: string
    unsavedChanges: string
    noUnsavedChanges: string
    searchSettings: string
    searchSettingsHelp: string
    noSettingsSearchResults: string
    openSettingGroup: string
    changeReview: string
    changeReviewDescription: string
    beforeValue: string
    afterValue: string
    advancedWarningTitle: string
    advancedWarningDescription: string
    showAdvancedSettings: string
    assetTagFormat: string
    assetTagFormatDescription: string
    assetTagTemplate: string
    assetTagTemplateHelp: string
    availableTokens: string
    exampleFormat: string
    formatPresets: string
    presetCompanyPrefixMonthRunning: string
    presetCompanyBranchPrefixRunning: string
    presetGlobalPrefixYearRunning: string
    numberingOptions: string
    runningDigits: string
    separator: string
    globalPrefix: string
    labelPrintTemplate: string
    labelPrintTemplateDescription: string
    compactLabelAssetName: string
    compactLabelAssetNameDescription: string
    compactLabelAssetNameShort: string
    compactLabelAssetNameFull: string
    publicQrBaseUrl: string
    publicQrBaseUrlDescription: string
    publicQrBaseUrlPlaceholder: string
    publicQrPreview: string
    publicQrResolverPath: string
    defaultTapeSize: string
    tape12mmTemplate: string
    tape18mmTemplate: string
    tape24mmTemplate: string
    tapeCustomTemplate: string
    labelPreset: string
    labelWidthMm: string
    labelHeightMm: string
    labelQrSize: string
    labelMarginMm: string
    labelGapMm: string
    labelLayout: string
    labelLayoutQrLeft: string
    labelLayoutQrTop: string
    labelLayoutTextOnly: string
    labelLayoutQrOnly: string
    labelPreview: string
    labelPrimaryLine: string
    labelSecondaryLine: string
    labelTertiaryLine: string
    labelTemplateTokens: string
    operationDocumentNumbers: string
    operationDocumentNumbersDescription: string
    checkoutDocumentTemplate: string
    checkinDocumentTemplate: string
    operationDocumentRunningDigits: string
    operationDocumentTemplateHelp: string
    operationDocumentTokens: string
    checkoutDocumentExample: string
    checkinDocumentExample: string
    categoryPrefixes: string
    categoryPrefixesDescription: string
    noCategoryPrefixes: string
    category: string
    prefix: string
    addPrefix: string
    editPrefix: string
    prefixGroupCount: string
    assignedCategoryCount: string
    categoryCount: string
    unassignedCategoryCount: string
    availableCategories: string
    selectedPrefixCategories: string
    searchCategories: string
    assignedToPrefix: string
    noMatchingCategories: string
    noSelectedCategories: string
    addSelectedCategories: string
    removeSelectedCategories: string
    savePrefixGroup: string
    cancel: string
    categoryPrefixPreview: string
    removePrefix: string
    invalidPrefix: string
    prefixCategoriesRequired: string
    organizationDefaults: string
    organizationDefaultsDescription: string
    companyName: string
    defaultCurrency: string
    accountingDepreciationPolicyDescription: string
    depreciationPolicyBuilderTitle: string
    depreciationPolicyBuilderDescription: string
    depreciationMethod: string
    depreciationMethodStraightLine: string
    depreciationStartBasis: string
    depreciationStartBasisPurchaseDate: string
    depreciationDefaultUsefulLifeMonths: string
    depreciationDefaultResidualPercent: string
    depreciationPolicyGroups: string
    depreciationPolicyGroupName: string
    depreciationUsefulLifeMonths: string
    depreciationResidualPercent: string
    depreciationAvailableCategories: string
    depreciationSelectedCategories: string
    depreciationSearchCategories: string
    depreciationAddGroup: string
    depreciationRemoveGroup: string
    depreciationAddSelectedCategories: string
    depreciationRemoveSelectedCategories: string
    depreciationNoGroups: string
    depreciationNoMatchingCategories: string
    depreciationNoSelectedCategories: string
    depreciationAssignedCategoryConflict: string
    depreciationLegacyRules: string
    depreciationLegacyRulesHelp: string
    depreciationLegacyRuleMonths: string
    depreciationPreviewTitle: string
    depreciationPreviewDescription: string
    depreciationPreviewPurchasePrice: string
    depreciationPreviewPurchaseDate: string
    depreciationPreviewMonthly: string
    depreciationPreviewAccumulated: string
    depreciationPreviewNetBook: string
    depreciationPreviewAgeMonths: string
    depreciationAdvancedJson: string
    depreciationAdvancedJsonDescription: string
    notificationRules: string
    notificationRulesDescription: string
    returnDueSoonDays: string
    auditActionDueSoonDays: string
    warrantyExpiryDays: string
    licenseExpiryDays: string
    notificationDaysHelp: string
    workflowApprovalPolicy: string
    workflowApprovalPolicyDescription: string
    workflowApprovalDisposalRequired: string
    workflowApprovalAuditCloseRequired: string
    workflowApprovalSegregationRequired: string
    workflowApprovalMinApprovers: string
    workflowApprovalMinApproversHelp: string
    workflowApprovalSlaDays: string
    workflowApprovalSlaDaysHelp: string
    workflowApprovalFoundationNote: string
    workflowApprovalSodOn: string
    workflowApprovalSodOff: string
    schedulerSettings: string
    schedulerSettingsDescription: string
    schedulerHeartbeatNote: string
    governanceSettings: string
    governanceSettingsDescription: string
    retentionPolicy: string
    retentionPolicyDescription: string
    retentionAttachmentDays: string
    retentionAuditLogDays: string
    retentionOrphanFileDays: string
    retentionDaysHelp: string
    openStorageGovernance: string
    advancedSettings: string
    advancedSettingsDescription: string
    ldapSettings: string
    ldapSettingsDescription: string
    ldapEnabled: string
    ldapUrl: string
    ldapBaseDn: string
    ldapBindDn: string
    ldapBindPassword: string
    ldapStartTls: string
    ldapTlsRejectUnauthorized: string
    ldapUserFilter: string
    ldapUpnDomain: string
    ldapDomain: string
    ldapUserDnTemplate: string
    ldapAutoProvision: string
    ldapDefaultRole: string
    ldapDefaultRolePlaceholder: string
    ldapDefaultRoleHelp: string
    ldapDefaultRoleMissing: string
    searchSelectPlaceholder: string
    searchSelectNoResults: string
    ldapSyncStrategy: string
    ldapSyncStrategyDescription: string
    ldapSyncEnabled: string
    ldapSyncBaseDn: string
    ldapSyncFilter: string
    ldapSyncMode: string
    ldapSyncModePreview: string
    ldapSyncModeManual: string
    ldapSyncModeScheduled: string
    ldapSyncSchedule: string
    ldapSyncCustomSchedule: string
    ldapSyncDaily2am: string
    ldapSyncEvery6Hours: string
    ldapSyncWeekday2am: string
    ldapSyncMonday2am: string
    ldapSyncDefaultMapping: string
    ldapSyncDefaultMappingDescription: string
    ldapSyncDefaultCompanyCode: string
    ldapSyncDefaultBranchCode: string
    ldapSyncDefaultDepartmentCode: string
    ldapSyncDeactivateMissing: string
    ldapSyncMaxScheduledDeactivations: string
    ldapSyncPreview: string
    ldapSyncApply: string
    ldapSyncPreviewTitle: string
    ldapSyncTotal: string
    ldapSyncCreates: string
    ldapSyncUpdates: string
    ldapSyncDeactivates: string
    ldapSyncAppliedTitle: string
    ldapSyncAppliedCreated: string
    ldapSyncAppliedUpdated: string
    ldapSyncAppliedDeactivated: string
    ldapSyncAppliedUsersDeactivated: string
    ldapSyncBlockers: string
    ldapSyncDeactivateImpactTitle: string
    ldapSyncDeactivateImpactDescription: string
    ldapSyncDeactivateImpactAssets: string
    ldapSyncDeactivateImpactUsers: string
    ldapSyncOpenAssets: string
    ldapSyncNoDeactivateImpact: string
    ldapSyncNoPreview: string
    ldapSyncPreviewSuccess: string
    ldapSyncApplySuccess: string
    ldapSyncFailed: string
    ldapSyncRecommendation: string
    ldapSyncHistoryTitle: string
    ldapSyncHistoryDescription: string
    ldapSyncHistoryEmpty: string
    ldapSyncHistoryViewAll: string
    ldapSyncHistoryRunBy: string
    ldapSyncHistoryStartedAt: string
    ldapSyncHistoryBlockers: string
    ldapStepConnection: string
    ldapStepLoginMapping: string
    ldapStepProvisioning: string
    ldapStepSyncStrategy: string
    ldapStepOrgMapping: string
    ldapStepSchedule: string
    ldapStepPreviewApply: string
    testLdapConnection: string
    ldapTestSuccess: string
    ldapTestFailed: string
    save: string
    success: string
    error: string
  }
}

type LdapSyncChange = {
  code: string
  name: string
  email: string | null
  reason: string
}

type LdapSyncPreview = {
  total: number
  creates: LdapSyncChange[]
  updates: LdapSyncChange[]
  deactivates: LdapSyncChange[]
  deactivationImpacts?: LdapDeactivationImpact[]
  blockers: string[]
  applied?: {
    created: number
    updated: number
    deactivated: number
    deactivatedUsers?: number
  }
}

type LdapDeactivationImpact = {
  employeeId: string
  code: string
  name: string
  email: string | null
  activeAssetCount: number
  activeUserCount: number
  assets: Array<{
    id: string
    assetTag: string
    name: string
  }>
}

const formatPresets = [
  {
    labelKey: "presetCompanyPrefixMonthRunning",
    value: "{assetCompanyCode}{separator}{assetPrefix}{separator}{month}{separator}{running}",
  },
  {
    labelKey: "presetCompanyBranchPrefixRunning",
    value: defaultAssetTagFormatTemplate,
  },
  {
    labelKey: "presetGlobalPrefixYearRunning",
    value: "{globalPrefix}{separator}{assetPrefix}{separator}{year2}{separator}{running}",
  },
] as const

const friendlySettingKeys = new Set([
  "asset_tag_prefix",
  "asset_tag_separator",
  "asset_tag_running_digits",
  "company_name",
  "default_currency",
  depreciationPolicySettingKey,
  assetTagCategoryPrefixesKey,
  assetTagFormatTemplateKey,
  assetQrPublicBaseUrlKey,
  ...assetLabelSettingKeys,
  ...operationDocumentSettingKeys,
  ...notificationRuleSettingKeys,
  ...retentionPolicySettingKeys,
  ...workflowApprovalSettingKeys,
  ...ldapSettingKeys,
  ...ldapSyncStatusSettingKeys,
])

const ldapSchedulePresets = [
  { value: "0 2 * * *", labelKey: "ldapSyncDaily2am" },
  { value: "0 */6 * * *", labelKey: "ldapSyncEvery6Hours" },
  { value: "0 2 * * 1-5", labelKey: "ldapSyncWeekday2am" },
  { value: "0 2 * * 1", labelKey: "ldapSyncMonday2am" },
  { value: "custom", labelKey: "ldapSyncCustomSchedule" },
] as const

// Each setting the form shows, in visual order (the tabs in their order, then down each tab), with the id focus moves to
// (v-track M-R1, plan 3 ST-R4). The form's field keys are the server's, settings.<key>. A tape's nine label settings
// follow its panel; the advanced settings come after all of these, in the page's order, as setting-<key>.
const LABEL_FIELD_SUFFIXES = ["width_mm", "height_mm", "qr_size", "margin_mm", "gap_mm", "layout", "primary_template", "secondary_template", "tertiary_template"]
const SETTING_FIELD_IDS: Readonly<Record<string, string>> = {
  asset_tag_format_template: "asset-tag-template",
  asset_tag_running_digits: "asset-tag-running-digits",
  asset_tag_separator: "asset-tag-separator",
  asset_tag_prefix: "asset-tag-global-prefix",
  asset_tag_category_prefixes: "category-prefix-groups",
  asset_qr_public_base_url: "asset-qr-public-base-url",
  asset_label_default_tape_size: "asset-label-default-tape-size",
  asset_label_compact_asset_name_enabled: "asset-label-compact-asset-name",
  ...Object.fromEntries(
    assetLabelTapeSizes.flatMap((size) => LABEL_FIELD_SUFFIXES.map((suffix) => [`asset_label_${size}_${suffix}`, `asset_label_${size}-${suffix.replace(/_/g, "-")}`]))
  ),
  checkout_document_template: "checkout-document-template",
  checkin_document_template: "checkin-document-template",
  operation_document_running_digits: "operation-document-running-digits",
  company_name: "company-name",
  default_currency: "default-currency",
  accounting_depreciation_policy: "depreciation-policy-json",
  notification_return_due_soon_days: "notification-return-due-days",
  notification_audit_action_due_soon_days: "notification-audit-action-days",
  notification_warranty_expiry_days: "notification-warranty-expiry-days",
  notification_license_expiry_days: "notification-license-expiry-days",
  workflow_approval_disposal_required: "workflow-approval-disposal-required",
  workflow_approval_audit_close_required: "workflow-approval-audit-close-required",
  workflow_approval_segregation_required: "workflow-approval-segregation-required",
  workflow_approval_min_approvers: "workflow-approval-min-approvers",
  workflow_approval_sla_days: "workflow-approval-sla-days",
  retention_attachment_days: "retention-attachment-days",
  retention_audit_log_days: "retention-audit-log-days",
  retention_orphan_file_days: "retention-orphan-file-days",
  ldap_url: "ldap-url",
  ldap_base_dn: "ldap-base-dn",
  ldap_bind_dn: "ldap-bind-dn",
  ldap_bind_password: "ldap-bind-password",
  ldap_user_filter: "ldap-user-filter",
  ldap_upn_domain: "ldap-upn-domain",
  ldap_domain: "ldap-domain",
  ldap_user_dn_template: "ldap-user-dn-template",
  ldap_sync_mode: "ldap-sync-mode",
  ldap_sync_max_scheduled_deactivations: "ldap-sync-max-scheduled-deactivations",
  ldap_sync_base_dn: "ldap-sync-base-dn",
  ldap_sync_default_company_code: "ldap-sync-default-company",
  ldap_sync_default_branch_code: "ldap-sync-default-branch",
  ldap_sync_default_department_code: "ldap-sync-default-department",
  ldap_sync_filter: "ldap-sync-filter",
  ldap_sync_schedule: "ldap-sync-custom-schedule",
}
const settingFieldId = (key: string) => SETTING_FIELD_IDS[key] ?? `setting-${key}`

// noValidate turns the browser's check off, so this restates the controls' min, max and step, every rule the server
// checks for the settings a save sends (with the server's own codes) and the prefix groups' rule (v-track M-R2, plan 3
// ST-R2). The controls' own limits are checked only on the settings the save changes (open issue 13). The rules live in
// src/lib/system-settings-field-rules.ts, which tests run against the server's schema.
function validate(entries: readonly SettingEntry[], prefixRows: readonly CategoryPrefixRow[], changed: readonly { key: string }[]) {
  return settingSaveErrors(entries, prefixRows, new Set(changed.map((setting) => setting.key)))
}

// The prefix editor's fields in visual order, with the id focus moves to (v-track M-R1, plan 3 ST-R7): the prefix, then
// the category picker as one group (focus goes to its first control, the search of the available categories).
const PREFIX_EDITOR_FIELD_IDS = {
  prefix: "category-prefix-editor-prefix",
  categoryIds: "category-prefix-editor-categories",
} as const
type PrefixEditorField = keyof typeof PREFIX_EDITOR_FIELD_IDS
const PREFIX_EDITOR_ORDER = Object.keys(PREFIX_EDITOR_FIELD_IDS) as PrefixEditorField[]

// The prefix editor saves into the form's prefix groups, not to the server: its prefix is required and 2 to 10 letters
// A-Z or digits (which covers the input's maxLength), and it needs at least one category (ST-R7). Its save button was
// disabled until both held; now it says what is missing.
function validatePrefixEditor(editor: { prefix: string; categoryIds: readonly string[] }) {
  const errors: Partial<Record<PrefixEditorField, string>> = {}
  const prefixCode = required(editor.prefix) ?? (isValidCategoryPrefix(editor.prefix) ? null : "invalidPrefix")
  if (prefixCode) errors.prefix = prefixCode
  const categoriesCode = atLeastOne(editor.categoryIds)
  if (categoriesCode) errors.categoryIds = categoriesCode
  return errors
}

function normalizeSettingValue(key: string, value: string | undefined) {
  if (key === assetTagCategoryPrefixesKey) {
    return serializePrefixRows(parsePrefixRows(value))
  }

  return value ?? ""
}

// null when the setting is empty: the review table shows Nil for it.
function formatReviewValue(key: string, value: string | undefined) {
  const normalized = normalizeSettingValue(key, value)
  if (key.toLowerCase().includes("password") && normalized) return "********"
  return normalized || null
}

export function SystemSettingsForm({
  settings,
  categories,
  defaultRoleOptions,
  ldapSyncHistory,
  labels,
}: SystemSettingsFormProps) {
  const router = useRouter()
  const apiError = useApiError()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  // The tab row's name: the page passes no label for it, so the form reads the page title.
  const tPage = useTranslations("systemSettingsPage")
  const tCommon = useTranslations("common")
  const params = useParams<{ locale?: string }>()
  const locale = typeof params.locale === "string" ? params.locale : "th"
  const initialValues = Object.fromEntries(settings.map((setting) => [setting.key, setting.value]))
  const activeTab = parseSystemSettingsTab(searchParams.get("tab"))
  const [saving, setSaving] = useState(false)
  const [settingsSearch, setSettingsSearch] = useState("")
  const [testingLdap, setTestingLdap] = useState(false)
  const [syncingLdap, setSyncingLdap] = useState<"preview" | "apply" | null>(null)
  const [syncPreview, setSyncPreview] = useState<LdapSyncPreview | null>(null)
  const [syncError, setSyncError] = useState<string | null>(null)
  const [values, setValues] = useState<Record<string, string>>(() =>
    Object.fromEntries(settings.map((setting) => [setting.key, setting.value]))
  )
  const [customScheduleSelected, setCustomScheduleSelected] = useState(() => {
    const savedSchedule = settings.find((setting) => setting.key === "ldap_sync_schedule")?.value ?? ""
    return !ldapSchedulePresets.some((preset) => preset.value === savedSchedule)
  })
  const [prefixRows, setPrefixRows] = useState<CategoryPrefixRow[]>(() =>
    parsePrefixRows(settings.find((setting) => setting.key === assetTagCategoryPrefixesKey)?.value)
  )
  const [prefixEditor, setPrefixEditor] = useState<{
    previousPrefix: string | null
    prefix: string
    categoryIds: string[]
  } | null>(null)
  const [availableCategorySearch, setAvailableCategorySearch] = useState("")
  const [selectedCategorySearch, setSelectedCategorySearch] = useState("")
  const [checkedAvailableCategoryIds, setCheckedAvailableCategoryIds] = useState<string[]>([])
  const [checkedSelectedCategoryIds, setCheckedSelectedCategoryIds] = useState<string[]>([])
  const fieldErrors = useFieldErrors<SettingFieldKey>()
  const validationMessage = useValidationMessage()
  const prefixErrors = useFieldErrors<PrefixEditorField>()
  const activeCategoryIds = categories.map((category) => category.id)
  const generalSettings = settings.filter((setting) => !friendlySettingKeys.has(setting.key) && !retiredSystemSettingKeys.has(setting.key))
  const formatTemplate = values[assetTagFormatTemplateKey] ?? defaultAssetTagFormatTemplate
  const checkoutDocumentTemplate = values[checkoutDocumentTemplateKey] ?? defaultCheckoutDocumentTemplate
  const checkinDocumentTemplate = values[checkinDocumentTemplateKey] ?? defaultCheckinDocumentTemplate
  const operationDocumentDigits = Number(values[operationDocumentRunningDigitsKey] ?? "4")
  const operationDocumentExampleDate = new Date(2026, 4, 13)
  const operationDocumentExampleDigits = Number.isFinite(operationDocumentDigits) ? operationDocumentDigits : 4
  const getValue = (key: string) => values[key] ?? ""
  // A change clears the setting's error from the last save or refusal (spec §4.3); a live rule shows again while it fails.
  const setValue = (key: string, value: string) => {
    setValues((current) => ({ ...current, [key]: value }))
    fieldErrors.clear(settingFieldKey(key))
  }
  const setBooleanValue = (key: string, checked: boolean) => setValue(key, checked ? "true" : "false")
  const resetPrefixEditorFilters = () => {
    setAvailableCategorySearch("")
    setSelectedCategorySearch("")
    setCheckedAvailableCategoryIds([])
    setCheckedSelectedCategoryIds([])
  }
  const openPrefixEditor = (prefix?: string) => {
    const normalizedPrefix = normalizeCategoryPrefix(prefix ?? "")
    const activePrefixRows = filterPrefixRowsByCategoryIds(prefixRows, activeCategoryIds)
    const group = normalizedPrefix ? buildCategoryPrefixGroups(activePrefixRows).find((item) => item.prefix === normalizedPrefix) : null
    setPrefixEditor({
      previousPrefix: normalizedPrefix || null,
      prefix: normalizedPrefix,
      categoryIds: group?.categoryIds ?? [],
    })
    resetPrefixEditorFilters()
    prefixErrors.setErrors({})
  }
  // Closing drops the editor's errors, so it opens again without them.
  const closePrefixEditor = () => {
    setPrefixEditor(null)
    resetPrefixEditorFilters()
    prefixErrors.setErrors({})
  }
  const addCheckedCategoriesToPrefix = () => {
    setPrefixEditor((current) =>
      current
        ? {
            ...current,
            categoryIds: uniqueStrings([...current.categoryIds, ...checkedAvailableCategoryIds]),
          }
        : current
    )
    setCheckedAvailableCategoryIds([])
    prefixErrors.clear("categoryIds")
  }
  const removeCheckedCategoriesFromPrefix = () => {
    const checkedIds = new Set(checkedSelectedCategoryIds)
    setPrefixEditor((current) =>
      current
        ? {
            ...current,
            categoryIds: current.categoryIds.filter((categoryId) => !checkedIds.has(categoryId)),
          }
        : current
    )
    setCheckedSelectedCategoryIds([])
    prefixErrors.clear("categoryIds")
  }
  const applyPrefixEditor = () => {
    if (!prefixEditor) return
    prefixErrors.setErrors(validatePrefixEditor(prefixEditor))
    if (prefixErrors.focusFirst(PREFIX_EDITOR_ORDER, { idFor: (key) => PREFIX_EDITOR_FIELD_IDS[key] })) return
    setPrefixRows((current) =>
      applyCategoryPrefixGroupEdit(current, {
        previousPrefix: prefixEditor.previousPrefix,
        prefix: prefixEditor.prefix,
        categoryIds: prefixEditor.categoryIds,
      })
    )
    fieldErrors.clear(settingFieldKey(assetTagCategoryPrefixesKey))
    closePrefixEditor()
  }
  const removePrefixGroup = (prefix: string) => {
    const normalizedPrefix = normalizeCategoryPrefix(prefix)
    setPrefixRows((current) => current.filter((row) => normalizeCategoryPrefix(row.prefix) !== normalizedPrefix))
    fieldErrors.clear(settingFieldKey(assetTagCategoryPrefixesKey))
  }
  const effectiveValues: Record<string, string> = {
    ...values,
    [assetTagCategoryPrefixesKey]: serializePrefixRows(prefixRows),
  }
  const workflowApprovalPolicy = parseWorkflowApprovalPolicy(Object.entries(effectiveValues))
  const changedSettings = settings.filter(
    (setting) => normalizeSettingValue(setting.key, effectiveValues[setting.key]) !== normalizeSettingValue(setting.key, initialValues[setting.key])
  )
  const changedCount = changedSettings.length
  useEffect(() => {
    if (changedCount === 0) return

    function warnBeforeUnload(event: BeforeUnloadEvent) {
      event.preventDefault()
      event.returnValue = ""
    }

    window.addEventListener("beforeunload", warnBeforeUnload)
    return () => window.removeEventListener("beforeunload", warnBeforeUnload)
  }, [changedCount])
  const activePrefixRows = filterPrefixRowsByCategoryIds(prefixRows, activeCategoryIds)
  const prefixGroups = buildCategoryPrefixGroups(activePrefixRows)
  const categoryById = new Map(categories.map((category) => [category.id, category]))
  const assignedPrefixByCategoryId = new Map(
    activePrefixRows
      .map((row) => [row.categoryId, normalizeCategoryPrefix(row.prefix)] as const)
      .filter(([categoryId, prefix]) => categoryId && prefix)
  )
  const unassignedCategoryCount = categories.filter((category) => !assignedPrefixByCategoryId.has(category.id)).length
  const prefixEditorSelectedIds = prefixEditor?.categoryIds ?? []
  const prefixEditorSelectedIdSet = new Set(prefixEditorSelectedIds)
  const normalizedPrefixDraft = normalizeCategoryPrefix(prefixEditor?.prefix ?? "")
  const filteredAvailableCategories = categories.filter(
    (category) => !prefixEditorSelectedIdSet.has(category.id) && matchesCategorySearch(category, availableCategorySearch)
  )
  const filteredSelectedCategories = categories.filter(
    (category) => prefixEditorSelectedIdSet.has(category.id) && matchesCategorySearch(category, selectedCategorySearch)
  )
  // The prefix's rule shows while the person types, once there is a prefix (spec U8; an empty prefix waits for save, U6).
  const prefixLiveCode = prefixEditor?.prefix.trim() && !isValidCategoryPrefix(prefixEditor.prefix) ? "invalidPrefix" : null
  const prefixEditorError = (field: PrefixEditorField) => {
    const code = (field === "prefix" ? prefixLiveCode : null) ?? prefixErrors.errors[field]
    if (!code) return undefined
    if (code === "invalidPrefix") return labels.invalidPrefix
    return field === "categoryIds" ? labels.prefixCategoriesRequired : validationMessage(code)
  }
  const prefixCategoriesError = prefixEditorError("categoryIds")
  const publicQrBaseUrl = getValue(assetQrPublicBaseUrlKey)
  const publicQrPreviewValue = buildAssetQrValue({
    assetId: "sample-asset-id",
    publicBaseUrl: publicQrBaseUrl,
  })
  const labelTemplates = parseAssetLabelTemplates(values)
  const syncSchedule = getValue("ldap_sync_schedule")
  const selectedSyncSchedulePreset = !customScheduleSelected && ldapSchedulePresets.some((preset) => preset.value === syncSchedule)
    ? syncSchedule
    : "custom"
  // The settings as a save sends them: every setting the page loaded, the prefix groups serialized.
  const submittedSettings: SettingEntry[] = settings.map((setting) => ({ key: setting.key, value: effectiveValues[setting.key] ?? "" }))
  // The rules the old boxes showed while typing now show under their fields, at the same moment (spec U8, ST-R3).
  const liveErrors = settingLiveErrors(submittedSettings, activePrefixRows)
  // A setting's error under its field: its live rule while the value breaks it, else what the last save or the server
  // found. The prefix groups read the prefix editor's own sentence (ST-R2).
  const settingError = (key: string) => {
    const field = settingFieldKey(key)
    const code = liveErrors[field] ?? fieldErrors.errors[field]
    if (!code) return undefined
    return code === "invalidPrefix" ? labels.invalidPrefix : validationMessage(code, settingControlParams[key])
  }
  const prefixGroupsError = settingError(assetTagCategoryPrefixesKey)
  const tabLabels: Record<SettingsTabId, string> = {
    "asset-numbering": labels.tabAssetNumbering,
    "label-template": labels.tabLabelTemplate,
    documents: labels.tabDocuments,
    organization: labels.tabOrganization,
    notifications: labels.tabNotifications,
    "workflow-approval": labels.tabWorkflowApproval,
    automation: labels.tabAutomation,
    governance: labels.tabGovernance,
    "ldap-login": labels.tabLdapLogin,
    "ldap-sync": labels.tabLdapSync,
    advanced: labels.tabAdvanced,
  }
  // TabNav links (O7, 2B spec R-g): each tab has its own URL, so Ctrl+click opens it in a new tab. A plain click runs
  // onSelect below, which cancels the navigation and switches with selectTab, so unsaved edits stay.
  const tabs = getSettingsTabOrder().map((id) => ({ key: id, label: tabLabels[id], href: buildSystemSettingsTabHref(pathname, searchParams.toString(), id) }))
  const settingsSearchResults = findSystemSettingsSearchResults(
    settings.filter((setting) => !retiredSystemSettingKeys.has(setting.key)),
    settingsSearch,
    tabLabels,
  ).slice(0, 6)
  const selectTab = (tab: SettingsTabId) => {
    if (tab === activeTab) return
    const href = buildSystemSettingsTabHref(pathname, searchParams.toString(), tab)
    window.history.replaceState(null, "", href)
  }
  const openSettingGroup = (tab: SettingsTabId) => {
    selectTab(tab)
    setSettingsSearch("")
    window.requestAnimationFrame(() => document.getElementById("settings-workspace")?.scrollIntoView({ block: "start" }))
  }
  // A save goes to the first wrong setting in visual order: its tab opens first, then focus waits for its field (spec
  // §4.2, U1). The advanced settings come last, in the page's order, on the advanced tab whatever their key's prefix.
  const fieldOrder = [...Object.keys(SETTING_FIELD_IDS), ...generalSettings.map((setting) => setting.key)].map(settingFieldKey)
  const focusFirstError = () =>
    fieldErrors.focusFirst(fieldOrder, {
      idFor: (field) => settingFieldId(settingKeyOf(field)),
      reveal: (field) => selectTab(SETTING_FIELD_IDS[settingKeyOf(field)] ? getSystemSettingsTabForKey(settingKeyOf(field)) : "advanced"),
    })
  // The overview is two label and value lists (DESIGN KeyValueList): no tone fills, an empty value is Nil, and the two
  // LDAP switches are status badges.
  const ldapLoginEnabled = getValue("ldap_enabled") === "true"
  const ldapSyncEnabled = getValue("ldap_sync_enabled") === "true"
  // Day counts and the saved sync mode in words, never an English "d" or a mode code (plan 2D-2 R14). A mode the
  // labels do not know shows as it is (docs/19_THAI_GLOSSARY.md).
  const formatDays = (days: string | number) => labels.overviewDays.replace("{count}", String(days))
  const ldapSyncModeLabels: Record<string, string> = {
    preview: labels.ldapSyncModePreview,
    manual: labels.ldapSyncModeManual,
    scheduled: labels.ldapSyncModeScheduled,
  }
  const ldapSyncMode = getValue("ldap_sync_mode") || "preview"
  const overviewItems: KeyValueItem[] = [
    { key: "assetTag", label: labels.overviewAssetTag, value: <span className="[overflow-wrap:anywhere]">{formatTemplate}</span> },
    { key: "label", label: labels.overviewLabel, value: assetLabelPresets[labelTemplates.defaultTapeSize].label },
    {
      key: "documents",
      label: labels.overviewDocuments,
      value: `${renderOperationDocumentTemplate(checkoutDocumentTemplate, operationDocumentExampleDate, 1, operationDocumentExampleDigits)} / ${renderOperationDocumentTemplate(
        checkinDocumentTemplate,
        operationDocumentExampleDate,
        1,
        operationDocumentExampleDigits
      )}`,
    },
    { key: "organization", label: labels.overviewOrganization, value: getValue("company_name") || null },
    {
      key: "notifications",
      label: labels.overviewNotifications,
      value: `${formatDays(getValue(notificationReturnDueSoonDaysKey) || "3")} / ${formatDays(getValue(notificationWarrantyExpiryDaysKey) || "30")}`,
    },
    {
      key: "approval",
      label: labels.overviewApproval,
      value: `${workflowApprovalPolicy.minApprovers} / SLA ${formatDays(workflowApprovalPolicy.slaDays)} /${workflowApprovalPolicy.segregationRequired ? labels.workflowApprovalSodOn : labels.workflowApprovalSodOff}`,
    },
    {
      key: "governance",
      label: labels.overviewGovernance,
      value: (
        <>
          {[retentionAttachmentDaysKey, retentionAuditLogDaysKey, retentionOrphanFileDaysKey].map((key, index) => (
            <Fragment key={key}>
              {index > 0 ? " / " : null}
              {getValue(key) ? formatDays(getValue(key)) : <Nil />}
            </Fragment>
          ))}
        </>
      ),
    },
    {
      key: "ldapLogin",
      label: labels.overviewLdapLogin,
      value: <StatusBadge label={ldapLoginEnabled ? labels.enabled : labels.disabled} tone={ldapLoginEnabled ? "success" : "muted"} />,
    },
    {
      key: "ldapSync",
      label: labels.overviewLdapSync,
      value: (
        <StatusBadge
          label={ldapSyncEnabled ? `${labels.enabled} (${ldapSyncModeLabels[ldapSyncMode] ?? ldapSyncMode})` : labels.disabled}
          tone={ldapSyncEnabled ? "success" : "muted"}
        />
      ),
    },
    { key: "advanced", label: labels.overviewAdvanced, value: labels.advancedSettingCount.replace("{count}", formatCount(generalSettings.length)) },
  ]

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    // Nothing changed is a prerequisite, not a field: the save waits and the status line beside it says why (spec §4.4,
    // ST-R8). Enter in a field still reaches here.
    if (changedCount === 0) return
    fieldErrors.setErrors(validate(submittedSettings, activePrefixRows, changedSettings))
    if (focusFirstError()) return

    setSaving(true)
    try {
      const response = await fetch("/api/admin/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ settings: submittedSettings }),
      })
      const payload = await response.json().catch(() => null)
      if (!response.ok) {
        // A refusal that names a setting shows under its field, on its tab; any other keeps the toast (spec §4.1).
        if (fieldErrors.applyServer(payload) && focusFirstError()) return
        throw new Error(payload?.error ?? labels.error)
      }
      toast.success(labels.success)
      router.refresh()
    } catch (error) {
      apiError.toast(error instanceof Error ? error : labels.error)
    } finally {
      setSaving(false)
    }
  }

  async function handleLdapTest() {
    setTestingLdap(true)
    try {
      const response = await fetch("/api/admin/settings/ldap-test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          settings: settings.map((setting) => ({
            key: setting.key,
            value: values[setting.key] ?? "",
          })),
        }),
      })
      const payload = await response.json().catch(() => null)
      if (!response.ok) throw new Error(payload?.message ?? payload?.error ?? labels.ldapTestFailed)
      toast.success(payload?.message ?? labels.ldapTestSuccess)
    } catch (error) {
      apiError.toast(error instanceof Error ? error : labels.ldapTestFailed)
    } finally {
      setTestingLdap(false)
    }
  }

  async function handleLdapSync(action: "preview" | "apply") {
    // Apply needs a preview first: the button waits and the empty preview line says why (spec §4.4, ST-R8).
    if (action === "apply" && !syncPreview) return
    setSyncingLdap(action)
    setSyncError(null)
    try {
      const response = await fetch("/api/admin/settings/ldap-sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      })
      const payload = await response.json().catch(() => null)
      if (!response.ok) throw new Error(payload?.error ?? labels.ldapSyncFailed)
      setSyncPreview(payload)
      toast.success(action === "apply" ? labels.ldapSyncApplySuccess : labels.ldapSyncPreviewSuccess)
      router.refresh()
    } catch (error) {
      const message = error instanceof Error ? error.message : labels.ldapSyncFailed
      setSyncError(message)
      apiError.toast(message)
    } finally {
      setSyncingLdap(null)
    }
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="space-y-6">
      <TabNav
        aria-label={tPage("title")}
        items={tabs}
        current={activeTab}
        onSelect={(key, event) => {
          event.preventDefault()
          selectTab(parseSystemSettingsTab(key))
        }}
      />

      <ContentPanel>
        <Field label={labels.searchSettings}>
          <SearchField value={settingsSearch} onChange={(event) => setSettingsSearch(event.target.value)} placeholder={labels.searchSettingsHelp} />
        </Field>
        {settingsSearch.trim() ? (
          settingsSearchResults.length > 0 ? (
            <ul className="mt-3 grid gap-2">
              {settingsSearchResults.map((result) => (
                <li key={result.key}>
                  <Button
                    variant="outline"
                    onClick={() => openSettingGroup(result.tab)}
                    className="h-auto w-full justify-between gap-3 whitespace-normal py-2 text-left md:h-auto md:min-h-9"
                  >
                    <span className="min-w-0">
                      <span className="block truncate text-sm text-foreground"><span className="tag">{result.key}</span></span>
                      {result.description ? <span className="mt-1 block line-clamp-1 text-xs font-normal text-muted-foreground">{result.description}</span> : null}
                    </span>
                    <span className="shrink-0 text-xs text-primary">{result.tabLabel}</span>
                  </Button>
                </li>
              ))}
            </ul>
          ) : (
            <EmptyNote role="status" className="mt-3">{labels.noSettingsSearchResults}</EmptyNote>
          )
        ) : null}
      </ContentPanel>

      {/* openSettingGroup scrolls to this id; ContentPanel takes no id of its own. */}
      <div id="settings-workspace">
        <ContentPanel divided title={labels.settingsOverview} description={labels.settingsOverviewDescription}>
          <div className="grid gap-x-8 gap-y-2 lg:grid-cols-2">
            <KeyValueList items={overviewItems.slice(0, 5)} />
            <KeyValueList items={overviewItems.slice(5)} />
          </div>
        </ContentPanel>
      </div>

      {activeTab === "asset-numbering" ? (
      <>
      <ContentPanel divided title={labels.assetTagFormat} description={labels.assetTagFormatDescription}>
        <div className="space-y-4">
          <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_320px]">
            <div className="space-y-2">
              <Field label={labels.assetTagTemplate} error={settingError(assetTagFormatTemplateKey)} liveError>
                <Input
                  id="asset-tag-template"
                  value={formatTemplate}
                  onChange={(event) => setValue(assetTagFormatTemplateKey, event.target.value)}
                  className="font-mono"
                />
              </Field>
              <p className="text-sm text-muted-foreground">{labels.assetTagTemplateHelp}</p>
            </div>
            <div className="space-y-2">
              <div className={fieldLabelClasses}>{labels.formatPresets}</div>
              <div className="grid gap-2">
                {formatPresets.map((preset) => (
                  <Button
                    key={preset.value}
                    variant="outline"
                    onClick={() => setValue(assetTagFormatTemplateKey, preset.value)}
                    className="h-auto justify-start whitespace-normal py-2 text-left md:h-auto md:min-h-9"
                  >
                    {labels[preset.labelKey]}
                  </Button>
                ))}
              </div>
            </div>
          </div>
          <div className="space-y-2">
            <div className={fieldLabelClasses}>{labels.availableTokens}</div>
            <div className="flex flex-wrap gap-2">
              {assetTagFormatTokens.map((token) => (
                <Button
                  key={token}
                  variant="outline"
                  size="sm"
                  onClick={() => setValue(assetTagFormatTemplateKey, `${formatTemplate}{${token}}`)}
                >
                  <span className="tag">{`{${token}}`}</span>
                </Button>
              ))}
            </div>
          </div>
          {/* A template string wraps, so it keeps font-mono and is not a tag (R3). */}
          <p className="text-meta text-muted-foreground [overflow-wrap:anywhere]">
            {labels.exampleFormat}: <span className="font-mono">{"{assetCompanyCode}{separator}{assetPrefix}{separator}{month}{separator}{running}"}</span>
          </p>
        </div>
      </ContentPanel>

      <ContentPanel divided title={labels.numberingOptions}>
        <div className="grid gap-4 md:grid-cols-3">
          <Field label={labels.runningDigits} error={settingError("asset_tag_running_digits")}>
            <Input
              id="asset-tag-running-digits"
              type="number"
              min={1}
              max={12}
              value={getValue("asset_tag_running_digits")}
              onChange={(event) => setValue("asset_tag_running_digits", event.target.value)}
            />
          </Field>
          <Field label={labels.separator} error={settingError("asset_tag_separator")}>
            <Input
              id="asset-tag-separator"
              value={getValue("asset_tag_separator")}
              onChange={(event) => setValue("asset_tag_separator", event.target.value)}
            />
          </Field>
          <Field label={labels.globalPrefix} error={settingError("asset_tag_prefix")}>
            <Input
              id="asset-tag-global-prefix"
              value={getValue("asset_tag_prefix")}
              onChange={(event) => setValue("asset_tag_prefix", event.target.value.toUpperCase())}
              className="uppercase"
            />
          </Field>
        </div>
      </ContentPanel>
      </>
      ) : null}

      {activeTab === "label-template" ? (
      <ContentPanel divided title={labels.labelPrintTemplate} description={labels.labelPrintTemplateDescription}>
        <div className="space-y-4">
          <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(260px,360px)]">
            <div className="space-y-2">
              <Field label={labels.publicQrBaseUrl} error={settingError(assetQrPublicBaseUrlKey)} liveError>
                <Input
                  id="asset-qr-public-base-url"
                  value={publicQrBaseUrl}
                  placeholder={labels.publicQrBaseUrlPlaceholder}
                  onChange={(event) => setValue(assetQrPublicBaseUrlKey, event.target.value)}
                  className="font-mono"
                />
              </Field>
              <p className="text-sm text-muted-foreground">{labels.publicQrBaseUrlDescription}</p>
            </div>
            <div className="space-y-1">
              <div className={fieldLabelClasses}>{labels.publicQrPreview}</div>
              {/* A URL wraps anywhere, so it keeps font-mono and is not a tag (R3). */}
              <p className="break-all font-mono text-xs text-foreground">{publicQrPreviewValue}</p>
              <p className="text-meta text-muted-foreground">{labels.publicQrResolverPath}: <span className="tag">/q/a/{"{assetId}"}</span></p>
            </div>
          </div>
          <div className="grid gap-4 md:grid-cols-[minmax(220px,330px)_minmax(300px,420px)] md:items-start">
            <Field label={labels.defaultTapeSize} error={settingError("asset_label_default_tape_size")}>
              <NativeSelect
                id="asset-label-default-tape-size"
                value={getValue("asset_label_default_tape_size")}
                onChange={(event) => setValue("asset_label_default_tape_size", event.target.value)}
              >
                {assetLabelTapeSizes.map((size) => (
                  <option key={size} value={size}>
                    {assetLabelPresets[size].label}
                  </option>
                ))}
              </NativeSelect>
            </Field>
            <LabelAssetNameModeField
              id="asset-label-compact-asset-name"
              label={labels.compactLabelAssetName}
              description={labels.compactLabelAssetNameDescription}
              compactLabel={labels.compactLabelAssetNameShort}
              fullLabel={labels.compactLabelAssetNameFull}
              compactEnabled={getValue("asset_label_compact_asset_name_enabled") === "true"}
              error={settingError("asset_label_compact_asset_name_enabled")}
              onChange={(compactEnabled) => setBooleanValue("asset_label_compact_asset_name_enabled", compactEnabled)}
            />
          </div>
          <div className="grid gap-4 xl:grid-cols-2">
            {assetLabelTapeSizes.map((size) => (
              <LabelTemplatePanel
                key={size}
                tapeSize={size}
                title={
                  size === "12"
                    ? labels.tape12mmTemplate
                    : size === "18"
                      ? labels.tape18mmTemplate
                      : size === "24"
                        ? labels.tape24mmTemplate
                        : labels.tapeCustomTemplate
                }
                labels={labels}
                getValue={getValue}
                setValue={setValue}
                errorFor={settingError}
              />
            ))}
          </div>
          <LabelPreviewPanel labels={labels} templates={labelTemplates} qrValue={publicQrPreviewValue} />
          <div className="space-y-2">
            <div className={fieldLabelClasses}>{labels.labelTemplateTokens}</div>
            <ul className="flex flex-wrap gap-x-3 gap-y-1 text-sm text-foreground">
              {assetLabelTemplateTokens.map((token) => (
                <li key={token}>
                  <span className="tag">{`{${token}}`}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </ContentPanel>
      ) : null}

      {activeTab === "documents" ? (
      <ContentPanel divided title={labels.operationDocumentNumbers} description={labels.operationDocumentNumbersDescription}>
        <div className="space-y-4">
          <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_260px]">
            <div className="grid gap-4 md:grid-cols-2">
              <Field label={labels.checkoutDocumentTemplate} error={settingError(checkoutDocumentTemplateKey)} liveError>
                <Input
                  id="checkout-document-template"
                  value={checkoutDocumentTemplate}
                  onChange={(event) => setValue(checkoutDocumentTemplateKey, event.target.value)}
                  className="font-mono"
                />
              </Field>
              <Field label={labels.checkinDocumentTemplate} error={settingError(checkinDocumentTemplateKey)} liveError>
                <Input
                  id="checkin-document-template"
                  value={checkinDocumentTemplate}
                  onChange={(event) => setValue(checkinDocumentTemplateKey, event.target.value)}
                  className="font-mono"
                />
              </Field>
              <Field label={labels.operationDocumentRunningDigits} error={settingError(operationDocumentRunningDigitsKey)} liveError>
                <Input
                  id="operation-document-running-digits"
                  type="number"
                  min={1}
                  max={12}
                  value={getValue(operationDocumentRunningDigitsKey)}
                  onChange={(event) => setValue(operationDocumentRunningDigitsKey, event.target.value)}
                />
              </Field>
            </div>
            <div className="space-y-2">
              <div className={fieldLabelClasses}>{labels.exampleFormat}</div>
              <KeyValueList
                items={[
                  { key: "checkout", label: labels.checkoutDocumentExample, value: <span className="tag">{renderOperationDocumentTemplate(checkoutDocumentTemplate, operationDocumentExampleDate, 1, operationDocumentExampleDigits)}</span> },
                  { key: "checkin", label: labels.checkinDocumentExample, value: <span className="tag">{renderOperationDocumentTemplate(checkinDocumentTemplate, operationDocumentExampleDate, 1, operationDocumentExampleDigits)}</span> },
                ]}
              />
            </div>
          </div>
          <p className="text-sm text-muted-foreground">{labels.operationDocumentTemplateHelp}</p>
          <div className="space-y-2">
            <div className={fieldLabelClasses}>{labels.operationDocumentTokens}</div>
            <ul className="flex flex-wrap gap-x-3 gap-y-1 text-sm text-foreground">
              {operationDocumentTemplateTokens.map((token) => (
                <li key={token}>
                  <span className="tag">{`{${token}}`}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </ContentPanel>
      ) : null}

      {activeTab === "asset-numbering" ? (
      <ContentPanel
        divided
        title={labels.categoryPrefixes}
        description={labels.categoryPrefixesDescription}
        actions={
          <Button size="md" onClick={() => openPrefixEditor()}>
            <Plus />
            {labels.addPrefix}
          </Button>
        }
      >
        {/* The prefix groups are one group: a stored prefix that breaks the rule shows its error under the table, and
            focus goes to the table's first edit button (ST-R5). */}
        <div
          id="category-prefix-groups"
          role="group"
          aria-label={labels.categoryPrefixes}
          aria-describedby={prefixGroupsError ? "category-prefix-groups-error" : undefined}
          className="space-y-4"
        >
          <div className="space-y-1 text-sm text-muted-foreground">
            <div className="font-medium text-foreground">
              {formatTemplateText(labels.prefixGroupCount, { count: String(prefixGroups.length) })}
            </div>
            <div>
              {formatTemplateText(labels.assignedCategoryCount, {
                assigned: String(categories.length - unassignedCategoryCount),
                total: String(categories.length),
              })}
            </div>
            <div>{formatTemplateText(labels.unassignedCategoryCount, { count: String(unassignedCategoryCount) })}</div>
          </div>

          {prefixGroups.length === 0 ? (
            <EmptyNote>{labels.noCategoryPrefixes}</EmptyNote>
          ) : (
            <DataTable framed={false} caption={labels.categoryPrefixes} scrollHint={tCommon("tableScrollHint")}>
              <DataTableHeader>
                <tr>
                  <DataTableHead>{labels.prefix}</DataTableHead>
                  <DataTableHead>{labels.category}</DataTableHead>
                  <DataTableHead>{labels.categoryPrefixPreview}</DataTableHead>
                  <DataTableHead align="right" hideLabel>{labels.editPrefix}</DataTableHead>
                </tr>
              </DataTableHeader>
              <DataTableBody>
                  {prefixGroups.map((group) => (
                    <DataTableRow key={group.prefix}>
                      <DataTableCell>
                        <span className="tag font-medium text-foreground">{group.prefix}</span>
                      </DataTableCell>
                      <DataTableCell className="min-w-72">
                        <div className="font-medium text-foreground">
                          {formatTemplateText(labels.categoryCount, { count: String(group.categoryIds.length) })}
                        </div>
                        <div className="mt-1 line-clamp-2 text-xs text-muted-foreground">
                          {group.categoryIds
                            .map((categoryId) => categoryById.get(categoryId))
                            .filter(Boolean)
                            .slice(0, 6)
                            .map((category) => `${category?.code} - ${category?.name}`)
                            .join(", ")}
                        </div>
                      </DataTableCell>
                      <DataTableCell className="min-w-56 text-muted-foreground">
                        <span className="tag">{renderAssetTagPreview(formatTemplate, group.prefix, getValue("asset_tag_separator"))}</span>
                      </DataTableCell>
                      <DataTableCell align="right" className="w-32">
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="outline"
                            size="icon"
                            onClick={() => openPrefixEditor(group.prefix)}
                            title={labels.editPrefix}
                            aria-label={labels.editPrefix}
                          >
                            <Pencil />
                          </Button>
                          <Button
                            variant="outline"
                            size="icon"
                            onClick={() => removePrefixGroup(group.prefix)}
                            title={labels.removePrefix}
                            aria-label={labels.removePrefix}
                          >
                            <Trash2 />
                          </Button>
                        </div>
                      </DataTableCell>
                    </DataTableRow>
                  ))}
              </DataTableBody>
            </DataTable>
          )}

          {prefixGroupsError ? <FieldError id="category-prefix-groups-error">{prefixGroupsError}</FieldError> : null}
        </div>

        <AccessibleDialog
          open={prefixEditor !== null}
          title={prefixEditor?.previousPrefix ? labels.editPrefix : labels.addPrefix}
          description={labels.categoryPrefixesDescription}
          size="xl"
          onClose={closePrefixEditor}
        >
          {prefixEditor ? (
            <>
              <AccessibleDialogBody className="space-y-4">
                <div className="grid gap-4 lg:grid-cols-[minmax(240px,320px)_minmax(0,1fr)]">
                  <Field label={labels.prefix} required error={prefixEditorError("prefix")} liveError>
                    <Input
                      id="category-prefix-editor-prefix"
                      value={prefixEditor.prefix}
                      onChange={(event) => {
                        setPrefixEditor((current) =>
                          current ? { ...current, prefix: event.target.value.toUpperCase() } : current
                        )
                        prefixErrors.clear("prefix")
                      }}
                      maxLength={10}
                      className="font-mono uppercase"
                    />
                  </Field>
                  <div className="space-y-1">
                    <div className={fieldLabelClasses}>{labels.categoryPrefixPreview}</div>
                    <div className="flex min-h-10 items-center text-sm text-foreground [overflow-wrap:anywhere]">
                      <span className="font-mono">{renderAssetTagPreview(formatTemplate, normalizedPrefixDraft || "COM", getValue("asset_tag_separator"))}</span>
                    </div>
                  </div>
                </div>

                {/* The two lists are one field: "at least one category" shows under them, and focus goes to the first
                    control, the search of the available categories (ST-R7). */}
                <div
                  id="category-prefix-editor-categories"
                  role="group"
                  aria-label={labels.selectedPrefixCategories}
                  aria-describedby={prefixCategoriesError ? "category-prefix-editor-categories-error" : undefined}
                  className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)]"
                >
                  <CategoryTransferPanel
                    title={labels.availableCategories}
                    count={filteredAvailableCategories.length}
                    searchValue={availableCategorySearch}
                    searchPlaceholder={labels.searchCategories}
                    onSearchChange={setAvailableCategorySearch}
                  >
                    {filteredAvailableCategories.length === 0 ? (
                      <EmptyNote className="min-h-64 justify-center px-4 text-center">{labels.noMatchingCategories}</EmptyNote>
                    ) : (
                      filteredAvailableCategories.map((category) => {
                        const assignedPrefix = assignedPrefixByCategoryId.get(category.id)
                        const isChecked = checkedAvailableCategoryIds.includes(category.id)
                        return (
                          <CategoryTransferRow
                            key={category.id}
                            category={category}
                            checked={isChecked}
                            badge={
                              assignedPrefix && assignedPrefix !== normalizedPrefixDraft
                                ? formatTemplateText(labels.assignedToPrefix, { prefix: assignedPrefix })
                                : undefined
                            }
                            onChange={() => setCheckedAvailableCategoryIds((current) => toggleString(current, category.id))}
                          />
                        )
                      })
                    )}
                  </CategoryTransferPanel>

                  <div className="flex items-center justify-center gap-2 lg:flex-col">
                    <Button variant="outline" onClick={addCheckedCategoriesToPrefix} disabled={checkedAvailableCategoryIds.length === 0}>
                      <ArrowRight />
                      <span className="sr-only sm:not-sr-only">{labels.addSelectedCategories}</span>
                    </Button>
                    <Button variant="outline" onClick={removeCheckedCategoriesFromPrefix} disabled={checkedSelectedCategoryIds.length === 0}>
                      <ArrowLeft />
                      <span className="sr-only sm:not-sr-only">{labels.removeSelectedCategories}</span>
                    </Button>
                  </div>

                  <CategoryTransferPanel
                    title={labels.selectedPrefixCategories}
                    count={filteredSelectedCategories.length}
                    searchValue={selectedCategorySearch}
                    searchPlaceholder={labels.searchCategories}
                    onSearchChange={setSelectedCategorySearch}
                  >
                    {prefixEditor.categoryIds.length === 0 ? (
                      <EmptyNote className="min-h-64 justify-center px-4 text-center">{labels.noSelectedCategories}</EmptyNote>
                    ) : filteredSelectedCategories.length === 0 ? (
                      <EmptyNote className="min-h-64 justify-center px-4 text-center">{labels.noMatchingCategories}</EmptyNote>
                    ) : (
                      filteredSelectedCategories.map((category) => {
                        const isChecked = checkedSelectedCategoryIds.includes(category.id)
                        return (
                          <CategoryTransferRow
                            key={category.id}
                            category={category}
                            checked={isChecked}
                            onChange={() => setCheckedSelectedCategoryIds((current) => toggleString(current, category.id))}
                          />
                        )
                      })
                    )}
                  </CategoryTransferPanel>
                </div>
                {prefixCategoriesError ? <FieldError id="category-prefix-editor-categories-error">{prefixCategoriesError}</FieldError> : null}
              </AccessibleDialogBody>
              <AccessibleDialogFooter>
                <AccessibleDialogCancel>{labels.cancel}</AccessibleDialogCancel>
                <Button onClick={applyPrefixEditor}>
                  <Save />
                  {labels.savePrefixGroup}
                </Button>
              </AccessibleDialogFooter>
            </>
          ) : null}
        </AccessibleDialog>
      </ContentPanel>
      ) : null}

      {activeTab === "organization" ? (
      <ContentPanel divided title={labels.organizationDefaults} description={labels.organizationDefaultsDescription}>
        <div className="grid gap-4 md:grid-cols-2">
          <Field label={labels.companyName} error={settingError("company_name")}>
            <Input
              id="company-name"
              value={getValue("company_name")}
              onChange={(event) => setValue("company_name", event.target.value)}
            />
          </Field>
          <Field label={labels.defaultCurrency} error={settingError("default_currency")}>
            <Input
              id="default-currency"
              value={getValue("default_currency")}
              onChange={(event) => setValue("default_currency", event.target.value.toUpperCase())}
              className="uppercase"
            />
          </Field>
          <div className="md:col-span-2">
            <DepreciationPolicyBuilder
              categories={categories}
              policyJson={getValue(depreciationPolicySettingKey)}
              labels={labels}
              onPolicyJsonChange={(value) => setValue(depreciationPolicySettingKey, value)}
              jsonId="depreciation-policy-json"
              jsonError={settingError(depreciationPolicySettingKey)}
            />
            <p className="mt-2 text-sm text-muted-foreground">{labels.accountingDepreciationPolicyDescription}</p>
          </div>
        </div>
      </ContentPanel>
      ) : null}

      {activeTab === "notifications" ? (
      <ContentPanel divided title={labels.notificationRules} description={labels.notificationRulesDescription}>
        <div className="space-y-4">
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <Field label={labels.returnDueSoonDays} error={settingError(notificationReturnDueSoonDaysKey)} liveError>
            <Input
              id="notification-return-due-days"
              type="number"
              min={0}
              max={365}
              value={getValue(notificationReturnDueSoonDaysKey)}
              onChange={(event) => setValue(notificationReturnDueSoonDaysKey, event.target.value)}
            />
          </Field>
          <Field label={labels.auditActionDueSoonDays} error={settingError(notificationAuditActionDueSoonDaysKey)} liveError>
            <Input
              id="notification-audit-action-days"
              type="number"
              min={0}
              max={365}
              value={getValue(notificationAuditActionDueSoonDaysKey)}
              onChange={(event) => setValue(notificationAuditActionDueSoonDaysKey, event.target.value)}
            />
          </Field>
          <Field label={labels.warrantyExpiryDays} error={settingError(notificationWarrantyExpiryDaysKey)} liveError>
            <Input
              id="notification-warranty-expiry-days"
              type="number"
              min={0}
              max={365}
              value={getValue(notificationWarrantyExpiryDaysKey)}
              onChange={(event) => setValue(notificationWarrantyExpiryDaysKey, event.target.value)}
            />
          </Field>
          <Field label={labels.licenseExpiryDays} error={settingError(notificationLicenseExpiryDaysKey)} liveError>
            <Input
              id="notification-license-expiry-days"
              type="number"
              min={0}
              max={365}
              value={getValue(notificationLicenseExpiryDaysKey)}
              onChange={(event) => setValue(notificationLicenseExpiryDaysKey, event.target.value)}
            />
          </Field>
        </div>
        <p className="text-sm text-muted-foreground">{labels.notificationDaysHelp}</p>
        </div>
      </ContentPanel>
      ) : null}

      {activeTab === "workflow-approval" ? (
      <ContentPanel divided title={labels.workflowApprovalPolicy} description={labels.workflowApprovalPolicyDescription}>
        <div className="space-y-4">
          <Notice tone="info">{labels.workflowApprovalFoundationNote}</Notice>
          <div className="grid gap-4 lg:grid-cols-2">
            <ToggleField
              id="workflow-approval-disposal-required"
              label={labels.workflowApprovalDisposalRequired}
              checked={getValue(workflowApprovalDisposalRequiredKey) === "true"}
              error={settingError(workflowApprovalDisposalRequiredKey)}
              onChange={(checked) => setBooleanValue(workflowApprovalDisposalRequiredKey, checked)}
            />
            <ToggleField
              id="workflow-approval-audit-close-required"
              label={labels.workflowApprovalAuditCloseRequired}
              checked={getValue(workflowApprovalAuditCloseRequiredKey) === "true"}
              error={settingError(workflowApprovalAuditCloseRequiredKey)}
              onChange={(checked) => setBooleanValue(workflowApprovalAuditCloseRequiredKey, checked)}
            />
            <ToggleField
              id="workflow-approval-segregation-required"
              label={labels.workflowApprovalSegregationRequired}
              checked={getValue(workflowApprovalSegregationRequiredKey) === "true"}
              error={settingError(workflowApprovalSegregationRequiredKey)}
              onChange={(checked) => setBooleanValue(workflowApprovalSegregationRequiredKey, checked)}
            />
            <Field label={labels.workflowApprovalMinApprovers} error={settingError(workflowApprovalMinApproversKey)} liveError>
              <Input
                id="workflow-approval-min-approvers"
                type="number"
                min={1}
                max={5}
                value={getValue(workflowApprovalMinApproversKey)}
                onChange={(event) => setValue(workflowApprovalMinApproversKey, event.target.value)}
              />
            </Field>
            <Field label={labels.workflowApprovalSlaDays} error={settingError(workflowApprovalSlaDaysKey)} liveError>
              <Input
                id="workflow-approval-sla-days"
                type="number"
                min={1}
                max={90}
                value={getValue(workflowApprovalSlaDaysKey)}
                onChange={(event) => setValue(workflowApprovalSlaDaysKey, event.target.value)}
              />
            </Field>
          </div>
          <p className="text-sm text-muted-foreground">{labels.workflowApprovalMinApproversHelp}</p>
          <p className="text-sm text-muted-foreground">{labels.workflowApprovalSlaDaysHelp}</p>
        </div>
      </ContentPanel>
      ) : null}

      {activeTab === "automation" ? (
      <ContentPanel divided title={labels.schedulerSettings} description={labels.schedulerSettingsDescription}>
        <div className="space-y-4">
          <Notice tone="neutral">{labels.schedulerHeartbeatNote}</Notice>
        </div>
      </ContentPanel>
      ) : null}

      {activeTab === "governance" ? (
      <ContentPanel divided title={labels.governanceSettings} description={labels.governanceSettingsDescription}>
        <div className="space-y-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <h3 className="text-base font-semibold text-foreground">{labels.retentionPolicy}</h3>
              <p className="mt-1 text-sm text-muted-foreground">{labels.retentionPolicyDescription}</p>
            </div>
            <a href={`/${locale}/admin/storage`} className={cn(buttonVariants({ variant: "outline", size: "md" }), "w-full sm:w-fit")}>
              {labels.openStorageGovernance}
            </a>
          </div>
          <div className="grid gap-4 lg:grid-cols-3">
            <Field label={labels.retentionAttachmentDays} error={settingError(retentionAttachmentDaysKey)} liveError>
              <Input
                id="retention-attachment-days"
                type="number"
                min={1}
                max={3650}
                value={getValue(retentionAttachmentDaysKey)}
                onChange={(event) => setValue(retentionAttachmentDaysKey, event.target.value)}
              />
            </Field>
            <Field label={labels.retentionAuditLogDays} error={settingError(retentionAuditLogDaysKey)} liveError>
              <Input
                id="retention-audit-log-days"
                type="number"
                min={1}
                max={3650}
                value={getValue(retentionAuditLogDaysKey)}
                onChange={(event) => setValue(retentionAuditLogDaysKey, event.target.value)}
              />
            </Field>
            <Field label={labels.retentionOrphanFileDays} error={settingError(retentionOrphanFileDaysKey)} liveError>
              <Input
                id="retention-orphan-file-days"
                type="number"
                min={1}
                max={3650}
                value={getValue(retentionOrphanFileDaysKey)}
                onChange={(event) => setValue(retentionOrphanFileDaysKey, event.target.value)}
              />
            </Field>
          </div>
          <Notice tone="neutral">{labels.retentionDaysHelp}</Notice>
        </div>
      </ContentPanel>
      ) : null}

      {activeTab === "ldap-login" ? (
      <ContentPanel divided title={labels.ldapSettings} description={labels.ldapSettingsDescription}>
        <div className="space-y-6">
          <FormSection as="h3" number={1} title={labels.ldapStepConnection}>
            <div className="grid gap-4 lg:grid-cols-2 xl:grid-cols-4">
              <ToggleField
                label={labels.ldapEnabled}
                checked={getValue("ldap_enabled") === "true"}
                onChange={(checked) => setBooleanValue("ldap_enabled", checked)}
              />
              <ToggleField
                label={labels.ldapStartTls}
                checked={getValue("ldap_start_tls") === "true"}
                onChange={(checked) => setBooleanValue("ldap_start_tls", checked)}
              />
              <ToggleField
                label={labels.ldapTlsRejectUnauthorized}
                checked={getValue("ldap_tls_reject_unauthorized") !== "false"}
                onChange={(checked) => setBooleanValue("ldap_tls_reject_unauthorized", checked)}
              />
            </div>
            <div className="mt-4 grid gap-4 lg:grid-cols-2">
              <Field label={labels.ldapUrl} error={settingError("ldap_url")}>
                <Input
                  id="ldap-url"
                  value={getValue("ldap_url")}
                  onChange={(event) => setValue("ldap_url", event.target.value)}
                  placeholder="ldap://dc.company.local:389"
                />
              </Field>
              <Field label={labels.ldapBaseDn} error={settingError("ldap_base_dn")}>
                <Input
                  id="ldap-base-dn"
                  value={getValue("ldap_base_dn")}
                  onChange={(event) => setValue("ldap_base_dn", event.target.value)}
                  placeholder="DC=company,DC=local"
                />
              </Field>
              <Field label={labels.ldapBindDn} error={settingError("ldap_bind_dn")}>
                <Input
                  id="ldap-bind-dn"
                  value={getValue("ldap_bind_dn")}
                  onChange={(event) => setValue("ldap_bind_dn", event.target.value)}
                  placeholder="CN=ldap-reader,OU=Service Accounts,DC=company,DC=local"
                />
              </Field>
              <Field label={labels.ldapBindPassword} error={settingError("ldap_bind_password")}>
                <Input
                  id="ldap-bind-password"
                  type="password"
                  value={getValue("ldap_bind_password")}
                  onChange={(event) => setValue("ldap_bind_password", event.target.value)}
                />
              </Field>
            </div>
            <Button variant="outline" onClick={handleLdapTest} busy={testingLdap} className="mt-4 w-full sm:w-auto">
              <PlugZap />
              {labels.testLdapConnection}
            </Button>
          </FormSection>

          <FormSection as="h3" number={2} title={labels.ldapStepLoginMapping}>
            <div className="grid gap-4 lg:grid-cols-2">
              <Field label={labels.ldapUserFilter} error={settingError("ldap_user_filter")}>
                <Input
                  id="ldap-user-filter"
                  value={getValue("ldap_user_filter")}
                  onChange={(event) => setValue("ldap_user_filter", event.target.value)}
                  className="font-mono"
                />
              </Field>
              <Field label={labels.ldapUpnDomain} error={settingError("ldap_upn_domain")}>
                <Input
                  id="ldap-upn-domain"
                  value={getValue("ldap_upn_domain")}
                  onChange={(event) => setValue("ldap_upn_domain", event.target.value)}
                  placeholder="company.local"
                />
              </Field>
              <Field label={labels.ldapDomain} error={settingError("ldap_domain")}>
                <Input
                  id="ldap-domain"
                  value={getValue("ldap_domain")}
                  onChange={(event) => setValue("ldap_domain", event.target.value)}
                  placeholder="COMPANY"
                />
              </Field>
              <div className="lg:col-span-2">
                <Field label={labels.ldapUserDnTemplate} error={settingError("ldap_user_dn_template")}>
                  <Input
                    id="ldap-user-dn-template"
                    value={getValue("ldap_user_dn_template")}
                    onChange={(event) => setValue("ldap_user_dn_template", event.target.value)}
                    placeholder="CN={username},OU=Users,DC=company,DC=local"
                    className="font-mono"
                  />
                </Field>
              </div>
            </div>
          </FormSection>

          <FormSection as="h3" number={3} title={labels.ldapStepProvisioning}>
            <div className="grid gap-4 lg:grid-cols-2">
              <div className="space-y-2">
                <div className={fieldLabelClasses}>{labels.ldapAutoProvision}</div>
                <label className="flex min-h-11 items-center justify-between gap-3 rounded-md border border-border bg-background px-3 py-2 text-sm font-medium text-foreground">
                  <span>{getValue("ldap_auto_provision") === "true" ? labels.enabled : labels.disabled}</span>
                  <input
                    type="checkbox"
                    checked={getValue("ldap_auto_provision") === "true"}
                    onChange={(event) => setBooleanValue("ldap_auto_provision", event.target.checked)}
                    className={checkboxVariants()}
                  />
                </label>
              </div>
              <div className="space-y-2">
                <SearchableSelect
                  label={labels.ldapDefaultRole}
                  value={getValue("ldap_default_role")}
                  options={defaultRoleOptions}
                  placeholder={labels.ldapDefaultRolePlaceholder}
                  searchPlaceholder={labels.searchSelectPlaceholder}
                  emptyLabel={labels.searchSelectNoResults}
                  onChange={(value) => setValue("ldap_default_role", value)}
                />
                <p className="text-xs leading-relaxed text-muted-foreground">{labels.ldapDefaultRoleHelp}</p>
                {getValue("ldap_default_role") && !defaultRoleOptions.some((option) => option.id === getValue("ldap_default_role")) ? (
                  <Notice tone="warning">{labels.ldapDefaultRoleMissing.replace("{role}", getValue("ldap_default_role"))}</Notice>
                ) : null}
              </div>
            </div>
          </FormSection>
        </div>
      </ContentPanel>
      ) : null}

      {activeTab === "ldap-sync" ? (
      <ContentPanel divided title={labels.ldapSyncStrategy} description={labels.ldapSyncStrategyDescription}>
        <div className="space-y-6">
          <Notice tone="neutral">{labels.ldapSyncRecommendation}</Notice>
          <FormSection as="h3" number={1} title={labels.ldapStepSyncStrategy}>
            <div className="grid gap-4 lg:grid-cols-2">
              <ToggleField
                label={labels.ldapSyncEnabled}
                checked={getValue("ldap_sync_enabled") === "true"}
                onChange={(checked) => setBooleanValue("ldap_sync_enabled", checked)}
              />
              <ToggleField
                label={labels.ldapSyncDeactivateMissing}
                checked={getValue("ldap_sync_deactivate_missing") === "true"}
                onChange={(checked) => setBooleanValue("ldap_sync_deactivate_missing", checked)}
              />
              <Field label={labels.ldapSyncMode} error={settingError("ldap_sync_mode")}>
                <NativeSelect
                  id="ldap-sync-mode"
                  value={getValue("ldap_sync_mode")}
                  onChange={(event) => setValue("ldap_sync_mode", event.target.value)}
                >
                  <option value="preview">{labels.ldapSyncModePreview}</option>
                  <option value="manual">{labels.ldapSyncModeManual}</option>
                  <option value="scheduled">{labels.ldapSyncModeScheduled}</option>
                </NativeSelect>
              </Field>
              <Field label={labels.ldapSyncMaxScheduledDeactivations} error={settingError("ldap_sync_max_scheduled_deactivations")}>
                <Input
                  id="ldap-sync-max-scheduled-deactivations"
                  type="number"
                  min={0}
                  value={getValue("ldap_sync_max_scheduled_deactivations")}
                  onChange={(event) => setValue("ldap_sync_max_scheduled_deactivations", event.target.value)}
                />
              </Field>
              <Field label={labels.ldapSyncBaseDn} error={settingError("ldap_sync_base_dn")}>
                <Input
                  id="ldap-sync-base-dn"
                  value={getValue("ldap_sync_base_dn")}
                  onChange={(event) => setValue("ldap_sync_base_dn", event.target.value)}
                  placeholder="OU=Employees,DC=company,DC=local"
                />
              </Field>
            </div>
          </FormSection>

          <FormSection as="h3" number={2} title={labels.ldapStepOrgMapping}>
              <div className="rounded-md border border-border bg-background px-3 py-3">
                <div className="text-sm font-medium text-foreground">{labels.ldapSyncDefaultMapping}</div>
                <p className="mt-1 text-sm text-muted-foreground">{labels.ldapSyncDefaultMappingDescription}</p>
                <div className="mt-3 grid gap-3 md:grid-cols-3">
                  <Field label={labels.ldapSyncDefaultCompanyCode} error={settingError("ldap_sync_default_company_code")}>
                    <Input
                      id="ldap-sync-default-company"
                      value={getValue("ldap_sync_default_company_code")}
                      onChange={(event) => setValue("ldap_sync_default_company_code", event.target.value.toUpperCase())}
                      className="uppercase"
                    />
                  </Field>
                  <Field label={labels.ldapSyncDefaultBranchCode} error={settingError("ldap_sync_default_branch_code")}>
                    <Input
                      id="ldap-sync-default-branch"
                      value={getValue("ldap_sync_default_branch_code")}
                      onChange={(event) => setValue("ldap_sync_default_branch_code", event.target.value.toUpperCase())}
                      className="uppercase"
                    />
                  </Field>
                  <Field label={labels.ldapSyncDefaultDepartmentCode} error={settingError("ldap_sync_default_department_code")}>
                    <Input
                      id="ldap-sync-default-department"
                      value={getValue("ldap_sync_default_department_code")}
                      onChange={(event) => setValue("ldap_sync_default_department_code", event.target.value.toUpperCase())}
                      className="uppercase"
                    />
                  </Field>
                </div>
              </div>
          </FormSection>

          <FormSection as="h3" number={3} title={labels.ldapStepSchedule}>
            <div className="grid gap-4 lg:grid-cols-2">
            <Field label={labels.ldapSyncSchedule}>
              <NativeSelect
                id="ldap-sync-schedule-preset"
                value={selectedSyncSchedulePreset}
                onChange={(event) => {
                  const value = event.target.value
                  setCustomScheduleSelected(value === "custom")
                  if (value !== "custom") {
                    setValue("ldap_sync_schedule", value)
                  }
                }}
              >
                {ldapSchedulePresets.map((preset) => (
                  <option key={preset.value} value={preset.value}>
                    {labels[preset.labelKey]}
                  </option>
                ))}
              </NativeSelect>
            </Field>
            <div className="lg:col-span-2">
              <Field label={labels.ldapSyncFilter} error={settingError("ldap_sync_filter")}>
                <Input
                  id="ldap-sync-filter"
                  value={getValue("ldap_sync_filter")}
                  onChange={(event) => setValue("ldap_sync_filter", event.target.value)}
                  className="font-mono"
                />
              </Field>
            </div>
            {selectedSyncSchedulePreset === "custom" ? (
              <div className="lg:col-span-2">
                <Field label={labels.ldapSyncCustomSchedule} error={settingError("ldap_sync_schedule")} liveError>
                  <Input
                    id="ldap-sync-custom-schedule"
                    value={syncSchedule}
                    onChange={(event) => setValue("ldap_sync_schedule", event.target.value)}
                    placeholder="0 2 * * *"
                    className="font-mono"
                  />
                </Field>
              </div>
            ) : null}
          </div>
          </FormSection>

          <FormSection as="h3" number={4} title={labels.ldapStepPreviewApply}>
          <div className="flex flex-col gap-2 sm:flex-row">
            <Button
              variant="outline"
              onClick={() => handleLdapSync("preview")}
              busy={syncingLdap === "preview"}
              disabled={syncingLdap === "apply"}
              className="w-full sm:w-auto"
            >
              {labels.ldapSyncPreview}
            </Button>
            <Button
              onClick={() => handleLdapSync("apply")}
              busy={syncingLdap === "apply"}
              disabled={syncingLdap === "preview"}
              aria-disabled={!syncPreview || undefined}
              aria-describedby={!syncPreview ? "ldap-sync-no-preview" : undefined}
              className="w-full sm:w-auto"
            >
              {labels.ldapSyncApply}
            </Button>
          </div>
          {syncError ? (
            <Notice tone="danger" role="alert">
              <ApiErrorText error={syncError} />
            </Notice>
          ) : null}
          <SyncPreviewPanel labels={labels} preview={syncPreview} locale={locale} />
          </FormSection>
          <LdapSyncHistoryPanel labels={labels} history={ldapSyncHistory} locale={locale} />
        </div>
      </ContentPanel>
      ) : null}

      {activeTab === "advanced" && generalSettings.length > 0 ? (
        <ContentPanel divided title={labels.advancedSettings} description={labels.advancedSettingsDescription}>
          <Notice tone="warning" title={labels.advancedWarningTitle}>
            {labels.advancedWarningDescription}
          </Notice>
          <details className="mt-4">
            <summary className={cn(linkVariants({ size: "inherit" }), "list-item cursor-pointer text-sm")}>{labels.showAdvancedSettings}</summary>
            <DataTable framed={false} className="mt-4" caption={labels.advancedSettings} scrollHint={tCommon("tableScrollHint")}>
              <DataTableHeader>
                <tr>
                  <DataTableHead>{labels.key}</DataTableHead>
                  <DataTableHead>{labels.value}</DataTableHead>
                  <DataTableHead>{labels.description}</DataTableHead>
                </tr>
              </DataTableHeader>
              <DataTableBody>
                {generalSettings.map((setting) => (
                  <DataTableRow key={setting.key}>
                    <DataTableCell className="whitespace-nowrap">
                      <span className="tag font-medium text-foreground">{setting.key}</span>
                    </DataTableCell>
                    <DataTableCell className="min-w-80">
                      <Field label={setting.key} hideLabel error={settingError(setting.key)}>
                        <Input
                          id={settingFieldId(setting.key)}
                          value={values[setting.key] ?? ""}
                          onChange={(event) => setValue(setting.key, event.target.value)}
                        />
                      </Field>
                    </DataTableCell>
                    <DataTableCell className="min-w-80 text-muted-foreground">{orNil(setting.description)}</DataTableCell>
                  </DataTableRow>
                ))}
              </DataTableBody>
            </DataTable>
          </details>
        </ContentPanel>
      ) : null}

      {changedCount > 0 ? (
        <ContentPanel divided flush className="overflow-hidden" title={labels.changeReview} description={labels.changeReviewDescription}>
          <DataTable framed={false} caption={labels.changeReview} scrollHint={tCommon("tableScrollHint")}>
            <DataTableHeader>
              <tr>
                <DataTableHead>{labels.key}</DataTableHead>
                <DataTableHead>{labels.beforeValue}</DataTableHead>
                <DataTableHead>{labels.afterValue}</DataTableHead>
              </tr>
            </DataTableHeader>
            <DataTableBody>
              {changedSettings.map((setting) => {
                const tab = getSystemSettingsTabForKey(setting.key)
                return (
                  <DataTableRow key={setting.key}>
                    <DataTableCell className="whitespace-nowrap">
                      {/* A link to the tab (Ctrl+click opens it); a plain click switches in place, like TabNav. */}
                      <Link
                        href={buildSystemSettingsTabHref(pathname, searchParams.toString(), tab)}
                        onNavigate={(event) => {
                          event.preventDefault()
                          openSettingGroup(tab)
                        }}
                        className={linkVariants({ size: "inherit" })}
                      >
                        <span className="tag">{setting.key}</span>
                        <span className="ml-2 text-xs font-normal text-muted-foreground">{labels.openSettingGroup}</span>
                      </Link>
                    </DataTableCell>
                    <DataTableCell className="max-w-md break-words text-muted-foreground">
                      {orNil(formatReviewValue(setting.key, initialValues[setting.key]))}
                    </DataTableCell>
                    <DataTableCell className="max-w-md break-words font-medium text-foreground">
                      {orNil(formatReviewValue(setting.key, effectiveValues[setting.key]))}
                    </DataTableCell>
                  </DataTableRow>
                )
              })}
            </DataTableBody>
          </DataTable>
        </ContentPanel>
      ) : null}

      <StickyFormFooter
        status={
          <>
            <p id="settings-save-status" className="text-sm font-semibold text-foreground">
              {changedCount > 0 ? labels.unsavedChanges.replace("{count}", String(changedCount)) : labels.noUnsavedChanges}
            </p>
            <p className="mt-1 hidden text-meta text-muted-foreground sm:block">{labels.settingsOverviewDescription}</p>
          </>
        }
      >
        <Button
          type="submit"
          busy={saving}
          aria-disabled={changedCount === 0 || undefined}
          aria-describedby={changedCount === 0 ? "settings-save-status" : undefined}
        >
          <Save />
          {labels.save}
        </Button>
      </StickyFormFooter>
    </form>
  )
}

function LdapSyncHistoryPanel({
  labels,
  history,
  locale,
}: {
  labels: SystemSettingsFormProps["labels"]
  history: LdapSyncHistoryItem[]
  locale: string
}) {
  // A quiet section under the numbered steps, not a box in the panel: a line above it, the runs as rows.
  return (
    <section aria-labelledby="ldap-sync-history-title" className="border-t border-border pt-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <h3 id="ldap-sync-history-title" className="text-sm font-semibold text-foreground">{labels.ldapSyncHistoryTitle}</h3>
          <p className="mt-1 text-sm text-muted-foreground">{labels.ldapSyncHistoryDescription}</p>
        </div>
        <Link href={buildSystemLogFilterHref(locale, "ldap_sync")} className={cn(buttonVariants({ variant: "outline", size: "md" }), "w-full sm:w-auto")}>
          <ExternalLink />
          {labels.ldapSyncHistoryViewAll}
        </Link>
      </div>

      {history.length === 0 ? (
        <EmptyNote className="mt-4">{labels.ldapSyncHistoryEmpty}</EmptyNote>
      ) : (
        <ul className="mt-4 divide-y divide-border-soft">
          {history.map((item) => (
            <li key={item.id} className="py-3 first:pt-0 last:pb-0">
              <div className="flex flex-col gap-2 lg:flex-row lg:items-start lg:justify-between">
                <div className="min-w-0">
                  <div className="text-sm font-semibold text-foreground">
                    {labels.ldapSyncHistoryStartedAt}: {formatHistoryDateTime(item.createdAt, locale)}
                  </div>
                  <div className="mt-1 text-xs text-muted-foreground">
                    {labels.ldapSyncHistoryRunBy}: {item.actorLabel}
                  </div>
                  {item.blockerCount > 0 ? (
                    <StatusBadge tone="warning" className="mt-2" label={`${labels.ldapSyncHistoryBlockers}: ${formatCount(item.blockerCount)}`} />
                  ) : null}
                </div>
                <dl className="grid grid-cols-2 gap-x-4 gap-y-2 sm:grid-cols-5 lg:w-[34rem]">
                  <HistoryCount label={labels.ldapSyncTotal} value={item.total} />
                  <HistoryCount label={labels.ldapSyncAppliedCreated} value={item.created} />
                  <HistoryCount label={labels.ldapSyncAppliedUpdated} value={item.updated} />
                  <HistoryCount label={labels.ldapSyncAppliedDeactivated} value={item.deactivated} />
                  <HistoryCount label={labels.ldapSyncAppliedUsersDeactivated} value={item.deactivatedUsers} />
                </dl>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}

// One count of a sync run: a label and a number, no frame (the run is a row of the list).
function HistoryCount({ label, value }: { label: string; value: number }) {
  return (
    <div className="min-w-0">
      <dt className="truncate text-meta text-muted-foreground">{label}</dt>
      <dd className="mt-0.5 text-base font-semibold text-foreground num">{formatCount(value)}</dd>
    </div>
  )
}

function formatHistoryDateTime(value: string, locale = "th") {
  return new Intl.DateTimeFormat(getIntlLocale(locale), {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value))
}

function getIntlLocale(locale: string) {
  return locale === "en" ? "en-US" : "th-TH"
}

function matchesCategorySearch(category: SystemSettingsCategory, search: string) {
  const query = search.trim().toLowerCase()
  if (!query) return true
  return `${category.code} ${category.name}`.toLowerCase().includes(query)
}

function formatTemplateText(template: string, values: Record<string, string>) {
  return Object.entries(values).reduce((current, [key, value]) => current.replaceAll(`{${key}}`, value), template)
}

function renderAssetTagPreview(template: string, prefix: string, separatorSetting: string) {
  const separator = separatorSetting.trim() || "-"
  const assetPrefix = normalizeCategoryPrefix(prefix) || "COM"
  const safeTemplate = template.includes("{running}") ? template : defaultAssetTagFormatTemplate
  const tokens: Record<string, string> = {
    assetCompanyCode: "SNI",
    companyCode: "SNI",
    branchCode: "HQ",
    categoryCode: "CAT",
    assetPrefix,
    globalPrefix: "AST",
    separator,
    year: "2026",
    year2: "26",
    month: "05",
    day: "29",
    running: "0001",
  }

  return safeTemplate.replace(/\{([A-Za-z0-9]+)\}/g, (_match, token: string) => tokens[token] ?? "")
}

function toggleString(values: string[], value: string) {
  return values.includes(value) ? values.filter((item) => item !== value) : [...values, value]
}

function uniqueStrings(values: string[]) {
  return Array.from(new Set(values))
}

function CategoryTransferPanel({
  title,
  count,
  searchValue,
  searchPlaceholder,
  onSearchChange,
  children,
}: {
  title: string
  count: number
  searchValue: string
  searchPlaceholder: string
  onSearchChange: (value: string) => void
  children: React.ReactNode
}) {
  return (
    <div className="overflow-hidden rounded-md border border-border bg-background">
      <div className="flex items-center justify-between gap-3 border-b border-border px-3 py-3">
        <div className="text-sm font-semibold text-foreground">{title}</div>
        <span className="text-meta text-muted-foreground num">{formatCount(count)}</span>
      </div>
      <div className="border-b border-border p-3">
        <SearchField aria-label={searchPlaceholder} placeholder={searchPlaceholder} value={searchValue} onChange={(event) => onSearchChange(event.target.value)} />
      </div>
      <div className="max-h-80 min-h-72 overflow-y-auto p-2">{children}</div>
    </div>
  )
}

function CategoryTransferRow({
  category,
  checked,
  badge,
  onChange,
}: {
  category: SystemSettingsCategory
  checked: boolean
  badge?: string
  onChange: () => void
}) {
  return (
    <label className="flex min-h-12 cursor-pointer items-center gap-3 rounded-md px-2 py-2 text-sm transition-colors hover:bg-accent">
      <input
        type="checkbox"
        checked={checked}
        onChange={onChange}
        className={checkboxVariants()}
      />
      <span className="min-w-0 flex-1">
        <span className="block truncate font-medium text-foreground">{category.name}</span>
        <span className="block truncate text-xs text-muted-foreground">{category.code}</span>
      </span>
      {badge ? <StatusBadge tone="warning" label={badge} /> : null}
    </label>
  )
}

// A switch setting on one line. With an error (a stored value that is neither true nor false), the error shows under
// the line and the checkbox is tied to it; id is what focus moves to (v-track plan 3 ST-R6).
function ToggleField({
  id,
  label,
  description,
  checked,
  error,
  onChange,
}: {
  id?: string
  label: string
  description?: string
  checked: boolean
  error?: React.ReactNode
  onChange: (checked: boolean) => void
}) {
  const errorId = error && id ? `${id}-error` : undefined
  return (
    <div data-slot="field" className="grid min-w-0 content-start gap-1.5">
      <label className="flex min-h-10 items-center justify-between gap-3 rounded-md border border-border bg-background px-3 py-2 text-sm font-medium text-foreground">
        <span className="min-w-0">
          <span className="block">{label}</span>
          {description ? <span className="mt-1 block text-xs font-normal leading-5 text-muted-foreground">{description}</span> : null}
        </span>
        <input
          id={id}
          type="checkbox"
          checked={checked}
          aria-invalid={error ? true : undefined}
          aria-describedby={errorId}
          onChange={(event) => onChange(event.target.checked)}
          className={checkboxVariants()}
        />
      </label>
      {error ? <FieldError id={errorId}>{error}</FieldError> : null}
    </div>
  )
}

function SyncPreviewPanel({
  labels,
  preview,
  locale,
}: {
  labels: SystemSettingsFormProps["labels"]
  preview: LdapSyncPreview | null
  locale: string
}) {
  if (!preview) {
    return <EmptyNote id="ldap-sync-no-preview">{labels.ldapSyncNoPreview}</EmptyNote>
  }
  const deactivationImpacts = (preview.deactivationImpacts ?? []).filter(
    (impact) => impact.activeAssetCount > 0 || impact.activeUserCount > 0
  )

  // The counts are StatStrips (no tone fill); what the user must deal with is a warning Notice; the impact list sits
  // after it, never inside it, because faint text never sits on a status fill.
  return (
    <div className="space-y-4">
      <section aria-labelledby="ldap-sync-preview-title" className="space-y-3">
        <h4 id="ldap-sync-preview-title" className="text-sm font-semibold text-foreground">{labels.ldapSyncPreviewTitle}</h4>
        <StatStrip
          items={[
            { key: "total", label: labels.ldapSyncTotal, value: formatCount(preview.total) },
            { key: "creates", label: labels.ldapSyncCreates, value: formatCount(preview.creates.length) },
            { key: "updates", label: labels.ldapSyncUpdates, value: formatCount(preview.updates.length) },
            { key: "deactivates", label: labels.ldapSyncDeactivates, value: formatCount(preview.deactivates.length) },
          ]}
        />
      </section>
      {preview.applied ? (
        <div className="space-y-3">
          <Notice tone="success" role="status" title={labels.ldapSyncAppliedTitle} />
          <StatStrip
            items={[
              { key: "created", label: labels.ldapSyncAppliedCreated, value: formatCount(preview.applied.created) },
              { key: "updated", label: labels.ldapSyncAppliedUpdated, value: formatCount(preview.applied.updated) },
              { key: "deactivated", label: labels.ldapSyncAppliedDeactivated, value: formatCount(preview.applied.deactivated) },
              { key: "deactivatedUsers", label: labels.ldapSyncAppliedUsersDeactivated, value: formatCount(preview.applied.deactivatedUsers ?? 0) },
            ]}
          />
        </div>
      ) : null}
      {preview.blockers.length > 0 ? (
        <Notice tone="warning" title={labels.ldapSyncBlockers}>
          <ul className="list-disc space-y-1 pl-5">
            {preview.blockers.map((blocker) => (
              <li key={blocker}>{blocker}</li>
            ))}
          </ul>
        </Notice>
      ) : null}
      {preview.deactivates.length > 0 ? (
        <div className="space-y-3">
          <Notice tone="warning" title={labels.ldapSyncDeactivateImpactTitle}>
            {labels.ldapSyncDeactivateImpactDescription}
          </Notice>
          {deactivationImpacts.length > 0 ? (
            <ul className="divide-y divide-border-soft">
              {deactivationImpacts.map((impact) => (
                <li key={impact.employeeId} className="py-3 first:pt-0 last:pb-0">
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                    <div className="min-w-0">
                      <div className="text-sm font-semibold text-foreground">
                        <span className="tag">{impact.code}</span> - {impact.name}
                      </div>
                      <div className="mt-1 text-xs text-muted-foreground">{orNil(impact.email)}</div>
                    </div>
                    <a
                      href={`/${locale}/assets?custodianId=${encodeURIComponent(impact.employeeId)}&page=1`}
                      className={buttonVariants({ variant: "outline", size: "md" })}
                    >
                      {labels.ldapSyncOpenAssets}
                    </a>
                  </div>
                  <KeyValueList
                    className="mt-3"
                    items={[
                      { key: "assets", label: labels.ldapSyncDeactivateImpactAssets, value: formatCount(impact.activeAssetCount) },
                      { key: "users", label: labels.ldapSyncDeactivateImpactUsers, value: formatCount(impact.activeUserCount) },
                    ]}
                  />
                  {impact.assets.length > 0 ? (
                    <ul className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-xs text-foreground">
                      {impact.assets.slice(0, 5).map((asset) => (
                        <li key={asset.id}>
                          <span className="tag">{asset.assetTag}</span> - {asset.name}
                        </li>
                      ))}
                      {impact.assets.length > 5 ? <li className="text-muted-foreground">+{formatCount(impact.assets.length - 5)}</li> : null}
                    </ul>
                  ) : null}
                </li>
              ))}
            </ul>
          ) : (
            <EmptyNote tone="clear">{labels.ldapSyncNoDeactivateImpact}</EmptyNote>
          )}
        </div>
      ) : null}
    </div>
  )
}

// The two choices are one group (spec §7.3): its legend, its hint and, for a stored value that is neither true nor
// false, its error, tied to the group; focus goes to its first choice (v-track plan 3 ST-R6).
function LabelAssetNameModeField({
  id,
  label,
  description,
  compactLabel,
  fullLabel,
  compactEnabled,
  error,
  onChange,
}: {
  id?: string
  label: string
  description: string
  compactLabel: string
  fullLabel: string
  compactEnabled: boolean
  error?: React.ReactNode
  onChange: (compactEnabled: boolean) => void
}) {
  return (
    <FieldGroup legend={label} hint={description} error={error} id={id}>
      <Segmented aria-label={label} value={compactEnabled ? "compact" : "full"} options={[{ value: "compact", label: compactLabel }, { value: "full", label: fullLabel }]} onValueChange={(next) => onChange(next === "compact")} showCheck />
    </FieldGroup>
  )
}

function LabelTemplatePanel({
  tapeSize,
  title,
  labels,
  getValue,
  setValue,
  errorFor,
}: {
  tapeSize: AssetLabelTapeSize
  title: string
  labels: SystemSettingsFormProps["labels"]
  getValue: (key: string) => string
  setValue: (key: string, value: string) => void
  // A setting's error under its field: its rule shows while the value breaks it (spec U8), so the field announces it.
  errorFor?: (key: string) => string | undefined
}) {
  const prefix = `asset_label_${tapeSize}`
  const preset = assetLabelPresets[tapeSize]

  return (
    <div className="rounded-md border border-border bg-background p-3">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <h3 className="text-sm font-semibold text-foreground">{title}</h3>
        <Button
          variant="outline"
          size="sm"
          onClick={() => {
            setValue(`${prefix}_width_mm`, String(preset.widthMm))
            setValue(`${prefix}_height_mm`, String(preset.heightMm))
            setValue(`${prefix}_qr_size`, String(preset.qrSize))
            setValue(`${prefix}_margin_mm`, String(preset.marginMm))
            setValue(`${prefix}_gap_mm`, String(preset.gapMm))
            setValue(`${prefix}_layout`, preset.layout)
            setValue(`${prefix}_primary_template`, preset.lines[0])
            setValue(`${prefix}_secondary_template`, preset.lines[1])
            setValue(`${prefix}_tertiary_template`, preset.lines[2])
          }}
        >
          {labels.labelPreset}
        </Button>
      </div>
      <div className="mt-3 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        <Field label={labels.labelWidthMm} error={errorFor?.(`${prefix}_width_mm`)} liveError>
          <Input
            id={`${prefix}-width-mm`}
            type="number"
            min={30}
            max={120}
            value={getValue(`${prefix}_width_mm`)}
            onChange={(event) => setValue(`${prefix}_width_mm`, event.target.value)}
          />
        </Field>
        <Field label={labels.labelHeightMm} error={errorFor?.(`${prefix}_height_mm`)} liveError>
          <Input
            id={`${prefix}-height-mm`}
            type="number"
            min={10}
            max={100}
            value={getValue(`${prefix}_height_mm`)}
            onChange={(event) => setValue(`${prefix}_height_mm`, event.target.value)}
          />
        </Field>
        <Field label={labels.labelQrSize} error={errorFor?.(`${prefix}_qr_size`)} liveError>
          <Input
            id={`${prefix}-qr-size`}
            type="number"
            min={20}
            max={90}
            value={getValue(`${prefix}_qr_size`)}
            onChange={(event) => setValue(`${prefix}_qr_size`, event.target.value)}
          />
        </Field>
        <Field label={labels.labelMarginMm} error={errorFor?.(`${prefix}_margin_mm`)} liveError>
          <Input
            id={`${prefix}-margin-mm`}
            type="number"
            min={0}
            max={10}
            step="0.5"
            value={getValue(`${prefix}_margin_mm`)}
            onChange={(event) => setValue(`${prefix}_margin_mm`, event.target.value)}
          />
        </Field>
        <Field label={labels.labelGapMm} error={errorFor?.(`${prefix}_gap_mm`)} liveError>
          <Input
            id={`${prefix}-gap-mm`}
            type="number"
            min={0}
            max={10}
            step="0.5"
            value={getValue(`${prefix}_gap_mm`)}
            onChange={(event) => setValue(`${prefix}_gap_mm`, event.target.value)}
          />
        </Field>
        <Field label={labels.labelLayout} error={errorFor?.(`${prefix}_layout`)} liveError>
          <NativeSelect
            id={`${prefix}-layout`}
            value={getValue(`${prefix}_layout`)}
            onChange={(event) => setValue(`${prefix}_layout`, event.target.value)}
          >
            <option value="qr-left">{labels.labelLayoutQrLeft}</option>
            <option value="qr-top">{labels.labelLayoutQrTop}</option>
            <option value="text-only">{labels.labelLayoutTextOnly}</option>
            <option value="qr-only">{labels.labelLayoutQrOnly}</option>
          </NativeSelect>
        </Field>
      </div>
      <div className="mt-3 grid gap-3">
        <Field label={labels.labelPrimaryLine} error={errorFor?.(`${prefix}_primary_template`)} liveError>
          <Input
            id={`${prefix}-primary-template`}
            value={getValue(`${prefix}_primary_template`)}
            onChange={(event) => setValue(`${prefix}_primary_template`, event.target.value)}
            className="font-mono"
          />
        </Field>
        <Field label={labels.labelSecondaryLine} error={errorFor?.(`${prefix}_secondary_template`)} liveError>
          <Input
            id={`${prefix}-secondary-template`}
            value={getValue(`${prefix}_secondary_template`)}
            onChange={(event) => setValue(`${prefix}_secondary_template`, event.target.value)}
            className="font-mono"
          />
        </Field>
        <Field label={labels.labelTertiaryLine} error={errorFor?.(`${prefix}_tertiary_template`)} liveError>
          <Input
            id={`${prefix}-tertiary-template`}
            value={getValue(`${prefix}_tertiary_template`)}
            onChange={(event) => setValue(`${prefix}_tertiary_template`, event.target.value)}
            className="font-mono"
          />
        </Field>
      </div>
    </div>
  )
}

function LabelPreviewPanel({
  labels,
  templates,
  qrValue,
}: {
  labels: SystemSettingsFormProps["labels"]
  templates: AssetLabelTemplates
  qrValue: string
}) {
  const tapeSize = templates.defaultTapeSize
  const config = templates.tapes[tapeSize]
  const values = {
    assetTag: "AST-HQ-COM-0001",
    assetName: "Notebook Dell Latitude",
    labelAssetName: templates.compactAssetNameEnabled ? "Dell Latitude" : "Notebook Dell Latitude",
    serialNumber: "SN123456789",
    category: "Notebook",
    company: "Demo Co.",
    branch: "HQ",
    location: "SathuPradit",
    scanHint: "Scan for asset detail",
  }
  const lines = config.lines.map((line) => renderAssetLabelTemplate(line, values).trim()).filter(Boolean)
  const widthPx = Math.min(520, Math.max(180, config.widthMm * 4))
  const heightPx = Math.min(260, Math.max(48, config.heightMm * 4))
  const marginPx = config.marginMm * 4
  const gapPx = config.gapMm * 4
  const qr = (
    <div className="shrink-0 rounded-sm border border-control-border bg-surface p-1">
      <QRCodeSVG value={qrValue} size={Math.min(config.qrSize, Math.max(28, heightPx - marginPx * 2 - 6))} level="M" includeMargin={false} />
    </div>
  )
  const text = (
    <div className="min-w-0">
      <div className="truncate text-sm font-bold leading-tight">{lines[0] || values.assetTag}</div>
      {lines.slice(1).map((line) => (
        <div key={line} className="mt-1 truncate text-xs leading-tight text-muted-foreground">
          {line}
        </div>
      ))}
    </div>
  )

  return (
    <div className="rounded-md border border-border bg-background p-3">
      <div className="text-sm font-semibold text-foreground">{labels.labelPreview}</div>
      <div className="mt-3 w-full max-w-full overflow-x-auto overscroll-x-contain">
        {/* The sample is the forced-light scope: its tokens stay light, so it looks like the printed label on a dark page (dark mode P-R3). */}
        <div
          data-theme="light"
          className="overflow-hidden rounded border border-control-border bg-surface text-foreground shadow-sm"
          style={{ width: widthPx, height: heightPx, padding: marginPx }}
        >
          <div
            className={config.layout === "qr-top" ? "flex h-full flex-col items-center justify-center" : "grid h-full items-center"}
            style={
              config.layout === "qr-left"
                ? { gridTemplateColumns: "auto 1fr", gap: gapPx }
                : { gap: gapPx }
            }
          >
            {config.layout === "text-only" ? text : config.layout === "qr-only" ? qr : config.layout === "qr-top" ? (
              <>
                {qr}
                <div className="w-full text-center">{text}</div>
              </>
            ) : (
              <>
                {qr}
                {text}
              </>
            )}
          </div>
        </div>
      </div>
      <p className="mt-2 text-xs text-muted-foreground">
        {assetLabelPresets[tapeSize].label} · {config.widthMm} x {config.heightMm} mm
      </p>
    </div>
  )
}
