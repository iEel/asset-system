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

// Plan 2B-4 Task 9 (spec 2B §4.7, I28, R-o): each skeleton takes the shape of its page at the page's full width: the
// PageHeader rows (switching at md), one StatStrip frame for the numbers, the DataTable frame and underline tabs.
test("loading skeletons take the shape of their pages at full width (spec 2B §4.7, I28)", () => {
  const source = readFileSync(skeletonComponentPath, "utf8").replace(/\r\n/g, "\n")
  assert.doesNotMatch(source, /max-w-7xl|mx-auto/, "list and detail pages are full width, so their skeletons are too (R-o)")
  assert.equal(source.match(/<div aria-busy="true" className="flex w-full flex-col gap-6">/g)?.length, 5, "the five exported skeletons")
  assert.match(source, /className=\{cn\("grid grid-cols-2 gap-px overflow-hidden rounded-lg border border-border bg-border max-lg:\[&>:last-child:nth-child\(odd\)\]:col-span-2 lg:auto-cols-fr lg:grid-flow-col lg:grid-cols-none", className\)\}/, "MetricGridSkeleton is one StatStrip frame (I28)")
  assert.match(source, /<MetricGridSkeleton count=\{2\} className="max-sm:grid-cols-1" \/>/, "the reports numbers are one column below 640px, as on the page (spec 2D M32)")
  assert.match(source, /className="space-y-2 bg-surface px-4 py-3 md:px-5 md:py-4"/)
  assert.match(source, /"flex min-w-0 flex-col gap-3 md:flex-row md:items-start md:justify-between"/, "the header switches at md, like PageHeader")
  assert.match(source, /className="h-11 w-28 shrink-0 md:h-9"/, "header buttons: 44px on phones, 36px from md")
  assert.match(source, /<div className="overflow-hidden rounded-lg border border-border bg-surface">/, "the DataTable frame")
  assert.match(source, /className="grid gap-4 border-b border-border bg-surface px-3 py-2\.5"/, "a white header row")
  assert.match(source, /className="divide-y divide-border-soft"/)
  assert.match(source, /className="flex gap-4 overflow-hidden border-b border-border pb-2"/, "underline tabs, not boxes")
  assert.match(source, /<PageHeaderSkeleton crumbs meta="identity" \/>/, "the asset page: crumbs, then the code, the status badge and the S/N")
  assert.match(source, /<PageHeaderSkeleton actions=\{false\} \/>/, "the dashboard: the title and its as-of line")
  assert.match(source, /<PageHeaderSkeleton compactOnMobile \/>/, "the register: title and button share a row on phones")
  assert.match(source, /<TableSkeleton dense rows=\{8\} columns=\{6\} \/>/, "the register keeps its dense rows")
  assert.match(source, /<MetricGridSkeleton count=\{4\} foot \/>/)
  assert.doesNotMatch(source, /\bsm:(?:flex-row|items-start|justify-between|h-10)\b|bg-background px-4/, "the old header switch at sm and the grey header row are gone")
  const register = source.slice(source.indexOf("export function AssetRegisterPageSkeleton()"), source.indexOf("export function AssetDetailPageSkeleton()"))
  assert.doesNotMatch(register, /FilterPanelSkeleton/, "the register has no filter panel above its table")
  const detail = source.slice(source.indexOf("export function AssetDetailPageSkeleton()"), source.indexOf("export function ReportsPageSkeleton()"))
  assert.doesNotMatch(detail, /h-24 w-24/, "no identity card: the identity is in the header")
})
