"use client"

import type { ReactNode } from "react"
import { ChevronDown } from "lucide-react"
import { getPanelClasses } from "@/lib/design-system"
import { cn } from "@/lib/utils"

type FormDisclosureProps = {
  id?: string
  title: string
  // One quiet line of what the section holds, beside the title whether it is folded or open.
  summary?: ReactNode
  // A short count at the end of the row, such as "กรอกแล้ว 2 จาก 5 ช่อง".
  badge?: ReactNode
  open: boolean
  onOpenChange: (open: boolean) => void
  // The frame says what the person did: a section with a change, or with an error.
  tone?: "default" | "changed" | "error"
  children: ReactNode
}

const toneClasses = {
  default: undefined,
  changed: "border-primary-border",
  error: "border-danger",
}

// A folded optional form section (group 4 plan 2, spec §8, P2-R11). A <details> cannot be ContentPanel, so it takes the
// panel classes and the summary row of the audit rounds page's coverage fold (2D-2 R4). It is controlled: a field
// error, the #purchase hash and "ไปที่ช่อง" open it from code, and the person's own toggle reports back through
// onOpenChange. The summary is the control, so the section has no button of its own.
export function FormDisclosure({ id, title, summary, badge, open, onOpenChange, tone = "default", children }: FormDisclosureProps) {
  return (
    <details
      id={id}
      open={open}
      onToggle={(event) => {
        const next = event.currentTarget.open
        if (next !== open) onOpenChange(next)
      }}
      className={cn(getPanelClasses(), "group/disclosure p-4 sm:p-5", toneClasses[tone])}
    >
      <summary className="flex min-h-11 cursor-pointer list-none flex-wrap items-center gap-x-4 gap-y-2 md:min-h-0">
        <h2 className="text-base font-semibold text-foreground">{title}</h2>
        {summary ? <span className="min-w-0 break-words text-sm text-muted-foreground">{summary}</span> : null}
        <span className="inline-flex items-center gap-2 sm:ms-auto">
          {badge ? <span className="num text-sm text-muted-foreground">{badge}</span> : null}
          <ChevronDown className="size-4 shrink-0 motion-safe:transition-transform group-open/disclosure:rotate-180" aria-hidden="true" />
        </span>
      </summary>
      <div className="mt-4 border-t border-border-soft pt-4">{children}</div>
    </details>
  )
}
