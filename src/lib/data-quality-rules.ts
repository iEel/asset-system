export const assetDataQualityRulesKey = "asset_data_quality_rules"

export type AssetDataQualityRuleKey =
  | "missingCustodian"
  | "missingSerial"
  | "missingPhoto"
  | "missingDepartment"
  | "missingPurchaseInfo"
  | "warrantyExpiring"

export type AssetDataQualityRule = {
  key: AssetDataQualityRuleKey
  enabled: boolean
  severity: "warning" | "danger"
}

export const defaultAssetDataQualityRules: AssetDataQualityRule[] = [
  { key: "missingCustodian", enabled: true, severity: "warning" },
  { key: "missingSerial", enabled: true, severity: "warning" },
  { key: "missingPhoto", enabled: true, severity: "warning" },
  { key: "missingDepartment", enabled: false, severity: "warning" },
  { key: "missingPurchaseInfo", enabled: false, severity: "warning" },
  { key: "warrantyExpiring", enabled: true, severity: "danger" },
]

export function parseAssetDataQualityRules(value?: string | null) {
  if (!value) return defaultAssetDataQualityRules
  try {
    const parsed = JSON.parse(value) as Partial<AssetDataQualityRule>[]
    const byKey = new Map(parsed.map((rule) => [rule.key, rule]))
    return defaultAssetDataQualityRules.map((defaultRule) => {
      const saved = byKey.get(defaultRule.key)
      return {
        ...defaultRule,
        enabled: typeof saved?.enabled === "boolean" ? saved.enabled : defaultRule.enabled,
        severity: saved?.severity === "danger" || saved?.severity === "warning" ? saved.severity : defaultRule.severity,
      }
    })
  } catch {
    return defaultAssetDataQualityRules
  }
}
