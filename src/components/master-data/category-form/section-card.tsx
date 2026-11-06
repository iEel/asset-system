import type { ReactNode } from "react"
import { getPanelClasses } from "@/lib/design-system"
import { cn } from "@/lib/utils"

// One numbered card of the category form (board MD-Category-Edit: 1 ข้อมูลหมวดหมู่, 2 แม่แบบ, 3 รูปที่ต้องถ่าย, 4 สถานะ).
// The head holds the number (the quiet outlined circle of FormSection, K18), the h2, an optional count and one action
// on the right; the description sits under the head; flush drops the body padding for a table that brings its own.
export function CategoryFormSection({
  number,
  title,
  titleId,
  meta,
  action,
  description,
  flush = false,
  children,
}: {
  number: number
  title: string
  titleId: string
  meta?: ReactNode
  action?: ReactNode
  description?: ReactNode
  flush?: boolean
  children: ReactNode
}) {
  return (
    <section aria-labelledby={titleId} className={cn(getPanelClasses(), "min-w-0")}>
      <div data-slot="category-form-section-head" className="flex min-h-14 min-w-0 flex-wrap items-center gap-x-2.5 gap-y-2 border-b border-border px-4 py-2.5 md:px-5">
        <span
          aria-hidden="true"
          className="inline-flex size-6 shrink-0 items-center justify-center rounded-full border border-control-border text-xs font-semibold text-muted-foreground num"
        >
          {number}
        </span>
        <h2 id={titleId} className="text-base font-semibold text-foreground text-balance">{title}</h2>
        {meta ? <span className="text-meta text-muted-foreground num">{meta}</span> : null}
        {action ? <div className="ml-auto flex shrink-0 items-center gap-2">{action}</div> : null}
      </div>
      {description ? <p className="px-4 pt-3 text-sm text-muted-foreground text-pretty md:px-5">{description}</p> : null}
      <div className={cn("min-w-0", flush ? "pt-2" : "grid gap-4 px-4 py-4 md:px-5")}>{children}</div>
    </section>
  )
}
