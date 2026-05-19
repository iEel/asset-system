import assert from "node:assert/strict"
import test from "node:test"

import { normalizeAssetDataQualityFilter } from "../src/lib/asset-data-quality-filter.ts"

test("normalizes asset data quality filter keys", () => {
  assert.equal(normalizeAssetDataQualityFilter("responsibility"), "responsibility")
  assert.equal(normalizeAssetDataQualityFilter("serial"), "serial")
  assert.equal(normalizeAssetDataQualityFilter("photo"), "photo")
  assert.equal(normalizeAssetDataQualityFilter("unknown"), "")
  assert.equal(normalizeAssetDataQualityFilter(["photo", "serial"]), "photo")
})
