import { settingsTabIds, type SettingsTabId } from "./settings-information-architecture.ts"

export const systemSettingsTabQueryKey = "tab"

export function parseSystemSettingsTab(value: string | null | undefined): SettingsTabId {
  return settingsTabIds.includes(value as SettingsTabId) ? (value as SettingsTabId) : "asset-numbering"
}

export function buildSystemSettingsTabHref(pathname: string, search: string, tab: SettingsTabId) {
  const params = new URLSearchParams(search)
  params.set(systemSettingsTabQueryKey, tab)
  return `${pathname}?${params.toString()}`
}
