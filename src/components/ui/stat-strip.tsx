import * as React from "react"
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
  // Up to two lines, then cut with an ellipsis; footTitle is its title for the cut text.
  foot?: React.ReactNode
  footTitle?: string
  // The whole cell is a link (a filter, or a drill-down to the list).
  href?: string
  // The filter in use: aria-current="page", primary-soft fill and a 2px line.
  current?: boolean
  scroll?: boolean
  // Needs attention: the foot line turns warning with an icon. No fill and no border.
  attention?: boolean
  // The filter the number uses, in one short sentence ("สถานะ = ใช้งานอยู่ · ไม่รวมตัดจำหน่าย"). Needs href: a panel under the cell on hover and keyboard focus, which the link names with aria-describedby.
  filterNote?: string
  // A bar full width under the value (PaceBar for a round's progress), server-safe and phrasing content. It holds no link or word: the value and the foot say what it shows, and the cell's link covers it.
  meter?: React.ReactNode
}

// Mockup .stat: a subgrid of three rows (label, value, foot), so labels and values line up across the strip.
const statClasses = "group relative row-span-3 grid grid-rows-subgrid content-start gap-y-1 bg-surface px-4 py-3 transition-colors md:px-5 md:py-4"
// The stretched link draws no ring of its own (the cell has no room outside); the cell draws it.
const statLinkClasses = "has-[a:focus-visible]:ring-2 has-[a:focus-visible]:ring-inset has-[a:focus-visible]:ring-ring"
const statCurrentClasses = "bg-primary-soft shadow-[inset_0_-2px_0_var(--primary)]"
// The filter note in the tooltip look (tooltip.tsx), hidden until the cell is hovered or the dt's own link (not a link in the foot) has keyboard focus. The frame clips its cells, so the panel is fixed and placed under its cell by CSS anchor positioning (the cell's anchor-name); a browser without it shows the note at the cell's top-left corner. visibility, not display, so aria-describedby still reads it.
const statNoteClasses = "pointer-events-none invisible fixed top-[anchor(bottom)] left-[anchor(left)] z-50 mt-1 max-w-72 rounded-md border border-border bg-popover px-2.5 py-1.5 text-meta text-popover-foreground shadow-overlay group-hover:visible group-has-[dt_a:focus-visible]:visible"
const AttentionIcon = toneIcons.warning

// Mockup .stats: one frame with 1px lines between the cells, no status fills (DESIGN.md: color only marks what needs
// action). Two columns below lg, where a last cell left alone fills its row; one row of equal cells from lg.
// A <dl> takes no aria-label: a caller that needs a name wraps it in <section aria-labelledby>. Server-safe.
export function StatStrip({ items, className }: { items: readonly StatStripItem[]; className?: string }) {
  const noteIdBase = React.useId()
  return (
    <dl data-slot="stat-strip" className={cn("grid grid-cols-2 gap-px overflow-hidden rounded-lg border border-border bg-border max-lg:[&>:last-child:nth-child(odd)]:col-span-2 lg:auto-cols-fr lg:grid-flow-col lg:grid-cols-none lg:grid-rows-[repeat(3,auto)]", className)}>
      {items.map((item, index) => {
        const noteId = item.href && item.filterNote ? `${noteIdBase}-note-${index}` : undefined
        return (
          <div key={item.key} data-slot="stat" className={cn(statClasses, item.href && !item.current && "hover:bg-background", item.href && statLinkClasses, item.current && statCurrentClasses)} style={noteId ? { anchorName: `--${noteId}` } : undefined}>
            <dt className="text-meta font-medium text-muted-foreground text-balance">
              {item.href ? (
                <Link href={item.href} scroll={item.scroll} aria-describedby={noteId} aria-current={item.current ? "page" : undefined} className="after:absolute after:inset-0 focus-visible:outline-none">
                  {item.label}
                  <ChevronRight aria-hidden="true" className="pointer-events-none absolute top-4.5 right-4 size-3.5 text-faint-foreground invisible group-hover:visible group-focus-within:visible" />
                </Link>
              ) : (
                item.label
              )}
            </dt>
            <dd className="flex min-w-0 flex-wrap items-baseline gap-1">
              <span className="text-metric num text-foreground">{orNil(item.value)}</span>
              {item.unit ? <span className="text-base font-medium text-faint-foreground">{item.unit}</span> : null}
              {item.meter ? <span className="pointer-events-none basis-full pt-1">{item.meter}</span> : null}
            </dd>
            {item.foot ? (
              <dd className={cn("flex min-w-0 items-start gap-1 text-meta", item.attention ? "text-warning" : "text-faint-foreground")}>
                {/* The icon's 20px box is the first line's height, so it stays on that line when the foot wraps. */}
                {item.attention ? (
                  <span className="flex h-5 shrink-0 items-center">
                    <AttentionIcon className="size-3.5" aria-hidden="true" />
                  </span>
                ) : null}
                <span className="line-clamp-2 break-words" title={item.footTitle}>{item.foot}</span>
              </dd>
            ) : null}
            {noteId ? (
              <dd id={noteId} className={statNoteClasses} style={{ positionAnchor: `--${noteId}` }}>
                {item.filterNote}
              </dd>
            ) : null}
          </div>
        )
      })}
    </dl>
  )
}
