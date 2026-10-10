"use client"

import { useEffect, useRef, type ReactNode, type RefObject } from "react"
import { useTranslations } from "next-intl"
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet"

export function AuditScanCheckPanel({
  isWide,
  open,
  title,
  description,
  onOpenChange,
  returnFocusRef,
  onReturnFocusMissing,
  children,
}: {
  isWide: boolean
  open: boolean
  title: string
  description: string
  onOpenChange: (open: boolean) => void
  returnFocusRef: RefObject<HTMLElement | null>
  /** Called when the sheet closes and its return target left the page (row saved off the tab, deep link). */
  onReturnFocusMissing?: () => void
  children: ReactNode
}) {
  const t = useTranslations("auditScan")
  const tCommon = useTranslations("common")
  const headingRef = useRef<HTMLHeadingElement | null>(null)

  // The inline panel sits beside the list; jump focus to it so keyboard users need not tab through every row.
  useEffect(() => {
    if (isWide && open) headingRef.current?.focus()
  }, [isWide, open, title])

  if (isWide) {
    return open ? (
      <aside data-audit-check-panel aria-label={title} className="sticky top-4 self-start rounded-lg border border-border bg-surface p-4 shadow-sm">
        <h2 ref={headingRef} tabIndex={-1} className="text-base font-semibold text-foreground outline-none">{title}</h2>
        <p className="mb-3 truncate text-sm text-muted-foreground">{description}</p>
        {children}
      </aside>
    ) : (
      <aside className="sticky top-4 self-start rounded-lg border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
        {t("checkPanelEmpty")}
      </aside>
    )
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="bottom"
        closeLabel={tCommon("close")}
        className="max-h-[92dvh] gap-0 rounded-t-xl"
        onCloseAutoFocus={(event) => {
          // Opened from a row or the search box, not a Radix trigger: send focus back there ourselves.
          event.preventDefault()
          const target = returnFocusRef.current
          if (target?.isConnected) target.focus()
          else onReturnFocusMissing?.()
        }}
      >
        <SheetHeader className="border-b border-border pr-14">
          <SheetTitle>{title}</SheetTitle>
          <SheetDescription className="truncate">{description}</SheetDescription>
        </SheetHeader>
        <div className="min-h-0 flex-1 overflow-y-auto p-4">{children}</div>
      </SheetContent>
    </Sheet>
  )
}
