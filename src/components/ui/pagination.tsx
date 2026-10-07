import Link from "next/link"
import { ChevronLeft, ChevronRight } from "lucide-react"
import { cn } from "@/lib/utils"

type PaginationLabels = {
  navigation: string
  previous: string
  next: string
  /** Already formatted, e.g. "หน้า 2 จาก 9". */
  pageOf: string
}

const controlClasses =
  "inline-flex min-h-11 items-center gap-1 rounded-md border border-border px-3 text-sm font-medium sm:h-9 sm:min-h-0"

export function Pagination({
  page,
  totalPages,
  previousHref,
  nextHref,
  labels,
  className,
}: {
  page: number
  totalPages: number
  previousHref: string
  nextHref: string
  labels: PaginationLabels
  className?: string
}) {
  return (
    <nav aria-label={labels.navigation} className={cn("flex items-center gap-2", className)}>
      <PaginationControl href={previousHref} enabled={page > 1} direction="previous" label={labels.previous} />
      <span className="px-1 text-sm text-muted-foreground">{labels.pageOf}</span>
      <PaginationControl href={nextHref} enabled={page < totalPages} direction="next" label={labels.next} />
    </nav>
  )
}

function PaginationControl({
  href,
  enabled,
  direction,
  label,
}: {
  href: string
  enabled: boolean
  direction: "previous" | "next"
  label: string
}) {
  const content = direction === "previous"
    ? <><ChevronLeft className="size-4" aria-hidden="true" />{label}</>
    : <>{label}<ChevronRight className="size-4" aria-hidden="true" /></>

  if (!enabled) {
    return (
      <span aria-disabled="true" className={cn(controlClasses, "cursor-not-allowed bg-muted text-muted-foreground")}>
        {content}
      </span>
    )
  }

  return (
    <Link
      href={href}
      className={cn(controlClasses, "bg-surface text-foreground transition-colors hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring")}
    >
      {content}
    </Link>
  )
}
