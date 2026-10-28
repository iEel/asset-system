import type React from "react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

export type DesktopSelectionBarProps = {
  label: string
  countLabel: string | null
  clearLabel: string
  onClear: () => void
  clearDisabled?: boolean
  actions?: React.ReactNode
  status?: React.ReactNode
  className?: string
  children?: React.ReactNode
}

/**
 * The bar of a desktop list whose rows take ticks (group 2 spec §10, P4-R15). Render it as the last child of the list's
 * column, after the table and its pager: it sticks to the bottom of the dashboard scroll area (main, py-6 from sm) and
 * rests under the pager once the user scrolls there; below lg it sits above the Mobile Field Navigation, because a list
 * page is a navigation route. It sticks inside the list's column and is never pinned to the window, so it never covers
 * the page's other column; from md only, because a list with ticks shows cards below md. Flat like the other sticky
 * bars: a top line and the canvas fill.
 * - label names the bar (a group); countLabel ("3 รายการที่เลือก") shows the count, "ล้าง" and the actions (the primary
 *   last), or null while only a result is on screen.
 * - status is one line, a batch's progress or result. The region is always rendered, so each line is read once.
 * - children go under it: the result's details and their own buttons.
 * Server-safe, with no hook: its client caller passes the handlers and mounts it while a row is ticked or a result shows.
 */
export function DesktopSelectionBar({ label, countLabel, clearLabel, onClear, clearDisabled = false, actions, status, className, children }: DesktopSelectionBarProps) {
  return (
    <div
      role="group"
      aria-label={label}
      data-slot="desktop-selection-bar"
      className={cn("sticky bottom-[calc(3.75rem+env(safe-area-inset-bottom))] z-30 hidden min-w-0 flex-col gap-2 border-t border-border bg-canvas py-3 md:flex lg:-bottom-6", className)}
    >
      {countLabel ? (
        <div className="flex min-w-0 flex-wrap items-center gap-x-3 gap-y-2">
          <span className="text-sm font-medium text-foreground">{countLabel}</span>
          <Button variant="ghost" size="md" onClick={onClear} disabled={clearDisabled}>
            {clearLabel}
          </Button>
          {actions ? <div className="ml-auto flex flex-wrap items-center justify-end gap-2">{actions}</div> : null}
        </div>
      ) : null}
      <p role="status" className={cn("text-meta text-muted-foreground", !status && "sr-only")}>{status}</p>
      {children}
    </div>
  )
}
