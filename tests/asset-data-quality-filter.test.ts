import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
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
  assert.deepEqual([...assetDataQualityFilters], ["responsibility", "serial", "photo", "department", "purchase", "warranty", "licenseExpiry", "returnDue", "noHandover"])
})

test("noHandover (มีผู้ถือครองแต่ไม่มีใบส่งมอบ) is a register filter, and every value has a chip label on the register and on the reports page (group 3 spec §8.1, P2-R20)", () => {
  assert.equal(normalizeAssetDataQualityFilter("noHandover"), "noHandover")
  const read = (path: string) => readFileSync(path, "utf8").replace(/\r\n/g, "\n")
  const block = (source: string, start: string, end: string) => source.slice(source.indexOf(start), source.indexOf(end, source.indexOf(start)))
  const register = block(read("src/app/[locale]/(dashboard)/assets/page.tsx"), "dataQuality: {\n", "crossScope: {\n")
  const reports = block(read("src/app/[locale]/(dashboard)/reports/page.tsx"), "const dataQualityFilterLabels", "const crossScopeFilterLabels")
  for (const value of assetDataQualityFilters) {
    assert.match(register, new RegExp(`\\n\\s+${value}: t\\("dataQuality\\w+"\\),\\n`), `register chip: ${value}`)
    assert.match(reports, new RegExp(`\\n\\s+${value}: t(?:Asset)?\\("\\w+"\\),\\n`), `reports chip: ${value}`)
  }
  // A value without a label prints its raw code (asset-register-chips.ts:53, report-active-filters.ts): both maps are checked by tsc.
  assert.match(register, /\} satisfies Record<AssetDataQualityFilter, string>,\s*$/)
  assert.match(reports, /\} satisfies Record<AssetDataQualityFilter, string>\s*$/)
})
