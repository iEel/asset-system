import Link from "next/link"
import { ChevronLeft, ChevronRight } from "lucide-react"
import { paginationRange } from "@/lib/master-data-query"
import { buildDisposalQueryString, parseDisposalListParams } from "@/lib/disposal-query"

type DisposalPaginationState = ReturnType<typeof parseDisposalListParams>

export function DisposalPagination({
  filters,
  total,
  basePath,
  labels,
}: {
  filters: DisposalPaginationState
  total: number
  basePath: string
  labels: { rowsPerPage: string; page: string; of: string; previous: string; next: string }
}) {
  const { start, end, totalPages } = paginationRange(filters.page, filters.pageSize, total)
  const previousPage = Math.max(1, filters.page - 1)
  const nextPage = Math.min(totalPages, filters.page + 1)

  return (
    <div className="flex flex-col gap-3 border-t border-border px-4 py-3 text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
      <div>
        {start}-{end} {labels.of} {total}
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <span>{labels.rowsPerPage}</span>
        {[25, 50, 100].map((pageSize) => (
          <Link
            key={pageSize}
            href={`${basePath}?${buildDisposalQueryString(filters, { pageSize, page: 1 })}`}
            aria-current={filters.pageSize === pageSize ? "page" : undefined}
            className={`inline-flex min-h-11 min-w-11 items-center justify-center rounded-md border px-2 transition-colors sm:h-8 sm:min-h-0 sm:min-w-8 ${
              filters.pageSize === pageSize ? "border-primary bg-primary/10 text-primary" : "border-border bg-surface hover:bg-accent"
            }`}
          >
            {pageSize}
          </Link>
        ))}
        <span className="px-2">
          {labels.page} {Math.min(filters.page, totalPages)} {labels.of} {totalPages}
        </span>
        <Link
          href={`${basePath}?${buildDisposalQueryString(filters, { page: previousPage })}`}
          aria-disabled={filters.page <= 1}
          className={`inline-flex min-h-11 items-center rounded-md border border-border px-3 transition-colors sm:h-8 sm:min-h-0 ${
            filters.page <= 1 ? "pointer-events-none opacity-50" : "hover:bg-accent"
          }`}
        >
          <ChevronLeft className="h-4 w-4" aria-hidden="true" />
          {labels.previous}
        </Link>
        <Link
          href={`${basePath}?${buildDisposalQueryString(filters, { page: nextPage })}`}
          aria-disabled={filters.page >= totalPages}
          className={`inline-flex min-h-11 items-center rounded-md border border-border px-3 transition-colors sm:h-8 sm:min-h-0 ${
            filters.page >= totalPages ? "pointer-events-none opacity-50" : "hover:bg-accent"
          }`}
        >
          {labels.next}
          <ChevronRight className="h-4 w-4" aria-hidden="true" />
        </Link>
      </div>
    </div>
  )
}
