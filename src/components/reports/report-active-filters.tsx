import Link from "next/link"
import { X } from "lucide-react"
import type { ReportActiveFilterDescriptor } from "@/lib/report-active-filters"

type ReportActiveFiltersProps = {
  filters: ReportActiveFilterDescriptor[]
  clearAllHref: string
  clearLabel: string
  removeLabel: string
}

export function ReportActiveFilters({ filters, clearAllHref, clearLabel, removeLabel }: ReportActiveFiltersProps) {
  if (filters.length === 0) return null

  return (
    <section data-report-active-filters className="flex flex-wrap items-center gap-2 rounded-md border border-primary/20 bg-primary/5 px-3 py-2">
      {filters.map((filter) => (
        <Link
          key={filter.key}
          href={filter.href}
          aria-label={`${removeLabel}: ${filter.label}`}
          className="inline-flex min-h-11 items-center gap-1.5 rounded-md border border-primary/20 bg-surface px-3 text-sm text-foreground transition-colors hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 sm:min-h-9"
        >
          <span>{filter.label}</span>
          <X aria-hidden="true" className="h-3.5 w-3.5 text-muted-foreground" />
        </Link>
      ))}
      <Link
        href={clearAllHref}
        className="inline-flex min-h-11 items-center justify-center rounded-md px-3 text-sm font-medium text-primary underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 sm:min-h-9"
      >
        {clearLabel}
      </Link>
    </section>
  )
}
