import { getTranslations } from "next-intl/server"
import { prisma } from "@/lib/db"
import { requirePagePermission } from "@/lib/page-auth"
import { SystemSettingsForm } from "@/components/admin/system-settings-form"
import { systemSettingDefaults } from "@/lib/system-setting-defaults"

type SettingsPageProps = {
  params: Promise<{ locale: string }>
}

export default async function SettingsPage({ params }: SettingsPageProps) {
  const { locale } = await params
  await requirePagePermission(locale, "setting", "view")
  const t = await getTranslations("systemSettingsPage")
  const tCommon = await getTranslations("common")

  const [savedSettings, categories] = await Promise.all([
    prisma.systemSetting.findMany({
      orderBy: { key: "asc" },
    }),
    prisma.assetCategory.findMany({
      where: { isActive: true },
      select: { id: true, code: true, name: true },
      orderBy: { code: "asc" },
    }),
  ])
  const savedByKey = new Map(savedSettings.map((setting) => [setting.key, setting]))
  const defaultKeys = new Set(systemSettingDefaults.map((setting) => setting.key))
  const settings = [
    ...systemSettingDefaults.map((defaultSetting) => savedByKey.get(defaultSetting.key) ?? defaultSetting),
    ...savedSettings.filter((setting) => !defaultKeys.has(setting.key)),
  ]
    .sort((a, b) => a.key.localeCompare(b.key))

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">{t("title")}</h1>
        <p className="mt-1 text-sm text-muted-foreground">{t("subtitle")}</p>
      </div>

      <SystemSettingsForm
        settings={settings.map((setting) => ({
          key: setting.key,
          value: setting.value,
          description: setting.description,
        }))}
        categories={categories}
        labels={{
          key: t("key"),
          value: t("value"),
          description: t("description"),
          tabAssetNumbering: t("tabAssetNumbering"),
          tabLabelTemplate: t("tabLabelTemplate"),
          tabDocuments: t("tabDocuments"),
          tabOrganization: t("tabOrganization"),
          tabLdapLogin: t("tabLdapLogin"),
          tabLdapSync: t("tabLdapSync"),
          tabAdvanced: t("tabAdvanced"),
          settingsOverview: t("settingsOverview"),
          settingsOverviewDescription: t("settingsOverviewDescription"),
          overviewAssetTag: t("overviewAssetTag"),
          overviewLabel: t("overviewLabel"),
          overviewDocuments: t("overviewDocuments"),
          overviewOrganization: t("overviewOrganization"),
          overviewLdapLogin: t("overviewLdapLogin"),
          overviewLdapSync: t("overviewLdapSync"),
          overviewAdvanced: t("overviewAdvanced"),
          enabled: t("enabled"),
          disabled: t("disabled"),
          advancedSettingCount: t("advancedSettingCount", { count: "{count}" }),
          unsavedChanges: t("unsavedChanges", { count: "{count}" }),
          noUnsavedChanges: t("noUnsavedChanges"),
          changeReview: t("changeReview"),
          changeReviewDescription: t("changeReviewDescription"),
          beforeValue: t("beforeValue"),
          afterValue: t("afterValue"),
          advancedWarningTitle: t("advancedWarningTitle"),
          advancedWarningDescription: t("advancedWarningDescription"),
          showAdvancedSettings: t("showAdvancedSettings"),
          generalSettings: t("generalSettings"),
          assetTagFormat: t("assetTagFormat"),
          assetTagFormatDescription: t("assetTagFormatDescription"),
          assetTagTemplate: t("assetTagTemplate"),
          assetTagTemplateHelp: t("assetTagTemplateHelp"),
          availableTokens: t("availableTokens"),
          exampleFormat: t("exampleFormat"),
          formatPresets: t("formatPresets"),
          presetCompanyPrefixMonthRunning: t("presetCompanyPrefixMonthRunning"),
          presetCompanyBranchPrefixRunning: t("presetCompanyBranchPrefixRunning"),
          presetGlobalPrefixYearRunning: t("presetGlobalPrefixYearRunning"),
          numberingOptions: t("numberingOptions"),
          runningDigits: t("runningDigits"),
          separator: t("separator"),
          globalPrefix: t("globalPrefix"),
          invalidFormatTemplate: t("invalidFormatTemplate"),
          labelPrintTemplate: t("labelPrintTemplate"),
          labelPrintTemplateDescription: t("labelPrintTemplateDescription"),
          defaultTapeSize: t("defaultTapeSize"),
          tape12mmTemplate: t("tape12mmTemplate"),
          tape18mmTemplate: t("tape18mmTemplate"),
          labelWidthMm: t("labelWidthMm"),
          labelQrSize: t("labelQrSize"),
          labelPrimaryLine: t("labelPrimaryLine"),
          labelSecondaryLine: t("labelSecondaryLine"),
          labelTertiaryLine: t("labelTertiaryLine"),
          labelTemplateTokens: t("labelTemplateTokens"),
          invalidLabelTemplate: t("invalidLabelTemplate"),
          invalidLabelSize: t("invalidLabelSize"),
          operationDocumentNumbers: t("operationDocumentNumbers"),
          operationDocumentNumbersDescription: t("operationDocumentNumbersDescription"),
          checkoutDocumentTemplate: t("checkoutDocumentTemplate"),
          checkinDocumentTemplate: t("checkinDocumentTemplate"),
          operationDocumentRunningDigits: t("operationDocumentRunningDigits"),
          operationDocumentTemplateHelp: t("operationDocumentTemplateHelp"),
          operationDocumentTokens: t("operationDocumentTokens"),
          checkoutDocumentExample: t("checkoutDocumentExample"),
          checkinDocumentExample: t("checkinDocumentExample"),
          invalidOperationDocumentTemplate: t("invalidOperationDocumentTemplate"),
          categoryPrefixes: t("categoryPrefixes"),
          categoryPrefixesDescription: t("categoryPrefixesDescription"),
          noCategoryPrefixes: t("noCategoryPrefixes"),
          category: t("category"),
          prefix: t("prefix"),
          addPrefix: t("addPrefix"),
          removePrefix: t("removePrefix"),
          selectCategory: t("selectCategory"),
          duplicateCategory: t("duplicateCategory"),
          invalidPrefix: t("invalidPrefix"),
          organizationDefaults: t("organizationDefaults"),
          organizationDefaultsDescription: t("organizationDefaultsDescription"),
          companyName: t("companyName"),
          defaultCurrency: t("defaultCurrency"),
          advancedSettings: t("advancedSettings"),
          advancedSettingsDescription: t("advancedSettingsDescription"),
          ldapSettings: t("ldapSettings"),
          ldapSettingsDescription: t("ldapSettingsDescription"),
          ldapEnabled: t("ldapEnabled"),
          ldapUrl: t("ldapUrl"),
          ldapBaseDn: t("ldapBaseDn"),
          ldapBindDn: t("ldapBindDn"),
          ldapBindPassword: t("ldapBindPassword"),
          ldapStartTls: t("ldapStartTls"),
          ldapTlsRejectUnauthorized: t("ldapTlsRejectUnauthorized"),
          ldapUserFilter: t("ldapUserFilter"),
          ldapUpnDomain: t("ldapUpnDomain"),
          ldapDomain: t("ldapDomain"),
          ldapUserDnTemplate: t("ldapUserDnTemplate"),
          ldapAutoProvision: t("ldapAutoProvision"),
          ldapDefaultRole: t("ldapDefaultRole"),
          ldapSyncStrategy: t("ldapSyncStrategy"),
          ldapSyncStrategyDescription: t("ldapSyncStrategyDescription"),
          ldapSyncEnabled: t("ldapSyncEnabled"),
          ldapSyncBaseDn: t("ldapSyncBaseDn"),
          ldapSyncFilter: t("ldapSyncFilter"),
          ldapSyncMode: t("ldapSyncMode"),
          ldapSyncSchedule: t("ldapSyncSchedule"),
          ldapSyncSchedulePreset: t("ldapSyncSchedulePreset"),
          ldapSyncCustomSchedule: t("ldapSyncCustomSchedule"),
          ldapSyncDaily2am: t("ldapSyncDaily2am"),
          ldapSyncEvery6Hours: t("ldapSyncEvery6Hours"),
          ldapSyncWeekday2am: t("ldapSyncWeekday2am"),
          ldapSyncMonday2am: t("ldapSyncMonday2am"),
          ldapSyncDefaultMapping: t("ldapSyncDefaultMapping"),
          ldapSyncDefaultMappingDescription: t("ldapSyncDefaultMappingDescription"),
          ldapSyncDefaultCompanyCode: t("ldapSyncDefaultCompanyCode"),
          ldapSyncDefaultBranchCode: t("ldapSyncDefaultBranchCode"),
          ldapSyncDefaultDepartmentCode: t("ldapSyncDefaultDepartmentCode"),
          ldapSyncDeactivateMissing: t("ldapSyncDeactivateMissing"),
          ldapSyncPreview: t("ldapSyncPreview"),
          ldapSyncApply: t("ldapSyncApply"),
          ldapSyncPreviewTitle: t("ldapSyncPreviewTitle"),
          ldapSyncTotal: t("ldapSyncTotal"),
          ldapSyncCreates: t("ldapSyncCreates"),
          ldapSyncUpdates: t("ldapSyncUpdates"),
          ldapSyncDeactivates: t("ldapSyncDeactivates"),
          ldapSyncAppliedTitle: t("ldapSyncAppliedTitle"),
          ldapSyncAppliedCreated: t("ldapSyncAppliedCreated"),
          ldapSyncAppliedUpdated: t("ldapSyncAppliedUpdated"),
          ldapSyncAppliedDeactivated: t("ldapSyncAppliedDeactivated"),
          ldapSyncBlockers: t("ldapSyncBlockers"),
          ldapSyncNoPreview: t("ldapSyncNoPreview"),
          ldapSyncPreviewSuccess: t("ldapSyncPreviewSuccess"),
          ldapSyncApplySuccess: t("ldapSyncApplySuccess"),
          ldapSyncFailed: t("ldapSyncFailed"),
          ldapSyncRecommendation: t("ldapSyncRecommendation"),
          ldapStepConnection: t("ldapStepConnection"),
          ldapStepLoginMapping: t("ldapStepLoginMapping"),
          ldapStepProvisioning: t("ldapStepProvisioning"),
          ldapStepSyncStrategy: t("ldapStepSyncStrategy"),
          ldapStepOrgMapping: t("ldapStepOrgMapping"),
          ldapStepSchedule: t("ldapStepSchedule"),
          ldapStepPreviewApply: t("ldapStepPreviewApply"),
          testLdapConnection: t("testLdapConnection"),
          ldapTestSuccess: t("ldapTestSuccess"),
          ldapTestFailed: t("ldapTestFailed"),
          save: tCommon("save"),
          success: t("savedSuccess"),
          error: tCommon("error"),
        }}
      />
    </div>
  )
}
