"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Loader2, PlugZap, Plus, Save, Trash2 } from "lucide-react"
import { QRCodeSVG } from "qrcode.react"
import { toast } from "sonner"
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
  notificationAuditActionDueSoonDaysKey,
  notificationLicenseExpiryDaysKey,
  notificationReturnDueSoonDaysKey,
  notificationRuleSettingKeys,
  notificationWarrantyExpiryDaysKey,
  operationDocumentRunningDigitsKey,
  operationDocumentSettingKeys,
} from "@/lib/system-setting-defaults"
import { operationDocumentTemplateTokens, renderOperationDocumentTemplate, validateOperationDocumentTemplate } from "@/lib/operation-document-number"
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

type SystemSettingsFormProps = {
  settings: SystemSettingItem[]
  categories: Array<{
    id: string
    code: string
    name: string
  }>
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
    removePrefix: string
    selectCategory: string
    duplicateCategory: string
    invalidPrefix: string
    organizationDefaults: string
    organizationDefaultsDescription: string
    companyName: string
    defaultCurrency: string
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
    ldapSyncBlockers: string
    ldapSyncNoPreview: string
    ldapSyncPreviewSuccess: string
    ldapSyncApplySuccess: string
    ldapSyncFailed: string
    ldapSyncRecommendation: string
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

type PrefixRow = {
  categoryId: string
  prefix: string
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
  blockers: string[]
  applied?: {
    created: number
    updated: number
    deactivated: number
  }
}

type SettingsTabId =
  | "asset-numbering"
  | "label-template"
  | "documents"
  | "organization"
  | "notifications"
  | "workflow-approval"
  | "ldap-login"
  | "ldap-sync"
  | "advanced"

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
  assetTagCategoryPrefixesKey,
  assetTagFormatTemplateKey,
  assetQrPublicBaseUrlKey,
  ...assetLabelSettingKeys,
  ...operationDocumentSettingKeys,
  ...notificationRuleSettingKeys,
  ...workflowApprovalSettingKeys,
  ...ldapSettingKeys,
])

const ldapSchedulePresets = [
  { value: "0 2 * * *", labelKey: "ldapSyncDaily2am" },
  { value: "0 */6 * * *", labelKey: "ldapSyncEvery6Hours" },
  { value: "0 2 * * 1-5", labelKey: "ldapSyncWeekday2am" },
  { value: "0 2 * * 1", labelKey: "ldapSyncMonday2am" },
  { value: "custom", labelKey: "ldapSyncCustomSchedule" },
] as const

function parsePrefixRows(value?: string) {
  try {
    const parsed = JSON.parse(value || "{}") as unknown
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return []
    return Object.entries(parsed)
      .map(([categoryId, prefix]) => ({
        categoryId,
        prefix: typeof prefix === "string" ? prefix.trim().toUpperCase() : "",
      }))
      .filter((row) => row.categoryId && row.prefix)
  } catch {
    return []
  }
}

function serializePrefixRows(rows: PrefixRow[]) {
  return JSON.stringify(
    Object.fromEntries(
      rows
        .map((row) => [row.categoryId, row.prefix.trim().toUpperCase()])
        .filter(([categoryId, prefix]) => categoryId && prefix)
    )
  )
}

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

export function SystemSettingsForm({ settings, categories, labels }: SystemSettingsFormProps) {
  const router = useRouter()
  const initialValues = Object.fromEntries(settings.map((setting) => [setting.key, setting.value]))
  const [activeTab, setActiveTab] = useState<SettingsTabId>("asset-numbering")
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
  const [prefixRows, setPrefixRows] = useState<PrefixRow[]>(() =>
    parsePrefixRows(settings.find((setting) => setting.key === assetTagCategoryPrefixesKey)?.value)
  )
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
  const effectiveValues: Record<string, string> = {
    ...values,
    [assetTagCategoryPrefixesKey]: serializePrefixRows(prefixRows),
  }
  const workflowApprovalPolicy = parseWorkflowApprovalPolicy(Object.entries(effectiveValues))
  const changedSettings = settings.filter(
    (setting) => normalizeSettingValue(setting.key, effectiveValues[setting.key]) !== normalizeSettingValue(setting.key, initialValues[setting.key])
  )
  const changedCount = changedSettings.length
  const selectedCategories = prefixRows.map((row) => row.categoryId).filter(Boolean)
  const hasDuplicateCategory = new Set(selectedCategories).size !== selectedCategories.length
  const hasInvalidPrefix = prefixRows.some((row) => row.categoryId && !/^[A-Z0-9]{2,10}$/.test(row.prefix.trim().toUpperCase()))
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
  const selectedSyncSchedulePreset = !customScheduleSelected && ldapSchedulePresets.some((preset) => preset.value === syncSchedule)
    ? syncSchedule
    : "custom"
  const tabs: Array<{ id: SettingsTabId; label: string }> = [
    { id: "asset-numbering", label: labels.tabAssetNumbering },
    { id: "label-template", label: labels.tabLabelTemplate },
    { id: "documents", label: labels.tabDocuments },
    { id: "organization", label: labels.tabOrganization },
    { id: "notifications", label: labels.tabNotifications },
    { id: "workflow-approval", label: labels.tabWorkflowApproval },
    { id: "ldap-login", label: labels.tabLdapLogin },
    { id: "ldap-sync", label: labels.tabLdapSync },
    { id: "advanced", label: labels.tabAdvanced },
  ]
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
    if (hasInvalidWorkflowApproval) {
      toast.error(labels.invalidWorkflowApproval)
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
      <div className="rounded-lg border border-border bg-surface p-2 shadow-sm">
        <div className="flex gap-2 overflow-x-auto">
          {tabs.map((tab) => {
            const isActive = activeTab === tab.id
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={`h-10 whitespace-nowrap rounded-md px-3 text-sm font-medium transition-colors ${
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
                  className="inline-flex h-8 items-center rounded-md border border-border px-2 font-mono text-xs text-foreground transition-colors hover:bg-accent"
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
          <div className="grid gap-4 md:grid-cols-3">
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
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-border text-sm">
            <thead className="bg-muted/40">
              <tr>
                <Head>{labels.category}</Head>
                <Head>{labels.prefix}</Head>
                <Head>
                  <span className="sr-only">{labels.removePrefix}</span>
                </Head>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {prefixRows.length === 0 ? (
                <tr>
                  <td className="px-4 py-6 text-sm text-muted-foreground" colSpan={3}>
                    {labels.noCategoryPrefixes}
                  </td>
                </tr>
              ) : null}
              {prefixRows.map((row, index) => (
                <tr key={`${row.categoryId}-${index}`} className="hover:bg-accent/50">
                  <td className="min-w-80 px-4 py-3">
                    <select
                      value={row.categoryId}
                      onChange={(event) =>
                        setPrefixRows((current) =>
                          current.map((item, itemIndex) =>
                            itemIndex === index ? { ...item, categoryId: event.target.value } : item
                          )
                        )
                      }
                      className="h-10 w-full rounded-md border border-border bg-background px-3 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary"
                    >
                      <option value="">{labels.selectCategory}</option>
                      {categories.map((category) => (
                        <option key={category.id} value={category.id}>
                          {category.code} - {category.name}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td className="min-w-48 px-4 py-3">
                    <input
                      value={row.prefix}
                      onChange={(event) =>
                        setPrefixRows((current) =>
                          current.map((item, itemIndex) =>
                            itemIndex === index ? { ...item, prefix: event.target.value.toUpperCase() } : item
                          )
                        )
                      }
                      maxLength={10}
                      className="h-10 w-full rounded-md border border-border bg-background px-3 text-sm uppercase outline-none focus:border-primary focus:ring-1 focus:ring-primary"
                    />
                  </td>
                  <td className="w-16 px-4 py-3 text-right">
                    <button
                      type="button"
                      onClick={() => setPrefixRows((current) => current.filter((_, itemIndex) => itemIndex !== index))}
                      className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-border text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
                      title={labels.removePrefix}
                      aria-label={labels.removePrefix}
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="border-t border-border px-4 py-3">
          {hasDuplicateCategory ? <ValidationMessage message={labels.duplicateCategory} /> : null}
          {hasInvalidPrefix ? <ValidationMessage message={labels.invalidPrefix} /> : null}
          <button
            type="button"
            onClick={() => setPrefixRows((current) => [...current, { categoryId: "", prefix: "" }])}
            className="inline-flex h-10 items-center gap-2 rounded-md border border-border px-3 text-sm font-medium text-foreground transition-colors hover:bg-accent"
          >
            <Plus className="h-4 w-4" />
            {labels.addPrefix}
          </button>
        </div>
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

      {activeTab === "ldap-login" ? (
      <div className="overflow-hidden rounded-lg border border-border bg-surface shadow-sm">
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
              className="mt-4 inline-flex h-10 items-center gap-2 rounded-md border border-border px-3 text-sm font-medium text-foreground transition-colors hover:bg-accent disabled:opacity-50"
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
              <ToggleField
                label={labels.ldapAutoProvision}
                checked={getValue("ldap_auto_provision") === "true"}
                onChange={(checked) => setBooleanValue("ldap_auto_provision", checked)}
              />
              <Field label={labels.ldapDefaultRole} htmlFor="ldap-default-role">
                <input
                  id="ldap-default-role"
                  value={getValue("ldap_default_role")}
                  onChange={(event) => setValue("ldap_default_role", event.target.value)}
                  className="h-10 w-full rounded-md border border-border bg-background px-3 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary"
                />
              </Field>
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
              className="inline-flex h-10 items-center justify-center gap-2 rounded-md border border-border px-3 text-sm font-medium text-foreground transition-colors hover:bg-accent disabled:opacity-50"
            >
              {syncingLdap === "preview" ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              {labels.ldapSyncPreview}
            </button>
            <button
              type="button"
              onClick={() => handleLdapSync("apply")}
              disabled={syncingLdap !== null || !syncPreview}
              className="inline-flex h-10 items-center justify-center gap-2 rounded-md bg-primary px-3 text-sm font-medium text-white transition-colors hover:bg-primary/90 disabled:opacity-50"
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
          <SyncPreviewPanel labels={labels} preview={syncPreview} />
          </WizardStep>
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
          <div className="overflow-x-auto">
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
          <div className="overflow-x-auto">
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
            className="inline-flex h-10 items-center justify-center gap-2 rounded-md bg-primary px-4 text-sm font-medium text-white transition-colors hover:bg-primary/90 disabled:opacity-50"
          >
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            {labels.save}
          </button>
        </div>
      </div>
    </form>
  )
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
  checked,
  onChange,
}: {
  label: string
  checked: boolean
  onChange: (checked: boolean) => void
}) {
  return (
    <label className="flex min-h-10 items-center justify-between gap-3 rounded-md border border-border bg-background px-3 py-2 text-sm font-medium text-foreground">
      <span>{label}</span>
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
}: {
  labels: SystemSettingsFormProps["labels"]
  preview: LdapSyncPreview | null
}) {
  if (!preview) {
    return <p className="text-sm text-muted-foreground">{labels.ldapSyncNoPreview}</p>
  }

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
          <div className="mt-2 grid gap-2 md:grid-cols-3">
            <Metric label={labels.ldapSyncAppliedCreated} value={preview.applied.created} />
            <Metric label={labels.ldapSyncAppliedUpdated} value={preview.applied.updated} />
            <Metric label={labels.ldapSyncAppliedDeactivated} value={preview.applied.deactivated} />
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
          className="inline-flex h-8 items-center justify-center rounded-md border border-border px-2 text-xs font-medium text-foreground transition-colors hover:bg-accent"
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
      <div className="mt-3 overflow-x-auto">
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
