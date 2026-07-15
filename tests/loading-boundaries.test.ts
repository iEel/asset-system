import assert from "node:assert/strict"
import { existsSync, readFileSync } from "node:fs"
import test from "node:test"

for (const [routePath, skeletonName] of [
  ["src/app/[locale]/(dashboard)/assets/[id]/loading.tsx", "AssetDetailPageSkeleton"],
  ["src/app/[locale]/(dashboard)/reports/loading.tsx", "ReportsPageSkeleton"],
] as const) {
  test(`${routePath} exposes a route-specific loading boundary`, () => {
    assert.ok(existsSync(routePath), "loading boundary should exist")
    assert.match(readFileSync(routePath, "utf8"), new RegExp(skeletonName))
  })
}

test("reports loading skeleton follows the adaptive page order", () => {
  const source = readFileSync("src/components/ui/page-skeleton.tsx", "utf8")
  const start = source.indexOf("export function ReportsPageSkeleton()")
  assert.ok(start >= 0, "ReportsPageSkeleton should exist")

  const reportsSkeleton = source.slice(start)
  const expectedOrder = [
    "PageHeaderSkeleton",
    "data-report-tabs-skeleton",
    "FilterPanelSkeleton",
    "MetricGridSkeleton count={2}",
    "data-report-view-skeleton",
  ]
  const indexes = expectedOrder.map((token) => reportsSkeleton.indexOf(token))

  assert.ok(indexes.every((index) => index >= 0), "reports skeleton should include every adaptive shell placeholder")
  assert.deepEqual(indexes, [...indexes].sort((a, b) => a - b))
})
