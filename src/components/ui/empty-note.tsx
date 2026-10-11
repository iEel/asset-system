import type React from "react"
import { Check } from "lucide-react"
import { cn } from "@/lib/utils"

type EmptyNoteProps = React.ComponentProps<"p"> & {
  /** "clear" means nothing is left to do and shows a check in the text color (not green). Default "empty". */
  tone?: "empty" | "clear"
  /** Replaces the default icon ("empty" has none). */
  icon?: React.ReactNode
  /** Adds the mockup padding (16 x 20) when the wrapper has none: a table cell with p-0, a row list. Not inside ContentPanel. */
  padded?: boolean
}

/**
 * One-line empty note (mockup `.empty`): 13/20 faint text with no frame and no fill, for lists, panel sections and
 * empty table rows. Use ActionEmptyState when there is a title, a description or a button. No default live region:
 * when a filter changes the note live, the call site adds a status role.
 */
export function EmptyNote({ tone = "empty", icon, padded = false, className, children, ...props }: EmptyNoteProps) {
  const noteIcon = icon ?? (tone === "clear" ? <Check aria-hidden="true" /> : null)

  return (
    <p
      className={cn(
        "flex items-center gap-2 text-meta text-faint-foreground text-pretty [&>svg]:size-4 [&>svg]:shrink-0",
        padded && "px-5 py-4",
        className,
      )}
      {...props}
    >
      {noteIcon}
      {children}
    </p>
  )
}
