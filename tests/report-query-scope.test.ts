import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import test from "node:test"

const source = readFileSync("src/app/[locale]/(dashboard)/reports/page.tsx", "utf8")
const operationsData = readFileSync("src/lib/reports-operations-data.ts", "utf8")

test("reports instruments shared data and each exclusive view", () => {
  for (const label of ["reports.shared-data", "reports.overview-data", "reports.accounting-data", "reports.operations-data", "reports.catalog-data"]) {
    assert.ok(source.includes(label), `missing ${label}`)
  }
  assert.doesNotMatch(source, /reports\.(initial-data|lookup-data|dimension-labels)/)
})

test("the unbounded accounting asset query is inside the accounting branch", () => {
  const start = source.indexOf('case "accounting"')
  const end = source.indexOf('case "operations"')
  const accounting = source.slice(start, end)
  assert.match(accounting, /prisma\.asset\.findMany/)
  assert.match(accounting, /depreciationPolicySettingKey/)
  assert.doesNotMatch(source.slice(0, start), /const costAssets/)
})

test("frequent repair grouping respects the filtered asset relation", () => {
  const start = source.indexOf('case "operations"')
  const end = source.indexOf('case "catalog"')
  // Group 10 plan 2 Task 1: the reads live in src/lib/reports-operations-data.ts; the page hands it the full where.
  assert.match(source.slice(start, end), /topsWhere: assetWhere,/)
  assert.match(operationsData, /maintenanceTicket\.groupBy\(\{[\s\S]*asset: topsWhere/)
})

test("idle count uses the shared activity predicate", () => {
  assert.match(operationsData, /getAssetActivityWhere\("idle_180d"/)
  assert.doesNotMatch(source + operationsData, /function daysAgo/)
})
