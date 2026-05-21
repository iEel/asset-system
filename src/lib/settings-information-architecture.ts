import { retentionPolicySettingKeys } from "./retention-policy.ts"

export const settingsTabIds = [
  "asset-numbering",
  "label-template",
  "documents",
  "organization",
  "notifications",
  "workflow-approval",
  "automation",
  "governance",
  "ldap-login",
  "ldap-sync",
  "advanced",
] as const

export type SettingsTabId = (typeof settingsTabIds)[number]

export const settingsGovernanceSettingKeys = [...retentionPolicySettingKeys]

export function getSettingsTabOrder() {
  return [...settingsTabIds]
}
