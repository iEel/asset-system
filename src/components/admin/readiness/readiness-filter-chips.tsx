import Link from "next/link"
import { useTranslations } from "next-intl"
import type { ReadinessCounts, ReadinessFilter } from "@/lib/readiness-presenter"
import { formatCount } from "@/lib/display-format"
import { cn } from "@/lib/utils"

type ReadinessFilterChipsProps = {
  value: ReadinessFilter
  // The counts of all 16 checks, whatever the filter.
  counts: ReadinessCounts
  // The readiness URL for each filter, built by the page.
  hrefFor: (filter: ReadinessFilter) => string
  className?: string
}

// Board AD-Readiness .fchip, the UserStatusChips look: a pill, 32px from md (44px below). The chosen one is filled.
const chipClasses =
  "inline-flex min-h-11 shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full border px-3 text-meta transition-colors motion-reduce:transition-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 md:h-8 md:min-h-0"
const chipCurrentClasses = "border-primary-border bg-primary-soft font-semibold text-primary-hover"
const chipIdleClasses = "border-border bg-surface font-medium text-foreground hover:bg-background"

const filters: readonly ReadinessFilter[] = ["all", "fail", "warning", "pass"]

// Group 12 spec §6: ทั้งหมด · ต้องแก้ · ควรตรวจ · พร้อม with counts, then the sum line. The filter is in the URL, so each
// chip is a real link marked with aria-current. Server-safe.
export function ReadinessFilterChips({ value, counts, hrefFor, className }: ReadinessFilterChipsProps) {
  const t = useTranslations("productionReadinessPage")
  const total = counts.fail + counts.warning + counts.pass
  const countOf = (filter: ReadinessFilter) => (filter === "all" ? total : counts[filter])

  return (
    <div data-slot="readiness-filter-chips" className={cn("min-w-0 space-y-2", className)}>
      <nav aria-label={t("filterLabel")}>
        <ul className="flex flex-wrap items-center gap-1.5">
          {filters.map((filter) => {
            const current = filter === value
            return (
              <li key={filter} className="flex">
                <Link
                  href={hrefFor(filter)}
                  aria-current={current ? "page" : undefined}
                  className={cn(chipClasses, current ? chipCurrentClasses : chipIdleClasses)}
                >
                  {t(`filter_${filter}`)}
                  <span className={cn("num", current ? "text-primary" : "text-faint-foreground")}>{formatCount(countOf(filter))}</span>
                </Link>
              </li>
            )
          })}
        </ul>
      </nav>
      <p className="num text-meta text-muted-foreground">
        {t("sumLine", { fail: counts.fail, warning: counts.warning, pass: counts.pass, total })}
      </p>
    </div>
  )
}
