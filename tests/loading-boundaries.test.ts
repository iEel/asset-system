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

// Plan 2B-4 Task 10 (spec 2B §4.7, R-o): a loading boundary renders its skeleton and nothing else, so its width and shape
// come from the skeleton, which matches its page (Task 9). No wrapper and no width of its own.
test("every dashboard loading boundary renders only its skeleton (spec 2B §4.7)", () => {
  for (const [routePath, skeletonName] of [
    ["src/app/[locale]/(dashboard)/loading.tsx", "PageSkeleton"],
    ["src/app/[locale]/(dashboard)/assets/loading.tsx", "AssetRegisterPageSkeleton"],
    ["src/app/[locale]/(dashboard)/assets/[id]/loading.tsx", "AssetDetailPageSkeleton"],
    ["src/app/[locale]/(dashboard)/dashboard/loading.tsx", "DashboardPageSkeleton"],
    ["src/app/[locale]/(dashboard)/reports/loading.tsx", "ReportsPageSkeleton"],
  ] as const) {
    const source = readFileSync(routePath, "utf8").replace(/\r\n/g, "\n")
    assert.equal(source, `import { ${skeletonName} } from "@/components/ui/page-skeleton"\n\nexport default function Loading() {\n  return <${skeletonName} />\n}\n`, routePath)
  }
})
