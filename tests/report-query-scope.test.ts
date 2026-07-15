import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import test from "node:test"

const source = readFileSync("src/app/[locale]/(dashboard)/reports/page.tsx", "utf8")

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
  assert.match(source.slice(start, end), /maintenanceTicket\.groupBy[\s\S]*asset: assetWhere/)
})

test("idle count uses the shared activity predicate", () => {
  assert.match(source, /getAssetActivityWhere\("idle_180d"/)
  assert.doesNotMatch(source, /function daysAgo/)
})
