import Link from "next/link"
import { useTranslations } from "next-intl"
import { formatCount } from "@/lib/display-format"
import type { RecordStatusFilter } from "@/lib/master-data-query"
import {
  segmentedFrameClasses,
  segmentedIdleClasses,
  segmentedOptionClasses,
  segmentedPressedClasses,
  segmentedSizeClasses,
} from "@/components/ui/segmented"
import { cn } from "@/lib/utils"

export type RecordStatusCounts = { active: number; inactive: number; all: number }

export type RecordStatusSegmentedProps = {
  value: RecordStatusFilter
  counts: RecordStatusCounts
  // The list URL for each status, built by the page so it keeps the other filters and drops the page number.
  hrefFor: (status: RecordStatusFilter) => string
  // On the frame, for layout only.
  className?: string
}

const RECORD_STATUSES = ["active", "inactive", "all"] as const satisfies readonly RecordStatusFilter[]

// G7F-R1: "ใช้งาน {n} / ไม่ใช้งาน {n} / ทั้งหมด {n}" above a master-data list, in place of its status select (the
// employee list first, then the five group-8 lists). The status is in the URL, so each option is a real link named by
// the <nav> and marked with aria-current, like TabNav (R-g), drawn in Segmented's look so it reads as one switch.
// Server-safe: no directive and no state, so a server page passes hrefFor; next-intl's useTranslations works there.
export function RecordStatusSegmented({ value, counts, hrefFor, className }: RecordStatusSegmentedProps) {
  const t = useTranslations("common.recordStatus")
  return (
    <nav aria-label={t("label")} data-slot="record-status-segmented" className={cn("max-w-full overflow-x-auto", className)}>
      <ul className={cn("inline-flex", segmentedFrameClasses)}>
        {RECORD_STATUSES.map((status) => {
          const selected = status === value
          return (
            <li key={status} className="flex">
              <Link
                href={hrefFor(status)}
                aria-current={selected ? "page" : undefined}
                className={cn(segmentedOptionClasses, segmentedSizeClasses.sm, "whitespace-nowrap px-3", selected ? segmentedPressedClasses : segmentedIdleClasses)}
              >
                {t(status)}
                <span className={cn("text-meta num", selected ? "text-primary" : "text-faint-foreground")}>{formatCount(counts[status])}</span>
              </Link>
            </li>
          )
        })}
      </ul>
    </nav>
  )
}
