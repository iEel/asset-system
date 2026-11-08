import { getTranslations } from "next-intl/server"
import { IntegrationClientManager } from "@/components/admin/IntegrationClientManager"
import { hasPermission } from "@/lib/auth-utils"
import { requirePagePermission } from "@/lib/page-auth"

type IntegrationApiPageProps = {
  params: Promise<{ locale: string }>
}

// Board AD-Integrations (page group 12 plan 4, spec §10). The page needs setting:view; the client manager draws the
// header (its สร้าง client button opens the side panel it holds) and hides every write without setting:edit. The history
// links open /admin/logs, which needs system:view.
export default async function IntegrationApiPage({ params }: IntegrationApiPageProps) {
  const { locale } = await params
  const user = await requirePagePermission(locale, "setting", "view")
  const t = await getTranslations("integrationApiPage")

  return (
    <IntegrationClientManager
      locale={locale}
      canEdit={hasPermission(user, "setting", "edit")}
      canViewLogs={hasPermission(user, "system", "view")}
      viewerName={user.name || null}
      labels={{
        title: t("title"),
        subtitle: t("subtitle"),
        historyLink: t("historyLink"),
        summaryActive: t("summaryActive"),
        summaryDisabled: t("summaryDisabled"),
        summaryLastUsed: t("summaryLastUsed"),
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
        stepDetails: t("stepDetails"),
        tokenFor: t("tokenFor"),
        dismissHint: t("dismissHint"),
        rotatedTitle: t("rotatedTitle"),
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
        confirmScopeExpansionAction: t("confirmScopeExpansionAction"),
        confirmEnable: t("confirmEnable"),
        confirmDisable: t("confirmDisable"),
        loading: t("loading"),
        error: t("error"),
        loadFailed: t("loadFailed"),
        createFailed: t("createFailed"),
        actionFailed: t("actionFailed"),
        actionBusy: t("actionBusy"),
        active: t("active"),
        disabled: t("disabled"),
        noLastUsed: t("noLastUsed"),
        lastUsed: t("lastUsed"),
        tokenPreview: t("tokenPreview"),
        token: t("token"),
        client: t("client"),
        requests24h: t("requests24h"),
        topEndpoint: t("topEndpoint"),
        latestError: t("latestError"),
        noOperationalData: t("noOperationalData"),
        copyPowerShell: t("copyPowerShell"),
        powerShellCopied: t("powerShellCopied"),
        status: t("status"),
        actions: t("actions"),
        hashNote: t("hashNote"),
        usageDetails: t("usageDetails"),
        filterEmpty: t("filterEmpty"),
      }}
    />
  )
}
