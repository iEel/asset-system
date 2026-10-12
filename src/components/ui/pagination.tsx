import Link from "next/link"
import { buttonVariants } from "@/components/ui/button-variants"
import { cn } from "@/lib/utils"

export type PaginationLabels = {
  /** tCommon("pagination"): the name of the nav. */
  navigation: string
  previous: string
  next: string
  /** Already formatted, e.g. "หน้า 2 จาก 9". */
  pageOf: string
  /** tCommon("showingRange", { from, to, total }) with the numbers already through formatCount. */
  range?: string
  /** tCommon("pageSizeLabel"): the name of the page-size group. Pass it whenever you pass pageSizes. */
  pageSizeGroup?: string
  /** tCommon("rowsPerPage"): the word shown before the page sizes ("แสดง"). */
  rowsPerPage?: string
}

export type PaginationPageSize = { value: number; href: string }

export type PaginationProps = {
  /** The page shown, already kept within 1…totalPages. */
  page: number
  totalPages: number
  previousHref: string
  nextHref: string
  labels: PaginationLabels
  /** The current page size; marks one of pageSizes as current. */
  pageSize?: number
  /** 25/50/100 for the server lists (R-k). The asset register passes none: it picks its size in the filter sheet. */
  pageSizes?: readonly PaginationPageSize[]
  className?: string
}

// Mockup .table-foot (spec 2B §3.8): the range and the page text on the left, announced when a client navigation
// changes them; the page sizes as links that look like Segmented; words-only outline sm buttons, 44px below md and
// 32px from md. A disabled button is a span with the shared disabled look, so it takes no focus and never fades.
// Server-safe: no directive and no hooks.
const controlClasses = buttonVariants({ variant: "outline", size: "sm" })
const pageSizeFrameClasses = "inline-flex gap-0.5 rounded-md border border-border bg-surface p-0.5"
// The frame is 32px from md (26 + 2 × 2 padding + 2 × 1 border); every option is a 44px target below md.
const pageSizeOptionClasses = "inline-flex min-h-11 min-w-11 items-center justify-center rounded-control px-2 text-meta transition-colors motion-reduce:transition-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring md:min-h-6.5 md:min-w-8"
const pageSizeCurrentClasses = "bg-primary-soft font-semibold text-primary-hover"
const pageSizeIdleClasses = "font-medium text-muted-foreground hover:bg-background hover:text-foreground"

export function Pagination({ page, totalPages, previousHref, nextHref, labels, pageSize, pageSizes, className }: PaginationProps) {
  return (
    <nav aria-label={labels.navigation} className={cn("flex flex-wrap items-center justify-between gap-x-3 gap-y-2", className)}>
      <p aria-live="polite" className="text-meta text-muted-foreground num">
        {labels.range ? <>{labels.range}<span aria-hidden="true"> · </span></> : null}
        {labels.pageOf}
      </p>
      <div className="flex flex-wrap items-center gap-2">
        {pageSizes?.length ? (
          <div role="group" aria-label={labels.pageSizeGroup} className="flex items-center gap-2">
            {labels.rowsPerPage ? <span aria-hidden="true" className="text-meta text-muted-foreground">{labels.rowsPerPage}</span> : null}
            <div className={pageSizeFrameClasses}>
              {pageSizes.map((size) => (
                <Link
                  key={size.value}
                  href={size.href}
                  aria-current={size.value === pageSize ? "true" : undefined}
                  className={cn(pageSizeOptionClasses, size.value === pageSize ? pageSizeCurrentClasses : pageSizeIdleClasses)}
                >
                  {size.value}
                </Link>
              ))}
            </div>
          </div>
        ) : null}
        <PaginationControl href={previousHref} enabled={page > 1} rel="prev" label={labels.previous} />
        <PaginationControl href={nextHref} enabled={page < totalPages} rel="next" label={labels.next} />
      </div>
    </nav>
  )
}

function PaginationControl({
  href,
  enabled,
  rel,
  label,
}: {
  href: string
  enabled: boolean
  rel: "prev" | "next"
  label: string
}) {
  if (!enabled) {
    return (
      <span aria-disabled="true" className={controlClasses}>
        {label}
      </span>
    )
  }

  return (
    <Link href={href} rel={rel} className={controlClasses}>
      {label}
    </Link>
  )
}
