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
