import { statusFillVariants } from "@/components/ui/badge-variants"
import type { StatusTone } from "@/lib/status-tone"
import { cn } from "@/lib/utils"

// The Data Bars Rule (DESIGN.md §2, §5 Data Bars): the parts of one whole as one 12px stacked bar. Each part above zero
// grows by its count, is at least 4px wide, sits 2px from its neighbours and takes its status tone's fill.
const distributionSegmentClasses = "h-full min-w-1 basis-0 rounded-xs"

// The bar holds no number or word of its own and is hidden from assistive technology: the page writes the status table
// beside it, with every count, share and the same links. A segment given href is a link to its list for a pointer only,
// kept out of the tab order with the status, its count and the filter note shown on hover; keyboard and screen-reader
// users take the table's links.
export function DistributionBar({ segments }: { segments: { key: string; count: number; tone: StatusTone; href?: string; title?: string }[] }) {
  const shown = segments.filter((segment) => segment.count > 0)
  if (shown.length === 0) return null

  return (
    <div aria-hidden="true" data-slot="distribution-bar" className="flex h-3 w-full gap-0.5">
      {shown.map((segment) =>
        segment.href ? (
          <a key={segment.key} href={segment.href} tabIndex={-1} title={segment.title} data-status-segment={segment.key} className={cn(distributionSegmentClasses, statusFillVariants({ tone: segment.tone }))} style={{ flexGrow: segment.count }} />
        ) : (
          <span key={segment.key} className={cn(distributionSegmentClasses, statusFillVariants({ tone: segment.tone }))} style={{ flexGrow: segment.count }} />
        ),
      )}
    </div>
  )
}
