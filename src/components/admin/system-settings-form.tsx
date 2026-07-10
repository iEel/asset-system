"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { useParams, usePathname, useRouter, useSearchParams } from "next/navigation"
import { ArrowLeft, ArrowRight, Check, ExternalLink, History, Loader2, Pencil, PlugZap, Plus, Save, Search, Trash2, X } from "lucide-react"
import { QRCodeSVG } from "qrcode.react"
import { toast } from "sonner"
import { DepreciationPolicyBuilder } from "@/components/admin/depreciation-policy-builder"
import { SearchableSelect } from "@/components/ui/searchable-select"
import {
  assetLabelLayouts,
  assetLabelPresets,
  assetLabelSettingKeys,
  assetLabelTapeSizes,
  assetLabelTemplateTokens,
  parseAssetLabelTemplates,
  renderAssetLabelTemplate,
  type AssetLabelLayout,
  type AssetLabelTapeSize,
  type AssetLabelTemplates,
} from "@/lib/asset-label-template"
import { depreciationPolicySettingKey, parseDepreciationPolicySetting } from "@/lib/asset-depreciation"
import { assetQrPublicBaseUrlKey, buildAssetQrValue, normalizePublicQrBaseUrl } from "@/lib/asset-qr"
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
  pmAutoGenerationEnabledKey,
  pmAutoGenerationModeKey,
  pmAutoGenerationScheduleKey,
  pmAutoGenerationSettingKeys,
  pmAutoGenerationStatusSettingKeys,
  retentionPolicySettingKeys,
} from "@/lib/system-setting-defaults"
import { operationDocumentTemplateTokens, renderOperationDocumentTemplate, validateOperationDocumentTemplate } from "@/lib/operation-document-number"
import {
  getPmAutomationSettingsForUiMode,
  getPmAutomationUiMode,
  shouldShowPmAutomationSchedule,
  type PmAutomationUiMode,
} from "@/lib/pm-automation-settings"
import {
  isValidRetentionDays,
  retentionAttachmentDaysKey,
  retentionAuditLogDaysKey,
  retentionOrphanFileDaysKey,
} from "@/lib/retention-policy"
import { isSupportedCronExpression } from "@/lib/scheduled-job"
import { getSettingsTabOrder, type SettingsTabId } from "@/lib/settings-information-architecture"
import { buildSystemSettingsTabHref, parseSystemSettingsTab } from "@/lib/system-settings-tabs"
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
  parseWorkflowApprovalPolicy,
  workflowApprovalAuditCloseRequiredKey,
  workflowApprovalDisposalRequiredKey,
  workflowApprovalMaintenanceCloseRequiredKey,
  workflowApprovalMinApproversKey,
  workflowApprovalSegregationRequiredKey,
  workflowApprovalSlaDaysKey,
  workflowApprovalSettingKeys,
} from "@/lib/workflow-approval"

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
    overviewAutomation: string
    overviewGovernance: string
    overviewLdapLogin: string
    overviewLdapSync: string
    overviewAdvanced: string
    enabled: string
    disabled: string
    advancedSettingCount: string
    unsavedChanges: string
    noUnsavedChanges: string
    changeReview: string
    changeReviewDescription: string
    beforeValue: string
    afterValue: string
    advancedWarningTitle: string
    advancedWarningDescription: string
    showAdvancedSettings: string
    generalSettings: string
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
    invalidFormatTemplate: string
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
    invalidLabelTemplate: string
    invalidLabelSize: string
    invalidPublicQrBaseUrl: string
    operationDocumentNumbers: string
    operationDocumentNumbersDescription: string
    checkoutDocumentTemplate: string
    checkinDocumentTemplate: string
    operationDocumentRunningDigits: string
    operationDocumentTemplateHelp: string
    operationDocumentTokens: string
    checkoutDocumentExample: string
    checkinDocumentExample: string
    invalidOperationDocumentTemplate: string
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
    selectCategory: string
    duplicateCategory: string
    invalidPrefix: string
    organizationDefaults: string
    organizationDefaultsDescription: string
    companyName: string
    defaultCurrency: string
    accountingDepreciationPolicy: string
    accountingDepreciationPolicyDescription: string
    invalidAccountingDepreciationPolicy: string
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
    invalidNotificationRule: string
    workflowApprovalPolicy: string
    workflowApprovalPolicyDescription: string
    workflowApprovalDisposalRequired: string
    workflowApprovalAuditCloseRequired: string
    workflowApprovalMaintenanceCloseRequired: string
    workflowApprovalSegregationRequired: string
    workflowApprovalMinApprovers: string
    workflowApprovalMinApproversHelp: string
    workflowApprovalSlaDays: string
    workflowApprovalSlaDaysHelp: string
    workflowApprovalFoundationNote: string
    workflowApprovalSodOn: string
    workflowApprovalSodOff: string
    invalidWorkflowApproval: string
    schedulerSettings: string
    schedulerSettingsDescription: string
    schedulerHeartbeatNote: string
    invalidSchedulerSchedule: string
    pmAutoGeneration: string
    pmAutoGenerationDescription: string
    pmAutoGenerationEnabled: string
    pmAutoGenerationMode: string
    pmAutoGenerationSchedule: string
    pmAutoGenerationSchedulePreset: string
    pmAutoGenerationCustomSchedule: string
    pmAutoGenerationOff: string
    pmAutoGenerationOffDescription: string
    pmAutoGenerationManual: string
    pmAutoGenerationManualDescription: string
    pmAutoGenerationScheduled: string
    pmAutoGenerationScheduledDescription: string
    pmAutoGenerationDaily605: string
    pmAutoGenerationEvery6Hours: string
    pmAutoGenerationWeekday605: string
    pmAutoGenerationMonday605: string
    governanceSettings: string
    governanceSettingsDescription: string
    retentionPolicy: string
    retentionPolicyDescription: string
    retentionAttachmentDays: string
    retentionAuditLogDays: string
    retentionOrphanFileDays: string
    retentionDaysHelp: string
    openStorageGovernance: string
    invalidRetentionPolicy: string
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
    ldapSyncSchedule: string
    ldapSyncSchedulePreset: string
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

const assetTagFormatTokens = [
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
  ...pmAutoGenerationSettingKeys,
  ...pmAutoGenerationStatusSettingKeys,
  ...ldapSettingKeys,
  ...ldapSyncStatusSettingKeys,
])

const pmSchedulePresets = [
  { value: "5 6 * * *", labelKey: "pmAutoGenerationDaily605" },
  { value: "0 */6 * * *", labelKey: "pmAutoGenerationEvery6Hours" },
  { value: "5 6 * * 1-5", labelKey: "pmAutoGenerationWeekday605" },
  { value: "5 6 * * 1", labelKey: "pmAutoGenerationMonday605" },
  { value: "custom", labelKey: "pmAutoGenerationCustomSchedule" },
] as const

const ldapSchedulePresets = [
  { value: "0 2 * * *", labelKey: "ldapSyncDaily2am" },
  { value: "0 */6 * * *", labelKey: "ldapSyncEvery6Hours" },
  { value: "0 2 * * 1-5", labelKey: "ldapSyncWeekday2am" },
  { value: "0 2 * * 1", labelKey: "ldapSyncMonday2am" },
  { value: "custom", labelKey: "ldapSyncCustomSchedule" },
] as const

function normalizeSettingValue(key: string, value: string | undefined) {
  if (key === assetTagCategoryPrefixesKey) {
    return serializePrefixRows(parsePrefixRows(value))
  }

  return value ?? ""
}

function formatReviewValue(key: string, value: string | undefined) {
  const normalized = normalizeSettingValue(key, value)
  if (key.toLowerCase().includes("password") && normalized) return "********"
  return normalized || "-"
}

export function SystemSettingsForm({
  settings,
  categories,
  defaultRoleOptions,
  ldapSyncHistory,
  labels,
}: SystemSettingsFormProps) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const params = useParams<{ locale?: string }>()
  const locale = typeof params.locale === "string" ? params.locale : "th"
  const initialValues = Object.fromEntries(settings.map((setting) => [setting.key, setting.value]))
  const activeTab = parseSystemSettingsTab(searchParams.get("tab"))
  const [saving, setSaving] = useState(false)
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
  const [customPmScheduleSelected, setCustomPmScheduleSelected] = useState(() => {
    const savedSchedule = settings.find((setting) => setting.key === pmAutoGenerationScheduleKey)?.value ?? ""
    return !pmSchedulePresets.some((preset) => preset.value === savedSchedule)
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
  const activeCategoryIds = categories.map((category) => category.id)
  const generalSettings = settings.filter(
    (setting) => !friendlySettingKeys.has(setting.key)
  )
  const formatTemplate = values[assetTagFormatTemplateKey] ?? defaultAssetTagFormatTemplate
  const checkoutDocumentTemplate = values[checkoutDocumentTemplateKey] ?? defaultCheckoutDocumentTemplate
  const checkinDocumentTemplate = values[checkinDocumentTemplateKey] ?? defaultCheckinDocumentTemplate
  const operationDocumentDigits = Number(values[operationDocumentRunningDigitsKey] ?? "4")
  const operationDocumentExampleDate = new Date(2026, 4, 13)
  const operationDocumentExampleDigits = Number.isFinite(operationDocumentDigits) ? operationDocumentDigits : 4
  const getValue = (key: string) => values[key] ?? ""
  const setValue = (key: string, value: string) => setValues((current) => ({ ...current, [key]: value }))
  const setBooleanValue = (key: string, checked: boolean) => setValue(key, checked ? "true" : "false")
  const setPmAutomationUiMode = (mode: PmAutomationUiMode) => {
    const next = getPmAutomationSettingsForUiMode(mode)
    setValues((current) => ({
      ...current,
      [pmAutoGenerationEnabledKey]: next.enabled,
      [pmAutoGenerationModeKey]: next.mode,
    }))
  }
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
  }
  const closePrefixEditor = () => {
    setPrefixEditor(null)
    resetPrefixEditorFilters()
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
  }
  const applyPrefixEditor = () => {
    if (!prefixEditor || !isValidCategoryPrefix(prefixEditor.prefix) || prefixEditor.categoryIds.length === 0) return
    setPrefixRows((current) =>
      applyCategoryPrefixGroupEdit(current, {
        previousPrefix: prefixEditor.previousPrefix,
        prefix: prefixEditor.prefix,
        categoryIds: prefixEditor.categoryIds,
      })
    )
    closePrefixEditor()
  }
  const removePrefixGroup = (prefix: string) => {
    const normalizedPrefix = normalizeCategoryPrefix(prefix)
    setPrefixRows((current) => current.filter((row) => normalizeCategoryPrefix(row.prefix) !== normalizedPrefix))
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
  const selectedPrefixCategoryIds = activePrefixRows.map((row) => row.categoryId).filter(Boolean)
  const hasDuplicateCategory = new Set(selectedPrefixCategoryIds).size !== selectedPrefixCategoryIds.length
  const hasInvalidPrefix = activePrefixRows.some((row) => row.categoryId && !isValidCategoryPrefix(row.prefix))
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
  const canApplyPrefixEditor = Boolean(prefixEditor && isValidCategoryPrefix(prefixEditor.prefix) && prefixEditor.categoryIds.length > 0)
  const templateTokens = Array.from(formatTemplate.matchAll(/\{([A-Za-z0-9]+)\}/g)).map((match) => match[1])
  const hasInvalidTemplate =
    !formatTemplate.includes("{running}") || templateTokens.some((token) => !assetTagFormatTokens.includes(token))
  const publicQrBaseUrl = getValue(assetQrPublicBaseUrlKey)
  const hasInvalidPublicQrBaseUrl = Boolean(publicQrBaseUrl) && !normalizePublicQrBaseUrl(publicQrBaseUrl)
  const publicQrPreviewValue = buildAssetQrValue({
    assetId: "sample-asset-id",
    publicBaseUrl: publicQrBaseUrl,
  })
  const labelTemplateKeys = assetLabelSettingKeys.filter((key) => key.endsWith("_template"))
  const hasInvalidLabelTemplate = labelTemplateKeys.some((key) => {
    const tokens = Array.from(getValue(key).matchAll(/\{([A-Za-z0-9]+)\}/g)).map((match) => match[1])
    return tokens.some((token) => !assetLabelTemplateTokens.includes(token as (typeof assetLabelTemplateTokens)[number]))
  })
  const hasInvalidLabelSize =
    assetLabelTapeSizes.some((size) => {
      const key = `asset_label_${size}_width_mm`
      const width = Number(getValue(key))
      return !Number.isFinite(width) || width < 30 || width > 120
    }) ||
    assetLabelTapeSizes.some((size) => {
      const key = `asset_label_${size}_height_mm`
      const height = Number(getValue(key))
      return !Number.isFinite(height) || height < 10 || height > 100
    }) ||
    assetLabelTapeSizes.some((size) => {
      const key = `asset_label_${size}_qr_size`
      const qrSize = Number(getValue(key))
      return !Number.isFinite(qrSize) || qrSize < 20 || qrSize > 90
    }) ||
    assetLabelTapeSizes.some((size) => {
      const margin = Number(getValue(`asset_label_${size}_margin_mm`))
      const gap = Number(getValue(`asset_label_${size}_gap_mm`))
      return !Number.isFinite(margin) || margin < 0 || margin > 10 || !Number.isFinite(gap) || gap < 0 || gap > 10
    }) ||
    assetLabelTapeSizes.some((size) => {
      const layout = getValue(`asset_label_${size}_layout`) as AssetLabelLayout
      return !assetLabelLayouts.includes(layout)
    })
  const labelTemplates = parseAssetLabelTemplates(values)
  const operationDigits = Number(getValue(operationDocumentRunningDigitsKey))
  const hasInvalidOperationDocumentTemplate =
    !validateOperationDocumentTemplate(checkoutDocumentTemplate) ||
    !validateOperationDocumentTemplate(checkinDocumentTemplate) ||
    !Number.isFinite(operationDigits) ||
    operationDigits < 1 ||
    operationDigits > 12
  const hasInvalidNotificationRule = notificationRuleSettingKeys.some((key) => {
    const days = Number(getValue(key))
    return !Number.isInteger(days) || days < 0 || days > 365
  })
  const hasInvalidRetentionPolicy = retentionPolicySettingKeys.some((key) => !isValidRetentionDays(getValue(key)))
  const depreciationPolicyParse = parseDepreciationPolicySetting(getValue(depreciationPolicySettingKey))
  const hasInvalidDepreciationPolicy = !depreciationPolicyParse.isValid
  const workflowApprovalToggleKeys = workflowApprovalSettingKeys.filter((key) => key !== workflowApprovalMinApproversKey && key !== workflowApprovalSlaDaysKey)
  const workflowApprovalMinApprovers = Number(getValue(workflowApprovalMinApproversKey))
  const workflowApprovalSlaDays = Number(getValue(workflowApprovalSlaDaysKey))
  const hasInvalidWorkflowApproval =
    workflowApprovalToggleKeys.some((key) => getValue(key) !== "true" && getValue(key) !== "false") ||
    !Number.isInteger(workflowApprovalMinApprovers) ||
    workflowApprovalMinApprovers < 1 ||
    workflowApprovalMinApprovers > 5 ||
    !Number.isInteger(workflowApprovalSlaDays) ||
    workflowApprovalSlaDays < 1 ||
    workflowApprovalSlaDays > 90
  const syncSchedule = getValue("ldap_sync_schedule")
  const pmSchedule = getValue(pmAutoGenerationScheduleKey)
  const pmAutomationUiMode = getPmAutomationUiMode({
    enabled: getValue(pmAutoGenerationEnabledKey),
    mode: getValue(pmAutoGenerationModeKey),
  })
  const showPmAutomationSchedule = shouldShowPmAutomationSchedule(pmAutomationUiMode)
  const selectedSyncSchedulePreset = !customScheduleSelected && ldapSchedulePresets.some((preset) => preset.value === syncSchedule)
    ? syncSchedule
    : "custom"
  const selectedPmSchedulePreset = !customPmScheduleSelected && pmSchedulePresets.some((preset) => preset.value === pmSchedule)
    ? pmSchedule
    : "custom"
  const selectedPmSchedulePresetItem = pmSchedulePresets.find((preset) => preset.value === selectedPmSchedulePreset)
  const selectedPmScheduleLabel = selectedPmSchedulePreset === "custom"
    ? pmSchedule || labels.pmAutoGenerationCustomSchedule
    : selectedPmSchedulePresetItem
      ? labels[selectedPmSchedulePresetItem.labelKey]
      : labels.pmAutoGenerationCustomSchedule
  const pmAutomationOptions: Array<{
    value: PmAutomationUiMode
    label: string
    description: string
  }> = [
    {
      value: "off",
      label: labels.pmAutoGenerationOff,
      description: labels.pmAutoGenerationOffDescription,
    },
    {
      value: "manual",
      label: labels.pmAutoGenerationManual,
      description: labels.pmAutoGenerationManualDescription,
    },
    {
      value: "scheduled",
      label: labels.pmAutoGenerationScheduled,
      description: labels.pmAutoGenerationScheduledDescription,
    },
  ]
  const hasInvalidSchedulerSchedule = !isSupportedCronExpression(syncSchedule) || (showPmAutomationSchedule && !isSupportedCronExpression(pmSchedule))
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
  const tabs = getSettingsTabOrder().map((id) => ({ id, label: tabLabels[id] }))
  const selectTab = (tab: SettingsTabId) => {
    if (tab === activeTab) return
    const href = buildSystemSettingsTabHref(pathname, searchParams.toString(), tab)
    window.history.replaceState(null, "", href)
  }
  const overviewCards = [
    {
      label: labels.overviewAssetTag,
      value: formatTemplate,
      tone: "blue",
    },
    {
      label: labels.overviewLabel,
      value: assetLabelPresets[labelTemplates.defaultTapeSize].label,
      tone: "green",
    },
    {
      label: labels.overviewDocuments,
      value: `${renderOperationDocumentTemplate(checkoutDocumentTemplate, operationDocumentExampleDate, 1, operationDocumentExampleDigits)} / ${renderOperationDocumentTemplate(
        checkinDocumentTemplate,
        operationDocumentExampleDate,
        1,
        operationDocumentExampleDigits
      )}`,
      tone: "amber",
    },
    {
      label: labels.overviewOrganization,
      value: getValue("company_name") || "-",
      tone: "slate",
    },
    {
      label: labels.overviewNotifications,
      value: `${getValue(notificationReturnDueSoonDaysKey) || "3"}d / ${getValue(notificationWarrantyExpiryDaysKey) || "30"}d`,
      tone: "blue",
    },
    {
      label: labels.overviewApproval,
      value: `${workflowApprovalPolicy.minApprovers} / SLA ${workflowApprovalPolicy.slaDays}d / ${workflowApprovalPolicy.segregationRequired ? labels.workflowApprovalSodOn : labels.workflowApprovalSodOff}`,
      tone: "amber",
    },
    {
      label: labels.overviewAutomation,
      value: pmAutomationUiMode === "scheduled"
        ? `${labels.pmAutoGenerationScheduled} (${selectedPmScheduleLabel})`
        : pmAutomationUiMode === "manual"
          ? labels.pmAutoGenerationManual
          : labels.disabled,
      tone: pmAutomationUiMode === "scheduled" ? "green" : pmAutomationUiMode === "manual" ? "blue" : "slate",
    },
    {
      label: labels.overviewGovernance,
      value: `${getValue(retentionAttachmentDaysKey) || "-"}d / ${getValue(retentionAuditLogDaysKey) || "-"}d / ${getValue(retentionOrphanFileDaysKey) || "-"}d`,
      tone: hasInvalidRetentionPolicy ? "rose" : "green",
    },
    {
      label: labels.overviewLdapLogin,
      value: getValue("ldap_enabled") === "true" ? labels.enabled : labels.disabled,
      tone: getValue("ldap_enabled") === "true" ? "green" : "slate",
    },
    {
      label: labels.overviewLdapSync,
      value: getValue("ldap_sync_enabled") === "true" ? `${labels.enabled} (${getValue("ldap_sync_mode") || "preview"})` : labels.disabled,
      tone: getValue("ldap_sync_enabled") === "true" ? "green" : "slate",
    },
    {
      label: labels.overviewAdvanced,
      value: labels.advancedSettingCount.replace("{count}", String(generalSettings.length)),
      tone: "rose",
    },
  ] as const

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (hasDuplicateCategory) {
      toast.error(labels.duplicateCategory)
      return
    }
    if (hasInvalidPrefix) {
      toast.error(labels.invalidPrefix)
      return
    }
    if (hasInvalidTemplate) {
      toast.error(labels.invalidFormatTemplate)
      return
    }
    if (hasInvalidPublicQrBaseUrl) {
      toast.error(labels.invalidPublicQrBaseUrl)
      return
    }
    if (hasInvalidLabelTemplate) {
      toast.error(labels.invalidLabelTemplate)
      return
    }
    if (hasInvalidLabelSize) {
      toast.error(labels.invalidLabelSize)
      return
    }
    if (hasInvalidOperationDocumentTemplate) {
      toast.error(labels.invalidOperationDocumentTemplate)
      return
    }
    if (hasInvalidNotificationRule) {
      toast.error(labels.invalidNotificationRule)
      return
    }
    if (hasInvalidRetentionPolicy) {
      toast.error(labels.invalidRetentionPolicy)
      return
    }
    if (hasInvalidDepreciationPolicy) {
      toast.error(labels.invalidAccountingDepreciationPolicy)
      return
    }
    if (hasInvalidWorkflowApproval) {
      toast.error(labels.invalidWorkflowApproval)
      return
    }
    if (hasInvalidSchedulerSchedule) {
      toast.error(labels.invalidSchedulerSchedule)
      return
    }

    setSaving(true)
    const nextValues: Record<string, string> = {
      ...values,
      [assetTagCategoryPrefixesKey]: serializePrefixRows(prefixRows),
    }
    try {
      const response = await fetch("/api/admin/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          settings: settings.map((setting) => ({
            key: setting.key,
            value: nextValues[setting.key] ?? "",
          })),
        }),
      })
      const payload = await response.json().catch(() => null)
      if (!response.ok) throw new Error(payload?.error ?? labels.error)
      toast.success(labels.success)
      router.refresh()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : labels.error)
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
      toast.error(error instanceof Error ? error.message : labels.ldapTestFailed)
    } finally {
      setTestingLdap(false)
    }
  }

  async function handleLdapSync(action: "preview" | "apply") {
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
      toast.error(message)
    } finally {
      setSyncingLdap(null)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="min-w-0 rounded-lg border border-border bg-surface p-2 shadow-sm">
        <div className="flex max-w-full gap-2 overflow-x-auto overscroll-x-contain">
          {tabs.map((tab) => {
            const isActive = activeTab === tab.id
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => selectTab(tab.id)}
                className={`min-h-11 whitespace-nowrap rounded-md px-3 text-sm font-medium transition-colors sm:h-10 sm:min-h-0 ${
                  isActive ? "bg-primary text-white" : "text-muted-foreground hover:bg-accent hover:text-foreground"
                }`}
                aria-pressed={isActive}
              >
                {tab.label}
              </button>
            )
          })}
        </div>
      </div>

      <div className="overflow-hidden rounded-lg border border-border bg-surface shadow-sm">
        <SectionHeader title={labels.settingsOverview} description={labels.settingsOverviewDescription} />
        <div className="grid gap-3 px-4 py-4 sm:grid-cols-2 xl:grid-cols-4">
          {overviewCards.map((card) => (
            <StatusCard key={card.label} label={card.label} value={card.value} tone={card.tone} />
          ))}
        </div>
      </div>

      {activeTab === "asset-numbering" ? (
      <>
      <div className="overflow-hidden rounded-lg border border-border bg-surface shadow-sm">
        <SectionHeader title={labels.assetTagFormat} description={labels.assetTagFormatDescription} />
        <div className="space-y-4 px-4 py-4">
          <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_320px]">
            <div className="space-y-2">
              <label className="block text-sm font-medium text-foreground" htmlFor="asset-tag-template">
                {labels.assetTagTemplate}
              </label>
              <input
                id="asset-tag-template"
                value={formatTemplate}
                onChange={(event) => setValue(assetTagFormatTemplateKey, event.target.value)}
                className="h-10 w-full rounded-md border border-border bg-background px-3 font-mono text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary"
              />
              <p className="text-sm text-muted-foreground">{labels.assetTagTemplateHelp}</p>
              {hasInvalidTemplate ? <ValidationMessage message={labels.invalidFormatTemplate} /> : null}
            </div>
            <div className="space-y-2">
              <div className="text-sm font-medium text-foreground">{labels.formatPresets}</div>
              <div className="grid gap-2">
                {formatPresets.map((preset) => (
                  <button
                    type="button"
                    key={preset.value}
                    onClick={() => setValue(assetTagFormatTemplateKey, preset.value)}
                    className="min-h-10 rounded-md border border-border px-3 py-2 text-left text-sm text-foreground transition-colors hover:bg-accent"
                  >
                    {labels[preset.labelKey]}
                  </button>
                ))}
              </div>
            </div>
          </div>
          <div className="space-y-2">
            <div className="text-xs font-semibold uppercase tracking-normal text-muted-foreground">{labels.availableTokens}</div>
            <div className="flex flex-wrap gap-2">
              {assetTagFormatTokens.map((token) => (
                <button
                  type="button"
                  key={token}
                  onClick={() =>
                    setValues((current) => ({
                      ...current,
                      [assetTagFormatTemplateKey]: `${current[assetTagFormatTemplateKey] ?? defaultAssetTagFormatTemplate}{${token}}`,
                    }))
                  }
                  className="inline-flex min-h-11 items-center rounded-md border border-border px-2 font-mono text-xs text-foreground transition-colors hover:bg-accent sm:h-8 sm:min-h-0"
                >
                  {`{${token}}`}
                </button>
              ))}
            </div>
          </div>
          <div className="rounded-md border border-border bg-muted/30 px-3 py-2 font-mono text-xs text-muted-foreground">
            {labels.exampleFormat}: {"{assetCompanyCode}{separator}{assetPrefix}{separator}{month}{separator}{running}"}
          </div>
        </div>
      </div>

      <div className="overflow-hidden rounded-lg border border-border bg-surface shadow-sm">
        <SectionHeader title={labels.numberingOptions} />
        <div className="grid gap-4 px-4 py-4 md:grid-cols-3">
          <Field label={labels.runningDigits} htmlFor="asset-tag-running-digits">
            <input
              id="asset-tag-running-digits"
              type="number"
              min={1}
              max={12}
              value={getValue("asset_tag_running_digits")}
              onChange={(event) => setValue("asset_tag_running_digits", event.target.value)}
              className="h-10 w-full rounded-md border border-border bg-background px-3 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary"
            />
          </Field>
          <Field label={labels.separator} htmlFor="asset-tag-separator">
            <input
              id="asset-tag-separator"
              value={getValue("asset_tag_separator")}
              onChange={(event) => setValue("asset_tag_separator", event.target.value)}
              className="h-10 w-full rounded-md border border-border bg-background px-3 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary"
            />
          </Field>
          <Field label={labels.globalPrefix} htmlFor="asset-tag-global-prefix">
            <input
              id="asset-tag-global-prefix"
              value={getValue("asset_tag_prefix")}
              onChange={(event) => setValue("asset_tag_prefix", event.target.value.toUpperCase())}
              className="h-10 w-full rounded-md border border-border bg-background px-3 text-sm uppercase outline-none focus:border-primary focus:ring-1 focus:ring-primary"
            />
          </Field>
        </div>
      </div>
      </>
      ) : null}

      {activeTab === "label-template" ? (
      <div className="overflow-hidden rounded-lg border border-border bg-surface shadow-sm">
        <SectionHeader title={labels.labelPrintTemplate} description={labels.labelPrintTemplateDescription} />
        <div className="space-y-4 px-4 py-4">
          <div className="grid gap-4 rounded-md border border-border bg-muted/20 p-3 xl:grid-cols-[minmax(0,1fr)_minmax(260px,360px)]">
            <div className="space-y-2">
              <Field label={labels.publicQrBaseUrl} htmlFor="asset-qr-public-base-url">
                <input
                  id="asset-qr-public-base-url"
                  value={publicQrBaseUrl}
                  placeholder={labels.publicQrBaseUrlPlaceholder}
                  onChange={(event) => setValue(assetQrPublicBaseUrlKey, event.target.value)}
                  className="h-10 w-full rounded-md border border-border bg-background px-3 font-mono text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary"
                />
              </Field>
              <p className="text-sm text-muted-foreground">{labels.publicQrBaseUrlDescription}</p>
              {hasInvalidPublicQrBaseUrl ? <ValidationMessage message={labels.invalidPublicQrBaseUrl} /> : null}
            </div>
            <div className="rounded-md border border-border bg-background p-3">
              <div className="text-xs font-semibold uppercase tracking-normal text-muted-foreground">{labels.publicQrPreview}</div>
              <div className="mt-2 break-all font-mono text-xs text-foreground">{publicQrPreviewValue}</div>
              <div className="mt-2 text-xs text-muted-foreground">{labels.publicQrResolverPath}: /q/a/{"{assetId}"}</div>
            </div>
          </div>
          <div className="grid gap-4 md:grid-cols-[minmax(220px,330px)_minmax(300px,420px)] md:items-start">
            <Field label={labels.defaultTapeSize} htmlFor="asset-label-default-tape-size">
              <select
                id="asset-label-default-tape-size"
                value={getValue("asset_label_default_tape_size")}
                onChange={(event) => setValue("asset_label_default_tape_size", event.target.value)}
                className="h-10 w-full rounded-md border border-border bg-background px-3 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary"
              >
                {assetLabelTapeSizes.map((size) => (
                  <option key={size} value={size}>
                    {assetLabelPresets[size].label}
                  </option>
                ))}
              </select>
            </Field>
            <LabelAssetNameModeField
              label={labels.compactLabelAssetName}
              description={labels.compactLabelAssetNameDescription}
              compactLabel={labels.compactLabelAssetNameShort}
              fullLabel={labels.compactLabelAssetNameFull}
              compactEnabled={getValue("asset_label_compact_asset_name_enabled") === "true"}
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
              />
            ))}
          </div>
          {hasInvalidLabelTemplate ? <ValidationMessage message={labels.invalidLabelTemplate} /> : null}
          {hasInvalidLabelSize ? <ValidationMessage message={labels.invalidLabelSize} /> : null}
          <LabelPreviewPanel labels={labels} templates={labelTemplates} qrValue={publicQrPreviewValue} />
          <div className="space-y-2">
            <div className="text-xs font-semibold uppercase tracking-normal text-muted-foreground">{labels.labelTemplateTokens}</div>
            <div className="flex flex-wrap gap-2">
              {assetLabelTemplateTokens.map((token) => (
                <span key={token} className="inline-flex h-8 items-center rounded-md border border-border px-2 font-mono text-xs text-foreground">
                  {`{${token}}`}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>
      ) : null}

      {activeTab === "documents" ? (
      <div className="overflow-hidden rounded-lg border border-border bg-surface shadow-sm">
        <SectionHeader title={labels.operationDocumentNumbers} description={labels.operationDocumentNumbersDescription} />
        <div className="space-y-4 px-4 py-4">
          <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_260px]">
            <div className="grid gap-4 md:grid-cols-2">
              <Field label={labels.checkoutDocumentTemplate} htmlFor="checkout-document-template">
                <input
                  id="checkout-document-template"
                  value={checkoutDocumentTemplate}
                  onChange={(event) => setValue(checkoutDocumentTemplateKey, event.target.value)}
                  className="h-10 w-full rounded-md border border-border bg-background px-3 font-mono text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary"
                />
              </Field>
              <Field label={labels.checkinDocumentTemplate} htmlFor="checkin-document-template">
                <input
                  id="checkin-document-template"
                  value={checkinDocumentTemplate}
                  onChange={(event) => setValue(checkinDocumentTemplateKey, event.target.value)}
                  className="h-10 w-full rounded-md border border-border bg-background px-3 font-mono text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary"
                />
              </Field>
              <Field label={labels.operationDocumentRunningDigits} htmlFor="operation-document-running-digits">
                <input
                  id="operation-document-running-digits"
                  type="number"
                  min={1}
                  max={12}
                  value={getValue(operationDocumentRunningDigitsKey)}
                  onChange={(event) => setValue(operationDocumentRunningDigitsKey, event.target.value)}
                  className="h-10 w-full rounded-md border border-border bg-background px-3 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary"
                />
              </Field>
            </div>
            <div className="rounded-md border border-border bg-muted/30 p-3 text-xs text-muted-foreground">
              <div className="font-medium text-foreground">{labels.exampleFormat}</div>
              <div className="mt-2 space-y-1 font-mono">
                <div>{labels.checkoutDocumentExample}: {renderOperationDocumentTemplate(checkoutDocumentTemplate, operationDocumentExampleDate, 1, operationDocumentExampleDigits)}</div>
                <div>{labels.checkinDocumentExample}: {renderOperationDocumentTemplate(checkinDocumentTemplate, operationDocumentExampleDate, 1, operationDocumentExampleDigits)}</div>
              </div>
            </div>
          </div>
          <p className="text-sm text-muted-foreground">{labels.operationDocumentTemplateHelp}</p>
          {hasInvalidOperationDocumentTemplate ? <ValidationMessage message={labels.invalidOperationDocumentTemplate} /> : null}
          <div className="space-y-2">
            <div className="text-xs font-semibold uppercase tracking-normal text-muted-foreground">{labels.operationDocumentTokens}</div>
            <div className="flex flex-wrap gap-2">
              {operationDocumentTemplateTokens.map((token) => (
                <span key={token} className="inline-flex h-8 items-center rounded-md border border-border px-2 font-mono text-xs text-foreground">
                  {`{${token}}`}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>
      ) : null}

      {activeTab === "asset-numbering" ? (
      <div className="overflow-hidden rounded-lg border border-border bg-surface shadow-sm">
        <SectionHeader title={labels.categoryPrefixes} description={labels.categoryPrefixesDescription} />
        <div className="space-y-4 px-4 py-4">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
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
            </div>
            <button
              type="button"
              onClick={() => openPrefixEditor()}
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-md bg-primary px-3 text-sm font-semibold text-white transition-colors hover:bg-primary/90 sm:h-10 sm:min-h-0"
            >
              <Plus className="h-4 w-4" />
              {labels.addPrefix}
            </button>
          </div>

          {prefixGroups.length === 0 ? (
            <div className="rounded-md border border-dashed border-border bg-muted/20 px-4 py-6 text-sm text-muted-foreground">
              {labels.noCategoryPrefixes}
            </div>
          ) : (
            <div className="w-full max-w-full overflow-x-auto overscroll-x-contain rounded-md border border-border">
              <table className="min-w-full divide-y divide-border text-sm">
                <thead className="bg-muted/40">
                  <tr>
                    <Head>{labels.prefix}</Head>
                    <Head>{labels.category}</Head>
                    <Head>{labels.categoryPrefixPreview}</Head>
                    <Head>
                      <span className="sr-only">{labels.editPrefix}</span>
                    </Head>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border bg-surface">
                  {prefixGroups.map((group) => (
                    <tr key={group.prefix} className="hover:bg-accent/50">
                      <td className="px-4 py-3">
                        <span className="inline-flex min-h-8 items-center rounded-md border border-border bg-background px-3 font-mono text-sm font-semibold text-foreground">
                          {group.prefix}
                        </span>
                      </td>
                      <td className="min-w-72 px-4 py-3">
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
                      </td>
                      <td className="min-w-56 px-4 py-3 font-mono text-xs text-muted-foreground">
                        {renderAssetTagPreview(formatTemplate, group.prefix, getValue("asset_tag_separator"))}
                      </td>
                      <td className="w-32 px-4 py-3">
                        <div className="flex justify-end gap-2">
                          <button
                            type="button"
                            onClick={() => openPrefixEditor(group.prefix)}
                            className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-border text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
                            title={labels.editPrefix}
                            aria-label={labels.editPrefix}
                          >
                            <Pencil className="h-4 w-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => removePrefixGroup(group.prefix)}
                            className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-border text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
                            title={labels.removePrefix}
                            aria-label={labels.removePrefix}
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <div className="rounded-md border border-border bg-muted/20 px-3 py-2 text-sm text-muted-foreground">
            {formatTemplateText(labels.unassignedCategoryCount, { count: String(unassignedCategoryCount) })}
          </div>
          {hasDuplicateCategory ? <ValidationMessage message={labels.duplicateCategory} /> : null}
          {hasInvalidPrefix ? <ValidationMessage message={labels.invalidPrefix} /> : null}
        </div>

        {prefixEditor ? (
          <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/30 p-3 sm:items-center sm:p-4" role="dialog" aria-modal="true">
            <div className="max-h-[92dvh] w-full max-w-5xl overflow-hidden rounded-lg border border-border bg-surface shadow-xl">
              <div className="flex items-start justify-between gap-4 border-b border-border px-4 py-4">
                <div>
                  <h3 className="text-base font-semibold text-foreground">
                    {prefixEditor.previousPrefix ? labels.editPrefix : labels.addPrefix}
                  </h3>
                  <p className="mt-1 text-sm text-muted-foreground">{labels.categoryPrefixesDescription}</p>
                </div>
                <button
                  type="button"
                  onClick={closePrefixEditor}
                  className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-md border border-border text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
                  aria-label={labels.cancel}
                  title={labels.cancel}
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <div className="max-h-[calc(92dvh-8rem)] space-y-4 overflow-y-auto px-4 py-4">
                <div className="grid gap-4 lg:grid-cols-[minmax(240px,320px)_minmax(0,1fr)]">
                  <Field label={labels.prefix} htmlFor="category-prefix-editor-prefix">
                    <input
                      id="category-prefix-editor-prefix"
                      value={prefixEditor.prefix}
                      onChange={(event) =>
                        setPrefixEditor((current) =>
                          current ? { ...current, prefix: event.target.value.toUpperCase() } : current
                        )
                      }
                      maxLength={10}
                      className="h-10 w-full rounded-md border border-border bg-background px-3 font-mono text-sm uppercase outline-none focus:border-primary focus:ring-1 focus:ring-primary"
                    />
                  </Field>
                  <div className="rounded-md border border-border bg-muted/20 px-3 py-2">
                    <div className="text-xs font-semibold uppercase tracking-normal text-muted-foreground">
                      {labels.categoryPrefixPreview}
                    </div>
                    <div className="mt-1 font-mono text-sm text-foreground">
                      {renderAssetTagPreview(formatTemplate, normalizedPrefixDraft || "COM", getValue("asset_tag_separator"))}
                    </div>
                  </div>
                </div>

                {!isValidCategoryPrefix(prefixEditor.prefix) ? <ValidationMessage message={labels.invalidPrefix} /> : null}

                <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)]">
                  <CategoryTransferPanel
                    title={labels.availableCategories}
                    count={filteredAvailableCategories.length}
                    searchValue={availableCategorySearch}
                    searchPlaceholder={labels.searchCategories}
                    onSearchChange={setAvailableCategorySearch}
                  >
                    {filteredAvailableCategories.length === 0 ? (
                      <EmptyTransferState label={labels.noMatchingCategories} />
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
                    <button
                      type="button"
                      onClick={addCheckedCategoriesToPrefix}
                      disabled={checkedAvailableCategoryIds.length === 0}
                      className="inline-flex min-h-11 items-center justify-center gap-2 rounded-md border border-border px-3 text-sm font-medium text-foreground transition-colors hover:bg-accent disabled:cursor-not-allowed disabled:opacity-50 sm:h-10 sm:min-h-0"
                    >
                      <ArrowRight className="h-4 w-4" />
                      <span className="hidden sm:inline">{labels.addSelectedCategories}</span>
                    </button>
                    <button
                      type="button"
                      onClick={removeCheckedCategoriesFromPrefix}
                      disabled={checkedSelectedCategoryIds.length === 0}
                      className="inline-flex min-h-11 items-center justify-center gap-2 rounded-md border border-border px-3 text-sm font-medium text-foreground transition-colors hover:bg-accent disabled:cursor-not-allowed disabled:opacity-50 sm:h-10 sm:min-h-0"
                    >
                      <ArrowLeft className="h-4 w-4" />
                      <span className="hidden sm:inline">{labels.removeSelectedCategories}</span>
                    </button>
                  </div>

                  <CategoryTransferPanel
                    title={labels.selectedPrefixCategories}
                    count={filteredSelectedCategories.length}
                    searchValue={selectedCategorySearch}
                    searchPlaceholder={labels.searchCategories}
                    onSearchChange={setSelectedCategorySearch}
                  >
                    {prefixEditor.categoryIds.length === 0 ? (
                      <EmptyTransferState label={labels.noSelectedCategories} />
                    ) : filteredSelectedCategories.length === 0 ? (
                      <EmptyTransferState label={labels.noMatchingCategories} />
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
              </div>

              <div className="flex flex-col-reverse gap-2 border-t border-border px-4 py-3 sm:flex-row sm:justify-end">
                <button
                  type="button"
                  onClick={closePrefixEditor}
                  className="inline-flex min-h-11 items-center justify-center rounded-md border border-border px-4 text-sm font-medium text-foreground transition-colors hover:bg-accent sm:h-10 sm:min-h-0"
                >
                  {labels.cancel}
                </button>
                <button
                  type="button"
                  onClick={applyPrefixEditor}
                  disabled={!canApplyPrefixEditor}
                  className="inline-flex min-h-11 items-center justify-center gap-2 rounded-md bg-primary px-4 text-sm font-semibold text-white transition-colors hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-50 sm:h-10 sm:min-h-0"
                >
                  <Save className="h-4 w-4" />
                  {labels.savePrefixGroup}
                </button>
              </div>
            </div>
          </div>
        ) : null}
      </div>
      ) : null}

      {activeTab === "organization" ? (
      <div className="overflow-hidden rounded-lg border border-border bg-surface shadow-sm">
        <SectionHeader title={labels.organizationDefaults} description={labels.organizationDefaultsDescription} />
        <div className="grid gap-4 px-4 py-4 md:grid-cols-2">
          <Field label={labels.companyName} htmlFor="company-name">
            <input
              id="company-name"
              value={getValue("company_name")}
              onChange={(event) => setValue("company_name", event.target.value)}
              className="h-10 w-full rounded-md border border-border bg-background px-3 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary"
            />
          </Field>
          <Field label={labels.defaultCurrency} htmlFor="default-currency">
            <input
              id="default-currency"
              value={getValue("default_currency")}
              onChange={(event) => setValue("default_currency", event.target.value.toUpperCase())}
              className="h-10 w-full rounded-md border border-border bg-background px-3 text-sm uppercase outline-none focus:border-primary focus:ring-1 focus:ring-primary"
            />
          </Field>
          <div className="md:col-span-2">
            <DepreciationPolicyBuilder
              categories={categories}
              policyJson={getValue(depreciationPolicySettingKey)}
              labels={labels}
              onPolicyJsonChange={(value) => setValue(depreciationPolicySettingKey, value)}
            />
            <p className="mt-2 text-sm text-muted-foreground">{labels.accountingDepreciationPolicyDescription}</p>
            {hasInvalidDepreciationPolicy ? <ValidationMessage message={labels.invalidAccountingDepreciationPolicy} /> : null}
          </div>
        </div>
      </div>
      ) : null}

      {activeTab === "notifications" ? (
      <div className="overflow-hidden rounded-lg border border-border bg-surface shadow-sm">
        <SectionHeader title={labels.notificationRules} description={labels.notificationRulesDescription} />
        <div className="grid gap-4 px-4 py-4 md:grid-cols-2 xl:grid-cols-4">
          <Field label={labels.returnDueSoonDays} htmlFor="notification-return-due-days">
            <input
              id="notification-return-due-days"
              type="number"
              min={0}
              max={365}
              value={getValue(notificationReturnDueSoonDaysKey)}
              onChange={(event) => setValue(notificationReturnDueSoonDaysKey, event.target.value)}
              className="h-10 w-full rounded-md border border-border bg-background px-3 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary"
            />
          </Field>
          <Field label={labels.auditActionDueSoonDays} htmlFor="notification-audit-action-days">
            <input
              id="notification-audit-action-days"
              type="number"
              min={0}
              max={365}
              value={getValue(notificationAuditActionDueSoonDaysKey)}
              onChange={(event) => setValue(notificationAuditActionDueSoonDaysKey, event.target.value)}
              className="h-10 w-full rounded-md border border-border bg-background px-3 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary"
            />
          </Field>
          <Field label={labels.warrantyExpiryDays} htmlFor="notification-warranty-expiry-days">
            <input
              id="notification-warranty-expiry-days"
              type="number"
              min={0}
              max={365}
              value={getValue(notificationWarrantyExpiryDaysKey)}
              onChange={(event) => setValue(notificationWarrantyExpiryDaysKey, event.target.value)}
              className="h-10 w-full rounded-md border border-border bg-background px-3 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary"
            />
          </Field>
          <Field label={labels.licenseExpiryDays} htmlFor="notification-license-expiry-days">
            <input
              id="notification-license-expiry-days"
              type="number"
              min={0}
              max={365}
              value={getValue(notificationLicenseExpiryDaysKey)}
              onChange={(event) => setValue(notificationLicenseExpiryDaysKey, event.target.value)}
              className="h-10 w-full rounded-md border border-border bg-background px-3 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary"
            />
          </Field>
        </div>
        <div className="border-t border-border px-4 py-3">
          <p className="text-sm text-muted-foreground">{labels.notificationDaysHelp}</p>
          {hasInvalidNotificationRule ? <ValidationMessage message={labels.invalidNotificationRule} /> : null}
        </div>
      </div>
      ) : null}

      {activeTab === "workflow-approval" ? (
      <div className="overflow-hidden rounded-lg border border-border bg-surface shadow-sm">
        <SectionHeader title={labels.workflowApprovalPolicy} description={labels.workflowApprovalPolicyDescription} />
        <div className="space-y-4 px-4 py-4">
          <p className="rounded-md border border-border bg-muted/30 px-3 py-2 text-sm text-muted-foreground">
            {labels.workflowApprovalFoundationNote}
          </p>
          <div className="grid gap-4 lg:grid-cols-2">
            <ToggleField
              label={labels.workflowApprovalDisposalRequired}
              checked={getValue(workflowApprovalDisposalRequiredKey) === "true"}
              onChange={(checked) => setBooleanValue(workflowApprovalDisposalRequiredKey, checked)}
            />
            <ToggleField
              label={labels.workflowApprovalAuditCloseRequired}
              checked={getValue(workflowApprovalAuditCloseRequiredKey) === "true"}
              onChange={(checked) => setBooleanValue(workflowApprovalAuditCloseRequiredKey, checked)}
            />
            <ToggleField
              label={labels.workflowApprovalMaintenanceCloseRequired}
              checked={getValue(workflowApprovalMaintenanceCloseRequiredKey) === "true"}
              onChange={(checked) => setBooleanValue(workflowApprovalMaintenanceCloseRequiredKey, checked)}
            />
            <ToggleField
              label={labels.workflowApprovalSegregationRequired}
              checked={getValue(workflowApprovalSegregationRequiredKey) === "true"}
              onChange={(checked) => setBooleanValue(workflowApprovalSegregationRequiredKey, checked)}
            />
            <Field label={labels.workflowApprovalMinApprovers} htmlFor="workflow-approval-min-approvers">
              <input
                id="workflow-approval-min-approvers"
                type="number"
                min={1}
                max={5}
                value={getValue(workflowApprovalMinApproversKey)}
                onChange={(event) => setValue(workflowApprovalMinApproversKey, event.target.value)}
                className="h-10 w-full rounded-md border border-border bg-background px-3 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary"
              />
            </Field>
            <Field label={labels.workflowApprovalSlaDays} htmlFor="workflow-approval-sla-days">
              <input
                id="workflow-approval-sla-days"
                type="number"
                min={1}
                max={90}
                value={getValue(workflowApprovalSlaDaysKey)}
                onChange={(event) => setValue(workflowApprovalSlaDaysKey, event.target.value)}
                className="h-10 w-full rounded-md border border-border bg-background px-3 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary"
              />
            </Field>
          </div>
          <p className="text-sm text-muted-foreground">{labels.workflowApprovalMinApproversHelp}</p>
          <p className="text-sm text-muted-foreground">{labels.workflowApprovalSlaDaysHelp}</p>
          {hasInvalidWorkflowApproval ? <ValidationMessage message={labels.invalidWorkflowApproval} /> : null}
        </div>
      </div>
      ) : null}

      {activeTab === "automation" ? (
      <div className="overflow-hidden rounded-lg border border-border bg-surface shadow-sm">
        <SectionHeader title={labels.schedulerSettings} description={labels.schedulerSettingsDescription} />
        <div className="space-y-4 px-4 py-4">
          <p className="rounded-md border border-border bg-muted/30 px-3 py-2 text-sm text-muted-foreground">
            {labels.schedulerHeartbeatNote}
          </p>
          <div className="rounded-md border border-border bg-background p-4">
            <div className="flex flex-col gap-1">
              <h3 className="text-base font-semibold text-foreground">{labels.pmAutoGeneration}</h3>
              <p className="text-sm text-muted-foreground">{labels.pmAutoGenerationDescription}</p>
            </div>
            <div className="mt-4 grid gap-3 lg:grid-cols-3">
              {pmAutomationOptions.map((option) => {
                const isActive = pmAutomationUiMode === option.value
                return (
                  <button
                    key={option.value}
                    type="button"
                    aria-pressed={isActive}
                    onClick={() => setPmAutomationUiMode(option.value)}
                    className={`min-h-24 rounded-md border px-4 py-3 text-left transition-colors ${
                      isActive
                        ? "border-primary bg-primary/10 text-primary shadow-sm"
                        : "border-border bg-muted/20 text-foreground hover:border-primary/40 hover:bg-accent"
                    }`}
                  >
                    <span className="block text-sm font-semibold">{option.label}</span>
                    <span className={`mt-2 block text-xs leading-5 ${isActive ? "text-primary" : "text-muted-foreground"}`}>
                      {option.description}
                    </span>
                  </button>
                )
              })}
            </div>
            {showPmAutomationSchedule ? (
              <div className="mt-4 grid gap-4 lg:grid-cols-2">
                <Field label={labels.pmAutoGenerationSchedulePreset} htmlFor="pm-auto-generation-schedule-preset">
                  <select
                    id="pm-auto-generation-schedule-preset"
                    value={selectedPmSchedulePreset}
                    onChange={(event) => {
                      const value = event.target.value
                      setCustomPmScheduleSelected(value === "custom")
                      if (value !== "custom") {
                        setValue(pmAutoGenerationScheduleKey, value)
                      }
                    }}
                    className="h-10 w-full rounded-md border border-border bg-background px-3 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary"
                  >
                    {pmSchedulePresets.map((preset) => (
                      <option key={preset.value} value={preset.value}>
                        {labels[preset.labelKey]}
                      </option>
                    ))}
                  </select>
                </Field>
                {selectedPmSchedulePreset === "custom" ? (
                  <Field label={labels.pmAutoGenerationCustomSchedule} htmlFor="pm-auto-generation-custom-schedule">
                    <input
                      id="pm-auto-generation-custom-schedule"
                      value={pmSchedule}
                      onChange={(event) => setValue(pmAutoGenerationScheduleKey, event.target.value)}
                      placeholder="5 6 * * *"
                      className="h-10 w-full rounded-md border border-border bg-background px-3 font-mono text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary"
                    />
                  </Field>
                ) : null}
              </div>
            ) : (
              <p className="mt-4 rounded-md border border-border bg-muted/30 px-3 py-2 text-sm text-muted-foreground">
                {pmAutomationUiMode === "off" ? labels.pmAutoGenerationOffDescription : labels.pmAutoGenerationManualDescription}
              </p>
            )}
          </div>
          {hasInvalidSchedulerSchedule ? <ValidationMessage message={labels.invalidSchedulerSchedule} /> : null}
        </div>
      </div>
      ) : null}

      {activeTab === "governance" ? (
      <div className="overflow-hidden rounded-lg border border-border bg-surface shadow-sm">
        <SectionHeader title={labels.governanceSettings} description={labels.governanceSettingsDescription} />
        <div className="space-y-4 px-4 py-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <h3 className="text-base font-semibold text-foreground">{labels.retentionPolicy}</h3>
              <p className="mt-1 text-sm text-muted-foreground">{labels.retentionPolicyDescription}</p>
            </div>
            <a
              href={`/${locale}/admin/storage`}
              className="inline-flex min-h-11 w-full items-center justify-center rounded-md border border-border bg-background px-3 py-2 text-sm font-medium text-foreground transition-colors hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 sm:w-fit"
            >
              {labels.openStorageGovernance}
            </a>
          </div>
          <div className="grid gap-4 lg:grid-cols-3">
            <Field label={labels.retentionAttachmentDays} htmlFor="retention-attachment-days">
              <input
                id="retention-attachment-days"
                type="number"
                min={1}
                max={3650}
                value={getValue(retentionAttachmentDaysKey)}
                onChange={(event) => setValue(retentionAttachmentDaysKey, event.target.value)}
                className="h-10 w-full rounded-md border border-border bg-background px-3 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary"
              />
            </Field>
            <Field label={labels.retentionAuditLogDays} htmlFor="retention-audit-log-days">
              <input
                id="retention-audit-log-days"
                type="number"
                min={1}
                max={3650}
                value={getValue(retentionAuditLogDaysKey)}
                onChange={(event) => setValue(retentionAuditLogDaysKey, event.target.value)}
                className="h-10 w-full rounded-md border border-border bg-background px-3 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary"
              />
            </Field>
            <Field label={labels.retentionOrphanFileDays} htmlFor="retention-orphan-file-days">
              <input
                id="retention-orphan-file-days"
                type="number"
                min={1}
                max={3650}
                value={getValue(retentionOrphanFileDaysKey)}
                onChange={(event) => setValue(retentionOrphanFileDaysKey, event.target.value)}
                className="h-10 w-full rounded-md border border-border bg-background px-3 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary"
              />
            </Field>
          </div>
          <p className="rounded-md border border-border bg-muted/30 px-3 py-2 text-sm text-muted-foreground">
            {labels.retentionDaysHelp}
          </p>
          {hasInvalidRetentionPolicy ? <ValidationMessage message={labels.invalidRetentionPolicy} /> : null}
        </div>
      </div>
      ) : null}

      {activeTab === "ldap-login" ? (
      <div className="overflow-visible rounded-lg border border-border bg-surface shadow-sm">
        <SectionHeader title={labels.ldapSettings} description={labels.ldapSettingsDescription} />
        <div className="space-y-5 px-4 py-4">
          <WizardStep number={1} title={labels.ldapStepConnection}>
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
              <Field label={labels.ldapUrl} htmlFor="ldap-url">
                <input
                  id="ldap-url"
                  value={getValue("ldap_url")}
                  onChange={(event) => setValue("ldap_url", event.target.value)}
                  placeholder="ldap://dc.company.local:389"
                  className="h-10 w-full rounded-md border border-border bg-background px-3 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary"
                />
              </Field>
              <Field label={labels.ldapBaseDn} htmlFor="ldap-base-dn">
                <input
                  id="ldap-base-dn"
                  value={getValue("ldap_base_dn")}
                  onChange={(event) => setValue("ldap_base_dn", event.target.value)}
                  placeholder="DC=company,DC=local"
                  className="h-10 w-full rounded-md border border-border bg-background px-3 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary"
                />
              </Field>
              <Field label={labels.ldapBindDn} htmlFor="ldap-bind-dn">
                <input
                  id="ldap-bind-dn"
                  value={getValue("ldap_bind_dn")}
                  onChange={(event) => setValue("ldap_bind_dn", event.target.value)}
                  placeholder="CN=ldap-reader,OU=Service Accounts,DC=company,DC=local"
                  className="h-10 w-full rounded-md border border-border bg-background px-3 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary"
                />
              </Field>
              <Field label={labels.ldapBindPassword} htmlFor="ldap-bind-password">
                <input
                  id="ldap-bind-password"
                  type="password"
                  value={getValue("ldap_bind_password")}
                  onChange={(event) => setValue("ldap_bind_password", event.target.value)}
                  className="h-10 w-full rounded-md border border-border bg-background px-3 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary"
                />
              </Field>
            </div>
            <button
              type="button"
              onClick={handleLdapTest}
              disabled={testingLdap}
              className="mt-4 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-md border border-border px-3 text-sm font-medium text-foreground transition-colors hover:bg-accent disabled:opacity-50 sm:h-10 sm:min-h-0 sm:w-auto"
            >
              {testingLdap ? <Loader2 className="h-4 w-4 animate-spin" /> : <PlugZap className="h-4 w-4" />}
              {labels.testLdapConnection}
            </button>
          </WizardStep>

          <WizardStep number={2} title={labels.ldapStepLoginMapping}>
            <div className="grid gap-4 lg:grid-cols-2">
              <Field label={labels.ldapUserFilter} htmlFor="ldap-user-filter">
                <input
                  id="ldap-user-filter"
                  value={getValue("ldap_user_filter")}
                  onChange={(event) => setValue("ldap_user_filter", event.target.value)}
                  className="h-10 w-full rounded-md border border-border bg-background px-3 font-mono text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary"
                />
              </Field>
              <Field label={labels.ldapUpnDomain} htmlFor="ldap-upn-domain">
                <input
                  id="ldap-upn-domain"
                  value={getValue("ldap_upn_domain")}
                  onChange={(event) => setValue("ldap_upn_domain", event.target.value)}
                  placeholder="company.local"
                  className="h-10 w-full rounded-md border border-border bg-background px-3 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary"
                />
              </Field>
              <Field label={labels.ldapDomain} htmlFor="ldap-domain">
                <input
                  id="ldap-domain"
                  value={getValue("ldap_domain")}
                  onChange={(event) => setValue("ldap_domain", event.target.value)}
                  placeholder="COMPANY"
                  className="h-10 w-full rounded-md border border-border bg-background px-3 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary"
                />
              </Field>
              <div className="lg:col-span-2">
                <Field label={labels.ldapUserDnTemplate} htmlFor="ldap-user-dn-template">
                  <input
                    id="ldap-user-dn-template"
                    value={getValue("ldap_user_dn_template")}
                    onChange={(event) => setValue("ldap_user_dn_template", event.target.value)}
                    placeholder="CN={username},OU=Users,DC=company,DC=local"
                    className="h-10 w-full rounded-md border border-border bg-background px-3 font-mono text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary"
                  />
                </Field>
              </div>
            </div>
          </WizardStep>

          <WizardStep number={3} title={labels.ldapStepProvisioning}>
            <div className="grid gap-4 lg:grid-cols-2">
              <div className="space-y-2">
                <span className="block text-sm font-medium text-foreground">{labels.ldapAutoProvision}</span>
                <label className="flex min-h-11 items-center justify-between gap-3 rounded-md border border-border bg-background px-3 py-2 text-sm font-medium text-foreground">
                  <span>{getValue("ldap_auto_provision") === "true" ? labels.enabled : labels.disabled}</span>
                  <input
                    type="checkbox"
                    checked={getValue("ldap_auto_provision") === "true"}
                    onChange={(event) => setBooleanValue("ldap_auto_provision", event.target.checked)}
                    className="h-4 w-4 rounded border-border text-primary focus:ring-primary"
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
                  <p className="rounded-md border border-warning/30 bg-warning/10 px-3 py-2 text-xs font-medium text-warning">
                    {labels.ldapDefaultRoleMissing.replace("{role}", getValue("ldap_default_role"))}
                  </p>
                ) : null}
              </div>
            </div>
          </WizardStep>
        </div>
      </div>
      ) : null}

      {activeTab === "ldap-sync" ? (
      <div className="overflow-hidden rounded-lg border border-border bg-surface shadow-sm">
        <SectionHeader title={labels.ldapSyncStrategy} description={labels.ldapSyncStrategyDescription} />
        <div className="space-y-4 px-4 py-4">
          <p className="rounded-md border border-border bg-muted/30 px-3 py-2 text-sm text-muted-foreground">
            {labels.ldapSyncRecommendation}
          </p>
          <WizardStep number={1} title={labels.ldapStepSyncStrategy}>
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
              <Field label={labels.ldapSyncMode} htmlFor="ldap-sync-mode">
                <select
                  id="ldap-sync-mode"
                  value={getValue("ldap_sync_mode")}
                  onChange={(event) => setValue("ldap_sync_mode", event.target.value)}
                  className="h-10 w-full rounded-md border border-border bg-background px-3 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary"
                >
                  <option value="preview">Preview</option>
                  <option value="manual">Manual</option>
                  <option value="scheduled">Scheduled</option>
                </select>
              </Field>
              <Field label={labels.ldapSyncMaxScheduledDeactivations} htmlFor="ldap-sync-max-scheduled-deactivations">
                <input
                  id="ldap-sync-max-scheduled-deactivations"
                  type="number"
                  min={0}
                  value={getValue("ldap_sync_max_scheduled_deactivations")}
                  onChange={(event) => setValue("ldap_sync_max_scheduled_deactivations", event.target.value)}
                  className="h-10 w-full rounded-md border border-border bg-background px-3 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary"
                />
              </Field>
              <Field label={labels.ldapSyncBaseDn} htmlFor="ldap-sync-base-dn">
                <input
                  id="ldap-sync-base-dn"
                  value={getValue("ldap_sync_base_dn")}
                  onChange={(event) => setValue("ldap_sync_base_dn", event.target.value)}
                  placeholder="OU=Employees,DC=company,DC=local"
                  className="h-10 w-full rounded-md border border-border bg-background px-3 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary"
                />
              </Field>
            </div>
          </WizardStep>

          <WizardStep number={2} title={labels.ldapStepOrgMapping}>
              <div className="rounded-md border border-border bg-muted/30 px-3 py-3">
                <div className="text-sm font-medium text-foreground">{labels.ldapSyncDefaultMapping}</div>
                <p className="mt-1 text-sm text-muted-foreground">{labels.ldapSyncDefaultMappingDescription}</p>
                <div className="mt-3 grid gap-3 md:grid-cols-3">
                  <Field label={labels.ldapSyncDefaultCompanyCode} htmlFor="ldap-sync-default-company">
                    <input
                      id="ldap-sync-default-company"
                      value={getValue("ldap_sync_default_company_code")}
                      onChange={(event) => setValue("ldap_sync_default_company_code", event.target.value.toUpperCase())}
                      className="h-10 w-full rounded-md border border-border bg-background px-3 text-sm uppercase outline-none focus:border-primary focus:ring-1 focus:ring-primary"
                    />
                  </Field>
                  <Field label={labels.ldapSyncDefaultBranchCode} htmlFor="ldap-sync-default-branch">
                    <input
                      id="ldap-sync-default-branch"
                      value={getValue("ldap_sync_default_branch_code")}
                      onChange={(event) => setValue("ldap_sync_default_branch_code", event.target.value.toUpperCase())}
                      className="h-10 w-full rounded-md border border-border bg-background px-3 text-sm uppercase outline-none focus:border-primary focus:ring-1 focus:ring-primary"
                    />
                  </Field>
                  <Field label={labels.ldapSyncDefaultDepartmentCode} htmlFor="ldap-sync-default-department">
                    <input
                      id="ldap-sync-default-department"
                      value={getValue("ldap_sync_default_department_code")}
                      onChange={(event) => setValue("ldap_sync_default_department_code", event.target.value.toUpperCase())}
                      className="h-10 w-full rounded-md border border-border bg-background px-3 text-sm uppercase outline-none focus:border-primary focus:ring-1 focus:ring-primary"
                    />
                  </Field>
                </div>
              </div>
          </WizardStep>

          <WizardStep number={3} title={labels.ldapStepSchedule}>
            <div className="grid gap-4 lg:grid-cols-2">
            <Field label={labels.ldapSyncSchedule} htmlFor="ldap-sync-schedule-preset">
              <select
                id="ldap-sync-schedule-preset"
                value={selectedSyncSchedulePreset}
                onChange={(event) => {
                  const value = event.target.value
                  setCustomScheduleSelected(value === "custom")
                  if (value !== "custom") {
                    setValue("ldap_sync_schedule", value)
                  }
                }}
                className="h-10 w-full rounded-md border border-border bg-background px-3 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary"
              >
                {ldapSchedulePresets.map((preset) => (
                  <option key={preset.value} value={preset.value}>
                    {labels[preset.labelKey]}
                  </option>
                ))}
              </select>
            </Field>
            <div className="lg:col-span-2">
              <Field label={labels.ldapSyncFilter} htmlFor="ldap-sync-filter">
                <input
                  id="ldap-sync-filter"
                  value={getValue("ldap_sync_filter")}
                  onChange={(event) => setValue("ldap_sync_filter", event.target.value)}
                  className="h-10 w-full rounded-md border border-border bg-background px-3 font-mono text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary"
                />
              </Field>
            </div>
            {selectedSyncSchedulePreset === "custom" ? (
              <div className="lg:col-span-2">
                <Field label={labels.ldapSyncCustomSchedule} htmlFor="ldap-sync-custom-schedule">
                  <input
                    id="ldap-sync-custom-schedule"
                    value={syncSchedule}
                    onChange={(event) => setValue("ldap_sync_schedule", event.target.value)}
                    placeholder="0 2 * * *"
                    className="h-10 w-full rounded-md border border-border bg-background px-3 font-mono text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary"
                  />
                </Field>
              </div>
            ) : null}
          </div>
          </WizardStep>

          <WizardStep number={4} title={labels.ldapStepPreviewApply}>
          <div className="flex flex-col gap-2 sm:flex-row">
            <button
              type="button"
              onClick={() => handleLdapSync("preview")}
              disabled={syncingLdap !== null}
              className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-md border border-border px-3 text-sm font-medium text-foreground transition-colors hover:bg-accent disabled:opacity-50 sm:h-10 sm:min-h-0 sm:w-auto"
            >
              {syncingLdap === "preview" ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              {labels.ldapSyncPreview}
            </button>
            <button
              type="button"
              onClick={() => handleLdapSync("apply")}
              disabled={syncingLdap !== null || !syncPreview}
              className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-md bg-primary px-3 text-sm font-medium text-white transition-colors hover:bg-primary/90 disabled:opacity-50 sm:h-10 sm:min-h-0 sm:w-auto"
            >
              {syncingLdap === "apply" ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              {labels.ldapSyncApply}
            </button>
          </div>
          {syncError ? (
            <div className="rounded-md border border-danger/30 bg-danger/10 px-3 py-2 text-sm text-danger">
              {syncError}
            </div>
          ) : null}
          <SyncPreviewPanel labels={labels} preview={syncPreview} locale={locale} />
          </WizardStep>
          <LdapSyncHistoryPanel labels={labels} history={ldapSyncHistory} locale={locale} />
        </div>
      </div>
      ) : null}

      {activeTab === "advanced" && generalSettings.length > 0 ? (
        <details className="overflow-hidden rounded-lg border border-warning/30 bg-surface shadow-sm">
          <summary className="cursor-pointer list-none border-b border-warning/20 bg-warning/10 px-4 py-4">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="text-base font-semibold text-foreground">{labels.advancedWarningTitle}</h2>
                <p className="mt-1 text-sm text-muted-foreground">{labels.advancedWarningDescription}</p>
              </div>
              <span className="text-sm font-medium text-warning">{labels.showAdvancedSettings}</span>
            </div>
          </summary>
          <SectionHeader title={labels.advancedSettings} description={labels.advancedSettingsDescription} />
          <div className="w-full max-w-full overflow-x-auto overscroll-x-contain">
            <table className="min-w-full divide-y divide-border text-sm">
              <thead className="bg-muted/40">
                <tr>
                  <Head>{labels.key}</Head>
                  <Head>{labels.value}</Head>
                  <Head>{labels.description}</Head>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {generalSettings.map((setting) => (
                  <tr key={setting.key} className="hover:bg-accent/50">
                    <td className="whitespace-nowrap px-4 py-3 font-medium text-foreground">{setting.key}</td>
                    <td className="min-w-80 px-4 py-3">
                      <input
                        value={values[setting.key] ?? ""}
                        onChange={(event) => setValues((current) => ({ ...current, [setting.key]: event.target.value }))}
                        className="h-10 w-full rounded-md border border-border bg-background px-3 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary"
                      />
                    </td>
                    <td className="min-w-80 px-4 py-3 text-muted-foreground">{setting.description || "-"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </details>
      ) : null}

      {changedCount > 0 ? (
        <div className="overflow-hidden rounded-lg border border-border bg-surface shadow-sm">
          <SectionHeader title={labels.changeReview} description={labels.changeReviewDescription} />
          <div className="w-full max-w-full overflow-x-auto overscroll-x-contain">
            <table className="min-w-full divide-y divide-border text-sm">
              <thead className="bg-muted/40">
                <tr>
                  <Head>{labels.key}</Head>
                  <Head>{labels.beforeValue}</Head>
                  <Head>{labels.afterValue}</Head>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {changedSettings.map((setting) => (
                  <tr key={setting.key} className="hover:bg-accent/50">
                    <td className="whitespace-nowrap px-4 py-3 font-medium text-foreground">{setting.key}</td>
                    <td className="max-w-md break-words px-4 py-3 text-muted-foreground">
                      {formatReviewValue(setting.key, initialValues[setting.key])}
                    </td>
                    <td className="max-w-md break-words px-4 py-3 font-medium text-foreground">
                      {formatReviewValue(setting.key, effectiveValues[setting.key])}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : null}

      <div className="sticky bottom-3 z-20 rounded-lg border border-border bg-surface/95 p-3 shadow-lg backdrop-blur">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="text-sm font-semibold text-foreground">
              {changedCount > 0 ? labels.unsavedChanges.replace("{count}", String(changedCount)) : labels.noUnsavedChanges}
            </div>
            <div className="mt-1 text-xs text-muted-foreground">{labels.settingsOverviewDescription}</div>
          </div>
          <button
            type="submit"
            disabled={saving || changedCount === 0}
            className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-md bg-primary px-4 text-sm font-medium text-white transition-colors hover:bg-primary/90 disabled:opacity-50 sm:h-10 sm:min-h-0 sm:w-auto"
          >
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            {labels.save}
          </button>
        </div>
      </div>
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
  return (
    <div className="rounded-md border border-border bg-background p-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <History className="h-4 w-4 text-primary" />
            <h3 className="text-sm font-semibold text-foreground">{labels.ldapSyncHistoryTitle}</h3>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">{labels.ldapSyncHistoryDescription}</p>
        </div>
        <Link
          href={buildSystemLogFilterHref(locale, "ldap_sync")}
          className="inline-flex min-h-10 w-full items-center justify-center gap-2 rounded-md border border-border px-3 text-sm font-medium text-foreground transition-colors hover:bg-accent sm:w-auto"
        >
          <ExternalLink className="h-4 w-4" />
          {labels.ldapSyncHistoryViewAll}
        </Link>
      </div>

      {history.length === 0 ? (
        <p className="mt-4 rounded-md border border-dashed border-border bg-muted/20 px-3 py-4 text-sm text-muted-foreground">
          {labels.ldapSyncHistoryEmpty}
        </p>
      ) : (
        <div className="mt-4 divide-y divide-border">
          {history.map((item) => (
            <article key={item.id} className="py-3 first:pt-0 last:pb-0">
              <div className="flex flex-col gap-2 lg:flex-row lg:items-start lg:justify-between">
                <div className="min-w-0">
                  <div className="text-sm font-semibold text-foreground">
                    {labels.ldapSyncHistoryStartedAt}: {formatHistoryDateTime(item.createdAt, locale)}
                  </div>
                  <div className="mt-1 text-xs text-muted-foreground">
                    {labels.ldapSyncHistoryRunBy}: {item.actorLabel}
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-5 lg:w-[34rem]">
                  <MiniMetric label={labels.ldapSyncTotal} value={item.total} locale={locale} />
                  <MiniMetric label={labels.ldapSyncAppliedCreated} value={item.created} locale={locale} />
                  <MiniMetric label={labels.ldapSyncAppliedUpdated} value={item.updated} locale={locale} />
                  <MiniMetric label={labels.ldapSyncAppliedDeactivated} value={item.deactivated} locale={locale} />
                  <MiniMetric label={labels.ldapSyncAppliedUsersDeactivated} value={item.deactivatedUsers} locale={locale} />
                </div>
              </div>
              {item.blockerCount > 0 ? (
                <div className="mt-2 text-xs font-medium text-warning">
                  {labels.ldapSyncHistoryBlockers}: {formatHistoryNumber(item.blockerCount, locale)}
                </div>
              ) : null}
            </article>
          ))}
        </div>
      )}
    </div>
  )
}

function MiniMetric({ label, value, locale }: { label: string; value: number; locale: string }) {
  return (
    <div className="rounded-md border border-border px-2 py-2">
      <div className="truncate text-[11px] text-muted-foreground">{label}</div>
      <div className="mt-1 text-base font-semibold text-foreground">{formatHistoryNumber(value, locale)}</div>
    </div>
  )
}

function formatHistoryDateTime(value: string, locale = "th") {
  return new Intl.DateTimeFormat(getIntlLocale(locale), {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value))
}

function formatHistoryNumber(value: number, locale: string) {
  return value.toLocaleString(getIntlLocale(locale))
}

function getIntlLocale(locale: string) {
  return locale === "en" ? "en-US" : "th-TH"
}

function isValidCategoryPrefix(prefix: string) {
  return /^[A-Z0-9]{2,10}$/.test(normalizeCategoryPrefix(prefix))
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
        <span className="rounded-full bg-muted px-2 py-1 text-xs font-medium text-muted-foreground">{count}</span>
      </div>
      <div className="border-b border-border p-3">
        <div className="flex h-10 items-center gap-2 rounded-md border border-border bg-surface px-3">
          <Search className="h-4 w-4 shrink-0 text-muted-foreground" />
          <input
            value={searchValue}
            onChange={(event) => onSearchChange(event.target.value)}
            placeholder={searchPlaceholder}
            className="h-full min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
          />
        </div>
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
        className="h-4 w-4 rounded border-border text-primary focus:ring-primary"
      />
      <span className="min-w-0 flex-1">
        <span className="block truncate font-medium text-foreground">{category.name}</span>
        <span className="block truncate text-xs text-muted-foreground">{category.code}</span>
      </span>
      {badge ? (
        <span className="shrink-0 rounded-full border border-warning/30 bg-warning/10 px-2 py-1 text-xs font-medium text-warning">
          {badge}
        </span>
      ) : null}
    </label>
  )
}

function EmptyTransferState({ label }: { label: string }) {
  return <div className="flex min-h-64 items-center justify-center px-4 text-center text-sm text-muted-foreground">{label}</div>
}

function Field({ label, htmlFor, children }: { label: string; htmlFor: string; children: React.ReactNode }) {
  return (
    <div className="space-y-2">
      <label className="block text-sm font-medium text-foreground" htmlFor={htmlFor}>
        {label}
      </label>
      {children}
    </div>
  )
}

function ValidationMessage({ message }: { message: string }) {
  return (
    <p className="my-2 rounded-md border border-danger/30 bg-danger/10 px-3 py-2 text-sm font-medium text-danger">
      {message}
    </p>
  )
}

function WizardStep({ number, title, children }: { number: number; title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-md border border-border bg-muted/20 p-4">
      <div className="mb-4 flex items-center gap-3">
        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary text-sm font-semibold text-white">
          {number}
        </span>
        <h3 className="text-sm font-semibold text-foreground">{title}</h3>
      </div>
      {children}
    </div>
  )
}

function ToggleField({
  label,
  description,
  checked,
  onChange,
}: {
  label: string
  description?: string
  checked: boolean
  onChange: (checked: boolean) => void
}) {
  return (
    <label className="flex min-h-10 items-center justify-between gap-3 rounded-md border border-border bg-background px-3 py-2 text-sm font-medium text-foreground">
      <span className="min-w-0">
        <span className="block">{label}</span>
        {description ? <span className="mt-1 block text-xs font-normal leading-5 text-muted-foreground">{description}</span> : null}
      </span>
      <input
        type="checkbox"
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
        className="h-4 w-4 rounded border-border text-primary focus:ring-primary"
      />
    </label>
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
    return <p className="text-sm text-muted-foreground">{labels.ldapSyncNoPreview}</p>
  }
  const deactivationImpacts = (preview.deactivationImpacts ?? []).filter(
    (impact) => impact.activeAssetCount > 0 || impact.activeUserCount > 0
  )

  return (
    <div className="rounded-md border border-border bg-background p-4">
      <h3 className="text-sm font-semibold text-foreground">{labels.ldapSyncPreviewTitle}</h3>
      <div className="mt-3 grid gap-3 md:grid-cols-4">
        <Metric label={labels.ldapSyncTotal} value={preview.total} />
        <Metric label={labels.ldapSyncCreates} value={preview.creates.length} />
        <Metric label={labels.ldapSyncUpdates} value={preview.updates.length} />
        <Metric label={labels.ldapSyncDeactivates} value={preview.deactivates.length} />
      </div>
      {preview.applied ? (
        <div className="mt-3 rounded-md border border-primary/30 bg-primary/5 px-3 py-3">
          <div className="text-sm font-medium text-foreground">{labels.ldapSyncAppliedTitle}</div>
          <div className="mt-2 grid gap-2 md:grid-cols-4">
          <Metric label={labels.ldapSyncAppliedCreated} value={preview.applied.created} />
          <Metric label={labels.ldapSyncAppliedUpdated} value={preview.applied.updated} />
          <Metric label={labels.ldapSyncAppliedDeactivated} value={preview.applied.deactivated} />
          <Metric label={labels.ldapSyncAppliedUsersDeactivated} value={preview.applied.deactivatedUsers ?? 0} />
        </div>
      </div>
      ) : null}
      {preview.blockers.length > 0 ? (
        <div className="mt-3 rounded-md border border-warning/30 bg-warning/10 px-3 py-2 text-sm text-warning">
          <div className="font-medium">{labels.ldapSyncBlockers}</div>
          <ul className="mt-1 list-disc space-y-1 pl-5">
            {preview.blockers.map((blocker) => (
              <li key={blocker}>{blocker}</li>
            ))}
          </ul>
        </div>
      ) : null}
      {preview.deactivates.length > 0 ? (
        <div className="mt-3 rounded-md border border-amber-200 bg-amber-50 px-3 py-3">
          <div className="text-sm font-semibold text-amber-950">{labels.ldapSyncDeactivateImpactTitle}</div>
          <p className="mt-1 text-sm text-amber-900">{labels.ldapSyncDeactivateImpactDescription}</p>
          {deactivationImpacts.length > 0 ? (
            <div className="mt-3 grid gap-3">
              {deactivationImpacts.map((impact) => (
                <div key={impact.employeeId} className="rounded-md border border-amber-200 bg-white px-3 py-3">
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                      <div className="text-sm font-semibold text-foreground">
                        {impact.code} - {impact.name}
                      </div>
                      <div className="mt-1 text-xs text-muted-foreground">{impact.email ?? "-"}</div>
                    </div>
                    <a
                      href={`/${locale}/assets?custodianId=${encodeURIComponent(impact.employeeId)}&page=1`}
                      className="inline-flex h-9 items-center justify-center rounded-md border border-border px-3 text-xs font-medium text-foreground transition-colors hover:bg-accent"
                    >
                      {labels.ldapSyncOpenAssets}
                    </a>
                  </div>
                  <div className="mt-3 grid gap-2 sm:grid-cols-2">
                    <Metric label={labels.ldapSyncDeactivateImpactAssets} value={impact.activeAssetCount} />
                    <Metric label={labels.ldapSyncDeactivateImpactUsers} value={impact.activeUserCount} />
                  </div>
                  {impact.assets.length > 0 ? (
                    <div className="mt-3 flex flex-wrap gap-2">
                      {impact.assets.slice(0, 5).map((asset) => (
                        <span key={asset.id} className="rounded-md border border-border bg-muted/40 px-2 py-1 text-xs text-foreground">
                          {asset.assetTag} - {asset.name}
                        </span>
                      ))}
                      {impact.assets.length > 5 ? (
                        <span className="rounded-md border border-border bg-muted/40 px-2 py-1 text-xs text-muted-foreground">
                          +{impact.assets.length - 5}
                        </span>
                      ) : null}
                    </div>
                  ) : null}
                </div>
              ))}
            </div>
          ) : (
            <p className="mt-3 text-sm text-amber-900">{labels.ldapSyncNoDeactivateImpact}</p>
          )}
        </div>
      ) : null}
    </div>
  )
}

function StatusCard({
  label,
  value,
  tone,
}: {
  label: string
  value: string
  tone: "blue" | "green" | "amber" | "slate" | "rose"
}) {
  const toneClass = {
    blue: "border-blue-200 bg-blue-50 text-blue-950",
    green: "border-emerald-200 bg-emerald-50 text-emerald-950",
    amber: "border-amber-200 bg-amber-50 text-amber-950",
    slate: "border-slate-200 bg-slate-50 text-slate-950",
    rose: "border-rose-200 bg-rose-50 text-rose-950",
  }[tone]

  return (
    <div className={`min-h-24 rounded-md border px-3 py-3 ${toneClass}`}>
      <div className="text-xs font-medium opacity-80">{label}</div>
      <div className="mt-2 break-words text-sm font-semibold leading-6">{value}</div>
    </div>
  )
}

function Metric({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-md border border-border px-3 py-2">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="mt-1 text-xl font-semibold text-foreground">{value}</div>
    </div>
  )
}

function LabelAssetNameModeField({
  label,
  description,
  compactLabel,
  fullLabel,
  compactEnabled,
  onChange,
}: {
  label: string
  description: string
  compactLabel: string
  fullLabel: string
  compactEnabled: boolean
  onChange: (compactEnabled: boolean) => void
}) {
  const options = [
    { value: true, label: compactLabel },
    { value: false, label: fullLabel },
  ]

  return (
    <div className="space-y-2">
      <div className="text-sm font-medium text-foreground">{label}</div>
      <div className="inline-flex rounded-md border border-border bg-muted/20 p-1" role="group" aria-label={label}>
        {options.map((option) => {
          const isActive = compactEnabled === option.value
          return (
            <button
              key={String(option.value)}
              type="button"
              aria-pressed={isActive}
              onClick={() => onChange(option.value)}
              className={`inline-flex h-8 items-center justify-center gap-1.5 rounded px-3 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 ${
                isActive
                  ? "bg-primary text-white shadow-sm"
                  : "text-muted-foreground hover:bg-background hover:text-foreground"
              }`}
            >
              {isActive ? <Check className="h-3.5 w-3.5" aria-hidden="true" /> : null}
              {option.label}
            </button>
          )
        })}
      </div>
      <p className="text-xs leading-5 text-muted-foreground">{description}</p>
    </div>
  )
}

function LabelTemplatePanel({
  tapeSize,
  title,
  labels,
  getValue,
  setValue,
}: {
  tapeSize: AssetLabelTapeSize
  title: string
  labels: SystemSettingsFormProps["labels"]
  getValue: (key: string) => string
  setValue: (key: string, value: string) => void
}) {
  const prefix = `asset_label_${tapeSize}`
  const preset = assetLabelPresets[tapeSize]

  return (
    <div className="rounded-md border border-border bg-muted/20 p-3">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <h3 className="text-sm font-semibold text-foreground">{title}</h3>
        <button
          type="button"
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
          className="inline-flex min-h-11 items-center justify-center rounded-md border border-border px-2 text-xs font-medium text-foreground transition-colors hover:bg-accent sm:h-8 sm:min-h-0"
        >
          {labels.labelPreset}
        </button>
      </div>
      <div className="mt-3 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        <Field label={labels.labelWidthMm} htmlFor={`${prefix}-width-mm`}>
          <input
            id={`${prefix}-width-mm`}
            type="number"
            min={30}
            max={120}
            value={getValue(`${prefix}_width_mm`)}
            onChange={(event) => setValue(`${prefix}_width_mm`, event.target.value)}
            className="h-10 w-full rounded-md border border-border bg-background px-3 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary"
          />
        </Field>
        <Field label={labels.labelHeightMm} htmlFor={`${prefix}-height-mm`}>
          <input
            id={`${prefix}-height-mm`}
            type="number"
            min={10}
            max={100}
            value={getValue(`${prefix}_height_mm`)}
            onChange={(event) => setValue(`${prefix}_height_mm`, event.target.value)}
            className="h-10 w-full rounded-md border border-border bg-background px-3 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary"
          />
        </Field>
        <Field label={labels.labelQrSize} htmlFor={`${prefix}-qr-size`}>
          <input
            id={`${prefix}-qr-size`}
            type="number"
            min={20}
            max={90}
            value={getValue(`${prefix}_qr_size`)}
            onChange={(event) => setValue(`${prefix}_qr_size`, event.target.value)}
            className="h-10 w-full rounded-md border border-border bg-background px-3 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary"
          />
        </Field>
        <Field label={labels.labelMarginMm} htmlFor={`${prefix}-margin-mm`}>
          <input
            id={`${prefix}-margin-mm`}
            type="number"
            min={0}
            max={10}
            step="0.5"
            value={getValue(`${prefix}_margin_mm`)}
            onChange={(event) => setValue(`${prefix}_margin_mm`, event.target.value)}
            className="h-10 w-full rounded-md border border-border bg-background px-3 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary"
          />
        </Field>
        <Field label={labels.labelGapMm} htmlFor={`${prefix}-gap-mm`}>
          <input
            id={`${prefix}-gap-mm`}
            type="number"
            min={0}
            max={10}
            step="0.5"
            value={getValue(`${prefix}_gap_mm`)}
            onChange={(event) => setValue(`${prefix}_gap_mm`, event.target.value)}
            className="h-10 w-full rounded-md border border-border bg-background px-3 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary"
          />
        </Field>
        <Field label={labels.labelLayout} htmlFor={`${prefix}-layout`}>
          <select
            id={`${prefix}-layout`}
            value={getValue(`${prefix}_layout`)}
            onChange={(event) => setValue(`${prefix}_layout`, event.target.value)}
            className="h-10 w-full rounded-md border border-border bg-background px-3 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary"
          >
            <option value="qr-left">{labels.labelLayoutQrLeft}</option>
            <option value="qr-top">{labels.labelLayoutQrTop}</option>
            <option value="text-only">{labels.labelLayoutTextOnly}</option>
            <option value="qr-only">{labels.labelLayoutQrOnly}</option>
          </select>
        </Field>
      </div>
      <div className="mt-3 grid gap-3">
        <Field label={labels.labelPrimaryLine} htmlFor={`${prefix}-primary-template`}>
          <input
            id={`${prefix}-primary-template`}
            value={getValue(`${prefix}_primary_template`)}
            onChange={(event) => setValue(`${prefix}_primary_template`, event.target.value)}
            className="h-10 w-full rounded-md border border-border bg-background px-3 font-mono text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary"
          />
        </Field>
        <Field label={labels.labelSecondaryLine} htmlFor={`${prefix}-secondary-template`}>
          <input
            id={`${prefix}-secondary-template`}
            value={getValue(`${prefix}_secondary_template`)}
            onChange={(event) => setValue(`${prefix}_secondary_template`, event.target.value)}
            className="h-10 w-full rounded-md border border-border bg-background px-3 font-mono text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary"
          />
        </Field>
        <Field label={labels.labelTertiaryLine} htmlFor={`${prefix}-tertiary-template`}>
          <input
            id={`${prefix}-tertiary-template`}
            value={getValue(`${prefix}_tertiary_template`)}
            onChange={(event) => setValue(`${prefix}_tertiary_template`, event.target.value)}
            className="h-10 w-full rounded-md border border-border bg-background px-3 font-mono text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary"
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
    <div className="shrink-0 rounded-sm border border-slate-300 bg-white p-1">
      <QRCodeSVG value={qrValue} size={Math.min(config.qrSize, Math.max(28, heightPx - marginPx * 2 - 6))} level="M" includeMargin={false} />
    </div>
  )
  const text = (
    <div className="min-w-0">
      <div className="truncate text-sm font-bold leading-tight">{lines[0] || values.assetTag}</div>
      {lines.slice(1).map((line) => (
        <div key={line} className="mt-1 truncate text-xs leading-tight text-slate-700">
          {line}
        </div>
      ))}
    </div>
  )

  return (
    <div className="rounded-md border border-border bg-muted/20 p-3">
      <div className="text-sm font-semibold text-foreground">{labels.labelPreview}</div>
      <div className="mt-3 w-full max-w-full overflow-x-auto overscroll-x-contain">
        <div
          className="overflow-hidden rounded border border-slate-300 bg-white text-slate-950 shadow-sm"
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

function SectionHeader({ title, description }: { title: string; description?: string }) {
  return (
    <div className="border-b border-border px-4 py-4">
      <h2 className="text-base font-semibold text-foreground">{title}</h2>
      {description ? <p className="mt-1 text-sm text-muted-foreground">{description}</p> : null}
    </div>
  )
}

function Head({ children }: { children: React.ReactNode }) {
  return <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-normal text-muted-foreground">{children}</th>
}
