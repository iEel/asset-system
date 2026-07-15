import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import test from "node:test"

const reportsPage = readFileSync("src/app/[locale]/(dashboard)/reports/page.tsx", "utf8")
const operationsView = readFileSync("src/components/reports/reports-operations-view.tsx", "utf8")

test("reports rebuild the idle count from the exact drilldown scope and shared activity predicate", () => {
  assert.match(reportsPage, /const operationsQualityFilters = parseAssetListParams\(\{ \.\.\.filters, dataQuality: "", activity: "", page: 1 \}\)/)
  assert.match(reportsPage, /const operationsQualityWhere = await applyAssetCrossScopeFilter\(buildAssetWhere\(operationsQualityFilters\), operationsQualityFilters\.crossScope\)/)
  assert.match(reportsPage, /getAssetActivityWhere\("idle_180d"/)
  assert.match(reportsPage, /prisma\.asset\.count\(\{[\s\S]*operationsQualityWhere[\s\S]*idleAssetWhere/)
  assert.doesNotMatch(reportsPage, /function daysAgo/)
})

test("reports idle drilldown opens the exact Asset Register activity scope", () => {
  assert.match(reportsPage, /filters=\{operationsQualityFilters\}/)
  assert.match(operationsView, /buildAssetQueryString\(filters, \{[\s\S]*activity: "idle_180d",[\s\S]*dataQuality: ""/)
  assert.match(operationsView, /<Link href=\{idleAssetsHref\}/)
})
