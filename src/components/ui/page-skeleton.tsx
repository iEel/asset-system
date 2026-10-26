import type { ComponentProps } from "react"
import { cn } from "@/lib/utils"

// Loading skeletons in the shape of the pages they stand for (spec 2B §4.7, I28): the PageHeader rows, one StatStrip
// frame for the numbers, the DataTable frame and the underline TabNav, at the full width of the page (R-o: list and
// detail pages have no max width). Server-safe. The loading.tsx files render one of the five exports and nothing else.

type SkeletonBlockProps = {
  className?: string
}

type PageHeaderSkeletonProps = {
  // The breadcrumb trail of a record page, 4px above the title.
  crumbs?: boolean
  // "text": the description line · "badges": two status badges (the asset page) · "none": no meta row.
  meta?: "text" | "badges" | "none"
  // The button row.
  actions?: boolean
  // The asset register (PageHeader compactOnMobile): below md the title and its button share one row, no meta row.
  compactOnMobile?: boolean
}

type TableSkeletonProps = {
  rows?: number
  columns?: number
  // The asset register's compact rows.
  dense?: boolean
}

function SkeletonBlock({ className }: SkeletonBlockProps) {
  return <div aria-hidden="true" className={cn("rounded-md bg-muted motion-safe:animate-pulse", className)} />
}

// PageHeader: stacked below md, title and buttons in one row from md; buttons 44px on phones, 36px from md.
function PageHeaderSkeleton({ crumbs = false, meta = "text", actions = true, compactOnMobile = false }: PageHeaderSkeletonProps) {
  return (
    <div className="min-w-0">
      {crumbs ? <SkeletonBlock className="mb-1 h-5 w-40" /> : null}
      <div className={compactOnMobile ? "flex min-w-0 items-center justify-between gap-3 md:items-start" : "flex min-w-0 flex-col gap-3 md:flex-row md:items-start md:justify-between"}>
        <div className="min-w-0">
          <SkeletonBlock className="h-8 w-56 max-w-full" />
          {meta === "text" ? <SkeletonBlock className={cn("mt-1 h-5 w-72 max-w-full", compactOnMobile && "max-md:hidden")} /> : null}
          {meta === "badges" ? (
            <div className="mt-1 flex gap-3">
              <SkeletonBlock className="h-5.5 w-20 rounded-control" />
              <SkeletonBlock className="h-5.5 w-20 rounded-control" />
            </div>
          ) : null}
        </div>
        {actions ? <SkeletonBlock className="h-11 w-28 shrink-0 md:h-9" /> : null}
      </div>
    </div>
  )
}

// StatStrip (I28): one 12px frame with 1px lines between the cells, two columns below lg and one row from lg. As in
// StatStrip, a last cell left alone below lg fills its row, so no grey hole shows where a cell is missing.
// foot: the faint foot line under the value (the dashboard's KPIs).
function MetricGridSkeleton({ count = 4, foot = false, className }: { count?: number; foot?: boolean; className?: string }) {
  return (
    <div className={cn("grid grid-cols-2 gap-px overflow-hidden rounded-lg border border-border bg-border max-lg:[&>:last-child:nth-child(odd)]:col-span-2 lg:auto-cols-fr lg:grid-flow-col lg:grid-cols-none", className)}>
      {Array.from({ length: count }, (_, index) => (
        <div key={index} className="space-y-2 bg-surface px-4 py-3 md:px-5 md:py-4">
          <SkeletonBlock className="h-4 w-24" />
          <SkeletonBlock className="h-8 w-16" />
          {foot ? <SkeletonBlock className="h-4 w-32 max-w-full" /> : null}
        </div>
      ))}
    </div>
  )
}

// DataTable: a 12px white frame, a white header row and soft lines between the rows.
function TableSkeleton({ rows = 6, columns = 5, dense = false }: TableSkeletonProps) {
  const columnTemplate = { gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` }

  return (
    <div className="overflow-hidden rounded-lg border border-border bg-surface">
      <div className="grid gap-4 border-b border-border bg-surface px-3 py-2.5" style={columnTemplate}>
        {Array.from({ length: columns }, (_, index) => (
          <SkeletonBlock key={index} className="h-4 w-20" />
        ))}
      </div>
      <div className="divide-y divide-border-soft">
        {Array.from({ length: rows }, (_, rowIndex) => (
          <div key={rowIndex} className={cn("grid gap-4 px-3", dense ? "py-2" : "py-3")} style={columnTemplate}>
            {Array.from({ length: columns }, (_, columnIndex) => (
              <SkeletonBlock key={columnIndex} className={cn("h-4", columnIndex === 0 ? "w-28" : "w-full")} />
            ))}
          </div>
        ))}
      </div>
    </div>
  )
}

// TabNav: underline tabs on one base line, not boxes.
function TabNavSkeleton({ count, ...props }: { count: number } & ComponentProps<"div">) {
  return (
    <div {...props} className="flex gap-4 overflow-hidden border-b border-border pb-2">
      {Array.from({ length: count }, (_, index) => (
        <SkeletonBlock key={index} className="h-5 w-20 shrink-0" />
      ))}
    </div>
  )
}

function FilterPanelSkeleton() {
  return (
    <div className="rounded-lg border border-border bg-surface p-4 sm:p-5">
      <SkeletonBlock className="h-5 w-32" />
      <SkeletonBlock className="mt-2 h-4 w-80 max-w-full" />
      <div className="mt-4 flex flex-wrap gap-2">
        {Array.from({ length: 7 }, (_, index) => (
          <SkeletonBlock key={index} className="h-10 w-28 rounded-full" />
        ))}
      </div>
      <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 8 }, (_, index) => (
          <SkeletonBlock key={index} className="h-11" />
        ))}
      </div>
    </div>
  )
}

// ContentPanel divided flush: the 56px head with its line, then rows split by soft lines (the dashboard's sections).
function DividedPanelSkeleton({ rows, className }: { rows: number; className?: string }) {
  return (
    <div className={cn("rounded-lg border border-border bg-surface", className)}>
      <div className="flex min-h-14 items-center border-b border-border px-4 md:px-5">
        <SkeletonBlock className="h-5 w-40" />
      </div>
      <div className="divide-y divide-border-soft">
        {Array.from({ length: rows }, (_, index) => (
          <div key={index} className="px-4 py-3 md:px-5">
            <SkeletonBlock className="h-5" />
          </div>
        ))}
      </div>
    </div>
  )
}

// Every route without a loading file of its own: a header over a list, the shape most menu rows open.
export function PageSkeleton() {
  return (
    <div aria-busy="true" className="flex w-full flex-col gap-6">
      <PageHeaderSkeleton />
      <TableSkeleton rows={6} />
    </div>
  )
}

// The dashboard (group 1 dashboard task 9): the title and its as-of line, the company links from md, the four KPIs with
// their feet, then the four sections on 12 columns from lg (7 + 5) in the work order: งานที่รอคุณ, ตรวจนับแยกสาขา,
// ตามสถานะ and ล่าสุด, which the phone does not show.
export function DashboardPageSkeleton() {
  return (
    <div aria-busy="true" className="flex w-full flex-col gap-6">
      <PageHeaderSkeleton actions={false} />
      <div className="hidden md:block">
        <TabNavSkeleton count={4} />
      </div>
      <MetricGridSkeleton count={4} foot />
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        <DividedPanelSkeleton rows={4} className="lg:col-span-7" />
        <DividedPanelSkeleton rows={4} className="lg:col-span-5" />
        <DividedPanelSkeleton rows={5} className="lg:col-span-7" />
        <DividedPanelSkeleton rows={5} className="hidden md:block lg:col-span-5" />
      </div>
    </div>
  )
}

// The register (plan 2B-3): the compact header, the toolbar with no frame (search, three scope selects and the filter
// button from md; search and an icon button on phones), the underline status tabs and the dense table.
export function AssetRegisterPageSkeleton() {
  return (
    <div aria-busy="true" className="flex w-full flex-col gap-6">
      <PageHeaderSkeleton compactOnMobile />
      <div className="flex min-w-0 flex-col gap-3">
        <div className="flex min-w-0 flex-wrap items-center gap-2">
          <SkeletonBlock className="h-11 min-w-0 flex-1 basis-56 md:h-9" />
          <SkeletonBlock className="hidden h-9 w-44 shrink-0 md:block lg:w-48" />
          <SkeletonBlock className="hidden h-9 w-44 shrink-0 md:block lg:w-48" />
          <SkeletonBlock className="hidden h-9 w-44 shrink-0 md:block lg:w-48" />
          <SkeletonBlock className="size-11 shrink-0 md:h-9 md:w-36" />
        </div>
        <TabNavSkeleton count={5} />
        <TableSkeleton dense rows={8} columns={6} />
      </div>
    </div>
  )
}

// The asset page: the identity moved into the header (crumbs, then the name, then the status badges), so there is no
// identity card; then the view tabs, the numbers and the content beside its 280px side column.
export function AssetDetailPageSkeleton() {
  return (
    <div aria-busy="true" className="flex w-full flex-col gap-6">
      <PageHeaderSkeleton crumbs meta="badges" />
      <TabNavSkeleton count={4} />
      <MetricGridSkeleton count={6} />
      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_280px]">
        <div className="rounded-lg border border-border bg-surface p-5">
          <SkeletonBlock className="h-5 w-44" />
          <div className="mt-4 space-y-3">
            <SkeletonBlock className="h-16" />
            <SkeletonBlock className="h-16" />
            <SkeletonBlock className="h-16" />
          </div>
        </div>
        <div className="rounded-lg border border-border bg-surface p-5">
          <SkeletonBlock className="h-5 w-36" />
          <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-1">
            <SkeletonBlock className="h-20" />
            <SkeletonBlock className="h-20" />
            <SkeletonBlock className="h-20" />
          </div>
        </div>
      </div>
    </div>
  )
}

export function ReportsPageSkeleton() {
  return (
    <div aria-busy="true" className="flex w-full flex-col gap-6">
      <PageHeaderSkeleton />
      <TabNavSkeleton data-report-tabs-skeleton count={4} />
      <FilterPanelSkeleton />
      <MetricGridSkeleton count={2} className="max-sm:grid-cols-1" />
      <div data-report-view-skeleton className="rounded-lg border border-border bg-surface p-5">
        <SkeletonBlock className="h-5 w-44" />
        <SkeletonBlock className="mt-4 h-64 w-full" />
      </div>
    </div>
  )
}
