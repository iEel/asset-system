import type React from "react"
import Link from "next/link"
import { ChevronRight } from "lucide-react"
import { orNil } from "@/components/ui/nil"
import { toneIcons } from "@/components/ui/tone-icons"
import { cn } from "@/lib/utils"

export type StatStripItem = {
  key: string
  label: string
  // Already formatted (formatCount, formatMoney). Never a raw number. null shows Nil.
  value: string | null
  // "บาท", "รายการ"
  unit?: string
  // One line, cut with an ellipsis; footTitle is its title for the cut text.
  foot?: React.ReactNode
  footTitle?: string
  // The whole cell is a link (a filter, or a drill-down to the list).
  href?: string
  // The filter in use: aria-current="page", primary-soft fill and a 2px line.
  current?: boolean
  scroll?: boolean
  // Needs attention: the foot line turns warning with an icon. No fill and no border.
  attention?: boolean
}

// Mockup .stat: a subgrid of three rows (label, value, foot), so labels and values line up across the strip.
const statClasses = "group relative row-span-3 grid grid-rows-subgrid content-start gap-y-1 bg-surface px-4 py-3 transition-colors md:px-5 md:py-4"
// The stretched link draws no ring of its own (the cell has no room outside); the cell draws it.
const statLinkClasses = "has-[a:focus-visible]:ring-2 has-[a:focus-visible]:ring-inset has-[a:focus-visible]:ring-ring"
const statCurrentClasses = "bg-primary-soft shadow-[inset_0_-2px_0_var(--primary)]"
const AttentionIcon = toneIcons.warning

// Mockup .stats: one frame with 1px lines between the cells, no status fills (DESIGN.md: color only marks what needs
// action). Two columns below lg, where a last cell left alone fills its row; one row of equal cells from lg.
// A <dl> takes no aria-label: a caller that needs a name wraps it in <section aria-labelledby>. Server-safe.
export function StatStrip({ items, className }: { items: readonly StatStripItem[]; className?: string }) {
  return (
    <dl data-slot="stat-strip" className={cn("grid grid-cols-2 gap-px overflow-hidden rounded-lg border border-border bg-border max-lg:[&>:last-child:nth-child(odd)]:col-span-2 lg:auto-cols-fr lg:grid-flow-col lg:grid-cols-none lg:grid-rows-[repeat(3,auto)]", className)}>
      {items.map((item) => (
        <div key={item.key} data-slot="stat" className={cn(statClasses, item.href && !item.current && "hover:bg-background", item.href && statLinkClasses, item.current && statCurrentClasses)}>
          <dt className="text-meta font-medium text-muted-foreground text-balance">
            {item.href ? (
              <Link href={item.href} scroll={item.scroll} aria-current={item.current ? "page" : undefined} className="after:absolute after:inset-0 focus-visible:outline-none">
                {item.label}
                <ChevronRight aria-hidden="true" className="pointer-events-none absolute top-4.5 right-4 size-3.5 text-faint-foreground invisible group-hover:visible group-focus-within:visible" />
              </Link>
            ) : (
              item.label
            )}
          </dt>
          <dd className="flex min-w-0 items-baseline gap-1">
            <span className="text-metric num text-foreground">{orNil(item.value)}</span>
            {item.unit ? <span className="text-base font-medium text-faint-foreground">{item.unit}</span> : null}
          </dd>
          {item.foot ? (
            <dd className={cn("flex min-w-0 items-center gap-1 text-meta", item.attention ? "text-warning" : "text-faint-foreground")}>
              {item.attention ? <AttentionIcon className="size-3.5 shrink-0" aria-hidden="true" /> : null}
              <span className="truncate" title={item.footTitle}>{item.foot}</span>
            </dd>
          ) : null}
        </div>
      ))}
    </dl>
  )
}
