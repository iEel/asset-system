import type { SettingsTabId } from "./settings-information-architecture.ts"

export type SystemSettingsSearchItem = {
  key: string
  description?: string | null
}

export type SystemSettingsSearchResult = {
  key: string
  description: string
  tab: SettingsTabId
  tabLabel: string
}

export function getSystemSettingsTabForKey(key: string): SettingsTabId {
  if (key.startsWith("asset_tag_")) return "asset-numbering"
  if (key.startsWith("asset_label_") || key === "asset_qr_public_base_url") return "label-template"
  if (key.startsWith("checkout_") || key.startsWith("checkin_") || key.startsWith("operation_document_")) return "documents"
  if (key === "company_name" || key === "default_currency" || key.startsWith("depreciation_")) return "organization"
  if (key.startsWith("notification_") && !key.startsWith("notification_digest_")) return "notifications"
  if (key.startsWith("workflow_approval_")) return "workflow-approval"
  if (key.startsWith("pm_") || key.startsWith("notification_digest_")) return "automation"
  if (key.startsWith("retention_")) return "governance"
  if (key.startsWith("ldap_sync_")) return "ldap-sync"
  if (key.startsWith("ldap_")) return "ldap-login"
  return "advanced"
}

export function findSystemSettingsSearchResults(
  settings: SystemSettingsSearchItem[],
  query: string,
  tabLabels: Partial<Record<SettingsTabId, string>>,
): SystemSettingsSearchResult[] {
  const normalizedQuery = query.trim().toLocaleLowerCase()
  if (!normalizedQuery) return []

  return settings.flatMap((setting) => {
    const tab = getSystemSettingsTabForKey(setting.key)
    const tabLabel = tabLabels[tab] ?? tab
    const description = setting.description ?? ""
    const haystack = `${setting.key} ${description} ${tabLabel}`.toLocaleLowerCase()

    return haystack.includes(normalizedQuery) ? [{ key: setting.key, description, tab, tabLabel }] : []
  })
}
