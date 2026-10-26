import type React from "react"
import { orNil } from "@/components/ui/nil"

export type FactStripItem = { key: string; label: string; value: React.ReactNode; sub?: React.ReactNode }

// The StatStrip frame: 12px corners, 1px border lines through gap-px on bg-border, no fill. Two columns below md, where
// a last cell left alone fills its row; one row of equal cells from md.
const factStripClasses = "grid grid-cols-2 gap-px overflow-hidden rounded-lg border border-border bg-border max-md:[&>:last-child:nth-child(odd)]:col-span-2 md:auto-cols-fr md:grid-flow-col md:grid-cols-none md:grid-rows-[repeat(3,auto)]"
// Every cell spans the three rows (label, value, sub-line) as a subgrid, so the rows line up across the cells; a cell
// without a sub-line keeps an empty third row.
const factClasses = "row-span-3 grid min-w-0 grid-rows-subgrid content-start gap-y-0.5 bg-surface px-4 py-3"

// Up to four facts of one record side by side under its tabs (spec 2026-10-25 §7.4); a fifth item is not drawn.
// A <dl> takes no name of its own, so the section around it carries label. The caller passes links
// (linkVariants({ size: "inherit" })) and states (StatusBadge), never colored text; numbers belong in StatStrip.
// No client directive and no hook: server pages render it.
export function FactStrip({ label, items, className }: { label: string; items: readonly FactStripItem[]; className?: string }) {
  return (
    <section aria-label={label} className={className}>
      <dl data-slot="fact-strip" className={factStripClasses}>
        {items.slice(0, 4).map((item) => (
          <div key={item.key} data-slot="fact" className={factClasses}>
            <dt className="text-meta text-faint-foreground">{item.label}</dt>
            <dd className="min-w-0 break-words text-sm font-medium text-foreground">{orNil(item.value)}</dd>
            {item.sub ? <dd className="min-w-0 break-words text-meta text-faint-foreground">{item.sub}</dd> : null}
          </div>
        ))}
      </dl>
    </section>
  )
}
