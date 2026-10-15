import type React from "react"
import { cn } from "@/lib/utils"

// The shared chip (spec 2D D7, the neutral-ink text that 2A §8.1.4 kept for it): a role, a scope, a person or a module
// named beside a record. It names something and is not a state, so it has no marker and no tone: the muted fill,
// neutral-ink text (8.48:1 on muted), 6px corners and the 22px box of StatusBadge (a transparent border, so both line
// up). Long names are cut with an ellipsis: pass title when the whole name matters. Not a control: a removable filter
// is FilterChipList and an option is ChoiceChip. Server-safe.
export function Chip({ className, children, ...props }: React.ComponentProps<"span">) {
  return (
    <span
      data-slot="chip"
      className={cn("inline-flex h-5.5 max-w-full min-w-0 items-center rounded-control border border-transparent bg-muted px-2 text-meta font-medium whitespace-nowrap text-neutral-ink", className)}
      {...props}
    >
      <span className="truncate">{children}</span>
    </span>
  )
}
