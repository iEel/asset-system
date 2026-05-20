import type { AssetDataQualityFilter } from "./asset-data-quality-filter"
import type { AssetDataQualityRuleKey } from "./data-quality-rules"

const ruleFilterMap: Record<AssetDataQualityRuleKey, AssetDataQualityFilter> = {
  missingCustodian: "responsibility",
  missingSerial: "serial",
  missingPhoto: "photo",
  missingDepartment: "department",
  missingPurchaseInfo: "purchase",
  warrantyExpiring: "warranty",
}

export function getAssetDataQualityFilterForRule(ruleKey: AssetDataQualityRuleKey) {
  return ruleFilterMap[ruleKey]
}

export function buildDataQualityRuleHref(locale: string, ruleKey: AssetDataQualityRuleKey) {
  const params = new URLSearchParams({
    dataQuality: getAssetDataQualityFilterForRule(ruleKey),
    page: "1",
  })
  return `/${locale}/assets?${params.toString()}`
}
