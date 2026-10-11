import * as React from "react"
import { cn } from "@/lib/utils"

// A key name in a hint, such as the global-search footer (mockup .kbd). No client directive, so server components can use it.
// font-sans because preflight gives <kbd> the mono font. leading-4 (16 / 12 = 1.33) is under the Thai 1.44 rule on
// purpose: a Kbd holds only Latin key names and arrows, never Thai text (spec I23).
export function Kbd({ className, ...props }: React.ComponentProps<"kbd">) {
  return (
    <kbd
      data-slot="kbd"
      className={cn(
        "inline-flex h-5 items-center rounded-sm border border-border bg-surface px-1.5 font-sans text-xs leading-4 font-medium whitespace-nowrap text-muted-foreground",
        className
      )}
      {...props}
    />
  )
}
