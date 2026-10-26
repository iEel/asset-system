import assert from "node:assert/strict"
import test from "node:test"

import { assetDataQualityFilters, normalizeAssetDataQualityFilter } from "../src/lib/asset-data-quality-filter.ts"

test("normalizes asset data quality filter keys", () => {
  assert.equal(normalizeAssetDataQualityFilter("responsibility"), "responsibility")
  assert.equal(normalizeAssetDataQualityFilter("serial"), "serial")
  assert.equal(normalizeAssetDataQualityFilter("photo"), "photo")
  assert.equal(normalizeAssetDataQualityFilter("department"), "department")
  assert.equal(normalizeAssetDataQualityFilter("purchase"), "purchase")
  assert.equal(normalizeAssetDataQualityFilter("warranty"), "warranty")
  assert.equal(normalizeAssetDataQualityFilter("unknown"), "")
  assert.equal(normalizeAssetDataQualityFilter(["warranty", "serial"]), "warranty")
})

test("the bell's licence and return kinds are register filters too (group 1 spec §6.3)", () => {
  assert.equal(normalizeAssetDataQualityFilter("licenseExpiry"), "licenseExpiry")
  assert.equal(normalizeAssetDataQualityFilter("returnDue"), "returnDue")
  assert.deepEqual([...assetDataQualityFilters], ["responsibility", "serial", "photo", "department", "purchase", "warranty", "licenseExpiry", "returnDue"])
})
