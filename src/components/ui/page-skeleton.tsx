import { cn } from "@/lib/utils"

type SkeletonBlockProps = {
  className?: string
}

type TableSkeletonProps = {
  rows?: number
  columns?: number
}

function SkeletonBlock({ className }: SkeletonBlockProps) {
  return <div aria-hidden="true" className={cn("rounded-md bg-muted motion-safe:animate-pulse", className)} />
}

function PageHeaderSkeleton() {
  return (
    <div className="flex min-w-0 flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
      <div className="min-w-0 space-y-2">
        <SkeletonBlock className="h-7 w-56 max-w-full" />
        <SkeletonBlock className="h-4 w-80 max-w-full" />
      </div>
      <SkeletonBlock className="h-11 w-32 sm:h-10" />
    </div>
  )
}

function MetricGridSkeleton({ count = 4 }: { count?: number }) {
  return (
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
      {Array.from({ length: count }, (_, index) => (
        <div key={index} className="rounded-lg border border-border bg-surface p-5 shadow-sm">
          <SkeletonBlock className="h-4 w-28" />
          <SkeletonBlock className="mt-3 h-8 w-16" />
          <SkeletonBlock className="mt-2 h-3 w-32" />
        </div>
      ))}
    </div>
  )
}

function TableSkeleton({ rows = 6, columns = 5 }: TableSkeletonProps) {
  return (
    <div className="overflow-hidden rounded-md border border-border bg-surface">
      <div className="grid gap-4 border-b border-border bg-muted/40 px-4 py-3" style={{ gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` }}>
        {Array.from({ length: columns }, (_, index) => (
          <SkeletonBlock key={index} className="h-3 w-20" />
        ))}
      </div>
      <div className="divide-y divide-border">
        {Array.from({ length: rows }, (_, rowIndex) => (
          <div key={rowIndex} className="grid gap-4 px-4 py-4" style={{ gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` }}>
            {Array.from({ length: columns }, (_, columnIndex) => (
              <SkeletonBlock key={columnIndex} className={cn("h-4", columnIndex === 0 ? "w-28" : "w-full")} />
            ))}
          </div>
        ))}
      </div>
    </div>
  )
}

function FilterPanelSkeleton() {
  return (
    <div className="rounded-lg border border-border bg-surface p-4 shadow-sm sm:p-5">
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

export function PageSkeleton() {
  return (
    <div aria-busy="true" className="mx-auto flex w-full max-w-7xl flex-col gap-5">
      <PageHeaderSkeleton />
      <MetricGridSkeleton count={4} />
      <div className="grid gap-5 xl:grid-cols-[1.2fr_0.8fr]">
        <div className="rounded-lg border border-border bg-surface p-5 shadow-sm">
          <SkeletonBlock className="h-5 w-40" />
          <div className="mt-4 space-y-3">
            <SkeletonBlock className="h-16" />
            <SkeletonBlock className="h-16" />
            <SkeletonBlock className="h-16" />
          </div>
        </div>
        <div className="rounded-lg border border-border bg-surface p-5 shadow-sm">
          <SkeletonBlock className="h-5 w-36" />
          <div className="mt-4 space-y-3">
            <SkeletonBlock className="h-12" />
            <SkeletonBlock className="h-12" />
            <SkeletonBlock className="h-12" />
          </div>
        </div>
      </div>
    </div>
  )
}

export function DashboardPageSkeleton() {
  return (
    <div aria-busy="true" className="mx-auto flex w-full max-w-7xl flex-col gap-5">
      <PageHeaderSkeleton />
      <MetricGridSkeleton count={5} />
      <div className="rounded-lg border border-border bg-surface p-5 shadow-sm">
        <SkeletonBlock className="h-5 w-48" />
        <div className="mt-4 grid gap-3 md:grid-cols-4">
          {Array.from({ length: 4 }, (_, index) => (
            <SkeletonBlock key={index} className="h-24" />
          ))}
        </div>
      </div>
      <div className="grid gap-5 lg:grid-cols-2">
        <div className="rounded-lg border border-border bg-surface p-5 shadow-sm">
          <SkeletonBlock className="h-5 w-52" />
          <div className="mt-4 space-y-3">
            <SkeletonBlock className="h-12" />
            <SkeletonBlock className="h-12" />
            <SkeletonBlock className="h-12" />
          </div>
        </div>
        <div className="rounded-lg border border-border bg-surface p-5 shadow-sm">
          <SkeletonBlock className="h-5 w-32" />
          <div className="mt-4 space-y-3">
            {Array.from({ length: 5 }, (_, index) => (
              <SkeletonBlock key={index} className="h-16" />
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

export function AssetRegisterPageSkeleton() {
  return (
    <div aria-busy="true" className="mx-auto flex w-full max-w-7xl flex-col gap-5">
      <PageHeaderSkeleton />
      <FilterPanelSkeleton />
      <div className="rounded-lg border border-border bg-surface p-4 shadow-sm sm:p-5">
        <div className="mb-4 flex min-w-0 flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-2">
            <SkeletonBlock className="h-5 w-44" />
            <SkeletonBlock className="h-4 w-64 max-w-full" />
          </div>
          <div className="flex gap-2">
            <SkeletonBlock className="h-10 w-28" />
            <SkeletonBlock className="h-10 w-28" />
          </div>
        </div>
        <TableSkeleton rows={8} columns={6} />
      </div>
    </div>
  )
}

export function AssetDetailPageSkeleton() {
  return (
    <div aria-busy="true" className="mx-auto flex w-full max-w-7xl flex-col gap-5">
      <PageHeaderSkeleton />
      <div className="rounded-lg border border-border bg-surface p-5 shadow-sm">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
          <SkeletonBlock className="h-24 w-24 shrink-0" />
          <div className="min-w-0 flex-1 space-y-3">
            <SkeletonBlock className="h-6 w-52 max-w-full" />
            <SkeletonBlock className="h-4 w-80 max-w-full" />
            <div className="flex gap-2">
              <SkeletonBlock className="h-7 w-20 rounded-full" />
              <SkeletonBlock className="h-7 w-24 rounded-full" />
            </div>
          </div>
        </div>
      </div>
      <MetricGridSkeleton count={4} />
      <div className="grid gap-5 xl:grid-cols-[1.2fr_0.8fr]">
        <div className="rounded-lg border border-border bg-surface p-5 shadow-sm">
          <SkeletonBlock className="h-5 w-44" />
          <div className="mt-4 space-y-3">
            <SkeletonBlock className="h-16" />
            <SkeletonBlock className="h-16" />
            <SkeletonBlock className="h-16" />
          </div>
        </div>
        <div className="rounded-lg border border-border bg-surface p-5 shadow-sm">
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
    <div aria-busy="true" className="mx-auto flex w-full max-w-7xl flex-col gap-5">
      <PageHeaderSkeleton />
      <FilterPanelSkeleton />
      <MetricGridSkeleton count={4} />
      <div className="grid gap-5 lg:grid-cols-2">
        {Array.from({ length: 2 }, (_, index) => (
          <div key={index} className="rounded-lg border border-border bg-surface p-5 shadow-sm">
            <SkeletonBlock className="h-5 w-40" />
            <SkeletonBlock className="mt-4 h-52 w-full" />
          </div>
        ))}
      </div>
      <TableSkeleton rows={6} columns={5} />
    </div>
  )
}
