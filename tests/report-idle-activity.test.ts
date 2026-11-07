import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import test from "node:test"

const reportsPage = readFileSync("src/app/[locale]/(dashboard)/reports/page.tsx", "utf8")
const operationsView = readFileSync("src/components/reports/reports-operations-view.tsx", "utf8")

test("reports rebuild the idle count from the exact drilldown scope and shared activity predicate", () => {
  assert.match(reportsPage, /const operationsQualityFilters = parseAssetListParams\(\{ \.\.\.filters, dataQuality: "", activity: "", page: 1 \}\)/)
  assert.match(reportsPage, /const operationsQualityWhere = await applyAssetCrossScopeFilter\(buildAssetWhere\(operationsQualityFilters\), operationsQualityFilters\.crossScope\)/)
  // Group 10 plan 2 Task 1: the operations reads moved to src/lib/reports-operations-data.ts; the page hands it the scope.
  const operationsData = readFileSync("src/lib/reports-operations-data.ts", "utf8")
  assert.match(reportsPage, /getReportsOperationsData\(\r?\n\s+operationsQualityWhere,/)
  assert.match(operationsData, /getAssetActivityWhere\("idle_180d"\)/)
  assert.match(operationsData, /db\.asset\.count\(\{ where: \{ AND: \[where, \.\.\.\(idleAssetWhere \? \[idleAssetWhere\] : \[\]\)\] \} \}\)/)
  assert.doesNotMatch(reportsPage + operationsData, /function daysAgo/)
})

test("reports idle drilldown opens the exact Asset Register activity scope", () => {
  assert.match(reportsPage, /filters=\{operationsQualityFilters\}/)
  assert.match(operationsView, /buildAssetQueryString\(filters, \{[\s\S]*activity: "idle_180d",[\s\S]*dataQuality: ""/)
  assert.match(operationsView, /<Link href=\{idleAssetsHref\}/)
})
