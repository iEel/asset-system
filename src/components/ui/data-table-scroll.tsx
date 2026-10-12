"use client"

import { useEffect, useRef, useState, type ReactNode } from "react"
import { MoveHorizontal } from "lucide-react"

// The scroll area of DataTable when it has a scrollHint (spec 2B §3.6, B6). It measures like the asset register
// (asset-register-table.tsx): a ResizeObserver on the scroller and on the table, overflowing when the content is
// wider than the box. Only then does it show the hint line, and only then does a named scroller become a focusable
// region, so keyboard users can scroll it with the arrow keys and a table that fits adds no extra Tab stop.
// A table hidden with `hidden md:block` measures 0, so it never shows the hint.
export function DataTableScrollArea({ hint, label, children }: { hint: string; label?: string; children: ReactNode }) {
  const scrollRef = useRef<HTMLDivElement | null>(null)
  const [overflowing, setOverflowing] = useState(false)

  useEffect(() => {
    const element = scrollRef.current
    if (!element) return
    const measure = () => setOverflowing(element.scrollWidth > element.clientWidth + 1)
    const observer = new ResizeObserver(measure)
    observer.observe(element)
    if (element.firstElementChild) observer.observe(element.firstElementChild)
    return () => observer.disconnect()
  }, [])

  const region = overflowing && Boolean(label)

  return (
    <>
      {overflowing ? (
        <p data-slot="data-table-scroll-hint" className="flex items-center gap-1.5 border-b border-border-soft px-4 py-1.5 text-meta text-faint-foreground md:px-5 [&>svg]:size-4 [&>svg]:shrink-0">
          <MoveHorizontal aria-hidden="true" />
          {hint}
        </p>
      ) : null}
      <div
        ref={scrollRef}
        data-slot="data-table-scroll"
        role={region ? "region" : undefined}
        aria-label={region ? label : undefined}
        tabIndex={region ? 0 : undefined}
        className="overflow-x-auto overscroll-x-contain focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring"
      >
        {children}
      </div>
    </>
  )
}
