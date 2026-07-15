import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import test from "node:test"

const reportsPage = readFileSync("src/app/[locale]/(dashboard)/reports/page.tsx", "utf8")

test("reports rebuild the idle count from the exact drilldown scope", () => {
  assert.match(reportsPage, /const idleAssetOverrides = \{ activity: "idle_180d", dataQuality: "", page: 1 \} as const/)
  assert.match(reportsPage, /const idleAssetFilters = parseAssetListParams\(\{ \.\.\.filters, \.\.\.idleAssetOverrides \}\)/)
  assert.match(reportsPage, /const idleAssetWhere = await applyAssetCrossScopeFilter\(buildAssetWhere\(idleAssetFilters\), idleAssetFilters\.crossScope\)/)
  assert.match(reportsPage, /prisma\.asset\.count\(\{ where: idleAssetWhere \}\)/)
  assert.doesNotMatch(reportsPage, /getAssetActivityWhere/)
  assert.doesNotMatch(reportsPage, /function daysAgo/)
})

test("reports idle drilldown opens the exact Asset Register activity scope", () => {
  assert.match(reportsPage, /buildAssetQueryString\(filters, idleAssetOverrides\)/)
  assert.match(reportsPage, /<Link href=\{idleAssetsHref\}/)
})
