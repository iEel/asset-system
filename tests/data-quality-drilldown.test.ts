import assert from "node:assert/strict"
import test from "node:test"

import {
  buildDataQualityRuleHref,
  getAssetDataQualityFilterForRule,
} from "../src/lib/data-quality-drilldown.ts"

test("maps every data quality rule to a focused asset list drilldown", () => {
  assert.equal(getAssetDataQualityFilterForRule("missingCustodian"), "responsibility")
  assert.equal(getAssetDataQualityFilterForRule("missingSerial"), "serial")
  assert.equal(getAssetDataQualityFilterForRule("missingPhoto"), "photo")
  assert.equal(getAssetDataQualityFilterForRule("missingDepartment"), "department")
  assert.equal(getAssetDataQualityFilterForRule("missingPurchaseInfo"), "purchase")
  assert.equal(getAssetDataQualityFilterForRule("warrantyExpiring"), "warranty")
})

test("builds locale-aware data quality rule hrefs", () => {
  assert.equal(buildDataQualityRuleHref("th", "missingCustodian"), "/th/assets?dataQuality=responsibility&page=1")
  assert.equal(buildDataQualityRuleHref("en", "missingPurchaseInfo"), "/en/assets?dataQuality=purchase&page=1")
  assert.equal(buildDataQualityRuleHref("th", "warrantyExpiring"), "/th/assets?dataQuality=warranty&page=1")
})
