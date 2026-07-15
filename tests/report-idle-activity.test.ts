import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import test from "node:test"

const reportsPage = readFileSync("src/app/[locale]/(dashboard)/reports/page.tsx", "utf8")

test("reports use the authoritative idle activity predicate", () => {
  assert.match(reportsPage, /import \{ getAssetActivityWhere \} from "@\/lib\/asset-activity-filter"/)
  assert.match(reportsPage, /const idleAssetWhere = getAssetActivityWhere\("idle_180d"\)/)
  assert.match(reportsPage, /prisma\.asset\.count\(\{ where: \{ AND: \[assetWhere, \.\.\.\(idleAssetWhere \? \[idleAssetWhere\] : \[\]\)\] \} \}\)/)
  assert.doesNotMatch(reportsPage, /function daysAgo/)
})

test("reports idle drilldown opens the exact Asset Register activity scope", () => {
  assert.match(reportsPage, /buildAssetQueryString\(filters, \{ activity: "idle_180d", dataQuality: "", page: 1 \}\)/)
  assert.match(reportsPage, /<Link href=\{idleAssetsHref\}/)
})
