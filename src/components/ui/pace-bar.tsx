import { statusFillVariants } from "@/components/ui/badge-variants"
import { barPercent } from "@/lib/data-bars"
import { cn } from "@/lib/utils"

// The Data Bars Rule (DESIGN.md §2, §5 Data Bars): progress from 0 to 1 on an 8px muted track, primary or warning when
// the caller marks it behind, with an optional pace mark (a 2px ink line in a 2px panel gap). Every part is a span with
// the root a block, so the bar is valid inside a StatStrip meter, a dd or a link's text. The label is the sentence the
// page writes beside it; the fill never says "behind" alone. Nothing animates.
const paceTrackClasses = "relative block h-2 w-full rounded-xs bg-muted forced-colors:border forced-colors:border-[CanvasText]"
const paceMarkClasses = "absolute -inset-y-1 w-0.5 -translate-x-1/2 bg-foreground ring-2 ring-surface forced-color-adjust-none forced-colors:bg-[CanvasText]"

export function PaceBar({ value, pace, label, behind }: { value: number; pace: number | null; label: string; behind: boolean }) {
  return (
    <span role="img" aria-label={label} data-slot="pace-bar" className={paceTrackClasses}>
      <span className={cn("block h-full rounded-xs", statusFillVariants({ tone: behind ? "warning" : "primary" }))} style={{ width: `${barPercent(value)}%` }} />
      {pace === null ? null : <span className={paceMarkClasses} style={{ left: `${barPercent(pace)}%` }} />}
    </span>
  )
}
