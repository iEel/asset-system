import assert from "node:assert/strict"
import { existsSync, readFileSync } from "node:fs"
import test from "node:test"

const skeletonComponentPath = "src/components/ui/page-skeleton.tsx"
const dashboardShellLoadingPath = "src/app/[locale]/(dashboard)/loading.tsx"
const dashboardLoadingPath = "src/app/[locale]/(dashboard)/dashboard/loading.tsx"
const assetsLoadingPath = "src/app/[locale]/(dashboard)/assets/loading.tsx"

test("dashboard routes expose page-level skeleton loading fallbacks", () => {
  for (const file of [skeletonComponentPath, dashboardShellLoadingPath, dashboardLoadingPath, assetsLoadingPath]) {
    assert.ok(existsSync(file), `${file} should exist`)
  }

  const skeletonSource = readFileSync(skeletonComponentPath, "utf8")
  assert.match(skeletonSource, /export function PageSkeleton/)
  assert.match(skeletonSource, /export function DashboardPageSkeleton/)
  assert.match(skeletonSource, /export function AssetRegisterPageSkeleton/)
  assert.match(skeletonSource, /motion-safe:animate-pulse/)
  assert.match(skeletonSource, /aria-busy="true"/)

  const dashboardShellLoading = readFileSync(dashboardShellLoadingPath, "utf8")
  assert.match(dashboardShellLoading, /PageSkeleton/)
  assert.doesNotMatch(dashboardShellLoading, /Loader2|animate-spin/)

  const dashboardLoading = readFileSync(dashboardLoadingPath, "utf8")
  assert.match(dashboardLoading, /DashboardPageSkeleton/)
  assert.doesNotMatch(dashboardLoading, /Loader2|animate-spin/)

  const assetsLoading = readFileSync(assetsLoadingPath, "utf8")
  assert.match(assetsLoading, /AssetRegisterPageSkeleton/)
  assert.doesNotMatch(assetsLoading, /Loader2|animate-spin/)
})
