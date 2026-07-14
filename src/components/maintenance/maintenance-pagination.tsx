import Link from "next/link"
import { ChevronLeft, ChevronRight } from "lucide-react"
import { buildMaintenancePagination } from "@/lib/maintenance-list"
import { buildMaintenancePageHref } from "@/lib/maintenance-view"

export function MaintenancePagination({
  locale,
  currentQuery,
  page,
  pageSize,
  total,
  labels,
}: {
  locale: string
  currentQuery: string
  page: number
  pageSize: number
  total: number
  labels: { rowsPerPage: string; page: string; of: string; previous: string; next: string }
}) {
  const pagination = buildMaintenancePagination(page, pageSize, total)
  const previousPage = Math.max(1, pagination.page - 1)
  const nextPage = Math.min(pagination.totalPages, pagination.page + 1)

  return (
    <nav aria-label={labels.page} className="flex flex-col gap-3 border-t border-border px-4 py-3 text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
      <div aria-live="polite">
        {pagination.start}-{pagination.end} {labels.of} {pagination.total}
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <span>{labels.rowsPerPage}</span>
        {[25, 50, 100].map((size) => (
          <Link
            key={size}
            href={buildMaintenancePageHref(locale, currentQuery, { pageSize: size, page: 1 })}
            aria-current={pagination.pageSize === size ? "page" : undefined}
            className={`inline-flex min-h-11 min-w-11 items-center justify-center rounded-md border px-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 sm:h-8 sm:min-h-0 sm:min-w-8 ${pagination.pageSize === size ? "border-primary bg-primary/10 text-primary" : "border-border bg-surface hover:bg-accent"}`}
          >
            {size}
          </Link>
        ))}
        <span className="px-2">{labels.page} {pagination.page} {labels.of} {pagination.totalPages}</span>
        <Link
          href={buildMaintenancePageHref(locale, currentQuery, { page: previousPage })}
          aria-disabled={pagination.page <= 1}
          className={`inline-flex min-h-11 items-center rounded-md border border-border px-3 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 sm:h-8 sm:min-h-0 ${pagination.page <= 1 ? "pointer-events-none opacity-50" : "hover:bg-accent"}`}
        >
          <ChevronLeft className="h-4 w-4" aria-hidden="true" />{labels.previous}
        </Link>
        <Link
          href={buildMaintenancePageHref(locale, currentQuery, { page: nextPage })}
          aria-disabled={pagination.page >= pagination.totalPages}
          className={`inline-flex min-h-11 items-center rounded-md border border-border px-3 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 sm:h-8 sm:min-h-0 ${pagination.page >= pagination.totalPages ? "pointer-events-none opacity-50" : "hover:bg-accent"}`}
        >
          {labels.next}<ChevronRight className="h-4 w-4" aria-hidden="true" />
        </Link>
      </div>
    </nav>
  )
}
