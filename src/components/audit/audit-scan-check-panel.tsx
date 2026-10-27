"use client"

import { useEffect, useRef, type ReactNode, type RefObject } from "react"
import { useTranslations } from "next-intl"
import { EmptyNote } from "@/components/ui/empty-note"
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { getPanelClasses } from "@/lib/design-system"
import { cn } from "@/lib/utils"

export function AuditScanCheckPanel({
  isWide,
  open,
  title,
  focusKey,
  description,
  onOpenChange,
  returnFocusRef,
  onReturnFocusMissing,
  children,
}: {
  isWide: boolean
  open: boolean
  title: string
  /** Changes each time an item opens (the workspace's targetKey), so the wide panel's heading takes focus even when two assets share a name. */
  focusKey: number
  /** The asset's code and serial, each a tag (group 2 spec §12). */
  description: ReactNode
  onOpenChange: (open: boolean) => void
  returnFocusRef: RefObject<HTMLElement | null>
  /** Called when the sheet closes and its return target left the page (row saved off the tab, deep link). */
  onReturnFocusMissing?: () => void
  children: ReactNode
}) {
  const t = useTranslations("auditScan")
  const headingRef = useRef<HTMLHeadingElement | null>(null)

  // The inline panel sits beside the list; jump focus to it so keyboard users need not tab through every row.
  useEffect(() => {
    if (isWide && open) headingRef.current?.focus()
  }, [isWide, open, focusKey])

  if (isWide) {
    return open ? (
      // Capped under the visible height of the dashboard main area (--shell-top + sticky gap 1rem + bottom padding 1.5rem,
      // rounded up to 3rem), so the form's own action bar stays at the bottom of the panel while its fields scroll (D1).
      <aside data-audit-check-panel aria-label={title} className={cn(getPanelClasses(), "sticky top-4 flex max-h-[calc(100dvh_-_var(--shell-top)_-_3rem)] flex-col self-start")}>
        <div className="shrink-0 border-b border-border px-4 py-3">
          <h2 ref={headingRef} tabIndex={-1} className="text-base font-semibold text-foreground outline-none">{title}</h2>
          <p className="text-sm text-muted-foreground">{description}</p>
        </div>
        {children}
      </aside>
    ) : (
      // The frame stays; one quiet line inside it instead of a dashed box (spec 2D M21).
      <aside className={cn(getPanelClasses(), "sticky top-4 self-start")}>
        <EmptyNote padded className="justify-center">{t("checkPanelEmpty")}</EmptyNote>
      </aside>
    )
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="bottom"
        className="max-h-[92dvh] gap-0 rounded-t-xl"
        onCloseAutoFocus={(event) => {
          // Opened from a row or the search box, not a Radix trigger: send focus back there ourselves.
          event.preventDefault()
          const target = returnFocusRef.current
          if (target?.isConnected) target.focus()
          else onReturnFocusMissing?.()
        }}
      >
        <SheetHeader>
          <SheetTitle>{title}</SheetTitle>
          <SheetDescription>{description}</SheetDescription>
        </SheetHeader>
        {children}
      </SheetContent>
    </Sheet>
  )
}
