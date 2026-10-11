import type React from "react"
import { cn } from "@/lib/utils"

type StickyFormFooterProps = React.ComponentProps<"div"> & {
  /** Status line, such as "3 unsaved changes". Above the buttons on phones, on the left from sm. A live region is the caller's job. */
  status?: React.ReactNode
}

/**
 * Save bar for long forms (spec 2C K14, I22). Render it as the last child of the <form>, so type="submit", Enter in a
 * field and the busy guard keep working. It sticks to the bottom of the dashboard scroll area (main, which has
 * py-4 sm:py-6 and px-4 sm:px-6) and rests at the end of the form once the user scrolls there; it never measures
 * the sidebar. Flat like the other full-bleed sticky bars: a top line and the canvas fill.
 * Children are the buttons in DOM order, secondary (cancel) first and primary last (K8): a full-width column on
 * phones, a right-aligned row from sm. Only for focus-task routes: the mobile bottom navigation would cover it
 * (tests/form-migration-guards.test.ts GL1).
 */
export function StickyFormFooter({ status, className, children, ...props }: StickyFormFooterProps) {
  return (
    <div
      data-slot="sticky-form-footer"
      className={cn(
        "sticky -bottom-4 z-10 -mx-4 border-t border-border bg-canvas px-4 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] sm:-bottom-6 sm:-mx-6 sm:px-6",
        className,
      )}
      {...props}
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        {status ? <div className="min-w-0 flex-1 text-meta text-muted-foreground">{status}</div> : null}
        <div className="flex flex-col gap-2 sm:ml-auto sm:flex-row sm:flex-wrap sm:items-center sm:justify-end">{children}</div>
      </div>
    </div>
  )
}
