import { getTranslations } from "next-intl/server"
import { IntegrationClientManager } from "@/components/admin/IntegrationClientManager"
import { requirePagePermission } from "@/lib/page-auth"

type IntegrationApiPageProps = {
  params: Promise<{ locale: string }>
}

export default async function IntegrationApiPage({ params }: IntegrationApiPageProps) {
  const { locale } = await params
  await requirePagePermission(locale, "setting", "view")
  const t = await getTranslations("integrationApiPage")

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">{t("title")}</h1>
        <p className="mt-1 max-w-3xl text-sm text-muted-foreground">{t("subtitle")}</p>
      </div>

      <IntegrationClientManager
        labels={{
          summaryActive: t("summaryActive"),
          summaryDisabled: t("summaryDisabled"),
          summaryLastUsed: t("summaryLastUsed"),
          createTitle: t("createTitle"),
          clientId: t("clientId"),
          clientIdPlaceholder: t("clientIdPlaceholder"),
          displayName: t("displayName"),
          displayNamePlaceholder: t("displayNamePlaceholder"),
          scopes: t("scopes"),
          scopeAssetRead: t("scopeAssetRead"),
          scopeReferenceRead: t("scopeReferenceRead"),
          scopeIntegrationRead: t("scopeIntegrationRead"),
          createClient: t("createClient"),
          clientsTitle: t("clientsTitle"),
          emptyTitle: t("emptyTitle"),
          emptyDescription: t("emptyDescription"),
          tokenPanelTitle: t("tokenPanelTitle"),
          tokenPanelWarning: t("tokenPanelWarning"),
          copyToken: t("copyToken"),
          copied: t("copied"),
          tokenAcknowledgement: t("tokenAcknowledgement"),
          dismissToken: t("dismissToken"),
          rotate: t("rotate"),
          editScopes: t("editScopes"),
          saveScopes: t("saveScopes"),
          cancel: t("cancel"),
          enable: t("enable"),
          disable: t("disable"),
          confirmRotate: t("confirmRotate"),
          confirmScopeExpansion: t("confirmScopeExpansion"),
          confirmEnable: t("confirmEnable"),
          confirmDisable: t("confirmDisable"),
          loading: t("loading"),
          error: t("error"),
          loadFailed: t("loadFailed"),
          createFailed: t("createFailed"),
          actionFailed: t("actionFailed"),
          active: t("active"),
          disabled: t("disabled"),
          noLastUsed: t("noLastUsed"),
          lastUsed: t("lastUsed"),
          tokenPreview: t("tokenPreview"),
          operations: t("operations"),
          requests24h: t("requests24h"),
          requests7d: t("requests7d"),
          errors7d: t("errors7d"),
          topEndpoint: t("topEndpoint"),
          latestError: t("latestError"),
          noOperationalData: t("noOperationalData"),
          copyPowerShell: t("copyPowerShell"),
          powerShellCopied: t("powerShellCopied"),
          status: t("status"),
          actions: t("actions"),
        }}
      />
    </div>
  )
}
