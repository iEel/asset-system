import * as React from "react"
import { Check } from "lucide-react"
import { cn } from "@/lib/utils"

export type SegmentedOption<T extends string> = { value: T; label: React.ReactNode }

type SegmentedProps<T extends string> = {
  // Required: the name of the group, read before the options.
  "aria-label": string
  value: T
  options: readonly SegmentedOption<T>[]
  onValueChange: (value: T) => void
  // From md: sm is 32px (default), md is 36px. Below md both are 44px.
  size?: "sm" | "md"
  // Like the mockup's .m-seg: the frame fills its row and the options share it equally.
  fill?: boolean
  // A check mark before the chosen option's label, so the choice is not shown by color alone.
  showCheck?: boolean
  // On the frame, for layout only.
  className?: string
}

// Mockup .seg (base.css): white frame with a 1px line, 8px corners, 2px padding and gap.
const segmentedFrameClasses = "gap-0.5 rounded-md border border-border bg-surface p-0.5"
// No font weight here: the chosen option and the others bring their own, so font-medium and font-semibold never
// sit in one class list. No ring offset: the options are only 2px apart, and an offset ring would cover the neighbour.
const segmentedOptionClasses = "inline-flex min-h-11 items-center justify-center gap-1.5 rounded-control text-sm transition-colors motion-reduce:transition-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
const segmentedSizeClasses = { sm: "md:min-h-8", md: "md:min-h-9" } as const
const segmentedPressedClasses = "bg-primary-soft font-semibold text-primary-hover"
const segmentedIdleClasses = "font-medium text-muted-foreground hover:bg-background hover:text-foreground"

// A row of toggle buttons where exactly one is on (aria-pressed), each reachable with Tab (no roving tabindex, like
// the mockup). Server-safe: no directive and no hooks, like Button. onValueChange is a function, so only client
// components can render it with a handler.
function Segmented<T extends string>({
  "aria-label": ariaLabel,
  value,
  options,
  onValueChange,
  size = "sm",
  fill = false,
  showCheck = false,
  className,
}: SegmentedProps<T>) {
  return (
    <div role="group" aria-label={ariaLabel} data-slot="segmented" className={cn(fill ? "flex" : "inline-flex", segmentedFrameClasses, className)}>
      {options.map((option) => {
        const pressed = option.value === value
        return (
          <button
            key={option.value}
            type="button"
            aria-pressed={pressed}
            onClick={() => onValueChange(option.value)}
            className={cn(
              segmentedOptionClasses,
              segmentedSizeClasses[size],
              fill ? "min-w-0 flex-1 px-2" : "whitespace-nowrap px-3",
              pressed ? segmentedPressedClasses : segmentedIdleClasses,
            )}
          >
            {showCheck && pressed ? <Check className="size-3.5" aria-hidden="true" /> : null}
            {option.label}
          </button>
        )
      })}
    </div>
  )
}

export { Segmented }
